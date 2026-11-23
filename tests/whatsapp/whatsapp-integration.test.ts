import assert from "node:assert";
import { db } from "@/lib/db";
import { encryptAuthData, decryptAuthData } from "@/lib/whatsapp/encryption";
import { initDatabaseAuthState } from "@/lib/whatsapp/db-auth-state";
import { WhatsAppWorkerClient } from "@/lib/whatsapp/worker-client";
import { getBaileys } from "@/lib/whatsapp/baileys-loader";

export async function runWhatsAppIntegrationTests() {
  console.log("=======================================================");
  console.log("   DentAssist AI - WhatsApp & Baileys Test Suite");
  console.log("=======================================================\n");

  const timestamp = Date.now();
  const testOrgAId = `test_wa_org_a_${timestamp}`;
  const testOrgBId = `test_wa_org_b_${timestamp}`;
  const testUserId = `test_wa_user_${timestamp}`;

  // 1. Setup Test Organizations & User
  await db.user.create({
    data: {
      id: testUserId,
      name: "Dr. Clinic Owner",
      email: `owner_${timestamp}@testclinic.com`,
    },
  });

  await db.organization.createMany({
    data: [
      {
        id: testOrgAId,
        name: "Metro Dental Group",
        slug: `metro-dental-${timestamp}`,
        timezone: "America/New_York",
      },
      {
        id: testOrgBId,
        name: "Apex Smile Clinic",
        slug: `apex-smile-${timestamp}`,
        timezone: "America/Chicago",
      },
    ],
  });

  await db.organizationMembership.createMany({
    data: [
      {
        userId: testUserId,
        organizationId: testOrgAId,
        role: "OWNER",
      },
      {
        userId: testUserId,
        organizationId: testOrgBId,
        role: "STAFF",
      },
    ],
  });

  try {
    // -------------------------------------------------------------------------
    // TEST SECTION 1: AES-256-GCM Authenticated Encryption & Tampering Tests
    // -------------------------------------------------------------------------
    console.log(
      "▶ 1. Testing WhatsApp Auth State Encryption & Tampering Defense (AES-256-GCM)...",
    );

    const sampleAuthSecret = JSON.stringify({
      creds: {
        noiseKey: {
          private: Buffer.from("super-secret-noise-private-key"),
          public: Buffer.from("super-secret-noise-public-key"),
        },
        registrationId: 98765,
        advSecretKey: "very-sensitive-adv-secret",
      },
    });

    const encrypted = encryptAuthData(sampleAuthSecret);
    assert(
      encrypted !== sampleAuthSecret,
      "Encrypted payload must not match plaintext",
    );
    assert(
      !encrypted.includes("super-secret-noise-private-key"),
      "Sensitive key must never appear in raw ciphertext",
    );

    const parts = encrypted.split(":");
    assert.strictEqual(
      parts.length,
      3,
      "Ciphertext must follow format ivHex:authTagHex:encryptedHex",
    );
    assert.strictEqual(
      parts[0].length,
      24,
      "IV must be 12 bytes (24 hex characters)",
    );
    assert.strictEqual(
      parts[1].length,
      32,
      "Auth tag must be 16 bytes (32 hex characters)",
    );

    // Verify valid decryption
    const decrypted = decryptAuthData(encrypted);
    assert.strictEqual(
      decrypted,
      sampleAuthSecret,
      "Decrypted text must match original plaintext",
    );

    // Verify tampering detection (changing 1 character in ciphertext must throw)
    const tamperedCipher = `${parts[0]}:${parts[1]}:${parts[2].slice(0, -2)}ff`;
    assert.throws(
      () => decryptAuthData(tamperedCipher),
      /unable to authenticate data|Unsupported state/i,
      "Decryption of tampered ciphertext must fail authentication tag check",
    );

    // Verify tampered auth tag throws
    const tamperedAuthTag = `${parts[0]}:00112233445566778899aabbccddeeff:${parts[2]}`;
    assert.throws(
      () => decryptAuthData(tamperedAuthTag),
      /unable to authenticate data|Unsupported state/i,
      "Decryption with forged auth tag must fail authentication tag check",
    );

    console.log(
      "  ✔ AES-256-GCM authenticated encryption and tampering rejection passed.",
    );

    // -------------------------------------------------------------------------
    // TEST SECTION 2: Database-Backed Auth State Adapter & BufferJSON Tests
    // -------------------------------------------------------------------------
    console.log(
      "\n▶ 2. Testing Database-Backed Auth State Adapter & BufferJSON Restoration...",
    );

    const { state: authStateA, saveCreds: saveCredsA } =
      await initDatabaseAuthState(testOrgAId);

    assert(authStateA.creds !== undefined, "Credentials must be initialized");
    assert(
      typeof authStateA.creds.registrationId === "number",
      "Registration ID must be a number",
    );

    // Modify and persist creds
    (authStateA.creds as { platform?: string }).platform =
      "DentAssist-Test-Platform";
    await saveCredsA();

    // Verify creds persisted in database encrypted
    const credsRecord = await db.whatsAppAuthState.findUnique({
      where: {
        organizationId_key: {
          organizationId: testOrgAId,
          key: "creds",
        },
      },
    });

    assert(credsRecord !== null, "Credentials record must exist in DB");
    assert(
      !credsRecord.value.includes("DentAssist-Test-Platform"),
      "Credentials in DB must be encrypted at rest, not plaintext",
    );

    // Store sample Signal keys with Uint8Array and Buffer
    const testPreKeyBuffer = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
    const testSessionData = new Uint8Array([10, 20, 30, 40]);

    await authStateA.keys.set({
      "pre-key": {
        "101": {
          public: testPreKeyBuffer,
          private: Buffer.from([9, 8, 7, 6]),
        },
      },
      session: {
        remote_session_1: testSessionData,
      },
    });

    // Retrieve keys via keys.get
    const fetchedPreKeys = await authStateA.keys.get("pre-key", ["101"]);
    assert(fetchedPreKeys["101"] !== undefined, "Pre-key must be retrieved");
    assert(
      Buffer.isBuffer(fetchedPreKeys["101"].public) ||
        fetchedPreKeys["101"].public instanceof Uint8Array,
      "BufferJSON must restore Buffer/Uint8Array types correctly",
    );
    assert.deepStrictEqual(
      Buffer.from(fetchedPreKeys["101"].public),
      testPreKeyBuffer,
      "Pre-key public buffer content must match original",
    );

    // Test key deletion on null
    await authStateA.keys.set({
      "pre-key": {
        "101": null,
      },
    });

    const deletedPreKey = await authStateA.keys.get("pre-key", ["101"]);
    assert(
      deletedPreKey["101"] === undefined || deletedPreKey["101"] === null,
      "Pre-key must be deleted when set to null",
    );

    console.log(
      "  ✔ Database-backed auth state persistence, BufferJSON restoration, and key deletion passed.",
    );

    // -------------------------------------------------------------------------
    // TEST SECTION 3: Multi-Tenant Organization Isolation Tests
    // -------------------------------------------------------------------------
    console.log(
      "\n▶ 3. Testing Multi-Tenant Isolation & Cross-Tenant Boundary Enforcement...",
    );

    const { state: authStateB } = await initDatabaseAuthState(testOrgBId);

    // Save key in Org B
    await authStateB.keys.set({
      session: {
        session_org_b: new Uint8Array([99, 98, 97]),
      },
    });

    // Org A attempts to fetch Org B's session key
    const orgACrossFetch = await authStateA.keys.get("session", [
      "session_org_b",
    ]);
    assert.strictEqual(
      orgACrossFetch["session_org_b"],
      undefined,
      "Cross-tenant key access must return undefined (Org A cannot read Org B's keys)",
    );

    // Ensure database rows are properly partitioned
    const orgARows = await db.whatsAppAuthState.findMany({
      where: { organizationId: testOrgAId },
    });
    const orgBRows = await db.whatsAppAuthState.findMany({
      where: { organizationId: testOrgBId },
    });

    assert(
      orgARows.every((r) => r.organizationId === testOrgAId),
      "All Org A auth records must belong exclusively to Org A",
    );
    assert(
      orgBRows.every((r) => r.organizationId === testOrgBId),
      "All Org B auth records must belong exclusively to Org B",
    );

    console.log("  ✔ Multi-tenant organization isolation passed.");

    // -------------------------------------------------------------------------
    // TEST SECTION 4: WhatsApp Connection State Machine & Lifecycle Tests
    // -------------------------------------------------------------------------
    console.log(
      "\n▶ 4. Testing WhatsApp Connection State Machine & Lifecycle Transitions...",
    );

    // Create initial connection record for Org A
    await db.whatsAppConnection.create({
      data: {
        organizationId: testOrgAId,
        status: "DISCONNECTED",
      },
    });

    const initialStatus = await WhatsAppWorkerClient.getStatus(testOrgAId);
    assert.strictEqual(
      initialStatus.state.status,
      "DISCONNECTED",
      "Initial status must be DISCONNECTED",
    );

    // Test QR generation & AWAITING_SCAN transition
    const sampleQr = "2@mock_qr_string_for_testing_pairing_flow_xyz123";
    const expiresAt = new Date(Date.now() + 60000);

    await db.whatsAppConnection.update({
      where: { organizationId: testOrgAId },
      data: {
        status: "AWAITING_SCAN",
        qrCode: `data:image/png;base64,${Buffer.from(sampleQr).toString("base64")}`,
        qrExpiresAt: expiresAt,
      },
    });

    const awaitingScanStatus = await WhatsAppWorkerClient.getStatus(testOrgAId);
    assert.strictEqual(
      awaitingScanStatus.state.status,
      "AWAITING_SCAN",
      "Status must transition to AWAITING_SCAN",
    );
    assert(
      awaitingScanStatus.state.qrCode !== null,
      "QR code must be present when awaiting scan",
    );

    // Test Successful Connection transition
    await db.whatsAppConnection.update({
      where: { organizationId: testOrgAId },
      data: {
        status: "CONNECTED",
        phoneNumber: "15551234567",
        jid: "15551234567:1@s.whatsapp.net",
        pushName: "Metro Dental Clinic Line",
        qrCode: null, // QR cleared upon connection
        qrExpiresAt: null,
        lastConnectedAt: new Date(),
      },
    });

    const connectedStatus = await WhatsAppWorkerClient.getStatus(testOrgAId);
    assert.strictEqual(
      connectedStatus.state.status,
      "CONNECTED",
      "Status must transition to CONNECTED",
    );
    assert.strictEqual(
      connectedStatus.state.phoneNumber,
      "15551234567",
      "Phone number must be persisted",
    );
    assert.strictEqual(
      connectedStatus.state.qrCode,
      null,
      "QR code must be cleared once connected",
    );

    console.log(
      "  ✔ Connection state transitions (DISCONNECTED -> AWAITING_SCAN -> CONNECTED) passed.",
    );

    // -------------------------------------------------------------------------
    // TEST SECTION 5: Message Deduplication & Inbound Filtering Tests
    // -------------------------------------------------------------------------
    console.log(
      "\n▶ 5. Testing Inbound Message Filtering & Atomic Deduplication...",
    );

    const testMessageId = `msg_${Date.now()}`;
    const remoteJid = "15559876543@s.whatsapp.net";

    // 1st insertion: should succeed
    const firstInsert = await db.whatsAppProcessedMessage.create({
      data: {
        organizationId: testOrgAId,
        messageId: testMessageId,
        remoteJid,
      },
    });
    assert(
      firstInsert.id !== undefined,
      "First message must be inserted into deduplication table",
    );

    // 2nd insertion with identical organizationId and messageId: must reject (P2002)
    let duplicateRejected = false;
    try {
      await db.whatsAppProcessedMessage.create({
        data: {
          organizationId: testOrgAId,
          messageId: testMessageId,
          remoteJid,
        },
      });
    } catch (e: unknown) {
      if (
        typeof e === "object" &&
        e !== null &&
        "code" in e &&
        (e as { code?: string }).code === "P2002"
      ) {
        duplicateRejected = true;
      }
    }
    assert(
      duplicateRejected,
      "Duplicate incoming message ID must be rejected by unique constraint (P2002)",
    );

    // Cross-tenant deduplication test: Org B should be able to receive same message ID without collision
    const orgBInsert = await db.whatsAppProcessedMessage.create({
      data: {
        organizationId: testOrgBId,
        messageId: testMessageId,
        remoteJid,
      },
    });
    assert(
      orgBInsert.id !== undefined,
      "Message IDs are scoped by organizationId, ensuring cross-tenant independence",
    );

    console.log(
      "  ✔ Atomic message deduplication and tenant-scoped idempotency passed.",
    );

    // -------------------------------------------------------------------------
    // TEST SECTION 6: Disconnect and Auth State Purge Tests
    // -------------------------------------------------------------------------
    console.log(
      "\n▶ 6. Testing Disconnect Lifecycle & Sensitive Auth State Purge...",
    );

    // Disconnect Org A via WorkerClient
    const disconnectResult = await WhatsAppWorkerClient.disconnect(testOrgAId);
    assert.strictEqual(
      disconnectResult.success,
      true,
      "Disconnect RPC must succeed",
    );

    // Verify DB updated to DISCONNECTED and QR cleared
    const postDisconnectStatus =
      await WhatsAppWorkerClient.getStatus(testOrgAId);
    assert.strictEqual(
      postDisconnectStatus.state.status,
      "DISCONNECTED",
      "Status must be DISCONNECTED after disconnect",
    );
    assert.strictEqual(
      postDisconnectStatus.state.qrCode,
      null,
      "QR code must be cleared after disconnect",
    );

    // Verify all auth keys for Org A were completely purged from DB
    const remainingOrgAKeys = await db.whatsAppAuthState.count({
      where: { organizationId: testOrgAId },
    });
    assert.strictEqual(
      remainingOrgAKeys,
      0,
      "All sensitive cryptographic keys and session credentials must be purged upon disconnect",
    );

    console.log(
      "  ✔ Disconnect lifecycle and sensitive auth state purge passed.",
    );

    // -------------------------------------------------------------------------
    // TEST SECTION 7: Reconnection vs Logged-Out Differentiation
    // -------------------------------------------------------------------------
    console.log(
      "\n▶ 7. Testing DisconnectReason Semantics (Logged Out vs Restart Required)...",
    );

    const { DisconnectReason } = await getBaileys();
    assert.strictEqual(
      DisconnectReason.loggedOut,
      401,
      "DisconnectReason.loggedOut must equal 401 per WhatsApp protocol",
    );
    assert.strictEqual(
      DisconnectReason.restartRequired,
      515,
      "DisconnectReason.restartRequired must equal 515 per WhatsApp protocol",
    );
    assert.strictEqual(
      DisconnectReason.connectionClosed,
      428,
      "DisconnectReason.connectionClosed must equal 428",
    );

    console.log(
      "  ✔ Verified DisconnectReason status codes match official WhatsApp protocol.",
    );

    console.log("\n=======================================================");
    console.log("   All WhatsApp & Baileys Integration Tests Passed! ✔");
    console.log("=======================================================\n");
  } finally {
    // Cleanup test fixtures
    await db.whatsAppProcessedMessage.deleteMany({
      where: { organizationId: { in: [testOrgAId, testOrgBId] } },
    });
    await db.whatsAppAuthState.deleteMany({
      where: { organizationId: { in: [testOrgAId, testOrgBId] } },
    });
    await db.whatsAppConnection.deleteMany({
      where: { organizationId: { in: [testOrgAId, testOrgBId] } },
    });
    await db.organizationMembership.deleteMany({
      where: { organizationId: { in: [testOrgAId, testOrgBId] } },
    });
    await db.organization.deleteMany({
      where: { id: { in: [testOrgAId, testOrgBId] } },
    });
    await db.user.deleteMany({
      where: { id: testUserId },
    });
  }
}

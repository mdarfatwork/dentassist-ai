import assert from "node:assert";
import { db } from "@/lib/db";
import { ClinicService } from "@/lib/clinic/service";

export async function runServiceResolutionTests() {
  console.log("▶ Running Deterministic Service Resolution tests...");

  const testOrgId = `test_org_svc_res_${Date.now()}`;

  await db.organization.create({
    data: {
      id: testOrgId,
      name: "Resolution Dental Clinic",
      slug: `res-dental-${Date.now()}`,
      timezone: "America/Chicago",
      services: {
        create: [
          {
            name: "Comprehensive Dental Cleaning",
            description: "Adult prophylaxis and scaling",
            durationMinutes: 45,
          },
          {
            name: "In-Office Teeth Whitening",
            description: "Professional laser bleaching treatment",
            durationMinutes: 60,
          },
          {
            name: "Routine Dental Examination",
            description: "Checkup and oral screening",
            durationMinutes: 30,
          },
          {
            name: "Composite Tooth Filling",
            description: "Resin tooth restoration",
            durationMinutes: 45,
          },
        ],
      },
    },
  });

  try {
    // 1. Test Exact Match
    const exactRes = await ClinicService.resolveServiceByName({
      organizationId: testOrgId,
      name: "Comprehensive Dental Cleaning",
    });
    assert.strictEqual(exactRes.matchType, "exact");
    assert.strictEqual(exactRes.service?.name, "Comprehensive Dental Cleaning");
    assert.strictEqual(exactRes.service?.durationMinutes, 45);
    console.log("  ✔ Exact service name match passed.");

    // 2. Test Substring Match
    const subRes = await ClinicService.resolveServiceByName({
      organizationId: testOrgId,
      name: "teeth whitening",
    });
    assert(
      subRes.matchType === "exact" || subRes.matchType === "alias",
      "Substring 'teeth whitening' must resolve to whitening service",
    );
    assert.strictEqual(subRes.service?.name, "In-Office Teeth Whitening");
    console.log("  ✔ Substring service name match passed.");

    // 3. Test Built-in Dental Alias: "cleaning"
    const aliasCleaning = await ClinicService.resolveServiceByName({
      organizationId: testOrgId,
      name: "cleaning",
    });
    assert(
      aliasCleaning.service !== undefined,
      "Alias 'cleaning' must resolve to Comprehensive Dental Cleaning",
    );
    assert.strictEqual(
      aliasCleaning.service?.name,
      "Comprehensive Dental Cleaning",
    );
    console.log("  ✔ Built-in alias 'cleaning' resolution passed.");

    // 4. Test Built-in Dental Alias: "prophylaxis"
    const aliasProphylaxis = await ClinicService.resolveServiceByName({
      organizationId: testOrgId,
      name: "prophylaxis",
    });
    assert(
      aliasProphylaxis.service !== undefined,
      "Clinical alias 'prophylaxis' must resolve to Comprehensive Dental Cleaning",
    );
    assert.strictEqual(
      aliasProphylaxis.service?.name,
      "Comprehensive Dental Cleaning",
    );
    console.log("  ✔ Clinical alias 'prophylaxis' resolution passed.");

    // 5. Test Built-in Dental Alias: "checkup" -> Routine Dental Examination
    const aliasCheckup = await ClinicService.resolveServiceByName({
      organizationId: testOrgId,
      name: "checkup",
    });
    assert(
      aliasCheckup.service !== undefined,
      "Alias 'checkup' must resolve to Routine Dental Examination",
    );
    assert.strictEqual(
      aliasCheckup.service?.name,
      "Routine Dental Examination",
    );
    console.log("  ✔ Colloquial alias 'checkup' resolution passed.");

    // 6. Test Built-in Dental Alias: "cavity filling" -> Composite Tooth Filling
    const aliasFilling = await ClinicService.resolveServiceByName({
      organizationId: testOrgId,
      name: "cavity filling",
    });
    assert(
      aliasFilling.service !== undefined,
      "Alias 'cavity filling' must resolve to Composite Tooth Filling",
    );
    assert.strictEqual(aliasFilling.service?.name, "Composite Tooth Filling");
    console.log("  ✔ Alias 'cavity filling' resolution passed.");

    // 7. Test Unknown Service Rejection
    const unknownRes = await ClinicService.resolveServiceByName({
      organizationId: testOrgId,
      name: "dermatology botox injection",
    });
    assert.strictEqual(
      unknownRes.matchType,
      "none",
      "Unrelated or unoffered treatment must return matchType 'none'",
    );
    assert.strictEqual(unknownRes.service, undefined);
    console.log("  ✔ Unknown service rejection passed.");

    // 8. Test Empty String Handling
    const emptyRes = await ClinicService.resolveServiceByName({
      organizationId: testOrgId,
      name: "   ",
    });
    assert.strictEqual(emptyRes.matchType, "none");
    console.log("  ✔ Empty phrase handling passed.");
  } finally {
    // Cleanup
    await db.service.deleteMany({
      where: { organizationId: testOrgId },
    });
    await db.organization.delete({
      where: { id: testOrgId },
    });
  }
}

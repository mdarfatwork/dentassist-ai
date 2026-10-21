import assert from "node:assert/strict";
import {
  DASHBOARD_ROUTES,
  resolveLegacyTab,
  getDashboardRouteMeta,
} from "../../lib/dashboard/routes";

export async function runDashboardRoutesTests() {
  console.log("▶ Running Dashboard Routes Migration Tests...");

  // 1. Verify all 12 major sections are configured
  assert.equal(
    DASHBOARD_ROUTES.length,
    12,
    "Expected exactly 12 major dashboard route definitions",
  );

  const routeHrefs = DASHBOARD_ROUTES.map((r) => r.href);
  const expectedHrefs = [
    "/dashboard",
    "/dashboard/appointments",
    "/dashboard/practitioners",
    "/dashboard/services",
    "/dashboard/working-hours",
    "/dashboard/holidays",
    "/dashboard/knowledge-base",
    "/dashboard/receptionist",
    "/dashboard/voice-receptionist",
    "/dashboard/widget",
    "/dashboard/calendar",
    "/dashboard/settings",
  ];

  for (const href of expectedHrefs) {
    assert.ok(
      routeHrefs.includes(href),
      `Expected route "${href}" to exist in DASHBOARD_ROUTES`,
    );
  }

  // 2. Verify Legacy Tab parameter resolution
  const legacyMappings: Record<string, string> = {
    overview: "/dashboard",
    appointments: "/dashboard/appointments",
    dentists: "/dashboard/practitioners",
    practitioners: "/dashboard/practitioners",
    services: "/dashboard/services",
    hours: "/dashboard/working-hours",
    "working-hours": "/dashboard/working-hours",
    holidays: "/dashboard/holidays",
    knowledge: "/dashboard/knowledge-base",
    "knowledge-base": "/dashboard/knowledge-base",
    receptionist: "/dashboard/receptionist",
    voice: "/dashboard/voice-receptionist",
    "voice-receptionist": "/dashboard/voice-receptionist",
    widget: "/dashboard/widget",
    calendar: "/dashboard/calendar",
    profile: "/dashboard/settings",
    settings: "/dashboard/settings",
  };

  for (const [tabParam, expectedUrl] of Object.entries(legacyMappings)) {
    const resolved = resolveLegacyTab(tabParam);
    assert.equal(
      resolved,
      expectedUrl,
      `Expected legacy tab "${tabParam}" to resolve to "${expectedUrl}", got "${resolved}"`,
    );

    // Case insensitivity test
    const resolvedUpper = resolveLegacyTab(tabParam.toUpperCase());
    assert.equal(
      resolvedUpper,
      expectedUrl,
      `Expected uppercase legacy tab "${tabParam.toUpperCase()}" to resolve to "${expectedUrl}"`,
    );
  }

  // 3. Unknown tab parameters should return null to prevent redirect loops
  assert.equal(resolveLegacyTab("unknown_tab_123"), null);
  assert.equal(resolveLegacyTab(""), null);
  assert.equal(resolveLegacyTab("random-query"), null);

  // 4. Verify Active Route Metadata Resolution
  assert.equal(getDashboardRouteMeta("/dashboard").id, "overview");
  assert.equal(getDashboardRouteMeta("/dashboard/").id, "overview");
  assert.equal(
    getDashboardRouteMeta("/dashboard/appointments").id,
    "appointments",
  );
  assert.equal(
    getDashboardRouteMeta("/dashboard/practitioners").id,
    "practitioners",
  );
  assert.equal(getDashboardRouteMeta("/dashboard/services").id, "services");
  assert.equal(
    getDashboardRouteMeta("/dashboard/working-hours").id,
    "working-hours",
  );
  assert.equal(getDashboardRouteMeta("/dashboard/holidays").id, "holidays");
  assert.equal(
    getDashboardRouteMeta("/dashboard/knowledge-base").id,
    "knowledge-base",
  );
  assert.equal(
    getDashboardRouteMeta("/dashboard/receptionist").id,
    "receptionist",
  );
  assert.equal(
    getDashboardRouteMeta("/dashboard/voice-receptionist").id,
    "voice-receptionist",
  );
  assert.equal(getDashboardRouteMeta("/dashboard/widget").id, "widget");
  assert.equal(getDashboardRouteMeta("/dashboard/calendar").id, "calendar");
  assert.equal(getDashboardRouteMeta("/dashboard/settings").id, "settings");

  // 5. Verify Alias path resolution
  assert.equal(
    getDashboardRouteMeta("/dashboard/dentists").id,
    "practitioners",
  );
  assert.equal(getDashboardRouteMeta("/dashboard/hours").id, "working-hours");
  assert.equal(
    getDashboardRouteMeta("/dashboard/knowledge").id,
    "knowledge-base",
  );
  assert.equal(
    getDashboardRouteMeta("/dashboard/voice").id,
    "voice-receptionist",
  );
  assert.equal(getDashboardRouteMeta("/dashboard/profile").id, "settings");

  // 6. Verify Subpath / Detail page hierarchical resolution
  assert.equal(
    getDashboardRouteMeta("/dashboard/appointments/new").id,
    "appointments",
  );
  assert.equal(
    getDashboardRouteMeta("/dashboard/services/category/preventive").id,
    "services",
  );

  // 7. Verify titles & breadcrumb groups
  const calMeta = getDashboardRouteMeta("/dashboard/calendar");
  assert.equal(calMeta.title, "Google Calendar");
  assert.equal(calMeta.group, "AI & Integrations");

  const pracMeta = getDashboardRouteMeta("/dashboard/practitioners");
  assert.equal(pracMeta.title, "Practitioners Roster");
  assert.equal(pracMeta.group, "Workspace");

  const settingsMeta = getDashboardRouteMeta("/dashboard/settings");
  assert.equal(settingsMeta.title, "Practice Profile");
  assert.equal(settingsMeta.group, "Settings");

  console.log("✔ All Dashboard Routes Migration Tests Passed!");
}

if (process.argv[1]?.endsWith("dashboard-routes.test.ts")) {
  runDashboardRoutesTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Test failed:", err);
      process.exit(1);
    });
}

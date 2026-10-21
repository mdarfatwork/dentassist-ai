# DentAssist AI Design System Specification

The definitive design system and UI/UX specification for the **DentAssist AI** dental practice management and autonomous clinical operations platform. Inspired by modern shadcn/ui conventions, this system establishes a warm, trustworthy, product-focused workspace tailored specifically for dental clinic staff, practice owners, and healthcare administrators.

---

## 1. Design Philosophy & Brand Direction

DentAssist AI is mission-critical clinical operations infrastructure. It manages doctor availability, operatory capacity, patient records, and real-time autonomous voice and chat receptionist workflows.

### Brand Character

- **Professional & Trustworthy:** Communicates clinical rigor, HIPAA-conscious data handling, and reliability during high-pressure front-desk workflows.
- **Modern & Product-Focused:** Clean, structured, and intentional layouts without generic SaaS tropes or marketing clutter.
- **Calm & Welcoming:** Warm earthy tones replace cold sterile blues and neon startup gradients, projecting warmth for patients and staff.
- **Purposeful Density & Scannability:** Dental front desks handle inbound calls, emergency walk-ins, and complex doctor schedules simultaneously. Key clinical operational status must be legible at a glance.

---

## 2. Color System & Semantic Tokens

The color architecture is centralized in `app/globals.css` using semantic CSS custom properties with Tailwind CSS v4 `@theme inline` variables.

### Core Palette Tokens

| Token                  | Hex Value | Semantic Purpose                                                                   |
| :--------------------- | :-------- | :--------------------------------------------------------------------------------- |
| `--primary`            | `#A65335` | **Warm Terracotta** — Primary actions, active navigation items, brand focal points |
| `--primary-foreground` | `#FFFFFF` | Text and icons on primary interactive buttons                                      |
| `--deep-brown`         | `#713F2D` | **Deep Brown** — Secondary brand emphasis, active badges, clinic profile accents   |
| `--background`         | `#F8F5F0` | **Warm Canvas** — Welcoming, soft off-white background replacing harsh cold white  |
| `--foreground`         | `#292524` | **Deep Stone** — Primary typography offering high legibility and contrast          |
| `--card` / `--surface` | `#FFFFFF` | **Crisp White** — Main content surfaces, data tables, and interactive panels       |
| `--card-foreground`    | `#292524` | Text inside card and surface containers                                            |
| `--muted`              | `#F0EBE4` | **Warm Muted** — Secondary surfaces, table header rows, and hover states           |
| `--muted-foreground`   | `#78716C` | **Medium Stone** — Helper labels, timestamps, secondary metadata, and hints        |
| `--border`             | `#E7E0D7` | **Warm Border** — Structural dividers, panel outlines, and table borders           |
| `--input`              | `#E7E0D7` | Text inputs, select controls, and form borders                                     |
| `--ring`               | `#A65335` | Keyboard focus indicator ring with accessible contrast                             |

### Semantic Functional Accents

Color is applied with strict intentionality to communicate real clinical state:

| Semantic State  | Light Value              | Semantic Application                                                                 |
| :-------------- | :----------------------- | :----------------------------------------------------------------------------------- |
| **Success**     | `#15803D` / bg `#DCFCE7` | Confirmed appointments, connected Google Calendar, verified email, operational AI    |
| **Warning**     | `#B45309` / bg `#FEF3C7` | Incomplete setup steps, unassigned practitioners, pending intake confirmation        |
| **Destructive** | `#DC2626` / bg `#FEE2E2` | Cancelled appointments, deletion confirmations, connection failures, security blocks |
| **Info**        | `#0284C7` / bg `#E0F2FE` | Scheduled appointments, active RAG queries, front-desk intake metadata               |

### Future Dark Mode Architecture

All color tokens rely on centralized CSS custom properties (`var(--primary)`, `var(--card)`, etc.). Dark mode uses the same token names, adapting the canvas to deep charcoal/brown surfaces with warm terracotta accents without requiring individual component overrides.

---

## 3. Typography & Hierarchy

The interface employs a clean, modern sans-serif typography stack backed by tabular monospace for clinical identifiers, dates, and times.

### Hierarchy Scale

| Level                | Size & Weight      | Tailwind Class                                  | Application                                 |
| :------------------- | :----------------- | :---------------------------------------------- | :------------------------------------------ |
| **Page Heading**     | 24–30px, Bold      | `text-2xl sm:text-3xl font-bold tracking-tight` | Main page title, welcome banners            |
| **Section Heading**  | 18–20px, Bold      | `text-lg font-bold tracking-tight`              | Major section titles, table group headers   |
| **Card Heading**     | 15–17px, Semibold  | `text-sm sm:text-base font-semibold`            | Panel and card headers                      |
| **Body Content**     | 13–14px, Regular   | `text-xs sm:text-sm text-foreground`            | Standard explanatory copy, table data       |
| **Supporting Text**  | 12–13px, Regular   | `text-xs text-muted-foreground`                 | Helper labels, field descriptions           |
| **Compact Metadata** | 10–11px, Monospace | `text-[10px] sm:text-[11px] font-mono`          | Timestamps, durations, tenant slugs, badges |

### Monospace Restraint

Monospace (`font-mono`) is reserved strictly for tabular numbers, appointment times (`09:30 AM`), chair durations (`45 mins`), tenant IDs, and machine traces. Standard narrative text always uses sans-serif.

---

## 4. Geometry, Radius & Elevation

DentAssist AI utilizes a **moderately soft rounding scale** inspired by modern shadcn/ui design, avoiding both brutalist sharp corners and overly playful consumer pill shapes:

### Radius Scale

| Component Group                 | Token                        | Value                          | Rationale                                                |
| :------------------------------ | :--------------------------- | :----------------------------- | :------------------------------------------------------- |
| **Main Cards & Panels**         | `rounded-xl`                 | 12–16px (`--radius: 0.875rem`) | Soft, contemporary content framing against warm canvas   |
| **Dialogs & Drawers**           | `rounded-xl` / `rounded-2xl` | 14–16px                        | Elevated modal surfaces                                  |
| **Buttons & Form Inputs**       | `rounded-lg`                 | 8–10px                         | Comfortable, tactile click and touch targets             |
| **Sidebar Navigation Items**    | `rounded-lg`                 | 8–10px                         | Consistent active state indicator pills                  |
| **Dropdown Menus & Popovers**   | `rounded-lg`                 | 10–12px                        | Crisp overlay containment                                |
| **Badges & Chips**              | `rounded-md`                 | 6px                            | High-density rectangular metadata chips                  |
| **Avatars & Status Indicators** | `rounded-full`               | Circular                       | Reserved strictly for user avatars and pulse status dots |

### Elevation & Borders

- **Standard Surfaces:** Crisp white cards against the warm `#F8F5F0` background framed by a subtle 1px border (`border border-border`).
- **Shadows:** Minimal, subtle elevation (`shadow-xs` / `shadow-sm`) for content panels; stronger elevation (`shadow-xl`) reserved for dialogs and popover menus.
- **No Floating Card Stacking:** Avoid wrapping every small text row in nested bordered cards. Use divider rules (`divide-y divide-border`) inside a single panel instead.

---

## 5. Application Shell & Navigation Architecture

The legacy horizontal scrolling menu is permanently replaced by a responsive left sidebar and compact top header.

```
┌──────────────────┬────────────────────────────────────────────────────────┐
│  DentAssist AI   │  Practice / Workspace / Clinical Appointments          │
│  [Org Switcher]  │                                       [User • Log out] │
├──────────────────┼────────────────────────────────────────────────────────┤
│  WORKSPACE       │                                                        │
│  • Overview      │  [ Practice Welcome Banner & Date Context ]            │
│  • Appointments  │                                                        │
│  • Practitioners │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌─────────┐ │
│  • Dental Service│  │ Today's   │ │ Upcoming  │ │ Google    │ │ AI Core │ │
│  • Working Hours │  │ Appts (8) │ │ Books(24) │ │ Calendar  │ │ Ready   │ │
│  • Closures      │  └───────────┘ └───────────┘ └───────────┘ └─────────┘ │
│                  │                                                        │
│  AI & INTEGRATION│  ┌─────────────────────────┐ ┌───────────────────────┐ │
│  • Knowledge Base│  │ Daily Schedule & Bookings│ │ Clinic Readiness 85%  │ │
│  • Receptionist  │  │ [Today] [Upcoming] [All]│ │ [■■■■■■■■■□]          │ │
│  • Voice         │  │                         │ │                       │ │
│  • Website Widget│  │ • 09:00 Sarah J. Clean  │ │ ✓ Practice Profile    │ │
│  • Google Cal    │  │ • 10:30 Mike R. Crown   │ │ ✓ Doctors Assigned    │ │
│                  │  │ • 11:15 Emma T. X-Ray   │ │ ⚠ Google Calendar     │ │
│  SETTINGS        │  │                         │ │                       │ │
│  • Practice Prof.│  └─────────────────────────┘ └───────────────────────┘ │
├──────────────────┤                                                        │
│  User Profile    │                                                        │
│  [Sign out]      │                                                        │
└──────────────────┴────────────────────────────────────────────────────────┘
```

### Desktop Sidebar (`components/dashboard/dashboard-sidebar.tsx`)

- **Width:** 260px expanded; collapsible to 72px icon-only mode with tooltips.
- **Header:** Clinic branding, product descriptor, and collapse toggle button.
- **Practice Switcher:** Dropdown displaying the active clinic name and tenant slug, with switching and new practice creation controls.
- **Groupings:**
  - **Workspace:** Practice Overview, Appointments, Practitioners, Dental Services, Working Hours, Closures & Holidays.
  - **AI & Integrations:** Knowledge Base, AI Receptionist, Voice Receptionist, Website Widget, Google Calendar.
  - **Settings:** Practice Profile.
- **Footer:** Active user initials/avatar, display name, email, and sign-out action (clean, with no technical tenant slugs).

### Mobile Navigation (`components/dashboard/dashboard-shell.tsx`)

- On screens `< 1024px`, the persistent sidebar is hidden.
- The top header renders a hamburger menu button that opens the sidebar as an accessible slide-over sheet.
- Automatically dismisses upon link navigation, backdrop click, or pressing the `Escape` key.
- Horizontal page overflow is strictly prohibited across all viewports down to 375px.

### Compact Header (`components/dashboard/dashboard-header.tsx`)

- Mobile navigation toggle for small viewports.
- Breadcrumbs representing the active workspace group and view title.
- User profile info and sign out button.
- Stripped of redundant tenant ID pills and duplicate global action buttons.

---

## 6. Operations-First Overview Dashboard

The primary landing dashboard (`components/dashboard/dashboard-overview.tsx`) focuses on real-time clinic operations rather than developer configuration phases.

### Core Sections

1. **Welcome & Context Banner:** Time-aware greeting ("Good morning / afternoon / evening"), current localized date, active practice name, and timezone indicator.
2. **Four Operational KPI Cards:**
   - **Today's Appointments:** Active count for the day, scheduled/confirmed count, completed count, and schedule shortcut.
   - **Upcoming Bookings:** Future bookings on record with total count.
   - **Google Calendar Sync:** Live status indicator (Active / Connected vs. Attention Required), connected calendar ID, and quick settings trigger.
   - **AI Receptionist Readiness:** Operational readiness status computed from indexed clinic knowledge documents and procedure definitions.
3. **Daily Schedule & Bookings Table:**
   - Tab toggles: "Today", "Upcoming", and "All Records".
   - Columns: Time, Patient Name & Phone, Procedure Name & Duration, Doctor Assignment, Status Badge, and Booking Origin (`Voice`, `Widget`, `Front Desk`).
   - Clean empty state with a "Book an Appointment" primary action if no appointments exist.
4. **Integration Diagnostics:**
   - Google Calendar two-way operatory scheduling status.
   - AI Receptionist multi-turn conversation engine status.
5. **Clinic Readiness & Setup Checklist:**
   - Progress bar with dynamic percentage completed.
   - Interactive step items linking directly to the respective management page: Practice Profile, Practitioners, Services, Hours, Closures, Knowledge Documents, and Calendar Sync.
6. **Quick Operations Panel:** Instant triggers to test the Voice Receptionist in the browser, copy the Website Booking Widget embed snippet, or ingest Knowledge Base documents.

---

## 7. Component Architecture & Guidelines

All UI components are built around reusable primitives in `@/components/ui/` and clinical workspace wrappers in `@/components/workspace/`.

### Component Directory

- `components/dashboard/dashboard-shell.tsx` — Master layout shell, pathname-based navigation synchronization, and mobile drawer state.
- `lib/dashboard/routes.ts` — Central routing definitions, metadata resolution, and legacy tab compatibility mapping.
- `components/dashboard/dashboard-sidebar.tsx` — Responsive left navigation sidebar with desktop collapse and mobile drawer support.
- `components/dashboard/dashboard-header.tsx` — Compact top header with breadcrumbs and actions.
- `components/dashboard/dashboard-overview.tsx` — Operations-first dashboard with KPIs, daily schedule, and checklist.
- `components/workspace/workspace-panel.tsx` — Standard panel wrapper for headers, badges, and action toolbars.
- `components/workspace/empty-state.tsx` — Accessible empty states with guidance and primary CTA.
- `components/ui/button.tsx` — Primary terracotta, outline, ghost, secondary, and destructive button variants.
- `components/ui/badge.tsx` — Status pills with semantic variants (`default`, `secondary`, `success`, `warning`, `destructive`, `info`).
- `components/ui/card.tsx` — Rounded-xl content surfaces with warm borders.
- `components/ui/dialog.tsx` — Modal overlays with backdrop blur and accessible focus trapping.

---

## 8. Anti-Slop Rules

Every interface element in DentAssist AI must conform to these anti-slop rules:

1. **No Cold Blues or Purples for AI:** Purple gradients, glowing AI sparkles (`✨`), and pulsing neon orbs are strictly banned. AI operations are clinical tools, not consumer novelties.
2. **No Horizontal Scrolling Navigation:** The dashboard shell must never use horizontal scroll bars for navigation. All destinations must be organized in the responsive sidebar.
3. **No Fake Metrics or Placeholder Charts:** Never render fabricated analytics, vanity graph lines, or mock counts. Every metric must derive from real database records.
4. **No Giant Empty Hero Areas:** Workspaces must prioritize high-density clinical tools and immediate patient workflows over oversized empty marketing cards.
5. **No Client-Side Availability Authority:** The UI must never calculate doctor chair availability on the client side; backend scheduling services remain the sole source of truth.
6. **No Arbitrary Hardcoded Colors:** All visual styling must use CSS custom properties from the design system tokens.
7. **No Broken Mobile Layouts:** Every table, dialog, and form must be fully usable down to 375px without horizontal window scrolling.
8. **No Monospace for Ordinary Prose:** Monospace is reserved exclusively for tabular numbers, dates, times, and IDs.

---

## 9. Accessibility (WCAG 2.1 AA)

- **Contrast Ratios:** All body text maintains a contrast ratio of at least 4.5:1 against the background; large headings maintain at least 3:1.
- **Focus Indicators:** High-visibility terracotta keyboard focus rings (`focus-visible:ring-2 focus-visible:ring-primary/40`) with focus offset.
- **Non-Color State Indicators:** Statuses are never conveyed by color alone; every indicator combines color with text or an icon.
- **Accessible Landmarks:** Semantic `<header>`, `<nav>`, `<main>`, `<aside>`, and `aria-label` landmarks throughout the dashboard shell.
- **Keyboard Navigation:** Escape closes all dialogs and mobile navigation drawers; focus returns gracefully to trigger buttons.

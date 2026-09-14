# DentAssist AI Design System

The definitive specification for the DentAssist AI clinical operations platform. This design system establishes a flat, precise, high-density workspace aesthetic engineered specifically for dental practice receptionists, clinic directors, and medical office managers.

---

## Design Philosophy

DentAssist AI is clinical operations infrastructure. It is not an experimental AI toy, a casual consumer mobile app, a marketing showcase, or a generic developer admin template.

1. **Precision Over Decoration**: Every pixel, divider, hairline rule, and label exists to convey real clinical status. Visual flair that does not inform an operational action is noise and must be eliminated.
2. **Structure Over Elevation**: Hierarchy is communicated through geometric alignment, contrast, dividers, and typography—never through floating cards, diffuse drop shadows, or decorative blur orbs.
3. **Calm Authority**: Dental reception desks are fast-paced, high-stress environments dealing with urgent patient calls, emergency toothaches, and complex dentist availability. The UI must project unwavering stability and quiet clarity.
4. **Purposeful Density**: Clinic staff need high information density to scan appointments, doctor schedules, and patient intake states without endless scrolling or oversized padded containers.

---

## Product Personality

The clinical staff’s immediate impression upon logging in should be:

> _"This is a high-grade medical operations console built for my clinic’s front desk."_

Not:

> _"This is another generic green SaaS template with soft floating cards and AI sparkles."_

| Dimension        | Trait                                | Expression in Interface                                                 |
| :--------------- | :----------------------------------- | :---------------------------------------------------------------------- |
| **Tone**         | Clinical, authoritative, disciplined | Clean monochrome typography, tabular numbers, precise labels            |
| **Demeanor**     | Calm, unobtrusive, responsive        | Micro-transitions (<150ms), silent status confirmations                 |
| **Intelligence** | Autonomous, contextual, grounded     | Transparent stage updates ("Reading clinic policy", "Checking chair 2") |
| **Trust**        | High fidelity, transparent           | Visible tenant isolation indicators, audit logging, zero fake metrics   |

---

## Visual Identity

DentAssist AI achieves instant recognizability through:

- **Hairline Structural Rules**: Crisp 1px borders dividing workspaces into structured zones.
- **Deep Cobalt & Ink Slate Accent System**: An authoritative, medical-grade indigo-cobalt brand color that distinguishes DentAssist from predictable green/teal healthcare SaaS.
- **Restrained Geometry**: Sharp 2px to 4px border radii across controls and panels.
- **Micro-Badging & Tabular Data**: High-density metadata tags and tabular numerals for rapid scanning.

---

## Flat UI Direction

Flat does not mean plain, lifeless, or unstyled. Flat means:

- **No Floating Cards**: Content sits directly within structured workspace panels bounded by 1px rules.
- **No Drop Shadows for Hierarchy**: Shadows are restricted strictly to temporary overlays (dialog popups, dropdown menus).
- **Surface Depth through Inset Tinting**: Subtle background contrast (`bg-background` vs `bg-muted/30`) replaces layered elevation.
- **Dividers as Structural Pillars**: Clean vertical and horizontal rules segment data columns and information groups.

---

## Color Direction

### Strict Prohibition of Green & Teal Branding

The previous brand identity used `#0F766E` (teal / cyan-green). **This is permanently deprecated and strictly prohibited.**

Do NOT use:

- `#0F766E`, emerald, mint, seafoam, turquoise, aqua, or teal as the primary brand color, navigation accent, action button, or AI indicator.
- Purple or violet gradients to represent artificial intelligence.
- Green or teal glows, decorative accents, or badges without explicit semantic meaning.

### The New Brand Direction: Deep Clinical Cobalt & Ink Slate

DentAssist AI standardizes on **Deep Cobalt (`oklch(0.42 0.165 264)` / `#1E40AF`)** paired with a cold slate neutral foundation:

- **Cognitive Association**: Deep cobalt conveys diagnostic rigor, institutional stability, and technological capability without the cliché look of green wellness apps.
- **Accessibility**: Provides an AAA contrast ratio (>7:1) against light backgrounds and pure white foregrounds.

---

## Color System

The color system operates via semantic OKLCH CSS variables declared in `app/globals.css`, supporting both high-clarity light mode and deep ink navy dark mode.

### Light Mode Workspace

- **Application Background (`--background`)**: `oklch(0.985 0.004 250)` (`#F8FAFC`) — Crisp clinical cold slate.
- **Panel Surface (`--card`, `--popover`)**: `oklch(1 0 0)` (`#FFFFFF`) — High-contrast clinical surface.
- **Inset Surface**: `oklch(0.96 0.004 250)` — Used for data row headers, code tags, and secondary containers.
- **Primary Brand Accent (`--primary`)**: `oklch(0.42 0.165 264)` (`#1E40AF`) — Authoritative Deep Cobalt.
- **Primary Foreground (`--primary-foreground`)**: `oklch(0.99 0 0)` — Crisp white text.
- **Workspace Border (`--border`, `--input`)**: `oklch(0.89 0.006 250)` — Hairline slate rule.
- **Text Primary (`--foreground`)**: `oklch(0.14 0.01 250)` — Deep ink navy text.
- **Text Muted (`--muted-foreground`)**: `oklch(0.48 0.01 250)` — Secondary metadata slate.

### Dark Mode Workspace

- **Application Background (`--background`)**: `oklch(0.12 0.015 255)` (`#0B0E14`) — Deep ink slate background.
- **Panel Surface (`--card`, `--popover`)**: `oklch(0.15 0.015 255)` — Low-reflection clinical panel.
- **Primary Brand Accent (`--primary`)**: `oklch(0.66 0.16 260)` — Luminous periwinkle-cobalt.
- **Primary Foreground (`--primary-foreground`)**: `oklch(0.11 0.02 260)` — Dark ink contrast text.
- **Workspace Border (`--border`, `--input`)**: `oklch(0.24 0.01 255)` — Crisp dark slate border.

---

## Semantic Color Tokens

Color is reserved strictly for meaningful semantic states. Never apply color decoratively.

| Semantic Token      | Light Mode Value            | Dark Mode Value             | Usage                                                                 |
| :------------------ | :-------------------------- | :-------------------------- | :-------------------------------------------------------------------- |
| **Primary / Brand** | `oklch(0.42 0.165 264)`     | `oklch(0.66 0.16 260)`      | Primary buttons, active tabs, focus rings, brand badges               |
| **Success**         | `oklch(0.55 0.15 150)`      | `oklch(0.68 0.14 150)`      | Strictly semantic: Verified email, Open clinic, Confirmed appointment |
| **Warning**         | `oklch(0.68 0.16 75)`       | `oklch(0.75 0.14 75)`       | Pending intake, Unverified email, Missing credentials                 |
| **Destructive**     | `oklch(0.577 0.245 27.325)` | `oklch(0.704 0.191 22.216)` | Errors, cancellations, delete actions                                 |
| **AI Activity**     | `oklch(0.42 0.165 264)`     | `oklch(0.66 0.16 260)`      | Autonomous receptionist processing, RAG lookup, calendar query        |

---

## Typography

The interface employs **Manrope** (backed by **Geist Mono** for numeric and machine identifiers).

### Typographic Principles

1. **No Oversized SaaS Titles**: Page headings top out at 20–24px. Hero titles never exceed 48px.
2. **Tabular Numerals**: All timestamps, durations, phone numbers, and chair slot counts use `font-mono tabular-nums` to ensure exact column alignment.
3. **Weight Over Size**: Distinguish visual hierarchy using font weight (`font-semibold`, `font-bold`) and color contrast rather than blowing up font sizes.
4. **Uppercase Restraint**: Uppercase is reserved strictly for compact metadata labels (`01 • INBOUND`, `ID: DOWNTOWN-CLINIC`, `STEP 1 OF 6`) with tracking (`tracking-wider`).

### Typographic Hierarchy Scale

- **Display (Hero)**: `text-3xl` to `text-5xl font-extrabold tracking-tight` (36–48px)
- **Page Title**: `text-xl` to `text-2xl font-bold tracking-tight` (20–24px)
- **Section Title**: `text-base` to `text-lg font-bold tracking-tight` (16–18px)
- **Panel Header / Group Title**: `text-sm font-semibold tracking-tight` (14px)
- **Body Content**: `text-xs` to `text-sm text-muted-foreground` (12–14px)
- **Compact Metadata / Badges**: `text-[10px]` to `text-[11px] font-mono` (10–11px)

---

## Surface System

Surfaces are flat planes defined by thin 1px perimeter rules and subtle background tinting:

- **Base Workspace Canvas (`bg-background`)**: The global surface on which panels sit.
- **Structured Panel (`bg-card border border-border`)**: The primary workspace region for data lists, forms, and editors.
- **Subtle Inset (`bg-muted/30 border border-border`)**: Inset containers for configuration summaries, code snippets, and filters.
- **Overlay Surface (`bg-popover border border-border shadow-xl`)**: Temporary elevated surfaces for dialogs and menus.

---

## Borders and Dividers

Borders are the primary structural mechanism of DentAssist AI:

- **Standard Border**: `1px solid var(--border)` (`border border-border`).
- **Subtle Divider**: `1px solid var(--border/60)` (`divide-y divide-border/60`).
- **Left Rule Indicator**: `border-l-2` or `border-l-3 border-primary` for active list selection or status notice banners.
- **Rule of Restraint**: Never double-border nested containers. If a panel has an outer border, internal sections should separate via `divide-y` or `border-t` rather than nested bordered boxes.

---

## Radius System

Large rounded containers (`rounded-2xl`, `rounded-3xl`, soft pills) are abolished. Geometry must feel clinical and engineered.

| Component Group             | Allowed Radius    | Tailwind Token  | Rationale                                                               |
| :-------------------------- | :---------------- | :-------------- | :---------------------------------------------------------------------- |
| **Page Containers**         | 0px to 4px        | `rounded-[4px]` | Clean perimeter framing                                                 |
| **Workspace Panels**        | 2px to 4px        | `rounded-[4px]` | Tight architectural geometry                                            |
| **Buttons & Controls**      | 2px to 4px        | `rounded-[3px]` | Compact, precise touch target                                           |
| **Text Inputs & Textareas** | 2px to 3px        | `rounded-[3px]` | Flat clinical form element                                              |
| **Badges & Tags**           | 2px to 3px        | `rounded-[2px]` | High-density rectangular chip                                           |
| **Dialog Modals**           | 4px to 6px        | `rounded-[4px]` | Minimal rounding for overlays                                           |
| **Dropdown Menus**          | 3px to 4px        | `rounded-[4px]` | Crisp popover containment                                               |
| **Status Dots**             | 9999px (Circular) | `rounded-full`  | Circular geometry is reserved strictly for status dots & person avatars |

---

## Shadows

Shadows must never be used as a substitute for borders or layout structure.

- **Card Shadows**: `shadow-none` by default. Cards never float with diffuse drop shadows.
- **Buttons**: `shadow-none`.
- **Dialogs & Menus**: `shadow-md` or `shadow-xl` to detach temporary modal overlays from the base workspace canvas.
- **No Glowing Effects**: Ambient background glow, blurred radial gradients, and neon colored box-shadows are strictly prohibited.

---

## Spacing and Density

- **Vertical Grid**: Spaced in deliberate 4px increments (`gap-1` = 4px, `gap-2` = 8px, `gap-3` = 12px, `gap-4` = 16px).
- **Control Sizing**: Standard input and button heights are `h-8` (32px) to `h-9` (36px). Compact controls are `h-7` (28px).
- **Whitespace Purpose**: Whitespace isolates independent operational domains, not empty decoration.

---

## Layout Philosophy

DentAssist AI avoids the generic "three floating rounded cards above a table" template. Every page composition reflects its actual operational job:

- **Operational Dashboard**: Attention-first summary header, real-time practitioner readiness indicators, and immediate action items.
- **Scheduling Workspace**: Split-pane timeline or tabular hours grid with chronological ordering and doctor column rules.
- **Configuration Hub**: Clean horizontal or vertical tab navigation with progressive checklist verification.

---

## Grid and Composition

- **Max Layout Boundary**: `max-w-7xl mx-auto px-4 sm:px-6` ensures wide-screen legibility without excessive line length.
- **Two-Column Asymmetry**: 2/3 workspace surface for core data; 1/3 sidebar panel for contextual controls, quick actions, or AI monitor.
- **Data Density**: Tables and schedule rows maintain row heights between 36px and 44px for maximum vertical efficiency.

---

## Navigation

- **Top App Bar**: Sticky `h-14` clinical navigation bar with brand mark, practice switcher, tenant scope indicator, and practitioner profile.
- **Active Navigation States**: Indicated via a bottom rule (`border-b-2 border-primary`), deep cobalt text, or subtle tint (`bg-primary/10`). Never use oversized rounded pill tabs.
- **Practice Switcher**: Compact `h-8` control displaying active practice name, tenant slug, and quick creation trigger.

---

## Buttons

Buttons feature a `rounded-[3px]` radius, clear typographic hierarchy, and immediate focus outlines:

- **Primary Action (`variant="default"`)**: Deep cobalt background (`bg-primary text-primary-foreground hover:bg-primary/90`). Reserved for the single primary operational action per view.
- **Secondary / Outline (`variant="outline"`)**: Crisp hairline border (`border-border bg-background hover:bg-muted/70`). Used for supporting actions.
- **Quiet Action (`variant="ghost"`)**: Flat text button with light hover wash (`hover:bg-muted/70 text-muted-foreground`).
- **Destructive Action (`variant="destructive"`)**: Crimson tint (`bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/15`).

---

## Inputs and Forms

- **Label Placement**: Explicit labels positioned directly above inputs (`text-xs font-semibold text-foreground`).
- **Geometry**: Compact `h-8.5` height, `rounded-[3px]`, `px-3 py-1.5`.
- **Focus Rings**: Precise 1px hairline ring (`focus-visible:ring-1 focus-visible:ring-ring/40`).
- **Validation**: `aria-invalid` triggers a crisp crimson border (`border-destructive`) and concise `text-xs text-destructive` feedback.

---

## Tables and Data Grids

- **Perimeter**: Bounded by crisp top and bottom borders (`border-y border-border`), with zero outer rounding.
- **Headers**: Compact `h-8` row with uppercase tracking (`text-[11px] uppercase font-semibold text-muted-foreground bg-muted/40`).
- **Rows**: Dense `py-2.5 px-3.5` cells with tabular numerals (`tabular-nums`) and subtle hover highlight (`hover:bg-muted/30`).

---

## Cards and Panels

Cards should only be used when grouping an independent operational entity. Generic sections should use open headers with horizontal dividers rather than wrapping everything in an enclosed card.

When a container is needed, use `WorkspacePanel` with `rounded-[4px] border border-border bg-card shadow-none`.

---

## Dialogs and Modals

- **Overlay**: Clean `bg-black/40` without heavy blur.
- **Popup Container**: `rounded-[4px] border border-border bg-popover p-6 shadow-xl max-w-md`.
- **Header & Footer**: Separated from body content with crisp hairline dividers (`border-b border-border/50` and `border-t border-border/50`).

---

## Tabs

- **Clinical Tab Bar**: Flat horizontal tab track with a bottom border (`border-b border-border bg-transparent`).
- **Tab Triggers**: Crisp text buttons with `border-b-2` active indicators (`border-primary text-foreground font-semibold`). Soft pill tabs with rounded backgrounds are forbidden.

---

## Badges and Status Indicators

- **Badge Format**: Compact rectangular chip with `rounded-[2px] border px-1.5 py-0.5 text-[11px] font-medium`.
- **StatusIndicator Format**: Pair a circular dot (`size-1.5 rounded-full`) with an explicit textual label to ensure full accessibility.

---

## Empty States

Empty states are operational guidance moments:

1. State clearly what is missing (e.g., "No practitioners registered").
2. Explain why it matters ("Add your clinic's dentists to configure chair availability and automated booking").
3. Provide an immediate primary action button ("Add First Dentist").

---

## Loading and Error States

- **Loading**: Skeletons that match the target data table or panel layout, with subtle `bg-muted/60` pulse animation.
- **Error**: High-visibility clinical banner with alert icon, clear technical cause, and a "Retry Operation" trigger.

---

## AI Interaction Design

The autonomous AI receptionist engine operates transparently:

- **Activity Rows**: Display exact machine stages:
  - `Searching clinic knowledge base`
  - `Checking dentist availability`
  - `Reading clinic scheduling policy`
  - `Verifying calendar slot conflicts`
  - `Action completed`
- **Visual Styling**: Subtle periwinkle/cobalt badge or spinning loader.
- **Prohibited AI Tells**: Sparkle emojis (`✨`), purple/magenta gradients, glowing pulses, and theatrical conversational chat bubbles are banned.

---

## Appointment & Scheduling UI

- **Timeline Layout**: Chronological vertical schedule rules with tabular time display (`09:00 AM`, `10:30 AM`).
- **Chair & Practitioner Scoping**: Explicit doctor attribution (`Dr. Vance • Chair 1`).
- **Status Coloring**: Confirmed (Cobalt / Active), Pending Intake (Amber), Completed (Pine Green), Cancelled (Crimson).

---

## Knowledge Base (RAG) UI

- **Document Registry**: High-density table listing clinic brochures, FAQ sheets, and PDF policies.
- **Indexing Status**: Real-time tabular tokens (`INDEXED`, `PROCESSING`, `FAILED`).
- **Source Citation**: Precise document and page references (`[Policy.pdf • §4.2]`).

---

## Dashboard UI

The main operations console answers: _What requires attention right now?_

- Top: Active practice identifier, tenant isolation status, practitioner count.
- Center: Clinical setup progress and configuration hubs.
- Lower: Autonomous engine launchpad and integration previews.

---

## Accessibility

- **Contrast Floor**: All text elements meet or exceed WCAG 2.1 AA standards (>4.5:1 for body text, >3:1 for large text).
- **Color Independence**: Status information is never conveyed by color alone; every indicator includes explicit text or an icon.
- **Keyboard Navigation**: Clear visible focus rings (`focus-visible:ring-1 focus-visible:ring-ring/40`) on all interactive buttons, switches, and inputs.
- **Reduced Motion**: Respects `prefers-reduced-motion: reduce` with instantaneous state transitions.

---

## Anti-Slop Rules

Every interface element is audited against these anti-slop rules:

1. **Never use green/teal (`#0F766E`) for primary branding, buttons, navigation, or AI indicators.**
2. **Never use `rounded-xl`, `rounded-2xl`, or `rounded-3xl` containers.**
3. **Never wrap every section in a floating card.**
4. **Never use drop shadows as a substitute for borders.**
5. **Never use decorative gradients or glowing background orbs.**
6. **Never use AI sparkles (`✨`) or purple gradients.**
7. **Never display fake metrics or meaningless analytics charts.**
8. **Never use circular pills for button or input controls.**
9. **Never rely on color alone to communicate appointment or clinic status.**
10. **If a screen looks like a generic AI-generated SaaS dashboard or template, refactor it immediately.**

---

## Component Guidelines

When creating new components for DentAssist AI:

- Import primitives from `@/components/ui/` or `@/components/workspace/`.
- Use `rounded-[2px]` to `rounded-[4px]`.
- Rely on `border border-border` and `divide-y divide-border/60` for separation.
- Keep control heights compact (`h-7` to `h-9`).
- Use monospace numbers for times, dates, and identifiers.

---

## Page Composition Guidelines

1. **Header**: Use `PageHeader` with title, optional metadata tag, and contextual action group.
2. **Body**: Use `WorkspacePanel` or open divider-separated sections.
3. **Data**: Render collections with `DataTable` or `AppointmentTimeline`.
4. **Empty State**: Use `EmptyState` with actionable CTAs.
5. **Verification**: Confirm that no green/teal branding or soft rounded cards are introduced.

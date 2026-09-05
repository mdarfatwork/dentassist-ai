# DentAssist AI — Design Direction

## Brand Personality

DentAssist should communicate:

| Attribute        | Design Implication                    |
| :--------------- | :------------------------------------ |
| **Trustworthy**  | Clean layouts, restrained colors      |
| **Clinical**     | Lots of whitespace, strong typography |
| **Modern**       | Subtle motion, polished components    |
| **AI-powered**   | AI states, streaming, tool activity   |
| **Professional** | Dense enough for clinic staff         |
| **Friendly**     | Rounded surfaces, approachable copy   |
| **Reliable**     | Clear states, confirmations, errors   |

### Perception Goal

The clinic owner should feel:

> _"This is software I could actually give to my receptionist."_

Not:

> _"This is a developer's AI demo."_

---

## 1. Color System

Avoid the typical purple AI gradient. DentAssist uses a medical/healthcare-inspired primary color.

### Primary Palette

- **Primary Base:** `#0F766E` (Teal / Cyan-green)
- _Lighter and darker shades generated through the theme system._

#### Why Teal?

Teal communicates:

- Healthcare
- Trust
- Calm
- Technology

...without looking like every generic AI startup.

### Accent Palette

- Use a **subtle blue/cyan accent** specifically for AI-specific elements (streaming tokens, AI badges, tool invocations).
- **Rule of Restraint:** Do not make the entire UI colorful; keep accents purposeful and minimal.

---

## 2. Background & Surfaces

Use an almost-white background rather than pure white everywhere to give the dashboard depth without relying on heavy elevation.

### Light Mode

- **Application Background:** `#F8FAFC`
- **Cards / Containers:** `#FFFFFF`

### Dark Mode

- **Application Background:** `#0B0F14`

---

## 3. Typography

### Primary Font

- **Family:** `Manrope` (applied across the entire interface)

### Scale & Hierarchy

| Level                   | Font Size |
| :---------------------- | :-------- |
| **Display**             | 32–40px   |
| **Page Title**          | 24–28px   |
| **Section Title**       | 18–20px   |
| **Body**                | 14–16px   |
| **Metadata / Captions** | 12–13px   |

> **Principle:** Don't make everything huge. This is SaaS software built for dense workflows, not a marketing landing page.

---

## 4. Border Radius

Moderate rounding across all UI components. Avoid the "everything is a giant pill" aesthetic.

| Component            | Border Radius |
| :------------------- | :------------ |
| **Buttons**          | `8px`         |
| **Inputs**           | `8px`         |
| **Cards**            | `12px`        |
| **Dialogs / Modals** | `14px`        |
| **Chat Bubbles**     | `14px`        |
| **Widget**           | `16px`        |

---

## 5. Shadows & Elevation

- **Style:** Very subtle.
- **Surface Strategy:** Most cards should rely on `border + background` rather than large, diffuse drop shadows.
- **Look & Feel:** Crisp, clean, and precise.

---

## 6. Icons

- **Library:** [Lucide Icons](https://lucide.dev/) (strictly single library, do not mix icon sets).
- **Icon Sizing:** `16px`, `18px`, `20px`.
- **Style:** Mostly stroke icons with consistent stroke widths.

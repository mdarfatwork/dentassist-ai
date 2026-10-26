# DentAssist AI

> **Multi-Tenant Autonomous AI Receptionist & Appointment Scheduling Platform for Modern Dental Practices**

[![Live Demo](https://img.shields.io/badge/Demo-dentassist--care.vercel.app-A65335?style=flat&logo=vercel)](https://dentassist-care.vercel.app/)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.19-2D3748?style=flat&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](<https://img.shields.io/badge/Database-PostgreSQL%20(Neon)-336791?style=flat&logo=postgresql>)](https://neon.tech/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E=24%20%3C25-339933?style=flat&logo=node.js)](https://nodejs.org/)
[![Package Manager](https://img.shields.io/badge/pnpm-10.20-F69220?style=flat&logo=pnpm)](https://pnpm.io/)

**DentAssist AI** is a full-stack, multi-tenant SaaS platform engineered specifically for dental practices. It equips dental clinics with an intelligent, document-grounded AI receptionist that handles patient inquiries 24/7 and coordinates end-to-end appointment scheduling synchronized directly with clinic operatory calendars via Google Calendar.

Dental clinics upload their real-world clinical guidelines, insurance policies, procedural FAQs, and pricing schedules. DentAssist AI parses and indexes these documents into a tenant-isolated vector store using Retrieval-Augmented Generation (RAG). Patients chatting via an embeddable website widget receive grounded, clinic-specific answers and can check real-time doctor availability and book appointments without front-desk intervention.

🔗 **Live Application:** [https://dentassist-care.vercel.app/](https://dentassist-care.vercel.app/)

---

![DentAssist AI Platform Overview](public/images/dentassist-hero.webp)

---

## Table of Contents

- [Core Capabilities](#core-capabilities)
- [How It Works](#how-it-works)
- [System Architecture](#system-architecture)
  - [High-Level Architectural Topology](#high-level-architectural-topology)
  - [AI Receptionist & Scheduling Pipeline](#ai-receptionist--scheduling-pipeline)
  - [Multi-Tenant Data Isolation](#multi-tenant-data-isolation)
- [Technology Stack](#technology-stack)
- [Project Directory Structure](#project-directory-structure)
- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Environment Variable Configuration](#environment-variable-configuration)
- [Database Setup & Schema Management](#database-setup--schema-management)
- [Third-Party Integrations Setup](#third-party-integrations-setup)
  - [1. Google OAuth (Authentication)](#1-google-oauth-authentication)
  - [2. Google Calendar Integration (Scheduling)](#2-google-calendar-integration-scheduling)
  - [3. LLM Providers & Failover Cascade](#3-llm-providers--failover-cascade)
  - [4. Pinecone Vector Database (RAG)](#4-pinecone-vector-database-rag)
  - [5. S3-Compatible Document Storage](#5-s3-compatible-document-storage)
  - [6. Resend (Transactional Email)](#6-resend-transactional-email)
- [Available Scripts](#available-scripts)
- [Automated Testing Suite](#automated-testing-suite)
- [Embeddable Website Widget](#embeddable-website-widget)
- [Security & Compliance Posture](#security--compliance-posture)
- [Current Scope vs. Roadmap](#current-scope-vs-roadmap)
- [Deployment Overview](#deployment-overview)
- [Maintainer & License](#maintainer--license)

---

## Core Capabilities

### 🏢 Clinic Account & Practice Roster Management

- **Multi-Tenant Administration:** Dedicated workspaces isolated per dental practice (`organization`), backed by unique slugs and role-based access control (`OWNER`, `ADMIN`, `STAFF`, `DENTIST`).
- **Practitioner Roster:** Manage dentists, dental hygienists, and specialists with granular clinical specializations.
- **Service Catalog:** Configure dental procedures, descriptions, and chair durations (e.g., Routine Cleaning: 45 min, Root Canal: 90 min, Teeth Whitening: 60 min).
- **Operating Hours & Closures:** Define weekly practice schedules per day of week, emergency slots, and holiday closures.

### 🧠 Document-Grounded Knowledge Base (RAG)

- **Multi-Format Ingestion:** Drag-and-drop ingestion of PDF (`pdf-parse`), DOCX (`mammoth`), Markdown, and plain text files.
- **Markdown Normalization:** Automated stripping of raw HTML, executable script tags, page-number artifacts, and redundant whitespace.
- **Semantic Chunking:** Context-aware text chunking with structural heading path preservation and configurable token overlap.
- **Vector Search:** Automatic embeddings generation and storage in Pinecone with tenant-isolated namespaces.
- **Prompt Sanitization:** Prompt guard inspection to neutralize prompt injection, jailbreak attempts, and system prompt exfiltration.

### 📅 Real-Time Google Calendar Synchronization

- **Two-Way Availability Calculation:** Dynamically checks practitioner working hours, clinic closures, confirmed internal bookings, and real-time Google Calendar busy blocks.
- **Direct Event Booking:** Automatically injects confirmed patient bookings into the clinic's dedicated Google Calendar with patient details and procedure duration.
- **Strict Transactional Compensation:** If a synchronized external Google Calendar event fails during booking, the database reservation is automatically rolled back to prevent phantom bookings or scheduling desynchronization.
- **Token Security:** Clinic OAuth refresh tokens are encrypted at rest using AES-256-GCM authenticated encryption.

### 🤖 Autonomous AI Receptionist & Tool Calling

- **Tri-Provider Failover Cascade:** Primary inference runs on Google Gemini (`gemini-2.5-flash-lite`), automatically failing over to Groq and OpenRouter if rate limits, timeouts, or network errors occur.
- **Circuit Breaker Pattern:** Tracks provider failures, request timeouts, and cooldown intervals to avoid cascade exhaustion.
- **Deterministic Function Calling:** Exposes structured tools to the LLM:
  - `searchKnowledge`: Queries Pinecone for clinical guidance, post-op instructions, insurance policies, and clinic FAQs.
  - `getClinicInfo` & `getClinicHours`: Fetches verified clinic address, contact info, and operational hours.
  - `listServices`: Discloses active dental treatments and required durations.
  - `checkAvailability`: Calculates verified open slots for specified dates and dentists.
  - `bookAppointment`: Collects validated patient details, reserves appointment slots, and returns a unique reference code.
  - `rescheduleAppointment` & `cancelAppointment`: Manages modifications against existing booking references.

### 💬 Embeddable Client Website Widget

- **Zero-Dependency Script:** Lightweight client-side script (`public/widget.js`) embeddable into any third-party practice website (WordPress, Webflow, Squarespace, custom HTML).
- **Domain Whitelisting:** Enforces CORS and domain authorization so the widget only operates on verified clinic domains.
- **Branding Customization:** Practice owners configure primary colors, assistant name, welcome greetings, launcher position, and branding badges.
- **In-Browser Audio Testing:** Experimental Web Speech API support allows staff and patients to test microphone speech recognition and voice playback directly within the browser.

---

## How It Works

```
                        ┌──────────────────────────────────────────────┐
                        │          Patient on Dental Website           │
                        │    (Desktop / Mobile via widget.js)          │
                        └──────────────────────┬───────────────────────┘
                                               │
                                       Asks clinical question
                                       or requests appointment
                                               │
                                               ▼
                        ┌──────────────────────────────────────────────┐
                        │       DentAssist AI Conversation Core        │
                        │  (Tri-Provider Failover + Prompt Guard)      │
                        └───────┬──────────────────────────────┬───────┘
                                │                              │
                  Knowledge Question?                 Booking Request?
                                │                              │
                                ▼                              ▼
        ┌───────────────────────────────────┐  ┌───────────────────────────────────┐
        │     Pinecone Vector Retrieval     │  │   Scheduling Service Availability  │
        │   - Tenant-Isolated Namespace     │  │   - Practice Operating Hours      │
        │   - Top-K Semantic Text Chunks    │  │   - Doctor Assignments            │
        │   - Policy / Pricing / Post-Op    │  │   - Holiday & Closure Overrides   │
        └─────────────────┬─────────────────┘  │   - Google Calendar Free/Busy     │
                          │                    └─────────────────┬─────────────────┘
                          │                                      │
                          ▼                                      ▼
        ┌───────────────────────────────────┐  ┌───────────────────────────────────┐
        │  Grounded, Hallucination-Free     │  │  Atomic Appointment Reservation   │
        │  Response with Source Citations   │  │  - PostgreSQL Booking Record      │
        │                                   │  │  - Synced Google Calendar Event   │
        │                                   │  │  - Confirmation Email Delivery    │
        └───────────────────────────────────┘  └───────────────────────────────────┘
```

1. **Practice Setup:** Practice owners configure their clinic profile, roster of dentists, services, operating hours, and connect their Google Calendar via OAuth.
2. **Knowledge Upload:** Clinic staff upload clinic policies, FAQs, price lists, and preparation guidelines (PDF, DOCX, TXT, MD). The system cleans the content, chunks it semantically, generates vector embeddings, and stores them in a dedicated Pinecone namespace.
3. **Widget Installation:** The clinic embeds a small `<script>` snippet onto their public website.
4. **Patient Interaction:**
   - **Informational Inquiries:** When a patient asks about insurance, pricing, or procedures, the AI performs similarity search against the clinic's Pinecone namespace and replies with accurate, grounded information.
   - **Appointment Booking:** When a patient asks to book, the receptionist queries clinic operating hours and Google Calendar free/busy slots, suggests open times, collects patient details, and atomically creates the booking in both the database and the clinic's Google Calendar.

---

## System Architecture

### High-Level Architectural Topology

```mermaid
flowchart TD
    subgraph Client["Client Tier"]
        AdminUI["Practice Dashboard\n(Next.js App Router + Tailwind CSS)"]
        Widget["Web Booking Widget\n(Vanilla JS Embed: widget.js)"]
    end

    subgraph Edge["Edge & Routing Tier"]
        NextServer["Next.js Application Server\n(API Routes + Server Actions)"]
        TRPC["tRPC v11 Router\n(Type-Safe Internal API)"]
        AuthModule["Better Auth Engine\n(Email/Password + Google OAuth)"]
    end

    subgraph CoreServices["Domain Services Tier"]
        RecService["AI Receptionist Service\n(Prompt Assembly & Function Calling)"]
        SchedService["Scheduling & Availability Engine\n(Conflict Checking & Two-Way Sync)"]
        DocService["Knowledge Ingestion Pipeline\n(PDF/DOCX Normalization & Chunking)"]
    end

    subgraph DataIntegrations["External & Persistence Tier"]
        DB[(PostgreSQL / Neon\nPrisma ORM)]
        S3[(AWS S3 / Compatible\nDocument Storage)]
        Pinecone[(Pinecone Vector DB\nTenant Namespaces)]
        LLM["AI Inference Cascade\n1. Google Gemini\n2. Groq\n3. OpenRouter"]
        GCal["Google Calendar API\n(OAuth 2.0 / FreeBusy / Events)"]
        Email["Resend Email API\n(Account Verification & Resets)"]
    end

    AdminUI -->|tRPC Queries / Mutations| TRPC
    AdminUI -->|Auth Requests| AuthModule
    Widget -->|REST API: /api/widget/*| NextServer

    NextServer --> TRPC
    TRPC --> RecService
    TRPC --> SchedService
    TRPC --> DocService

    RecService --> LLM
    RecService --> Pinecone
    RecService --> SchedService

    SchedService --> DB
    SchedService --> GCal

    DocService --> S3
    DocService --> Pinecone
    DocService --> DB

    AuthModule --> DB
    AuthModule --> Email
```

### AI Receptionist & Scheduling Pipeline

```mermaid
sequenceDiagram
    autonumber
    actor Patient as Patient (Website)
    participant Widget as widget.js / Client
    participant API as /api/widget/chat
    participant Rec as Receptionist Service
    participant LLM as Gemini / Groq Cascade
    participant Sched as Scheduling Engine
    participant GCal as Google Calendar API
    participant DB as PostgreSQL (Prisma)

    Patient->>Widget: "Can I book a teeth cleaning this Friday afternoon?"
    Widget->>API: POST /api/widget/chat (session token, message)
    API->>Rec: Process conversation turn
    Rec->>LLM: Prompt + Tools (checkAvailability, searchKnowledge)
    LLM-->>Rec: Call tool checkAvailability(service: "cleaning", date: "2026-10-30")
    Rec->>Sched: checkAvailability(orgId, serviceId, date)
    Sched->>DB: Query working hours, dentist roster & booked appointments
    Sched->>GCal: Query free/busy blocks for linked clinic calendar
    Sched-->>Rec: Available slots: [02:00 PM, 03:00 PM, 04:15 PM]
    Rec->>LLM: Tool Result (slots formatted in clinic timezone)
    LLM-->>Rec: "We have openings on Friday at 2:00 PM, 3:00 PM, and 4:15 PM. Which suits you best?"
    Rec-->>API: Response payload
    API-->>Widget: Render assistant message to patient

    Patient->>Widget: "2:00 PM works. My name is Jane Doe, jane@example.com, 555-0199"
    Widget->>API: POST /api/widget/chat
    API->>Rec: Process booking turn
    Rec->>LLM: Prompt + Tool (bookAppointment)
    LLM-->>Rec: Call tool bookAppointment(startTime, patient details)
    Rec->>Sched: bookAppointment(...)
    Sched->>DB: Atomically reserve appointment (Status: CONFIRMED)
    Sched->>GCal: Insert calendar event (summary, patient info)
    alt Google Calendar Sync Succeeded
        Sched-->>Rec: Booking confirmed (Reference: DA-7821)
        Rec->>LLM: Tool Result (Success, Reference DA-7821)
        LLM-->>Widget: "Your appointment is confirmed for Friday at 2:00 PM! Reference: DA-7821."
    else Google Calendar Sync Failed
        Sched->>DB: Rollback DB appointment record
        Sched-->>Rec: Error: Google Calendar synchronization failed
        Rec-->>Widget: "We encountered an issue synchronizing with the calendar. Please choose another time or contact the front desk."
    end
```

### Multi-Tenant Data Isolation

DentAssist AI enforces rigorous multi-tenant data boundary isolation across all architectural layers:

1. **Relational Database (PostgreSQL / Prisma):**
   - Every domain model (`Dentist`, `Service`, `WorkingHours`, `Holiday`, `Document`, `DocumentChunk`, `Appointment`, `GoogleCalendarConnection`, `Conversation`, `WebsiteWidget`) contains a mandatory foreign key reference to `organizationId`.
   - All tRPC mutations and queries pass through the `organizationProcedure` middleware, which validates that the authenticated user belongs to the active organization (`ctx.organizationId`).
2. **Vector Database (Pinecone):**
   - Vector indexing and semantic searches partition records strictly by tenant namespaces (`{prefix}-{organizationId}`).
   - Vector IDs follow a deterministic, collision-safe format: `${organizationId}:${documentId}:${chunkId}`.
   - Vector queries enforce hard metadata filtering on `organizationId`.
3. **Object Storage (AWS S3):**
   - Uploaded documents and generated Markdown derivatives are stored using tenant-prefixed storage keys: `organizations/{organizationId}/documents/{documentId}/*`.
4. **Google Calendar Connections:**
   - Google OAuth credentials and calendar IDs are stored with a `@unique` relation to `organizationId`. One practice cannot inspect or modify another practice's calendar integration.

---

## Technology Stack

| Category             | Technology                                                                                              | Version          | Purpose in DentAssist AI                                             |
| :------------------- | :------------------------------------------------------------------------------------------------------ | :--------------- | :------------------------------------------------------------------- |
| **Framework**        | [Next.js](https://nextjs.org/)                                                                          | `16.3.1`         | Full-stack framework (App Router, Server Actions, Route Handlers)    |
| **UI Library**       | [React](https://react.dev/)                                                                             | `19.2.8`         | Declarative UI rendering                                             |
| **Language**         | [TypeScript](https://www.typescriptlang.org/)                                                           | `5.x`            | Strict end-to-end type safety                                        |
| **Styling**          | [Tailwind CSS](https://tailwindcss.com/)                                                                | `4.x`            | Modern utility-first design system with CSS custom properties        |
| **Primitives**       | [Base UI](https://base-ui.com/)                                                                         | `1.7.0`          | Accessible headless UI primitives (`@base-ui/react`)                 |
| **Icons**            | [Lucide React](https://lucide.dev/)                                                                     | `1.31.0`         | Clean, clinical icon set                                             |
| **Database**         | [PostgreSQL](https://postgresql.org/) / [Neon](https://neon.tech/)                                      | Latest           | Multi-tenant relational persistence                                  |
| **ORM**              | [Prisma](https://www.prisma.io/)                                                                        | `6.19.3`         | Type-safe database client, migrations, and schema modeling           |
| **Authentication**   | [Better Auth](https://better-auth.com/)                                                                 | `1.7.2`          | Email/password, session tokens, and Google OAuth                     |
| **API Layer**        | [tRPC](https://trpc.io/)                                                                                | `11.18.0`        | End-to-end type-safe RPC router for client-server communication      |
| **Client State**     | [TanStack React Query](https://tanstack.com/query)                                                      | `5.102.8`        | Asynchronous query fetching, caching, and cache invalidation         |
| **AI / LLM**         | [Google Gemini](https://ai.google.dev/)                                                                 | `2.5-flash-lite` | Primary LLM inference and function calling provider                  |
| **LLM Failover**     | [Groq](https://groq.com/) / [OpenRouter](https://openrouter.ai/)                                        | Secondary        | High-speed circuit-breaker fallback inference providers              |
| **AI Framework**     | [LangChain Core](https://js.langchain.com/)                                                             | `1.2.11`         | Tool abstractions and chat model schemas                             |
| **Vector DB**        | [Pinecone](https://www.pinecone.io/)                                                                    | `9.0.0`          | Serverless vector database with tenant namespace partitioning        |
| **Embeddings**       | [multilingual-e5-large](https://www.pinecone.io/)                                                       | Inference API    | Dense vector embeddings for clinical text chunks                     |
| **Document Parsing** | [pdf-parse](https://www.npmjs.com/package/pdf-parse) & [mammoth](https://www.npmjs.com/package/mammoth) | Latest           | Server-side text extraction from PDF and DOCX files                  |
| **Object Storage**   | [AWS SDK S3](https://aws.amazon.com/s3/)                                                                | `3.1136.0`       | S3 client and presigned URL generation for uploaded files            |
| **Calendar Sync**    | Google Calendar API                                                                                     | v3               | OAuth 2.0 integration, free/busy inspection, and event booking       |
| **Email Delivery**   | [Resend](https://resend.com/) & [React Email](https://react.email/)                                     | Latest           | Transactional emails for email verification and password reset       |
| **Validation**       | [Zod](https://zod.dev/)                                                                                 | `4.5.4`          | Runtime schema validation for forms, APIs, and environment variables |
| **Serialization**    | [SuperJSON](https://github.com/blitz-js/superjson)                                                      | `2.2.6`          | Transparent serialization of Dates, Maps, and Sets over tRPC         |

---

## Project Directory Structure

```
dentassist-ai/
├── app/                                 # Next.js App Router root
│   ├── (auth)/                          # Authentication route group
│   │   ├── login/                       # Sign-in page (Email/Password & Google)
│   │   ├── signup/                      # Practice registration page
│   │   ├── forgot-password/             # Password reset request page
│   │   ├── reset-password/              # Password reset token entry page
│   │   └── verify-email/                # Email verification landing page
│   ├── api/                             # Route Handlers
│   │   ├── auth/[...all]/               # Better Auth endpoint handler
│   │   ├── google-calendar/             # Google Calendar OAuth connect & callback
│   │   ├── receptionist/chat/           # Playground interactive chat testing
│   │   ├── trpc/[trpc]/                 # tRPC HTTP handler
│   │   ├── upload/                      # File upload & presigned URL endpoints
│   │   └── widget/                      # Public widget endpoints (chat, session, config)
│   ├── dashboard/                       # Authenticated Practice Dashboard
│   │   ├── appointments/                # Appointments calendar and roster table
│   │   ├── calendar/                    # Google Calendar integration settings
│   │   ├── dentists/ / practitioners/   # Dentist & hygienist management
│   │   ├── holidays/                    # Clinic closures and holiday exceptions
│   │   ├── knowledge-base/              # Knowledge document upload & chunk explorer
│   │   ├── receptionist/                # AI Receptionist prompts & test playground
│   │   ├── services/                    # Dental procedure catalog
│   │   ├── settings/                    # Clinic profile & operating parameters
│   │   ├── voice-receptionist/          # Browser Web Speech audio testing
│   │   ├── widget/                      # Website widget embed configuration
│   │   └── working-hours/               # Weekly operating hours schedule
│   ├── about/                           # Public About page
│   ├── privacy/                         # Public Privacy Policy page
│   ├── terms/                           # Public Terms of Service page
│   ├── layout.tsx                       # Global root layout & font loading
│   └── page.tsx                         # Public marketing homepage
├── components/                          # Reusable UI Components
│   ├── dashboard/                       # Dashboard layouts, sidebar, header, KPIs
│   ├── landing/                         # Marketing hero, features, workflow, footer
│   ├── ui/                              # Atomic UI primitives (button, card, dialog, badge)
│   └── workspace/                       # Clinical panel wrappers & empty states
├── config/                              # Global Configuration
│   └── env.ts                           # Zod runtime environment variable validation
├── emails/                              # React Email templates (verification, reset)
├── lib/                                 # Shared Domain Libraries
│   ├── ai/                              # LLM providers, circuit breaker, failover manager
│   ├── appointment/                     # Core appointment service logic
│   ├── auth/                            # Better Auth server configuration & client
│   ├── calendar/                        # Google Calendar OAuth, AES encryption, scheduling
│   ├── clinic/                          # Clinic data resolution service
│   ├── dashboard/                       # Dashboard route definitions & breadcrumb metadata
│   ├── db.ts                            # Global Prisma client singleton
│   ├── email/                           # Resend email delivery helpers
│   ├── knowledge/                       # Document parser, normalizer, chunker, vector store
│   ├── receptionist/                    # Tool definitions, prompt builder, date resolver
│   ├── storage/                         # AWS S3 client & presigned URL generator
│   ├── trpc/                            # tRPC React client hooks
│   ├── voice/                           # Web Speech API recognition & synthesis abstractions
│   └── widget/                          # Widget session manager & domain validator
├── prisma/                              # Database Schema
│   └── schema.prisma                    # Prisma data models and relations
├── public/                              # Static Public Assets
│   ├── images/                          # Product screenshots and hero graphics
│   └── widget.js                        # Embeddable website booking widget
├── server/                              # Backend Server Logic
│   └── trpc/                            # tRPC server definition, context & routers
│       ├── context.ts                   # Session and organization context extraction
│       ├── trpc.ts                      # Procedures (public, protected, organization)
│       └── routers/                     # Domain routers (appointments, calendar, docs, etc.)
├── tests/                               # Automated Test Suite
│   ├── ai/                              # Circuit breaker & failover unit tests
│   ├── calendar/                        # Google Calendar scheduling tests
│   ├── knowledge/                       # Chunking normalizer & prompt guard tests
│   ├── receptionist/                    # Receptionist workflow & tool calling tests
│   ├── voice/                           # Voice abstraction tests
│   ├── widget/                          # Widget domain validation & session tests
│   └── run-all.ts                       # Test runner entry point
├── package.json                         # Project metadata and dependencies
└── tsconfig.json                        # TypeScript compiler configuration
```

---

## Prerequisites

Before setting up DentAssist AI locally, ensure your environment meets the following requirements:

- **Node.js:** `Node.js >= 24.0.0 < 25.0.0` (as specified in `package.json` `"engines"` and `.github/workflows/ci.yml`).
- **Package Manager:** `pnpm` version `10.20.0` (or `pnpm >= 10.x`).
- **Database:** A running PostgreSQL instance (PostgreSQL 15+ locally or a cloud database such as [Neon](https://neon.tech/)).
- **Git:** Installed on your development workstation.

---

## Local Development Setup

Follow these exact steps to clone, configure, and launch DentAssist AI on your local machine:

### 1. Clone the Repository

```bash
git clone https://github.com/mdarfatwork/dentassist-ai.git
cd dentassist-ai
```

### 2. Install Dependencies

Install the project dependencies using `pnpm` with the checked-in `pnpm-lock.yaml`:

```bash
pnpm install
```

### 3. Configure Environment Variables

Create a local `.env` file by copying `.env.example`:

```bash
cp .env.example .env
```

Open `.env` in your editor and configure the necessary credentials (see [Environment Variable Configuration](#environment-variable-configuration) below).

### 4. Initialize Database & Generate Prisma Client

Generate the Prisma Client and synchronize the schema with your PostgreSQL database:

```bash
# Generate the Prisma TypeScript client
pnpm db:generate

# Push schema directly to your development PostgreSQL database
pnpm db:push
```

### 5. Start the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your web browser. The marketing page and authentication portal will be live.

---

## Environment Variable Configuration

All environment variables are validated at runtime via `config/env.ts` using Zod schemas. If any required variables are missing or misconfigured in production, application startup will fail with explicit diagnostic errors.

| Variable Name                              | Required?  | Default / Example Value                              | Description                                                                                                          |
| :----------------------------------------- | :--------: | :--------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------- |
| **`DATABASE_URL`**                         |  **Yes**   | `postgresql://user:pass@host/db?sslmode=require`     | PostgreSQL connection string (Neon or standard Postgres).                                                            |
| **`DB_URL`**                               |     No     | Optional fallback for `DATABASE_URL`.                | Alternative database URL variable name.                                                                              |
| **`BETTER_AUTH_SECRET`**                   |  **Yes**   | `your-32-character-secret`                           | 32+ character random secret used by Better Auth for signing session tokens.                                          |
| **`BETTER_AUTH_URL`**                      |  Optional  | `http://localhost:3000`                              | Canonical URL for the Better Auth server.                                                                            |
| **`NEXT_PUBLIC_APP_URL`**                  |  Optional  | `http://localhost:3000`                              | Base public URL of the application.                                                                                  |
| **`NODE_ENV`**                             |  Optional  | `development`                                        | Runtime environment (`development`, `test`, `production`).                                                           |
| **`GOOGLE_CLIENT_ID`**                     |  **Yes**   | `...apps.googleusercontent.com`                      | Google OAuth 2.0 Web Client ID for user sign-in.                                                                     |
| **`GOOGLE_CLIENT_SECRET`**                 |  **Yes**   | Safe placeholder string                              | Google OAuth 2.0 Web Client Secret for user sign-in.                                                                 |
| **`GOOGLE_CALENDAR_CLIENT_ID`**            |  Optional  | Falls back to `GOOGLE_CLIENT_ID`                     | Dedicated Client ID for Google Calendar OAuth integration.                                                           |
| **`GOOGLE_CALENDAR_CLIENT_SECRET`**        |  Optional  | Falls back to `GOOGLE_CLIENT_SECRET`                 | Dedicated Client Secret for Google Calendar OAuth integration.                                                       |
| **`GOOGLE_CALENDAR_REDIRECT_URI`**         |  Optional  | `http://localhost:3000/api/google-calendar/callback` | Authorized redirect URI for Google Calendar OAuth.                                                                   |
| **`GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY`** | **Yes\***  | 32-byte hex or base64 key                            | Key used to AES-256-GCM encrypt calendar refresh tokens in the database. (\*Required if connecting Google Calendar). |
| **`RESEND_API_KEY`**                       |  **Yes**   | `re_...`                                             | Resend API key for transactional emails (email verification & password reset).                                       |
| **`PINECONE_API_KEY`**                     | Optional\* | `your-pinecone-api-key`                              | Pinecone API key. (\*Required for RAG document indexing and semantic retrieval).                                     |
| **`PINECONE_INDEX`**                       |  Optional  | `dentassist`                                         | Name of the target Pinecone index.                                                                                   |
| **`PINECONE_NAMESPACE_PREFIX`**            |  Optional  | `""`                                                 | Optional prefix prepended to tenant organization IDs in Pinecone namespaces.                                         |
| **`AI_PROVIDER_1`**                        |  Optional  | `gemini`                                             | Primary LLM provider (`gemini`, `groq`, `openrouter`).                                                               |
| **`AI_MODEL_1`**                           |  Optional  | `gemini-2.5-flash-lite`                              | Primary LLM model identifier.                                                                                        |
| **`GEMINI_API_KEY`**                       | Optional\* | Safe placeholder string                              | Google Gemini API key. (\*Required for primary AI receptionist inference).                                           |
| **`AI_PROVIDER_2`**                        |  Optional  | `groq`                                               | Secondary failover LLM provider.                                                                                     |
| **`AI_MODEL_2`**                           |  Optional  | `openai/gpt-oss-20b`                                 | Secondary LLM model identifier.                                                                                      |
| **`GROQ_API_KEY`**                         |  Optional  | Safe placeholder string                              | Groq API key for secondary failover.                                                                                 |
| **`AI_PROVIDER_3`**                        |  Optional  | `openrouter`                                         | Tertiary failover LLM provider.                                                                                      |
| **`AI_MODEL_3`**                           |  Optional  | `google/gemma-4-31b-it:free`                         | Tertiary LLM model identifier.                                                                                       |
| **`OPENROUTER_API_KEY`**                   |  Optional  | Safe placeholder string                              | OpenRouter API key for tertiary failover.                                                                            |
| **`AWS_ENDPOINT_URL_S3`**                  |  Optional  | Custom S3 endpoint (e.g. MinIO, R2)                  | Custom endpoint for S3-compatible object storage.                                                                    |
| **`AWS_ACCESS_KEY_ID`**                    | Optional\* | Safe placeholder string                              | AWS Access Key ID for document storage.                                                                              |
| **`AWS_SECRET_ACCESS_KEY`**                | Optional\* | Safe placeholder string                              | AWS Secret Access Key for document storage.                                                                          |
| **`AWS_REGION`**                           |  Optional  | `us-east-2`                                          | AWS S3 bucket region.                                                                                                |
| **`AWS_S3_BUCKET_NAME`**                   |  Optional  | `assets`                                             | S3 bucket name for raw document storage.                                                                             |
| **`NVIDIA_API_KEY`**                       |  Optional  | Safe placeholder string                              | Optional NVIDIA NIM API key for Prompt Guard inspection.                                                             |
| **`EMBEDDING_PROVIDER`**                   |  Optional  | `pinecone`                                           | Vector embedding engine (`pinecone` or `mock` for local offline testing).                                            |
| **`EMBEDDING_MODEL`**                      |  Optional  | `multilingual-e5-large`                              | Embedding model identifier used with Pinecone inference.                                                             |
| **`RAG_TOP_K`**                            |  Optional  | `5`                                                  | Maximum number of semantic chunks retrieved per inquiry.                                                             |
| **`RAG_CHUNK_SIZE`**                       |  Optional  | `600`                                                | Target character size per text chunk.                                                                                |
| **`RAG_CHUNK_OVERLAP`**                    |  Optional  | `80`                                                 | Overlap characters between adjacent chunks.                                                                          |

---

## Database Setup & Schema Management

DentAssist AI uses [Prisma ORM](https://www.prisma.io/) with a PostgreSQL database.

### Core Data Models

- `User`, `Session`, `Account`, `Verification`: Managed by Better Auth for authentication, session lifecycle, and Google OAuth identities.
- `Organization`: Represents the dental practice tenant (contains practice name, slug, timezone, phone, and address).
- `OrganizationMembership`: Maps users to clinics with role-based permissions (`OWNER`, `ADMIN`, `STAFF`, `DENTIST`).
- `Dentist`: Practitioner records affiliated with a clinic.
- `Service`: Dental procedures offered by the practice along with chair duration in minutes.
- `WorkingHours`: Weekly recurring operating hours (open/close times) per day of week (`DayOfWeek`).
- `Holiday`: Specific dates when the practice is closed (e.g., Thanksgiving, Christmas, staff retreats).
- `Document` & `DocumentChunk`: Ingested knowledge documents and normalized text chunks linked to vector IDs.
- `GoogleCalendarConnection`: Encrypted OAuth tokens, selected calendar ID, and sync status for the clinic's calendar.
- `Appointment`: Clinical appointments with patient contact details, assigned dentist, service, reference ID, and synchronized Google Calendar event IDs.
- `Conversation` & `ConversationMessage`: Conversation history between patients and the AI receptionist, including structured tool call execution traces.
- `WebsiteWidget` & `WidgetSession`: Configuration and ephemeral sessions for the embedded web widget.

### Database Commands

```bash
# 1. Regenerate Prisma Client whenever prisma/schema.prisma changes
pnpm db:generate

# 2. Push schema changes directly to the database (development)
pnpm db:push

# 3. Open Prisma Studio to browse and inspect database records in a web UI
pnpm db:studio

# 4. Reset database (caution: drops existing development tables and data)
pnpm db:reset
```

---

## Third-Party Integrations Setup

### 1. Google OAuth (Authentication)

Better Auth uses Google OAuth to allow practice administrators and staff to sign in with Google accounts.

1. Visit the [Google Cloud Console](https://console.cloud.google.com/) and create a project (e.g., `DentAssist-Auth`).
2. Navigate to **APIs & Services > Credentials** and click **Create Credentials > OAuth client ID**.
3. Select **Web application**.
4. Set **Authorized JavaScript origins** to `http://localhost:3000` (and your production domain).
5. Set **Authorized redirect URIs** to:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://your-domain.com/api/auth/callback/google`
6. Copy the generated Client ID and Client Secret into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`.

### 2. Google Calendar Integration (Scheduling)

DentAssist AI connects to practice Google Calendars to inspect busy times and insert confirmed appointments.

1. In Google Cloud Console, enable the **Google Calendar API** under **APIs & Services > Library**.
2. Under **OAuth consent screen**, add the following scopes:
   - `https://www.googleapis.com/auth/calendar.calendarlist.readonly`
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/calendar.events.freebusy`
3. In **Credentials**, create an OAuth 2.0 Web Client ID (or reuse the existing one).
4. Add the dedicated redirect URI:
   - `http://localhost:3000/api/google-calendar/callback`
   - `https://your-domain.com/api/google-calendar/callback`
5. Generate a secure 32-byte encryption key for token encryption:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
6. Set `GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY` in `.env` to this 64-character hex string.

### 3. LLM Providers & Failover Cascade

The AI Receptionist features an automated 3-provider failover system:

1. **Google Gemini (Primary):** Obtain an API key from [Google AI Studio](https://aistudio.google.com/) and set `GEMINI_API_KEY`. The default model is `gemini-2.5-flash-lite`.
2. **Groq (Secondary Failover):** Obtain an API key from [Groq Console](https://console.groq.com/) and set `GROQ_API_KEY`. Used automatically if Gemini experiences rate limits or downtime.
3. **OpenRouter (Tertiary Failover):** Obtain an API key from [OpenRouter](https://openrouter.ai/) and set `OPENROUTER_API_KEY`.
4. If an LLM call fails, times out, or encounters HTTP 429/500 errors, the internal circuit breaker switches providers automatically and logs diagnostic execution traces.

### 4. Pinecone Vector Database (RAG)

1. Sign up at [Pinecone](https://www.pinecone.io/) and create an API key.
2. Create an index named `dentassist` with dimension `1024` and metric `cosine` (matching `multilingual-e5-large`), or allow the application to connect to an existing serverless index.
3. Configure `PINECONE_API_KEY` and `PINECONE_INDEX` in `.env`.
4. For local offline testing without an active Pinecone account, set `EMBEDDING_PROVIDER=mock` in your environment.

### 5. S3-Compatible Document Storage

Uploaded clinical documents are stored in an S3-compatible bucket:

- **AWS S3:** Configure `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, and `AWS_S3_BUCKET_NAME`.
- **MinIO / Cloudflare R2:** Configure the above plus `AWS_ENDPOINT_URL_S3` pointing to your custom S3-compatible API endpoint.

### 6. Resend (Transactional Email)

1. Sign up at [Resend](https://resend.com/) and generate an API key.
2. Set `RESEND_API_KEY=re_your_api_key` in `.env`.
3. Account signups trigger verification emails, and password reset requests send cryptographically signed links using React Email templates located in `emails/`.

---

## Available Scripts

All scripts are executed via `pnpm`:

```bash
# Start Next.js local development server on port 3000
pnpm dev

# Build the production bundle (generates Prisma Client, runs Next.js build)
pnpm build

# Start the built production server
pnpm start

# Run ESLint against all source files
pnpm lint

# Format codebase using Prettier
pnpm format

# Check formatting compliance without writing changes
pnpm format:check

# Run TypeScript type check across the entire project without emitting code
pnpm typecheck

# Run the automated integration test suite
pnpm test

# Generate Prisma Client TypeScript definitions
pnpm db:generate

# Synchronize Prisma schema with the PostgreSQL database
pnpm db:push

# Launch Prisma Studio web interface to browse database records
pnpm db:studio

# Reset database schema and migrations
pnpm db:reset
```

---

## Automated Testing Suite

DentAssist AI includes a comprehensive, multi-phase automated test suite executed via `tsx` without external test runner bloat:

```bash
pnpm test
```

The test runner (`tests/run-all.ts`) validates core operational subsystems:

- `chunking-normalizer.test.ts`: Verifies Markdown normalization, whitespace collapse, script tag sanitization, and page-artifact removal.
- `prompt-guard.test.ts`: Tests prompt injection resistance, malicious token detection, and system prompt boundary protections.
- `multi-tenant-isolation.test.ts`: Validates that vector searches and relational queries cannot leak across tenant organization boundaries.
- `appointment-service.test.ts`: Tests reference code generation, appointment duration boundaries, and status transitions.
- `circuit-breaker.test.ts`: Simulates provider HTTP 429/500 errors, timeout handling, and cooldown recovery.
- `failover-integration.test.ts`: Verifies automatic cascading across Gemini, Groq, and OpenRouter during simulated outages.
- `receptionist-service.test.ts`: Evaluates deterministic function calling, tool execution, and parameter parsing.
- `phase6-google-calendar-scheduling.test.ts`: Tests Google Calendar two-way conflict detection, free/busy query resolution, and transactional rollback on API failure.
- `voice-receptionist.test.ts`: Tests browser Web Speech API lifecycle state transitions and speech-to-text fallbacks.
- `widget.test.ts`: Tests domain whitelisting, CORS headers, session token hashing, and origin validation.
- `dashboard-routes.test.ts`: Tests dashboard route resolution, legacy tab URL migration, and metadata consistency.

---

## Embeddable Website Widget

Dental practices can embed the DentAssist AI conversational booking widget onto any existing website by pasting this snippet right before the closing `</body>` tag:

```html
<!-- DentAssist AI Booking Widget -->
<script
  src="https://dentassist-care.vercel.app/widget.js"
  data-widget-id="YOUR_WIDGET_PUBLIC_ID"
  data-api-base="https://dentassist-care.vercel.app"
  async
></script>
```

### Widget Features

- **Independent & Lightweight:** Written in vanilla JavaScript (`public/widget.js`) with zero third-party script dependencies.
- **Responsive Floating Launcher:** Renders a clean floating chat button with accessible expand/collapse behaviors.
- **Configurable Aesthetics:** Practice administrators configure brand accent colors, launcher position (`bottom-right` or `bottom-left`), welcome greetings, and assistant avatar labels from `/dashboard/widget`.
- **Origin Validation:** The `/api/widget/config` and `/api/widget/chat` endpoints verify that the HTTP `Origin` header matches the domains registered in the clinic's `allowedDomains` list.

---

## Security & Compliance Posture

DentAssist AI is designed from the ground up with healthcare-oriented data security principles:

- **Token Encryption at Rest:** External Google OAuth refresh and access tokens are never stored as plaintext. They are encrypted using authenticated **AES-256-GCM** with unique initialization vectors (`iv:authTag:ciphertext`).
- **Cryptographic State Validation:** Google Calendar OAuth flows generate a signed HMAC-SHA256 state token containing nonces, timestamps, and organization identifiers to prevent CSRF attacks.
- **Multi-Tenant Partitioning:** Database records enforce foreign key constraints on `organizationId`. Vector embeddings are physically partitioned into isolated Pinecone namespaces.
- **Prompt Injection Defense:** Inbound user prompts are sanitized and checked for jailbreak signatures before being processed by the LLM reasoning core.
- **Domain Authorization:** Embedded website widgets only accept API connections from pre-registered, verified practice domain origins.
- **Credential Hygiene:** No secrets, OAuth client secrets, or database passwords are ever checked into source control or exposed to client-side code.

---

## Current Scope vs. Roadmap

To ensure technical transparency, the current operational scope of DentAssist AI is explicitly documented below:

### ✅ Implemented & Production-Ready

- Multi-tenant dental practice accounts with role-based member permissions.
- Practice profile, dentist roster, dental service durations, operating hours, and holiday closure management.
- Multi-format clinical document ingestion (PDF, DOCX, TXT, MD) with semantic chunking and RAG.
- Tenant-isolated vector retrieval with Pinecone namespaces.
- Autonomous AI receptionist with deterministic function calling (availability check, booking, cancellations).
- Two-way Google Calendar availability calculation and automated event insertion with rollback protection.
- Embeddable website booking widget (`widget.js`) with domain whitelisting and session security.
- Three-provider LLM failover cascade (Gemini, Groq, OpenRouter) with circuit breakers.
- Browser-based voice recognition and speech synthesis testing via the Web Speech API.

### 📋 Planned Future Roadmap (Not Yet Implemented)

- **Telephony & PBX Integration:** Direct VoIP, SIP trunking, and phone receptionist integration (e.g., Twilio / Retell voice agents). _Current voice capabilities are restricted to in-browser Web Speech API testing._
- **Practice Management Systems (PMS):** Direct two-way integrations with legacy dental desktop software (Dentrix, Eaglesoft, Open Dental).
- **Billing & Patient Portals:** Native copay collection, credit card processing, and patient intake medical history forms.
- **Formal Compliance Certifications:** While architected with security best practices (AES-256 encryption, access control), formal **HIPAA BAA** execution and **GDPR** certifications require formal legal review and infrastructure agreements by deploying practice entities.

---

## Deployment Overview

DentAssist AI is configured for seamless deployment on [Vercel](https://vercel.com/) with a serverless PostgreSQL database (such as [Neon](https://neon.tech/)).

### Production Deployment Steps

1. Push your repository to GitHub, GitLab, or Bitbucket.
2. Import the project into the [Vercel Dashboard](https://vercel.com/new).
3. Set the **Framework Preset** to **Next.js**.
4. Configure all required environment variables in the Vercel Project Settings (refer to the [Environment Variable Configuration](#environment-variable-configuration) table).
5. Ensure `DATABASE_URL` points to a production-ready pooled PostgreSQL instance (e.g., Neon with SSL required).
6. Set `NEXT_PUBLIC_APP_URL` and `BETTER_AUTH_URL` to your production domain (e.g., `https://dentassist-care.vercel.app`).
7. Update Google Cloud Console OAuth redirect URIs to include your production domain.
8. Trigger a deployment. Vercel automatically executes `pnpm build` (which generates the Prisma Client and compiles the Next.js App Router application).

> 💡 _Note: If a dedicated `DEPLOYMENT.md` guide is added by your operations team, detailed containerization (Docker) and self-hosted infrastructure procedures should be documented there._

---

## Maintainer & License

- **Live Application:** [https://dentassist-care.vercel.app/](https://dentassist-care.vercel.app/)
- **Repository:** Private / Proprietary Software (as configured in `package.json` `"private": true`).
- **Maintainer Confirmation:** Legal entity ownership, copyright terms, and formal open-source licensing (MIT, Apache 2.0, or commercial proprietary license) are subject to confirmation by the repository maintainer.

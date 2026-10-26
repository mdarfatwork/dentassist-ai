# DentAssist AI — Production Deployment Guide

This document provides a comprehensive, production-grade deployment runbook for **DentAssist AI**. It covers provisioning external dependencies, configuring environment variables, executing database migrations safely, deploying the Next.js application to [Vercel](https://vercel.com/), and verifying end-to-end functionality.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites & External Services](#2-prerequisites--external-services)
3. [Production Database Setup (Neon PostgreSQL)](#3-production-database-setup-neon-postgresql)
4. [Vercel Deployment Guide](#4-vercel-deployment-guide)
5. [Environment Variables Reference](#5-environment-variables-reference)
6. [Authentication & Transactional Email Setup](#6-authentication--transactional-email-setup)
7. [Google Calendar Integration & OAuth Setup](#7-google-calendar-integration--oauth-setup)
8. [AI Inference & Vector Knowledge Base (RAG)](#8-ai-inference--vector-knowledge-base-rag)
9. [Object Storage & Serverless Ingestion Considerations](#9-object-storage--serverless-ingestion-considerations)
10. [Custom Domains, DNS & HTTPS](#10-custom-domains-dns--https)
11. [Post-Deployment Verification Checklist](#11-post-deployment-verification-checklist)
12. [Troubleshooting Guide](#12-troubleshooting-guide)
13. [Ongoing Maintenance & Operational Security](#13-ongoing-maintenance--operational-security)
14. [Open Maintainer Inputs & Confirmations](#14-open-maintainer-inputs--confirmations)

---

## 1. Architecture Overview

DentAssist AI is a multi-tenant SaaS application built on **Next.js 16 (App Router)** and **React 19**, communicating with backend business services via **tRPC v11** and standalone REST endpoints.

### Topology Diagram

```
                              ┌─────────────────────────────────────────┐
                              │            Incoming Traffic             │
                              │  (Web Browser / Embeddable widget.js)   │
                              └────────────────────┬────────────────────┘
                                                   │ HTTPS
                                                   ▼
                              ┌─────────────────────────────────────────┐
                              │          Vercel Edge Network            │
                              │  (DNS, SSL Termination, Asset CDN)     │
                              └────────────────────┬────────────────────┘
                                                   │
                                                   ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Next.js App Router on Vercel Serverless (Node.js 24 Runtime)                                    │
│                                                                                                  │
│   ├── App Routes: /dashboard/*, /login, /signup, /api/auth/[...all]                             │
│   ├── Public Widget Endpoints: /api/widget/config, /api/widget/chat, /widget.js                  │
│   ├── Calendar Webhooks & Handlers: /api/google-calendar/connect, /callback                      │
│   ├── Knowledge RAG Pipeline: Parser (pdf-parse/mammoth) -> Chunker -> Pinecone Embedder         │
│   └── Multi-Provider AI Manager: Gemini (Primary) -> Groq (Failover) -> OpenRouter (Fallback)   │
└────────┬───────────────────┬──────────────────────┬───────────────────────┬──────────────────────┘
         │                   │                      │                       │
         ▼ (Pooled/SSL)      ▼ (AES-256-GCM tokens) ▼ (REST API)            ▼ (Inference / Embed)
┌──────────────────┐ ┌───────────────┐      ┌───────────────┐       ┌───────────────────────────────┐
│ Neon PostgreSQL  │ │ Google Cloud  │      │ Resend API    │       │ Pinecone Vector Database      │
│ (Prisma 6.19)    │ │ APIs:         │      │ Transactional │       │ - Index: 1024 dims (cosine)   │
│ - Users/Tenants  │ │ - OAuth 2.0   │      │ Emails        │       │ - Pinecone Inference Embed    │
│ - Appointments   │ │ - Calendar    │      │ (Verification │       │ - Tenant Isolated Namespaces  │
│ - Encrypted Keys │ │   (Free/Busy, │      │  & Resets)    │       └───────────────────────────────┘
└──────────────────┘ │    Events)    │      └───────────────┘                       │
                     └───────────────┘                                              ▼
                             │                                      ┌───────────────────────────────┐
                             ▼ (Object Store)                       │ S3-Compatible Storage         │
                     ┌───────────────┐                              │ (AWS S3, Neon Storage, MinIO) │
                     │ LLM Providers │                              │ - Original clinical PDFs/DOCX │
                     │ - Gemini API  │                              │ - Canonical Markdown text     │
                     │ - Groq API    │                              │ - Clinic logos & avatars      │
                     │ - OpenRouter  │                              └───────────────────────────────┘
                     │ - NVIDIA NIM  │
                     │   PromptGuard │
                     └───────────────┘
```

### Component Responsibilities

| Component                 | Responsibility                                                                                                         | Hosting / Provider                           | Requirement Status                              |
| :------------------------ | :--------------------------------------------------------------------------------------------------------------------- | :------------------------------------------- | :---------------------------------------------- |
| **Next.js Application**   | Serverless App Router, React Server Components, tRPC API routers, and public widget script serving.                    | Vercel Serverless (Node.js 24)               | **Mandatory**                                   |
| **Relational Database**   | Multi-tenant relational data: Users, Organizations, Services, Practitioners, Appointments, and encrypted OAuth tokens. | Neon PostgreSQL (or AWS RDS / Supabase)      | **Mandatory**                                   |
| **Prisma ORM**            | Type-safe query engine and schema synchronization.                                                                     | Embedded in Next.js bundle                   | **Mandatory**                                   |
| **Authentication Engine** | Better Auth (`better-auth`) managing email/password, email verification, session cookies, and Google OAuth logins.     | Next.js API route (`/api/auth/[...all]`)     | **Mandatory**                                   |
| **Transactional Email**   | Account activation, email verification, and password resets via React Email templates.                                 | Resend                                       | **Mandatory**                                   |
| **Primary AI Provider**   | High-speed primary LLM chat and tool-calling execution. Default: `gemini-2.5-flash-lite`.                              | Google AI Studio (Gemini)                    | **Mandatory** (At least 1 active LLM key)       |
| **Secondary AI Provider** | Autonomous circuit-breaker failover provider. Default: `openai/gpt-oss-20b`.                                           | Groq Cloud                                   | Recommended for HA                              |
| **Tertiary AI Provider**  | High-availability fallback provider. Default: `google/gemma-4-31b-it:free`.                                            | OpenRouter                                   | Recommended for HA                              |
| **Vector Database**       | Storage and similarity retrieval of clinical document embeddings.                                                      | Pinecone (Serverless)                        | **Mandatory** (for RAG Knowledge Base)          |
| **Embedding Generation**  | Inference service generating 1024-dimension embeddings (`multilingual-e5-large`).                                      | Pinecone Hosted Inference API                | **Mandatory**                                   |
| **Object Storage**        | Durable storage for uploaded clinical files, converted markdown, and clinic branding assets.                           | AWS S3 or S3-compatible (Neon/Cloudflare R2) | **Mandatory** (for file uploads)                |
| **Google Calendar API**   | Real-time practitioner calendar synchronization, busy slot verification, and event creation.                           | Google Cloud Platform                        | **Mandatory** (for Google Calendar feature)     |
| **Prompt Guard**          | Prompt injection and jailbreak classifier.                                                                             | NVIDIA NIM / Fast-path heuristics            | Optional (Heuristic fallback active by default) |

---

## 2. Prerequisites & External Services

Before initiating deployment, ensure you have provisioned accounts and API access on the following platforms:

### Mandatory Accounts & Tools

1. **GitHub / GitLab / Bitbucket**: Repository hosting access.
2. **Vercel Account**: Team or individual account with permission to create projects.
3. **Neon (or PostgreSQL provider)**: Provisioned PostgreSQL 15+ database instance with SSL enabled.
4. **Google Cloud Console**:
   - Registered Cloud Project.
   - Enabled **Google Calendar API**.
   - Configured OAuth 2.0 Consent Screen.
   - Generated Web OAuth 2.0 Client Credentials.
5. **Pinecone Account**:
   - Access to create a Serverless Vector Index.
   - API Key with inference capabilities.
6. **Resend Account**:
   - API Key (`re_...`).
   - Verified custom sender domain for production email deliverability.
7. **At least one LLM Provider API Key**:
   - **Google Gemini API Key** (`AI_PROVIDER_1`), OR
   - **Groq API Key** (`AI_PROVIDER_2`), OR
   - **OpenRouter API Key** (`AI_PROVIDER_3`).
8. **S3-Compatible Storage**:
   - AWS S3 bucket with IAM access keys, or Neon Object Storage / Cloudflare R2 bucket.
9. **Local CLI Tools** (for pre-deployment migration & key generation):
   - `node` (version 24.x)
   - `pnpm` (version 10.20.0 or compatible)
   - `openssl` (for generating cryptographic secrets)

---

## 3. Production Database Setup (Neon PostgreSQL)

DentAssist AI utilizes **Prisma ORM 6.19.3** mapped to PostgreSQL. The schema defines models for multi-tenant organizations, role memberships, services, practitioner rosters, working hours, appointments, and encrypted Google Calendar connections.

### Step 1: Create the Database Instance

1. Log in to [Neon Console](https://console.neon.tech/) (or your PostgreSQL provider).
2. Create a new project (e.g., `dentassist-production`).
3. Select a region close to your primary Vercel deployment region (e.g., `us-east-1` or `us-east-2`).
4. In the database dashboard, locate the **Connection Details**.
5. Neon provides two connection strings:
   - **Pooled Connection String** (includes `-pooler` in the host, port `5432` or `6543`): Recommended for Next.js serverless execution to prevent connection exhaustion.
   - **Direct Connection String** (direct compute endpoint): Required for running schema pushes and migrations.

Example connection format:

```bash
postgresql://<user>:<password>@ep-example-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### Step 2: Configure Database URL in Environment

Set `DATABASE_URL` (or `DB_URL`) to your pooled PostgreSQL connection string with `sslmode=require`.

> [!IMPORTANT]
> The application code accepts either `DATABASE_URL` or `DB_URL` (`config/env.ts`), but `prisma/schema.prisma` natively looks for `DATABASE_URL`. Set `DATABASE_URL` in all environments.

### Step 3: Apply the Prisma Schema Safely to Production

The DentAssist AI repository maintains the canonical schema in [prisma/schema.prisma](file:///prisma/schema.prisma). Notice that the repository does not track an arbitrary `prisma/migrations` folder by default, as the project development workflow used `prisma db push`.

#### Option A: Direct Schema Push (Recommended for initial fresh deployment)

Run `prisma db push` from your deployment machine or CI runner pointing to your production database:

```bash
# Set your production database URL locally
export DATABASE_URL="postgresql://<user>:<password>@<direct-host>/neondb?sslmode=require"

# Generate the client
pnpm prisma generate

# Safely push schema to the remote database
pnpm prisma db push
```

`prisma db push` creates all required tables, foreign keys, unique constraints, and enums (`Role`, `AppointmentStatus`, `DocumentStatus`, `GoogleCalendarStatus`) without dropping data if schemas are compatible.

#### Option B: Creating Baseline Migration Files (For strict enterprise change control)

If your enterprise policy requires tracked migration SQL files:

```bash
# 1. Initialize migration history locally against a staging database
pnpm prisma migrate dev --name init_production

# 2. Review the generated SQL in prisma/migrations/
# 3. Apply the migrations to production
pnpm prisma migrate deploy
```

> [!CAUTION]
> **NEVER execute `pnpm db:reset` or `prisma migrate reset` against a staging or production database.**
> Doing so unconditionally deletes all practice data, appointment histories, documents, and user accounts.

### Step 4: Verify Database Connectivity

Verify the database connection and schema tables:

```bash
# Inspect the remote database through Prisma Studio (run locally with production DATABASE_URL)
pnpm db:studio
```

Confirm that the following essential tables exist:

- `user`, `session`, `account`, `verification`
- `Organization`, `OrganizationMembership`, `Dentist`, `Service`, `WorkingHours`, `Holiday`
- `Appointment`, `google_calendar_connection`
- `Document`, `DocumentChunk`, `Conversation`, `ConversationMessage`, `WebsiteWidget`

---

## 4. Vercel Deployment Guide

### Step 1: Import the Repository

1. Navigate to the [Vercel Dashboard](https://vercel.com/new).
2. Select **Import Git Repository** and choose your DentAssist AI repository.
3. Configure the Project:
   - **Project Name**: `dentassist-ai` (or your custom name).
   - **Framework Preset**: **Next.js** (Vercel automatically detects Next.js 16).
   - **Root Directory**: `./` (leave default).

### Step 2: Configure Build & Node.js Runtime Settings

Verify the build settings in Vercel Project Settings:

- **Build Command**: `pnpm build` (or leave default; `package.json` defines `"build": "prisma generate && next build"`).
- **Install Command**: `pnpm install`
- **Output Directory**: `.next` (default)
- **Node.js Version**: **24.x**
  > [!IMPORTANT]
  > DentAssist AI specifies `"node": ">=24 <25"` in `package.json` engines. In **Vercel Project Settings > General > Node.js Version**, ensure **24.x** is selected.

### Step 3: Populate Environment Variables in Vercel

Before triggering the first deployment, add all **Mandatory** variables in **Project Settings > Environment Variables** (detailed in [Section 5](#5-environment-variables-reference)).

Assign them to:

- **Production**
- **Preview** (optional: use staging database URLs for previews)
- **Development** (if using Vercel CLI)

### Step 4: Deploy and Inspect Build Logs

1. Click **Deploy**.
2. Monitor the build logs in real-time. The deployment executes:
   ```text
   > prisma generate
   Prisma schema loaded from prisma/schema.prisma
   ✔ Generated Prisma Client (6.19.3) to ./node_modules/@prisma/client

   > next build
     ▲ Next.js 16.3.1
     - Environments: .env
     - Experiments (use at your own risk):
       · serverExternalPackages
     ✓ Creating an optimized production build
     ✓ Compiled successfully
     ✓ Collecting page data
     ✓ Generating static pages
     ✓ Finalizing page optimization
   ```
3. Once the build finishes, Vercel provides a default preview URL (e.g., `https://dentassist-ai-xxx.vercel.app`).

---

## 5. Environment Variables Reference

DentAssist AI uses strict runtime validation via Zod in [config/env.ts](file:///config/env.ts). If required production variables are missing, the server will intentionally throw an error on startup to avoid corrupt states.

### Environment Variable Matrix

| Variable Name                          | Required? | Category      | Description & Source                                                                                 | Applied Environments | Security Notes                                         |
| :------------------------------------- | :-------: | :------------ | :--------------------------------------------------------------------------------------------------- | :------------------- | :----------------------------------------------------- |
| `DATABASE_URL`                         |  **Yes**  | Server        | PostgreSQL connection string (`postgresql://...`). From Neon console.                                | Production, Preview  | Contains password. Keep private.                       |
| `DB_URL`                               | Optional  | Server        | Fallback alias for `DATABASE_URL`.                                                                   | Production, Preview  | Keep private.                                          |
| `BETTER_AUTH_SECRET`                   |  **Yes**  | Server        | 32+ character random secret used for session signing and CSRF tokens.                                | Production, Preview  | Generate via `openssl rand -hex 32`. Keep private.     |
| `BETTER_AUTH_URL`                      |  **Yes**  | Server        | Canonical base URL of the deployment (e.g., `https://dentassist.ai`).                                | Production, Preview  | Must match the actual origin. No trailing slash.       |
| `NEXT_PUBLIC_APP_URL`                  |  **Yes**  | Client/Server | Public frontend origin. Used by client components and widget scripts.                                | Production, Preview  | Exposes URL to browser.                                |
| `GOOGLE_CLIENT_ID`                     |  **Yes**  | Server        | Google OAuth 2.0 Web Client ID for user login. From GCP Console.                                     | Production, Preview  | Public OAuth identifier.                               |
| `GOOGLE_CLIENT_SECRET`                 |  **Yes**  | Server        | Google OAuth 2.0 Web Client Secret for user login. From GCP Console.                                 | Production, Preview  | Server-only secret.                                    |
| `RESEND_API_KEY`                       |  **Yes**  | Server        | API Key from Resend dashboard (`re_...`).                                                            | Production, Preview  | Keep private.                                          |
| `EMAIL_FROM`                           | Optional  | Server        | Verified sender address (e.g., `DentAssist AI <noreply@yourdomain.com>`).                            | Production           | Defaults to Resend test inbox if blank.                |
| `GOOGLE_CALENDAR_CLIENT_ID`            | Optional  | Server        | Dedicated GCP Client ID for Calendar OAuth. Falls back to `GOOGLE_CLIENT_ID`.                        | Production, Preview  | Public OAuth identifier.                               |
| `GOOGLE_CALENDAR_CLIENT_SECRET`        | Optional  | Server        | Dedicated GCP Client Secret for Calendar OAuth. Falls back to `GOOGLE_CLIENT_SECRET`.                | Production, Preview  | Server-only secret.                                    |
| `GOOGLE_CALENDAR_REDIRECT_URI`         | Optional  | Server        | Redirect URI for Google Calendar. Defaults to `${NEXT_PUBLIC_APP_URL}/api/google-calendar/callback`. | Production, Preview  | Must match GCP authorized URIs.                        |
| `GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY` | **Yes\*** | Server        | 32-byte key (64 hex characters) for AES-256-GCM token encryption at rest.                            | Production, Preview  | **Critical Secret**. (\*Required if Calendar is used). |
| `AWS_ENDPOINT_URL_S3`                  | Optional  | Server        | Endpoint for S3-compatible storage (e.g., Neon S3 or Cloudflare R2). Leave empty for standard AWS.   | Production, Preview  | Public or private URL endpoint.                        |
| `AWS_ACCESS_KEY_ID`                    | **Yes\*** | Server        | S3 access key ID. (\*Required if knowledge uploads enabled).                                         | Production, Preview  | Server-only credential.                                |
| `AWS_SECRET_ACCESS_KEY`                | **Yes\*** | Server        | S3 secret access key. (\*Required if knowledge uploads enabled).                                     | Production, Preview  | Server-only credential.                                |
| `AWS_REGION`                           | Optional  | Server        | AWS region (default: `us-east-2`).                                                                   | Production, Preview  | Safe config.                                           |
| `AWS_S3_BUCKET_NAME`                   | Optional  | Server        | Target S3 bucket name (default: `assets`).                                                           | Production, Preview  | Safe config.                                           |
| `PINECONE_API_KEY`                     | **Yes\*** | Server        | API key for Pinecone vector database. (\*Required for RAG & Chat).                                   | Production, Preview  | Server-only secret.                                    |
| `PINECONE_INDEX`                       | Optional  | Server        | Pinecone index name (default: `dentassist`).                                                         | Production, Preview  | Safe config.                                           |
| `PINECONE_HOST`                        | Optional  | Server        | Direct Pinecone host URL (auto-resolved if omitted).                                                 | Production, Preview  | Safe config.                                           |
| `PINECONE_NAMESPACE_PREFIX`            | Optional  | Server        | Prefix for multi-tenant vector namespaces (e.g., `prod`).                                            | Production, Preview  | Safe config.                                           |
| `AI_PROVIDER_1`                        | Optional  | Server        | Primary LLM provider name (default: `gemini`).                                                       | Production, Preview  | Safe config.                                           |
| `AI_MODEL_1`                           | Optional  | Server        | Primary LLM model identifier (default: `gemini-2.5-flash-lite`).                                     | Production, Preview  | Safe config.                                           |
| `GEMINI_API_KEY`                       | **Yes\*** | Server        | API key for Google Gemini AI inference.                                                              | Production, Preview  | Server-only secret.                                    |
| `AI_PROVIDER_2`                        | Optional  | Server        | Secondary LLM provider name (default: `groq`).                                                       | Production, Preview  | Safe config.                                           |
| `AI_MODEL_2`                           | Optional  | Server        | Secondary LLM model (default: `openai/gpt-oss-20b`).                                                 | Production, Preview  | Safe config.                                           |
| `GROQ_API_KEY`                         | Optional  | Server        | API key for Groq failover provider.                                                                  | Production, Preview  | Server-only secret.                                    |
| `AI_PROVIDER_3`                        | Optional  | Server        | Tertiary LLM provider name (default: `openrouter`).                                                  | Production, Preview  | Safe config.                                           |
| `AI_MODEL_3`                           | Optional  | Server        | Tertiary LLM model (default: `google/gemma-4-31b-it:free`).                                          | Production, Preview  | Safe config.                                           |
| `OPENROUTER_API_KEY`                   | Optional  | Server        | API key for OpenRouter fallback.                                                                     | Production, Preview  | Server-only secret.                                    |
| `NVIDIA_API_KEY`                       | Optional  | Server        | NVIDIA NIM API key for Prompt Guard model.                                                           | Production, Preview  | Server-only secret.                                    |
| `EMBEDDING_PROVIDER`                   | Optional  | Server        | `pinecone` (default) or `mock`.                                                                      | Production, Preview  | Use `pinecone` in production.                          |
| `EMBEDDING_MODEL`                      | Optional  | Server        | Embedding model name (default: `multilingual-e5-large`).                                             | Production, Preview  | Must match Pinecone inference model.                   |
| `NEXT_PUBLIC_COMPANY_LEGAL_NAME`       | Optional  | Client        | Registered business name displayed in Terms/Privacy pages.                                           | Production           | Configurable branding.                                 |
| `NEXT_PUBLIC_COMPANY_ADDRESS`          | Optional  | Client        | Registered office address in Terms/Privacy pages.                                                    | Production           | Configurable branding.                                 |
| `NEXT_PUBLIC_LEGAL_JURISDICTION`       | Optional  | Client        | Governing jurisdiction in legal documents.                                                           | Production           | Configurable legal string.                             |

---

## 6. Authentication & Transactional Email Setup

DentAssist AI uses [Better Auth](https://www.better-auth.com/) (`better-auth`) configured in [lib/auth/auth.ts](file:///lib/auth/auth.ts) and mounted at `/api/auth/[...all]`.

### Generating Cryptographic Secrets

Generate a secure 32-character secret for `BETTER_AUTH_SECRET`:

```bash
openssl rand -hex 32
```

### Better Auth URL Configuration

1. Set `BETTER_AUTH_URL` to your full canonical production domain:
   ```bash
   BETTER_AUTH_URL=https://dentassist-care.vercel.app
   ```
2. Set `NEXT_PUBLIC_APP_URL` to the identical domain:
   ```bash
   NEXT_PUBLIC_APP_URL=https://dentassist-care.vercel.app
   ```
   > [!WARNING]
   > Do not include trailing slashes. A mismatch between `BETTER_AUTH_URL` and the incoming browser origin will cause CSRF checks to reject authentication requests with `403 Forbidden`.

### Google OAuth for User Sign-In

Better Auth handles Google user authentication using the standard Google OAuth provider:

1. In the [Google Cloud Console](https://console.cloud.google.com/):
   - Go to **APIs & Services > Credentials**.
   - Select or create an **OAuth 2.0 Client ID** (Application type: **Web application**).
2. Under **Authorized JavaScript Origins**, add:
   ```text
   https://dentassist-care.vercel.app
   https://your-custom-domain.com
   ```
3. Under **Authorized Redirect URIs**, add the Better Auth callback path:
   ```text
   https://dentassist-care.vercel.app/api/auth/callback/google
   https://your-custom-domain.com/api/auth/callback/google
   ```
4. Copy the Client ID and Client Secret to `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

### Resend Email Configuration

DentAssist AI delivers transactional verification and password-reset emails using Resend and React Email templates:

1. In [Resend Console](https://resend.com/domains), add and verify your custom sending domain (e.g., `mail.dentassist.ai` or `dentassist.ai`).
2. Add the generated MX, SPF, and DKIM DNS records at your domain registrar.
3. Once verified, configure the production sender address:
   ```bash
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
   EMAIL_FROM=DentAssist AI <noreply@yourdomain.com>
   ```
   > [!NOTE]
   > If `EMAIL_FROM` is not configured, the application falls back to `DentAssist AI <onboarding@resend.dev>`. On Resend's free tier, `onboarding@resend.dev` can only deliver emails to the email address registered to your Resend account. For public production users, a verified domain is required.

---

## 7. Google Calendar Integration & OAuth Setup

DentAssist AI includes a dedicated, separate Google Calendar integration module located in [lib/calendar/google-oauth.ts](file:///lib/calendar/google-oauth.ts) and [lib/calendar/google-calendar-service.ts](file:///lib/calendar/google-calendar-service.ts).

### Step 1: Google Cloud Project & API Activation

1. Navigate to [Google Cloud Console](https://console.cloud.google.com/).
2. Select your project.
3. Navigate to **APIs & Services > Library**.
4. Search for **Google Calendar API** and click **Enable**.

### Step 2: Configure OAuth Consent Screen

1. Navigate to **APIs & Services > OAuth consent screen**.
2. Select **External** (unless restricting exclusively to Google Workspace members).
3. Fill in App Information:
   - App name: `DentAssist AI`
   - User support email: Maintainer contact email
   - Developer contact email: Maintainer contact email
4. Scopes: Add the exact scopes requested by [lib/calendar/google-oauth.ts](file:///lib/calendar/google-oauth.ts#L6-L10):
   - `https://www.googleapis.com/auth/calendar.calendarlist.readonly` (Inspect available calendars)
   - `https://www.googleapis.com/auth/calendar.events` (Create, edit, cancel bookings)
   - `https://www.googleapis.com/auth/calendar.events.freebusy` (Real-time busy slot calculation)
5. **Publishing Status**:
   - In **Testing** mode, only designated test users can authenticate.
   - For public clinic self-onboarding, submit the app for verification or move to **In Production**.

### Step 3: Configure Calendar OAuth Credentials & Redirect URIs

You can reuse your primary `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, or provide dedicated credentials in `GOOGLE_CALENDAR_CLIENT_ID` and `GOOGLE_CALENDAR_CLIENT_SECRET`.

In Google Cloud Console under the OAuth Web Client, add the dedicated redirect URI:

```text
https://dentassist-care.vercel.app/api/google-calendar/callback
https://your-custom-domain.com/api/google-calendar/callback
```

Set the environment variable:

```bash
GOOGLE_CALENDAR_REDIRECT_URI=https://dentassist-care.vercel.app/api/google-calendar/callback
```

### Step 4: Generate Token Encryption Key (AES-256-GCM)

All Google Calendar OAuth refresh tokens and access tokens are encrypted before being written to PostgreSQL using AES-256-GCM ([lib/calendar/encryption.ts](file:///lib/calendar/encryption.ts)).

Generate a 32-byte key (64 hex characters):

```bash
openssl rand -hex 32
```

Example result:

```bash
GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY=4a9b1c3d8e7f2a1b5c6d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b
```

> [!CAUTION]
> If you lose or alter `GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY` after clinics have connected calendars, existing stored tokens will fail decryption, requiring all clinics to re-authenticate their Google Calendars.

---

## 8. AI Inference & Vector Knowledge Base (RAG)

### Pinecone Vector Database Provisioning

DentAssist AI uses Pinecone for semantic retrieval of clinic guidelines, post-op instructions, FAQs, and pricing documents.

1. Log in to [Pinecone Console](https://app.pinecone.io/).
2. Create an API Key and copy it to `PINECONE_API_KEY`.
3. Create a **Serverless Index**:
   - **Index Name**: `dentassist` (or matching `PINECONE_INDEX`).
   - **Dimensions**: `1024` (matches `multilingual-e5-large` defined in [lib/knowledge/embeddings.ts](file:///lib/knowledge/embeddings.ts#L20)).
   - **Metric**: `cosine`.
   - **Cloud / Region**: AWS `us-east-1` (or matching your deployment region).

### Pinecone Inference Embeddings

DentAssist AI utilizes Pinecone's built-in Inference API (`pc.inference.embed`) with model `multilingual-e5-large`. This eliminates the need for a separate OpenAI embeddings key.

```bash
EMBEDDING_PROVIDER=pinecone
EMBEDDING_MODEL=multilingual-e5-large
PINECONE_INDEX=dentassist
```

### Multi-Tenant Vector Isolation

When documents are uploaded and processed:

- Vectors are stored with deterministic IDs: `${organizationId}:${documentId}:${chunkId}`.
- All upserts and queries are strictly scoped to the tenant namespace:
  - If `PINECONE_NAMESPACE_PREFIX` is set: `${PINECONE_NAMESPACE_PREFIX}-${organizationId}`
  - Otherwise: `${organizationId}`
- Cross-tenant data leaks are prevented at the vector index query level.

### Tri-Provider LLM Failover Configuration

DentAssist AI includes an autonomous multi-provider manager with circuit breakers ([lib/ai/manager.ts](file:///lib/ai/manager.ts)):

1. **Provider 1 (Primary)**: Google Gemini
   - `AI_PROVIDER_1=gemini`
   - `AI_MODEL_1=gemini-2.5-flash-lite`
   - `GEMINI_API_KEY=your-gemini-key`
2. **Provider 2 (Secondary Failover)**: Groq
   - `AI_PROVIDER_2=groq`
   - `AI_MODEL_2=openai/gpt-oss-20b`
   - `GROQ_API_KEY=your-groq-key`
3. **Provider 3 (Tertiary Fallback)**: OpenRouter
   - `AI_PROVIDER_3=openrouter`
   - `AI_MODEL_3=google/gemma-4-31b-it:free`
   - `OPENROUTER_API_KEY=your-openrouter-key`

#### Health Check Monitoring Endpoint

You can check real-time circuit status and provider availability in production:

```bash
curl -i https://dentassist-care.vercel.app/api/internal/ai/health
```

Returns:

- `status`: `"healthy"` | `"degraded"` | `"failing"`
- Provider circuit states (`CLOSED`, `OPEN`, `HALF_OPEN`)
- Consecutive failure counts and active cooldowns

---

## 9. Object Storage & Serverless Ingestion Considerations

DentAssist AI stores original files (PDF, DOCX, TXT, MD) and extracted canonical markdown in S3-compatible storage ([lib/storage/s3.ts](file:///lib/storage/s3.ts)).

### Storage Credentials Configuration

```bash
# Standard AWS S3:
AWS_REGION=us-east-2
AWS_S3_BUCKET_NAME=dentassist-assets
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...

# Alternatively, Cloudflare R2 / MinIO / Neon Object Storage:
AWS_ENDPOINT_URL_S3=https://<account-id>.r2.cloudflarestorage.com
AWS_REGION=auto
AWS_S3_BUCKET_NAME=dentassist-assets
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

### Serverless Execution Limits & Architectural Notes

When uploading and processing knowledge documents in production on Vercel, keep the following runtime constraints in mind:

1. **Vercel Request Body Limit**:
   - Vercel Serverless Functions enforce a **4.5 MB request body limit**.
   - Documents larger than 4.5 MB cannot be uploaded through serverless API routes without receiving a `413 Payload Too Large` from the Vercel proxy.
   - Set `MAX_KNOWLEDGE_FILE_SIZE` in `.env` (default is `10485760` / 10 MB, but Vercel's gateway limits in-flight requests to 4.5 MB).
2. **Execution Timeout**:
   - On Vercel Hobby plans, serverless functions time out after **10–15 seconds**.
   - On Vercel Pro plans, the maximum execution duration can be configured up to **300 seconds** (or 60 seconds by default).
   - Document extraction, semantic chunking, embedding generation via Pinecone, and vector upsert currently run **in-process** inside the tRPC handler ([lib/knowledge/service.ts](file:///lib/knowledge/service.ts#L162)).
   - **Recommendation for Large Corpora**: For documents exceeding 30–50 pages, process documents with smaller page counts or upgrade Vercel function timeouts in `vercel.json`:
     ```json
     {
       "functions": {
         "app/api/**/*": {
           "maxDuration": 60
         }
       }
     }
     ```
   - **Future Architecture Consideration**: For high-volume multi-clinic production workloads, offload document chunking and embedding to an asynchronous message queue (e.g., Inngest, BullMQ, or AWS SQS + Lambda worker) rather than synchronous serverless function execution.

---

## 10. Custom Domains, DNS & HTTPS

To configure a custom domain (e.g., `dentassist.ai`):

### Step 1: Add Domain in Vercel

1. In the Vercel project, go to **Settings > Domains**.
2. Enter your domain (e.g., `dentassist.ai` and `www.dentassist.ai`).
3. Vercel provides required DNS records:
   - **Apex domain**: `A` record pointing to `76.76.21.21`
   - **Subdomain (`www`)**: `CNAME` record pointing to `cname.vercel-dns.com`

### Step 2: Update Canonical Environment Variables

Once DNS propagates and SSL certificates are provisioned by Vercel:

1. In Vercel Project Settings, update:
   - `BETTER_AUTH_URL`: `https://dentassist.ai`
   - `NEXT_PUBLIC_APP_URL`: `https://dentassist.ai`
   - `GOOGLE_CALENDAR_REDIRECT_URI`: `https://dentassist.ai/api/google-calendar/callback`
2. Update **Google Cloud Console**:
   - Add `https://dentassist.ai` to Authorized JavaScript Origins.
   - Add `https://dentassist.ai/api/auth/callback/google` to Authorized Redirect URIs.
   - Add `https://dentassist.ai/api/google-calendar/callback` to Calendar Redirect URIs.
3. Update **Resend**: Ensure sending domain matches the custom domain or subdomain.
4. Redeploy the application to apply the updated environment variables.

---

## 11. Post-Deployment Verification Checklist

Execute this structured smoke test sequence to confirm all components are operating correctly:

### Phase 1: Public Routes & SSL

- [ ] Visit `https://<DOMAIN>/` — Verify landing page loads with HTTP 200 and valid SSL certificate.
- [ ] Check `https://<DOMAIN>/about`, `/privacy`, `/terms` — Verify legal pages render without errors.
- [ ] Check `https://<DOMAIN>/robots.txt` and `/sitemap.xml` — Confirm SEO endpoints respond with valid XML/text.

### Phase 2: User Authentication

- [ ] Navigate to `/signup` and create a new account using email/password.
- [ ] Verify that a verification email is dispatched via Resend.
- [ ] Sign out and test logging in via `/login`.
- [ ] Test **Sign in with Google** — Confirm redirect to Google Consent screen, successful callback to `/api/auth/callback/google`, and redirection to `/dashboard`.

### Phase 3: Practice Workspace & Multi-Tenancy

- [ ] Complete practice creation onboarding (clinic name, address, timezone).
- [ ] Verify organization slug generation in the database.
- [ ] Open a secondary incognito window with a second user account and create a second practice.
- [ ] Verify tenant isolation: Ensure User A cannot view User B's practice settings, roster, or appointments.

### Phase 4: Clinic Roster & Operating Hours

- [ ] Navigate to **Dentists** in the dashboard and create a practitioner.
- [ ] Navigate to **Services** and configure a procedure (e.g., "Routine Cleaning", duration: 45 min).
- [ ] Navigate to **Working Hours** and save operating schedules for Monday through Friday.

### Phase 5: Knowledge Base & RAG Pipeline

- [ ] Navigate to **Knowledge Base** (`/dashboard/knowledge`).
- [ ] Upload a clinical PDF or Markdown file (< 4 MB).
- [ ] Confirm file status transitions: `PROCESSING` -> `REVIEW` -> `READY`.
- [ ] Verify that text chunks and embeddings were created in Pinecone under the practice's namespace.

### Phase 6: Autonomous Receptionist & Chat

- [ ] Open the in-dashboard **Playground** (`/dashboard/playground`).
- [ ] Ask a question answered by your uploaded document (e.g., "What is your cancellation policy?").
- [ ] Confirm the assistant returns a grounded response with accurate document citations.
- [ ] Ask for practice operating hours — Confirm tool call executes and returns verified clinic hours.

### Phase 7: Google Calendar Connection & Scheduling

- [ ] Navigate to **Clinic Settings > Google Calendar** (`/dashboard/calendar`).
- [ ] Click **Connect Google Calendar**.
- [ ] Authorize the application on the Google consent screen.
- [ ] Confirm redirect to `/dashboard/calendar?calendarConnected=true` and select the target calendar.
- [ ] In the Playground or widget, initiate an appointment booking (e.g., "Book a cleaning on Friday at 10 AM").
- [ ] Verify that the appointment is written to the database with a reference code (`APT-...`).
- [ ] Verify that the synchronized event appears immediately on the connected Google Calendar.

### Phase 8: Embeddable Website Widget

- [ ] Visit `https://<DOMAIN>/widget.js` — Verify the client script loads.
- [ ] Navigate to **Widget Settings** (`/dashboard/widget`) and add `localhost` or your practice website to **Allowed Domains**.
- [ ] Test the widget chat in the live preview to confirm CORS and message streaming.

### Phase 9: Health & Error Logging

- [ ] Query `GET /api/internal/ai/health` — Verify all active providers return `status: healthy` with latency metrics.
- [ ] Inspect Vercel Function logs to ensure no unhandled exceptions or connection leaks.

---

## 12. Troubleshooting Guide

### 1. Build Failure: `Invalid environment variables`

- **Cause**: In production builds (`NODE_ENV === "production"`), [config/env.ts](file:///config/env.ts#L170) enforces presence of mandatory variables (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`).
- **Resolution**: Verify that all mandatory environment variables are populated in the Vercel Project Settings for the **Production** environment, and check for typos.

### 2. Database Connection Timeout or Pooler Exhaustion

- **Cause**: Serverless functions spawning unbounded direct connections to PostgreSQL.
- **Resolution**:
  - Ensure `DATABASE_URL` uses the **Neon Pooled connection string** (contains `-pooler` in hostname).
  - Verify that `sslmode=require` is appended to the connection string.
  - Ensure [lib/db.ts](file:///lib/db.ts) is using the global singleton pattern (already implemented in repository).

### 3. Google OAuth Error: `redirect_uri_mismatch` (400)

- **Cause**: The redirect URI passed in the OAuth request does not match the URI registered in the Google Cloud Console.
- **Resolution**:
  - For user authentication: Verify `https://<DOMAIN>/api/auth/callback/google` is in the Authorized Redirect URIs list.
  - For Google Calendar: Verify `https://<DOMAIN>/api/google-calendar/callback` is registered, and check that `GOOGLE_CALENDAR_REDIRECT_URI` matches the exact URL including scheme (`https://`).

### 4. Google OAuth Error: `access_denied` / App Not Verified

- **Cause**: Google OAuth app is in "Testing" mode and the signing-in user is not listed under Test Users, or the app has not been approved for sensitive Calendar scopes.
- **Resolution**:
  - Add the user email to **OAuth consent screen > Test users** in GCP Console.
  - For production public clinics, submit the app for verification or switch user type.

### 5. AI Chat Error: `AIProviderError` or Cascade Circuit Open

- **Cause**: Primary AI provider (Gemini) API key is missing, invalid, or exhausted rate limits (HTTP 429).
- **Resolution**:
  - Inspect `/api/internal/ai/health` to see which provider is tripped.
  - Verify `GEMINI_API_KEY` validity in Google AI Studio.
  - Ensure secondary (`GROQ_API_KEY`) and tertiary (`OPENROUTER_API_KEY`) keys are provided so failover activates automatically.

### 6. Pinecone Error: `Index not found` (404) or Dimension Mismatch

- **Cause**: The Pinecone index specified in `PINECONE_INDEX` does not exist, or was created with dimensions other than 1024.
- **Resolution**:
  - In Pinecone Console, create an index named `dentassist` with **Dimensions: 1024** and **Metric: Cosine**.
  - Ensure `PINECONE_API_KEY` has access to the project hosting the index.

### 7. File Upload Error: `413 Payload Too Large` or Function Timeout

- **Cause**: Uploaded file exceeds Vercel Serverless Function 4.5 MB request payload limit, or PDF text extraction exceeds function execution timeout.
- **Resolution**:
  - Compress or split files larger than 4.5 MB.
  - Configure `maxDuration: 60` in `vercel.json` if on Vercel Pro.
  - Check S3 credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET_NAME`).

### 8. Better Auth Error: `Origin not trusted` (403)

- **Cause**: Request `Origin` header does not match `BETTER_AUTH_URL`.
- **Resolution**:
  - Update `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` in Vercel to match the exact protocol and domain used in the browser.
  - If accessing from a custom preview domain, ensure it is added to `trustedOrigins` in `lib/auth/auth.ts`.

---

## 13. Ongoing Maintenance & Operational Security

### Database Migration Policy

- **Development**: Use `pnpm prisma db push` or create feature branch migrations.
- **Production Schema Updates**:
  1. Test schema changes against a staging branch database.
  2. For zero-downtime migrations, only perform additive changes (add nullable columns, new tables).
  3. Run `pnpm prisma db push` (or `pnpm prisma migrate deploy`) during maintenance windows or as part of automated CI/CD.
  4. Never rename or drop columns without a multi-phase migration (expand, migrate, contract).

### Automated Backups & Disaster Recovery

- **Neon Point-in-Time Restore (PITR)**: Neon provides continuous WAL archiving and instant point-in-time branch restores. If data corruption occurs, restore a branch to a point prior to the incident.
- **Daily Logical Dumps**: Schedule regular `pg_dump` snapshots to an off-site S3 bucket:
  ```bash
  pg_dump "$DATABASE_URL" -F c -b -v -f "dentassist_backup_$(date +%Y%m%d).dump"
  ```

### Credential Rotation Procedures

- **Database Password**: Update password in Neon Console; update `DATABASE_URL` in Vercel; trigger redeployment.
- **Better Auth Secret**: Rotating `BETTER_AUTH_SECRET` will invalidate existing user sessions, requiring users to log in again.
- **Google Calendar Encryption Key**: **DO NOT rotate** `GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY` in place. To rotate, write a script that reads all records from `google_calendar_connection`, decrypts tokens with the old key, and re-encrypts with the new key before updating the environment variable.
- **AI & Resend API Keys**: Can be rotated in their respective provider consoles and updated in Vercel without user downtime.

### Security & Multi-Tenant Data Protection

- **Tenant Isolation**: Every database query touching organizational data must include `where: { organizationId }`. Never query by entity ID alone.
- **Token Sanitization**: Plaintext Google OAuth access and refresh tokens are never logged. Keep server logging at `error` level in production ([lib/db.ts](file:///lib/db.ts#L28)).
- **HIPAA & Compliance Boundary**: While DentAssist AI implements encryption-at-rest (AES-256-GCM) and TLS in transit, formal HIPAA/HITECH or GDPR compliance requires signed Business Associate Agreements (BAAs) with all subprocessors (Vercel, Neon, Google Cloud, Pinecone, Resend, and LLM providers).

---

## 14. Open Maintainer Inputs & Confirmations

Prior to public commercial launch, the repository maintainer should confirm the following items:

1. **Production Domain & Vanity URL**: Confirm the primary production domain (e.g., `https://dentassist.ai` vs `https://dentassist-care.vercel.app`).
2. **Legal Entity & Governing Jurisdiction**: Populate `NEXT_PUBLIC_COMPANY_LEGAL_NAME`, `NEXT_PUBLIC_COMPANY_ADDRESS`, and `NEXT_PUBLIC_LEGAL_JURISDICTION` in production environment variables to replace placeholders in Terms and Privacy policies.
3. **Google OAuth Verification**: Submit the Google Cloud Project OAuth Consent Screen for formal verification to remove the "Google hasn't verified this app" warning screen for external practice owners connecting Google Calendars.
4. **Resend Sending Domain**: Add and verify DNS records for the production transactional email domain in Resend.
5. **S3 Storage Strategy**: Decide whether to provision a dedicated AWS S3 bucket, Cloudflare R2 bucket, or Neon Object Storage bucket for clinical file persistence.
6. **Enterprise Migration Tracking**: Decide whether the engineering team prefers tracking incremental SQL migration files in `prisma/migrations` or continuing with `prisma db push` across release tags.

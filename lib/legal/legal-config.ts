/**
 * Centralized legal, contact, and business entity configuration.
 *
 * NOTE FOR PRACTICE OWNER / LEGAL COUNSEL:
 * Update these values with your registered legal entity details, official support email,
 * and governing jurisdiction prior to commercial deployment.
 */

export const LEGAL_CONFIG = {
  // Brand & Product Identity
  productName: "DentAssist AI",
  productTagline: "AI Receptionist for Dental Practices",
  websiteUrl: process.env.NEXT_PUBLIC_APP_URL || "https://dentassist.ai",

  // Business Entity Information (Owner to confirm legal entity name & address)
  companyLegalName:
    process.env.NEXT_PUBLIC_COMPANY_LEGAL_NAME || "DentAssist AI Technologies",
  companyAddress:
    process.env.NEXT_PUBLIC_COMPANY_ADDRESS ||
    "[Registered Business Address — Pending Practice Owner Review]",
  jurisdiction:
    process.env.NEXT_PUBLIC_LEGAL_JURISDICTION ||
    "[Jurisdiction / Governing State/Country — Pending Owner Review]",

  // Dates
  effectiveDate: "October 25, 2026",
  lastUpdatedDate: "October 25, 2026",

  // Third-Party Subprocessors (Reflected accurately from codebase configuration)
  subprocessors: [
    {
      name: "Neon (PostgreSQL)",
      purpose:
        "Managed cloud database for application records and multi-tenant data storage",
      country: "United States",
    },
    {
      name: "Amazon Web Services (AWS S3)",
      purpose:
        "Encrypted cloud object storage for uploaded clinic knowledge documents",
      country: "United States (us-east-2)",
    },
    {
      name: "Pinecone",
      purpose:
        "Vector database for semantic search and document chunk retrieval",
      country: "United States",
    },
    {
      name: "Google Cloud Platform / Google APIs",
      purpose:
        "Google OAuth authentication and Google Calendar availability & event scheduling",
      country: "United States",
    },
    {
      name: "Google Gemini / Groq / OpenRouter",
      purpose:
        "Large language model inference for patient chat and inquiry grounding",
      country: "United States",
    },
    {
      name: "Resend",
      purpose:
        "Transactional email delivery for account verification and password reset",
      country: "United States",
    },
  ],
};

import { PrismaClient } from "@prisma/client";

/**
 * Converts any organization name into a clean, URL-safe slug.
 * Example: "Bright Smile Dental & Orthodontics!" -> "bright-smile-dental-orthodontics"
 */
export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphen
    .slice(0, 45) // Keep length reasonable
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphen

  return base.length > 0 ? base : "clinic";
}

/**
 * Generates a guaranteed unique slug for an organization in the database.
 * Handles collisions by appending -2, -3, or random short hashes.
 */
export async function generateUniqueSlug(
  tx: Pick<PrismaClient, "organization"> | PrismaClient,
  name: string,
): Promise<string> {
  const baseSlug = slugify(name);

  // Check if base slug is available
  const existing = await tx.organization.findUnique({
    where: { slug: baseSlug },
    select: { id: true },
  });

  if (!existing) {
    return baseSlug;
  }

  // Try sequential numbers
  for (let i = 2; i <= 20; i++) {
    const candidate = `${baseSlug}-${i}`;
    const taken = await tx.organization.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!taken) {
      return candidate;
    }
  }

  // Fallback to random hex suffix if many collisions
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  return `${baseSlug}-${randomSuffix}`;
}

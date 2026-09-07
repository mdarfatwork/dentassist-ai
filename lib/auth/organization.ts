import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import { generateUniqueSlug } from "@/lib/organization/slug";
import { Role } from "@prisma/client";

export interface OrganizationWithMembership {
  id: string;
  name: string;
  slug: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
  membershipId: string;
}

/**
 * Retrieves all organizations that a user is a member of.
 */
export async function getUserOrganizations(
  userId: string,
): Promise<OrganizationWithMembership[]> {
  const memberships = await db.organizationMembership.findMany({
    where: { userId },
    include: {
      organization: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    slug: m.organization.slug,
    role: m.role,
    createdAt: m.organization.createdAt,
    updatedAt: m.organization.updatedAt,
    membershipId: m.id,
  }));
}

/**
 * Resolves the active organization for a user.
 * Strictly verifies that the preferred organization ID belongs to the user.
 * Falls back to the user's first organization, or null if the user belongs to none.
 */
export async function getActiveOrganization(
  userId: string,
  preferredOrgId?: string | null,
): Promise<OrganizationWithMembership | null> {
  const organizations = await getUserOrganizations(userId);

  if (organizations.length === 0) {
    return null;
  }

  if (preferredOrgId) {
    const matched = organizations.find((org) => org.id === preferredOrgId);
    if (matched) {
      return matched;
    }
  }

  // Fallback to first organization
  return organizations[0];
}

/**
 * Strictly verifies that a user is a member of the requested organization.
 * Prevents IDOR and tenant boundary escape.
 */
export async function requireOrganizationMembership(
  userId: string,
  organizationId: string,
) {
  const membership = await db.organizationMembership.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
    include: {
      organization: true,
    },
  });

  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this organization.",
    });
  }

  return {
    membership,
    organization: membership.organization,
    role: membership.role,
  };
}

/**
 * Verifies that a user is an OWNER of the requested organization.
 */
export async function requireOrganizationOwner(
  userId: string,
  organizationId: string,
) {
  const context = await requireOrganizationMembership(userId, organizationId);

  if (context.role !== Role.OWNER) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only organization owners are permitted to perform this action.",
    });
  }

  return context;
}

/**
 * Atomically creates an Organization and assigns the authenticated user as OWNER.
 * Uses a Prisma transaction to guarantee consistency.
 */
export async function createOrganizationWithMembership(
  userId: string,
  data: { name: string },
) {
  const trimmedName = data.name.trim();

  return await db.$transaction(async (tx) => {
    // Generate guaranteed unique slug
    const slug = await generateUniqueSlug(tx, trimmedName);

    // Create organization
    const org = await tx.organization.create({
      data: {
        name: trimmedName,
        slug,
      },
    });

    // Create OWNER membership
    const membership = await tx.organizationMembership.create({
      data: {
        userId,
        organizationId: org.id,
        role: Role.OWNER,
      },
    });

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      role: membership.role,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
      membershipId: membership.id,
    };
  });
}

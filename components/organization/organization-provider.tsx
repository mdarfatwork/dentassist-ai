"use client";

import { createContext, useContext, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { setActiveOrgCookie } from "@/lib/organization/cookies";
import { Role } from "@prisma/client";

export interface OrganizationContextType {
  id: string;
  name: string;
  slug: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
  membershipId: string;
}

interface OrganizationState {
  activeOrganization: OrganizationContextType | null;
  organizations: OrganizationContextType[];
  isLoading: boolean;
  switchOrganization: (organizationId: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationState | undefined>(
  undefined,
);

interface OrganizationProviderProps {
  children: React.ReactNode;
  initialActiveOrg?: OrganizationContextType | null;
  initialOrganizations?: OrganizationContextType[];
}

export function OrganizationProvider({
  children,
  initialActiveOrg = null,
  initialOrganizations = [],
}: Readonly<OrganizationProviderProps>) {
  const router = useRouter();

  const listQuery = trpc.organization.list.useQuery(undefined, {
    initialData:
      initialOrganizations.length > 0 ? initialOrganizations : undefined,
  });

  const activeQuery = trpc.organization.getActive.useQuery(undefined, {
    initialData: initialActiveOrg ?? undefined,
  });

  const setActiveMutation = trpc.organization.setActive.useMutation();

  const switchOrganization = useCallback(
    async (organizationId: string): Promise<boolean> => {
      try {
        const result = await setActiveMutation.mutateAsync({ organizationId });
        if (result.success) {
          setActiveOrgCookie(organizationId);
          await Promise.all([listQuery.refetch(), activeQuery.refetch()]);
          router.refresh();
          return true;
        }
        return false;
      } catch (error) {
        console.error("Failed to switch organization:", error);
        return false;
      }
    },
    [setActiveMutation, listQuery, activeQuery, router],
  );

  const refetch = useCallback(async () => {
    await Promise.all([listQuery.refetch(), activeQuery.refetch()]);
  }, [listQuery, activeQuery]);

  const organizations = useMemo(
    () => (listQuery.data as OrganizationContextType[]) || [],
    [listQuery.data],
  );

  const currentActive = useMemo(
    () =>
      (activeQuery.data !== undefined
        ? (activeQuery.data as OrganizationContextType | null)
        : initialActiveOrg) ||
      organizations[0] ||
      null,
    [activeQuery.data, initialActiveOrg, organizations],
  );

  const contextValue = useMemo(
    () => ({
      activeOrganization: currentActive,
      organizations,
      isLoading: listQuery.isLoading || activeQuery.isLoading,
      switchOrganization,
      refetch,
    }),
    [
      currentActive,
      organizations,
      listQuery.isLoading,
      activeQuery.isLoading,
      switchOrganization,
      refetch,
    ],
  );

  return (
    <OrganizationContext.Provider value={contextValue}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error(
      "useOrganization must be used within an OrganizationProvider",
    );
  }
  return context;
}

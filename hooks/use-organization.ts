"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Organization } from "@/types/database";

interface OrganizationState {
  currentOrganization: Organization | null;
  organizations: Organization[];
  setCurrentOrganization: (org: Organization | null) => void;
  setOrganizations: (orgs: Organization[]) => void;
  clearOrganization: () => void;
}

export const useOrganizationStore = create<OrganizationState>()(
  persist(
    (set) => ({
      currentOrganization: null,
      organizations: [],
      setCurrentOrganization: (org) => set({ currentOrganization: org }),
      setOrganizations: (orgs) => set({ organizations: orgs }),
      clearOrganization: () =>
        set({ currentOrganization: null, organizations: [] }),
    }),
    {
      name: "alba-organization",
      partialize: (state) => ({
        currentOrganization: state.currentOrganization,
      }),
    }
  )
);

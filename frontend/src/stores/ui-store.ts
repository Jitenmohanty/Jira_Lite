'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { IssueStatus } from '@/lib/types';

export type ViewMode = 'board' | 'list';

interface UIState {
  /** The org the user is currently working in (persisted across reloads). */
  activeOrgId: string | null;
  setActiveOrgId: (id: string | null) => void;

  /** Board vs list view for the issues screen. */
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  /** Whether the create-issue modal is open, and an optional prefilled status. */
  createIssueOpen: boolean;
  createIssueStatus: IssueStatus | null;
  openCreateIssue: (status?: IssueStatus) => void;
  closeCreateIssue: () => void;

  /** Mobile sidebar drawer (not persisted). */
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      activeOrgId: null,
      setActiveOrgId: (id) => set({ activeOrgId: id }),

      viewMode: 'board',
      setViewMode: (mode) => set({ viewMode: mode }),

      createIssueOpen: false,
      createIssueStatus: null,
      openCreateIssue: (status) => set({ createIssueOpen: true, createIssueStatus: status ?? null }),
      closeCreateIssue: () => set({ createIssueOpen: false, createIssueStatus: null }),

      sidebarOpen: false,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
    }),
    {
      name: 'tracer-ui',
      // Only persist durable preferences, not transient modal state.
      partialize: (s) => ({ activeOrgId: s.activeOrgId, viewMode: s.viewMode }),
    },
  ),
);

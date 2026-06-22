"use client";
import { create } from "zustand";

type LegalReconsentStore = {
  open: boolean;
  triggerCount: number;
  openDialog: () => void;
  closeDialog: () => void;
};

export const useLegalReconsentStore = create<LegalReconsentStore>((set) => ({
  open: false,
  triggerCount: 0,
  openDialog: () => set((s) => ({ open: true, triggerCount: s.triggerCount + 1 })),
  closeDialog: () => set({ open: false }),
}));

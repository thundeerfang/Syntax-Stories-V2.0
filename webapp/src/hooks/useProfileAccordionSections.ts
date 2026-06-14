"use client";

import { useEffect, useRef, useState } from "react";
import type { ProfileSectionVariant } from "@/components/ui/editor";
import { profileSectionMinVisible } from "@/lib/profile/profileDisplay";

const INITIAL_VISIBLE: Record<ProfileSectionVariant, number> = {
  certification: 1,
  project: 1,
  openSource: 2,
  mySetup: 2,
};

const INITIAL_LOADING: Record<ProfileSectionVariant, boolean> = {
  certification: false,
  project: false,
  openSource: false,
  mySetup: false,
};

export function useProfileAccordionSections(
  defaultOpen: ProfileSectionVariant | null = "certification",
) {
  const [openSectionId, setOpenSectionId] =
    useState<ProfileSectionVariant | null>(defaultOpen);
  const accordionsRootRef = useRef<HTMLDivElement>(null);
  const [visibleCounts, setVisibleCounts] =
    useState<Record<ProfileSectionVariant, number>>(INITIAL_VISIBLE);
  const [sectionLoading, setSectionLoading] =
    useState<Record<ProfileSectionVariant, boolean>>(INITIAL_LOADING);

  const setSectionOpen = (variant: ProfileSectionVariant, open: boolean) => {
    if (!open) {
      setOpenSectionId((prev) => (prev === variant ? null : prev));
      return;
    }
    setOpenSectionId(variant);
    setVisibleCounts((prev) => ({
      ...prev,
      [variant]: profileSectionMinVisible(variant, prev[variant]),
    }));
    setSectionLoading((prev) => ({ ...prev, [variant]: true }));
    globalThis.setTimeout(() => {
      setSectionLoading((prev) => ({ ...prev, [variant]: false }));
    }, 420);
  };

  const viewMore = (variant: ProfileSectionVariant, step = 1) => {
    setSectionLoading((prev) => ({ ...prev, [variant]: true }));
    globalThis.setTimeout(() => {
      setVisibleCounts((prev) => ({
        ...prev,
        [variant]: (prev[variant] ?? 0) + step,
      }));
      setSectionLoading((prev) => ({ ...prev, [variant]: false }));
    }, 420);
  };

  useEffect(() => {
    const onDown = (ev: MouseEvent) => {
      if (!openSectionId) return;
      const root = accordionsRootRef.current;
      if (root && !root.contains(ev.target as Node)) {
        setOpenSectionId(null);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [openSectionId]);

  return {
    openSectionId,
    accordionsRootRef,
    visibleCounts,
    sectionLoading,
    setSectionOpen,
    viewMore,
  };
}

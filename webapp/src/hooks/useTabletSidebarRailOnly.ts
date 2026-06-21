"use client";

import { useEffect, useState } from "react";

const TABLET_SIDEBAR_RAIL_QUERY =
  "(min-width: 768px) and (max-width: 1279px)";

export function useTabletSidebarRailOnly(): boolean {
  const [railOnly, setRailOnly] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(TABLET_SIDEBAR_RAIL_QUERY);
    const sync = () => setRailOnly(media.matches);

    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return railOnly;
}

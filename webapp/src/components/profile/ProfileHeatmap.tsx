"use client";
import dynamic from "next/dynamic";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { READ_HEATMAP_WINDOW_DAYS } from "@/lib/profile/readHeatmapConstants";
import { MONTH_NAMES_SHORT } from "@/lib/profile/dateLabels";
const ActivityCalendar = dynamic(
  () => import("react-activity-calendar").then((m) => m.ActivityCalendar),
  { ssr: false },
);
type ActivityDay = {
  date: string;
  count: number;
  level: number;
};
function utcDayStringFromDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export function buildReadHeatmapActivityData(
  readDayBuckets: readonly string[] | null | undefined,
): ActivityDay[] {
  const readSet = new Set(readDayBuckets ?? []);
  const anchor = new Date();
  const todayUtc = new Date(
    Date.UTC(
      anchor.getUTCFullYear(),
      anchor.getUTCMonth(),
      anchor.getUTCDate(),
    ),
  );
  const data: ActivityDay[] = [];
  for (let i = READ_HEATMAP_WINDOW_DAYS - 1; i >= 0; i--) {
    const d = new Date(todayUtc);
    d.setUTCDate(d.getUTCDate() - i);
    const date = utcDayStringFromDate(d);
    const has = readSet.has(date);
    data.push({
      date,
      count: has ? 1 : 0,
      level: has ? 4 : 0,
    });
  }
  return data;
}
const heatmapTheme = {
  light: ["var(--muted)", "var(--primary)"],
  dark: ["var(--muted)", "var(--primary)"],
};
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export type ProfileHeatmapProps = {
  readHeatmapDays?: readonly string[] | null;
};
export function ProfileHeatmap({ readHeatmapDays }: ProfileHeatmapProps) {
  const { isDark } = useTheme();
  const data = useMemo(
    () => buildReadHeatmapActivityData(readHeatmapDays),
    [readHeatmapDays],
  );
  const measureRef = useRef<HTMLDivElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ scale: 1, boxH: 0 });
  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = measureRef.current;
    if (!outer || !inner) return;
    const run = () => {
      const cw = outer.clientWidth;
      if (cw < 1) return;
      const iw = inner.scrollWidth;
      const ih = inner.scrollHeight;
      if (iw < 1 || ih < 1) return;
      const s = Math.min(1, cw / iw);
      setFit({ scale: s, boxH: Math.ceil(ih * s) });
    };
    run();
    const ro = new ResizeObserver(run);
    ro.observe(outer);
    const t = requestAnimationFrame(() => requestAnimationFrame(run));
    return () => {
      cancelAnimationFrame(t);
      ro.disconnect();
    };
  }, [data, isDark]);
  const calendar = (
    <ActivityCalendar
      data={data}
      theme={heatmapTheme}
      colorScheme={isDark ? "dark" : "light"}
      blockSize={8}
      blockMargin={2}
      blockRadius={2}
      fontSize={9}
      showMonthLabels
      showWeekdayLabels
      showColorLegend
      showTotalCount={false}
      labels={{
        months: [...MONTH_NAMES_SHORT],
        weekdays: WEEKDAYS,
        legend: { less: "No reads", more: "Read" },
      }}
    />
  );
  return (
    <div ref={outerRef} className="w-full min-w-0 max-w-full">
      <div
        className="w-full min-w-0 overflow-hidden"
        style={fit.boxH > 0 ? { height: fit.boxH } : { minHeight: 120 }}
      >
        <div
          ref={measureRef}
          className="w-max origin-top-left"
          style={{
            transform: `scale(${fit.scale})`,
            transformOrigin: "top left",
          }}
        >
          {calendar}
        </div>
      </div>
    </div>
  );
}

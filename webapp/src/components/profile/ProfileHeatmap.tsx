'use client';

import dynamic from 'next/dynamic';
import { useTheme } from '@/hooks/useTheme';

const ActivityCalendar = dynamic(
  () => import('react-activity-calendar').then((m) => m.ActivityCalendar),
  { ssr: false }
);

type ActivityDay = { date: string; count: number; level: number };

/** GitHub-style activity level 0–4 from a uniform random sample. */
function randomActivityLevel(rand: number): number {
  if (rand < 0.4) return 0;
  if (rand < 0.65) return 1;
  if (rand < 0.85) return 2;
  if (rand < 0.95) return 3;
  return 4;
}

function randomCountForLevel(level: number): number {
  if (level === 0) return 0;
  return Math.floor(1 + Math.random() * 12);
}

function createDummyDay(anchor: Date, offsetDays: number): ActivityDay {
  const d = new Date(anchor);
  d.setDate(d.getDate() - offsetDays);
  const date = d.toISOString().slice(0, 10);
  const level = randomActivityLevel(Math.random());
  const count = randomCountForLevel(level);
  return { date, count, level };
}

// Dummy data: last ~6 months, GitHub-style activity levels 0–4
function getDummyActivityData(): ActivityDay[] {
  const anchor = new Date();
  const data: ActivityDay[] = [];
  for (let i = 0; i < 180; i++) {
    data.push(createDummyDay(anchor, i));
  }
  return data.reverse();
}

const DUMMY_DATA = getDummyActivityData();

// Theme using CSS variables — GitHub-style (low → high intensity)
const heatmapTheme = {
  light: ['var(--muted)', 'var(--primary)'],
  dark: ['var(--muted)', 'var(--primary)'],
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function ProfileHeatmap() {
  const { isDark } = useTheme();
  return (
    <ActivityCalendar
      data={DUMMY_DATA}
      theme={heatmapTheme}
      colorScheme={isDark ? 'dark' : 'light'}
      blockSize={10}
      blockMargin={2}
      blockRadius={3}
      fontSize={10}
      showMonthLabels
      showWeekdayLabels
      showColorLegend
      showTotalCount={false}
      labels={{
        months: MONTHS,
        weekdays: WEEKDAYS,
        legend: { less: 'Less', more: 'More' },
      }}
    />
  );
}

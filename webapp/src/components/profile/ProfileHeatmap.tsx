'use client';

import dynamic from 'next/dynamic';
import { useTheme } from '@/hooks/useTheme';

const ActivityCalendar = dynamic(
  () => import('react-activity-calendar').then((m) => m.ActivityCalendar),
  { ssr: false }
);

// Dummy data: last ~6 months, GitHub-style activity levels 0–4
function getDummyActivityData(): Array<{ date: string; count: number; level: number }> {
  const data: Array<{ date: string; count: number; level: number }> = [];
  const today = new Date();
  for (let i = 0; i < 180; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const date = d.toISOString().slice(0, 10);
    const rand = Math.random();
    const level = rand < 0.4 ? 0 : rand < 0.65 ? 1 : rand < 0.85 ? 2 : rand < 0.95 ? 3 : 4;
    const count = level === 0 ? 0 : Math.floor(1 + Math.random() * 12);
    data.push({ date, count, level });
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

import type { AchievementUnlockDto } from '../../achievements/achievement.types.js';
import { createNotification } from '../notifications/notification.service.js';

/** XP equals points for v1 — adjust formula in xp.service later. */
export async function notifyAchievementUnlocks(
  userId: string,
  unlocks: AchievementUnlockDto[]
): Promise<void> {
  if (unlocks.length === 0) return;

  if (unlocks.length === 1) {
    const u = unlocks[0]!;
    await createNotification({
      userId,
      type: 'achievement_unlocked',
      title: 'Achievement unlocked',
      message: `${u.title} · +${u.points} XP`,
      href: '/achievements',
      icon: 'award',
      metadata: {
        achievementId: u.id,
        slug: u.slug,
        points: u.points,
        celebrateAs: u.celebrateAs,
        unlocks: [u],
      },
    });
    return;
  }

  const totalPoints = unlocks.reduce((s, u) => s + u.points, 0);
  await createNotification({
    userId,
    type: 'achievement_unlocked',
    title: `${unlocks.length} achievements unlocked`,
    message: `+${totalPoints} XP total — tap to view`,
    href: '/achievements',
    icon: 'award',
    metadata: {
      batch: true,
      count: unlocks.length,
      totalPoints,
      unlocks: unlocks.map((u) => ({
        id: u.id,
        slug: u.slug,
        title: u.title,
        points: u.points,
      })),
    },
  });
}

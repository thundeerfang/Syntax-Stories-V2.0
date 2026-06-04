import { UserModel, normalizeProfileImg } from '../../models/User.js';
import type { SearchHit } from './search.types.js';
import { escapeRegex } from './searchQuery.util.js';

const FOLLOW_FIELDS = 'username fullName profileImg';

export async function searchUsersForUnified(q: string, limit: number): Promise<SearchHit[]> {
  const regex = new RegExp(escapeRegex(q), 'i');
  const users = await UserModel.find({
    isActive: true,
    $or: [{ username: regex }, { fullName: regex }],
  })
    .select(FOLLOW_FIELDS)
    .limit(limit)
    .lean();

  return users.map((u) => ({
    id: String(u._id),
    type: 'user' as const,
    label: u.fullName,
    sublabel: `@${u.username}`,
    href: `/u/${u.username}`,
    imageUrl: normalizeProfileImg(u.profileImg) || undefined,
  }));
}

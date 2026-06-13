import mongoose from 'mongoose';
import { sanitizeBookmarkFolderEmoji } from '../lib/bookmarkFolderEmojis.js';
import { BookmarkGroupModel } from '../models/BookmarkGroup.js';
import { BlogBookmarkModel } from '../models/BlogBookmark.js';
import { DEFAULT_BOOKMARK_GROUP_NAME } from '../variable/constants.js';

/**
 * Ensures the user has exactly one default group (creates **General** if needed) and backfills
 * legacy bookmark rows missing `groupId`.
 */
export async function ensureDefaultBookmarkGroup(
  userOid: mongoose.Types.ObjectId
): Promise<mongoose.Types.ObjectId> {
  const found = await BookmarkGroupModel.findOne({ userId: userOid, isDefault: true })
    .select('_id')
    .lean();
  let id: mongoose.Types.ObjectId;
  if (found?._id) {
    id = found._id as mongoose.Types.ObjectId;
  } else {
    const created = await BookmarkGroupModel.create({
      userId: userOid,
      name: DEFAULT_BOOKMARK_GROUP_NAME,
      isDefault: true,
    });
    id = created._id as mongoose.Types.ObjectId;
  }
  await BlogBookmarkModel.updateMany(
    { userId: userOid, $or: [{ groupId: { $exists: false } }, { groupId: null }] },
    { $set: { groupId: id } }
  );
  return id;
}

/** Resolve which folder new saves go to: explicit `groupId` when owned by user, else default. */
export async function resolveBookmarkGroupForViewer(
  viewerUserId: string,
  requestedGroupIdHex?: string | null
): Promise<mongoose.Types.ObjectId> {
  const userOid = new mongoose.Types.ObjectId(viewerUserId);
  const defaultId = await ensureDefaultBookmarkGroup(userOid);
  const raw = requestedGroupIdHex?.trim();
  if (!raw || !mongoose.Types.ObjectId.isValid(raw)) return defaultId;
  const gid = new mongoose.Types.ObjectId(raw);
  if (String(gid) !== raw) return defaultId;
  const owned = await BookmarkGroupModel.findOne({ _id: gid, userId: userOid })
    .select('_id')
    .lean();
  return owned ? gid : defaultId;
}

export async function listGroupsForUser(userOid: mongoose.Types.ObjectId) {
  await ensureDefaultBookmarkGroup(userOid);
  return BookmarkGroupModel.find({ userId: userOid }).sort({ isDefault: -1, name: 1 }).lean();
}

export async function createGroupForUser(
  userOid: mongoose.Types.ObjectId,
  name: string,
  opts?: { emoji?: string; makeDefault?: boolean }
): Promise<
  | { ok: true; group: { _id: string; name: string; emoji: string; isDefault: boolean } }
  | { ok: false; message: string }
> {
  await ensureDefaultBookmarkGroup(userOid);
  const n = name.trim().slice(0, 80);
  if (!n) return { ok: false, message: 'Name required' };
  const emoji = sanitizeBookmarkFolderEmoji(opts?.emoji);
  try {
    const g = await BookmarkGroupModel.create({
      userId: userOid,
      name: n,
      emoji: emoji || undefined,
      isDefault: false,
    });
    if (opts?.makeDefault === true) {
      await setDefaultGroupForUser(userOid, String(g._id));
    }
    const fresh = await BookmarkGroupModel.findById(g._id).lean();
    if (!fresh) return { ok: false, message: 'Failed to load folder' };
    return {
      ok: true,
      group: {
        _id: String(fresh._id),
        name: fresh.name,
        emoji: typeof fresh.emoji === 'string' ? fresh.emoji : '',
        isDefault: !!fresh.isDefault,
      },
    };
  } catch (e) {
    const err = e as { code?: number };
    if (err?.code === 11000)
      return { ok: false, message: 'A folder with that name already exists' };
    throw e;
  }
}

export async function updateGroupForUser(
  userOid: mongoose.Types.ObjectId,
  groupIdHex: string,
  patch: { name?: string; emoji?: string | null }
): Promise<
  | { ok: true; group: { _id: string; name: string; emoji: string; isDefault: boolean } }
  | { ok: false; message: string }
> {
  if (!mongoose.Types.ObjectId.isValid(groupIdHex)) return { ok: false, message: 'Invalid group' };
  const gid = new mongoose.Types.ObjectId(groupIdHex);
  const existing = await BookmarkGroupModel.findOne({ _id: gid, userId: userOid }).lean();
  if (!existing) return { ok: false, message: 'Group not found' };

  const updates: { name?: string; emoji?: string } = {};
  if (patch.name !== undefined) {
    const n = patch.name.trim().slice(0, 80);
    if (!n) return { ok: false, message: 'Name required' };
    updates.name = n;
  }
  if (patch.emoji !== undefined) {
    if (patch.emoji === null || patch.emoji === '') {
      updates.emoji = '';
    } else {
      const emoji = sanitizeBookmarkFolderEmoji(patch.emoji);
      if (!emoji) return { ok: false, message: 'Emoji not allowed' };
      updates.emoji = emoji;
    }
  }
  if (Object.keys(updates).length === 0) {
    return { ok: false, message: 'Nothing to update' };
  }

  try {
    await BookmarkGroupModel.updateOne({ _id: gid, userId: userOid }, { $set: updates });
    const fresh = await BookmarkGroupModel.findById(gid).lean();
    if (!fresh) return { ok: false, message: 'Failed to load folder' };
    return {
      ok: true,
      group: {
        _id: String(fresh._id),
        name: fresh.name,
        emoji: typeof fresh.emoji === 'string' ? fresh.emoji : '',
        isDefault: !!fresh.isDefault,
      },
    };
  } catch (e) {
    const err = e as { code?: number };
    if (err?.code === 11000)
      return { ok: false, message: 'A folder with that name already exists' };
    throw e;
  }
}

export async function setDefaultGroupForUser(
  userOid: mongoose.Types.ObjectId,
  groupIdHex: string
): Promise<{ ok: boolean; message?: string }> {
  if (!mongoose.Types.ObjectId.isValid(groupIdHex)) return { ok: false, message: 'Invalid group' };
  const gid = new mongoose.Types.ObjectId(groupIdHex);
  const g = await BookmarkGroupModel.findOne({ _id: gid, userId: userOid }).select('_id').lean();
  if (!g) return { ok: false, message: 'Group not found' };
  await BookmarkGroupModel.updateMany({ userId: userOid }, { $set: { isDefault: false } });
  await BookmarkGroupModel.updateOne({ _id: gid, userId: userOid }, { $set: { isDefault: true } });
  return { ok: true };
}

export async function deleteGroupForUser(
  userOid: mongoose.Types.ObjectId,
  groupIdHex: string
): Promise<{ ok: boolean; message?: string }> {
  if (!mongoose.Types.ObjectId.isValid(groupIdHex)) return { ok: false, message: 'Invalid group' };
  const gid = new mongoose.Types.ObjectId(groupIdHex);
  const g = await BookmarkGroupModel.findOne({ _id: gid, userId: userOid }).lean();
  if (!g) return { ok: false, message: 'Group not found' };
  if (g.isDefault) return { ok: false, message: 'Cannot delete the default group' };
  const defaultId = await ensureDefaultBookmarkGroup(userOid);
  await BlogBookmarkModel.updateMany(
    { userId: userOid, groupId: gid },
    { $set: { groupId: defaultId } }
  );
  await BookmarkGroupModel.deleteOne({ _id: gid, userId: userOid });
  return { ok: true };
}

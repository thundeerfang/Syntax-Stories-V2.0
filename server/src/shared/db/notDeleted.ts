export const NOT_DELETED_FILTER = {
  $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
};

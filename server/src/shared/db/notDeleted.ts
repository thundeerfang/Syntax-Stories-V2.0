/**
 * Match documents that are not soft-deleted (`deletedAt` null or missing).
 * Use in queries for collections that use `deletedAt` for trash.
 */
/** Mutable filter for Mongoose `FilterQuery` compatibility. */
export const NOT_DELETED_FILTER = {
  $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
};

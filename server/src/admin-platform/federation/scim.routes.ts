import { Router } from 'express';
import mongoose from 'mongoose';
import { UserModel } from '../../models/User.js';
import { AdminUserModel } from '../rbac/models/AdminUser.js';
import { requireScimBearer } from './scim.middleware.js';

export const scimAdminRouter = Router();

scimAdminRouter.use(requireScimBearer);

function scimUser(row: {
  _id: mongoose.Types.ObjectId;
  email: string;
  displayName?: string;
  isActive: boolean;
}) {
  return {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
    id: String(row._id),
    userName: row.email,
    displayName: row.displayName ?? row.email,
    active: row.isActive,
    emails: [{ value: row.email, primary: true }],
    meta: {
      resourceType: 'User',
    },
  };
}

scimAdminRouter.get('/Users', async (_req, res) => {
  const operators = await AdminUserModel.find().select('userId email displayName isActive').lean();
  const resources = [];
  for (const op of operators) {
    const user = await UserModel.findById(op.userId).select('email fullName staffRole').lean();
    if (!user) continue;
    resources.push(
      scimUser({
        _id: op._id as mongoose.Types.ObjectId,
        email: op.email,
        displayName: op.displayName ?? user.fullName,
        isActive: op.isActive,
      })
    );
  }
  res.json({
    schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
    totalResults: resources.length,
    startIndex: 1,
    itemsPerPage: resources.length,
    Resources: resources,
  });
});

scimAdminRouter.get('/Users/:id', async (req, res) => {
  const id = req.params.id;
  if (!mongoose.isValidObjectId(id)) {
    res.status(404).json({ detail: 'Not found', status: '404' });
    return;
  }
  const op = await AdminUserModel.findById(id).lean();
  if (!op) {
    res.status(404).json({ detail: 'Not found', status: '404' });
    return;
  }
  res.json(
    scimUser({
      _id: op._id as mongoose.Types.ObjectId,
      email: op.email,
      displayName: op.displayName,
      isActive: op.isActive,
    })
  );
});

scimAdminRouter.patch('/Users/:id', async (req, res) => {
  const id = req.params.id;
  if (!mongoose.isValidObjectId(id)) {
    res.status(404).json({ detail: 'Not found', status: '404' });
    return;
  }
  const body = req.body as {
    Operations?: { op: string; path: string; value?: { active?: boolean } }[];
  };
  const activeOp = body.Operations?.find((o) => o.path === 'active' || o.path === 'isActive');
  if (activeOp?.value && typeof activeOp.value.active === 'boolean') {
    await AdminUserModel.updateOne({ _id: id }, { $set: { isActive: activeOp.value.active } });
  }
  const op = await AdminUserModel.findById(id).lean();
  if (!op) {
    res.status(404).json({ detail: 'Not found', status: '404' });
    return;
  }
  res.json(
    scimUser({
      _id: op._id as mongoose.Types.ObjectId,
      email: op.email,
      displayName: op.displayName,
      isActive: op.isActive,
    })
  );
});

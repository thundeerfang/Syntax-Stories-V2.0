import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { cmsAdminGate } from '../../rbac/middleware/cmsAdminGate.js';
import {
  createAdminArticle,
  deleteAdminArticle,
  deleteLock,
  getAdminArticle,
  getPublishedArticleBySlug,
  getHelpHubConfig,
  getHelpIconFacets,
  getAdminHelpHubConfig,
  listAdminArticles,
  listPublishedArticles,
  patchAdminArticle,
  patchAdminHelpHubConfig,
  postLock,
  postPublish,
  postRollback,
} from './help.controller.js';

const publicRead = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

const adminWrite = rateLimit({
  windowMs: 60_000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

export const helpPublicRouter = Router();
helpPublicRouter.get('/config', publicRead, getHelpHubConfig);
helpPublicRouter.get('/facets/icons', publicRead, getHelpIconFacets);
helpPublicRouter.get('/articles', publicRead, listPublishedArticles);
helpPublicRouter.get('/articles/:slug', publicRead, getPublishedArticleBySlug);

export const helpAdminRouter = Router();
helpAdminRouter.use(...cmsAdminGate('help:manage'), adminWrite);
helpAdminRouter.get('/articles', listAdminArticles);
helpAdminRouter.get('/config', getAdminHelpHubConfig);
helpAdminRouter.patch('/config', patchAdminHelpHubConfig);
helpAdminRouter.post('/articles', createAdminArticle);
helpAdminRouter.get('/articles/:id', getAdminArticle);
helpAdminRouter.patch('/articles/:id', patchAdminArticle);
helpAdminRouter.delete('/articles/:id', deleteAdminArticle);
helpAdminRouter.post('/articles/:id/publish', postPublish);
helpAdminRouter.post('/articles/:id/rollback', postRollback);
helpAdminRouter.post('/articles/:id/lock', postLock);
helpAdminRouter.delete('/articles/:id/lock', deleteLock);

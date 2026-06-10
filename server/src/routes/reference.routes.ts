import { Router } from 'express';
import {
  resolveTechStackReference,
  searchReferenceEntities,
  searchTechStackReference,
} from '../controllers/reference.controller.js';

const router = Router();

router.get('/entities', searchReferenceEntities);
router.get('/tech-stack', searchTechStackReference);
router.post('/tech-stack/resolve', resolveTechStackReference);

export default router;

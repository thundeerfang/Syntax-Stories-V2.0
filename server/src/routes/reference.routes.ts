import { Router } from 'express';
import {
  searchReferenceEntities,
  searchTechStackReference,
} from '../controllers/reference.controller.js';

const router = Router();

router.get('/entities', searchReferenceEntities);
router.get('/tech-stack', searchTechStackReference);

export default router;

import { Router } from 'express';
import { getGiphySearch, getUnsplashSearch } from '../controllers/mediaSearch.controller.js';

const router = Router();

router.get('/giphy/search', getGiphySearch);
router.get('/unsplash/search', getUnsplashSearch);

export default router;

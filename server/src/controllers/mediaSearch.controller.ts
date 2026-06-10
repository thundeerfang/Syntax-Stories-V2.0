import type { Request, Response } from 'express';
import { getIpHashFromRequest } from '../lib/clientMeta.js';
import { searchGiphyGifs } from '../services/media/giphySearch.service.js';
import { searchUnsplashPhotos } from '../services/media/unsplashSearch.service.js';

/** GET /api/media/giphy/search?q=&limit=&offset= */
export async function getGiphySearch(req: Request, res: Response): Promise<void> {
  try {
    const result = await searchGiphyGifs({
      query: String(req.query.q ?? ''),
      limit: req.query.limit,
      offset: req.query.offset,
      ipHash: getIpHashFromRequest(req),
    });

    if (!result.ok) {
      res.status(result.status).json({ success: false, message: result.message });
      return;
    }

    res.status(200).json({
      success: true,
      data: result.result.data ?? [],
      pagination: result.result.pagination,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'GIF search failed' });
  }
}

/** GET /api/media/unsplash/search?q=&per_page=&page= */
export async function getUnsplashSearch(req: Request, res: Response): Promise<void> {
  try {
    const result = await searchUnsplashPhotos({
      query: String(req.query.q ?? ''),
      perPage: req.query.per_page ?? req.query.perPage,
      page: req.query.page,
      ipHash: getIpHashFromRequest(req),
    });

    if (!result.ok) {
      res.status(result.status).json({ success: false, message: result.message });
      return;
    }

    res.status(200).json({
      success: true,
      results: result.result.results ?? [],
      total: result.result.total ?? 0,
      total_pages: result.result.total_pages ?? 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Unsplash search failed' });
  }
}

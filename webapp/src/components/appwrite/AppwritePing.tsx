'use client';

import { useEffect, useRef } from 'react';
import { client } from '@/lib/appwrite';

/**
 * On each full load of the app, calls `client.ping()` once to verify reachability
 * of the Appwrite endpoint (same idea as the starter’s “Send a ping” button).
 * In development, success/failure is logged to the browser console.
 */
export function AppwritePing() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    void client
      .ping()
      .then((body) => {
        if (process.env.NODE_ENV === 'development') {
          console.info('[Appwrite] Ping OK:', body);
        }
      })
      .catch((err: unknown) => {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[Appwrite] Ping failed — check endpoint, project ID, and Web platform hostname in Console:', err);
        }
      });
  }, []);

  return null;
}

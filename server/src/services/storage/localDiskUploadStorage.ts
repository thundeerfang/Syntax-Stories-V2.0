import path from 'node:path';
import fs from 'node:fs';
import type { UploadDirectoryLayout, UploadStorage } from './uploadStorage.types.js';

function layoutFromRoot(root: string): UploadDirectoryLayout {
  return {
    root,
    avatars: path.join(root, 'avatars'),
    covers: path.join(root, 'covers'),
    media: path.join(root, 'media'),
    orgLogos: path.join(root, 'org-logos'),
    feedback: path.join(root, 'feedback'),
  };
}

export function createLocalDiskUploadStorage(
  rootDir = path.join(process.cwd(), 'uploads')
): UploadStorage {
  const dirs = layoutFromRoot(rootDir);
  return {
    dirs,
    ensureDirectories(): void {
      Object.values(dirs).forEach((dir) => {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      });
    },
  };
}

let defaultStorage: UploadStorage | null = null;

export function getDefaultUploadStorage(): UploadStorage {
  if (!defaultStorage) {
    defaultStorage = createLocalDiskUploadStorage();
    defaultStorage.ensureDirectories();
  }
  return defaultStorage;
}

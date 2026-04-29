import path from 'node:path';
import fs from 'node:fs';
function layoutFromRoot(root) {
    return {
        root,
        avatars: path.join(root, 'avatars'),
        covers: path.join(root, 'covers'),
        media: path.join(root, 'media'),
        logos: path.join(root, 'logos'),
        schoolLogos: path.join(root, 'school-logos'),
        orgLogos: path.join(root, 'org-logos'),
        feedback: path.join(root, 'feedback'),
    };
}
export function createLocalDiskUploadStorage(rootDir = path.join(process.cwd(), 'uploads')) {
    const dirs = layoutFromRoot(rootDir);
    return {
        dirs,
        ensureDirectories() {
            Object.values(dirs).forEach((dir) => {
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
            });
        },
    };
}
let defaultStorage = null;
export function getDefaultUploadStorage() {
    if (!defaultStorage) {
        defaultStorage = createLocalDiskUploadStorage();
        defaultStorage.ensureDirectories();
    }
    return defaultStorage;
}
//# sourceMappingURL=localDiskUploadStorage.js.map
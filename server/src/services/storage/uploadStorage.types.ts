export interface UploadDirectoryLayout {
  readonly root: string;
  readonly avatars: string;
  readonly covers: string;
  readonly media: string;
  readonly orgLogos: string;
  readonly feedback: string;
}
export interface UploadStorage {
  readonly dirs: UploadDirectoryLayout;
  ensureDirectories(): void;
}

function getApiBase(): string {
  const base =
    typeof window !== 'undefined'
      ? (process.env.NEXT_PUBLIC_API_BASE_URL ?? '')
      : (process.env.NEXT_PUBLIC_API_BASE_URL ?? '');
  return base ? base.replace(/\/$/, '') : '';
}

export interface UploadResponse {
  success: boolean;
  url?: string;
  message?: string;
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function uploadAvatar(
  token: string,
  file: File,
  crop?: CropArea,
  onProgress?: (progress: number) => void
): Promise<UploadResponse> {
  const base = getApiBase();
  const url = base ? `${base}/api/upload/avatar` : '/api/upload/avatar';
  const formData = new FormData();
  formData.append('avatar', file);
  if (crop) {
    formData.append('cropX', String(crop.x));
    formData.append('cropY', String(crop.y));
    formData.append('cropWidth', String(crop.width));
    formData.append('cropHeight', String(crop.height));
  }

  return new Promise<UploadResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(event.loaded / event.total);
      }
    };
    xhr.onreadystatechange = () => {
      if (xhr.readyState !== 4) return;
      let data: UploadResponse = { success: false };
      try {
        data = JSON.parse(xhr.responseText || '{}') as UploadResponse;
      } catch {
        // ignore parse error; handled below
      }
      if (xhr.status >= 200 && xhr.status < 300 && data.success && data.url) {
        resolve(data);
      } else {
        reject(new Error(data.message ?? xhr.statusText ?? 'Upload failed'));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(formData);
  });
}

export async function uploadCover(
  token: string,
  file: File,
  crop?: CropArea,
  onProgress?: (progress: number) => void
): Promise<UploadResponse> {
  const base = getApiBase();
  const url = base ? `${base}/api/upload/cover` : '/api/upload/cover';
  const formData = new FormData();
  formData.append('cover', file);
  if (crop) {
    formData.append('cropX', String(crop.x));
    formData.append('cropY', String(crop.y));
    formData.append('cropWidth', String(crop.width));
    formData.append('cropHeight', String(crop.height));
  }

  return new Promise<UploadResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(event.loaded / event.total);
      }
    };
    xhr.onreadystatechange = () => {
      if (xhr.readyState !== 4) return;
      let data: UploadResponse = { success: false };
      try {
        data = JSON.parse(xhr.responseText || '{}') as UploadResponse;
      } catch {
        // ignore parse error
      }
      if (xhr.status >= 200 && xhr.status < 300 && data.success && data.url) {
        resolve(data);
      } else {
        reject(new Error(data.message ?? xhr.statusText ?? 'Upload failed'));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(formData);
  });
}

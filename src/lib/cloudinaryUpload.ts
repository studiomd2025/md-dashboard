export interface UploadedMediaResult {
  url: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export async function uploadMediaFile(file: File): Promise<UploadedMediaResult> {
  const cloudName =
    (typeof import.meta !== 'undefined' &&
      import.meta.env?.VITE_CLOUDINARY_CLOUD_NAME) ||
    'fk8nmnjl';
  const uploadPreset =
    (typeof import.meta !== 'undefined' &&
      import.meta.env?.VITE_CLOUDINARY_UPLOAD_PRESET) ||
    'wie9lb5k';

  // Primary: Cloudinary persistent CDN so uploaded banners & media work across deployments & restarts
  if (cloudName && uploadPreset) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/auto/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = (await res.json().catch(() => ({}))) as {
        secure_url?: string;
        url?: string;
        bytes?: number;
        error?: { message?: string };
      };

      if (res.ok && (data.secure_url || data.url)) {
        return {
          url: data.secure_url || data.url || '',
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          fileSize: typeof data.bytes === 'number' ? data.bytes : file.size,
        };
      }
      console.warn('Cloudinary upload failed, trying local backend:', data.error?.message || res.status);
    } catch (err) {
      console.warn('Cloudinary upload error, trying local backend:', err);
    }
  }

  // Fallback: local Express upload endpoint
  const res = await fetch(
    `/api/upload-raw?fileName=${encodeURIComponent(
      file.name
    )}&mimeType=${encodeURIComponent(file.type || 'application/octet-stream')}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: file,
    }
  );

  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errBody.error || `Upload failed (${res.status})`);
  }

  return (await res.json()) as UploadedMediaResult;
}

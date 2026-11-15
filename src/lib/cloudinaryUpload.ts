export interface UploadedMediaResult {
  url: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

const DEFAULT_CLOUDINARY_CLOUD_NAME = 'fk8nmnjl';
const DEFAULT_CLOUDINARY_UPLOAD_PRESET = 'wie9lb5k';

export function getCloudinaryConfig(): {
  cloudName: string;
  uploadPreset: string;
} {
  const cloudName =
    (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined)?.trim() ||
    DEFAULT_CLOUDINARY_CLOUD_NAME;
  const uploadPreset =
    (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined)?.trim() ||
    DEFAULT_CLOUDINARY_UPLOAD_PRESET;
  return { cloudName, uploadPreset };
}

export async function uploadMediaFile(file: File): Promise<UploadedMediaResult> {
  const { cloudName, uploadPreset } = getCloudinaryConfig();

  if (cloudName && uploadPreset) {
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

    if (!res.ok || (!data.secure_url && !data.url)) {
      const reason =
        data.error?.message || `Cloudinary upload failed (${res.status})`;
      throw new Error(reason);
    }

    return {
      url: data.secure_url || data.url || '',
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      fileSize: typeof data.bytes === 'number' ? data.bytes : file.size,
    };
  }

  // Local server fallback only if Cloudinary config is explicitly cleared
  const fallbackRes = await fetch(
    `/api/upload-raw?fileName=${encodeURIComponent(
      file.name
    )}&mimeType=${encodeURIComponent(file.type || 'application/octet-stream')}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: file,
    }
  );
  if (!fallbackRes.ok) {
    throw new Error('Failed to upload file.');
  }
  return (await fallbackRes.json()) as UploadedMediaResult;
}

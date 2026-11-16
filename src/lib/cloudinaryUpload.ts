export interface UploadedMediaResult {
  url: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export async function uploadMediaFile(file: File): Promise<UploadedMediaResult> {
  // Use local backend upload as primary storage for 100% reliability with banners & images
  try {
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
    if (res.ok) {
      return (await res.json()) as UploadedMediaResult;
    }
  } catch (err) {
    console.warn('Local upload failed, trying cloud fallback:', err);
  }

  // Fallback to Cloudinary if local backend fails
  const cloudName = 'fk8nmnjl';
  const uploadPreset = 'wie9lb5k';

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
      data.error?.message || `Upload failed (${res.status})`;
    throw new Error(reason);
  }

  return {
    url: data.secure_url || data.url || '',
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    fileSize: typeof data.bytes === 'number' ? data.bytes : file.size,
  };
}

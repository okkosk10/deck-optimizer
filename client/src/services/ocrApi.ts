export interface OcrResult {
  message: string;
  filename: string;
  text: string;
}

export async function uploadAndOcr(file: File): Promise<OcrResult> {
  const formData = new FormData();
  formData.append('image', file);

  const res = await fetch('/api/ocr/upload', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '알 수 없는 오류' }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }

  return res.json();
}

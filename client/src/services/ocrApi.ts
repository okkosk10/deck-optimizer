export interface ParsedCard {
  cardName: string | null;
  cost: string | null;
  attack: string | null;
  defense: string | null;
  description: string | null;
}

export interface OcrResult {
  rawText: string;
  parsed: ParsedCard;
}

interface OcrResponse {
  success: boolean;
  data?: OcrResult;
  error?: string;
}

export async function uploadAndOcr(file: File): Promise<OcrResult> {
  const formData = new FormData();
  formData.append('image', file);

  const res = await fetch('/api/ocr/upload', {
    method: 'POST',
    body: formData,
  });

  const body: OcrResponse = await res.json().catch(() => ({
    success: false,
    error: '응답 파싱 실패',
  }));

  if (!res.ok || !body.success || !body.data) {
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }

  return body.data;
}

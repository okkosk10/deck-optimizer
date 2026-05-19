export interface ParsedCard {
  cardName: string | null;
  cost: string | null;
  attack: string | null;
  defense: string | null;
  description: string | null;
}

export interface DetectedCard extends ParsedCard {
  sources?: string[];
}

export interface OcrResult {
  rawText: string;
  parsed: ParsedCard;
}

export interface BatchOcrResult extends OcrResult {
  index: number;
  fileName: string;
  cards?: DetectedCard[];
  preprocessing?: {
    mode: string;
    region: {
      left: number;
      top: number;
      width: number;
      height: number;
    };
    sourceSize: {
      width: number;
      height: number;
    };
  };
  warnings?: string[];
}

interface OcrResponse {
  success: boolean;
  data?: OcrResult;
  error?: string;
}

interface BatchOcrResponse {
  success: boolean;
  data?: BatchOcrResult[];
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

export async function uploadAndOcrBatch(files: File[]): Promise<BatchOcrResult[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append('images', file));

  const res = await fetch('/api/ocr/batch', {
    method: 'POST',
    body: formData,
  });

  const body: BatchOcrResponse = await res.json().catch(() => ({
    success: false,
    error: '응답 파싱 실패',
  }));

  if (!res.ok || !body.success || !body.data) {
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }

  return body.data;
}

export interface ParsedCard {
  cardName: string | null;
  cost: string | null;
  attack: string | null;
  defense: string | null;
  description: string | null;
}

export interface DetectedCard extends ParsedCard {
  cardId?: string | null;
  character?: string | null;
  type?: string | null;
  tags?: string[];
  effects?: CardEffect[];
  creates?: string[];
  generated?: boolean;
  baseCardId?: string | null;
  transformsTo?: string | null;
  transformTiming?: string | null;
  dbEffectText?: string | null;
  selectedSparkVariant?: {
    id: string;
    name: string;
    cost: number | null;
    type: string | null;
    tags?: string[];
    effectText: string;
    effects?: CardEffect[];
    spark?: boolean;
    baseCardId?: string;
    matchConfidence?: number;
  } | null;
  sparkVariants?: {
    id: string;
    name: string;
    cost: number | null;
    type: string | null;
    tags?: string[];
    effectText: string;
    effects?: CardEffect[];
    spark?: boolean;
    baseCardId?: string;
  }[];
  sources?: string[];
  originalName?: string;
  nameConfidence?: number;
  matchedName?: string | null;
  rawText?: string;
  slot?: {
    row: number;
    column: number;
    region: {
      left: number;
      top: number;
      width: number;
      height: number;
    };
  };
  sourceFile?: string;
}

export interface CardEffect {
  type: string;
  value?: number;
  hits?: number;
  count?: number;
  cardId?: string;
  trigger?: string;
  zone?: string;
  [key: string]: unknown;
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
    slotCount?: number;
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

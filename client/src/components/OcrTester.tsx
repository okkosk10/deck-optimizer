import { useState, useRef } from 'react';
import { uploadAndOcr } from '../services/ocrApi';
import type { OcrResult } from '../services/ocrApi';

export default function OcrTester() {
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<OcrResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    setError(null);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await uploadAndOcr(file);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류 발생');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: '0 16px', fontFamily: 'sans-serif' }}>
      <h1 style={{ marginBottom: 24 }}>OCR 테스트</h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
        />

        {preview && (
          <img
            src={preview}
            alt="미리보기"
            style={{ maxWidth: '100%', maxHeight: 300, objectFit: 'contain', border: '1px solid #ccc', borderRadius: 8 }}
          />
        )}

        <button
          type="submit"
          disabled={loading || !preview}
          style={{
            padding: '10px 20px',
            fontSize: 16,
            cursor: loading || !preview ? 'not-allowed' : 'pointer',
            opacity: loading || !preview ? 0.5 : 1,
          }}
        >
          {loading ? '처리 중...' : 'OCR 실행'}
        </button>
      </form>

      {error && (
        <div style={{ marginTop: 24, padding: 12, background: '#fee2e2', borderRadius: 8, color: '#b91c1c' }}>
          오류: {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 24 }}>
          <h2>추출 결과</h2>

          <h3 style={{ marginBottom: 8 }}>원시 텍스트</h3>
          <pre
            style={{
              background: '#f1f5f9',
              padding: 16,
              borderRadius: 8,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              minHeight: 80,
            }}
          >
            {result.rawText || '(인식된 텍스트 없음)'}
          </pre>

          <h3 style={{ marginTop: 16, marginBottom: 8 }}>파싱된 카드 정보</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <tbody>
              {(
                [
                  ['카드명', result.parsed.cardName],
                  ['코스트', result.parsed.cost],
                  ['공격력', result.parsed.attack],
                  ['방어력', result.parsed.defense],
                  ['설명', result.parsed.description],
                ] as [string, string | null][]
              ).map(([label, value]) => (
                <tr key={label} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 600, width: 80, color: '#475569' }}>{label}</td>
                  <td style={{ padding: '8px 12px', color: value ? '#0f172a' : '#94a3b8' }}>
                    {value ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

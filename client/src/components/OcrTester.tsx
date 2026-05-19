import { useEffect, useMemo, useRef, useState } from 'react';
import { uploadAndOcrBatch } from '../services/ocrApi';
import type { BatchOcrResult, DetectedCard } from '../services/ocrApi';

interface PreviewFile {
  file: File;
  url: string;
}

const emptyText = '-';

function collectDetectedCards(results: BatchOcrResult[]) {
  const cards: DetectedCard[] = [];

  for (const result of results) {
    for (const card of result.cards ?? []) {
      if (!card.cardName) continue;

      cards.push({
        ...card,
        sourceFile: result.fileName,
      });
    }
  }

  return cards;
}

export default function OcrTester() {
  const [previews, setPreviews] = useState<PreviewFile[]>([]);
  const [results, setResults] = useState<BatchOcrResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const mergedCards = useMemo(() => collectDetectedCards(results), [results]);

  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [previews]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);

    previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    setResults([]);
    setError(null);
    setPreviews(files.map((file) => ({ file, url: URL.createObjectURL(file) })));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (previews.length === 0) return;

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const data = await uploadAndOcrBatch(previews.map((preview) => preview.file));
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 1040, margin: '40px auto', padding: '0 16px', fontFamily: 'sans-serif' }}>
      <h1 style={{ marginBottom: 8 }}>OCR 테스트</h1>
      <p style={{ marginBottom: 24, color: '#64748b' }}>
        여러 장의 스크린샷에서 오른쪽 카드 목록 영역만 잘라 OCR 결과를 확인합니다.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFileChange}
        />

        {previews.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
            }}
          >
            {previews.map((preview, index) => (
              <figure key={`${preview.file.name}-${index}`} style={{ margin: 0 }}>
                <img
                  src={preview.url}
                  alt={`${preview.file.name} 미리보기`}
                  style={{
                    width: '100%',
                    height: 160,
                    objectFit: 'contain',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    background: '#f8fafc',
                  }}
                />
                <figcaption style={{ marginTop: 6, fontSize: 13, color: '#475569' }}>
                  {index + 1}. {preview.file.name}
                </figcaption>
              </figure>
            ))}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || previews.length === 0}
          style={{
            alignSelf: 'flex-start',
            padding: '10px 20px',
            fontSize: 16,
            cursor: loading || previews.length === 0 ? 'not-allowed' : 'pointer',
            opacity: loading || previews.length === 0 ? 0.5 : 1,
          }}
        >
          {loading ? '처리 중...' : `${previews.length || 0}장 OCR 실행`}
        </button>
      </form>

      {error && (
        <div style={{ marginTop: 24, padding: 12, background: '#fee2e2', borderRadius: 8, color: '#b91c1c' }}>
          오류: {error}
        </div>
      )}

      {results.length > 0 && (
        <section style={{ marginTop: 32, textAlign: 'left' }}>
          <h2>추출 결과</h2>

          <section style={{ marginBottom: 24, border: '1px solid #cbd5e1', borderRadius: 8, padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>통합 카드 후보</h3>
            {mergedCards.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', width: 56 }}>#</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', width: 96 }}>코스트</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', width: 180 }}>카드명</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', width: 120 }}>신뢰도</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', width: 160 }}>출처</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>설명 후보</th>
                  </tr>
                </thead>
                <tbody>
                  {mergedCards.map((card, cardIndex) => (
                    <tr key={`${card.cardName}-${cardIndex}`} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px 12px', color: '#64748b' }}>{cardIndex + 1}</td>
                      <td style={{ padding: '8px 12px' }}>{card.cost ?? emptyText}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>
                        {card.cardName ?? emptyText}
                        {card.originalName && card.originalName !== card.cardName ? (
                          <span style={{ display: 'block', color: '#94a3b8', fontWeight: 400, fontSize: 12 }}>
                            원문: {card.originalName}
                          </span>
                        ) : null}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        {typeof card.nameConfidence === 'number' ? Math.round(card.nameConfidence * 100) : emptyText}
                      </td>
                      <td style={{ padding: '8px 12px', color: '#64748b' }}>{card.sourceFile ?? emptyText}</td>
                      <td style={{ padding: '8px 12px', color: card.description ? '#334155' : '#94a3b8' }}>
                        {card.description ?? emptyText}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: '#94a3b8' }}>통합된 카드 후보가 없습니다.</p>
            )}
          </section>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {results.map((result) => (
              <article
                key={`${result.fileName}-${result.index}`}
                style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}
              >
                <h3 style={{ marginTop: 0 }}>
                  {result.index + 1}. {result.fileName}
                </h3>

                {result.preprocessing && (
                  <p style={{ marginTop: 0, color: '#64748b', fontSize: 13 }}>
                    crop: x {result.preprocessing.region.left}, y {result.preprocessing.region.top}, w{' '}
                    {result.preprocessing.region.width}, h {result.preprocessing.region.height}
                    {result.preprocessing.slotCount ? `, slots ${result.preprocessing.slotCount}` : ''}
                  </p>
                )}

                {result.warnings && result.warnings.length > 0 && (
                  <div style={{ marginBottom: 16, padding: 12, background: '#fef3c7', borderRadius: 8, color: '#92400e' }}>
                    {result.warnings.join(' ')}
                  </div>
                )}

                <h4 style={{ marginBottom: 8 }}>카드 후보</h4>
                {result.cards && result.cards.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left', width: 56 }}>#</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', width: 96 }}>코스트</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', width: 180 }}>카드명</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', width: 120 }}>신뢰도</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>설명 후보</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.cards.map((card, cardIndex) => (
                        <tr key={`${card.cardName}-${cardIndex}`} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '8px 12px', color: '#64748b' }}>{cardIndex + 1}</td>
                          <td style={{ padding: '8px 12px' }}>{card.cost ?? emptyText}</td>
                          <td style={{ padding: '8px 12px', fontWeight: 600 }}>
                            {card.cardName ?? emptyText}
                            {card.originalName && card.originalName !== card.cardName ? (
                              <span style={{ display: 'block', color: '#94a3b8', fontWeight: 400, fontSize: 12 }}>
                                원문: {card.originalName}
                              </span>
                            ) : null}
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            {typeof card.nameConfidence === 'number' ? Math.round(card.nameConfidence * 100) : emptyText}
                          </td>
                          <td style={{ padding: '8px 12px', color: card.description ? '#334155' : '#94a3b8' }}>
                            {card.description ?? emptyText}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ color: '#94a3b8' }}>감지된 카드 후보가 없습니다.</p>
                )}

                <h4 style={{ marginBottom: 8 }}>카드 영역 OCR 텍스트</h4>
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
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

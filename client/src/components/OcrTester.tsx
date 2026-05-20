import { useEffect, useMemo, useRef, useState } from 'react';
import { uploadAndOcrBatch } from '../services/ocrApi';
import type { BatchOcrResult, DetectedCard } from '../services/ocrApi';

interface PreviewFile {
  file: File;
  url: string;
}

const emptyText = '-';

function collectDetectedCards(results: BatchOcrResult[]) {
  const stitchedCards: DetectedCard[] = [];
  const orderedResults = [...results].sort((a, b) => getFirstCardTop(a) - getFirstCardTop(b));

  for (const result of orderedResults) {
    const imageCards = (result.cards ?? [])
      .filter((card) => card.cardName)
      .map((card) => ({
        ...card,
        sourceFile: result.fileName,
      }));

    const overlap = findSequenceOverlap(stitchedCards, imageCards);
    stitchedCards.push(...imageCards.slice(overlap));
  }

  return stitchedCards;
}

function getFirstCardTop(result: BatchOcrResult) {
  const tops = (result.cards ?? [])
    .map((card) => card.slot?.region.top)
    .filter((top): top is number => typeof top === 'number');

  return tops.length > 0 ? Math.min(...tops) : Number.MAX_SAFE_INTEGER;
}

function getCardKey(card: DetectedCard) {
  return card.cardId ?? `${card.cost ?? ''}:${card.cardName ?? ''}`;
}

function findSequenceOverlap(left: DetectedCard[], right: DetectedCard[]) {
  const maxOverlap = Math.min(left.length, right.length);

  for (let size = maxOverlap; size > 0; size -= 1) {
    const leftSuffix = left.slice(left.length - size).map(getCardKey);
    const rightPrefix = right.slice(0, size).map(getCardKey);

    if (leftSuffix.every((key, index) => key === rightPrefix[index])) {
      return size;
    }
  }

  return 0;
}

function summarizeDeck(cards: DetectedCard[]) {
  const totalCards = cards.length;
  const totalCost = cards.reduce((sum, card) => sum + Number(card.cost ?? 0), 0);
  const tagCounts = countValues(cards.flatMap((card) => card.tags ?? []));
  const typeCounts = countValues(cards.map((card) => card.type).filter(Boolean) as string[]);
  const deckList = Array.from(
    cards.reduce((counts, card) => {
      const key = card.cardId ?? `${card.cost ?? ''}:${card.cardName ?? ''}`;
      const current = counts.get(key);

      counts.set(key, {
        card,
        count: (current?.count ?? 0) + 1,
      });

      return counts;
    }, new Map<string, { card: DetectedCard; count: number }>())
  ).map(([cardId, value]) => ({
    cardId,
    count: value.count,
    name: value.card.cardName ?? cardId,
    cost: value.card.cost ?? null,
  }));
  const effectSummary = cards.reduce(
    (summary, card) => {
      for (const effect of card.effects ?? []) {
        if (effect.type === 'damage') {
          summary.directDamage += (effect.value ?? 0) * (effect.hits ?? 1);
        }

        if (effect.type === 'draw') {
          summary.draw += effect.count ?? 0;
        }

        if (effect.type === 'create_card' && effect.cardId) {
          summary.createdCards[effect.cardId] = (summary.createdCards[effect.cardId] ?? 0) + (effect.count ?? 1);
        }

        if (effect.type === 'damage_bonus' || effect.type === 'damage_bonus_per_card') {
          summary.damageBonusRules += 1;
        }
      }

      return summary;
    },
    {
      directDamage: 0,
      draw: 0,
      createdCards: {} as Record<string, number>,
      damageBonusRules: 0,
    }
  );

  return {
    deckList,
    totalCards,
    totalCost,
    averageCost: totalCards > 0 ? (totalCost / totalCards).toFixed(2) : '0',
    tagCounts,
    typeCounts,
    effectSummary,
    sparkVariantOptions: cards.reduce((sum, card) => sum + (card.sparkVariants?.length ?? 0), 0),
  };
}

function countValues(values: string[]) {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function formatCounts(counts: Record<string, number>) {
  const entries = Object.entries(counts);

  return entries.length > 0 ? entries.map(([key, count]) => `${key} ${count}`).join(', ') : emptyText;
}

function getDisplayEffectText(card: DetectedCard) {
  return card.selectedSparkVariant?.effectText ?? card.dbEffectText ?? card.description ?? emptyText;
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, background: '#f8fafc' }}>
      <div style={{ color: '#64748b', fontSize: 12, marginBottom: 4 }}>{label}</div>
      <div style={{ color: '#0f172a', fontWeight: 700, wordBreak: 'break-word' }}>{value || emptyText}</div>
    </div>
  );
}

export default function OcrTester() {
  const [previews, setPreviews] = useState<PreviewFile[]>([]);
  const [results, setResults] = useState<BatchOcrResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const mergedCards = useMemo(() => collectDetectedCards(results), [results]);
  const deckSummary = useMemo(() => summarizeDeck(mergedCards), [mergedCards]);

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
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <SummaryItem label="카드 수" value={`${deckSummary.totalCards}`} />
                  <SummaryItem label="총 비용" value={`${deckSummary.totalCost}`} />
                  <SummaryItem label="평균 비용" value={deckSummary.averageCost} />
                  <SummaryItem label="분류" value={formatCounts(deckSummary.typeCounts)} />
                  <SummaryItem label="태그" value={formatCounts(deckSummary.tagCounts)} />
                  <SummaryItem
                    label="생성"
                    value={formatCounts(deckSummary.effectSummary.createdCards).replace(
                      'haidemary-polar-sword',
                      '극광검'
                    )}
                  />
                  <SummaryItem label="드로우" value={`${deckSummary.effectSummary.draw}`} />
                  <SummaryItem label="번뜩임 후보" value={`${deckSummary.sparkVariantOptions}`} />
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', width: 56 }}>#</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', width: 96 }}>코스트</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', width: 180 }}>카드명</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', width: 120 }}>분류</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', width: 96 }}>신뢰도</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', width: 150 }}>출처</th>
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
                        <td style={{ padding: '8px 12px', color: '#475569' }}>
                          {card.type ?? emptyText}
                          {card.tags && card.tags.length > 0 ? (
                            <span style={{ display: 'block', color: '#94a3b8', fontSize: 12 }}>
                              {card.tags.join(', ')}
                            </span>
                          ) : null}
                          {card.sparkVariants && card.sparkVariants.length > 0 ? (
                            <span style={{ display: 'block', color: '#2563eb', fontSize: 12 }}>
                              번뜩임 {card.sparkVariants.length}
                            </span>
                          ) : null}
                          {card.selectedSparkVariant ? (
                            <span style={{ display: 'block', color: '#16a34a', fontSize: 12 }}>
                              선택됨 {Math.round((card.selectedSparkVariant.matchConfidence ?? 0) * 100)}
                            </span>
                          ) : null}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          {typeof card.nameConfidence === 'number' ? Math.round(card.nameConfidence * 100) : emptyText}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#64748b' }}>{card.sourceFile ?? emptyText}</td>
                        <td style={{ padding: '8px 12px', color: card.description ? '#334155' : '#94a3b8' }}>
                          {getDisplayEffectText(card)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
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
                        <th style={{ padding: '8px 12px', textAlign: 'left', width: 120 }}>분류</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', width: 96 }}>신뢰도</th>
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
                          <td style={{ padding: '8px 12px', color: '#475569' }}>
                            {card.type ?? emptyText}
                            {card.tags && card.tags.length > 0 ? (
                              <span style={{ display: 'block', color: '#94a3b8', fontSize: 12 }}>
                                {card.tags.join(', ')}
                              </span>
                            ) : null}
                            {card.sparkVariants && card.sparkVariants.length > 0 ? (
                              <span style={{ display: 'block', color: '#2563eb', fontSize: 12 }}>
                                번뜩임 {card.sparkVariants.length}
                              </span>
                            ) : null}
                            {card.selectedSparkVariant ? (
                              <span style={{ display: 'block', color: '#16a34a', fontSize: 12 }}>
                                선택됨 {Math.round((card.selectedSparkVariant.matchConfidence ?? 0) * 100)}
                              </span>
                            ) : null}
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            {typeof card.nameConfidence === 'number' ? Math.round(card.nameConfidence * 100) : emptyText}
                          </td>
                          <td style={{ padding: '8px 12px', color: card.description ? '#334155' : '#94a3b8' }}>
                            {getDisplayEffectText(card)}
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

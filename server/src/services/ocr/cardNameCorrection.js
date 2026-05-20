'use strict';

const path = require('path');
const cards = require(path.join(__dirname, '..', '..', '..', 'data', 'cards.json'));

function normalizeName(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/["""':：※₩\\]/g, '')
    .replace(/[^\p{Script=Hangul}a-z0-9]/gu, '')
    .replace(/몸/g, '응')
    .replace(/축/g, '응축')
    .trim();
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;

    for (let j = 1; j <= b.length; j += 1) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + substitutionCost
      );
    }

    for (let j = 0; j <= b.length; j += 1) {
      previous[j] = current[j];
    }
  }

  return previous[b.length];
}

function similarity(a, b) {
  const left = normalizeName(a);
  const right = normalizeName(b);
  const maxLength = Math.max(left.length, right.length);

  if (maxLength === 0) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) {
    return Math.min(0.94, Math.min(left.length, right.length) / maxLength + 0.18);
  }

  return 1 - levenshtein(left, right) / maxLength;
}

function normalizeEffectText(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/한식|만식|인식/g, '안식')
    .replace(/극강/g, '극광')
    .replace(/광장/g, '극광검')
    .replace(/섬섬|생삼/g, '생성')
    .replace(/1틴간/g, '1턴간')
    .replace(/[^\p{Script=Hangul}a-z0-9%+]/gu, '');
}

function getBigrams(value) {
  const text = normalizeEffectText(value);
  if (text.length <= 1) return text ? [text] : [];

  return Array.from({ length: text.length - 1 }, (_, index) => text.slice(index, index + 2));
}

function diceSimilarity(leftValue, rightValue) {
  const left = getBigrams(leftValue);
  const right = getBigrams(rightValue);

  if (left.length === 0 || right.length === 0) return 0;

  const counts = new Map();
  for (const item of left) counts.set(item, (counts.get(item) ?? 0) + 1);

  let overlap = 0;
  for (const item of right) {
    const count = counts.get(item) ?? 0;
    if (count === 0) continue;

    counts.set(item, count - 1);
    overlap += 1;
  }

  return (2 * overlap) / (left.length + right.length);
}

function effectSimilarity(sourceText, effectText) {
  const source = normalizeEffectText(sourceText);
  const effect = normalizeEffectText(effectText);
  if (!source || !effect) return 0;

  const containment = source.includes(effect) || effect.includes(source)
    ? Math.min(source.length, effect.length) / Math.max(source.length, effect.length)
    : 0;

  return Math.max(diceSimilarity(source, effect), containment);
}

/**
 * 전체 영역 OCR 텍스트를 슬라이딩 윈도우로 탐색해 effectText와 가장 잘 일치하는 구간의 점수를 반환한다.
 * 슬롯 크롭 OCR에 효과 텍스트가 누락된 경우 전체 영역에서 보완 매칭하기 위해 사용한다.
 */
function findBestWindowScore(regionRawText, effectText, windowSize) {
  const size = windowSize ?? 8;
  const lines = regionRawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let best = 0;

  for (let i = 0; i < lines.length; i++) {
    const window = lines.slice(i, i + size).join(' ');
    const score = effectSimilarity(window, effectText);
    if (score > best) best = score;
  }

  return best;
}

/**
 * 슬롯 OCR이 충분하지 않을 때 전체 영역 텍스트를 fallback으로 번뜩임 변형을 선택한다.
 * 슬롯 OCR보다 넓은 범위를 보기 때문에 오탐 방지를 위해 threshold를 더 높게 설정한다.
 */
function selectSparkVariantFromRegion(regionRawText, matchedCard) {
  const sparkVariants = matchedCard?.sparkVariants ?? [];
  if (sparkVariants.length === 0 || !regionRawText) return null;

  const baseScore = findBestWindowScore(regionRawText, matchedCard.effectText);
  let best = null;

  for (const variant of sparkVariants) {
    const score = findBestWindowScore(regionRawText, variant.effectText);

    if (!best || score > best.matchConfidence) {
      best = { ...variant, matchConfidence: Number(score.toFixed(3)) };
    }
  }

  if (!best || best.matchConfidence < 0.35) return null;
  if (best.matchConfidence + 0.02 < baseScore) return null;

  return best;
}

function selectSparkVariant(inputCard, matchedCard) {
  const sparkVariants = matchedCard?.sparkVariants ?? [];
  if (sparkVariants.length === 0) return null;

  const sourceText = [inputCard.description, inputCard.rawText].filter(Boolean).join(' ');
  if (!sourceText) return null;

  const baseScore = effectSimilarity(sourceText, matchedCard.effectText);
  let best = null;

  for (const variant of sparkVariants) {
    const score = effectSimilarity(sourceText, variant.effectText);

    if (!best || score > best.matchConfidence) {
      best = {
        ...variant,
        matchConfidence: Number(score.toFixed(3)),
      };
    }
  }

  if (!best || best.matchConfidence < 0.22) return null;
  if (best.matchConfidence + 0.02 < baseScore) return null;

  return best;
}

function scoreCard(rawName, card) {
  const candidates = [card.name, ...(card.aliases ?? [])];
  let best = { score: 0, matchedText: card.name };

  for (const candidate of candidates) {
    const score = similarity(rawName, candidate);
    if (score > best.score) {
      best = { score, matchedText: candidate };
    }
  }

  return best;
}

function correctCardName(rawName) {
  let best = null;

  for (const card of cards) {
    const scored = scoreCard(rawName, card);

    if (!best || scored.score > best.confidence) {
      best = {
        originalName: rawName,
        card,
        cardId: card.id,
        cardName: card.name,
        confidence: Number(scored.score.toFixed(3)),
        matchedText: scored.matchedText,
      };
    }
  }

  if (!best || best.confidence < 0.64) {
    return {
      originalName: rawName,
      card: null,
      cardId: null,
      cardName: rawName,
      confidence: 0,
      matchedText: null,
    };
  }

  return best;
}

function correctCards(inputCards, options = {}) {
  const minConfidence = options.minConfidence ?? 0.68;
  const regionRawText = options.regionRawText ?? null;

  return inputCards
    .map((card) => {
      const correction = correctCardName(card.cardName);
      const matchedCard = correction.card;
      let selectedSparkVariant = selectSparkVariant(card, matchedCard);

      // 슬롯 OCR이 충분하지 않아 번뜩임 선택에 실패한 경우, 전체 영역 OCR을 fallback으로 사용
      if (!selectedSparkVariant && matchedCard?.sparkVariants?.length > 0 && regionRawText) {
        selectedSparkVariant = selectSparkVariantFromRegion(regionRawText, matchedCard);
      }

      const effectCard = selectedSparkVariant ?? matchedCard;

      return {
        ...card,
        cardId: selectedSparkVariant?.id ?? correction.cardId,
        baseCardId: selectedSparkVariant?.baseCardId ?? null,
        originalName: card.cardName,
        cardName: correction.cardName,
        nameConfidence: correction.confidence,
        matchedName: correction.matchedText,
        cost: card.cost ?? (effectCard?.cost == null ? null : String(effectCard.cost)),
        type: effectCard?.type ?? null,
        tags: effectCard?.tags ?? [],
        dbEffectText: effectCard?.effectText ?? null,
        effects: effectCard?.effects ?? [],
        creates: effectCard?.creates ?? [],
        generated: effectCard?.generated ?? false,
        transformsTo: effectCard?.transformsTo ?? null,
        transformTiming: effectCard?.transformTiming ?? null,
        selectedSparkVariant,
        sparkVariants: matchedCard?.sparkVariants ?? [],
        character: matchedCard?.character ?? null,
      };
    })
    .filter((card) => card.nameConfidence >= minConfidence);
}

module.exports = { cards, correctCardName, correctCards, normalizeName };


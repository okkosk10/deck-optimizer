'use strict';

const path = require('path');
const cards = require(path.join(__dirname, '..', '..', '..', 'data', 'cards.json'));

function normalizeName(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[“”"':：※₩\\]/g, '')
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

  return inputCards
    .map((card) => {
      const correction = correctCardName(card.cardName);
      const matchedCard = correction.card;

      return {
        ...card,
        cardId: correction.cardId,
        originalName: card.cardName,
        cardName: correction.cardName,
        nameConfidence: correction.confidence,
        matchedName: correction.matchedText,
        cost: card.cost ?? (matchedCard?.cost == null ? null : String(matchedCard.cost)),
        type: matchedCard?.type ?? null,
        tags: matchedCard?.tags ?? [],
        dbEffectText: matchedCard?.effectText ?? null,
        sparkVariants: matchedCard?.sparkVariants ?? [],
        character: matchedCard?.character ?? null,
      };
    })
    .filter((card) => card.nameConfidence >= minConfidence);
}

module.exports = { cards, correctCardName, correctCards, normalizeName };

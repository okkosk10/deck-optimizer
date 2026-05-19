'use strict';

const CARD_DICTIONARY = [
  {
    name: '검의 비',
    aliases: ['검의비', '극광검 1장 섬섬', '음극광검 1장 섬섬', ': 극광검 1장 섬섬'],
  },
  {
    name: '만인의 영웅',
    aliases: ['만인의영웅'],
  },
  {
    name: '한줄기 빛',
    aliases: ['한줄기빛'],
  },
  {
    name: '극 전개',
    aliases: ['극전개'],
  },
  {
    name: '극광 전개',
    aliases: ['극광전개', '극광 전', '"극광 전', '극광 전개 스킬'],
  },
  {
    name: '극광 응축',
    aliases: ['극광응축', '극광 축', '극광 몸', '극광 몸축', '극광옴축'],
  },
  {
    name: '칠흑의 페르소나',
    aliases: ['칠흑의페르소나'],
  },
  {
    name: '어둠의 각인',
    aliases: ['어둠의각인', '어둠의 각인 수만큼', '둠의 각인', '둠의 각인 4'],
  },
  {
    name: '극강의 빛',
    aliases: ['극강의빛', '극강의 빛 1'],
  },
];

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

function scoreEntry(rawName, entry) {
  const candidates = [entry.name, ...(entry.aliases ?? [])];
  let best = { score: 0, matchedText: entry.name };

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

  for (const entry of CARD_DICTIONARY) {
    const scored = scoreEntry(rawName, entry);

    if (!best || scored.score > best.confidence) {
      best = {
        originalName: rawName,
        cardName: entry.name,
        confidence: Number(scored.score.toFixed(3)),
        matchedText: scored.matchedText,
      };
    }
  }

  if (!best || best.confidence < 0.64) {
    return {
      originalName: rawName,
      cardName: rawName,
      confidence: 0,
      matchedText: null,
    };
  }

  return best;
}

function correctCards(cards, options = {}) {
  const minConfidence = options.minConfidence ?? 0.68;

  return cards
    .map((card) => {
      const correction = correctCardName(card.cardName);
      return {
        ...card,
        originalName: card.cardName,
        cardName: correction.cardName,
        nameConfidence: correction.confidence,
        matchedName: correction.matchedText,
      };
    })
    .filter((card) => card.nameConfidence >= minConfidence);
}

module.exports = { CARD_DICTIONARY, correctCardName, correctCards, normalizeName };

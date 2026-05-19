'use strict';

const NOISE_PATTERNS = [
  /^상세 정보$/,
  /^능력치$/,
  /^카드$/,
  /^파트너$/,
  /세이브 데이터/,
  /저장 날짜/,
  /카드 수/,
  /흐릿한 기억/,
  /^복제$/,
  /^제거$/,
  /^잠재력$/,
  /데이터 편집/,
  /즐겨찾기/,
  /^교체$/,
  /도움말/,
  /^\d+\s*TB$/i,
  /^\d{2}\.\d{2}\.\d{2}$/,
];

const EFFECT_HINTS = [
  '[',
  ']',
  '피해',
  '카드',
  '핸드',
  '무덤',
  '동안',
  '드로우',
  '스킬',
  '연결',
  '안식',
  '복제',
  '회수',
  '이동',
  '버린',
  '뽑을',
  '자신',
  '무작위',
  '+',
  '%',
  'x',
];

function normalizeLine(line) {
  return line.replace(/\s+/g, ' ').replace(/[|｜]/g, '1').trim();
}

function normalizeCost(value) {
  return value.replace(/[Oo○ㅇ]/g, '0').replace(/[Il|｜]/g, '1');
}

function isNoise(line) {
  return NOISE_PATTERNS.some((pattern) => pattern.test(line));
}

function isEffectLine(line) {
  return EFFECT_HINTS.some((hint) => line.includes(hint));
}

function isPotentialName(line) {
  if (!line || isNoise(line) || isEffectLine(line)) return false;
  if (line.length < 2 || line.length > 24) return false;
  if (/^[\d\s/%.+#:()]+$/.test(line)) return false;
  if (/^(공격|방어|스킬|생심|섬섬|저장|복제|제거)$/.test(line)) return false;

  return /[가-힣A-Za-z]/.test(line);
}

function parseCostAndName(line) {
  const match = line.match(/^([0-9Oo○ㅇIl|｜])\s+(.+)$/);
  if (!match) return null;

  const cost = normalizeCost(match[1]);
  const name = normalizeLine(match[2]);

  if (!/^\d+$/.test(cost) || !isPotentialName(name)) return null;

  return { cost, name };
}

function mergeCards(cards) {
  const byKey = new Map();

  for (const card of cards) {
    const key = `${card.cost ?? ''}:${card.cardName.replace(/\s/g, '')}`;
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, card);
      continue;
    }

    if ((card.description ?? '').length > (existing.description ?? '').length) {
      existing.description = card.description;
    }

    existing.sources.push(...card.sources);
  }

  return Array.from(byKey.values()).map((card) => ({
    ...card,
    sources: Array.from(new Set(card.sources)),
  }));
}

function parseDeckText(rawText) {
  const lines = rawText
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter(Boolean)
    .filter((line) => !isNoise(line));

  const cards = [];
  let current = null;

  for (const [lineIndex, line] of lines.entries()) {
    const costAndName = parseCostAndName(line);
    const startsCard = costAndName || isPotentialName(line);

    if (startsCard) {
      if (current) cards.push(current);

      current = {
        cardName: costAndName ? costAndName.name : line,
        cost: costAndName ? costAndName.cost : null,
        attack: null,
        defense: null,
        description: null,
        sources: [`line:${lineIndex + 1}`],
      };
      continue;
    }

    if (!current) continue;

    const description = current.description ? `${current.description} ${line}` : line;
    current.description = description.trim();
  }

  if (current) cards.push(current);

  return mergeCards(cards).slice(0, 20);
}

module.exports = { parseDeckText };

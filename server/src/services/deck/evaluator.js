'use strict';

const { cards: cardDatabase } = require('../ocr/cardNameCorrection');

const cardsById = new Map(cardDatabase.map((card) => [card.id, card]));

function getCardId(cardOrId) {
  if (typeof cardOrId === 'string') return cardOrId;
  return cardOrId?.cardId ?? cardOrId?.id ?? null;
}

function toDeckList(cards) {
  const counts = new Map();

  for (const card of cards ?? []) {
    const cardId = getCardId(card);
    if (!cardId) continue;

    counts.set(cardId, (counts.get(cardId) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([cardId, count]) => {
    const definition = cardsById.get(cardId);

    return {
      cardId,
      count,
      name: definition?.name ?? cardId,
      cost: definition?.cost ?? null,
      type: definition?.type ?? null,
      tags: definition?.tags ?? [],
    };
  });
}

function countBy(values) {
  return values.reduce((result, value) => {
    if (!value) return result;
    result[value] = (result[value] ?? 0) + 1;
    return result;
  }, {});
}

function getRepeatedValues(values) {
  const counts = countBy(values);

  return Object.entries(counts)
    .filter(([, count]) => count > 1)
    .map(([value, count]) => ({ value, count }));
}

function expandDeckCards(deckList) {
  return deckList.flatMap((entry) => {
    const definition = cardsById.get(entry.cardId);
    if (!definition) return [];

    return Array.from({ length: entry.count }, () => definition);
  });
}

function summarizeEffects(cards) {
  const summary = {
    directDamage: 0,
    draw: 0,
    createdCards: {},
    damageBonusRules: 0,
    transformRules: 0,
    graveTriggers: 0,
  };

  for (const card of cards) {
    for (const effect of card.effects ?? []) {
      if (effect.type === 'damage') {
        summary.directDamage += (effect.value ?? 0) * (effect.hits ?? 1);
      }

      if (effect.type === 'draw') {
        summary.draw += effect.count ?? 0;
      }

      if (effect.type === 'create_card') {
        summary.createdCards[effect.cardId] = (summary.createdCards[effect.cardId] ?? 0) + (effect.count ?? 1);
      }

      if (effect.type === 'damage_bonus' || effect.type === 'damage_bonus_per_card') {
        summary.damageBonusRules += 1;
      }

      if (effect.type === 'transform_card') {
        summary.transformRules += 1;
      }

      if (effect.trigger === 'moved_to_grave') {
        summary.graveTriggers += 1;
      }
    }
  }

  return summary;
}

function evaluateDeck(cardsOrIds) {
  const deckList = toDeckList(cardsOrIds);
  const cards = expandDeckCards(deckList);
  const totalCards = cards.length;
  const totalCost = cards.reduce((sum, card) => sum + (card.cost ?? 0), 0);
  const tags = cards.flatMap((card) => card.tags ?? []);
  const uniqueCards = cards.filter((card) => card.tags?.includes('유일'));
  const duplicateUniqueCards = getRepeatedValues(uniqueCards.map((card) => card.id));
  const effectSummary = summarizeEffects(cards);

  return {
    deckList,
    metrics: {
      totalCards,
      totalCost,
      averageCost: totalCards > 0 ? Number((totalCost / totalCards).toFixed(2)) : 0,
      typeCounts: countBy(cards.map((card) => card.type)),
      tagCounts: countBy(tags),
      connectCards: tags.filter((tag) => tag === '연결').length,
      restCards: tags.filter((tag) => tag === '안식').length,
      uniqueCards: uniqueCards.length,
      duplicateUniqueCards,
      sparkVariantOptions: cards.reduce((sum, card) => sum + (card.sparkVariants?.length ?? 0), 0),
      generatedCardEntries: cards.filter((card) => card.generated).length,
    },
    effectSummary,
    notes: buildNotes(cards, effectSummary, duplicateUniqueCards),
  };
}

function buildNotes(cards, effectSummary, duplicateUniqueCards) {
  const notes = [];
  const hasPolarRelease = cards.some((card) => card.id === 'haidemary-polar-release');
  const hasPolarCondense = cards.some((card) => card.id === 'haidemary-polar-light-condense');
  const polarSwordCreated = effectSummary.createdCards['haidemary-polar-sword'] ?? 0;

  if (polarSwordCreated > 0) {
    notes.push(`극광검 예상 생성량 ${polarSwordCreated}장`);
  }

  if (hasPolarCondense && !hasPolarRelease) {
    notes.push('극광 응축이 있으므로 무덤 이동 시 극광 해방 접근 가능');
  }

  if (hasPolarRelease) {
    notes.push('극광 해방이 포함되어 무덤의 극광검 수를 피해량으로 전환 가능');
  }

  if (duplicateUniqueCards.length > 0) {
    notes.push('유일 카드 중복 후보가 있어 실제 보유/선택 규칙 확인 필요');
  }

  return notes;
}

module.exports = { evaluateDeck, toDeckList };

'use strict';

/**
 * OCR 원시 텍스트를 카드 정보 구조체로 파싱한다.
 *
 * 반환 형태:
 * {
 *   cardName: string | null,
 *   cost: string | null,
 *   attack: string | null,
 *   defense: string | null,
 *   description: string | null,
 * }
 *
 * @param {string} rawText - Vision API 가 반환한 전체 텍스트
 * @returns {object} 파싱된 카드 정보
 */
function parseCardText(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return {
      cardName: null,
      cost: null,
      attack: null,
      defense: null,
      description: null,
    };
  }

  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  // 카드명: 첫 번째 비어있지 않은 줄
  const cardName = lines[0] || null;

  // 코스트: "코스트", "Cost", "MP" 뒤에 오는 숫자
  const costMatch = rawText.match(/(?:코스트|cost|mp)[^\d]*(\d+)/i);
  const cost = costMatch ? costMatch[1] : null;

  // 공격력: "공격", "ATK", "Attack" 뒤에 오는 숫자
  const attackMatch = rawText.match(/(?:공격력?|atk|attack)[^\d]*(\d+)/i);
  const attack = attackMatch ? attackMatch[1] : null;

  // 방어력: "방어", "DEF", "Defense" 뒤에 오는 숫자
  const defenseMatch = rawText.match(/(?:방어력?|def|defense)[^\d]*(\d+)/i);
  const defense = defenseMatch ? defenseMatch[1] : null;

  // 설명: 첫 줄(카드명)을 제외한 나머지 텍스트를 이어붙인다
  const description = lines.slice(1).join(' ').trim() || null;

  return { cardName, cost, attack, defense, description };
}

module.exports = { parseCardText };

/**
 * 가격 포맷팅 유틸리티 (클라이언트/서버 공용)
 */

/**
 * 숫자를 억/만원 형식으로 포맷팅
 * @param won 원 단위 가격
 * @returns "3억 2,500만원" 형식의 문자열
 */
export function formatPrice(won: number): string {
  const eok = Math.floor(won / 100000000);
  const man = Math.floor((won % 100000000) / 10000);

  if (eok > 0 && man > 0) {
    return `${eok}억 ${man.toLocaleString()}만원`;
  }
  if (eok > 0) {
    return `${eok}억원`;
  }
  return `${man.toLocaleString()}만원`;
}

/**
 * 만원 단위를 원 단위로 변환 후 포맷팅
 * @param manwon 만원 단위 가격
 * @returns "3억 2,500만원" 형식의 문자열
 */
export function formatPriceFromManwon(manwon: number): string {
  return formatPrice(manwon * 10000);
}

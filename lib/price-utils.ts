/**
 * 가격 유틸리티 (레거시 호환용)
 * 
 * 참고: 새로운 API는 DB의 dealOrWarrantPrcWon (BigInt) 컬럼을 사용합니다.
 * 이 파일은 레거시 코드 및 외부 사용을 위해 유지됩니다.
 */

/**
 * 가격 문자열을 BigInt로 변환
 * 예: "3억 5,000" → 350000000n (원 단위)
 */
export function parsePriceToWonBigInt(priceStr: string | null | undefined): bigint | null {
  if (!priceStr || priceStr === '-') return null;

  const cleanStr = priceStr.replace(/\s+/g, '');
  const eokMatch = cleanStr.match(/(\d+)억/);
  const manMatch = cleanStr.match(/억?([\d,]+)/);

  const eok = eokMatch ? parseInt(eokMatch[1]) : 0;
  let man = 0;

  if (manMatch) {
    man = parseInt(manMatch[1].replace(/,/g, ''));
  } else {
    const onlyNumber = cleanStr.match(/^([\d,]+)$/);
    if (onlyNumber) {
      man = parseInt(onlyNumber[1].replace(/,/g, ''));
    }
  }

  return BigInt(eok * 100000000 + man * 10000);
}

/**
 * 가격 문자열을 숫자로 변환 (레거시)
 * 예: "3억 5,000" → 350000000 (원 단위)
 *
 * @deprecated 새 코드는 parsePriceToWonBigInt 사용 권장
 */
export function parsePriceToWon(priceStr: string | null | undefined): number {
  if (!priceStr || priceStr === '-') return 0;

  let totalWon = 0;
  const cleanStr = priceStr.replace(/\s+/g, '');

  const eokMatch = cleanStr.match(/(\d+)억/);
  if (eokMatch) {
    totalWon += parseInt(eokMatch[1]) * 100000000;
  }

  const manMatch = cleanStr.match(/억([\d,]+)/);
  if (manMatch) {
    const manValue = parseInt(manMatch[1].replace(/,/g, ''));
    totalWon += manValue * 10000;
  } else if (!eokMatch) {
    const onlyNumber = cleanStr.match(/^([\d,]+)$/);
    if (onlyNumber) {
      const manValue = parseInt(onlyNumber[1].replace(/,/g, ''));
      totalWon = manValue * 10000;
    }
  }

  return totalWon;
}

/**
 * 원 단위를 억/만원 형식으로 변환
 * 예: 350000000 → "3억 5,000"
 */
export function formatWonToPrice(won: number): string {
  if (won === 0) return '-';

  const eok = Math.floor(won / 100000000);
  const man = Math.floor((won % 100000000) / 10000);

  if (eok > 0 && man > 0) {
    return `${eok}억 ${man.toLocaleString()}`;
  } else if (eok > 0) {
    return `${eok}억`;
  } else {
    return man.toLocaleString();
  }
}

/**
 * BigInt를 억/만원 형식으로 변환 (신규)
 * 예: 350000000n → "3억 5,000"
 */
export function formatPriceFromWon(won: bigint | number | null): string {
  if (!won) return '-';
  const wonNum = typeof won === 'bigint' ? Number(won) : won;
  
  const eok = Math.floor(wonNum / 100000000);
  const man = Math.floor((wonNum % 100000000) / 10000);

  if (eok > 0 && man > 0) {
    return `${eok}억 ${man.toLocaleString()}`;
  } else if (eok > 0) {
    return `${eok}억`;
  } else {
    return man.toLocaleString();
  }
}

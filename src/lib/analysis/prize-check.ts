export interface WinResult {
  isWin: boolean;
  matchType: string;
  matchCount: number;
  prize: number;
  matchedNumbers: number[];
}

export interface LatestDraw {
  drawDate: string;
  numbers: number[];
  bonusNumber?: number;
}

// OLG Pick-2 prizes ($1 ticket)
function checkPick2(pick: number[], draw: number[]): WinResult {
  const exact = pick[0] === draw[0] && pick[1] === draw[1];
  if (exact) {
    return { isWin: true, matchType: "Exact", matchCount: 2, prize: 99, matchedNumbers: [...pick] };
  }
  const isDuplicate = pick[0] === pick[1];
  if (!isDuplicate && pick[0] === draw[1] && pick[1] === draw[0]) {
    return { isWin: true, matchType: "Any", matchCount: 2, prize: 49.5, matchedNumbers: [...pick] };
  }
  return { isWin: false, matchType: "No match", matchCount: 0, prize: 0, matchedNumbers: [] };
}

// OLG Pick-3 prizes ($1 ticket)
function checkPick3(pick: number[], draw: number[]): WinResult {
  const exact = pick.every((n, i) => n === draw[i]);
  if (exact) {
    return { isWin: true, matchType: "Exact", matchCount: 3, prize: 500, matchedNumbers: [...pick] };
  }
  const pickSorted = [...pick].sort((a, b) => a - b);
  const drawSorted = [...draw].sort((a, b) => a - b);
  const anyMatch = pickSorted.every((n, i) => n === drawSorted[i]);
  if (anyMatch) {
    const uniqueCount = new Set(pick).size;
    const prize = uniqueCount === 3 ? 83 : 167; // all-different vs one-pair
    return { isWin: true, matchType: "Any", matchCount: 3, prize, matchedNumbers: [...pick] };
  }
  return { isWin: false, matchType: "No match", matchCount: 0, prize: 0, matchedNumbers: [] };
}

// OLG Pick-4 prizes ($1 ticket)
function checkPick4(pick: number[], draw: number[]): WinResult {
  const exact = pick.every((n, i) => n === draw[i]);
  if (exact) {
    return { isWin: true, matchType: "Exact", matchCount: 4, prize: 5000, matchedNumbers: [...pick] };
  }
  const pickSorted = [...pick].sort((a, b) => a - b);
  const drawSorted = [...draw].sort((a, b) => a - b);
  const anyMatch = pickSorted.every((n, i) => n === drawSorted[i]);
  if (anyMatch) {
    const freq = new Map<number, number>();
    for (const n of pick) freq.set(n, (freq.get(n) ?? 0) + 1);
    const counts = Array.from(freq.values()).sort((a, b) => b - a);
    let prize = 208; // all different
    if (counts[0] === 3) prize = 1667;      // triple
    else if (counts[0] === 2 && counts[1] === 2) prize = 833; // two pair
    else if (counts[0] === 2) prize = 417;   // one pair
    return { isWin: true, matchType: "Any", matchCount: 4, prize, matchedNumbers: [...pick] };
  }
  return { isWin: false, matchType: "No match", matchCount: 0, prize: 0, matchedNumbers: [] };
}

// Lotto-style games (6/49, Ontario 49, Lottario, Max, Daily Grand)
// Approximate average prizes used - actual varies per draw
const LOTTO_649_PRIZES: Record<string, number> = {
  "6": 5_000_000, "5+B": 50_000, "5": 2_000, "4": 80, "3": 10, "2+B": 5,
};
const LOTTO_MAX_PRIZES: Record<string, number> = {
  "7": 10_000_000, "6+B": 200_000, "6": 5_000, "5": 100, "4": 20, "3+B": 5, "3": 5,
};
const ONTARIO_49_PRIZES: Record<string, number> = {
  "6": 500_000, "5+B": 5_000, "5": 500, "4": 50, "3": 5,
};
const LOTTARIO_PRIZES: Record<string, number> = {
  "6": 250_000, "5+B": 5_000, "5": 500, "4": 40, "3": 5,
};
const DAILY_GRAND_PRIZES: Record<string, number> = {
  "5+B": 7_000_000, "5": 25_000, "4+B": 1_000, "4": 500, "3+B": 100, "3": 20, "2+B": 10,
};

function checkLottoMatch(
  pick: number[],
  draw: number[],
  bonus: number | undefined,
  prizeTable: Record<string, number>,
  pickCount: number
): WinResult {
  const drawSet = new Set(draw);
  const matched = pick.filter(n => drawSet.has(n));
  const matchCount = matched.length;
  const bonusMatch = bonus !== undefined && pick.some(n => n === bonus) && !drawSet.has(bonus);

  // Try exact count first, then count+bonus
  const keyWithBonus = `${matchCount}+B`;
  const keyPlain = `${matchCount}`;

  let matchType = `${matchCount}/${pickCount}`;
  let prize = 0;

  if (bonusMatch && prizeTable[keyWithBonus] !== undefined) {
    prize = prizeTable[keyWithBonus];
    matchType = `${matchCount}/${pickCount} + Bonus`;
  } else if (prizeTable[keyPlain] !== undefined) {
    prize = prizeTable[keyPlain];
  }

  return {
    isWin: prize > 0,
    matchType,
    matchCount,
    prize,
    matchedNumbers: matched,
  };
}

// Daily Keno - prizes based on how many you pick vs how many match
// For simplicity, using 10-spot prizes (most common)
const KENO_10_PRIZES: Record<number, number> = {
  0: 5, 5: 7, 6: 25, 7: 150, 8: 1_000, 9: 25_000, 10: 250_000,
};

function checkKeno(pick: number[], draw: number[]): WinResult {
  const drawSet = new Set(draw);
  const matched = pick.filter(n => drawSet.has(n));
  const matchCount = matched.length;
  const prize = KENO_10_PRIZES[matchCount] ?? 0;

  return {
    isWin: prize > 0,
    matchType: `${matchCount}/20 matched`,
    matchCount,
    prize,
    matchedNumbers: matched,
  };
}

export function checkWin(
  gameSlug: string,
  pick: number[],
  draw: LatestDraw
): WinResult {
  const drawNumbers = draw.numbers;

  switch (gameSlug) {
    case "pick-2":
      return checkPick2(pick, drawNumbers);
    case "pick-3":
      return checkPick3(pick, drawNumbers);
    case "pick-4":
      return checkPick4(pick, drawNumbers);
    case "lotto-649":
      return checkLottoMatch(pick, drawNumbers, draw.bonusNumber, LOTTO_649_PRIZES, 6);
    case "lotto-max":
      return checkLottoMatch(pick, drawNumbers, draw.bonusNumber, LOTTO_MAX_PRIZES, 7);
    case "ontario-49":
      return checkLottoMatch(pick, drawNumbers, draw.bonusNumber, ONTARIO_49_PRIZES, 6);
    case "lottario":
      return checkLottoMatch(pick, drawNumbers, draw.bonusNumber, LOTTARIO_PRIZES, 6);
    case "daily-grand":
      return checkLottoMatch(pick, drawNumbers, draw.bonusNumber, DAILY_GRAND_PRIZES, 5);
    case "daily-keno":
      return checkKeno(pick, drawNumbers);
    default:
      return { isWin: false, matchType: "Unknown game", matchCount: 0, prize: 0, matchedNumbers: [] };
  }
}

export interface Game {
  id: number;
  slug: string;
  name: string;
  pickCount: number;
  numberRange: number;
  hasBonus: boolean | null;
  bonusRange: number | null;
  minNumber: number | null;
  allowDuplicates: boolean | null;
  drawDays: string | null;
  ticketPrice: number | null;
  createdAt: string | null;
}

export interface Draw {
  id: number;
  gameId: number;
  drawDate: string;
  drawNumber: string | null;
  numbers: string;
  bonusNumber: number | null;
  encore: string | null;
  jackpotAmount: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ParsedDraw {
  id: number;
  gameId: number;
  drawDate: string;
  drawNumber: string | null;
  numbers: number[];
  bonusNumber: number | null;
}

export function parseDraw(draw: Draw): ParsedDraw {
  return {
    id: draw.id,
    gameId: draw.gameId,
    drawDate: draw.drawDate,
    drawNumber: draw.drawNumber,
    numbers: JSON.parse(draw.numbers) as number[],
    bonusNumber: draw.bonusNumber,
  };
}

export interface GameStats {
  game: Game;
  totalDraws: number;
  latestDraw: Draw | null;
  oldestDraw: Draw | null;
  lastSyncDate: string | null;
}

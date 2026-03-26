import type { ScrapedDraw, ScrapeResult } from "./olg-scraper";
import { validateDraw } from "./olg-scraper";

const OLG_GATEWAY = "https://gateway.www.olg.ca";
const OLG_API_KEY = "9c92a16d25b542048aa93a397093efe2";

const GAME_CODES: Record<string, { apiCode: string; responseKey: string; pickCount: number; numberRange: number; minNumber: number; allowDuplicates: boolean; hasBonus: boolean; bonusRange?: number }> = {
  "lotto-649": { apiCode: "lotto649", responseKey: "lotto649", pickCount: 6, numberRange: 49, minNumber: 1, allowDuplicates: false, hasBonus: true },
  "lotto-max": { apiCode: "lottomax", responseKey: "lottomax", pickCount: 7, numberRange: 50, minNumber: 1, allowDuplicates: false, hasBonus: true },
  "ontario-49": { apiCode: "ontario49", responseKey: "ontario49", pickCount: 6, numberRange: 49, minNumber: 1, allowDuplicates: false, hasBonus: true },
  "daily-grand": { apiCode: "dailygrand", responseKey: "dailygrand", pickCount: 5, numberRange: 49, minNumber: 1, allowDuplicates: false, hasBonus: true, bonusRange: 7 },
  "lottario": { apiCode: "lottario", responseKey: "lottario", pickCount: 6, numberRange: 45, minNumber: 1, allowDuplicates: false, hasBonus: true },
  "pick-2": { apiCode: "PICK2", responseKey: "pick2", pickCount: 2, numberRange: 9, minNumber: 0, allowDuplicates: true, hasBonus: false },
  "pick-3": { apiCode: "PICK3", responseKey: "pick3", pickCount: 3, numberRange: 9, minNumber: 0, allowDuplicates: true, hasBonus: false },
  "pick-4": { apiCode: "PICK4", responseKey: "pick4", pickCount: 4, numberRange: 9, minNumber: 0, allowDuplicates: true, hasBonus: false },
  "daily-keno": { apiCode: "dailykeno", responseKey: "dailykeno", pickCount: 20, numberRange: 70, minNumber: 1, allowDuplicates: false, hasBonus: false },
};

interface OlgApiDraw {
  date: string;
  day?: string;
  time?: string;
  main: {
    regular: string;
    bonus?: string;
    prizeShares?: unknown;
  };
  encore?: {
    number?: string;
  };
}

function parseApiDraw(
  raw: OlgApiDraw,
  config: typeof GAME_CODES[string]
): { draw: ScrapedDraw | null; error: string | null } {
  const numbersStr = raw.main?.regular;
  if (!numbersStr) return { draw: null, error: `No numbers in draw ${raw.date}` };

  const numbers = numbersStr.split(",").map((s) => parseInt(s.trim(), 10));
  if (numbers.some(isNaN)) {
    return { draw: null, error: `Invalid numbers in draw ${raw.date}: ${numbersStr}` };
  }

  let bonusNumber: number | undefined;
  if (config.hasBonus && raw.main.bonus) {
    bonusNumber = parseInt(raw.main.bonus, 10);
    if (isNaN(bonusNumber)) bonusNumber = undefined;
  }

  const drawDate = raw.date;
  const drawTime = raw.time;

  // For Pick games, don't sort (order matters)
  if (!config.allowDuplicates) {
    numbers.sort((a, b) => a - b);
  }

  const draw: ScrapedDraw = {
    drawDate,
    drawNumber: drawTime || undefined,
    numbers,
    bonusNumber,
  };

  const err = validateDraw(
    draw,
    config.pickCount,
    config.numberRange,
    config.minNumber,
    config.allowDuplicates,
    config.bonusRange
  );

  if (err) return { draw: null, error: `Draw ${drawDate}: ${err}` };
  return { draw, error: null };
}

export async function scrapeOlgApi(
  gameSlug: string,
  monthsBack: number = 12
): Promise<ScrapeResult> {
  const config = GAME_CODES[gameSlug];
  if (!config) {
    return {
      success: false,
      draws: [],
      errors: [`Unknown game: ${gameSlug}`],
      source: "olg-api",
    };
  }

  const allDraws: ScrapedDraw[] = [];
  const allErrors: string[] = [];
  const seenKeys = new Set<string>();

  // Fetch in monthly chunks
  const now = new Date();
  for (let i = 0; i < monthsBack; i++) {
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const startDate = start.toISOString().split("T")[0];
    const endDate = end.toISOString().split("T")[0];

    const url = `${OLG_GATEWAY}/feeds/past-winning-numbers?game=${config.apiCode}&startDate=${startDate}&endDate=${endDate}&subscription-key=${OLG_API_KEY}`;

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        allErrors.push(`HTTP ${response.status} for ${startDate} to ${endDate}`);
        continue;
      }

      const data = await response.json();
      if (data.response?.statusCode !== "0") {
        allErrors.push(`API error: ${data.response?.description || "unknown"}`);
        continue;
      }

      const gameData = data.response.winnings?.[config.responseKey];
      if (!gameData) continue;

      // API returns either a single draw object or an array
      const rawDraws: OlgApiDraw[] = Array.isArray(gameData.draw)
        ? gameData.draw
        : gameData.draw
        ? [gameData.draw]
        : [];

      for (const raw of rawDraws) {
        // Deduplicate by date+time (Pick games have midday+evening draws)
        const key = `${raw.date}-${raw.time || ""}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);

        const { draw, error } = parseApiDraw(raw, config);
        if (error) allErrors.push(error);
        if (draw) allDraws.push(draw);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      allErrors.push(`Fetch error for ${startDate}: ${msg}`);
    }
  }

  allDraws.sort((a, b) => b.drawDate.localeCompare(a.drawDate));

  return {
    success: allDraws.length > 0,
    draws: allDraws,
    errors: allErrors,
    source: "olg-api",
  };
}

import * as cheerio from "cheerio";

export interface ScrapedDraw {
  drawDate: string;
  drawNumber?: string;
  numbers: number[];
  bonusNumber?: number;
  jackpotAmount?: number;
}

export interface ScrapeResult {
  success: boolean;
  draws: ScrapedDraw[];
  errors: string[];
  source: string;
}

const OLG_URLS: Record<string, string> = {
  "lotto-649":
    "https://www.olg.ca/en/lottery/play-lotto-649-encore/past-results.html",
  "lotto-max":
    "https://www.olg.ca/en/lottery/play-lotto-max-encore/past-results.html",
  "ontario-49":
    "https://www.olg.ca/en/lottery/play-ontario-49-encore/past-results.html",
};

const GAME_CONFIG: Record<string, { pickCount: number; numberRange: number }> =
  {
    "lotto-649": { pickCount: 6, numberRange: 49 },
    "lotto-max": { pickCount: 7, numberRange: 50 },
    "ontario-49": { pickCount: 6, numberRange: 49 },
  };

const SCRAPE_DELAY_MS = parseInt(
  process.env.SCRAPE_DELAY_MS || "1500",
  10
);

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function validateDraw(
  draw: ScrapedDraw,
  pickCount: number,
  numberRange: number
): string | null {
  if (draw.numbers.length !== pickCount) {
    return `Expected ${pickCount} numbers, got ${draw.numbers.length}`;
  }
  for (const n of draw.numbers) {
    if (!Number.isInteger(n) || n < 1 || n > numberRange) {
      return `Number ${n} out of range [1, ${numberRange}]`;
    }
  }
  const unique = new Set(draw.numbers);
  if (unique.size !== draw.numbers.length) {
    return `Duplicate numbers found: ${draw.numbers.join(",")}`;
  }
  if (draw.bonusNumber !== undefined) {
    if (
      !Number.isInteger(draw.bonusNumber) ||
      draw.bonusNumber < 1 ||
      draw.bonusNumber > numberRange
    ) {
      return `Bonus number ${draw.bonusNumber} out of range [1, ${numberRange}]`;
    }
  }
  if (isNaN(Date.parse(draw.drawDate))) {
    return `Invalid draw date: ${draw.drawDate}`;
  }
  return null;
}

function parseNumbersFromText(text: string): number[] {
  const matches = text.match(/\d+/g);
  if (!matches) return [];
  return matches.map(Number).filter((n) => n >= 1 && n <= 50);
}

function tryParseEmbeddedJson(html: string): ScrapedDraw[] {
  const draws: ScrapedDraw[] = [];

  // Look for JSON data embedded in script tags
  const jsonPatterns = [
    new RegExp('window\\.__NEXT_DATA__\\s*=\\s*({.*?});', 's'),
    new RegExp('var\\s+drawResults\\s*=\\s*(\\[.*?\\]);', 's'),
    new RegExp('"pastResults"\\s*:\\s*(\\[.*?\\])', 's'),
    new RegExp('"drawResults"\\s*:\\s*(\\[.*?\\])', 's'),
  ];

  for (const pattern of jsonPatterns) {
    const match = html.match(pattern);
    if (!match) continue;
    try {
      const data = JSON.parse(match[1]);
      const items = Array.isArray(data) ? data : [];
      for (const item of items) {
        const numbers =
          item.numbers || item.winningNumbers || item.mainNumbers;
        const date = item.drawDate || item.date || item.draw_date;
        if (Array.isArray(numbers) && date) {
          draws.push({
            drawDate: new Date(date).toISOString().split("T")[0],
            drawNumber: item.drawNumber || item.draw_number,
            numbers: numbers.map(Number).sort((a: number, b: number) => a - b),
            bonusNumber: item.bonusNumber ?? item.bonus ?? undefined,
            jackpotAmount: item.jackpot ?? item.jackpotAmount ?? undefined,
          });
        }
      }
    } catch {
      // JSON parse failed, try next pattern
    }
  }

  return draws;
}

function tryParseHtmlStructure(
  $: cheerio.CheerioAPI,
  pickCount: number
): ScrapedDraw[] {
  const draws: ScrapedDraw[] = [];

  // Strategy 1: Look for result containers with number elements
  const resultSelectors = [
    ".past-results__result",
    ".draw-result",
    ".result-card",
    '[class*="result"]',
    '[class*="draw"]',
    ".lottery-result",
    "table.results tbody tr",
  ];

  for (const selector of resultSelectors) {
    const elements = $(selector);
    if (elements.length === 0) continue;

    elements.each((_, el) => {
      const container = $(el);

      // Try to find date
      const dateEl = container.find(
        '[class*="date"], time, .draw-date, .result-date, td:first-child'
      );
      let dateText = dateEl.attr("datetime") || dateEl.text().trim();
      if (!dateText) {
        const textContent = container.text();
        const dateMatch = textContent.match(
          /(\w+\s+\d{1,2},?\s+\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})/
        );
        if (dateMatch) dateText = dateMatch[1];
      }
      if (!dateText) return;

      const parsedDate = new Date(dateText);
      if (isNaN(parsedDate.getTime())) return;
      const drawDate = parsedDate.toISOString().split("T")[0];

      // Try to find numbers
      const numberEls = container.find(
        '[class*="number"], .ball, .lotto-number, .winning-number'
      );
      let numbers: number[] = [];

      if (numberEls.length >= pickCount) {
        numberEls.each((i, numEl) => {
          if (i < pickCount) {
            const n = parseInt($(numEl).text().trim(), 10);
            if (!isNaN(n)) numbers.push(n);
          }
        });
      }

      // Fallback: parse all numbers from text
      if (numbers.length < pickCount) {
        const allText = container.text();
        numbers = parseNumbersFromText(allText);
      }

      if (numbers.length >= pickCount) {
        const mainNumbers = numbers
          .slice(0, pickCount)
          .sort((a, b) => a - b);
        const bonus = numbers[pickCount];

        draws.push({
          drawDate,
          numbers: mainNumbers,
          bonusNumber: bonus ?? undefined,
        });
      }
    });

    if (draws.length > 0) break;
  }

  return draws;
}

export async function scrapeOlg(gameSlug: string): Promise<ScrapeResult> {
  const url = OLG_URLS[gameSlug];
  if (!url) {
    return {
      success: false,
      draws: [],
      errors: [`Unknown game slug: ${gameSlug}`],
      source: "olg",
    };
  }

  const config = GAME_CONFIG[gameSlug];
  const errors: string[] = [];
  let allDraws: ScrapedDraw[] = [];

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!response.ok) {
      return {
        success: false,
        draws: [],
        errors: [`HTTP ${response.status}: ${response.statusText}`],
        source: "olg",
      };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Try embedded JSON first (more reliable)
    allDraws = tryParseEmbeddedJson(html);

    // Fall back to HTML parsing
    if (allDraws.length === 0) {
      allDraws = tryParseHtmlStructure($, config.pickCount);
    }

    if (allDraws.length === 0) {
      errors.push(
        "No draw data found in OLG page. The page is likely JavaScript-rendered and requires a fallback source."
      );
    }

    // Validate all draws
    const validDraws: ScrapedDraw[] = [];
    for (const draw of allDraws) {
      draw.numbers.sort((a, b) => a - b);
      const validationError = validateDraw(
        draw,
        config.pickCount,
        config.numberRange
      );
      if (validationError) {
        errors.push(
          `Draw ${draw.drawDate}: ${validationError}`
        );
      } else {
        validDraws.push(draw);
      }
    }

    return {
      success: validDraws.length > 0,
      draws: validDraws,
      errors,
      source: "olg",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      draws: [],
      errors: [`Failed to scrape OLG: ${message}`],
      source: "olg",
    };
  }
}

export async function scrapeOlgMultiPage(
  gameSlug: string,
  maxPages: number = 10
): Promise<ScrapeResult> {
  const firstResult = await scrapeOlg(gameSlug);

  if (!firstResult.success || maxPages <= 1) {
    return firstResult;
  }

  // OLG past results typically only show the most recent draws on a single page.
  // Multi-page scraping would require discovering pagination URLs,
  // which depends on the actual OLG page structure.
  // For now, return the single-page result.
  return firstResult;
}

export { delay, validateDraw };

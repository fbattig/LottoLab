import * as cheerio from "cheerio";
import type { ScrapedDraw, ScrapeResult } from "./olg-scraper";
import { validateDraw, delay } from "./olg-scraper";

const SCRAPE_DELAY_MS = parseInt(process.env.SCRAPE_DELAY_MS || "1500", 10);

const GAME_CONFIG: Record<string, { pickCount: number; numberRange: number; minNumber: number; allowDuplicates: boolean }> = {
  "lotto-649": { pickCount: 6, numberRange: 49, minNumber: 1, allowDuplicates: false },
  "lotto-max": { pickCount: 7, numberRange: 50, minNumber: 1, allowDuplicates: false },
  "ontario-49": { pickCount: 6, numberRange: 49, minNumber: 1, allowDuplicates: false },
  "daily-grand": { pickCount: 5, numberRange: 49, minNumber: 1, allowDuplicates: false },
  "lottario": { pickCount: 6, numberRange: 45, minNumber: 1, allowDuplicates: false },
  "pick-2": { pickCount: 2, numberRange: 9, minNumber: 0, allowDuplicates: true },
  "pick-3": { pickCount: 3, numberRange: 9, minNumber: 0, allowDuplicates: true },
  "pick-4": { pickCount: 4, numberRange: 9, minNumber: 0, allowDuplicates: true },
  "daily-keno": { pickCount: 20, numberRange: 70, minNumber: 1, allowDuplicates: false },
};

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

const LOTTOLORE_URLS: Record<string, { main: string; archivePrefix: string }> = {
  "lotto-649": {
    main: "https://www.lottolore.com/lotto649.html",
    archivePrefix: "https://www.lottolore.com/l649",
  },
  "lotto-max": {
    main: "https://www.lottolore.com/lottomax.html",
    archivePrefix: "https://www.lottolore.com/lmax",
  },
  "ontario-49": {
    main: "https://www.lottolore.com/ontar49.html",
    archivePrefix: "https://www.lottolore.com/on49",
  },
  "daily-grand": {
    main: "https://www.lottolore.com/dailygn.html",
    archivePrefix: "https://www.lottolore.com/daly",
  },
  "lottario": {
    main: "https://www.lottolore.com/lottario.html",
    archivePrefix: "https://www.lottolore.com/lott",
  },
};

function parseLottolorePage(
  html: string,
  pickCount: number,
  numberRange: number,
  minNumber: number = 1,
  allowDuplicates: boolean = false
): { draws: ScrapedDraw[]; errors: string[] } {
  const draws: ScrapedDraw[] = [];
  const errors: string[] = [];
  const $ = cheerio.load(html);

  // lottolore structure:
  // <b><font size="5">Wed, March 25, 2026 - </font><font ...>Lotto 6/49</font></b>
  // <table border="1" ...><tr align="center">
  //   <td><font size="5"><b>20</b></font></td>
  //   <td><font size="5"><b>23</b></font></td> ...
  // </tr></table>
  // ... Bonus 44 ...

  // lottolore structure: <p> contains <b> with date and <table> with numbers
  // <p><b>Wed, March 25, 2026 - Lotto 6/49</b>
  //   <table><tr><td>20</td><td>23</td>...<td>Bonus 44</td></tr></table></p>
  $("b, strong").each((_, el) => {
    const fullText = $(el).text().trim();
    const dateMatch = fullText.match(
      /(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\w*,\s+(\w+\s+\d{1,2},?\s+\d{4})/
    );
    if (!dateMatch) return;

    const parsedDate = new Date(dateMatch[1]);
    if (isNaN(parsedDate.getTime())) return;
    const drawDate = parsedDate.toISOString().split("T")[0];

    // The table is inside the same <p> parent, or is a next sibling
    const parent = $(el).parent();
    let table = parent.find("table").first();
    if (table.length === 0) {
      table = parent.next("table");
    }
    if (table.length === 0) return;

    // Extract numbers from <td> cells
    const numbers: number[] = [];
    let bonusNumber: number | undefined;

    table.find("td").each((_, td) => {
      const cellText = $(td).text().trim();

      // Check for "Bonus XX"
      const bonusMatch = cellText.match(/^Bonus\s+(\d+)$/i);
      if (bonusMatch) {
        bonusNumber = parseInt(bonusMatch[1], 10);
        return;
      }

      const n = parseInt(cellText, 10);
      if (!isNaN(n) && n >= minNumber && n <= numberRange && numbers.length < pickCount) {
        if (allowDuplicates || !numbers.includes(n)) {
          numbers.push(n);
        }
      }
    });

    if (numbers.length < pickCount) return;

    const draw: ScrapedDraw = {
      drawDate,
      numbers: allowDuplicates ? numbers : numbers.sort((a, b) => a - b),
      bonusNumber,
    };

    const err = validateDraw(draw, pickCount, numberRange, minNumber, allowDuplicates);
    if (err) {
      errors.push(`Draw ${drawDate}: ${err}`);
    } else {
      draws.push(draw);
    }
  });

  return { draws, errors };
}

function getArchiveUrls(prefix: string, monthsBack: number = 12): string[] {
  const urls: string[] = [];
  const now = new Date();

  for (let i = 0; i <= monthsBack; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(2);
    urls.push(`${prefix}${mm}${yy}.html`);
  }

  return urls;
}

export async function scrapeFallback(
  gameSlug: string,
  maxMonths: number = 12
): Promise<ScrapeResult> {
  const config = GAME_CONFIG[gameSlug];
  if (!config) {
    return {
      success: false,
      draws: [],
      errors: [`Unknown game: ${gameSlug}`],
      source: "fallback",
    };
  }

  const lottolore = LOTTOLORE_URLS[gameSlug];
  if (!lottolore) {
    return {
      success: false,
      draws: [],
      errors: [`No fallback source for: ${gameSlug}`],
      source: "fallback",
    };
  }

  const allErrors: string[] = [];
  const allDraws: ScrapedDraw[] = [];
  const seenDates = new Set<string>();

  const urls = [lottolore.main, ...getArchiveUrls(lottolore.archivePrefix, maxMonths)];

  for (const url of urls) {
    try {
      const response = await fetch(url, { headers: FETCH_HEADERS });

      if (!response.ok) {
        if (response.status !== 404) {
          allErrors.push(`${url}: HTTP ${response.status}`);
        }
        await delay(SCRAPE_DELAY_MS);
        continue;
      }

      const html = await response.text();
      const { draws, errors } = parseLottolorePage(
        html,
        config.pickCount,
        config.numberRange,
        config.minNumber,
        config.allowDuplicates
      );

      allErrors.push(...errors);

      for (const draw of draws) {
        if (!seenDates.has(draw.drawDate)) {
          seenDates.add(draw.drawDate);
          allDraws.push(draw);
        }
      }

      await delay(SCRAPE_DELAY_MS);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      allErrors.push(`${url}: ${message}`);
      await delay(SCRAPE_DELAY_MS);
    }
  }

  allDraws.sort((a, b) => b.drawDate.localeCompare(a.drawDate));

  return {
    success: allDraws.length > 0,
    draws: allDraws,
    errors: allErrors,
    source: "fallback:lottolore",
  };
}

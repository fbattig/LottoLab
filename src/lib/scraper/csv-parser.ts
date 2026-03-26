import type { ScrapedDraw } from "./olg-scraper";

export interface CsvParseResult {
  success: boolean;
  draws: ScrapedDraw[];
  errors: string[];
}

function parseDateValue(value: string): string | null {
  const trimmed = value.trim().replace(/^["']|["']$/g, "");

  // ISO: 2024-01-15
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // US slash: 01/15/2024 or 1/15/2024
  const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const [, m, d, y] = usMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // Text: January 15, 2024
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  return null;
}

function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function detectFormat(
  headerFields: string[],
  pickCount: number
): "quoted" | "individual" | null {
  const lower = headerFields.map((f) =>
    f.toLowerCase().replace(/['"]/g, "")
  );

  // Format 1: draw_date,numbers,bonus_number
  if (
    lower.some((f) => f.includes("numbers")) &&
    lower.some((f) => f.includes("date"))
  ) {
    return "quoted";
  }

  // Format 2: date,n1,n2,n3,n4,n5,n6,bonus
  const numericHeaders = lower.filter(
    (f) => /^n\d+$/.test(f) || /^number[_\s]?\d+$/.test(f) || /^num\d+$/.test(f)
  );
  if (numericHeaders.length >= pickCount) {
    return "individual";
  }

  // Heuristic: if there are enough columns, assume individual
  // date + pickCount numbers + optional bonus = pickCount+1 or pickCount+2
  if (
    headerFields.length >= pickCount + 1 &&
    headerFields.length <= pickCount + 3
  ) {
    return "individual";
  }

  // If header has "numbers" column name
  if (lower.some((f) => f === "numbers" || f === "winning_numbers")) {
    return "quoted";
  }

  return null;
}

function parseQuotedFormat(
  fields: string[],
  headerFields: string[],
  pickCount: number,
  numberRange: number,
  minNumber: number = 1,
  allowDuplicates: boolean = false
): { draw: ScrapedDraw | null; error: string | null } {
  const lower = headerFields.map((f) =>
    f.toLowerCase().replace(/['"]/g, "")
  );

  const dateIdx = lower.findIndex(
    (f) => f.includes("date") || f === "draw_date" || f === "drawdate"
  );
  const numbersIdx = lower.findIndex(
    (f) => f === "numbers" || f === "winning_numbers"
  );
  const bonusIdx = lower.findIndex(
    (f) => f.includes("bonus") || f === "bonus_number"
  );
  const drawNumIdx = lower.findIndex(
    (f) =>
      f === "draw_number" ||
      f === "drawnumber" ||
      f === "draw_num"
  );

  if (dateIdx === -1 || numbersIdx === -1) {
    return { draw: null, error: "Missing date or numbers column" };
  }

  const dateStr = parseDateValue(fields[dateIdx] || "");
  if (!dateStr) {
    return { draw: null, error: `Invalid date: ${fields[dateIdx]}` };
  }

  // Parse the quoted numbers string: "3,12,15,27,33,44"
  const numbersRaw = (fields[numbersIdx] || "")
    .replace(/^["']|["']$/g, "")
    .trim();
  const numbers = numbersRaw
    .split(/[,\s-]+/)
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n));

  if (numbers.length !== pickCount) {
    return {
      draw: null,
      error: `Expected ${pickCount} numbers, got ${numbers.length} from "${numbersRaw}"`,
    };
  }

  for (const n of numbers) {
    if (n < minNumber || n > numberRange) {
      return {
        draw: null,
        error: `Number ${n} out of range [${minNumber}, ${numberRange}]`,
      };
    }
  }

  if (!allowDuplicates) {
    const unique = new Set(numbers);
    if (unique.size !== numbers.length) {
      return { draw: null, error: `Duplicate numbers in draw` };
    }
  }

  if (!allowDuplicates) {
    numbers.sort((a, b) => a - b);
  }

  let bonusNumber: number | undefined;
  if (bonusIdx !== -1 && fields[bonusIdx]) {
    const b = parseInt(fields[bonusIdx].replace(/['"]/g, "").trim(), 10);
    if (!isNaN(b) && b >= 1 && b <= numberRange) {
      bonusNumber = b;
    }
  }

  const drawNumber =
    drawNumIdx !== -1
      ? fields[drawNumIdx]?.replace(/['"]/g, "").trim()
      : undefined;

  return {
    draw: {
      drawDate: dateStr,
      drawNumber: drawNumber || undefined,
      numbers,
      bonusNumber,
    },
    error: null,
  };
}

function parseIndividualFormat(
  fields: string[],
  pickCount: number,
  numberRange: number,
  minNumber: number = 1,
  allowDuplicates: boolean = false
): { draw: ScrapedDraw | null; error: string | null } {
  // First field is date, next pickCount fields are numbers, optional bonus after
  if (fields.length < pickCount + 1) {
    return {
      draw: null,
      error: `Not enough columns: expected at least ${pickCount + 1}, got ${fields.length}`,
    };
  }

  const dateStr = parseDateValue(fields[0]);
  if (!dateStr) {
    return { draw: null, error: `Invalid date: ${fields[0]}` };
  }

  const numbers: number[] = [];
  for (let i = 1; i <= pickCount; i++) {
    const n = parseInt(fields[i]?.replace(/['"]/g, "").trim() || "", 10);
    if (isNaN(n)) {
      return { draw: null, error: `Non-numeric value in column ${i + 1}: "${fields[i]}"` };
    }
    if (n < minNumber || n > numberRange) {
      return {
        draw: null,
        error: `Number ${n} out of range [${minNumber}, ${numberRange}]`,
      };
    }
    numbers.push(n);
  }

  if (!allowDuplicates) {
    const unique = new Set(numbers);
    if (unique.size !== numbers.length) {
      return { draw: null, error: "Duplicate numbers in draw" };
    }
  }

  if (!allowDuplicates) {
    numbers.sort((a, b) => a - b);
  }

  let bonusNumber: number | undefined;
  if (fields.length > pickCount + 1) {
    const b = parseInt(
      fields[pickCount + 1]?.replace(/['"]/g, "").trim() || "",
      10
    );
    if (!isNaN(b) && b >= 1 && b <= numberRange) {
      bonusNumber = b;
    }
  }

  return {
    draw: {
      drawDate: dateStr,
      numbers,
      bonusNumber,
    },
    error: null,
  };
}

export function parseCsv(
  csvText: string,
  pickCount: number,
  numberRange: number,
  minNumber: number = 1,
  allowDuplicates: boolean = false
): CsvParseResult {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return {
      success: false,
      draws: [],
      errors: ["CSV must have a header row and at least one data row"],
    };
  }

  const headerFields = splitCsvLine(lines[0]);
  const format = detectFormat(headerFields, pickCount);

  if (!format) {
    return {
      success: false,
      draws: [],
      errors: [
        `Unable to detect CSV format. Expected either: (1) columns with "date" and "numbers", or (2) date followed by ${pickCount} individual number columns. Header: ${lines[0]}`,
      ],
    };
  }

  const draws: ScrapedDraw[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = splitCsvLine(lines[i]);

    // Skip empty rows
    if (fields.every((f) => f === "")) continue;

    const lineNum = i + 1;
    let result: { draw: ScrapedDraw | null; error: string | null };

    if (format === "quoted") {
      result = parseQuotedFormat(
        fields,
        headerFields,
        pickCount,
        numberRange,
        minNumber,
        allowDuplicates
      );
    } else {
      result = parseIndividualFormat(fields, pickCount, numberRange, minNumber, allowDuplicates);
    }

    if (result.error) {
      errors.push(`Line ${lineNum}: ${result.error}`);
    } else if (result.draw) {
      draws.push(result.draw);
    }
  }

  return {
    success: draws.length > 0,
    draws,
    errors,
  };
}

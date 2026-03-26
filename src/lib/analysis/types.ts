export interface AnalysisConfig {
  gameId: number;
  gameSlug: string;
  pickCount: number;
  numberRange: number;
  minNumber: number;
  allowDuplicates: boolean;
  windowSize: number;
}

export interface NumberScore {
  number: number;
  frequency: number;
  percentage: number;
  rank: number;
  classification: "HOT" | "WARM" | "COLD";
  currentSkip: number;
  avgSkip: number;
  isDue: boolean;
  compositeScore: number;
}

export interface SkipData {
  number: number;
  currentSkip: number;
  avgSkip: number;
  maxSkip: number;
  skips: number[];
  isDue: boolean;
}

export interface SumTotalData {
  sums: number[];
  mean: number;
  stdDev: number;
  optimalLow: number;
  optimalHigh: number;
  distribution: { sum: number; count: number; percentage: number }[];
  inRangePercentage: number;
}

export interface RatioData {
  ratio: string;
  count: number;
  percentage: number;
}

export interface GroupData {
  group: string;
  range: string;
  frequency: number;
  percentage: number;
  isHot: boolean;
}

export interface LastDigitData {
  digit: number;
  frequency: number;
  percentage: number;
}

export interface ConsecutiveData {
  pairCount: number;
  count: number;
  percentage: number;
}

export interface PositionalData {
  position: number;
  topNumbers: { number: number; frequency: number; percentage: number }[];
}

export interface CombinationScore {
  numbers: number[];
  sumTotal: number;
  sumInRange: boolean;
  oddEvenRatio: string;
  oddEvenOptimal: boolean;
  highLowRatio: string;
  highLowOptimal: boolean;
  groupsCovered: number;
  hasConsecutives: boolean;
  lastDigitDiversity: number;
  compositeScore: number;
}

export interface ParsedDraw {
  numbers: number[];
}

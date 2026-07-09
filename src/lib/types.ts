export interface AppData {
  _version: number;
  globalScore: number;
  streak: number;
  history: SessionRecord[];
  arithModes: string[];
  arithOperandCount: number;
  arithDigits: { first: number; second: number; num: number; den: number };
  rootModes: string[];
  rootSqRanges: string[];
  fracPoolMode: 'all' | 'selected';
  fracSelected: string[];
  memCfg: { sets: number; nums: number; time: number; ops: string[]; diff?: string };
  tblState: TblState;
  tblCustomFacts: CustomFact[];
  memorySessions: MemorySession[];
}

export interface SessionRecord {
  score: number;
  correct: number;
  total: number;
  time: number;
  mode: string;
  diff: string;
  date?: string;
}

export interface TblState {
  tablesMastered: number;
  totalMastered: number;
  score: number;
  currentTable: number;
  factsMastered: number;
  customFactIdx: number | null;
  leitner: Record<string, Record<number, number>>;
  isCustom?: boolean;
  lastFact?: number | null;
  customFacts?: CustomFact[];
  mastered: number[];
  customFactLevels: Record<number, number>;
  wrongStreak: number;
}

export interface CustomFact {
  a: number;
  b: number;
  op: string;
  active: boolean;
}

export interface MemorySession {
  id: string;
  name: string;
  facts: MemFact[];
}

export interface MemFact {
  start: string;
  answer: string;
}

export interface ArithState {
  answer: number | null;
  hint: string;
  score: number;
  correct: number;
  total: number;
  streak: number[];
  pending: boolean;
  sessionStart: number;
  qStart: number;
}

export interface RootState {
  pools: Record<string, RootPool>;
  mastered: number;
  score: number;
  correct: number;
  total: number;
  answer: number | null;
  hint: string;
  streak: number[];
  curItem: number | null;
  curMode: string;
  pending: boolean;
}

export interface RootPool {
  items: number[];
  correctCount: Record<number, number>;
  masteredItems: number[];
}

export interface FracState {
  answer: number | null;
  hint: string;
  score: number;
  correct: number;
  total: number;
  streak: number[];
  isF2P: boolean;
  pending: boolean;
}

export interface MixedState {
  answer: number | null;
  hint: string;
  score: number;
  correct: number;
  total: number;
  streak: number[];
  subMode: string;
  pending: boolean;
}

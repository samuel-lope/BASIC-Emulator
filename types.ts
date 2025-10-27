
export type Program = Map<number, string>;
export type Variables = Map<string, string | number>;
export type Arrays = Map<string, any>;

export interface LoopState {
  variable: string;
  end: number;
  step: number;
  pc: number;
}

export interface InterpreterState {
  program: Program;
  variables: Variables;
  arrays: Arrays;
  output: string[];
  pc: number;
  isRunning: boolean;
  isWaitingForInput: boolean;
  inputVariable?: string;
  loopStack: LoopState[];
  gosubStack: number[];
  error: string | null;
  printCursor: number;
  // New state for DATA/READ
  data: (string | number)[];
  dataPointer: number;
  // New state for PEEK/POKE
  memory: Uint8Array;
  // New state for AUTO command
  isAutoMode: boolean;
  autoLineNumber: number;
  autoIncrement: number;
}
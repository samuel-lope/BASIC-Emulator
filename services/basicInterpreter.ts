import type { InterpreterState, Program, Variables, LoopState, Arrays } from '../types';

// Custom error for better control flow
class BasicError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'BasicError';
    }
}

export class BasicInterpreter {
    public state: InterpreterState;
    private builtInFunctions: Set<string>;
    private helpMessages: Map<string, string>;

    constructor() {
        this.state = this.getInitialState();
        this.builtInFunctions = new Set([
            'ABS', 'ASC', 'ATN', 'CHR$', 'COS', 'EXP', 'INT', 'LEFT$', 'LEN',
            'LOG', 'MID$', 'PEEK', 'RIGHT$', 'RND', 'SGN', 'SIN', 'SQR', 'STR$', 'TAN', 'VAL'
        ]);
        this.initializeHelpMessages();
    }

    private initializeHelpMessages() {
        this.helpMessages = new Map([
            ['AUTO', 'AUTO [start[,increment]]\nAutomatically generates line numbers. Press Enter on a blank line to exit.'],
            ['CLS', 'CLS\nClears the screen.'],
            ['DATA', 'DATA <value1>[,<value2>...]\nStores numeric and string constants that are accessed by READ statements.'],
            ['DIM', 'DIM <var>(<size>)[,...]\nAllocates space for arrays.'],
            ['END', 'END\nTerminates program execution.'],
            ['FILES', 'FILES\nLists all programs saved in local storage.'],
            ['FOR', 'FOR <var>=<start> TO <end> [STEP <increment>]\nCreates a loop that executes a block of code a specified number of times.'],
            ['GOSUB', 'GOSUB <line_number>\nBranches to a subroutine at the specified line number.'],
            ['GOTO', 'GOTO <line_number>\nBranches unconditionally to the specified line number.'],
            ['HELP', 'HELP [<command>]\nDisplays help information for commands.'],
            ['IF', 'IF <condition> THEN <statement_or_line_number>\nExecutes a statement or branches to a line number if a condition is true.'],
            ['INPUT', 'INPUT ["<prompt>";]<variable>\nPauses the program and waits for the user to enter data.'],
            ['KILL', 'KILL "<filename>"\nDeletes a file from local storage.'],
            ['LET', 'LET <variable> = <expression>\nAssigns the value of an expression to a variable. The LET keyword is optional.'],
            ['LIST', 'LIST\nLists all lines of the program currently in memory.'],
            ['LOAD', 'LOAD "<filename>"\nLoads a program from local storage into memory.'],
            ['NEW', 'NEW\nDeletes the current program and all variables from memory.'],
            ['NEXT', 'NEXT [<variable>]\nMarks the end of a FOR loop and increments the loop counter.'],
            ['ON', 'ON <expr> GOTO/GOSUB <line1>[,<line2>...]\nBranches to a line number based on the value of an expression.'],
            ['POKE', 'POKE <address>,<value>\nWrites a byte value into a memory location.'],
            ['PRINT', 'PRINT <expr>[,|;]...\nPrints data to the screen.'],
            ['READ', 'READ <variable>[,<variable>...]\nReads values from a DATA statement and assigns them to variables.'],
            ['REM', 'REM <comment>\nIncludes a non-executable comment in the program.'],
            ['RESTORE', 'RESTORE\nResets the DATA pointer to the beginning of the first DATA statement.'],
            ['RETURN', 'RETURN\nReturns from a subroutine.'],
            ['RUN', 'RUN ["<filename>"]\nExecutes the program currently in memory, or loads a program from storage and executes it.'],
            ['SAVE', 'SAVE "<filename>"\nSaves the current program to local storage.'],
        ]);
    }

    private getInitialState(): InterpreterState {
        return {
            program: new Map(),
            variables: new Map(),
            arrays: new Map(),
            output: [],
            pc: 0,
            isRunning: false,
            isWaitingForInput: false,
            inputVariable: undefined,
            loopStack: [],
            gosubStack: [],
            error: null,
            printCursor: 0,
            data: [],
            dataPointer: 0,
            memory: new Uint8Array(65536), // 64K memory for PEEK/POKE
            isAutoMode: false,
            autoLineNumber: 10,
            autoIncrement: 10,
        };
    }

    public processLine(line: string): InterpreterState {
        this.state.error = null;

        if (this.state.isAutoMode) {
            if (line.trim() === '') {
                this.state.isAutoMode = false;
            } else {
                this.state.program.set(this.state.autoLineNumber, line);
                this.state.autoLineNumber += this.state.autoIncrement;
            }
            return this.state;
        }

        const trimmedLine = line.trim();
        if (trimmedLine === '') return this.state;

        const lineMatch = trimmedLine.match(/^(\d+)\s*(.*)/);
        if (lineMatch) {
            const [, numStr, code] = lineMatch;
            const lineNumber = parseInt(numStr, 10);
            if (code) {
                this.state.program.set(lineNumber, code);
            } else {
                this.state.program.delete(lineNumber);
            }
        } else {
            this.executeImmediate(trimmedLine);
        }
        return this.state;
    }

    private executeImmediate(code: string) {
        const upperCode = code.toUpperCase();
        const runMatch = code.match(/^RUN(\s+".*")?$/i);

        if (runMatch) {
            const args = code.substring(3).trim();
            this.handleRun(args);
        }
        else if (upperCode === 'LIST') this.list();
        else if (upperCode === 'NEW') this.new();
        else if (upperCode === 'CLS') this.cls();
        else if (upperCode.startsWith('SAVE')) this.handleSave(code.substring(4).trim());
        else if (upperCode.startsWith('LOAD')) this.handleLoad(code.substring(4).trim());
        else if (upperCode === 'FILES') this.handleFiles();
        else if (upperCode.startsWith('KILL')) this.handleKill(code.substring(4).trim());
        else if (upperCode.startsWith('AUTO')) this.handleAuto(code.substring(4).trim());
        else if (upperCode.startsWith('HELP')) this.handleHelp(code.substring(4).trim());
        else {
            this.parseAndExecute(code);
            if (this.state.error) this.printError(this.state.error);
        }
    }

    private parseAndExecute(code: string) {
        this.state.error = null;
        const commandMatch = code.match(/^([A-Z$]+)/i);
        const command = commandMatch ? commandMatch[0].toUpperCase() : '';
        const args = code.substring(command.length).trim();

        try {
            switch (command) {
                case 'PRINT': this.handlePrint(args); break;
                case 'LET': this.handleLet(args); break;
                case 'INPUT': this.handleInput(args); break;
                case 'GOTO': this.handleGoto(args); break;
                case 'IF': this.handleIf(args); break;
                case 'FOR': this.handleFor(args); break;
                case 'NEXT': this.handleNext(args); break;
                case 'GOSUB': this.handleGosub(args); break;
                case 'RETURN': this.handleReturn(); break;
                case 'END': this.handleEnd(); break;
                case 'CLS': this.cls(); break;
                case 'REM': /* Do nothing */ break;
                case 'DIM': this.handleDim(args); break;
                case 'READ': this.handleRead(args); break;
                case 'DATA': /* Handled in pre-scan */ break;
                case 'RESTORE': this.handleRestore(); break;
                case 'POKE': this.handlePoke(args); break;
                case 'ON': this.handleOn(args); break;
                case 'SAVE': this.handleSave(args); break;
                case 'LOAD': this.handleLoad(args); break;
                case 'FILES': this.handleFiles(); break;
                case 'KILL': this.handleKill(args); break;
                case 'AUTO': this.handleAuto(args); break;
                case 'HELP': this.handleHelp(args); break;
                default:
                    if (code.includes('=')) {
                        this.handleLet(code);
                    } else {
                        throw new BasicError("?SYNTAX ERROR");
                    }
            }
        } catch (e) {
            this.state.error = e instanceof Error ? e.message : String(e);
            this.state.isRunning = false;
        }
    }
    
    // --- Expression Evaluation ---

    private evaluateExpression(expr: string): string | number {
        expr = expr.trim();
        if (expr.startsWith('"') && expr.endsWith('"')) {
            return expr.substring(1, expr.length - 1);
        }

        let processedExpr = this.resolveFunctionsAndArrays(expr);

        let substitutedExpr = processedExpr.replace(/[A-Z][A-Z0-9]*\$?/g, (match) => {
            const value = this.state.variables.get(match.toUpperCase());
            if (value === undefined) return '0'; // Uninitialized variables are 0
            if (typeof value === 'string') return `"${value.replace(/"/g, '\\"')}"`;
            return String(value);
        });
        
        try {
           return new Function(`return ${substitutedExpr}`)();
        } catch (e) {
           throw new BasicError(`?SYNTAX ERROR IN EXPRESSION: ${expr}`);
        }
    }

    private resolveFunctionsAndArrays(expr: string): string {
        const pattern = /([A-Z][A-Z0-9]*\$?)\s*\(([^)]+)\)/;
        let resultExpr = expr;
        let match;

        while ((match = pattern.exec(resultExpr)) !== null) {
            const [fullMatch, name, argsStr] = match;
            const upperName = name.toUpperCase();
            
            const args = this.parseArgs(argsStr).map(arg => this.evaluateExpression(arg));
            let result: string | number;

            if (this.builtInFunctions.has(upperName)) {
                result = this.executeBuiltInFunction(upperName, args);
            } else if (this.state.arrays.has(upperName)) {
                const arr = this.state.arrays.get(upperName);
                let current = arr;
                for (let i = 0; i < args.length; i++) {
                    if (Array.isArray(current)) {
                        current = current[args[i] as number];
                    } else {
                        throw new BasicError("?BAD SUBSCRIPT");
                    }
                }
                result = current;
            } else {
                throw new BasicError(`?UNDEF'D FUNCTION OR ARRAY: ${name}`);
            }

            const resultStr = typeof result === 'string' ? `"${result}"` : String(result);
            resultExpr = resultExpr.replace(fullMatch, resultStr);
        }
        return resultExpr;
    }
    
    private parseArgs(argsStr: string): string[] {
        const args: string[] = [];
        let currentArg = '';
        let parenLevel = 0;
        for (let i = 0; i < argsStr.length; i++) {
            const char = argsStr[i];
            if (char === ',' && parenLevel === 0) {
                args.push(currentArg.trim());
                currentArg = '';
            } else {
                if (char === '(') parenLevel++;
                if (char === ')') parenLevel--;
                currentArg += char;
            }
        }
        args.push(currentArg.trim());
        return args;
    }

    private executeBuiltInFunction(name: string, args: any[]): string | number {
        switch (name) {
            case 'ABS': return Math.abs(args[0]);
            case 'ASC': return String(args[0]).charCodeAt(0);
            case 'ATN': return Math.atan(args[0]);
            case 'CHR$': return String.fromCharCode(args[0]);
            case 'COS': return Math.cos(args[0]);
            case 'EXP': return Math.exp(args[0]);
            case 'INT': return Math.floor(args[0]);
            case 'LEFT$': return String(args[0]).substring(0, args[1]);
            case 'LEN': return String(args[0]).length;
            case 'LOG': return Math.log(args[0]);
            case 'MID$': return String(args[0]).substring(args[1] - 1, args[1] - 1 + (args[2] || String(args[0]).length));
            case 'PEEK': return this.state.memory[args[0] as number];
            case 'RIGHT$': return String(args[0]).substring(String(args[0]).length - args[1]);
            case 'RND': return Math.random(); // Simplified RND
            case 'SGN': return Math.sign(args[0]);
            case 'SIN': return Math.sin(args[0]);
            case 'SQR': return Math.sqrt(args[0]);
            case 'STR$': return String(args[0]);
            case 'TAN': return Math.tan(args[0]);
            case 'VAL': return parseFloat(args[0]);
            default: throw new BasicError(`?UNDEF'D FUNCTION: ${name}`);
        }
    }
    
    // --- Command Handlers ---
    
    private handleHelp(args: string) {
        const topic = args.trim().toUpperCase();

        if (!topic) {
            this.state.output.push('Available commands:');
            const commands = Array.from(this.helpMessages.keys()).sort().join(', ');
            this.state.output.push(commands);
            this.state.output.push('');
            this.state.output.push('Type HELP <command> for more info.');
        } else {
            const message = this.helpMessages.get(topic);
            if (message) {
                message.split('\n').forEach(line => this.state.output.push(line));
            } else {
                this.state.output.push(`?No help found for ${topic}`);
            }
        }
        this.state.output.push('');
        this.state.output.push('Ready');
    }

    private handlePrint(args: string) {
        let printNewline = true;
        let segments = args.split(/([,;])/);
        
        segments.forEach((segment, i) => {
            segment = segment.trim();
            if(segment === ',' || segment === ';') return;

            const nextSegment = (segments[i+1] || '').trim();
            if (segment) {
                const value = this.evaluateExpression(segment);
                if (this.state.output.length === 0) {
                   this.state.output.push('');
                }
                this.state.output[this.state.output.length - 1] += String(value);
            }

            if (nextSegment === ';') {
                printNewline = false;
            } else {
                printNewline = true;
                if (nextSegment === ',') {
                    const currentLine = this.state.output[this.state.output.length - 1];
                    const spaces = 14 - (currentLine.length % 14);
                    this.state.output[this.state.output.length - 1] += ' '.repeat(spaces);
                }
            }
        });

        if (printNewline || args.trim() === '') {
            this.state.output.push('');
        }
    }

    private handleLet(args: string) {
        const match = args.match(/^([A-Z][A-Z0-9]*\$?(?:\s*\([^)]+\))?)\s*=\s*(.*)/i);
        if (!match) throw new BasicError("?SYNTAX ERROR IN LET");
        let [, varName, expr] = match;
        const value = this.evaluateExpression(expr);
        varName = varName.trim().toUpperCase();

        const arrayMatch = varName.match(/^([A-Z][A-Z0-9]*\$?)\s*\(([^)]+)\)/);
        if (arrayMatch) {
            const [, arrayName, indexStr] = arrayMatch;
            if (!this.state.arrays.has(arrayName)) throw new BasicError("?UNDEF'D ARRAY");

            const indices = indexStr.split(',').map(i => this.evaluateExpression(i) as number);
            let current = this.state.arrays.get(arrayName);
            for (let i = 0; i < indices.length - 1; i++) {
                current = current[indices[i]];
            }
            current[indices[indices.length - 1]] = value;
        } else {
             this.state.variables.set(varName, value);
        }
    }

    private handleInput(args: string) {
        const parts = args.split(';');
        let prompt = '? ';
        let varName = '';
        if (parts.length > 1) {
            prompt = this.evaluateExpression(parts[0].trim()) as string;
            varName = parts[1].trim();
        } else {
            varName = parts[0].trim();
        }
        
        if (this.state.output.length === 0) {
            this.state.output.push('');
        }
        this.state.output[this.state.output.length - 1] += prompt;
        this.state.isWaitingForInput = true;
        this.state.inputVariable = varName.toUpperCase();
    }

    public provideInput(value: string) {
        if (this.state.isWaitingForInput && this.state.inputVariable) {
            const varName = this.state.inputVariable;
            let parsedValue: string | number = value;
            if (!varName.endsWith('$') && this.state.arrays.has(varName.toUpperCase())) {
                throw new BasicError("?TYPE MISMATCH ERROR");
            } else if (this.state.arrays.has(varName.toUpperCase())) {
                // Cannot INPUT into array element directly this way, limitation for now.
                 throw new BasicError("?SYNTAX ERROR");
            }

            if (!varName.endsWith('$')) {
                parsedValue = parseFloat(value);
                if (isNaN(parsedValue)) parsedValue = 0;
            }
            this.state.variables.set(varName, parsedValue);

            this.state.isWaitingForInput = false;
            this.state.inputVariable = undefined;
            if (this.state.output.length > 0) {
              this.state.output[this.state.output.length - 1] += value;
              this.state.output.push('');
            }
            this.executeRun();
        }
    }
    
    private handleGoto(args: string) {
        const lineNumber = this.evaluateExpression(args) as number;
        if (isNaN(lineNumber) || !this.state.program.has(lineNumber)) {
            throw new BasicError(`?LINE NOT FOUND: ${lineNumber}`);
        }
        
        const lineNumbers = Array.from(this.state.program.keys()).sort((a, b) => a - b);
        const currentIndex = lineNumbers.indexOf(lineNumber);
        this.state.pc = lineNumbers[currentIndex - 1] || 0;
    }

    private handleIf(args: string) {
        const thenMatch = args.match(/(.+)\s+THEN\s+(.*)/i);
        if (!thenMatch) throw new BasicError("?SYNTAX ERROR IN IF");
        let [, condition, statement] = thenMatch;
        
        const lineNumStatement = parseInt(statement, 10);
        if (!isNaN(lineNumStatement) && String(lineNumStatement) === statement) {
            statement = `GOTO ${lineNumStatement}`;
        }
        
        const operators = /(<>|<=|>=|=|<|>)/;
        const parts = condition.split(operators);
        if (parts.length !== 3) throw new BasicError("?SYNTAX ERROR IN IF CONDITION");

        const left = this.evaluateExpression(parts[0]);
        const op = parts[1];
        const right = this.evaluateExpression(parts[2]);

        let truthy = false;
        switch (op) {
            case '=': truthy = left == right; break;
            case '<>': truthy = left != right; break;
            case '<': truthy = left < right; break;
            case '>': truthy = left > right; break;
            case '<=': truthy = left <= right; break;
            case '>=': truthy = left >= right; break;
        }

        if (truthy) {
            this.parseAndExecute(statement);
        }
    }
    private handleFor(args: string) {
        const match = args.match(/^([A-Z][A-Z0-9]*)\s*=\s*(.+)\s+TO\s+(.+?)(?:\s+STEP\s+(.+))?$/i);
        if (!match) throw new BasicError("?SYNTAX ERROR IN FOR");
        const [, varName, startExpr, endExpr, stepExpr] = match;

        const start = this.evaluateExpression(startExpr) as number;
        const end = this.evaluateExpression(endExpr) as number;
        const step = stepExpr ? this.evaluateExpression(stepExpr) as number : 1;

        this.state.variables.set(varName.toUpperCase(), start);
        this.state.loopStack.push({
            variable: varName.toUpperCase(),
            end,
            step,
            pc: this.state.pc
        });
    }

    private handleNext(args: string) {
        const varName = args.toUpperCase().split(',')[0].trim(); // Handle NEXT I,J
        if (this.state.loopStack.length === 0) throw new BasicError("?NEXT WITHOUT FOR");
        
        let loop = this.state.loopStack[this.state.loopStack.length-1];
        if (varName && varName !== loop.variable) {
            const loopIndex = this.state.loopStack.findIndex(l => l.variable === varName);
            if (loopIndex === -1) throw new BasicError(`?NEXT WITHOUT FOR FOR ${varName}`);
            this.state.loopStack.splice(loopIndex + 1);
            loop = this.state.loopStack[loopIndex];
        }

        const currentValue = (this.state.variables.get(loop.variable) as number) || 0;
        const nextValue = currentValue + loop.step;
        
        const isDone = (loop.step > 0) ? nextValue > loop.end : nextValue < loop.end;

        if (!isDone) {
            this.state.variables.set(loop.variable, nextValue);
            this.state.pc = loop.pc;
        } else {
            this.state.loopStack.pop();
        }
    }

    private handleGosub(args: string) {
        this.state.gosubStack.push(this.state.pc);
        this.handleGoto(args);
    }

    private handleReturn() {
        if(this.state.gosubStack.length === 0) throw new BasicError("?RETURN WITHOUT GOSUB");
        this.state.pc = this.state.gosubStack.pop() as number;
    }

    private handleEnd() {
        this.state.isRunning = false;
        this.state.pc = -1; // Sentinel value to stop loop
    }

    private handleDim(args: string) {
        const declarations = args.split(',');
        for (const decl of declarations) {
            const match = decl.trim().match(/^([A-Z][A-Z0-9]*\$?)\s*\(([^)]+)\)/i);
            if (!match) throw new BasicError("?SYNTAX ERROR IN DIM");
            const [, varName, dimsStr] = match;
            const dims = dimsStr.split(',').map(d => this.evaluateExpression(d) as number);

            const createArray = (dimensions: number[]): any => {
                if (dimensions.length === 0) return varName.endsWith('$') ? '' : 0;
                const size = dimensions[0] + 1; // BASIC arrays are 0-indexed up to DIM size
                const rest = dimensions.slice(1);
                return Array.from({ length: size }, () => createArray(rest));
            };
            this.state.arrays.set(varName.toUpperCase(), createArray(dims));
        }
    }

    private handleRead(args: string) {
        const varNames = args.split(',');
        for (const varNameStr of varNames) {
            const varName = varNameStr.trim().toUpperCase();
            if (this.state.dataPointer >= this.state.data.length) {
                throw new BasicError("?OUT OF DATA ERROR");
            }
            const value = this.state.data[this.state.dataPointer++];
            this.state.variables.set(varName, value);
        }
    }

    private handleRestore() {
        this.state.dataPointer = 0;
    }

    private handlePoke(args: string) {
        const parts = args.split(',');
        if (parts.length !== 2) throw new BasicError("?SYNTAX ERROR IN POKE");
        const address = this.evaluateExpression(parts[0]) as number;
        const value = this.evaluateExpression(parts[1]) as number;
        if (address < 0 || address >= 65536) throw new BasicError("?ILLEGAL QUANTITY ERROR");
        this.state.memory[address] = value & 0xFF;
    }
    
    private handleOn(args: string) {
        const gotoMatch = args.match(/(.+)\s+GOTO\s+(.+)/i);
        const gosubMatch = args.match(/(.+)\s+GOSUB\s+(.+)/i);
        const match = gotoMatch || gosubMatch;
        if (!match) throw new BasicError("?SYNTAX ERROR IN ON");

        const isGosub = !!gosubMatch;
        const [, indexExpr, linesStr] = match;
        const index = Math.round(this.evaluateExpression(indexExpr) as number);
        const lines = linesStr.split(',').map(l => parseInt(l.trim(), 10));
        
        if (index > 0 && index <= lines.length) {
            const targetLine = lines[index - 1];
            if (isGosub) {
                this.handleGosub(String(targetLine));
            } else {
                this.handleGoto(String(targetLine));
            }
        }
    }
    
    // --- File Operations ---
    private parseFilename(args: string): string {
        const match = args.match(/^"([^"]+)"$/);
        if (!match) throw new BasicError("?BAD FILE NAME");
        return match[1].toUpperCase();
    }

    private getLocalStorageKey(filename: string): string {
        return `msbasic_${filename}`;
    }

    private handleSave(args: string) {
        const filename = this.parseFilename(args);
        const programArray = Array.from(this.state.program.entries());
        localStorage.setItem(this.getLocalStorageKey(filename), JSON.stringify(programArray));
        this.state.output.push('Ready');
    }

    private handleLoad(args: string) {
        const filename = this.parseFilename(args);
        const savedProgram = localStorage.getItem(this.getLocalStorageKey(filename));
        if (!savedProgram) throw new BasicError("?FILE NOT FOUND");

        let programArray: [number, string][];
        try {
            programArray = JSON.parse(savedProgram);
             if (!Array.isArray(programArray)) {
                throw new Error("Invalid program format");
            }
        } catch (e) {
            throw new BasicError("?FILE LOAD ERROR");
        }
        
        // Only clear the state after successful parsing and validation
        this.new(); // Clears state and adds "Ready" to output
        this.state.program = new Map(programArray);
    }

    private handleFiles() {
        this.state.output.push('Saved programs:');
        let found = false;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('msbasic_')) {
                this.state.output.push(`  ${key.substring(8)}`);
                found = true;
            }
        }
        if (!found) {
            this.state.output.push('  (None)');
        }
        this.state.output.push('');
        this.state.output.push('Ready');
    }

    private handleKill(args: string) {
        const filename = this.parseFilename(args);
        const key = this.getLocalStorageKey(filename);
        if (localStorage.getItem(key)) {
            localStorage.removeItem(key);
        } else {
            throw new BasicError("?FILE NOT FOUND");
        }
        this.state.output.push('Ready');
    }
    
    private handleAuto(args: string) {
        let start = 10;
        let increment = 10;
        if (args.trim() !== '') {
            const parts = args.split(',').map(p => parseInt(p.trim(), 10));
            if (parts.some(isNaN)) throw new BasicError("?SYNTAX ERROR");
            start = parts[0] || 10;
            increment = parts[1] || 10;
        }
        this.state.isAutoMode = true;
        this.state.autoLineNumber = start;
        this.state.autoIncrement = increment;
    }


    private preScanForData() {
        this.state.data = [];
        const sortedLines = Array.from(this.state.program.entries()).sort(([a], [b]) => a - b);
        for (const [, code] of sortedLines) {
            const trimmedCode = code.trim().toUpperCase();
            if (trimmedCode.startsWith('DATA')) {
                const dataStr = code.trim().substring(4).trim();
                const values = dataStr.split(',').map(v => {
                    const val = v.trim();
                    if (val.startsWith('"') && val.endsWith('"')) {
                        return val.substring(1, val.length - 1);
                    }
                    const num = parseFloat(val);
                    return isNaN(num) ? val : num;
                });
                this.state.data.push(...values);
            }
        }
    }
    
    // --- Execution Control ---

    private printError(message: string) {
        this.state.output.push(message);
        this.state.output.push('');
        this.state.output.push('Ready');
    }

    private findNextLine(currentLine: number): number {
        const lineNumbers = Array.from(this.state.program.keys()).sort((a, b) => a - b);
        const nextLine = lineNumbers.find(ln => ln > currentLine);
        return nextLine === undefined ? -1 : nextLine;
    }

    private handleRun(args: string) {
        if (args.trim() !== '') {
            try {
                this.handleLoad(args);
                if (this.state.output[this.state.output.length - 1] === 'Ready') {
                    this.state.output.pop();
                }
            } catch (e) {
                this.state.error = e instanceof Error ? e.message : String(e);
                this.printError(this.state.error);
                return;
            }
        }
        this.executeRun();
    }

    public executeRun() {
        if (this.state.isWaitingForInput) return;
        
        if (!this.state.isRunning) {
            this.state.variables.clear();
            this.state.arrays.clear();
            this.state.loopStack = [];
            this.state.gosubStack = [];
            this.preScanForData();
            this.state.dataPointer = 0;
            this.state.pc = this.findNextLine(0);
        }
        
        this.state.isRunning = true;
        
        while (this.state.isRunning && this.state.pc !== -1) {
            const code = this.state.program.get(this.state.pc);
            if (code) {
                this.parseAndExecute(code);
                if (this.state.error) {
                    this.printError(`${this.state.error} IN ${this.state.pc}`);
                    this.state.isRunning = false;
                    return;
                }
            }
            if (this.state.isWaitingForInput) return;
            const previousPc = this.state.pc;
            if (this.state.pc === previousPc) {
                 this.state.pc = this.findNextLine(this.state.pc);
            }
        }
        
        if (this.state.isRunning) {
            this.state.isRunning = false;
            this.state.output.push('');
            this.state.output.push('Ready');
        }
    }

    public list() {
        const sortedLines = Array.from(this.state.program.entries()).sort(([a], [b]) => a - b);
        for (const [lineNumber, code] of sortedLines) {
            this.state.output.push(`${lineNumber} ${code}`);
        }
        if (sortedLines.length > 0) {
           this.state.output.push('');
        }
        this.state.output.push('Ready');
    }

    public new() {
        this.state = this.getInitialState();
        this.state.output.push('Ready');
    }
    public cls() { this.state.output = []; }
}
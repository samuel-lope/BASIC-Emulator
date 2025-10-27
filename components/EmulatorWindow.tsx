
import React, { useState, useRef, useCallback, useEffect } from 'react';
import TitleBar from './TitleBar';
import Toolbar from './Toolbar';
import Terminal from './Terminal';
import { BasicInterpreter } from '../services/basicInterpreter';
import { WELCOME_MESSAGE, FONT_FAMILIES, FONT_SIZES } from '../constants';

const EmulatorWindow: React.FC = () => {
    const [outputLines, setOutputLines] = useState<string[]>(WELCOME_MESSAGE);
    const [fontFamily, setFontFamily] = useState<string>(FONT_FAMILIES[0].value);
    const [fontSize, setFontSize] = useState<number>(16);
    const [isWaiting, setIsWaiting] = useState<boolean>(false);
    const [prompt, setPrompt] = useState<string>('>');

    const interpreterRef = useRef<BasicInterpreter>(new BasicInterpreter());

    const processCommand = (command: string) => {
        const interpreter = interpreterRef.current;
        let newOutput = [...outputLines];

        // Handle echoing logic
        if (interpreter.state.isWaitingForInput) {
            // No separate echo line; provideInput appends to the current line.
        } else if (interpreter.state.isAutoMode && command.trim() !== '') {
            // No echo for new lines in AUTO mode.
        } else {
            newOutput.push(`${prompt}${command}`);
        }

        // Process the command
        if (interpreter.state.isWaitingForInput) {
            interpreter.provideInput(command);
        } else {
            interpreter.processLine(command);
        }

        const state = interpreter.state;
        newOutput.push(...state.output);
        state.output = []; // Clear interpreter buffer

        // Update UI state
        setOutputLines(newOutput);
        setIsWaiting(state.isWaitingForInput);

        // Update prompt for the next input
        if (state.isAutoMode) {
            setPrompt(`${state.autoLineNumber} `);
        } else {
            setPrompt('>');
        }
    };

    const handleClear = () => {
        interpreterRef.current.cls();
        setOutputLines([]);
    };

    const handleReset = () => {
        interpreterRef.current.new();
        setPrompt('>');
        setOutputLines([
            ...WELCOME_MESSAGE.slice(0, WELCOME_MESSAGE.length-1),
            ...interpreterRef.current.state.output
        ]);
        interpreterRef.current.state.output = [];
    };

    return (
        <div 
            className="w-full max-w-4xl h-[80vh] bg-[#C0C0C0] shadow-2xl rounded-lg border-2 border-t-white border-l-white border-r-black border-b-black flex flex-col"
            style={{ fontFamily: fontFamily, fontSize: `${fontSize}px` }}
        >
            <TitleBar title="MS-BASIC Emulator" />
            <Toolbar 
                fontFamily={fontFamily}
                fontSize={fontSize}
                onFontFamilyChange={setFontFamily}
                onFontSizeChange={setFontSize}
                onClear={handleClear}
                onReset={handleReset}
            />
            <div className="flex-grow p-1 bg-black overflow-hidden">
                <Terminal 
                    outputLines={outputLines} 
                    onCommand={processCommand}
                    isWaitingForInput={isWaiting}
                    prompt={prompt}
                />
            </div>
        </div>
    );
};

export default EmulatorWindow;
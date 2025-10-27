
import React, { useState, useEffect, useRef } from 'react';

interface TerminalProps {
  outputLines: string[];
  onCommand: (command: string) => void;
  isWaitingForInput: boolean;
  prompt: string;
}

const BlinkingCursor: React.FC = () => {
    return (
        <span className="bg-gray-200 w-[8px] h-[1.2em] inline-block animate-pulse"></span>
    );
};

const Terminal: React.FC<TerminalProps> = ({ outputLines, onCommand, isWaitingForInput, prompt }) => {
    const [inputValue, setInputValue] = useState('');
    const endOfOutputRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        endOfOutputRef.current?.scrollIntoView({ behavior: 'auto' });
    }, [outputLines]);
    
    useEffect(() => {
        inputRef.current?.focus();
    }, [isWaitingForInput]);

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onCommand(inputValue);
        setInputValue('');
    };
    
    const handleTerminalClick = () => {
        inputRef.current?.focus();
    };

    return (
        <div 
            className="w-full h-full bg-[#012456] text-gray-200 p-2 overflow-y-auto"
            onClick={handleTerminalClick}
        >
            {outputLines.map((line, index) => (
                <div key={index} dangerouslySetInnerHTML={{ __html: line.replace(/ /g, '&nbsp;') || '&nbsp;' }} />
            ))}
            
            <form onSubmit={handleFormSubmit} className="flex">
                {!isWaitingForInput && <span className="mr-1">{prompt}</span>}
                <div className="relative flex-grow">
                     <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="bg-transparent border-none outline-none text-gray-200 w-full"
                        autoCapitalize="off"
                        autoCorrect="off"
                        autoComplete="off"
                        spellCheck="false"
                        autoFocus
                    />
                </div>
                 <BlinkingCursor />
            </form>
            <div ref={endOfOutputRef} />
        </div>
    );
};

export default Terminal;
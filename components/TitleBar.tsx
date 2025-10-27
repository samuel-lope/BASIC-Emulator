
import React from 'react';

interface TitleBarProps {
  title: string;
}

const WindowButton: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="w-5 h-5 bg-[#C0C0C0] border border-t-white border-l-white border-r-black border-b-black flex items-center justify-center text-black font-bold text-xs shadow-sm ml-1">
        {children}
    </div>
);

const TitleBar: React.FC<TitleBarProps> = ({ title }) => {
  return (
    <div className="bg-gradient-to-b from-[#0058d0] to-[#1888e8] text-white p-1 flex items-center justify-between select-none cursor-default h-7 flex-shrink-0">
      <span className="font-bold text-sm pl-2">{title}</span>
      <div className="flex items-center">
        <WindowButton>
            <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 5 L8 5"></path></svg>
        </WindowButton>
        <WindowButton>
            <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"><rect x="1.5" y="1.5" width="7" height="7"></rect></svg>
        </WindowButton>
        <WindowButton>
            <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="butt"><path d="M2 2 L8 8 M2 8 L8 2"></path></svg>
        </WindowButton>
      </div>
    </div>
  );
};

export default TitleBar;

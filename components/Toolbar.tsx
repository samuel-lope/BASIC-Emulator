
import React from 'react';
import { FONT_FAMILIES, FONT_SIZES } from '../constants';

interface ToolbarProps {
  fontFamily: string;
  fontSize: number;
  onFontFamilyChange: (font: string) => void;
  onFontSizeChange: (size: number) => void;
  onClear: () => void;
  onReset: () => void;
}

const ToolbarButton: React.FC<{ onClick: () => void, children: React.ReactNode }> = ({ onClick, children }) => (
    <button
        onClick={onClick}
        className="px-2 py-0.5 bg-[#C0C0C0] border border-t-white border-l-white border-r-black border-b-black active:border-t-black active:border-l-black active:border-r-white active:border-b-white text-black text-sm"
    >
        {children}
    </button>
);

const Toolbar: React.FC<ToolbarProps> = ({
  fontFamily,
  fontSize,
  onFontFamilyChange,
  onFontSizeChange,
  onClear,
  onReset,
}) => {
  return (
    <div className="bg-[#C0C0C0] p-1 flex items-center gap-4 text-black text-sm flex-shrink-0 border-b-2 border-b-gray-400">
      <div>
        <label htmlFor="font-family" className="mr-2">Font:</label>
        <select
          id="font-family"
          value={fontFamily}
          onChange={(e) => onFontFamilyChange(e.target.value)}
          className="bg-white border border-gray-500"
        >
          {FONT_FAMILIES.map(font => (
            <option key={font.name} value={font.value}>{font.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="font-size" className="mr-2">Size:</label>
        <select
          id="font-size"
          value={fontSize}
          onChange={(e) => onFontSizeChange(Number(e.target.value))}
          className="bg-white border border-gray-500"
        >
          {FONT_SIZES.map(size => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <ToolbarButton onClick={onClear}>Clear Screen</ToolbarButton>
        <ToolbarButton onClick={onReset}>Reset (NEW)</ToolbarButton>
      </div>
    </div>
  );
};

export default Toolbar;


import React, { useState } from 'react';
import EmulatorWindow from './components/EmulatorWindow';

function App() {
  return (
    <div className="min-h-screen bg-[#3a6ea5] flex items-center justify-center p-4 font-mono">
      <EmulatorWindow />
    </div>
  );
}

export default App;

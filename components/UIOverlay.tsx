
import React from 'react';
import { GameState } from '../types';

interface UIOverlayProps {
  gameState: GameState;
  noiseLevel: number;
  targetItem: string;
  onStart: () => void;
  onRestart: () => void;
  onPause: () => void;
  onResume: () => void;
}

export const UIOverlay: React.FC<UIOverlayProps> = ({ 
  gameState, 
  noiseLevel, 
  targetItem, 
  onStart, 
  onRestart,
  onPause,
  onResume
}) => {
  if (gameState === GameState.START) {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="max-w-md p-8 text-center bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl">
          <h1 className="text-4xl font-black text-red-600 mb-4 tracking-tighter">A QUIET PLACE</h1>
          <p className="text-zinc-400 mb-6">You are trapped in an abandoned mansion. A blind entity stalks these halls. It cannot see, but it hears everything.</p>
          <div className="text-sm text-zinc-500 mb-8 space-y-2 text-left bg-black/30 p-4 rounded-lg">
            <p>⌨️ <span className="text-zinc-300">Arrow Keys</span> to Move</p>
            <p>⚡ <span className="text-zinc-300">Shift</span> to Sprint (Very Loud!)</p>
            <p>🤫 <span className="text-zinc-300">Ctrl</span> to Sneak (Silent)</p>
            <p>🔎 <span className="text-zinc-300">Space</span> to Search Cabinets</p>
            <p>⚠️ <span className="text-red-500/80 font-bold">Don't hit walls or furniture!</span></p>
          </div>
          <button 
            onClick={onStart}
            className="w-full py-3 px-6 bg-red-700 hover:bg-red-600 text-white font-bold rounded-lg transition-all transform active:scale-95 shadow-lg shadow-red-900/20"
          >
            ENTER THE DARKNESS
          </button>
        </div>
      </div>
    );
  }

  if (gameState === GameState.PAUSED) {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="max-w-xs p-8 text-center bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl">
          <h2 className="text-2xl font-black text-white mb-6 tracking-widest uppercase">GAME PAUSED</h2>
          <div className="space-y-4">
            <button 
              onClick={onResume}
              className="w-full py-3 px-6 bg-white text-black font-bold rounded-lg transition-all transform active:scale-95 shadow-lg"
            >
              RESUME
            </button>
            <button 
              onClick={onRestart}
              className="w-full py-2 px-6 bg-zinc-800 text-zinc-400 hover:text-white font-bold rounded-lg transition-all"
            >
              QUIT TO MENU
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === GameState.GAME_OVER) {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-red-950/40 backdrop-blur-md">
        <div className="p-12 text-center bg-zinc-900 border-2 border-red-900 rounded-2xl shadow-2xl animate-pulse">
          <h2 className="text-6xl font-black text-red-600 mb-4">CAUGHT</h2>
          <p className="text-zinc-400 mb-8 uppercase tracking-widest font-bold">You made too much noise.</p>
          <button 
            onClick={onRestart}
            className="px-8 py-3 bg-white text-black font-black rounded-full hover:bg-zinc-200 transition-colors"
          >
            TRY AGAIN
          </button>
        </div>
      </div>
    );
  }

  if (gameState === GameState.VICTORY) {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-900/90 backdrop-blur-lg">
        <div className="p-12 text-center">
          <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(16,185,129,0.4)]">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-zinc-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
             </svg>
          </div>
          <h2 className="text-6xl font-black text-emerald-500 mb-4">ESCAPED</h2>
          <p className="text-zinc-400 mb-8">You found the <span className="text-white font-bold italic">{targetItem}</span> and left silently.</p>
          <button 
            onClick={onRestart}
            className="px-8 py-3 bg-emerald-600 text-white font-black rounded-full hover:bg-emerald-500 transition-all shadow-lg"
          >
            PLAY AGAIN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
      <div className="flex justify-between items-start">
        <div className="bg-black/60 backdrop-blur-md p-4 rounded-lg border border-white/10 shadow-xl">
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 font-bold">Find the treasure</p>
          <h3 className="text-xl font-black text-white uppercase tracking-tight">
            <span className="text-red-500 underline decoration-red-900/50 italic">{targetItem}</span>
          </h3>
        </div>

        {/* Right HUD Column containing Sound Meter and Pause Bar */}
        <div className="flex flex-col gap-2 items-end">
          {/* Sound Level Box */}
          <div className="w-64 bg-black/60 backdrop-blur-md p-4 rounded-lg border border-white/10 shadow-xl">
            <div className="flex justify-between mb-2">
              <span className="text-[10px] text-zinc-400 uppercase tracking-[0.2em] font-bold">Sound Level</span>
              <span className={`text-xs font-black tabular-nums ${noiseLevel > 70 ? 'text-red-500 animate-pulse' : 'text-zinc-200'}`}>
                {Math.round(noiseLevel)}%
              </span>
            </div>
            <div className="h-3 w-full bg-zinc-800/50 rounded-full overflow-hidden border border-white/5 p-[1px]">
              <div 
                className={`h-full rounded-full transition-all duration-150 ease-out shadow-inner ${
                  noiseLevel > 75 ? 'bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.8)]' : 
                  noiseLevel > 40 ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.4)]' : 
                  'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                }`}
                style={{ width: `${noiseLevel}%` }}
              />
            </div>
          </div>

          {/* Pause Bar - Relocated below sound bar level */}
          <div className="pointer-events-auto w-64">
            <button 
              onClick={onPause}
              className="group w-full flex items-center justify-center gap-3 bg-black/40 hover:bg-black/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/10 transition-all shadow-lg"
            >
              <div className="flex gap-1.5">
                <div className="w-1 h-3 bg-zinc-500 group-hover:bg-white transition-colors"></div>
                <div className="w-1 h-3 bg-zinc-500 group-hover:bg-white transition-colors"></div>
              </div>
              <span className="text-[10px] text-zinc-500 group-hover:text-white uppercase tracking-[0.3em] font-black">Pause</span>
            </button>
          </div>
        </div>
      </div>

      <div className="text-center text-[10px] text-zinc-500 uppercase tracking-[0.4em] opacity-40 font-bold mb-4">
        Stay Silent. Stay Alive.
      </div>
    </div>
  );
};


import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { MainScene } from './game/scenes/MainScene';
import { UIOverlay } from './components/UIOverlay';
import { GameState } from './types';
import { audioService } from './services/AudioManager';

const App: React.FC = () => {
  const gameRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [noiseLevel, setNoiseLevel] = useState(0);
  const [targetItem, setTargetItem] = useState('');
  const phaserInstance = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!gameRef.current || phaserInstance.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: gameRef.current,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false
        }
      },
      scene: [MainScene],
      backgroundColor: '#050505'
    };

    const game = new Phaser.Game(config);
    phaserInstance.current = game;

    // Listen to scene events
    game.events.on('ready', () => {
      const scene = game.scene.getScene('MainScene') as MainScene;
      
      scene.events.on('noiseUpdate', (level: number) => {
        setNoiseLevel(level);
        audioService.setAmbientIntensity(level);
      });

      scene.events.on('itemUpdate', (name: string) => {
        setTargetItem(name);
      });

      scene.events.on('gameStateChange', (state: GameState) => {
        setGameState(state);
        if (state === GameState.GAME_OVER) {
          game.scene.pause('MainScene');
        }
      });
    });

    return () => {
      game.destroy(true);
      phaserInstance.current = null;
    };
  }, []);

  const handleStart = () => {
    audioService.init();
    setGameState(GameState.PLAYING);
    if (phaserInstance.current) {
      phaserInstance.current.scene.resume('MainScene');
    }
  };

  const handlePause = () => {
    if (gameState !== GameState.PLAYING) return;
    setGameState(GameState.PAUSED);
    if (phaserInstance.current) {
      phaserInstance.current.scene.pause('MainScene');
    }
  };

  const handleResume = () => {
    if (gameState !== GameState.PAUSED) return;
    setGameState(GameState.PLAYING);
    if (phaserInstance.current) {
      phaserInstance.current.scene.resume('MainScene');
    }
  };

  const handleRestart = () => {
    setGameState(GameState.START);
    setNoiseLevel(0);
    if (phaserInstance.current) {
      const scene = phaserInstance.current.scene.getScene('MainScene');
      if (scene) {
        // Restart the scene. MainScene's create() calls this.scene.pause(), 
        // so it will wait for the user to click "ENTER THE DARKNESS" again.
        scene.scene.restart();
      }
    }
  };

  return (
    <div className="relative w-screen h-screen flex items-center justify-center bg-black overflow-hidden select-none">
      <div 
        ref={gameRef} 
        className={`rounded-lg overflow-hidden border-4 border-zinc-900 shadow-2xl transition-all duration-1000 ${
          gameState === GameState.PLAYING ? 'scale-100 blur-0' : 'scale-110 blur-sm'
        }`}
      />
      
      <UIOverlay 
        gameState={gameState}
        noiseLevel={noiseLevel}
        targetItem={targetItem}
        onStart={handleStart}
        onRestart={handleRestart}
        onPause={handlePause}
        onResume={handleResume}
      />

      <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-red-950/20 text-[10px] text-red-500/50 uppercase tracking-[0.2em] font-bold border border-red-500/10">
        Experimental Horror Engine v1.0
      </div>
    </div>
  );
};

export default App;

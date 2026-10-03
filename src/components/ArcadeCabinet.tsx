import React, { useEffect, useRef, useState, useCallback } from 'react';
import { DanmakuEngine, InputState } from '../game/danmakuEngine';
import { GameSettings, GameStats, GameState, ShipType } from '../types/game';
import { SHIPS } from '../game/ships';
import { sound } from '../audio/soundSystem';
import { getLeaderboard, saveLeaderboardEntry, getRankGrade } from '../utils/leaderboard';
import { TouchControls } from './TouchControls';
import { 
  Volume2, 
  VolumeX, 
  HelpCircle, 
  Trophy, 
  Settings, 
  RotateCcw, 
  Play, 
  Pause, 
  Gamepad2, 
  MousePointer, 
  Flame, 
  ShieldAlert, 
  Zap, 
  Sparkles,
  ChevronRight,
  X
} from 'lucide-react';

export const ArcadeCabinet: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<DanmakuEngine | null>(null);
  const requestRef = useRef<number | null>(null);

  // High-level Game State
  const [gameState, setGameState] = useState<GameState>('TITLE');
  const gameStateRef = useRef<GameState>('TITLE');
  const [selectedShip, setSelectedShip] = useState<ShipType>('TYPE_A');

  const setAppState = useCallback((nextState: GameState) => {
    gameStateRef.current = nextState;
    setGameState(nextState);
  }, []);

  // Stats state from engine
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    highScore: 0,
    chain: 0,
    maxChain: 0,
    chainTimer: 0,
    maxChainTimer: 180,
    graze: 0,
    lives: 3,
    maxLives: 5,
    bombs: 2,
    maxBombs: 4,
    powerLevel: 1,
    stage: 1,
    bossHpPercent: null,
    bossName: null,
    warningActive: false,
  });

  // Settings
  const [settings, setSettings] = useState<GameSettings>({
    soundEnabled: true,
    bgmEnabled: true,
    sfxVolume: 0.8,
    bgmVolume: 0.45,
    crtScanlines: true,
    screenShake: true,
    mouseControl: false,
    autoFire: true, // Default to true for instant action
  });

  // Active Modals
  const [showGuide, setShowGuide] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTouchControls, setShowTouchControls] = useState(false);

  // Input states
  const inputsRef = useRef<InputState>({
    left: false,
    right: false,
    up: false,
    down: false,
    shoot: false,
    focus: false,
    bomb: false,
    isMouseDown: false,
  });

  // Detect touch device on mount
  useEffect(() => {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouch) {
      setShowTouchControls(true);
    }
  }, []);

  // Sync settings with engine & audio
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.settings = settings;
    }
    sound.setVolumes(
      settings.soundEnabled ? settings.sfxVolume : 0,
      settings.soundEnabled && settings.bgmEnabled ? settings.bgmVolume : 0,
      !settings.soundEnabled
    );
  }, [settings]);

  // Handle Game Over
  const handleGameOver = useCallback((finalStats: GameStats) => {
    setAppState('GAMEOVER');
    saveLeaderboardEntry(
      finalStats.score,
      selectedShip,
      finalStats.maxChain,
      finalStats.graze,
      finalStats.stage
    );
  }, [selectedShip, setAppState]);

  // Handle Victory
  const handleVictory = useCallback((finalStats: GameStats) => {
    setAppState('VICTORY');
    saveLeaderboardEntry(
      finalStats.score,
      selectedShip,
      finalStats.maxChain,
      finalStats.graze,
      finalStats.stage
    );
  }, [selectedShip, setAppState]);

  // Initialize Canvas & Engine
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    
    const engine = new DanmakuEngine(
      canvas,
      (newStats) => setStats(newStats),
      handleGameOver,
      handleVictory
    );
    engine.settings = settings;
    engineRef.current = engine;

    // Game Loop - ALWAYS uses gameStateRef.current to avoid stale closures
    const loop = () => {
      if (engineRef.current) {
        if (gameStateRef.current === 'PLAYING') {
          engineRef.current.update(inputsRef.current);
        }
        engineRef.current.render(inputsRef.current);
      }
      requestRef.current = requestAnimationFrame(loop);
    };

    requestRef.current = requestAnimationFrame(loop);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      sound.stopBgm();
    };
  }, [handleGameOver, handleVictory]);

  // Start game action
  const startGame = useCallback((ship: ShipType = selectedShip) => {
    sound.init();
    if (settings.soundEnabled && settings.bgmEnabled) {
      sound.startBgm();
    }
    setSelectedShip(ship);
    if (engineRef.current) {
      engineRef.current.resetGame(ship, 1);
    }
    setAppState('PLAYING');
  }, [selectedShip, settings.soundEnabled, settings.bgmEnabled, setAppState]);

  // Keyboard Event Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      sound.init();
      const code = e.code;
      const key = e.key.toLowerCase();

      // Prevent window scrolling on game navigation keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) {
        e.preventDefault();
      }

      if (code === 'ArrowLeft' || key === 'a' || code === 'KeyA') inputsRef.current.left = true;
      if (code === 'ArrowRight' || key === 'd' || code === 'KeyD') inputsRef.current.right = true;
      if (code === 'ArrowUp' || key === 'w' || code === 'KeyW') inputsRef.current.up = true;
      if (code === 'ArrowDown' || key === 's' || code === 'KeyS') inputsRef.current.down = true;

      // Shot
      if (code === 'KeyZ' || key === 'j' || code === 'KeyJ' || code === 'Space') {
        inputsRef.current.shoot = true;
      }
      // Focus / Laser
      if (code === 'ShiftLeft' || code === 'ShiftRight' || key === 'shift') {
        inputsRef.current.focus = true;
      }
      // Bomb
      if (code === 'KeyX' || key === 'k' || code === 'KeyK') {
        inputsRef.current.bomb = true;
      }
      // Autofire toggle
      if (code === 'KeyC') {
        setSettings(prev => ({ ...prev, autoFire: !prev.autoFire }));
      }
      // Restart on Game Over
      if (key === 'r' && (gameStateRef.current === 'GAMEOVER' || gameStateRef.current === 'VICTORY')) {
        startGame();
      }
      // Pause
      if (code === 'Escape' && (gameStateRef.current === 'PLAYING' || gameStateRef.current === 'PAUSED')) {
        setAppState(gameStateRef.current === 'PLAYING' ? 'PAUSED' : 'PLAYING');
      }
      // Enter / Start on Title
      if ((code === 'Enter' || code === 'Space' || code === 'KeyZ') && gameStateRef.current === 'TITLE') {
        startGame();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      const key = e.key.toLowerCase();

      if (code === 'ArrowLeft' || key === 'a' || code === 'KeyA') inputsRef.current.left = false;
      if (code === 'ArrowRight' || key === 'd' || code === 'KeyD') inputsRef.current.right = false;
      if (code === 'ArrowUp' || key === 'w' || code === 'KeyW') inputsRef.current.up = false;
      if (code === 'ArrowDown' || key === 's' || code === 'KeyS') inputsRef.current.down = false;

      if (code === 'KeyZ' || key === 'j' || code === 'KeyJ' || code === 'Space') {
        inputsRef.current.shoot = false;
      }
      if (code === 'ShiftLeft' || code === 'ShiftRight' || key === 'shift') {
        inputsRef.current.focus = false;
      }
      if (code === 'KeyX' || key === 'k' || code === 'KeyK') {
        inputsRef.current.bomb = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [startGame, setAppState]);

  // Mouse Control Handlers on Canvas
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!settings.mouseControl || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    inputsRef.current.mouseX = (e.clientX - rect.left) * scaleX;
    inputsRef.current.mouseY = (e.clientY - rect.top) * scaleY;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    sound.init();
    if (gameStateRef.current === 'TITLE') {
      startGame();
      return;
    }
    if (e.button === 0) {
      inputsRef.current.isMouseDown = true;
    } else if (e.button === 2) {
      // Right click triggers bomb
      e.preventDefault();
      inputsRef.current.bomb = true;
      setTimeout(() => { inputsRef.current.bomb = false; }, 100);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      inputsRef.current.isMouseDown = false;
    }
  };

  // Touch handlers for TouchControls component
  const handleTouchMoveChange = (dx: number, dy: number) => {
    const threshold = 0.2;
    inputsRef.current.left = dx < -threshold;
    inputsRef.current.right = dx > threshold;
    inputsRef.current.up = dy < -threshold;
    inputsRef.current.down = dy > threshold;
  };

  const handleTouchShootChange = (isShooting: boolean) => {
    inputsRef.current.shoot = isShooting;
  };

  const handleTouchFocusChange = (isFocusing: boolean) => {
    inputsRef.current.focus = isFocusing;
  };

  const handleTouchBombPress = () => {
    inputsRef.current.bomb = true;
    setTimeout(() => { inputsRef.current.bomb = false; }, 80);
  };

  return (
    <div className="min-h-screen bg-[#07070b] text-neutral-100 flex flex-col items-center justify-center p-2 md:p-6 select-none font-mono">
      {/* Top Arcade Header Bar */}
      <header className="w-full max-w-5xl flex items-center justify-between pb-3 mb-2 border-b border-neutral-800 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
          <span className="font-bold text-sm tracking-widest text-red-500 glow-red">
            怒首領蜂 DODONPACHI
          </span>
          <span className="hidden sm:inline-block text-neutral-500">·</span>
          <span className="hidden sm:inline-block text-neutral-400">CAVE DANMAKU TRIBUTE</span>
        </div>

        {/* Global Controls & Modals */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const next = !settings.soundEnabled;
              setSettings(prev => ({ ...prev, soundEnabled: next }));
              if (next && settings.bgmEnabled) sound.startBgm();
              else sound.stopBgm();
            }}
            title="音效切換"
            className="p-1.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 transition-colors"
          >
            {settings.soundEnabled ? <Volume2 size={16} className="text-cyan-400" /> : <VolumeX size={16} className="text-neutral-500" />}
          </button>

          <button
            onClick={() => setShowGuide(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 transition-colors"
          >
            <HelpCircle size={14} className="text-amber-400" />
            <span className="text-xs">心法指南</span>
          </button>

          <button
            onClick={() => setShowLeaderboard(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 transition-colors"
          >
            <Trophy size={14} className="text-yellow-400" />
            <span className="text-xs">排行榜</span>
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="p-1.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 transition-colors"
            title="遊戲設定"
          >
            <Settings size={16} />
          </button>
        </div>
      </header>

      {/* Main Arcade Housing */}
      <div className="relative flex flex-col lg:flex-row items-center justify-center gap-4 bg-gradient-to-b from-[#161622] to-[#0c0c14] border-2 border-neutral-700 rounded-2xl p-3 md:p-5 arcade-glow max-w-5xl w-full">
        
        {/* Game Monitor Screen (Tate Ratio: 520x720) */}
        <div className="relative w-full max-w-[520px] aspect-[520/720] bg-black border-2 border-neutral-600 rounded-lg overflow-hidden shadow-2xl flex items-center justify-center">
          
          <canvas
            ref={canvasRef}
            width={520}
            height={720}
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onContextMenu={(e) => e.preventDefault()}
            className="w-full h-full block cursor-crosshair"
          />

          {/* CRT Scanline Filter Overlay */}
          {settings.crtScanlines && (
            <div className="absolute inset-0 crt-scanlines z-10 pointer-events-none opacity-90" />
          )}

          {/* CRT Glass Vignette & Reflection */}
          <div className="absolute inset-0 crt-vignette z-10 pointer-events-none" />

          {/* Boss HP Bar Overlay during Play */}
          {stats.bossHpPercent !== null && gameState === 'PLAYING' && (
            <div className="absolute top-2 inset-x-4 z-20 bg-black/80 p-2 rounded border border-red-500/50 backdrop-blur-sm">
              <div className="flex justify-between items-center text-[11px] mb-1">
                <span className="text-red-400 font-bold tracking-wider">{stats.bossName}</span>
                <span className="text-yellow-400 font-bold">{Math.ceil(stats.bossHpPercent)}%</span>
              </div>
              <div className="w-full h-2.5 bg-neutral-900 rounded overflow-hidden border border-neutral-700">
                <div 
                  className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400 transition-all duration-100"
                  style={{ width: `${Math.max(0, stats.bossHpPercent)}%` }}
                />
              </div>
            </div>
          )}

          {/* --- TITLE SCREEN OVERLAY --- */}
          {gameState === 'TITLE' && (
            <div className="absolute inset-0 z-30 bg-black/85 flex flex-col items-center justify-between p-6 text-center backdrop-blur-sm">
              <div className="pt-8">
                <div className="inline-block px-3 py-1 mb-2 bg-red-950/60 border border-red-500/40 rounded text-[11px] text-red-400 tracking-widest uppercase">
                  CAVE Danmaku Homage
                </div>
                <h1 className="text-5xl md:text-6xl font-black text-red-500 glow-red tracking-wider font-mono">
                  怒首領蜂
                </h1>
                <div className="text-sm font-bold tracking-widest text-cyan-400 glow-cyan mt-1">
                  DODONPACHI - DANMAKU HELL
                </div>
                <p className="text-xs text-neutral-400 mt-3 max-w-xs mx-auto leading-relaxed">
                  極限 2.5px 微操判定 · 擦彈火花倍率 · 萬花筒幾何彈幕
                </p>
              </div>

              {/* Start Action */}
              <div className="flex flex-col gap-3 w-full max-w-xs">
                <button
                  onClick={() => startGame()}
                  className="w-full py-4 px-6 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white font-black text-base tracking-widest shadow-xl shadow-red-600/50 border border-red-400 transition-all flex items-center justify-center gap-2 group animate-pulse cursor-pointer"
                >
                  <Play size={20} fill="white" />
                  <span>立即開始 (PLAY NOW)</span>
                  <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setAppState('SHIP_SELECT')}
                    className="py-2.5 px-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 font-bold text-xs border border-neutral-700 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>選擇自機</span>
                    <span className="text-[10px] text-red-400 font-mono">
                      {selectedShip === 'TYPE_A' ? '[赤]' : selectedShip === 'TYPE_B' ? '[綠]' : '[藍]'}
                    </span>
                  </button>

                  <button
                    onClick={() => setShowGuide(true)}
                    className="py-2.5 px-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 font-bold text-xs border border-neutral-700 transition-colors cursor-pointer"
                  >
                    微操指南
                  </button>
                </div>
              </div>

              {/* Footer Credits */}
              <div className="text-[11px] text-neutral-400 pb-2 flex flex-col items-center gap-1">
                <span className="text-yellow-400 font-bold">點擊畫面或按 [空白鍵 / ENTER] 立即出擊</span>
                <span className="text-neutral-500 text-[10px]">支援鍵盤 (WASD/Z/Shift/X) · 滑鼠微操 · 手機觸控</span>
              </div>
            </div>
          )}

          {/* --- SHIP SELECT SCREEN OVERLAY --- */}
          {gameState === 'SHIP_SELECT' && (
            <div className="absolute inset-0 z-30 bg-black/90 flex flex-col justify-between p-6 backdrop-blur-md">
              <div>
                <div className="text-center mb-4">
                  <div className="text-[11px] text-red-400 tracking-widest">SELECT FIGHTER</div>
                  <h2 className="text-2xl font-black text-white glow-cyan">自機選擇</h2>
                </div>

                {/* Ship Cards */}
                <div className="flex flex-col gap-3">
                  {(Object.keys(SHIPS) as ShipType[]).map((st) => {
                    const ship = SHIPS[st];
                    const isSelected = selectedShip === st;
                    return (
                      <button
                        key={st}
                        onClick={() => setSelectedShip(st)}
                        className={`text-left p-3.5 rounded-xl border-2 transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-neutral-900/90 border-red-500 shadow-lg shadow-red-500/20'
                            : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Ship Color Orb */}
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center border"
                            style={{ backgroundColor: `${ship.color}22`, borderColor: ship.color }}
                          >
                            <div 
                              className="w-4 h-4 rounded-sm transform rotate-45 shadow-sm"
                              style={{ backgroundColor: ship.color }}
                            />
                          </div>
                          <div>
                            <div className="text-sm font-black text-white">{ship.name}</div>
                            <div className="text-[11px] text-cyan-400 font-bold">{ship.subName}</div>
                            <div className="text-[10px] text-neutral-400 mt-0.5 line-clamp-1">{ship.description}</div>
                          </div>
                        </div>

                        <div className="text-right text-xs">
                          <span className="text-[10px] text-neutral-500 block">SPEED</span>
                          <span className="font-bold text-yellow-400">{ship.speed.toFixed(1)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Start Button */}
              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => setAppState('TITLE')}
                  className="flex-1 py-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-bold text-neutral-400 cursor-pointer"
                >
                  返回
                </button>
                <button
                  onClick={() => startGame(selectedShip)}
                  className="flex-2 py-3 rounded-lg bg-red-600 hover:bg-red-500 active:scale-95 text-white font-black text-xs tracking-wider shadow-lg shadow-red-600/40 border border-red-400 transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Play size={16} fill="white" />
                  <span>啟動任務 (LAUNCH)</span>
                </button>
              </div>
            </div>
          )}

          {/* --- PAUSE OVERLAY --- */}
          {gameState === 'PAUSED' && (
            <div className="absolute inset-0 z-30 bg-black/80 flex flex-col items-center justify-center p-6 backdrop-blur-sm">
              <h3 className="text-3xl font-black text-yellow-400 glow-gold mb-6">MISSION PAUSED</h3>
              <div className="flex flex-col gap-3 w-48">
                <button
                  onClick={() => setAppState('PLAYING')}
                  className="py-2.5 px-4 rounded bg-cyan-600 hover:bg-cyan-500 font-bold text-xs tracking-wider text-black transition-colors cursor-pointer"
                >
                  繼續戰鬥 (RESUME)
                </button>
                <button
                  onClick={() => startGame()}
                  className="py-2.5 px-4 rounded bg-neutral-800 hover:bg-neutral-700 font-bold text-xs tracking-wider text-neutral-200 border border-neutral-600 transition-colors cursor-pointer"
                >
                  重新開始 (RETRY)
                </button>
                <button
                  onClick={() => {
                    sound.stopBgm();
                    setAppState('TITLE');
                  }}
                  className="py-2.5 px-4 rounded bg-neutral-900 hover:bg-neutral-800 font-bold text-xs tracking-wider text-neutral-400 border border-neutral-800 transition-colors cursor-pointer"
                >
                  標題畫面 (TITLE)
                </button>
              </div>
            </div>
          )}

          {/* --- GAME OVER OVERLAY --- */}
          {gameState === 'GAMEOVER' && (
            <div className="absolute inset-0 z-30 bg-black/90 flex flex-col items-center justify-between p-6 text-center backdrop-blur-md">
              <div className="pt-6">
                <div className="text-red-500 font-black text-4xl glow-red mb-1">擊墜 · GAME OVER</div>
                <div className="text-xs text-neutral-400 tracking-wider">ALL SHIPS DESTROYED</div>
              </div>

              {/* Evaluation Card */}
              <div className="w-full max-w-xs bg-neutral-900/80 border border-neutral-700 rounded-xl p-4 text-left space-y-2.5 shadow-xl">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-400">FINAL SCORE</span>
                  <span className="text-cyan-300 font-bold text-base glow-cyan">{stats.score.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-400">MAX HIT CHAIN</span>
                  <span className="text-yellow-400 font-bold">{stats.maxChain} HIT</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-400">GRAZE (擦彈數)</span>
                  <span className="text-pink-400 font-bold">{stats.graze} 次</span>
                </div>
                <div className="flex justify-between items-center text-xs border-t border-neutral-800 pt-2">
                  <span className="text-neutral-400">COMBAT RANK</span>
                  <span className="text-2xl font-black text-red-500 glow-red">
                    {getRankGrade(stats.score, stats.graze, stats.maxChain)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2 w-full max-w-xs pb-4">
                <button
                  onClick={() => startGame()}
                  className="w-full py-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-black text-xs tracking-wider shadow-lg shadow-red-600/40 border border-red-400 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw size={16} />
                  <span>再次挑戰 [ R 鍵 ]</span>
                </button>
                <button
                  onClick={() => {
                    sound.stopBgm();
                    setAppState('TITLE');
                  }}
                  className="w-full py-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-400 font-bold text-xs cursor-pointer"
                >
                  返回標題
                </button>
              </div>
            </div>
          )}

          {/* --- VICTORY OVERLAY --- */}
          {gameState === 'VICTORY' && (
            <div className="absolute inset-0 z-30 bg-black/90 flex flex-col items-center justify-between p-6 text-center backdrop-blur-md">
              <div className="pt-6">
                <div className="inline-block px-3 py-1 bg-yellow-950/80 border border-yellow-500/50 rounded text-yellow-400 text-xs font-bold mb-2">
                  MISSION ACCOMPLISHED
                </div>
                <div className="text-amber-400 font-black text-3xl md:text-4xl glow-gold mb-1">
                  全領域彈幕壓制！
                </div>
                <div className="text-xs text-neutral-300">緋蜂要塞全面癱瘓 · 頂尖彈幕大師</div>
              </div>

              <div className="w-full max-w-xs bg-neutral-900/80 border border-yellow-600/50 rounded-xl p-4 text-left space-y-2.5 shadow-xl">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-400">TOTAL SCORE</span>
                  <span className="text-yellow-300 font-bold text-lg glow-gold">{stats.score.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-400">MAX HIT CHAIN</span>
                  <span className="text-yellow-400 font-bold">{stats.maxChain} HIT</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-400">GRAZE COUNT</span>
                  <span className="text-pink-400 font-bold">{stats.graze}</span>
                </div>
                <div className="flex justify-between items-center text-xs border-t border-neutral-800 pt-2">
                  <span className="text-neutral-400">PILOT EVALUATION</span>
                  <span className="text-3xl font-black text-amber-400 glow-gold">S+ ACE</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 w-full max-w-xs pb-4">
                <button
                  onClick={() => startGame()}
                  className="w-full py-3 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white font-black text-xs tracking-wider shadow-lg shadow-yellow-600/40 border border-yellow-400 transition-all cursor-pointer"
                >
                  二周目出擊 (RETRY)
                </button>
                <button
                  onClick={() => {
                    sound.stopBgm();
                    setAppState('TITLE');
                  }}
                  className="w-full py-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-400 font-bold text-xs cursor-pointer"
                >
                  返回主畫面
                </button>
              </div>
            </div>
          )}
        </div>

        {/* --- ARCADE SIDE PANEL HUD (Desktop & Tablet) --- */}
        <div className="w-full lg:w-72 flex flex-col justify-between bg-neutral-950/80 border border-neutral-800 rounded-xl p-4 text-xs space-y-4">
          <div>
            {/* Logo lockup */}
            <div className="text-center pb-3 border-b border-neutral-800">
              <div className="text-red-500 font-black text-xl glow-red">怒首領蜂</div>
              <div className="text-[10px] text-cyan-400 tracking-widest font-bold">ARCADE TELEMETRY</div>
            </div>

            {/* Stage Indicator */}
            <div className="flex items-center justify-between mt-3 text-[11px]">
              <span className="text-neutral-500">STAGE</span>
              <span className="text-yellow-400 font-bold">
                {stats.stage === 1 ? '01 · 空中強襲' : '02 · 彈幕地獄'}
              </span>
            </div>

            {/* High Score */}
            <div className="mt-3">
              <div className="text-[10px] text-neutral-500 font-bold">HIGH SCORE</div>
              <div className="text-lg font-black text-cyan-400 glow-cyan tabular-nums">
                {stats.highScore.toLocaleString()}
              </div>
            </div>

            {/* 1P Score */}
            <div className="mt-2">
              <div className="text-[10px] text-neutral-500 font-bold">1P SCORE</div>
              <div className="text-xl font-black text-white tabular-nums">
                {stats.score.toLocaleString()}
              </div>
            </div>

            {/* Hit Chain Meter (GPS System) */}
            <div className="mt-3 bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-800">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-yellow-400 font-bold flex items-center gap-1">
                  <Flame size={12} className="text-yellow-500" />
                  HIT CHAIN
                </span>
                <span className="text-yellow-400 font-black text-sm tabular-nums">
                  {stats.chain} HIT
                </span>
              </div>
              {/* Depleting progress bar */}
              <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden border border-neutral-700">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-red-500 transition-all duration-75"
                  style={{ width: `${(stats.chainTimer / stats.maxChainTimer) * 100}%` }}
                />
              </div>
            </div>

            {/* Graze Counter (擦彈) */}
            <div className="mt-3 bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-800 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-pink-400 font-bold flex items-center gap-1">
                  <Sparkles size={12} className="text-pink-500" />
                  GRAZE (擦彈)
                </div>
                <div className="text-[9px] text-neutral-500">2.5px 核心極限邊緣</div>
              </div>
              <div className="text-lg font-black text-pink-400 glow-pink tabular-nums">
                {stats.graze}
              </div>
            </div>

            {/* Ships & Bombs */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              {/* Ships */}
              <div className="bg-neutral-900/60 p-2 rounded-lg border border-neutral-800">
                <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  <ShieldAlert size={12} />
                  SHIPS (殘機)
                </div>
                <div className="flex items-center gap-1 mt-1 text-emerald-400 text-sm">
                  {Array.from({ length: Math.max(0, stats.lives) }).map((_, i) => (
                    <span key={i} className="text-base">★</span>
                  ))}
                  {stats.lives <= 0 && <span className="text-xs text-neutral-600">NONE</span>}
                </div>
              </div>

              {/* Bombs */}
              <div className="bg-neutral-900/60 p-2 rounded-lg border border-neutral-800">
                <div className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                  <Zap size={12} />
                  BOMBS (大絕)
                </div>
                <div className="flex items-center gap-1 mt-1 text-amber-500 font-black">
                  {Array.from({ length: stats.bombs }).map((_, i) => (
                    <span key={i} className="px-1.5 py-0.5 rounded bg-amber-950 border border-amber-500 text-[10px]">
                      B
                    </span>
                  ))}
                  {stats.bombs === 0 && <span className="text-xs text-neutral-600">EMPTY</span>}
                </div>
              </div>
            </div>

            {/* Power Level */}
            <div className="mt-3 flex items-center justify-between bg-neutral-900/40 px-2.5 py-1.5 rounded border border-neutral-800 text-[11px]">
              <span className="text-neutral-400">WEAPON POWER</span>
              <span className="text-yellow-400 font-bold">
                {stats.powerLevel >= 4 ? 'MAX POWER' : `LEVEL ${stats.powerLevel}`}
              </span>
            </div>

            {/* Quick Action Toggles */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button
                onClick={() => setSettings(prev => ({ ...prev, autoFire: !prev.autoFire }))}
                className={`py-1.5 px-2 rounded border text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  settings.autoFire 
                    ? 'bg-red-950/80 border-red-500 text-red-400' 
                    : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <span>自動連射</span>
                <span className="text-[10px]">{settings.autoFire ? 'ON' : 'OFF'}</span>
              </button>

              <button
                onClick={() => setSettings(prev => ({ ...prev, mouseControl: !prev.mouseControl }))}
                className={`py-1.5 px-2 rounded border text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  settings.mouseControl 
                    ? 'bg-cyan-950/80 border-cyan-500 text-cyan-400' 
                    : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <MousePointer size={11} />
                <span>滑鼠微操</span>
              </button>
            </div>

            {gameState === 'PLAYING' && (
              <button
                onClick={() => startGame()}
                className="w-full mt-2 py-1.5 px-2 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-[11px] text-neutral-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw size={12} className="text-yellow-400" />
                <span>重新開始本局</span>
              </button>
            )}
          </div>

          {/* Quick Key Guide / Legend */}
          <div className="border-t border-neutral-800 pt-3 text-[11px] text-neutral-400 space-y-1">
            <div className="text-neutral-200 font-bold text-xs mb-1">操作指令</div>
            <div className="flex justify-between">
              <span>移動</span>
              <span className="text-neutral-200">WASD / 方向鍵</span>
            </div>
            <div className="flex justify-between">
              <span>連射 (Shot)</span>
              <span className="text-cyan-400">Z / J</span>
            </div>
            <div className="flex justify-between">
              <span>低速聚焦雷射</span>
              <span className="text-cyan-400">Shift</span>
            </div>
            <div className="flex justify-between">
              <span>全屏雷射炸彈</span>
              <span className="text-amber-400">X / K</span>
            </div>
            <div className="flex justify-between">
              <span>暫停遊戲</span>
              <span className="text-neutral-400">ESC</span>
            </div>

            {/* Mobile / Touch toggle button */}
            <div className="pt-2">
              <button
                onClick={() => setShowTouchControls(!showTouchControls)}
                className="w-full py-1.5 px-2 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-[11px] text-neutral-300 flex items-center justify-center gap-1.5"
              >
                <Gamepad2 size={13} className="text-cyan-400" />
                <span>{showTouchControls ? '隱藏觸控虛擬鍵盤' : '開啟觸控虛擬鍵盤'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Touch Screen Virtual Joystick & Buttons (Shows on mobile or when toggled) */}
      {showTouchControls && (
        <div className="w-full max-w-[520px] mt-2">
          <TouchControls
            onMoveChange={handleTouchMoveChange}
            onShootChange={handleTouchShootChange}
            onFocusChange={handleTouchFocusChange}
            onBombPress={handleTouchBombPress}
          />
        </div>
      )}

      {/* --- GUIDE / HOW TO PLAY MODAL --- */}
      {showGuide && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-neutral-950 border-2 border-neutral-700 rounded-2xl max-w-lg w-full p-6 text-neutral-200 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowGuide(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded hover:bg-neutral-800"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-6">
              <div className="text-xs text-red-400 font-bold tracking-widest uppercase">CAVE Danmaku Mindset</div>
              <h3 className="text-2xl font-black text-white glow-red">怒首領蜂 · 彈幕微操心法</h3>
            </div>

            <div className="space-y-4 text-xs leading-relaxed">
              <div className="bg-neutral-900/80 p-3.5 rounded-xl border border-neutral-800">
                <div className="font-bold text-red-400 text-sm mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  1. 極限 2.5 像素判定核心
                </div>
                <p className="text-neutral-300">
                  自機機翼與機身本體<strong>完全沒有受傷判定</strong>！實體受擊點只有自機正中心的<strong>紅白光點（半徑 2.5 像素）</strong>。只要這顆紅點沒被子彈擊中，擦著子彈邊緣穿過絕不會爆炸！
                </p>
              </div>

              <div className="bg-neutral-900/80 p-3.5 rounded-xl border border-neutral-800">
                <div className="font-bold text-cyan-400 text-sm mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  2. 低速聚焦雷射模式 (Shift)
                </div>
                <p className="text-neutral-300">
                  按住 <kbd className="px-1.5 py-0.5 bg-neutral-800 rounded border border-neutral-700 font-bold">Shift</kbd>，自機會降至微步低速（2.2px/幀），機體周圍會展開微操判定輔助環，火力收縮為穿透型貫通雷射。面對密集彈幕時必須依賴聚焦進行微米穿梭。
                </p>
              </div>

              <div className="bg-neutral-900/80 p-3.5 rounded-xl border border-neutral-800">
                <div className="font-bold text-pink-400 text-sm mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-pink-500" />
                  3. 擦彈加乘系統 (Graze)
                </div>
                <p className="text-neutral-300">
                  子彈掠過核心 22 像素以內時，會迸發高頻藍白火花並播放擦彈音效。每次擦彈額外獎勵分數並延長連擊倒數計時！
                </p>
              </div>

              <div className="bg-neutral-900/80 p-3.5 rounded-xl border border-neutral-800">
                <div className="font-bold text-yellow-400 text-sm mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-yellow-400" />
                  4. 連擊 GPS Chain 與金蜂獎牌
                </div>
                <p className="text-neutral-300">
                  持續命中敵機會累積 Hit Chain，大幅提升得分倍率（最高乘數可破千）；連續拾取金色蜂型獎牌（Bee Medal）會觸發幾何級數獎勵分數（最高 20,000 分）。
                </p>
              </div>

              <div className="bg-neutral-900/80 p-3.5 rounded-xl border border-neutral-800">
                <div className="font-bold text-amber-400 text-sm mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  5. 全螢幕消彈雷射炸彈 (Bomb)
                </div>
                <p className="text-neutral-300">
                  被逼入死角時按下 <kbd className="px-1.5 py-0.5 bg-neutral-800 rounded border border-neutral-700 font-bold">X</kbd>，釋放 3 秒破壞光束，瞬間將畫面全敵彈轉化為黃金分數火花，並給予絕對無敵時間。
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowGuide(false)}
              className="mt-6 w-full py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs tracking-wider transition-colors"
            >
              了解心法，進入戰場
            </button>
          </div>
        </div>
      )}

      {/* --- LEADERBOARD MODAL --- */}
      {showLeaderboard && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-neutral-950 border-2 border-neutral-700 rounded-2xl max-w-lg w-full p-6 text-neutral-200 shadow-2xl relative">
            <button
              onClick={() => setShowLeaderboard(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded hover:bg-neutral-800"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-5">
              <div className="text-xs text-yellow-400 font-bold tracking-widest uppercase">HALL OF FAME</div>
              <h3 className="text-2xl font-black text-white glow-gold">彈幕戰機排行榜</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-400 text-[10px]">
                    <th className="py-2">排名</th>
                    <th className="py-2">自機</th>
                    <th className="py-2 text-right">得分</th>
                    <th className="py-2 text-right">MAX CHAIN</th>
                    <th className="py-2 text-right">GRAZE</th>
                    <th className="py-2 text-center">評級</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900">
                  {getLeaderboard().map((entry, idx) => (
                    <tr key={entry.id} className="hover:bg-neutral-900/50">
                      <td className="py-2.5 font-bold text-yellow-400">#{idx + 1}</td>
                      <td className="py-2.5 font-medium text-neutral-300">
                        {entry.ship === 'TYPE_A' ? '赤·DO-N82' : entry.ship === 'TYPE_B' ? '綠·DO-P24' : '藍·DO-S55'}
                      </td>
                      <td className="py-2.5 text-right font-bold text-cyan-400 tabular-nums">
                        {entry.score.toLocaleString()}
                      </td>
                      <td className="py-2.5 text-right text-yellow-400 tabular-nums">
                        {entry.maxChain} HIT
                      </td>
                      <td className="py-2.5 text-right text-pink-400 tabular-nums">
                        {entry.graze}
                      </td>
                      <td className="py-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          entry.rank === 'S+' ? 'bg-amber-950 text-amber-400 border border-amber-500' :
                          entry.rank === 'S' ? 'bg-red-950 text-red-400 border border-red-500' :
                          entry.rank === 'A' ? 'bg-cyan-950 text-cyan-400 border border-cyan-500' :
                          'bg-neutral-800 text-neutral-400'
                        }`}>
                          {entry.rank}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={() => setShowLeaderboard(false)}
              className="mt-6 w-full py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs tracking-wider transition-colors"
            >
              關閉
            </button>
          </div>
        </div>
      )}

      {/* --- SETTINGS MODAL --- */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-neutral-950 border-2 border-neutral-700 rounded-2xl max-w-sm w-full p-6 text-neutral-200 shadow-2xl relative">
            <button
              onClick={() => setShowSettings(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded hover:bg-neutral-800"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-5">
              <h3 className="text-xl font-black text-white">遊戲設定 (SETTINGS)</h3>
            </div>

            <div className="space-y-4 text-xs">
              {/* Sound Enabled */}
              <div className="flex items-center justify-between">
                <span>音效總開關</span>
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={(e) => setSettings({ ...settings, soundEnabled: e.target.checked })}
                  className="w-4 h-4 accent-red-500"
                />
              </div>

              {/* BGM Enabled */}
              <div className="flex items-center justify-between">
                <span>街機 FM BGM 節奏音樂</span>
                <input
                  type="checkbox"
                  checked={settings.bgmEnabled}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setSettings({ ...settings, bgmEnabled: next });
                    if (next && settings.soundEnabled) sound.startBgm();
                    else sound.stopBgm();
                  }}
                  className="w-4 h-4 accent-red-500"
                />
              </div>

              {/* CRT Scanlines */}
              <div className="flex items-center justify-between">
                <span>CRT 街機掃描線效果</span>
                <input
                  type="checkbox"
                  checked={settings.crtScanlines}
                  onChange={(e) => setSettings({ ...settings, crtScanlines: e.target.checked })}
                  className="w-4 h-4 accent-red-500"
                />
              </div>

              {/* Screen Shake */}
              <div className="flex items-center justify-between">
                <span>爆炸螢幕震動</span>
                <input
                  type="checkbox"
                  checked={settings.screenShake}
                  onChange={(e) => setSettings({ ...settings, screenShake: e.target.checked })}
                  className="w-4 h-4 accent-red-500"
                />
              </div>

              {/* Mouse Control Mode */}
              <div className="flex items-center justify-between border-t border-neutral-800 pt-3">
                <div className="flex items-center gap-1.5">
                  <MousePointer size={14} className="text-cyan-400" />
                  <span>滑鼠跟隨微操模式</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.mouseControl}
                  onChange={(e) => setSettings({ ...settings, mouseControl: e.target.checked })}
                  className="w-4 h-4 accent-cyan-500"
                />
              </div>

              {/* Auto Fire */}
              <div className="flex items-center justify-between">
                <span>自動連續射擊 (Auto-Fire)</span>
                <input
                  type="checkbox"
                  checked={settings.autoFire}
                  onChange={(e) => setSettings({ ...settings, autoFire: e.target.checked })}
                  className="w-4 h-4 accent-red-500"
                />
              </div>
            </div>

            <button
              onClick={() => setShowSettings(false)}
              className="mt-6 w-full py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs tracking-wider transition-colors"
            >
              儲存並返回
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

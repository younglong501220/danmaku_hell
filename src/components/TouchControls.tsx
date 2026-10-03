import React, { useEffect, useRef, useState } from 'react';

interface TouchControlsProps {
  onMoveChange: (dx: number, dy: number) => void;
  onShootChange: (isShooting: boolean) => void;
  onFocusChange: (isFocusing: boolean) => void;
  onBombPress: () => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onMoveChange,
  onShootChange,
  onFocusChange,
  onBombPress,
}) => {
  const joystickRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isFocusLocked, setIsFocusLocked] = useState(false);
  const activeTouchId = useRef<number | null>(null);

  const maxRadius = 45;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (activeTouchId.current !== null) return;
    const touch = e.changedTouches[0];
    activeTouchId.current = touch.identifier;
    setIsDragging(true);
    updateJoystick(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === activeTouchId.current) {
        updateJoystick(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeTouchId.current) {
        activeTouchId.current = null;
        setIsDragging(false);
        setKnobPos({ x: 0, y: 0 });
        onMoveChange(0, 0);
        break;
      }
    }
  };

  const updateJoystick = (clientX: number, clientY: number) => {
    if (!joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);

    const angle = Math.atan2(dy, dx);
    const clampedDist = Math.min(dist, maxRadius);

    const kx = Math.cos(angle) * clampedDist;
    const ky = Math.sin(angle) * clampedDist;
    setKnobPos({ x: kx, y: ky });

    // Normalized vector (-1 to 1)
    onMoveChange(kx / maxRadius, ky / maxRadius);
  };

  // Keyboard and cleanup on unmount
  useEffect(() => {
    return () => {
      onMoveChange(0, 0);
      onShootChange(false);
      onFocusChange(false);
    };
  }, [onMoveChange, onShootChange, onFocusChange]);

  return (
    <div className="w-full flex items-center justify-between px-3 py-2 select-none touch-none bg-neutral-950/80 border-t border-neutral-800">
      {/* Virtual Joystick */}
      <div className="flex flex-col items-center">
        <div
          ref={joystickRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          className="relative w-28 h-28 rounded-full bg-neutral-900 border-2 border-neutral-700 shadow-inner flex items-center justify-center cursor-pointer"
        >
          {/* Guide Rings */}
          <div className="absolute inset-4 rounded-full border border-neutral-800 pointer-events-none" />
          {/* Knob */}
          <div
            className={`w-12 h-12 rounded-full border border-red-500 shadow-lg transition-transform duration-75 flex items-center justify-center ${
              isDragging ? 'bg-red-600 scale-105' : 'bg-red-700/80'
            }`}
            style={{
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
            }}
          >
            <div className="w-4 h-4 rounded-full bg-white/60 pointer-events-none" />
          </div>
        </div>
        <span className="text-[10px] text-neutral-400 mt-1 uppercase tracking-wider font-mono">Move (移動)</span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {/* Focus / Laser Button */}
        <div className="flex flex-col items-center">
          <button
            type="button"
            onTouchStart={(e) => {
              e.preventDefault();
              onFocusChange(true);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              if (!isFocusLocked) onFocusChange(false);
            }}
            onClick={() => {
              const next = !isFocusLocked;
              setIsFocusLocked(next);
              onFocusChange(next);
            }}
            className={`w-14 h-14 rounded-full border-2 text-xs font-bold font-mono transition-all flex flex-col items-center justify-center shadow-lg active:scale-95 ${
              isFocusLocked
                ? 'bg-cyan-500 border-cyan-300 text-black shadow-cyan-500/50'
                : 'bg-cyan-950/70 border-cyan-600 text-cyan-300 hover:bg-cyan-900'
            }`}
          >
            <span>FOCUS</span>
            <span className="text-[9px] opacity-75">{isFocusLocked ? 'ON' : 'OFF'}</span>
          </button>
          <span className="text-[10px] text-neutral-400 mt-1 font-mono">低速雷射</span>
        </div>

        {/* Bomb Button */}
        <div className="flex flex-col items-center">
          <button
            type="button"
            onTouchStart={(e) => {
              e.preventDefault();
              onBombPress();
            }}
            onClick={() => onBombPress()}
            className="w-14 h-14 rounded-full bg-amber-600 active:bg-amber-500 border-2 border-amber-400 text-white text-xs font-black font-mono shadow-lg shadow-amber-600/30 flex flex-col items-center justify-center active:scale-95 transition-transform"
          >
            <span>BOMB</span>
            <span className="text-[9px] opacity-90">消彈</span>
          </button>
          <span className="text-[10px] text-neutral-400 mt-1 font-mono">大絕招</span>
        </div>

        {/* Shot Button */}
        <div className="flex flex-col items-center">
          <button
            type="button"
            onTouchStart={(e) => {
              e.preventDefault();
              onShootChange(true);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              onShootChange(false);
            }}
            onMouseDown={() => onShootChange(true)}
            onMouseUp={() => onShootChange(false)}
            className="w-16 h-16 rounded-full bg-red-600 active:bg-red-500 border-2 border-red-300 text-white text-sm font-black font-mono shadow-xl shadow-red-600/40 flex flex-col items-center justify-center active:scale-95 transition-transform"
          >
            <span>SHOT</span>
            <span className="text-[9px] opacity-90">連射</span>
          </button>
          <span className="text-[10px] text-neutral-400 mt-1 font-mono">連射 (Z)</span>
        </div>
      </div>
    </div>
  );
};

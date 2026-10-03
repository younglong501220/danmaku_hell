export type GameState = 'TITLE' | 'SHIP_SELECT' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'VICTORY';

export type ShipType = 'TYPE_A' | 'TYPE_B' | 'TYPE_C';

export interface ShipConfig {
  id: ShipType;
  name: string;
  subName: string;
  color: string;
  accentColor: string;
  speed: number;
  focusSpeed: number;
  shotType: string;
  description: string;
}

export interface PlayerBullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  color: string;
  width: number;
  height: number;
  isLaser?: boolean;
}

export interface EnemyBullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  grazed: boolean;
  type?: 'normal' | 'needle' | 'orb' | 'star' | 'laser_orb';
  glowColor?: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  shape?: 'circle' | 'spark' | 'ring';
}

export interface DropItem {
  x: number;
  y: number;
  vy: number;
  type: 'power' | 'bomb' | 'bee_medal' | 'score_spark';
  value: number;
  radius: number;
  pulseTimer: number;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

export interface Enemy {
  x: number;
  y: number;
  type: 'zako_drone' | 'zako_flyer' | 'heavy_tank' | 'mid_boss' | 'boss';
  name?: string;
  hp: number;
  maxHp: number;
  radius: number;
  vx: number;
  vy: number;
  timer: number;
  phase?: number;
  maxPhase?: number;
  shootCooldown?: number;
  color?: string;
  targetY?: number;
  dropType?: 'power' | 'bomb' | 'bee_medal' | null;
}

export interface GameStats {
  score: number;
  highScore: number;
  chain: number;
  maxChain: number;
  chainTimer: number;
  maxChainTimer: number;
  graze: number;
  lives: number;
  maxLives: number;
  bombs: number;
  maxBombs: number;
  powerLevel: number;
  stage: number;
  bossHpPercent: number | null;
  bossName: string | null;
  warningActive: boolean;
}

export interface LeaderboardEntry {
  id: string;
  date: string;
  ship: ShipType;
  score: number;
  maxChain: number;
  graze: number;
  stage: number;
  rank: 'S+' | 'S' | 'A' | 'B' | 'C';
}

export interface GameSettings {
  soundEnabled: boolean;
  bgmEnabled: boolean;
  sfxVolume: number;
  bgmVolume: number;
  crtScanlines: boolean;
  screenShake: boolean;
  mouseControl: boolean;
  autoFire: boolean;
}

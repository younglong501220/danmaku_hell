import { DropItem, Enemy, EnemyBullet, FloatingText, GameSettings, GameStats, Particle, PlayerBullet, ShipType } from '../types/game';
import { SHIPS } from './ships';
import { sound } from '../audio/soundSystem';

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  shoot: boolean;
  focus: boolean;
  bomb: boolean;
  mouseX?: number;
  mouseY?: number;
  isMouseDown?: boolean;
}

export class DanmakuEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  // Selected Ship
  public shipType: ShipType = 'TYPE_A';

  // Game Entities
  public player = {
    x: 260,
    y: 630,
    hitRadius: 2.5, // 2.5px CAVE-accurate micro hitbox!
    grazeRadius: 22,
    invulnerable: 140,
    shootTimer: 0,
    power: 1, // 1 to 4
    active: true,
  };

  public playerBullets: PlayerBullet[] = [];
  public enemyBullets: EnemyBullet[] = [];
  public enemies: Enemy[] = [];
  public particles: Particle[] = [];
  public dropItems: DropItem[] = [];
  public floatingTexts: FloatingText[] = [];

  // Starfield background
  private stars: Array<{ x: number; y: number; speed: number; size: number; color: string }> = [];
  private gridOffset = 0;

  // Game Stats
  public score = 0;
  public highScore = 0;
  public chain = 0;
  public maxChain = 0;
  public chainTimer = 0;
  public maxChainTimer = 180;
  public graze = 0;
  public lives = 3;
  public maxLives = 5;
  public bombs = 2;
  public maxBombs = 4;
  public stage = 1;
  public stageTime = 0;
  public bombActive = 0;
  public screenShake = 0;
  public isGameOver = false;
  public isVictory = false;

  // Bee medal chain
  private beeMedalChain = 0;

  // Warning Banner
  public warningTimer = 0;

  // Settings
  public settings: GameSettings = {
    soundEnabled: true,
    bgmEnabled: true,
    sfxVolume: 0.8,
    bgmVolume: 0.45,
    crtScanlines: true,
    screenShake: true,
    mouseControl: false,
    autoFire: false,
  };

  // Callback to inform UI of stat changes
  private onStatsUpdate?: (stats: GameStats) => void;
  private onGameOver?: (stats: GameStats) => void;
  private onVictory?: (stats: GameStats) => void;

  constructor(canvas: HTMLCanvasElement, onStats?: (stats: GameStats) => void, onOver?: (stats: GameStats) => void, onWin?: (stats: GameStats) => void) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;
    this.onStatsUpdate = onStats;
    this.onGameOver = onOver;
    this.onVictory = onWin;

    try {
      this.highScore = parseInt(localStorage.getItem('dodonpachi_hiscore') || '0', 10);
    } catch {
      this.highScore = 0;
    }

    this.initStars();
  }

  private initStars() {
    this.stars = [];
    for (let i = 0; i < 90; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        speed: 1.2 + Math.random() * 4.5,
        size: Math.random() < 0.2 ? 2.5 : Math.random() * 1.8 + 0.5,
        color: Math.random() > 0.6 ? '#66aacc' : Math.random() > 0.3 ? '#8877cc' : '#334466'
      });
    }
  }

  public resetGame(ship: ShipType = 'TYPE_A', initialStage = 1) {
    this.shipType = ship;
    this.stage = initialStage;
    this.score = 0;
    this.chain = 0;
    this.maxChain = 0;
    this.chainTimer = 0;
    this.graze = 0;
    this.lives = 3;
    this.bombs = 2;
    this.bombActive = 0;
    this.stageTime = 0;
    this.warningTimer = 0;
    this.isGameOver = false;
    this.isVictory = false;
    this.beeMedalChain = 0;

    this.player.x = this.width / 2;
    this.player.y = this.height - 90;
    this.player.invulnerable = 140;
    this.player.power = 1;
    this.player.active = true;

    this.playerBullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.particles = [];
    this.dropItems = [];
    this.floatingTexts = [];

    this.broadcastStats();
  }

  public setShip(ship: ShipType) {
    this.shipType = ship;
  }

  public triggerBossWarning() {
    this.warningTimer = 180; // 3 seconds warning
    sound.warning();
  }

  private createEnemy(x: number, y: number, type: Enemy['type'], overrides: Partial<Enemy> = {}): Enemy {
    const isStage2 = this.stage >= 2;
    switch (type) {
      case 'zako_drone':
        return {
          x,
          y,
          type: 'zako_drone',
          hp: 20 * (isStage2 ? 1.3 : 1),
          maxHp: 20 * (isStage2 ? 1.3 : 1),
          radius: 16,
          vx: (Math.random() - 0.5) * 2,
          vy: 1.6,
          timer: 0,
          dropType: Math.random() < 0.35 ? 'bee_medal' : null,
          ...overrides
        };
      case 'zako_flyer':
        return {
          x,
          y,
          type: 'zako_flyer',
          hp: 35 * (isStage2 ? 1.4 : 1),
          maxHp: 35 * (isStage2 ? 1.4 : 1),
          radius: 20,
          vx: overrides.vx ?? 1.5,
          vy: overrides.vy ?? 2.2,
          timer: 0,
          dropType: Math.random() < 0.4 ? 'bee_medal' : null,
          ...overrides
        };
      case 'heavy_tank':
        return {
          x,
          y,
          type: 'heavy_tank',
          hp: 140 * (isStage2 ? 1.4 : 1),
          maxHp: 140 * (isStage2 ? 1.4 : 1),
          radius: 30,
          vx: 0,
          vy: 0.9,
          timer: 0,
          dropType: 'bomb',
          ...overrides
        };
      case 'boss':
        return {
          x,
          y,
          type: 'boss',
          name: isStage2 ? '超弩級機動要塞 [緋蜂・HIBACHI]' : '重裝空母 [雷電・RAIDEN]',
          hp: isStage2 ? 1800 : 1300,
          maxHp: isStage2 ? 1800 : 1300,
          radius: 54,
          vx: 2.0,
          vy: 0,
          timer: 0,
          phase: 1,
          maxPhase: 3,
          targetY: 135,
          color: isStage2 ? '#d4af37' : '#cc2244',
          dropType: 'power',
          ...overrides
        };
      default:
        return {
          x,
          y,
          type: 'zako_drone',
          hp: 20,
          maxHp: 20,
          radius: 16,
          vx: 0,
          vy: 1.5,
          timer: 0,
          ...overrides
        };
    }
  }

  // --- Main Tick Loop ---
  public update(inputs: InputState) {
    if (this.isGameOver || this.isVictory) {
      this.updateParticles();
      this.updateStars();
      return;
    }

    this.stageTime++;

    // GPS Chain Decay
    if (this.chainTimer > 0) {
      this.chainTimer--;
      if (this.chainTimer <= 0) {
        this.chain = 0;
      }
    }

    // Bomb Active Counter
    if (this.bombActive > 0) {
      this.bombActive--;
      // Continuously damage all enemies
      for (const en of this.enemies) {
        en.hp -= 2.6;
        this.addSpark(en.x + (Math.random() - 0.5) * 40, en.y + (Math.random() - 0.5) * 40, '#ffcc00', 1);
      }
    }

    // Warning screen
    if (this.warningTimer > 0) {
      this.warningTimer--;
    }

    // Player Update
    this.updatePlayer(inputs);

    // Player Bullets
    this.updatePlayerBullets();

    // Enemies & Danmaku Patterns
    this.updateEnemies();

    // Enemy Bullets (Hitbox & Graze logic)
    this.updateEnemyBullets();

    // Drop items
    this.updateDropItems();

    // Particles & Floating Text
    this.updateParticles();

    // Periodic and scripted enemy spawns if boss is not active
    const hasBoss = this.enemies.some(e => e.type === 'boss');
    if (!hasBoss && this.warningTimer <= 0) {
      if (this.stageTime === 30) {
        this.enemies.push(this.createEnemy(100, -30, 'zako_flyer', { vx: 1.2, vy: 2 }));
        this.enemies.push(this.createEnemy(this.width - 100, -30, 'zako_flyer', { vx: -1.2, vy: 2 }));
      } else if (this.stageTime === 140) {
        this.enemies.push(this.createEnemy(this.width / 2 - 80, -30, 'zako_drone'));
        this.enemies.push(this.createEnemy(this.width / 2 + 80, -30, 'zako_drone'));
        this.enemies.push(this.createEnemy(this.width / 2, -50, 'heavy_tank', { dropType: 'power' }));
      } else if (this.stageTime === 340) {
        this.triggerBossWarning();
      } else if (this.stageTime % 140 === 0) {
        const x = 50 + Math.random() * (this.width - 100);
        this.enemies.push(this.createEnemy(x, -30, Math.random() > 0.4 ? 'zako_flyer' : 'zako_drone'));
      }
      if (this.stageTime % 320 === 0) {
        this.enemies.push(this.createEnemy(this.width / 2, -40, 'heavy_tank'));
      }
    } else if (this.warningTimer === 1 && !hasBoss) {
      // Spawn boss immediately at end of warning siren!
      const boss = this.createEnemy(this.width / 2, -90, 'boss');
      this.enemies.push(boss);
    }

    this.updateStars();

    if (this.screenShake > 0) {
      this.screenShake *= 0.88;
      if (this.screenShake < 0.2) this.screenShake = 0;
    }

    this.broadcastStats();
  }

  private updatePlayer(inputs: InputState) {
    const ship = SHIPS[this.shipType];
    const isFocus = inputs.focus;
    const speed = isFocus ? ship.focusSpeed : ship.speed;

    // Movement: Keyboard or Mouse
    if (this.settings.mouseControl && inputs.mouseX !== undefined && inputs.mouseY !== undefined) {
      // Smooth lerp to mouse cursor
      const dx = inputs.mouseX - this.player.x;
      const dy = inputs.mouseY - this.player.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 3) {
        const step = Math.min(dist, speed * 2.2);
        this.player.x += (dx / dist) * step;
        this.player.y += (dy / dist) * step;
      }
    } else {
      if (inputs.left) this.player.x -= speed;
      if (inputs.right) this.player.x += speed;
      if (inputs.up) this.player.y -= speed;
      if (inputs.down) this.player.y += speed;
    }

    // Clamp boundaries
    this.player.x = Math.max(18, Math.min(this.width - 18, this.player.x));
    this.player.y = Math.max(30, Math.min(this.height - 30, this.player.y));

    if (this.player.invulnerable > 0) {
      this.player.invulnerable--;
    }

    // Shooting
    this.player.shootTimer++;
    const shouldShoot = inputs.shoot || inputs.isMouseDown || this.settings.autoFire;
    const fireRate = isFocus ? 4 : 5;

    if (shouldShoot && this.player.shootTimer >= fireRate) {
      this.player.shootTimer = 0;
      this.firePlayerShot(isFocus);
    }

    // Bomb
    if (inputs.bomb && this.bombs > 0 && this.bombActive <= 0) {
      this.bombs--;
      this.bombActive = 180; // 3 seconds of devastating laser
      this.screenShake = this.settings.screenShake ? 26 : 0;
      sound.bomb();

      // Convert all active enemy bullets to golden score sparks
      for (const b of this.enemyBullets) {
        this.addSpark(b.x, b.y, '#ffd700', 3);
        this.addScore(80);
      }
      this.enemyBullets = [];
    }
  }

  private firePlayerShot(isFocus: boolean) {
    sound.shoot(isFocus);
    const px = this.player.x;
    const py = this.player.y;
    const pwr = this.player.power;

    if (this.shipType === 'TYPE_A') {
      // Type A: High Speed Red
      if (isFocus) {
        // Focused Laser Beam with penetrating high DPS
        this.playerBullets.push({ x: px - 8, y: py - 20, vx: 0, vy: -20, dmg: 2.4 * pwr, color: '#00f0ff', width: 5, height: 32, isLaser: true });
        this.playerBullets.push({ x: px + 8, y: py - 20, vx: 0, vy: -20, dmg: 2.4 * pwr, color: '#00f0ff', width: 5, height: 32, isLaser: true });
      } else {
        // Wide 3 to 5-way Vulcan
        this.playerBullets.push({ x: px, y: py - 18, vx: 0, vy: -17, dmg: 1.6 * pwr, color: '#ffff33', width: 4, height: 20 });
        this.playerBullets.push({ x: px - 12, y: py - 12, vx: -2.4, vy: -16, dmg: 1.2 * pwr, color: '#ff3366', width: 4, height: 16 });
        this.playerBullets.push({ x: px + 12, y: py - 12, vx: 2.4, vy: -16, dmg: 1.2 * pwr, color: '#ff3366', width: 4, height: 16 });
        if (pwr >= 2) {
          this.playerBullets.push({ x: px - 20, y: py - 8, vx: -4.2, vy: -15, dmg: 1.0 * pwr, color: '#ff8800', width: 4, height: 14 });
          this.playerBullets.push({ x: px + 20, y: py - 8, vx: 4.2, vy: -15, dmg: 1.0 * pwr, color: '#ff8800', width: 4, height: 14 });
        }
      }
    } else if (this.shipType === 'TYPE_B') {
      // Type B: Green Balanced
      if (isFocus) {
        this.playerBullets.push({ x: px, y: py - 22, vx: 0, vy: -21, dmg: 3.8 * pwr, color: '#33ffaa', width: 8, height: 36, isLaser: true });
      } else {
        this.playerBullets.push({ x: px - 8, y: py - 16, vx: -1.0, vy: -17, dmg: 1.8 * pwr, color: '#00ff66', width: 4, height: 18 });
        this.playerBullets.push({ x: px + 8, y: py - 16, vx: 1.0, vy: -17, dmg: 1.8 * pwr, color: '#00ff66', width: 4, height: 18 });
        if (pwr >= 2) {
          this.playerBullets.push({ x: px - 18, y: py - 10, vx: -3.0, vy: -16, dmg: 1.3 * pwr, color: '#00ffff', width: 4, height: 16 });
          this.playerBullets.push({ x: px + 18, y: py - 10, vx: 3.0, vy: -16, dmg: 1.3 * pwr, color: '#00ffff', width: 4, height: 16 });
        }
      }
    } else {
      // Type C: Blue Heavy
      if (isFocus) {
        // Ultra Concentrated Triple Mega Beam
        this.playerBullets.push({ x: px, y: py - 24, vx: 0, vy: -19, dmg: 4.5 * pwr, color: '#ff33aa', width: 10, height: 40, isLaser: true });
        this.playerBullets.push({ x: px - 14, y: py - 16, vx: -0.5, vy: -18, dmg: 1.8 * pwr, color: '#aa33ff', width: 5, height: 26, isLaser: true });
        this.playerBullets.push({ x: px + 14, y: py - 16, vx: 0.5, vy: -18, dmg: 1.8 * pwr, color: '#aa33ff', width: 5, height: 26, isLaser: true });
      } else {
        // Heavy Shotgun Fan
        this.playerBullets.push({ x: px, y: py - 18, vx: 0, vy: -17, dmg: 2.2 * pwr, color: '#00aaff', width: 6, height: 22 });
        this.playerBullets.push({ x: px - 12, y: py - 14, vx: -2.0, vy: -16, dmg: 1.5 * pwr, color: '#0066ff', width: 5, height: 18 });
        this.playerBullets.push({ x: px + 12, y: py - 14, vx: 2.0, vy: -16, dmg: 1.5 * pwr, color: '#0066ff', width: 5, height: 18 });
        this.playerBullets.push({ x: px - 22, y: py - 10, vx: -4.0, vy: -15, dmg: 1.2 * pwr, color: '#aa00ff', width: 4, height: 16 });
        this.playerBullets.push({ x: px + 22, y: py - 10, vx: 4.0, vy: -15, dmg: 1.2 * pwr, color: '#aa00ff', width: 4, height: 16 });
      }
    }
  }

  private updatePlayerBullets() {
    for (let i = this.playerBullets.length - 1; i >= 0; i--) {
      const b = this.playerBullets[i];
      b.x += b.vx;
      b.y += b.vy;

      // Hit detection against enemies
      let hit = false;
      for (const en of this.enemies) {
        const dist = Math.hypot(b.x - en.x, b.y - en.y);
        if (dist < en.radius + b.width) {
          en.hp -= b.dmg;
          hit = true;
          this.registerHit(b.isLaser);
          this.addScore(25);
          sound.hit();
          this.addSpark(b.x, b.y, b.color, 2);
          break;
        }
      }

      if (hit && !b.isLaser) {
        this.playerBullets.splice(i, 1);
        continue;
      }

      if (b.y < -40 || b.x < -30 || b.x > this.width + 30) {
        this.playerBullets.splice(i, 1);
      }
    }
  }

  private updateEnemies() {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const en = this.enemies[i];
      en.timer++;

      if (en.type === 'zako_drone') {
        en.x += en.vx;
        en.y += en.vy;
        if (en.x < 30 || en.x > this.width - 30) en.vx *= -1;
        // Periodic 3-way shot
        if (en.timer % 65 === 0 && en.y < this.height - 140) {
          this.spawnAimedFan(en.x, en.y, 3, 0.25, 3.0, '#ff5599');
        }
      } else if (en.type === 'zako_flyer') {
        en.x += en.vx;
        en.y += en.vy;
        if (en.timer % 55 === 0 && en.y < this.height - 160) {
          this.spawnRing(en.x, en.y, 6, 2.5, '#00ddff', 3.5);
        }
      } else if (en.type === 'heavy_tank') {
        en.y += en.vy;
        if (en.timer % 90 === 0 && en.y < this.height - 180) {
          this.spawnAimedFan(en.x, en.y, 5, 0.2, 3.4, '#ff9900');
          this.spawnRing(en.x, en.y, 10, 2.2, '#ff3366', 3.5);
        }
      } else if (en.type === 'boss') {
        // Boss Behavior & CAVE Danmaku Patterns
        if (en.y < (en.targetY || 135)) {
          en.y += 1.4;
        } else {
          en.x += en.vx;
          if (en.x < 110 || en.x > this.width - 110) en.vx *= -1;

          // Determine Boss Phase by HP percentage
          const hpRatio = en.hp / en.maxHp;
          if (hpRatio <= 0.35) {
            en.phase = 3;
          } else if (hpRatio <= 0.70) {
            en.phase = 2;
          } else {
            en.phase = 1;
          }

          this.bossDanmakuPattern(en);
        }
      }

      // Check Enemy Defeat
      if (en.hp <= 0) {
        this.destroyEnemy(en, i);
        continue;
      }

      // Out of bounds cleanup
      if (en.y > this.height + 60) {
        this.enemies.splice(i, 1);
      }
    }
  }

  private bossDanmakuPattern(boss: Enemy) {
    const t = boss.timer;
    const phase = boss.phase || 1;
    const bx = boss.x;
    const by = boss.y + 16;

    // Phase 1: Classic DoDonPachi Rotating Chrysanthemum Petals (萬花筒雙螺旋菊花花瓣彈)
    if (phase === 1) {
      // Clockwise 4-arm rotating spiral
      if (t % 5 === 0) {
        const arms = 4;
        const spin = t * 0.08;
        for (let a = 0; a < arms; a++) {
          const angle = spin + (Math.PI * 2 / arms) * a;
          this.enemyBullets.push({
            x: bx,
            y: by,
            vx: Math.cos(angle) * 3.2,
            vy: Math.sin(angle) * 3.2,
            radius: 4,
            color: '#ff0077',
            glowColor: '#ff66aa',
            grazed: false,
            type: 'needle'
          });
        }
      }

      // Counter-clockwise 3-arm cyan spiral
      if (t % 7 === 0) {
        const arms = 3;
        const spin = -t * 0.06;
        for (let a = 0; a < arms; a++) {
          const angle = spin + (Math.PI * 2 / arms) * a;
          this.enemyBullets.push({
            x: bx,
            y: by,
            vx: Math.cos(angle) * 2.8,
            vy: Math.sin(angle) * 2.8,
            radius: 3.5,
            color: '#00f0ff',
            glowColor: '#ffffff',
            grazed: false,
            type: 'orb'
          });
        }
      }

      // Concentrated 7-needle aimed burst
      if (t % 110 === 0) {
        this.spawnAimedFan(bx, by, 7, 0.12, 4.4, '#ffdd00');
      }
    }

    // Phase 2: Sinusoidal Intersecting Wave Curtains (正弦波浪交錯彈) + High-Speed Needle Fans
    else if (phase === 2) {
      if (t % 4 === 0) {
        // Dual undulating waves sweeping left and right
        const waveAngle1 = Math.PI / 2 + Math.sin(t * 0.07) * 0.85;
        const waveAngle2 = Math.PI / 2 - Math.sin(t * 0.07) * 0.85;

        this.enemyBullets.push({
          x: bx - 30,
          y: by,
          vx: Math.cos(waveAngle1) * 3.4,
          vy: Math.sin(waveAngle1) * 3.4,
          radius: 3.8,
          color: '#aa00ff',
          glowColor: '#dd88ff',
          grazed: false,
          type: 'orb'
        });

        this.enemyBullets.push({
          x: bx + 30,
          y: by,
          vx: Math.cos(waveAngle2) * 3.4,
          vy: Math.sin(waveAngle2) * 3.4,
          radius: 3.8,
          color: '#00ddff',
          glowColor: '#ffffff',
          grazed: false,
          type: 'orb'
        });
      }

      // Rapid Sniper Needles every 85 frames
      if (t % 85 === 0) {
        this.spawnAimedFan(bx, by, 9, 0.09, 4.8, '#ff3344');
      }

      // Secondary slow floating expanding rings
      if (t % 140 === 0) {
        this.spawnRing(bx, by, 14, 1.8, '#ffff00', 4.5);
      }
    }

    // Phase 3: Enraged Danmaku Hell (狂暴怒首領蜂 - 萬花筒幾何擴散與正弦波花瓣)
    else if (phase === 3) {
      // 12-way kaleidoscope twisting petals
      if (t % 6 === 0) {
        const count = 8;
        const spin = t * 0.09 + Math.sin(t * 0.04) * 1.5;
        for (let i = 0; i < count; i++) {
          const a = spin + (Math.PI * 2 / count) * i;
          const spd = 2.4 + Math.sin(t * 0.1 + i) * 1.0;
          this.enemyBullets.push({
            x: bx,
            y: by,
            vx: Math.cos(a) * spd,
            vy: Math.sin(a) * spd,
            radius: 4,
            color: i % 2 === 0 ? '#ff0055' : '#ffaa00',
            glowColor: '#ffffff',
            grazed: false,
            type: 'needle'
          });
        }
      }

      // Dense aimed crossfire
      if (t % 40 === 0) {
        this.spawnAimedFan(bx - 35, by, 5, 0.14, 4.2, '#00ffff');
        this.spawnAimedFan(bx + 35, by, 5, 0.14, 4.2, '#00ffff');
      }

      // Pulsing screen-wide wave bursts
      if (t % 160 === 0) {
        this.spawnRing(bx, by, 20, 2.2, '#9900ff', 4.0);
        this.spawnRing(bx, by, 20, 3.2, '#ff0033', 3.5);
      }
    }
  }

  private destroyEnemy(en: Enemy, index: number) {
    const isBoss = en.type === 'boss';
    sound.explosion(isBoss);
    this.screenShake = this.settings.screenShake ? (isBoss ? 32 : 9) : 0;
    this.addSpark(en.x, en.y, '#ffaa00', isBoss ? 80 : 25);

    const baseScore = isBoss ? (this.stage === 1 ? 80000 : 150000) : en.type === 'heavy_tank' ? 3500 : 600;
    this.addScore(baseScore);

    // Drop items
    if (en.dropType === 'power') {
      this.dropItems.push({ x: en.x, y: en.y, vy: 1.4, type: 'power', value: 1, radius: 12, pulseTimer: 0 });
    } else if (en.dropType === 'bomb') {
      this.dropItems.push({ x: en.x, y: en.y, vy: 1.4, type: 'bomb', value: 1, radius: 12, pulseTimer: 0 });
    } else if (en.dropType === 'bee_medal' || Math.random() < 0.25) {
      this.dropItems.push({ x: en.x, y: en.y, vy: 1.6, type: 'bee_medal', value: 1, radius: 11, pulseTimer: 0 });
    }

    if (isBoss) {
      // Clear all bullets into gold score sparks!
      for (const b of this.enemyBullets) {
        this.addSpark(b.x, b.y, '#ffd700', 3);
        this.addScore(150);
      }
      this.enemyBullets = [];

      this.addFloatingText(en.x, en.y, 'STAGE CLEAR!!', '#ffff00', 32);

      if (this.stage === 1) {
        // Transition to Stage 2 after 3.5s
        setTimeout(() => {
          if (this.isGameOver) return;
          this.stage = 2;
          this.stageTime = 0; // restarts wave progression for stage 2
          this.addFloatingText(this.width / 2, this.height / 2, 'STAGE 2 - DANMAKU HELL', '#ff3366', 28);
        }, 3500);
      } else {
        // Victory!
        setTimeout(() => {
          this.isVictory = true;
          this.broadcastVictory();
        }, 2000);
      }
    }

    this.enemies.splice(index, 1);
  }

  private updateEnemyBullets() {
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const b = this.enemyBullets[i];
      b.x += b.vx;
      b.y += b.vy;

      // Out of bounds
      if (b.x < -30 || b.x > this.width + 30 || b.y < -30 || b.y > this.height + 30) {
        this.enemyBullets.splice(i, 1);
        continue;
      }

      // Bomb active absorbs bullets
      if (this.bombActive > 0) {
        this.addSpark(b.x, b.y, '#00ffff', 1);
        this.enemyBullets.splice(i, 1);
        continue;
      }

      const dx = b.x - this.player.x;
      const dy = b.y - this.player.y;
      const dist = Math.hypot(dx, dy);

      // 1. Graze (擦彈) Detection (22px radius)
      if (!b.grazed && dist < this.player.grazeRadius + b.radius) {
        b.grazed = true;
        this.graze++;
        this.addScore(200);
        sound.graze();
        // High frequency cyber sparks on ship
        this.addSpark(this.player.x + (Math.random() - 0.5) * 8, this.player.y + (Math.random() - 0.5) * 8, '#00ffff', 3);
        // Graze extends chain timer slightly!
        this.chainTimer = Math.min(this.maxChainTimer, this.chainTimer + 10);
      }

      // 2. Hitbox Detection (2.5px CAVE CORE HITBOX!)
      if (this.player.invulnerable <= 0 && dist < this.player.hitRadius + b.radius) {
        this.playerHit();
        break;
      }
    }
  }

  private playerHit() {
    sound.explosion(true);
    this.screenShake = this.settings.screenShake ? 28 : 0;
    this.addSpark(this.player.x, this.player.y, '#ff0033', 45);
    this.enemyBullets = []; // Screen emergency bullet cancel
    this.lives--;
    this.player.power = Math.max(1, this.player.power - 1);
    this.chain = 0;

    if (this.lives < 0) {
      this.isGameOver = true;
      this.broadcastGameOver();
    } else {
      this.player.invulnerable = 150; // Respawn invulnerability
      this.player.x = this.width / 2;
      this.player.y = this.height - 90;
      this.addFloatingText(this.player.x, this.player.y - 40, 'RESPAWN!', '#00ffcc', 20);
    }
  }

  private updateDropItems() {
    for (let i = this.dropItems.length - 1; i >= 0; i--) {
      const item = this.dropItems[i];
      item.y += item.vy;
      item.pulseTimer++;

      // Autocollect if close to player
      const dist = Math.hypot(item.x - this.player.x, item.y - this.player.y);
      if (dist < 40) {
        // Magnet pull
        item.x += (this.player.x - item.x) * 0.15;
        item.y += (this.player.y - item.y) * 0.15;
      }

      if (dist < this.player.hitRadius + item.radius + 8) {
        sound.item();
        if (item.type === 'power') {
          if (this.player.power < 4) {
            this.player.power++;
            this.addFloatingText(this.player.x, this.player.y - 20, 'POWER UP!', '#ffff00', 18);
          } else {
            this.addScore(10000);
            this.addFloatingText(this.player.x, this.player.y - 20, 'MAX 10,000!', '#ffcc00', 18);
          }
        } else if (item.type === 'bomb') {
          if (this.bombs < this.maxBombs) {
            this.bombs++;
            this.addFloatingText(this.player.x, this.player.y - 20, '+1 BOMB!', '#ff6600', 18);
          } else {
            this.addScore(20000);
          }
        } else if (item.type === 'bee_medal') {
          this.beeMedalChain++;
          const medalBonus = Math.min(20000, 500 * Math.pow(2, Math.min(6, this.beeMedalChain - 1)));
          this.addScore(medalBonus);
          this.addFloatingText(this.player.x, this.player.y - 20, `MEDAL +${medalBonus.toLocaleString()}`, '#ffaa00', 16);
        }
        this.addSpark(item.x, item.y, '#ffd700', 6);
        this.dropItems.splice(i, 1);
        continue;
      }

      if (item.y > this.height + 30) {
        // Missed bee medal resets medal chain
        if (item.type === 'bee_medal') {
          this.beeMedalChain = 0;
        }
        this.dropItems.splice(i, 1);
      }
    }
  }

  private updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 0.8;
      ft.life--;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  private updateStars() {
    this.gridOffset = (this.gridOffset + 1.5) % 40;
    for (const s of this.stars) {
      s.y += s.speed;
      if (s.y > this.height) {
        s.y = 0;
        s.x = Math.random() * this.width;
      }
    }
  }

  // --- Bullet Spawning Helpers ---
  private spawnRing(x: number, y: number, count: number, speed: number, color: string, radius: number) {
    const offset = Math.random() * Math.PI;
    for (let i = 0; i < count; i++) {
      const angle = offset + (Math.PI * 2 / count) * i;
      this.enemyBullets.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius,
        color,
        grazed: false,
        type: 'orb'
      });
    }
  }

  private spawnAimedFan(x: number, y: number, count: number, spreadAngle: number, speed: number, color: string) {
    const angleToP = Math.atan2(this.player.y - y, this.player.x - x);
    const half = (count - 1) / 2;
    for (let i = 0; i < count; i++) {
      const a = angleToP + (i - half) * spreadAngle;
      this.enemyBullets.push({
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        radius: 3.5,
        color,
        grazed: false,
        type: 'needle'
      });
    }
  }

  private addSpark(x: number, y: number, color: string, count = 4) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 1.0 + Math.random() * 4.2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        life: 16 + Math.random() * 14,
        maxLife: 30,
        color,
        size: 1.5 + Math.random() * 2.5
      });
    }
  }

  private addFloatingText(x: number, y: number, text: string, color: string, size = 18) {
    this.floatingTexts.push({
      x,
      y,
      text,
      color,
      life: 60,
      maxLife: 60,
      size
    });
  }

  private addScore(base: number) {
    const multiplier = 1 + Math.min(this.chain, 999) * 0.05;
    const finalScore = Math.floor(base * multiplier);
    this.score += finalScore;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      try {
        localStorage.setItem('dodonpachi_hiscore', this.highScore.toString());
      } catch {}
    }
  }

  private registerHit(isLaser = false) {
    this.chain++;
    if (this.chain > this.maxChain) {
      this.maxChain = this.chain;
    }
    // Laser maintains chain meter longer
    this.chainTimer = isLaser ? Math.min(this.maxChainTimer, this.chainTimer + 35) : this.maxChainTimer;
  }

  private broadcastStats() {
    if (!this.onStatsUpdate) return;
    const boss = this.enemies.find(e => e.type === 'boss');
    this.onStatsUpdate({
      score: this.score,
      highScore: this.highScore,
      chain: this.chain,
      maxChain: this.maxChain,
      chainTimer: this.chainTimer,
      maxChainTimer: this.maxChainTimer,
      graze: this.graze,
      lives: this.lives,
      maxLives: this.maxLives,
      bombs: this.bombs,
      maxBombs: this.maxBombs,
      powerLevel: this.player.power,
      stage: this.stage,
      bossHpPercent: boss ? (boss.hp / boss.maxHp) * 100 : null,
      bossName: boss?.name || null,
      warningActive: this.warningTimer > 0,
    });
  }

  private broadcastGameOver() {
    if (this.onGameOver) {
      this.onGameOver({
        score: this.score,
        highScore: this.highScore,
        chain: this.chain,
        maxChain: this.maxChain,
        chainTimer: this.chainTimer,
        maxChainTimer: this.maxChainTimer,
        graze: this.graze,
        lives: this.lives,
        maxLives: this.maxLives,
        bombs: this.bombs,
        maxBombs: this.maxBombs,
        powerLevel: this.player.power,
        stage: this.stage,
        bossHpPercent: null,
        bossName: null,
        warningActive: false,
      });
    }
  }

  private broadcastVictory() {
    if (this.onVictory) {
      this.onVictory({
        score: this.score,
        highScore: this.highScore,
        chain: this.chain,
        maxChain: this.maxChain,
        chainTimer: this.chainTimer,
        maxChainTimer: this.maxChainTimer,
        graze: this.graze,
        lives: this.lives,
        maxLives: this.maxLives,
        bombs: this.bombs,
        maxBombs: this.maxBombs,
        powerLevel: this.player.power,
        stage: this.stage,
        bossHpPercent: null,
        bossName: null,
        warningActive: false,
      });
    }
  }

  // --- Rendering Routine ---
  public render(inputs: InputState) {
    const ctx = this.ctx;
    ctx.save();

    // Screen Shake
    if (this.screenShake > 0.5) {
      ctx.translate((Math.random() - 0.5) * this.screenShake, (Math.random() - 0.5) * this.screenShake);
    }

    // Deep space background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, this.height);
    if (this.stage === 1) {
      bgGrad.addColorStop(0, '#050512');
      bgGrad.addColorStop(1, '#0a0d1e');
    } else {
      bgGrad.addColorStop(0, '#14050a');
      bgGrad.addColorStop(1, '#080208');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Subtle tactical cyber grid
    ctx.strokeStyle = this.stage === 1 ? 'rgba(0, 180, 255, 0.05)' : 'rgba(255, 60, 60, 0.05)';
    ctx.lineWidth = 1;
    for (let y = this.gridOffset; y < this.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }
    for (let x = 0; x < this.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }

    // Stars
    for (const s of this.stars) {
      ctx.fillStyle = s.color;
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }

    // Bomb Shockwave Overlay
    if (this.bombActive > 0) {
      ctx.fillStyle = `rgba(255, 220, 80, ${Math.random() * 0.28 + 0.12})`;
      ctx.fillRect(0, 0, this.width, this.height);

      // Mega Destruction Laser Beam
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const beamGrad = ctx.createLinearGradient(this.player.x - 35, 0, this.player.x + 35, 0);
      beamGrad.addColorStop(0, 'rgba(255, 80, 0, 0)');
      beamGrad.addColorStop(0.3, 'rgba(255, 200, 0, 0.85)');
      beamGrad.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
      beamGrad.addColorStop(0.7, 'rgba(255, 200, 0, 0.85)');
      beamGrad.addColorStop(1, 'rgba(255, 80, 0, 0)');

      ctx.fillStyle = beamGrad;
      const jitter = (Math.random() - 0.5) * 16;
      ctx.fillRect(this.player.x - 45 + jitter, 0, 90, this.player.y);
      ctx.restore();
    }

    // Drop items
    for (const item of this.dropItems) {
      this.drawDropItem(ctx, item);
    }

    // Enemies
    for (const en of this.enemies) {
      this.drawEnemy(ctx, en);
    }

    // High Glow Lighter Pass for Bullets & Lasers
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Player Bullets
    for (const b of this.playerBullets) {
      ctx.fillStyle = b.color;
      if (b.isLaser) {
        // High intensity laser core
        ctx.fillRect(b.x - b.width / 2, b.y - b.height / 2, b.width, b.height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(b.x - b.width / 4, b.y - b.height / 2, b.width / 2, b.height);
      } else {
        ctx.fillRect(b.x - b.width / 2, b.y - b.height / 2, b.width, b.height);
      }
    }

    // Enemy Danmaku Bullets (CAVE Contrast Glow)
    for (const b of this.enemyBullets) {
      this.drawDanmakuBullet(ctx, b);
    }

    // Particles
    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore(); // restore from lighter mode

    // Player Ship (Source-over)
    if (!this.isGameOver && this.player.active) {
      this.drawPlayer(ctx, inputs.focus);
    }

    // Floating text notifications
    for (const ft of this.floatingTexts) {
      const alpha = ft.life / ft.maxLife;
      ctx.save();
      ctx.fillStyle = ft.color;
      ctx.globalAlpha = alpha;
      ctx.font = `900 ${ft.size}px "Courier New", monospace`;
      ctx.textAlign = 'center';
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 10;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    // Boss Warning Siren Banner
    if (this.warningTimer > 0) {
      this.drawWarningBanner(ctx);
    }

    ctx.restore();
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, isFocus: boolean) {
    if (this.player.invulnerable > 0 && this.player.invulnerable % 6 >= 3) return;

    const ship = SHIPS[this.shipType];
    const px = this.player.x;
    const py = this.player.y;

    ctx.save();
    ctx.translate(px, py);

    // Jet thruster flames
    const flameColor = isFocus ? '#00e1ff' : '#ff4400';
    ctx.fillStyle = flameColor;
    ctx.beginPath();
    ctx.moveTo(-6, 16);
    ctx.lineTo(0, 25 + Math.random() * 10);
    ctx.lineTo(6, 16);
    ctx.closePath();
    ctx.fill();

    // Ship Hull
    ctx.fillStyle = ship.color;
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(17, 12);
    ctx.lineTo(7, 16);
    ctx.lineTo(0, 10);
    ctx.lineTo(-7, 16);
    ctx.lineTo(-17, 12);
    ctx.closePath();
    ctx.fill();

    // Wing accents
    ctx.fillStyle = ship.accentColor;
    ctx.fillRect(-15, 2, 4, 9);
    ctx.fillRect(11, 2, 4, 9);

    // Cockpit Canopy
    ctx.fillStyle = '#112233';
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(4, -3);
    ctx.lineTo(0, 4);
    ctx.lineTo(-4, -3);
    ctx.closePath();
    ctx.fill();

    // --- CAVE Micro Hitbox (2.5px Core) ---
    // Outer white dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, this.player.hitRadius + 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Inner bright red core (Exactly 2.5px radius)
    ctx.fillStyle = '#ff0033';
    ctx.beginPath();
    ctx.arc(0, 0, this.player.hitRadius, 0, Math.PI * 2);
    ctx.fill();

    // Focus Mode Precision Reticle Ring
    if (isFocus) {
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.75)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, this.player.grazeRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Rotating cyber crosshair tick marks
      const rot = this.stageTime * 0.05;
      for (let i = 0; i < 4; i++) {
        const a = rot + (Math.PI / 2) * i;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * (this.player.grazeRadius - 4), Math.sin(a) * (this.player.grazeRadius - 4));
        ctx.lineTo(Math.cos(a) * (this.player.grazeRadius + 4), Math.sin(a) * (this.player.grazeRadius + 4));
        ctx.strokeStyle = '#00ffff';
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  private drawEnemy(ctx: CanvasRenderingContext2D, en: Enemy) {
    ctx.save();
    ctx.translate(en.x, en.y);

    if (en.type === 'zako_drone') {
      ctx.fillStyle = '#ff7700';
      ctx.beginPath();
      ctx.moveTo(0, 16);
      ctx.lineTo(15, -10);
      ctx.lineTo(-15, -10);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ffcc00';
      ctx.fillRect(-4, -4, 8, 8);
    } else if (en.type === 'zako_flyer') {
      ctx.fillStyle = '#00bbff';
      ctx.beginPath();
      ctx.moveTo(0, 18);
      ctx.lineTo(18, -6);
      ctx.lineTo(0, -14);
      ctx.lineTo(-18, -6);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (en.type === 'heavy_tank') {
      ctx.fillStyle = '#664422';
      ctx.fillRect(-24, -20, 48, 40);

      ctx.fillStyle = '#aa7733';
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ff3300';
      ctx.fillRect(-3, 6, 6, 20); // Gun barrel
    } else if (en.type === 'boss') {
      // EMPRESS HIBACHI / CAVE GOLDEN FORTRESS
      ctx.shadowColor = en.color || '#ffbb00';
      ctx.shadowBlur = 18;

      ctx.fillStyle = en.color || '#d49b00';
      ctx.beginPath();
      ctx.moveTo(0, 52);
      ctx.lineTo(46, 12);
      ctx.lineTo(58, -32);
      ctx.lineTo(24, -44);
      ctx.lineTo(0, -28);
      ctx.lineTo(-24, -44);
      ctx.lineTo(-58, -32);
      ctx.lineTo(-46, 12);
      ctx.closePath();
      ctx.fill();

      // Wing Armor Plates
      ctx.fillStyle = '#332211';
      ctx.fillRect(-38, -12, 14, 24);
      ctx.fillRect(24, -12, 14, 24);

      // Core Crystal
      const pulseColor = (en.timer % 12 > 6) ? '#ff0033' : '#ffff00';
      ctx.fillStyle = pulseColor;
      ctx.beginPath();
      ctx.arc(0, 6, 16, 0, Math.PI * 2);
      ctx.fill();

      // Inner eye
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 6, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawDanmakuBullet(ctx: CanvasRenderingContext2D, b: EnemyBullet) {
    if (b.type === 'needle') {
      // Elongated high-speed needle
      const angle = Math.atan2(b.vy, b.vx);
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(angle);

      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, b.radius * 2.2, b.radius * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(0, 0, b.radius * 1.2, b.radius * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    } else {
      // Classic round orb bullet with glowing rim and white center core
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.fill();

      // High contrast white core
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius * 0.46, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
  }

  private drawDropItem(ctx: CanvasRenderingContext2D, item: DropItem) {
    ctx.save();
    ctx.translate(item.x, item.y);

    if (item.type === 'power') {
      // Red Power 'P' capsule
      ctx.fillStyle = '#ff2244';
      ctx.fillRect(-11, -11, 22, 22);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-11, -11, 22, 22);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 14px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('P', 0, 1);
    } else if (item.type === 'bomb') {
      // Orange Bomb 'B' capsule
      ctx.fillStyle = '#ff6600';
      ctx.fillRect(-11, -11, 22, 22);
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-11, -11, 22, 22);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 14px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('B', 0, 1);
    } else if (item.type === 'bee_medal') {
      // Golden Bee Medal (CAVE Signature Hachi Medal)
      const scale = 1 + Math.sin(item.pulseTimer * 0.1) * 0.15;
      ctx.scale(scale, scale);

      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8b6914';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Bee icon silhouette
      ctx.fillStyle = '#332200';
      ctx.beginPath();
      ctx.arc(0, -2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-6, 2, 12, 3);
      ctx.fillRect(-4, 6, 8, 2);
    }

    ctx.restore();
  }

  private drawWarningBanner(ctx: CanvasRenderingContext2D) {
    const isFlashing = Math.floor(this.warningTimer / 10) % 2 === 0;
    ctx.save();

    // Red klaxon band across center
    ctx.fillStyle = isFlashing ? 'rgba(255, 0, 50, 0.45)' : 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, this.height / 2 - 60, this.width, 120);

    ctx.strokeStyle = '#ff0033';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, this.height / 2 - 60, this.width, 120);

    // Hazard stripes
    ctx.fillStyle = '#ffff00';
    ctx.font = '900 36px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ff0033';
    ctx.shadowBlur = 15;
    ctx.fillText('WARNING!!', this.width / 2, this.height / 2 - 12);

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 13px "Courier New", monospace';
    ctx.fillText('A HUGE BATTLESHIP IS APPROACHING RAPIDLY', this.width / 2, this.height / 2 + 20);

    ctx.restore();
  }
}

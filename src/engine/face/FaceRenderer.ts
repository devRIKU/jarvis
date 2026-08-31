import type { ExpressionType } from '../../types/assistant';
import { COLS, ROWS, computeExpressionDots, type DotTarget } from './expressionMatrices';

interface ActiveDot {
  x: number;
  y: number;
  alpha: number;
  targetAlpha: number;
  dx: number;
  dy: number;
  targetDx: number;
  targetDy: number;
  scale: number;
  targetScale: number;
  warmth: number;
  targetWarmth: number;
}

export class FaceRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null = null;

  private dots: ActiveDot[][] = [];
  private currentExpression: ExpressionType = 'idle';
  private audioEnergy: number = 0;
  
  // Gaze & Eye tracking
  private targetGaze: { x: number; y: number } = { x: 0, y: 0 };
  private currentGaze: { x: number; y: number } = { x: 0, y: 0 };
  private lastSaccadeTime: number = 0;
  private nextSaccadeInterval: number = 2000;

  // Blinking
  private blinkProgress: number = 0;
  private isBlinking: boolean = false;
  private lastBlinkTime: number = performance.now();
  private nextBlinkInterval: number = 3800;
  private blinkDurationMs: number = 180;

  // Pointer
  private pointer: { x: number; y: number; active: boolean } = { x: 0.5, y: 0.5, active: false };

  // Timing
  private startTime: number = performance.now();
  private dpr: number = 1;
  private baseDotRadius: number = 3.2;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.initDots();
  }

  private initDots(): void {
    this.dots = [];
    for (let r = 0; r < ROWS; r++) {
      const row: ActiveDot[] = [];
      for (let c = 0; c < COLS; c++) {
        row.push({
          x: c,
          y: r,
          alpha: 0.05,
          targetAlpha: 0.05,
          dx: 0,
          dy: 0,
          targetDx: 0,
          targetDy: 0,
          scale: 1,
          targetScale: 1,
          warmth: 0.5,
          targetWarmth: 0.5,
        });
      }
      this.dots.push(row);
    }
  }

  public setExpression(expression: ExpressionType): void {
    this.currentExpression = expression;
  }

  public setAudioEnergy(energy: number): void {
    this.audioEnergy = energy;
  }

  public setPointer(x: number, y: number, active: boolean = true): void {
    this.pointer.x = x;
    this.pointer.y = y;
    this.pointer.active = active;

    this.targetGaze.x = Math.max(-1, Math.min(1, (x - 0.5) * 2.2));
    this.targetGaze.y = Math.max(-1, Math.min(1, (y - 0.5) * 2.2));
  }

  public setBaseDotSize(size: number): void {
    this.baseDotRadius = size;
  }

  public resize(width: number, height: number): void {
    const renderWidth = Math.floor(width * this.dpr);
    const renderHeight = Math.floor(height * this.dpr);

    if (this.canvas.width !== renderWidth || this.canvas.height !== renderHeight) {
      this.canvas.width = renderWidth;
      this.canvas.height = renderHeight;
    }
  }

  private updateBlink(now: number): void {
    if (!this.isBlinking) {
      if (now - this.lastBlinkTime > this.nextBlinkInterval) {
        this.isBlinking = true;
        this.lastBlinkTime = now;
        this.nextBlinkInterval = 2800 + Math.random() * 3200;
      }
    } else {
      const elapsed = now - this.lastBlinkTime;
      if (elapsed < this.blinkDurationMs) {
        this.blinkProgress = Math.sin((elapsed / this.blinkDurationMs) * Math.PI);
      } else {
        this.isBlinking = false;
        this.blinkProgress = 0;
        this.lastBlinkTime = now;
      }
    }
  }

  private updateSaccades(now: number): void {
    if (!this.pointer.active && now - this.lastSaccadeTime > this.nextSaccadeInterval) {
      this.targetGaze.x = (Math.random() - 0.5) * 0.6;
      this.targetGaze.y = (Math.random() - 0.5) * 0.4;
      this.lastSaccadeTime = now;
      this.nextSaccadeInterval = 1800 + Math.random() * 2500;
    }

    this.currentGaze.x += (this.targetGaze.x - this.currentGaze.x) * 0.12;
    this.currentGaze.y += (this.targetGaze.y - this.currentGaze.y) * 0.12;
  }

  public render(): void {
    if (!this.ctx) return;
    const now = performance.now();
    const elapsedTime = (now - this.startTime) * 0.001;

    this.updateBlink(now);
    this.updateSaccades(now);

    const targetGrid = computeExpressionDots(
      this.currentExpression,
      elapsedTime,
      this.audioEnergy,
      this.blinkProgress,
      this.currentGaze
    );

    const w = this.canvas.width;
    const h = this.canvas.height;
    this.ctx.clearRect(0, 0, w, h);

    const gridAspect = COLS / ROWS;
    let gridWidth = w * 0.78;
    let gridHeight = gridWidth / gridAspect;

    if (gridHeight > h * 0.72) {
      gridHeight = h * 0.72;
      gridWidth = gridHeight * gridAspect;
    }

    const offsetX = (w - gridWidth) * 0.5;
    const offsetY = (h - gridHeight) * 0.46;

    const stepX = gridWidth / (COLS - 1);
    const stepY = gridHeight / (ROWS - 1);

    const springSpeed = 0.18;

    const coolColor = [255, 245, 235];
    const warmAmber = [245, 158, 11];
    const solarGold = [253, 224, 71];
    const crimsonErr = [239, 68, 68];

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const dot = this.dots[r][c];
        const target: DotTarget = targetGrid[r][c];

        dot.alpha += (target.alpha - dot.alpha) * springSpeed;
        dot.dx += (target.dx - dot.dx) * springSpeed;
        dot.dy += (target.dy - dot.dy) * springSpeed;
        dot.scale += (target.scale - dot.scale) * springSpeed;
        dot.warmth += (target.warmth - dot.warmth) * springSpeed;

        if (dot.alpha < 0.015) continue;

        const baseCanvasX = offsetX + c * stepX;
        const baseCanvasY = offsetY + r * stepY;

        const posX = baseCanvasX + dot.dx * stepX;
        const posY = baseCanvasY + dot.dy * stepY;

        let proximityBoost = 0;
        if (this.pointer.active) {
          const pCanvasX = this.pointer.x * w;
          const pCanvasY = this.pointer.y * h;
          const dPointer = Math.hypot(posX - pCanvasX, posY - pCanvasY);
          const proxRadius = 75 * this.dpr;
          if (dPointer < proxRadius) {
            proximityBoost = (1 - dPointer / proxRadius) * 0.35;
          }
        }

        const effectiveAlpha = Math.min(1.0, dot.alpha + proximityBoost);
        const effectiveRadius = (this.baseDotRadius * this.dpr * dot.scale) * (0.8 + effectiveAlpha * 0.4);

        let red = coolColor[0];
        let green = coolColor[1];
        let blue = coolColor[2];

        if (this.currentExpression === 'error') {
          red = crimsonErr[0];
          green = crimsonErr[1];
          blue = crimsonErr[2];
        } else {
          const wVal = Math.max(0, Math.min(1, dot.warmth));
          if (wVal < 0.7) {
            const t = wVal / 0.7;
            red = coolColor[0] * (1 - t) + warmAmber[0] * t;
            green = coolColor[1] * (1 - t) + warmAmber[1] * t;
            blue = coolColor[2] * (1 - t) + warmAmber[2] * t;
          } else {
            const t = (wVal - 0.7) / 0.3;
            red = warmAmber[0] * (1 - t) + solarGold[0] * t;
            green = warmAmber[1] * (1 - t) + solarGold[1] * t;
            blue = warmAmber[2] * (1 - t) + solarGold[2] * t;
          }
        }

        this.ctx.beginPath();
        this.ctx.arc(posX, posY, Math.max(1, effectiveRadius), 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)}, ${effectiveAlpha.toFixed(3)})`;
        this.ctx.fill();

        if (effectiveAlpha > 0.65) {
          this.ctx.beginPath();
          this.ctx.arc(posX, posY, effectiveRadius * 1.8, 0, Math.PI * 2);
          this.ctx.fillStyle = `rgba(${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)}, ${(effectiveAlpha * 0.18).toFixed(3)})`;
          this.ctx.fill();
        }
      }
    }
  }

  public destroy(): void {
    this.dots = [];
  }
}

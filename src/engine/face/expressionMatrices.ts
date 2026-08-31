import type { ExpressionType } from '../../types/assistant';

export const COLS = 48;
export const ROWS = 32;

export interface DotTarget {
  alpha: number;       // 0 to 1
  dx: number;          // relative x displacement
  dy: number;          // relative y displacement
  warmth: number;      // 0 (cool white) to 1 (warm amber/gold)
  scale: number;       // dot radius multiplier (0.5 to 1.8)
}

// Distance helper
function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x1 - x2, y1 - y2);
}

// Capsule/Round segment distance
function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const l2 = (bx - ax) * (bx - ax) + (by - ay) * (by - ay);
  if (l2 === 0) return dist(px, py, ax, ay);
  let t = ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / l2;
  t = Math.max(0, Math.min(1, t));
  return dist(px, py, ax + t * (bx - ax), ay + t * (by - ay));
}

/**
 * Compute the target state for every dot in the matrix for a given expression.
 */
export function computeExpressionDots(
  expression: ExpressionType,
  time: number,
  audioEnergy: number,
  blinkProgress: number, // 0 = open, 1 = fully closed
  eyeOffset: { x: number; y: number } // -1 to 1 gaze vector
): DotTarget[][] {
  const grid: DotTarget[][] = [];

  const leftEyeCenter = { x: 17 + eyeOffset.x * 2.5, y: 15 + eyeOffset.y * 1.5 };
  const rightEyeCenter = { x: 31 + eyeOffset.x * 2.5, y: 15 + eyeOffset.y * 1.5 };
  const eyeRadius = 5.2;

  for (let r = 0; r < ROWS; r++) {
    const row: DotTarget[] = [];
    for (let c = 0; c < COLS; c++) {
      const dot: DotTarget = {
        alpha: 0.04, // ambient baseline dot
        dx: 0,
        dy: 0,
        warmth: 0.5,
        scale: 1.0,
      };

      const dLeft = dist(c, r, leftEyeCenter.x, leftEyeCenter.y);
      const dRight = dist(c, r, rightEyeCenter.x, rightEyeCenter.y);

      // Base eye shape calculation
      let isLeftEye = dLeft < eyeRadius;
      let isRightEye = dRight < eyeRadius;

      // Vertical blink compression
      if (blinkProgress > 0) {
        const blinkThreshold = (1 - blinkProgress) * eyeRadius;
        if (Math.abs(r - leftEyeCenter.y) > blinkThreshold) isLeftEye = false;
        if (Math.abs(r - rightEyeCenter.y) > blinkThreshold) isRightEye = false;

        // Eyelid slit line during full blink
        if (blinkProgress > 0.7) {
          if (Math.abs(r - Math.round(leftEyeCenter.y)) === 0 && Math.abs(c - leftEyeCenter.x) < 5.5) {
            dot.alpha = 0.9;
            dot.warmth = 0.8;
            dot.scale = 1.1;
          }
          if (Math.abs(r - Math.round(rightEyeCenter.y)) === 0 && Math.abs(c - rightEyeCenter.x) < 5.5) {
            dot.alpha = 0.9;
            dot.warmth = 0.8;
            dot.scale = 1.1;
          }
        }
      }

      // Expression logic
      switch (expression) {
        case 'idle': {
          if (isLeftEye || isRightEye) {
            const dMin = Math.min(dLeft, dRight);
            dot.alpha = Math.max(0.2, 1.0 - (dMin / eyeRadius) * 0.4);
            dot.warmth = 0.85;
            dot.scale = 1.25;
            // Pupil highlight
            if (dMin < 1.8) {
              dot.alpha = 1.0;
              dot.warmth = 1.0;
              dot.scale = 1.5;
            }
          }
          // Gentle ambient breathing wave
          const wave = Math.sin(time * 2.0 + (c + r) * 0.2) * 0.03;
          dot.alpha += Math.max(0, wave);
          break;
        }

        case 'listening': {
          // Expanded attentive eyes
          const listenEyeRadius = eyeRadius * 1.15;
          const isL = dLeft < listenEyeRadius;
          const isR = dRight < listenEyeRadius;
          if (isL || isR) {
            const d = Math.min(dLeft, dRight);
            dot.alpha = 0.95 - (d / listenEyeRadius) * 0.3;
            dot.warmth = 0.9;
            dot.scale = 1.35;
          }
          // Lower audio ripple wave
          if (r >= 22 && r <= 26 && c >= 14 && c <= 34) {
            const waveY = Math.sin((c - 14) * 0.6 + time * 6.0) * (2.0 + audioEnergy * 5.0);
            const targetY = 24 + waveY;
            const dWave = Math.abs(r - targetY);
            if (dWave < 1.4) {
              dot.alpha = Math.max(dot.alpha, 0.9 - dWave * 0.4);
              dot.warmth = 0.95;
              dot.scale = 1.4;
            }
          }
          break;
        }

        case 'thinking': {
          // Swirling neural vortex / orbital wave
          const cx = 24;
          const cy = 16;
          const dCenter = dist(c, r, cx, cy);
          const angle = Math.atan2(r - cy, c - cx);
          const spiral = Math.sin(angle * 3.0 - time * 4.0 + dCenter * 0.4);

          if (dCenter < 14 && Math.abs(spiral) > 0.6) {
            dot.alpha = Math.max(0.1, (1.0 - dCenter / 14) * Math.abs(spiral));
            dot.warmth = 0.85 + Math.sin(time * 3.0 + angle) * 0.15;
            dot.scale = 1.3;
            dot.dx = Math.cos(angle + Math.PI / 2) * 1.5;
            dot.dy = Math.sin(angle + Math.PI / 2) * 1.5;
          }

          // Subtle thinking eye pulses
          if (isLeftEye || isRightEye) {
            dot.alpha = 0.6 + Math.sin(time * 4.0) * 0.3;
            dot.warmth = 0.7;
          }
          break;
        }

        case 'focused': {
          // Narrow, sharp focused gaze
          const isFocusedL = Math.abs(c - leftEyeCenter.x) < 5.0 && Math.abs(r - leftEyeCenter.y) < 2.2;
          const isFocusedR = Math.abs(c - rightEyeCenter.x) < 5.0 && Math.abs(r - rightEyeCenter.y) < 2.2;
          if (isFocusedL || isFocusedR) {
            dot.alpha = 1.0;
            dot.warmth = 1.0;
            dot.scale = 1.4;
          }
          // Subtle horizontal scanning beam
          const scanY = 16 + Math.sin(time * 3.0) * 8.0;
          if (Math.abs(r - scanY) < 1.0 && c >= 10 && c <= 38) {
            dot.alpha = Math.max(dot.alpha, 0.5);
            dot.warmth = 0.9;
          }
          break;
        }

        case 'searching': {
          // Directional scanning radar beam across face
          const beamX = ((time * 18.0) % 56) - 4;
          const dBeam = Math.abs(c - beamX);
          if (dBeam < 4.0 && r >= 8 && r <= 24) {
            const beamIntensity = (1.0 - dBeam / 4.0);
            dot.alpha = Math.max(dot.alpha, beamIntensity * 0.85);
            dot.warmth = 0.6; // slightly more cyan-amber hybrid
            dot.scale = 1.2 + beamIntensity * 0.4;
          }
          if (isLeftEye || isRightEye) {
            dot.alpha = 0.8;
            dot.warmth = 0.9;
          }
          break;
        }

        case 'speaking': {
          // Animated eyes
          if (isLeftEye || isRightEye) {
            dot.alpha = 0.95;
            dot.warmth = 0.9;
            dot.scale = 1.3;
          }
          // Reactive waveform mouth
          if (r >= 21 && r <= 27 && c >= 16 && c <= 32) {
            const mouthX = (c - 24) / 8; // -1 to 1
            const mouthEnvelope = Math.max(0, 1.0 - mouthX * mouthX);
            const speechAmp = (0.2 + audioEnergy * 1.6 + Math.sin(time * 12.0) * 0.25) * 3.5;
            const wave = Math.sin((c - 16) * 1.2 + time * 14.0) * speechAmp * mouthEnvelope;
            
            const dMouth = Math.abs(r - (24 + wave));
            if (dMouth < 1.5) {
              dot.alpha = Math.max(dot.alpha, 1.0 - dMouth * 0.4);
              dot.warmth = 1.0;
              dot.scale = 1.4 + (1.0 - dMouth) * 0.4;
              dot.dy = wave * 0.3;
            }
          }
          break;
        }

        case 'happy': {
          // Warm smiling crescent eyes (upside down arcs)
          const arcL = distToSegment(c, r, 13, 16, 21, 16);
          const arcR = distToSegment(c, r, 27, 16, 35, 16);
          const isSmileL = (arcL < 2.2 && r <= 16) || dist(c, r, 17, 13.5) < 3.2 && r < 15;
          const isSmileR = (arcR < 2.2 && r <= 16) || dist(c, r, 31, 13.5) < 3.2 && r < 15;

          if (isSmileL || isSmileR) {
            dot.alpha = 1.0;
            dot.warmth = 1.0;
            dot.scale = 1.4;
          }

          // Gentle warm blushing cheeks
          if (r >= 18 && r <= 20) {
            if (dist(c, r, 12, 19) < 2.5 || dist(c, r, 36, 19) < 2.5) {
              dot.alpha = 0.65;
              dot.warmth = 1.0;
              dot.scale = 1.1;
            }
          }

          // Smiling mouth arc
          if (r >= 22 && r <= 26 && c >= 18 && c <= 30) {
            const mx = (c - 24) / 6;
            const curve = (mx * mx) * 2.2;
            if (Math.abs(r - (22 + curve)) < 1.2) {
              dot.alpha = 0.95;
              dot.warmth = 1.0;
              dot.scale = 1.3;
            }
          }
          break;
        }

        case 'confused': {
          // Asymmetric brows: left eye raised & curious, right eye tilted
          const isCuriousL = dist(c, r, 17, 13) < 4.8;
          const isNarrowR = Math.abs(c - 31) < 4.5 && Math.abs(r - 16) < 2.0;

          if (isCuriousL || isNarrowR) {
            dot.alpha = 0.95;
            dot.warmth = 0.85;
            dot.scale = 1.3;
          }

          // Subtle tilting question-dot orbit
          const qAngle = time * 2.5;
          const qx = 24 + Math.cos(qAngle) * 9.0;
          const qy = 8 + Math.sin(qAngle) * 3.0;
          if (dist(c, r, qx, qy) < 1.8) {
            dot.alpha = 0.9;
            dot.warmth = 1.0;
            dot.scale = 1.4;
          }
          break;
        }

        case 'waiting': {
          // Ambient horizontal wave oscillation
          const waveX = Math.sin(time * 3.0 + r * 0.3) * 3.0;
          if (isLeftEye || isRightEye) {
            dot.alpha = 0.5 + Math.sin(time * 2.5) * 0.3;
            dot.warmth = 0.75;
            dot.dx = waveX * 0.5;
          }
          // Hourglass / pulsing center dots
          if (c >= 20 && c <= 28 && r >= 21 && r <= 27) {
            const pulse = (Math.sin(time * 4.0 - r * 0.5) + 1.0) * 0.5;
            dot.alpha = Math.max(dot.alpha, pulse * 0.8);
            dot.warmth = 0.9;
          }
          break;
        }

        case 'error': {
          // Glitch displacement & chromatic jitter
          const jitterX = (Math.random() - 0.5) * 1.5;
          const jitterY = (Math.random() - 0.5) * 1.5;
          if (isLeftEye || isRightEye) {
            dot.alpha = Math.random() > 0.15 ? 0.95 : 0.2;
            dot.warmth = 0.2; // shifted towards crimson
            dot.dx = jitterX;
            dot.dy = jitterY;
            dot.scale = 1.2;
          }
          // Cross / error shards
          if (Math.abs(c - 24) < 1.2 && r >= 10 && r <= 22) {
            dot.alpha = 0.8;
            dot.warmth = 0.1;
          }
          break;
        }

        case 'success': {
          // Starburst / expanding diamond pulse
          const diamondDist = Math.abs(c - 24) + Math.abs(r - 16);
          const expandRadius = ((time * 12.0) % 24);
          if (Math.abs(diamondDist - expandRadius) < 1.8) {
            const fade = Math.max(0, 1.0 - expandRadius / 24);
            dot.alpha = Math.max(dot.alpha, fade * 0.95);
            dot.warmth = 1.0;
            dot.scale = 1.5;
          }
          // Joyful eyes
          if (isLeftEye || isRightEye) {
            dot.alpha = 1.0;
            dot.warmth = 1.0;
            dot.scale = 1.35;
          }
          break;
        }
      }

      row.push(dot);
    }
    grid.push(row);
  }

  return grid;
}

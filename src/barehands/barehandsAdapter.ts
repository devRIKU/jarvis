import { useAssistantStore } from '../core/state/useAssistantStore';
import type { SpatialGestureState } from '../types/assistant';

export class BarehandsAdapter {
  private static instance: BarehandsAdapter;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private mediaStream: MediaStream | null = null;
  private animFrame: number | null = null;
  private isRunning: boolean = false;

  private prevFrameData: Uint8ClampedArray | null = null;

  private constructor() {}

  public static getInstance(): BarehandsAdapter {
    if (!BarehandsAdapter.instance) {
      BarehandsAdapter.instance = new BarehandsAdapter();
    }
    return BarehandsAdapter.instance;
  }

  public isSupported(): boolean {
    return Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  public async startTracking(): Promise<boolean> {
    if (!this.isSupported()) return false;
    if (this.isRunning) return true;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 320 },
          height: { ideal: 240 },
          facingMode: 'user',
        },
      });

      this.videoElement = document.createElement('video');
      this.videoElement.srcObject = this.mediaStream;
      this.videoElement.playsInline = true;
      this.videoElement.muted = true;
      await this.videoElement.play();

      this.canvasElement = document.createElement('canvas');
      this.canvasElement.width = 80;
      this.canvasElement.height = 60;
      this.ctx = this.canvasElement.getContext('2d', { willReadFrequently: true });

      this.isRunning = true;
      useAssistantStore.getState().setSpatialState({ isTracking: true });

      this.trackLoop();
      return true;
    } catch (err) {
      console.warn('Barehands camera tracking unavailable:', err);
      useAssistantStore.getState().setSpatialState({ isTracking: false });
      return false;
    }
  }

  public stopTracking(): void {
    this.isRunning = false;
    if (this.animFrame) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
    this.prevFrameData = null;
    useAssistantStore.getState().setSpatialState({
      isTracking: false,
      gesture: 'none',
      confidence: 0,
    });
  }

  private trackLoop = (): void => {
    if (!this.isRunning || !this.videoElement || !this.ctx || !this.canvasElement) return;

    if (this.videoElement.readyState >= 2) {
      const w = this.canvasElement.width;
      const h = this.canvasElement.height;

      // Draw mirrored video frame
      this.ctx.save();
      this.ctx.scale(-1, 1);
      this.ctx.drawImage(this.videoElement, -w, 0, w, h);
      this.ctx.restore();

      const imgData = this.ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      // Optical motion centroid detection
      if (this.prevFrameData) {
        let motionPixels = 0;
        let sumX = 0;
        let sumY = 0;

        for (let i = 0; i < data.length; i += 4) {
          const diff =
            Math.abs(data[i] - this.prevFrameData[i]) +
            Math.abs(data[i + 1] - this.prevFrameData[i + 1]) +
            Math.abs(data[i + 2] - this.prevFrameData[i + 2]);

          if (diff > 45) {
            const pixelIdx = i / 4;
            const x = pixelIdx % w;
            const y = Math.floor(pixelIdx / w);
            sumX += x;
            sumY += y;
            motionPixels++;
          }
        }

        if (motionPixels > 30) {
          const avgX = sumX / motionPixels / w;
          const avgY = sumY / motionPixels / h;
          const confidence = Math.min(1.0, motionPixels / (w * h * 0.25));

          let gesture: SpatialGestureState['gesture'] = 'palm';
          if (motionPixels > 400) gesture = 'wave';
          else if (motionPixels < 90) gesture = 'point';

          useAssistantStore.getState().setSpatialState({
            gesture,
            confidence,
            pointer: { x: avgX, y: avgY },
            lastActive: Date.now(),
          });
        }
      }

      this.prevFrameData = new Uint8ClampedArray(data);
    }

    this.animFrame = requestAnimationFrame(this.trackLoop);
  };
}

export const barehandsAdapter = BarehandsAdapter.getInstance();

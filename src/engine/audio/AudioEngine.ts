import { eventBus } from '../../core/events/eventBus';

export class AudioEngine {
  private static instance: AudioEngine;
  private audioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private micAnalyser: AnalyserNode | null = null;
  private outputAnalyser: AnalyserNode | null = null;
  
  private animationFrameId: number | null = null;
  private isAnalyzing: boolean = false;
  private micDataArray: Uint8Array | null = null;
  private outputDataArray: Uint8Array | null = null;

  // VAD State
  private vadActive: boolean = false;
  private speechDetected: boolean = false;
  private silenceStartTime: number = 0;
  private vadSilenceThresholdMs: number = 1400; // 1.4s of silence to commit
  private onSpeechStartCb: (() => void) | null = null;
  private onSpeechEndCb: (() => void) | null = null;

  // Synthetic oscillator for speech animation when audio source node isn't directly tap-able
  private speechOscillator: OscillatorNode | null = null;
  private speechGain: GainNode | null = null;

  private constructor() {}

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  public async initContext(): Promise<AudioContext> {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
      
      // Setup output analyser
      this.outputAnalyser = this.audioCtx.createAnalyser();
      this.outputAnalyser.fftSize = 128;
      this.outputAnalyser.smoothingTimeConstant = 0.8;
      this.outputDataArray = new Uint8Array(this.outputAnalyser.frequencyBinCount);
    }

    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    return this.audioCtx;
  }

  public async startMicrophone(
    onSpeechStart?: () => void,
    onSpeechEnd?: () => void
  ): Promise<boolean> {
    try {
      await this.initContext();
      if (!this.audioCtx) return false;

      this.onSpeechStartCb = onSpeechStart || null;
      this.onSpeechEndCb = onSpeechEnd || null;

      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.micSource = this.audioCtx.createMediaStreamSource(this.micStream);
      this.micAnalyser = this.audioCtx.createAnalyser();
      this.micAnalyser.fftSize = 128;
      this.micAnalyser.smoothingTimeConstant = 0.75;
      this.micDataArray = new Uint8Array(this.micAnalyser.frequencyBinCount);

      this.micSource.connect(this.micAnalyser);

      this.startAnalysisLoop();
      return true;
    } catch (err) {
      console.warn('Microphone access denied or unavailable:', err);
      return false;
    }
  }

  public stopMicrophone(): void {
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }
    if (this.micSource) {
      try {
        this.micSource.disconnect();
      } catch {}
      this.micSource = null;
    }
    this.speechDetected = false;
    this.silenceStartTime = 0;
  }

  public setVADEnabled(enabled: boolean): void {
    this.vadActive = enabled;
  }

  public getOutputAnalyser(): AnalyserNode | null {
    return this.outputAnalyser;
  }

  /**
   * Start synthetic speech audio modulation for realistic mouth and gradient reactivity
   * during TTS playback.
   */
  public startSpeechModulation(rate: number = 1.0): void {
    if (!this.audioCtx || !this.outputAnalyser) return;
    
    this.stopSpeechModulation();

    try {
      this.speechOscillator = this.audioCtx.createOscillator();
      this.speechGain = this.audioCtx.createGain();

      this.speechOscillator.type = 'sawtooth';
      this.speechOscillator.frequency.setValueAtTime(130 * rate, this.audioCtx.currentTime);

      this.speechGain.gain.setValueAtTime(0.0001, this.audioCtx.currentTime);

      this.speechOscillator.connect(this.speechGain);
      this.speechGain.connect(this.outputAnalyser);

      this.speechOscillator.start();
      this.startAnalysisLoop();
    } catch (e) {
      console.warn('Could not start speech modulation:', e);
    }
  }

  public stopSpeechModulation(): void {
    if (this.speechOscillator) {
      try {
        this.speechOscillator.stop();
        this.speechOscillator.disconnect();
      } catch {}
      this.speechOscillator = null;
    }
    if (this.speechGain) {
      try {
        this.speechGain.disconnect();
      } catch {}
      this.speechGain = null;
    }
  }

  private startAnalysisLoop(): void {
    if (this.isAnalyzing) return;
    this.isAnalyzing = true;

    const analyze = () => {
      let micEnergy = 0;
      let outEnergy = 0;

      // Analyze microphone
      if (this.micAnalyser && this.micDataArray) {
        (this.micAnalyser as any).getByteFrequencyData(this.micDataArray);
        let sum = 0;
        for (let i = 0; i < this.micDataArray.length; i++) {
          sum += this.micDataArray[i];
        }
        micEnergy = sum / (this.micDataArray.length * 255);

        // VAD processing
        if (this.vadActive) {
          this.processVAD(micEnergy);
        }
      }

      // Analyze output audio
      if (this.outputAnalyser && this.outputDataArray) {
        (this.outputAnalyser as any).getByteFrequencyData(this.outputDataArray);
        let sum = 0;
        for (let i = 0; i < this.outputDataArray.length; i++) {
          sum += this.outputDataArray[i];
        }
        outEnergy = sum / (this.outputDataArray.length * 255);
      }

      const totalEnergy = Math.max(micEnergy, outEnergy);
      eventBus.emit('audioEnergy', totalEnergy);

      if (this.micDataArray || this.outputDataArray) {
        const activeArray = outEnergy > 0.05 ? this.outputDataArray : this.micDataArray;
        if (activeArray) {
          eventBus.emit('audioFrequencyData', Array.from(activeArray));
        }
      }

      this.animationFrameId = requestAnimationFrame(analyze);
    };

    this.animationFrameId = requestAnimationFrame(analyze);
  }

  private processVAD(energy: number): void {
    const speechThreshold = 0.08;
    const now = performance.now();

    if (energy > speechThreshold) {
      if (!this.speechDetected) {
        this.speechDetected = true;
        this.silenceStartTime = 0;
        if (this.onSpeechStartCb) {
          this.onSpeechStartCb();
        }
      } else {
        this.silenceStartTime = 0;
      }
    } else {
      if (this.speechDetected) {
        if (this.silenceStartTime === 0) {
          this.silenceStartTime = now;
        } else if (now - this.silenceStartTime > this.vadSilenceThresholdMs) {
          this.speechDetected = false;
          this.silenceStartTime = 0;
          if (this.onSpeechEndCb) {
            this.onSpeechEndCb();
          }
        }
      }
    }
  }

  public cleanup(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.isAnalyzing = false;
    this.stopMicrophone();
    this.stopSpeechModulation();
  }
}

export const audioEngine = AudioEngine.getInstance();

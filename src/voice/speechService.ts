import { audioEngine } from '../engine/audio/AudioEngine';
import { useAssistantStore } from '../core/state/useAssistantStore';

export class SpeechService {
  private static instance: SpeechService;
  private recognition: any = null;
  private isListening: boolean = false;
  private currentTranscript: string = '';
  private onTranscriptCallback: ((text: string, isFinal: boolean) => void) | null = null;
  private onSpeechCommitCallback: ((text: string) => void) | null = null;

  private availableVoices: SpeechSynthesisVoice[] = [];
  private selectedVoice: SpeechSynthesisVoice | null = null;

  private constructor() {
    this.initVoices();
  }

  public static getInstance(): SpeechService {
    if (!SpeechService.instance) {
      SpeechService.instance = new SpeechService();
    }
    return SpeechService.instance;
  }

  private initVoices(): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const loadVoices = () => {
      this.availableVoices = window.speechSynthesis.getVoices();
      this.autoSelectWarmVoice();
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  /**
   * Intelligently selects the highest quality, most natural, warm human voice available.
   */
  private autoSelectWarmVoice(): void {
    if (this.availableVoices.length === 0) return;

    // Preferred keywords for natural/neural human voices
    const preferredNames = [
      'Google US English',
      'Microsoft Jenny Online (Natural)',
      'Microsoft Aria Online (Natural)',
      'Microsoft Guy Online (Natural)',
      'Samantha',
      'Karen',
      'Google UK English Female',
      'Daniel',
      'en-US-Neural2-F',
      'en-US-Wavenet',
    ];

    for (const name of preferredNames) {
      const match = this.availableVoices.find(
        (v) => v.name.includes(name) || v.voiceURI.includes(name)
      );
      if (match) {
        this.selectedVoice = match;
        return;
      }
    }

    // Fallback to any high-quality English voice
    const enVoice = this.availableVoices.find(
      (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Enhanced'))
    );
    if (enVoice) {
      this.selectedVoice = enVoice;
      return;
    }

    // Default to first English voice or first voice
    this.selectedVoice =
      this.availableVoices.find((v) => v.lang.startsWith('en')) || this.availableVoices[0];
  }

  public getVoices(): SpeechSynthesisVoice[] {
    return this.availableVoices;
  }

  public setVoiceByName(name: string): void {
    const v = this.availableVoices.find((item) => item.name === name);
    if (v) this.selectedVoice = v;
  }

  public async startListening(
    onTranscript: (text: string, isFinal: boolean) => void,
    onCommit: (text: string) => void
  ): Promise<boolean> {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('SpeechRecognition API is not supported in this browser.');
      return false;
    }

    this.onTranscriptCallback = onTranscript;
    this.onSpeechCommitCallback = onCommit;
    this.currentTranscript = '';

    try {
      // Start microphone stream and VAD in AudioEngine
      await audioEngine.startMicrophone(
        () => {
          // Speech started
          useAssistantStore.getState().setState('listening', 'Hearing your voice...');
        },
        () => {
          // Speech ended via VAD silence detector
          if (this.currentTranscript.trim()) {
            this.commitCurrentSpeech();
          }
        }
      );

      const vadEnabled = useAssistantStore.getState().settings.vadEnabled;
      audioEngine.setVADEnabled(vadEnabled);

      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.isListening = true;
        useAssistantStore.getState().setVoiceActive(true);
        useAssistantStore.getState().setState('listening', 'Listening...');
      };

      this.recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        const text = final || interim;
        this.currentTranscript = text;

        if (this.onTranscriptCallback) {
          this.onTranscriptCallback(text, Boolean(final));
        }
      };

      this.recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'no-speech') return;
        useAssistantStore.getState().setVoiceActive(false);
      };

      this.recognition.onend = () => {
        if (this.isListening && useAssistantStore.getState().isContinuousVAD) {
          // Restart for continuous mode
          try {
            this.recognition.start();
          } catch {}
        } else {
          this.isListening = false;
          useAssistantStore.getState().setVoiceActive(false);
        }
      };

      this.recognition.start();
      return true;
    } catch (err) {
      console.error('Error starting speech recognition:', err);
      return false;
    }
  }

  public commitCurrentSpeech(): void {
    const text = this.currentTranscript.trim();
    if (!text) return;

    if (this.onSpeechCommitCallback) {
      this.onSpeechCommitCallback(text);
    }
    this.currentTranscript = '';
  }

  public stopListening(): void {
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
      this.recognition = null;
    }
    audioEngine.stopMicrophone();
    useAssistantStore.getState().setVoiceActive(false);
  }

  /**
   * Speak text with realistic warm voice synthesis and audio-reactive visualization.
   */
  public async speak(text: string): Promise<void> {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    // Clean markdown and symbols from spoken text
    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'Code block omitted.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[*#_~>]/g, '')
      .trim();

    if (!cleanText) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    audioEngine.stopSpeechModulation();

    const settings = useAssistantStore.getState().settings;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }
    utterance.rate = settings.speechRate || 1.0;
    utterance.pitch = settings.speechPitch || 1.0;

    utterance.onstart = () => {
      useAssistantStore.getState().setState('speaking', 'Speaking...');
      audioEngine.startSpeechModulation(settings.speechRate || 1.0);
    };

    utterance.onend = () => {
      audioEngine.stopSpeechModulation();
      useAssistantStore.getState().setState('idle', 'Ready and ambient');
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis error:', e);
      audioEngine.stopSpeechModulation();
      useAssistantStore.getState().setState('idle', 'Ready and ambient');
    };

    window.speechSynthesis.speak(utterance);
  }

  public stopSpeaking(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    audioEngine.stopSpeechModulation();
    useAssistantStore.getState().setState('idle', 'Ready and ambient');
  }
}

export const speechService = SpeechService.getInstance();

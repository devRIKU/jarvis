import React, { useEffect, useState } from 'react';
import { useAssistantStore } from '../../../core/state/useAssistantStore';
import { speechService } from '../../../voice/speechService';
import {
  Key,
  Cpu,
  Volume2,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

export const SettingsTab: React.FC = () => {
  const { settings, updateSettings } = useAssistantStore();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [keySaved, setKeySaved] = useState(false);

  useEffect(() => {
    setVoices(speechService.getVoices());
  }, []);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSettings({ apiKey: e.target.value });
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  };

  const testSpeech = () => {
    speechService.speak('Hello! My warm, organic voice and visual synthesis are configured.');
  };

  return (
    <div className="space-y-8">
      {/* 1. AI Model & API Gateway */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium text-stone-100 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-amber-400" />
            Intelligence Engine & Model Gateway
          </h3>
          <p className="text-sm text-stone-400">
            Configure Google Gemini or arbitrary OpenAI-compatible endpoints.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-stone-900/50 border border-stone-800 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Provider Selection */}
            <div>
              <label className="text-xs text-stone-400 block mb-1.5 font-medium">Provider</label>
              <select
                value={settings.provider}
                onChange={(e) => updateSettings({ provider: e.target.value as any })}
                className="w-full px-3 py-2 bg-black/50 border border-stone-800 rounded-xl text-stone-200 text-xs focus:outline-none focus:border-amber-500"
              >
                <option value="gemini">Google Gemini (Recommended)</option>
                <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
                <option value="openrouter">OpenRouter (Multi-Model)</option>
                <option value="ollama">Ollama (Local)</option>
                <option value="custom">Custom OpenAI-Compatible</option>
              </select>
            </div>

            {/* Model Name */}
            <div>
              <label className="text-xs text-stone-400 block mb-1.5 font-medium">Model ID</label>
              {settings.provider === 'gemini' ? (
                <select
                  value={settings.model}
                  onChange={(e) => updateSettings({ model: e.target.value })}
                  className="w-full px-3 py-2 bg-black/50 border border-stone-800 rounded-xl text-stone-200 text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="gemini-2.5-flash">gemini-2.5-flash (Fast, Recommended)</option>
                  <option value="gemini-2.5-pro">gemini-2.5-pro (Deep Reasoning)</option>
                  <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite</option>
                </select>
              ) : (
                <input
                  type="text"
                  value={settings.model}
                  onChange={(e) => updateSettings({ model: e.target.value })}
                  placeholder="e.g. gpt-4o, llama-3.3-70b..."
                  className="w-full px-3 py-2 bg-black/50 border border-stone-800 rounded-xl text-stone-200 text-xs focus:outline-none focus:border-amber-500"
                />
              )}
            </div>
          </div>

          {/* API Key */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-stone-400 font-medium flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                API Key
              </label>
              {keySaved && (
                <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Saved locally
                </span>
              )}
            </div>
            <input
              type="password"
              value={settings.apiKey}
              onChange={handleApiKeyChange}
              placeholder={
                settings.provider === 'gemini'
                  ? 'Enter your Google Gemini API Key...'
                  : 'Enter your API Key...'
              }
              className="w-full px-4 py-2.5 bg-black/60 border border-stone-800 rounded-xl text-stone-200 font-mono text-xs focus:outline-none focus:border-amber-500"
            />
            <p className="text-[11px] text-stone-500 mt-1">
              Keys are stored securely in browser local storage and never sent to third-party tracking servers.
            </p>
          </div>

          {/* Base URL (if custom or openrouter or ollama) */}
          {settings.provider !== 'gemini' && (
            <div>
              <label className="text-xs text-stone-400 block mb-1.5 font-medium">Base URL</label>
              <input
                type="text"
                value={settings.baseUrl}
                onChange={(e) => updateSettings({ baseUrl: e.target.value })}
                placeholder="https://api.openai.com/v1"
                className="w-full px-3 py-2 bg-black/50 border border-stone-800 rounded-xl text-stone-200 font-mono text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* 2. Voice & Speech Synthesis (TTS / VAD) */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium text-stone-100 flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-amber-400" />
            Voice, TTS & Voice Activity Detection (VAD)
          </h3>
          <p className="text-sm text-stone-400">
            Natural speech synthesis and continuous hands-free voice controls.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-stone-900/50 border border-stone-800 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Voice Selector */}
            <div>
              <label className="text-xs text-stone-400 block mb-1.5 font-medium">TTS Voice</label>
              <select
                value={settings.voiceName}
                onChange={(e) => {
                  updateSettings({ voiceName: e.target.value });
                  speechService.setVoiceByName(e.target.value);
                }}
                className="w-full px-3 py-2 bg-black/50 border border-stone-800 rounded-xl text-stone-200 text-xs focus:outline-none focus:border-amber-500"
              >
                <option value="">Auto (Warmest Natural Neural Voice)</option>
                {voices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>

            {/* Test Voice Button */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={testSpeech}
                className="w-full px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-all"
              >
                <Volume2 className="w-4 h-4" />
                <span>Audition Voice</span>
              </button>
            </div>
          </div>

          {/* Speed & Pitch Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <div className="flex justify-between text-xs text-stone-400 mb-1">
                <span>Speech Rate</span>
                <span>{settings.speechRate.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.75"
                max="1.5"
                step="0.05"
                value={settings.speechRate}
                onChange={(e) => updateSettings({ speechRate: parseFloat(e.target.value) })}
                className="w-full accent-amber-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-stone-400 mb-1">
                <span>Speech Pitch</span>
                <span>{settings.speechPitch.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.75"
                max="1.3"
                step="0.05"
                value={settings.speechPitch}
                onChange={(e) => updateSettings({ speechPitch: parseFloat(e.target.value) })}
                className="w-full accent-amber-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Visual & Aesthetic Atmosphere */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium text-stone-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Atmospheric & Shader Rendering
          </h3>
          <p className="text-sm text-stone-400">
            Tune live gradient fluid warmth, bloom intensity, and dot matrix density.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-stone-900/50 border border-stone-800 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="flex justify-between text-xs text-stone-400 mb-1">
                <span>Warmth Level</span>
                <span>{Math.round(settings.warmthLevel * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="1.5"
                step="0.05"
                value={settings.warmthLevel}
                onChange={(e) => updateSettings({ warmthLevel: parseFloat(e.target.value) })}
                className="w-full accent-amber-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-stone-400 mb-1">
                <span>Bloom & Glow</span>
                <span>{Math.round(settings.bloomIntensity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="1.5"
                step="0.05"
                value={settings.bloomIntensity}
                onChange={(e) => updateSettings({ bloomIntensity: parseFloat(e.target.value) })}
                className="w-full accent-amber-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-stone-400 mb-1">
                <span>Matrix Dot Size</span>
                <span>{settings.dotSize.toFixed(1)}px</span>
              </div>
              <input
                type="range"
                min="2.0"
                max="5.0"
                step="0.2"
                value={settings.dotSize}
                onChange={(e) => updateSettings({ dotSize: parseFloat(e.target.value) })}
                className="w-full accent-amber-400"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

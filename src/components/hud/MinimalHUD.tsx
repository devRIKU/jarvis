import React, { useState, useRef, useEffect } from 'react';
import { useAssistantStore } from '../../core/state/useAssistantStore';
import { modelGateway } from '../../gateway/geminiClient';
import { speechService } from '../../voice/speechService';
import { ExpressionTester } from './ExpressionTester';
import {
  Mic,
  Send,
  Sparkles,
  Zap,
  Brain,
  Wrench,
  Radio,
  Settings,
  Volume2,
  VolumeX,
} from 'lucide-react';

export const MinimalHUD: React.FC = () => {
  const {
    state,
    statusMessage,
    isVoiceActive,
    isContinuousVAD,
    setContinuousVAD,
    setWorkspaceOpen,
    addMessage,
    appendStreamingChunk,
    updateMessage,
    settings,
    updateSettings,
  } = useAssistantStore();

  const [inputVal, setInputVal] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== textareaRef.current) {
        e.preventDefault();
        textareaRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputVal).trim();
    if (!text || isSubmitting) return;

    setInputVal('');
    setIsSubmitting(true);

    addMessage({
      role: 'user',
      content: text,
    });

    const assistantMsgId = addMessage({
      role: 'assistant',
      content: '',
      isStreaming: true,
    });

    try {
      const messages = useAssistantStore.getState().messages;

      const fullResponse = await modelGateway.generateStreamingResponse({
        messages,
        onChunk: (chunk) => {
          appendStreamingChunk(assistantMsgId, chunk);
        },
        onToolCall: (toolCall) => {
          useAssistantStore.getState().addToolCallToMessage(assistantMsgId, toolCall);
        },
      });

      updateMessage(assistantMsgId, { isStreaming: false });

      if (settings.autoSpeak && fullResponse) {
        speechService.speak(fullResponse);
      }
    } catch (err: any) {
      console.error('Error generating assistant response:', err);
      appendStreamingChunk(
        assistantMsgId,
        `\n\n[Connection Error: ${err.message || 'Failed to complete request'}]`
      );
      updateMessage(assistantMsgId, { isStreaming: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleVoice = async () => {
    if (isVoiceActive) {
      speechService.stopListening();
    } else {
      await speechService.startListening(
        (transcript, _isFinal) => {
          setInputVal(transcript);
        },
        (finalTranscript) => {
          handleSendMessage(finalTranscript);
        }
      );
    }
  };

  const getStateBadgeColor = () => {
    switch (state) {
      case 'listening':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse';
      case 'thinking':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40 animate-pulse';
      case 'speaking':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'searching':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
      case 'error':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'success':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      default:
        return 'bg-black/40 text-stone-300 border-stone-800';
    }
  };

  return (
    <div className="fixed bottom-6 inset-x-0 z-30 flex flex-col items-center px-4 pointer-events-none gap-3">
      {/* Expression Audition Bar */}
      <div className="pointer-events-auto">
        <ExpressionTester />
      </div>

      {/* Main Floating HUD Container */}
      <div className="w-full max-w-2xl bg-stone-950/80 backdrop-blur-2xl border border-stone-800/90 hover:border-amber-500/30 rounded-3xl shadow-2xl p-2 sm:p-3 pointer-events-auto transition-all duration-300">
        {/* Status Bar & Quick Modes */}
        <div className="flex items-center justify-between px-3 pb-2 text-[11px] text-stone-400 border-b border-stone-800/50">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded-full border text-[10px] font-medium tracking-wide uppercase transition-colors ${getStateBadgeColor()}`}
            >
              {state}
            </span>
            <span className="truncate max-w-[200px] sm:max-w-xs font-light text-stone-400">
              {statusMessage}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* VAD Toggle Button */}
            <button
              onClick={() => setContinuousVAD(!isContinuousVAD)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                isContinuousVAD
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-stone-500 hover:text-stone-300'
              }`}
              title="Continuous Hands-Free Voice Detection"
            >
              <Radio className="w-2.5 h-2.5" />
              <span>VAD Hands-Free</span>
            </button>

            {/* Auto-Speak Toggle */}
            <button
              onClick={() => updateSettings({ autoSpeak: !settings.autoSpeak })}
              className={`p-1 rounded text-[10px] transition-colors ${
                settings.autoSpeak ? 'text-amber-300' : 'text-stone-600'
              }`}
              title={settings.autoSpeak ? 'Auto-TTS Enabled' : 'Auto-TTS Muted'}
            >
              {settings.autoSpeak ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Input Bar */}
        <div className="flex items-center gap-2 pt-2 px-1">
          {/* Voice Mic Button */}
          <button
            onClick={handleToggleVoice}
            className={`p-3 rounded-2xl transition-all duration-200 flex items-center justify-center ${
              isVoiceActive
                ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-lg shadow-rose-500/30 scale-105 animate-pulse'
                : 'bg-stone-900/80 hover:bg-stone-800 text-stone-300 hover:text-amber-200 border border-stone-800'
            }`}
            title={isVoiceActive ? 'Stop Listening' : 'Speak to Assistant'}
          >
            {isVoiceActive ? <Mic className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Text Input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ask anything, formulate a plan, search the web... (Press / to focus)"
              className="w-full px-4 py-2.5 bg-black/40 border border-stone-800/80 rounded-2xl text-stone-100 placeholder-stone-500 text-sm focus:outline-none focus:border-amber-500/50 resize-none font-light leading-relaxed"
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
          </div>

          {/* Send Button */}
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputVal.trim() || isSubmitting}
            className="p-3 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-2xl shadow-md shadow-amber-500/20 transition-all flex items-center justify-center"
            title="Send Message (Enter)"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Workspace Quick Launchers */}
        <div className="flex items-center justify-around pt-2 px-2 border-t border-stone-900 mt-2">
          <button
            onClick={() => setWorkspaceOpen(true, 'conversation')}
            className="flex items-center gap-1 text-[11px] text-stone-400 hover:text-amber-300 transition-colors py-1 px-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Chat</span>
          </button>
          <button
            onClick={() => setWorkspaceOpen(true, 'agent')}
            className="flex items-center gap-1 text-[11px] text-stone-400 hover:text-amber-300 transition-colors py-1 px-2"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Agent</span>
          </button>
          <button
            onClick={() => setWorkspaceOpen(true, 'memory')}
            className="flex items-center gap-1 text-[11px] text-stone-400 hover:text-amber-300 transition-colors py-1 px-2"
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Memory</span>
          </button>
          <button
            onClick={() => setWorkspaceOpen(true, 'tools')}
            className="flex items-center gap-1 text-[11px] text-stone-400 hover:text-amber-300 transition-colors py-1 px-2"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Tools & MCP</span>
          </button>
          <button
            onClick={() => setWorkspaceOpen(true, 'settings')}
            className="flex items-center gap-1 text-[11px] text-stone-400 hover:text-amber-300 transition-colors py-1 px-2"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};

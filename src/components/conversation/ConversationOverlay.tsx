import React, { useEffect, useRef } from 'react';
import { useAssistantStore } from '../../core/state/useAssistantStore';
import { speechService } from '../../voice/speechService';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import {
  Volume2,
  Copy,
  Check,
  Sparkles,
  Terminal,
  ChevronDown,
} from 'lucide-react';

export const ConversationOverlay: React.FC = () => {
  const { messages, streamingMessageId, setWorkspaceOpen } = useAssistantStore();
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingMessageId]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeak = (text: string) => {
    speechService.speak(text);
  };

  const renderMarkdown = (content: string) => {
    const rawHtml = marked.parse(content, { async: false }) as string;
    const cleanHtml = DOMPurify.sanitize(rawHtml);
    return { __html: cleanHtml };
  };

  if (messages.length === 0) return null;

  const visibleMessages = messages.slice(-4);

  return (
    <div className="fixed top-20 left-6 max-w-lg w-full z-20 pointer-events-none hidden md:block">
      <div
        ref={scrollRef}
        className="space-y-3 max-h-[62vh] overflow-y-auto pr-2 no-scrollbar pointer-events-auto"
      >
        {visibleMessages.map((msg) => {
          const isUser = msg.role === 'user';
          const isStreaming = msg.id === streamingMessageId;

          return (
            <div
              key={msg.id}
              className={`p-4 rounded-2xl backdrop-blur-xl transition-all duration-300 border ${
                isUser
                  ? 'bg-amber-950/25 border-amber-500/30 text-amber-100 ml-12 shadow-lg shadow-amber-950/20'
                  : 'bg-black/40 border-stone-800/80 text-stone-200 mr-4 shadow-xl'
              }`}
            >
              {/* Message Header */}
              <div className="flex items-center justify-between mb-1.5 text-[11px] font-medium tracking-wider text-amber-400/60 uppercase">
                <div className="flex items-center gap-1.5">
                  {isUser ? (
                    <span>You</span>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>Assistant</span>
                    </>
                  )}
                </div>

                {!isUser && (
                  <div className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleSpeak(msg.content)}
                      className="p-1 hover:text-amber-300 rounded"
                      title="Speak message"
                    >
                      <Volume2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="p-1 hover:text-amber-300 rounded"
                      title="Copy text"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Tool Execution Cards */}
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="my-2 space-y-1.5">
                  {msg.toolCalls.map((tc) => (
                    <div
                      key={tc.id}
                      className="p-2 rounded-lg bg-black/60 border border-amber-500/20 text-xs font-mono"
                    >
                      <div className="flex items-center justify-between text-amber-300/80 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Terminal className="w-3 h-3" />
                          <span>tool: {tc.name}</span>
                        </div>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            tc.status === 'success'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : tc.status === 'running'
                              ? 'bg-amber-500/20 text-amber-300 animate-pulse'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {tc.status}
                        </span>
                      </div>
                      {tc.result && (
                        <div className="mt-1 text-[11px] text-stone-400 truncate">
                          {JSON.stringify(tc.result)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Message Content */}
              <div
                className="prose prose-invert prose-sm max-w-none text-stone-200 leading-relaxed font-light break-words"
                dangerouslySetInnerHTML={renderMarkdown(msg.content)}
              />

              {isStreaming && (
                <span className="inline-block w-1.5 h-3.5 bg-amber-400 ml-1 animate-pulse" />
              )}
            </div>
          );
        })}
      </div>

      {messages.length > 4 && (
        <button
          onClick={() => setWorkspaceOpen(true, 'conversation')}
          className="mt-2 flex items-center gap-1.5 text-xs text-amber-300/70 hover:text-amber-200 transition-colors pointer-events-auto px-2 py-1 bg-black/30 backdrop-blur rounded-lg border border-amber-500/10"
        >
          <ChevronDown className="w-3.5 h-3.5" />
          <span>View all {messages.length} messages in Workspace</span>
        </button>
      )}
    </div>
  );
};

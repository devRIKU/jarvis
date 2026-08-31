import React from 'react';
import { useAssistantStore } from '../../core/state/useAssistantStore';
import { AgentTab } from './tabs/AgentTab';
import { MemoryTab } from './tabs/MemoryTab';
import { ToolsMcpTab } from './tabs/ToolsMcpTab';
import { BarehandsTab } from './tabs/BarehandsTab';
import { SettingsTab } from './tabs/SettingsTab';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { speechService } from '../../voice/speechService';
import {
  X,
  MessageSquare,
  Zap,
  Brain,
  Wrench,
  Hand,
  Settings,
  Trash2,
  Volume2,
  Copy,
  Check,
  Sparkles,
  Terminal,
} from 'lucide-react';

export const ExpandedWorkspace: React.FC = () => {
  const {
    isWorkspaceOpen,
    setWorkspaceOpen,
    activeWorkspaceTab,
    setActiveWorkspaceTab,
    messages,
    clearMessages,
  } = useAssistantStore();

  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  if (!isWorkspaceOpen) return null;

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const navTabs = [
    { id: 'conversation', label: 'Conversation', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'agent', label: 'Agent Runtime', icon: <Zap className="w-4 h-4" /> },
    { id: 'memory', label: 'Memory', icon: <Brain className="w-4 h-4" /> },
    { id: 'tools', label: 'Tools & MCP', icon: <Wrench className="w-4 h-4" /> },
    { id: 'barehands', label: 'Spatial', icon: <Hand className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-2xl animate-fade-in">
      <div className="w-full max-w-5xl h-[88vh] bg-stone-950/90 border border-stone-800/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Workspace Top Bar */}
        <div className="px-6 py-4 border-b border-stone-800/80 flex items-center justify-between bg-stone-900/40">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50 animate-pulse" />
            <h2 className="text-base font-medium text-stone-100 tracking-wide">
              Workspace & Neural Runtime
            </h2>
          </div>

          <button
            onClick={() => setWorkspaceOpen(false)}
            className="p-2 rounded-xl bg-stone-800/60 hover:bg-stone-700 text-stone-400 hover:text-stone-100 transition-colors"
            title="Close Workspace (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workspace Navigation Tabs */}
        <div className="px-6 pt-3 border-b border-stone-800/60 flex gap-2 overflow-x-auto no-scrollbar bg-stone-900/20">
          {navTabs.map((tab) => {
            const isActive = activeWorkspaceTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveWorkspaceTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-medium transition-all whitespace-nowrap border-b-2 ${
                  isActive
                    ? 'border-amber-400 text-amber-200 bg-stone-900/80'
                    : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-900/30'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Workspace Body Content */}
        <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
          {/* Conversation Tab */}
          {activeWorkspaceTab === 'conversation' && (
            <div className="space-y-4 max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-stone-400">
                  {messages.length} messages in conversation
                </span>
                <button
                  onClick={clearMessages}
                  className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-lg text-xs text-rose-300 flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear History</span>
                </button>
              </div>

              <div className="space-y-4">
                {messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`p-4 rounded-2xl border ${
                        isUser
                          ? 'bg-amber-950/20 border-amber-500/30 text-amber-100 ml-8'
                          : 'bg-stone-900/50 border-stone-800 text-stone-200 mr-8'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2 text-xs text-stone-400">
                        <div className="flex items-center gap-1.5">
                          {isUser ? (
                            <span className="font-semibold text-amber-300">You</span>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                              <span className="font-semibold text-stone-200">Assistant</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-stone-500">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </span>
                          {!isUser && (
                            <>
                              <button
                                onClick={() => speechService.speak(msg.content)}
                                className="hover:text-amber-300 p-1 rounded"
                                title="Speak"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleCopy(msg.id, msg.content)}
                                className="hover:text-amber-300 p-1 rounded"
                                title="Copy"
                              >
                                {copiedId === msg.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Tool Calls */}
                      {msg.toolCalls && msg.toolCalls.length > 0 && (
                        <div className="my-2 space-y-1.5">
                          {msg.toolCalls.map((tc) => (
                            <div
                              key={tc.id}
                              className="p-2 rounded-lg bg-black/60 border border-amber-500/20 text-xs font-mono"
                            >
                              <div className="flex items-center justify-between text-amber-300 text-[11px]">
                                <span className="flex items-center gap-1">
                                  <Terminal className="w-3 h-3" />
                                  tool: {tc.name}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] ${
                                    tc.status === 'success'
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : 'bg-amber-500/20 text-amber-300'
                                  }`}
                                >
                                  {tc.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div
                        className="prose prose-invert prose-sm max-w-none text-stone-200 leading-relaxed font-light break-words"
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(
                            marked.parse(msg.content, { async: false }) as string
                          ),
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeWorkspaceTab === 'agent' && <AgentTab />}
          {activeWorkspaceTab === 'memory' && <MemoryTab />}
          {activeWorkspaceTab === 'tools' && <ToolsMcpTab />}
          {activeWorkspaceTab === 'barehands' && <BarehandsTab />}
          {activeWorkspaceTab === 'settings' && <SettingsTab />}
        </div>
      </div>
    </div>
  );
};

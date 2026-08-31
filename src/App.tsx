import { useEffect } from 'react';
import { VisualEngine } from './engine/VisualEngine';
import { MinimalHUD } from './components/hud/MinimalHUD';
import { ConversationOverlay } from './components/conversation/ConversationOverlay';
import { ExpandedWorkspace } from './components/workspace/ExpandedWorkspace';
import { useAssistantStore } from './core/state/useAssistantStore';
import { Sparkles } from 'lucide-react';

export default function App() {
  const { isWorkspaceOpen, setWorkspaceOpen } = useAssistantStore();

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Toggle workspace with Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setWorkspaceOpen(!isWorkspaceOpen);
      }
      // Close workspace with Escape
      if (e.key === 'Escape' && isWorkspaceOpen) {
        e.preventDefault();
        setWorkspaceOpen(false);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isWorkspaceOpen, setWorkspaceOpen]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#09080c] text-stone-100 select-none">
      {/* 1. Master Living Visual Engine (Background Gradient + Pixel Dot-Matrix Face) */}
      <VisualEngine />

      {/* 2. Minimal Floating Branding / Status Watermark */}
      <header className="fixed top-6 inset-x-6 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-black/40 backdrop-blur-xl border border-stone-800/80 pointer-events-auto">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-sm shadow-amber-400" />
          <span className="text-xs font-medium tracking-wider uppercase text-amber-200/90 font-mono">
            AETHER • AI
          </span>
        </div>

        <button
          onClick={() => setWorkspaceOpen(true, 'settings')}
          className="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-xl border border-stone-800/80 hover:border-amber-500/40 text-stone-400 hover:text-amber-200 text-xs font-mono transition-all pointer-events-auto flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Config (⌘K)</span>
        </button>
      </header>

      {/* 3. Floating Spatial Conversation Stream */}
      <ConversationOverlay />

      {/* 4. Minimal HUD Interaction Dock & Expression Tester */}
      <MinimalHUD />

      {/* 5. Expanded Deep Workspace Modal */}
      <ExpandedWorkspace />
    </main>
  );
}

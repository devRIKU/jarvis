import React from 'react';
import { useAssistantStore } from '../../core/state/useAssistantStore';
import type { ExpressionType } from '../../types/assistant';
import {
  Sparkles,
  Mic,
  Brain,
  Crosshair,
  Search,
  Volume2,
  Smile,
  HelpCircle,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

const EXPRESSIONS: Array<{ type: ExpressionType; label: string; icon: React.ReactNode }> = [
  { type: 'idle', label: 'Idle', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { type: 'listening', label: 'Listening', icon: <Mic className="w-3.5 h-3.5" /> },
  { type: 'thinking', label: 'Thinking', icon: <Brain className="w-3.5 h-3.5" /> },
  { type: 'focused', label: 'Focused', icon: <Crosshair className="w-3.5 h-3.5" /> },
  { type: 'searching', label: 'Searching', icon: <Search className="w-3.5 h-3.5" /> },
  { type: 'speaking', label: 'Speaking', icon: <Volume2 className="w-3.5 h-3.5" /> },
  { type: 'happy', label: 'Happy', icon: <Smile className="w-3.5 h-3.5" /> },
  { type: 'confused', label: 'Confused', icon: <HelpCircle className="w-3.5 h-3.5" /> },
  { type: 'waiting', label: 'Waiting', icon: <Clock className="w-3.5 h-3.5" /> },
  { type: 'error', label: 'Error', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  { type: 'success', label: 'Success', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
];

export const ExpressionTester: React.FC = () => {
  const { expression, setExpression, setState } = useAssistantStore();

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/40 backdrop-blur-xl border border-amber-500/20 rounded-full shadow-2xl overflow-x-auto max-w-[92vw] no-scrollbar">
      <span className="text-[11px] font-medium tracking-wider text-amber-300/60 uppercase px-2 select-none whitespace-nowrap">
        Face State
      </span>
      {EXPRESSIONS.map((item) => {
        const isActive = expression === item.type;
        return (
          <button
            key={item.type}
            onClick={() => {
              setExpression(item.type, true);
              setState(item.type, `Expression: ${item.label}`);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap ${
              isActive
                ? 'bg-gradient-to-r from-amber-500/30 to-rose-500/30 text-amber-200 border border-amber-400/50 shadow-sm shadow-amber-500/20 scale-105'
                : 'text-stone-400 hover:text-stone-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};

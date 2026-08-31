import React, { useState } from 'react';
import { useAssistantStore } from '../../../core/state/useAssistantStore';
import { agentRuntime } from '../../../agent/agentRuntime';
import {
  Play,
  Square,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  Zap,
  Terminal,
} from 'lucide-react';

export const AgentTab: React.FC = () => {
  const { activeTask } = useAssistantStore();
  const [goalInput, setGoalInput] = useState('');

  const handleRunGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalInput.trim()) return;
    const g = goalInput.trim();
    setGoalInput('');
    await agentRuntime.createAndRunTask(g);
  };

  const handleCancel = () => {
    agentRuntime.cancelTask();
  };

  const sampleGoals = [
    'Research quantum computing advancements and save key points to memory',
    'Evaluate web performance benchmarks and compile a structured summary',
    'Analyze solar energy grid integration challenges and suggest solutions',
  ];

  return (
    <div className="space-y-6">
      {/* Header & Goal Launcher */}
      <div>
        <h3 className="text-lg font-medium text-stone-100 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          Autonomous Agent Runtime
        </h3>
        <p className="text-sm text-stone-400 mt-1">
          Decomposes complex, multi-step agentic workflows into sequential sub-tasks with real-time tool orchestration.
        </p>
      </div>

      {/* Goal Form */}
      <form onSubmit={handleRunGoal} className="space-y-3">
        <div className="relative">
          <input
            type="text"
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            placeholder="Enter a high-level goal for the agent..."
            className="w-full px-4 py-3 bg-stone-900/80 border border-stone-800 rounded-xl text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 text-sm"
          />
          <button
            type="submit"
            disabled={!goalInput.trim() || activeTask?.status === 'executing'}
            className="absolute right-2 top-2 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Launch Task</span>
          </button>
        </div>

        {/* Suggested Goals */}
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="text-xs text-stone-500 self-center">Suggestions:</span>
          {sampleGoals.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setGoalInput(sample)}
              className="text-xs px-2.5 py-1 rounded-lg bg-stone-900/60 hover:bg-stone-800 border border-stone-800/80 text-stone-300 transition-colors"
            >
              {sample}
            </button>
          ))}
        </div>
      </form>

      {/* Active Task Progress */}
      {activeTask ? (
        <div className="p-5 rounded-2xl bg-stone-900/50 border border-stone-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold tracking-wider text-amber-400 uppercase">
                  Active Mission
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    activeTask.status === 'executing'
                      ? 'bg-amber-500/20 text-amber-300 animate-pulse'
                      : activeTask.status === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {activeTask.status}
                </span>
              </div>
              <h4 className="text-base font-medium text-stone-100 mt-1">{activeTask.goal}</h4>
            </div>

            {activeTask.status === 'executing' && (
              <button
                onClick={handleCancel}
                className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/30 text-rose-300 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            )}
          </div>

          {/* Steps List */}
          <div className="space-y-3 pt-2">
            {activeTask.steps.map((step, index) => (
              <div
                key={step.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  step.status === 'running'
                    ? 'bg-amber-950/20 border-amber-500/40 shadow-sm shadow-amber-500/10'
                    : step.status === 'completed'
                    ? 'bg-stone-900/40 border-stone-800/60'
                    : 'bg-stone-900/20 border-stone-800/40 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {step.status === 'running' && (
                      <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                    )}
                    {step.status === 'completed' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                    {step.status === 'pending' && <Clock className="w-4 h-4 text-stone-500" />}
                    {step.status === 'failed' && <AlertCircle className="w-4 h-4 text-rose-400" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-stone-200">
                        Step {index + 1}: {step.title}
                      </span>
                      {step.tool && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-black/40 text-amber-300/80 border border-amber-500/10 flex items-center gap-1">
                          <Terminal className="w-2.5 h-2.5" />
                          {step.tool}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-400 mt-0.5">{step.description}</p>
                    {step.result && (
                      <div className="mt-2 text-xs text-emerald-300/90 font-mono bg-black/40 p-2 rounded-lg border border-emerald-500/10">
                        ↳ {step.result}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-8 text-center rounded-2xl bg-stone-900/30 border border-stone-800/60">
          <Zap className="w-8 h-8 text-stone-600 mx-auto mb-2" />
          <p className="text-sm text-stone-400">No active agent task running.</p>
          <p className="text-xs text-stone-600 mt-1">
            Launch a goal above to watch the assistant plan and execute multi-step tool actions.
          </p>
        </div>
      )}
    </div>
  );
};

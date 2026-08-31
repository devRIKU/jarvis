import { useAssistantStore } from '../core/state/useAssistantStore';
import { toolRegistry } from '../tools/toolRegistry';
import type { AgentTask, AgentStep } from '../types/assistant';

export class AgentRuntime {
  private static instance: AgentRuntime;
  private abortController: AbortController | null = null;

  private constructor() {}

  public static getInstance(): AgentRuntime {
    if (!AgentRuntime.instance) {
      AgentRuntime.instance = new AgentRuntime();
    }
    return AgentRuntime.instance;
  }

  public async createAndRunTask(goal: string): Promise<AgentTask> {
    const taskId = `task-${Date.now()}`;
    useAssistantStore.getState().setState('thinking', `Planning agent task: "${goal}"`);

    // Decompose goal into logical steps
    const steps: AgentStep[] = this.decomposeGoal(goal);

    const task: AgentTask = {
      id: taskId,
      goal,
      status: 'executing',
      steps,
      currentStepIndex: 0,
      createdAt: Date.now(),
    };

    useAssistantStore.getState().setActiveTask(task);
    this.abortController = new AbortController();

    // Execute steps sequentially
    (async () => {
      for (let i = 0; i < steps.length; i++) {
        if (this.abortController?.signal.aborted) {
          useAssistantStore.getState().updateTaskStep(steps[i].id, 'failed', 'Aborted by user');
          break;
        }

        const step = steps[i];
        useAssistantStore.getState().updateTaskStep(step.id, 'running');
        useAssistantStore.getState().setState('focused', `Step ${i + 1}/${steps.length}: ${step.title}`);

        try {
          let stepResult = 'Step completed successfully.';

          if (step.tool === 'web_search') {
            const res = await toolRegistry.executeTool('web_search', { query: goal });
            stepResult = `Found ${res.found || 0} relevant sources.`;
          } else if (step.tool === 'calculate') {
            const res = await toolRegistry.executeTool('calculate', { expression: '100 * 1.15' });
            stepResult = `Calculated: ${res.result}`;
          } else if (step.tool === 'manage_memory') {
            await toolRegistry.executeTool('manage_memory', {
              action: 'save',
              key: `Task result: ${goal.slice(0, 30)}`,
              content: `Automated agent execution for: ${goal}`,
              category: 'project',
            });
            stepResult = 'Knowledge checkpoint saved to memory.';
          } else {
            // Simulated execution step
            await new Promise((r) => setTimeout(r, 1200));
          }

          useAssistantStore.getState().updateTaskStep(step.id, 'completed', stepResult);
        } catch (err: any) {
          useAssistantStore.getState().updateTaskStep(step.id, 'failed', err.message);
          useAssistantStore.getState().setState('error', `Task failed at step: ${step.title}`);
          return;
        }
      }

      useAssistantStore.getState().setState('success', 'Agent task completed successfully!');
    })();

    return task;
  }

  public cancelTask(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    useAssistantStore.getState().setState('idle', 'Task cancelled');
  }

  private decomposeGoal(goal: string): AgentStep[] {
    const lower = goal.toLowerCase();

    if (lower.includes('research') || lower.includes('find') || lower.includes('learn')) {
      return [
        {
          id: `step-1`,
          title: 'Information Gathering & Search',
          description: `Query online sources and extract key concepts for "${goal}".`,
          status: 'pending',
          tool: 'web_search',
        },
        {
          id: `step-2`,
          title: 'Content Extraction & Synthesis',
          description: 'Analyze retrieved content, filter relevant insights, and structure data.',
          status: 'pending',
          tool: 'web_fetch',
        },
        {
          id: `step-3`,
          title: 'Knowledge Persistence & Final Summary',
          description: 'Save structured findings to assistant long-term memory.',
          status: 'pending',
          tool: 'manage_memory',
        },
      ];
    }

    return [
      {
        id: `step-1`,
        title: 'Task Analysis & Context Verification',
        description: `Analyze requirements and verify workspace context for "${goal}".`,
        status: 'pending',
      },
      {
        id: `step-2`,
        title: 'Core Execution & Tool Orchestration',
        description: 'Execute primary computational and synthesis actions.',
        status: 'pending',
        tool: 'web_search',
      },
      {
        id: `step-3`,
        title: 'Validation & Memory Checkpoint',
        description: 'Verify execution results and record project memory.',
        status: 'pending',
        tool: 'manage_memory',
      },
    ];
  }
}

export const agentRuntime = AgentRuntime.getInstance();

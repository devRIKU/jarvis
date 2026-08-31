import { create } from 'zustand';
import type {
  AssistantState,
  ExpressionType,
  ChatMessage,
  AgentTask,
  MemoryItem,
  MCPServerConfig,
  SpatialGestureState,
  AppSettings,
  ToolCallRecord,
} from '../../types/assistant';
import { eventBus } from '../events/eventBus';

interface AssistantStore {
  // Core State
  state: AssistantState;
  expression: ExpressionType;
  manualExpressionOverride: boolean;
  statusMessage: string;

  // Chat & Conversation
  messages: ChatMessage[];
  streamingMessageId: string | null;

  // Agent Runtime
  activeTask: AgentTask | null;

  // Memory & Knowledge
  memories: MemoryItem[];

  // MCP Servers
  mcpServers: MCPServerConfig[];

  // Spatial & Barehands
  spatialState: SpatialGestureState;

  // UI & Modals
  isWorkspaceOpen: boolean;
  activeWorkspaceTab: 'conversation' | 'agent' | 'memory' | 'tools' | 'barehands' | 'settings';
  isVoiceActive: boolean;
  isContinuousVAD: boolean;
  audioInputLevel: number;
  outputAudioLevel: number;

  // Settings
  settings: AppSettings;

  // Actions
  setState: (state: AssistantState, statusMessage?: string) => void;
  setExpression: (expression: ExpressionType, isManual?: boolean) => void;
  setStatusMessage: (msg: string) => void;
  
  // Message Actions
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => string;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  appendStreamingChunk: (id: string, chunk: string) => void;
  addToolCallToMessage: (messageId: string, toolCall: ToolCallRecord) => void;
  updateToolCallInMessage: (messageId: string, toolId: string, updates: Partial<ToolCallRecord>) => void;
  clearMessages: () => void;

  // Agent Actions
  setActiveTask: (task: AgentTask | null) => void;
  updateTaskStep: (stepId: string, status: 'pending' | 'running' | 'completed' | 'failed', result?: string) => void;

  // Memory Actions
  addMemory: (memory: Omit<MemoryItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  removeMemory: (id: string) => void;
  updateMemory: (id: string, content: string) => void;

  // MCP Actions
  addMCPServer: (server: Omit<MCPServerConfig, 'id' | 'status' | 'toolsCount'>) => void;
  removeMCPServer: (id: string) => void;
  updateMCPServerStatus: (id: string, status: MCPServerConfig['status'], toolsCount?: number, error?: string) => void;

  // Spatial Actions
  setSpatialState: (state: Partial<SpatialGestureState>) => void;

  // UI Actions
  setWorkspaceOpen: (open: boolean, tab?: AssistantStore['activeWorkspaceTab']) => void;
  setActiveWorkspaceTab: (tab: AssistantStore['activeWorkspaceTab']) => void;
  setVoiceActive: (active: boolean) => void;
  setContinuousVAD: (enabled: boolean) => void;
  setAudioLevels: (input: number, output: number) => void;

  // Settings Actions
  updateSettings: (settings: Partial<AppSettings>) => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  provider: 'gemini',
  apiKey: localStorage.getItem('jarvis_api_key') || '',
  model: 'gemini-2.5-flash',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  systemPrompt:
    'You are a warm, highly capable, organic personal AI assistant. Speak naturally, be concise, empathetic, and exceptionally helpful. You have direct access to tools, memory, search, and spatial interfaces.',
  vadEnabled: true,
  vadSensitivity: 0.6,
  autoSpeak: true,
  voiceName: '',
  speechRate: 1.0,
  speechPitch: 1.0,
  performanceLevel: 'auto',
  bloomIntensity: 0.75,
  dotSize: 3.2,
  warmthLevel: 0.9,
  barehandsEnabled: true,
  mcpEnabled: true,
};

const INITIAL_MEMORIES: MemoryItem[] = [
  {
    id: 'mem-1',
    category: 'preference',
    key: 'Design Aesthetic',
    content: 'User prefers organic, warm, smooth obsidian/amber visuals with fluid natural physics and clean minimal interfaces.',
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now() - 3600000,
  },
  {
    id: 'mem-2',
    category: 'preference',
    key: 'Preferred AI Engine',
    content: 'Primary model target is Google Gemini 2.5 Flash with fast streaming responses and tool calling capability.',
    createdAt: Date.now() - 1800000,
    updatedAt: Date.now() - 1800000,
  },
];

const INITIAL_MCP_SERVERS: MCPServerConfig[] = [
  {
    id: 'mcp-fs',
    name: 'Filesystem Workspace',
    endpoint: 'http://localhost:3001/sse',
    transport: 'sse',
    status: 'connected',
    toolsCount: 6,
  },
  {
    id: 'mcp-web',
    name: 'Browser Automation & Search',
    endpoint: 'http://localhost:3002/sse',
    transport: 'sse',
    status: 'connected',
    toolsCount: 4,
  },
];

export const useAssistantStore = create<AssistantStore>((set, get) => ({
  state: 'idle',
  expression: 'idle',
  manualExpressionOverride: false,
  statusMessage: 'Ready and ambient',

  messages: [
    {
      id: 'welcome-msg',
      role: 'assistant',
      content:
        "Hello. I'm your Personal Assistant. My living visual matrix and audio interface are active. How can I assist you today?",
      timestamp: Date.now(),
    },
  ],
  streamingMessageId: null,

  activeTask: null,
  memories: INITIAL_MEMORIES,
  mcpServers: INITIAL_MCP_SERVERS,

  spatialState: {
    isTracking: false,
    gesture: 'none',
    confidence: 0,
    pointer: { x: 0.5, y: 0.5 },
    lastActive: 0,
  },

  isWorkspaceOpen: false,
  activeWorkspaceTab: 'conversation',
  isVoiceActive: false,
  isContinuousVAD: false,
  audioInputLevel: 0,
  outputAudioLevel: 0,

  settings: DEFAULT_SETTINGS,

  setState: (state, statusMessage) => {
    const prevState = get().state;
    const isManual = get().manualExpressionOverride;
    
    set((prev) => ({
      state,
      expression: isManual ? prev.expression : (state as ExpressionType),
      statusMessage: statusMessage || `State: ${state}`,
    }));

    eventBus.emit('stateChange', { state, previousState: prevState });
    if (!isManual) {
      eventBus.emit('expressionChange', { expression: state });
    }
  },

  setExpression: (expression, isManual = false) => {
    set({
      expression,
      manualExpressionOverride: isManual,
    });
    eventBus.emit('expressionChange', { expression });
  },

  setStatusMessage: (statusMessage) => set({ statusMessage }),

  addMessage: (msg) => {
    const id = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newMsg: ChatMessage = {
      ...msg,
      id,
      timestamp: Date.now(),
    };
    set((state) => ({
      messages: [...state.messages, newMsg],
      streamingMessageId: msg.isStreaming ? id : null,
    }));
    return id;
  },

  updateMessage: (id, updates) => {
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? { ...m, ...updates } : m)),
      streamingMessageId: updates.isStreaming === false && state.streamingMessageId === id ? null : state.streamingMessageId,
    }));
  },

  appendStreamingChunk: (id, chunk) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, content: m.content + chunk } : m
      ),
    }));
  },

  addToolCallToMessage: (messageId, toolCall) => {
    set((state) => ({
      messages: state.messages.map((m) => {
        if (m.id !== messageId) return m;
        const currentCalls = m.toolCalls || [];
        return { ...m, toolCalls: [...currentCalls, toolCall] };
      }),
    }));
  },

  updateToolCallInMessage: (messageId, toolId, updates) => {
    set((state) => ({
      messages: state.messages.map((m) => {
        if (m.id !== messageId || !m.toolCalls) return m;
        return {
          ...m,
          toolCalls: m.toolCalls.map((tc) => (tc.id === toolId ? { ...tc, ...updates } : tc)),
        };
      }),
    }));
  },

  clearMessages: () => set({ messages: [], streamingMessageId: null }),

  setActiveTask: (activeTask) => set({ activeTask }),

  updateTaskStep: (stepId, status, result) => {
    set((state) => {
      if (!state.activeTask) return {};
      const updatedSteps = state.activeTask.steps.map((s) =>
        s.id === stepId ? { ...s, status, result: result || s.result } : s
      );
      const allDone = updatedSteps.every((s) => s.status === 'completed');
      const hasFailed = updatedSteps.some((s) => s.status === 'failed');

      return {
        activeTask: {
          ...state.activeTask,
          steps: updatedSteps,
          status: hasFailed ? 'failed' : allDone ? 'completed' : 'executing',
          completedAt: allDone || hasFailed ? Date.now() : undefined,
        },
      };
    });
  },

  addMemory: (mem) => {
    const newMem: MemoryItem = {
      ...mem,
      id: `mem-${Date.now()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    set((state) => ({
      memories: [newMem, ...state.memories],
    }));
  },

  removeMemory: (id) => {
    set((state) => ({
      memories: state.memories.filter((m) => m.id !== id),
    }));
  },

  updateMemory: (id, content) => {
    set((state) => ({
      memories: state.memories.map((m) =>
        m.id === id ? { ...m, content, updatedAt: Date.now() } : m
      ),
    }));
  },

  addMCPServer: (server) => {
    const newServer: MCPServerConfig = {
      ...server,
      id: `mcp-${Date.now()}`,
      status: 'connecting',
      toolsCount: 0,
    };
    set((state) => ({
      mcpServers: [...state.mcpServers, newServer],
    }));
  },

  removeMCPServer: (id) => {
    set((state) => ({
      mcpServers: state.mcpServers.filter((s) => s.id !== id),
    }));
  },

  updateMCPServerStatus: (id, status, toolsCount, error) => {
    set((state) => ({
      mcpServers: state.mcpServers.map((s) =>
        s.id === id
          ? {
              ...s,
              status,
              toolsCount: toolsCount ?? s.toolsCount,
              errorMessage: error,
            }
          : s
      ),
    }));
  },

  setSpatialState: (partial) => {
    set((state) => ({
      spatialState: { ...state.spatialState, ...partial },
    }));
    if (partial.pointer) {
      eventBus.emit('spatialPointer', {
        x: partial.pointer.x,
        y: partial.pointer.y,
        gesture: partial.gesture || get().spatialState.gesture,
      });
    }
  },

  setWorkspaceOpen: (isWorkspaceOpen, tab) => {
    set((state) => ({
      isWorkspaceOpen,
      activeWorkspaceTab: tab || state.activeWorkspaceTab,
    }));
  },

  setActiveWorkspaceTab: (activeWorkspaceTab) => set({ activeWorkspaceTab }),

  setVoiceActive: (isVoiceActive) => set({ isVoiceActive }),

  setContinuousVAD: (isContinuousVAD) => set({ isContinuousVAD }),

  setAudioLevels: (audioInputLevel, outputAudioLevel) =>
    set({ audioInputLevel, outputAudioLevel }),

  updateSettings: (updates) => {
    if (updates.apiKey !== undefined) {
      localStorage.setItem('jarvis_api_key', updates.apiKey);
    }
    set((state) => ({
      settings: { ...state.settings, ...updates },
    }));
  },
}));

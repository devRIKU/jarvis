export type AssistantState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'focused'
  | 'searching'
  | 'speaking'
  | 'happy'
  | 'confused'
  | 'waiting'
  | 'error'
  | 'success';

export type ExpressionType = AssistantState;

export interface ToolCallRecord {
  id: string;
  name: string;
  args: Record<string, any>;
  result?: any;
  status: 'pending' | 'running' | 'success' | 'error';
  error?: string;
}

export interface Citation {
  title: string;
  url: string;
  snippet: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  toolCalls?: ToolCallRecord[];
  citations?: Citation[];
  imageBytes?: string;
  isStreaming?: boolean;
}

export interface ToolParameter {
  type: string;
  description: string;
  required?: boolean;
  enum?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ToolParameter>;
    required?: string[];
  };
  riskLevel: 'low' | 'medium' | 'high';
  timeoutMs?: number;
  execute: (args: any, context?: any) => Promise<any>;
}

export interface AgentStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  tool?: string;
  result?: string;
}

export interface AgentTask {
  id: string;
  goal: string;
  status: 'planning' | 'executing' | 'paused' | 'completed' | 'failed';
  steps: AgentStep[];
  currentStepIndex: number;
  createdAt: number;
  completedAt?: number;
}

export interface MemoryItem {
  id: string;
  category: 'preference' | 'fact' | 'project' | 'instruction';
  key: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface MCPServerConfig {
  id: string;
  name: string;
  endpoint: string;
  transport: 'sse' | 'websocket' | 'http';
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  toolsCount: number;
  errorMessage?: string;
}

export interface SpatialGestureState {
  isTracking: boolean;
  gesture: 'none' | 'palm' | 'wave' | 'pinch' | 'point' | 'fist';
  confidence: number;
  pointer: { x: number; y: number };
  lastActive: number;
}

export interface AppSettings {
  provider: 'gemini' | 'openai' | 'openrouter' | 'ollama' | 'custom';
  apiKey: string;
  model: string;
  baseUrl: string;
  systemPrompt: string;
  
  // Voice & Audio
  vadEnabled: boolean;
  vadSensitivity: number; // 0.1 to 1.0
  autoSpeak: boolean;
  voiceName: string;
  speechRate: number;
  speechPitch: number;
  
  // Visual & Performance
  performanceLevel: 'auto' | 'high' | 'medium' | 'low';
  bloomIntensity: number;
  dotSize: number;
  warmthLevel: number;
  
  // Integrations
  barehandsEnabled: boolean;
  mcpEnabled: boolean;
}

import { GoogleGenAI } from '@google/genai';
import { useAssistantStore } from '../core/state/useAssistantStore';
import { toolRegistry } from '../tools/toolRegistry';
import type { ChatMessage, ToolCallRecord } from '../types/assistant';

export interface ModelCompletionOptions {
  messages: ChatMessage[];
  onChunk?: (text: string) => void;
  onToolCall?: (toolCall: ToolCallRecord) => void;
  signal?: AbortSignal;
}

export class ModelGateway {
  private static instance: ModelGateway;

  private constructor() {}

  public static getInstance(): ModelGateway {
    if (!ModelGateway.instance) {
      ModelGateway.instance = new ModelGateway();
    }
    return ModelGateway.instance;
  }

  public async generateStreamingResponse(options: ModelCompletionOptions): Promise<string> {
    const settings = useAssistantStore.getState().settings;
    const { messages, onChunk, onToolCall, signal } = options;

    if (settings.provider === 'gemini') {
      return this.streamGemini(settings.apiKey, settings.model, messages, onChunk, onToolCall, signal);
    } else {
      return this.streamOpenAICompatible(
        settings.baseUrl || 'https://api.openai.com/v1',
        settings.apiKey,
        settings.model,
        messages,
        onChunk,
        signal
      );
    }
  }

  /**
   * Google Gemini API Streaming & Tool Execution
   */
  private async streamGemini(
    apiKey: string,
    modelName: string,
    messages: ChatMessage[],
    onChunk?: (text: string) => void,
    onToolCall?: (toolCall: ToolCallRecord) => void,
    signal?: AbortSignal
  ): Promise<string> {
    if (!apiKey) {
      const errorMsg =
        'Please enter a Google Gemini API Key in Settings to connect to the live intelligence engine.';
      if (onChunk) onChunk(errorMsg);
      return errorMsg;
    }

    useAssistantStore.getState().setState('thinking', 'Formulating response...');

    try {
      const ai = new GoogleGenAI({ apiKey });
      const activeModel = modelName || 'gemini-2.5-flash';

      // Build message context & system instruction
      const systemPrompt = useAssistantStore.getState().settings.systemPrompt;
      const memories = useAssistantStore.getState().memories;
      const memoryContext =
        memories.length > 0
          ? `\nRelevant Long-Term Memories:\n` +
            memories.map((m) => `- [${m.category}] ${m.key}: ${m.content}`).join('\n')
          : '';

      const fullSystemInstruction = `${systemPrompt}${memoryContext}`;

      // Format conversation history for Gemini API
      const formattedContents = messages
        .filter((m) => m.content && m.role !== 'system')
        .slice(-12) // Keep last 12 messages for context
        .map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

      // Check for tool calling intent on latest message
      const latestMsg = messages[messages.length - 1]?.content.toLowerCase() || '';
      
      // Auto-invoke tools if applicable
      if (latestMsg.includes('search') || latestMsg.includes('who is') || latestMsg.includes('what is the latest') || latestMsg.includes('news about')) {
        const queryMatch = latestMsg.replace(/(please|can you|search for|look up|search)/gi, '').trim();
        const searchTool = toolRegistry.getTool('web_search');
        if (searchTool) {
          const toolCallId = `tc-${Date.now()}`;
          const toolRecord: ToolCallRecord = {
            id: toolCallId,
            name: 'web_search',
            args: { query: queryMatch || latestMsg },
            status: 'running',
          };
          if (onToolCall) onToolCall(toolRecord);

          try {
            const searchResult = await toolRegistry.executeTool('web_search', { query: queryMatch || latestMsg });
            toolRecord.status = 'success';
            toolRecord.result = searchResult;
            if (onToolCall) onToolCall(toolRecord);

            // Append tool search result into prompt
            formattedContents.push({
              role: 'user',
              parts: [{ text: `[Tool Search Results for "${queryMatch}"]\n${JSON.stringify(searchResult, null, 2)}\n\nPlease synthesize this into a warm, natural answer.` }],
            });
          } catch (e: any) {
            toolRecord.status = 'error';
            toolRecord.error = e.message;
            if (onToolCall) onToolCall(toolRecord);
          }
        }
      }

      // Stream content using GoogleGenAI
      const streamResult = await ai.models.generateContentStream({
        model: activeModel,
        contents: formattedContents,
        config: {
          systemInstruction: fullSystemInstruction,
        },
      });

      let accumulated = '';
      useAssistantStore.getState().setState('speaking', 'Streaming response...');

      for await (const chunk of streamResult) {
        if (signal?.aborted) break;
        const text = chunk.text;
        if (text) {
          accumulated += text;
          if (onChunk) onChunk(text);
        }
      }

      useAssistantStore.getState().setState('idle', 'Ready and ambient');
      return accumulated;
    } catch (err: any) {
      console.error('Gemini streaming error:', err);
      useAssistantStore.getState().setState('error', `Error: ${err.message || 'Gemini API call failed'}`);
      const errText = `I encountered an issue contacting the Gemini model: ${err.message || 'Please verify your API key and network connection.'}`;
      if (onChunk) onChunk(errText);
      return errText;
    }
  }

  /**
   * Arbitrary OpenAI-compatible REST API Streaming
   */
  private async streamOpenAICompatible(
    baseUrl: string,
    apiKey: string,
    modelName: string,
    messages: ChatMessage[],
    onChunk?: (text: string) => void,
    signal?: AbortSignal
  ): Promise<string> {
    useAssistantStore.getState().setState('thinking', 'Connecting to model gateway...');

    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    const endpoint = `${cleanBaseUrl}/chat/completions`;

    const formattedMessages = [
      { role: 'system', content: useAssistantStore.getState().settings.systemPrompt },
      ...messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
    ];

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: modelName || 'gpt-4o-mini',
          messages: formattedMessages,
          stream: true,
        }),
        signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      useAssistantStore.getState().setState('speaking', 'Streaming response...');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulated = '';

      if (reader) {
        let done = false;
        let buffer = '';

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('data: ')) {
                const dataStr = trimmed.substring(6);
                if (dataStr === '[DONE]') break;
                try {
                  const json = JSON.parse(dataStr);
                  const chunkText = json.choices?.[0]?.delta?.content || '';
                  if (chunkText) {
                    accumulated += chunkText;
                    if (onChunk) onChunk(chunkText);
                  }
                } catch {}
              }
            }
          }
        }
      }

      useAssistantStore.getState().setState('idle', 'Ready and ambient');
      return accumulated;
    } catch (err: any) {
      console.error('OpenAI stream error:', err);
      useAssistantStore.getState().setState('error', err.message);
      const errText = `Gateway connection error: ${err.message}`;
      if (onChunk) onChunk(errText);
      return errText;
    }
  }
}

export const modelGateway = ModelGateway.getInstance();

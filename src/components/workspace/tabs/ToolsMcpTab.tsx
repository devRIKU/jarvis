import React, { useState } from 'react';
import { useAssistantStore } from '../../../core/state/useAssistantStore';
import { toolRegistry } from '../../../tools/toolRegistry';
import type { ToolDefinition } from '../../../types/assistant';
import {
  Wrench,
  Server,
  Terminal,
  Play,
  Plus,
  Trash2,
  Network,
} from 'lucide-react';

export const ToolsMcpTab: React.FC = () => {
  const { mcpServers, addMCPServer, removeMCPServer } = useAssistantStore();
  const [selectedTool, setSelectedTool] = useState<ToolDefinition | null>(
    toolRegistry.getAllTools()[0] || null
  );
  const [toolInputJson, setToolInputJson] = useState('{"query": "quantum computing"}');
  const [toolResult, setToolResult] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // New MCP Server Form
  const [isAddingMcp, setIsAddingMcp] = useState(false);
  const [mcpName, setMcpName] = useState('');
  const [mcpEndpoint, setMcpEndpoint] = useState('');
  const [mcpTransport] = useState<'sse' | 'websocket' | 'http'>('sse');

  const tools = toolRegistry.getAllTools();

  const handleExecuteTool = async () => {
    if (!selectedTool) return;
    setIsExecuting(true);
    setToolResult(null);

    try {
      const args = JSON.parse(toolInputJson);
      const res = await toolRegistry.executeTool(selectedTool.name, args);
      setToolResult(res);
    } catch (err: any) {
      setToolResult({ error: err.message });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleAddMcp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mcpName || !mcpEndpoint) return;

    addMCPServer({
      name: mcpName,
      endpoint: mcpEndpoint,
      transport: mcpTransport,
    });

    setMcpName('');
    setMcpEndpoint('');
    setIsAddingMcp(false);
  };

  return (
    <div className="space-y-8">
      {/* 1. MCP Subsystem Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-medium text-stone-100 flex items-center gap-2">
              <Network className="w-5 h-5 text-amber-400" />
              Model Context Protocol (MCP) Runtime
            </h3>
            <p className="text-sm text-stone-400">
              Manage external MCP servers for tool discovery, workspace resources, and remote execution.
            </p>
          </div>

          <button
            onClick={() => setIsAddingMcp(!isAddingMcp)}
            className="px-3.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>{isAddingMcp ? 'Cancel' : 'Add MCP Server'}</span>
          </button>
        </div>

        {isAddingMcp && (
          <form
            onSubmit={handleAddMcp}
            className="p-4 rounded-2xl bg-stone-900/80 border border-amber-500/30 space-y-3"
          >
            <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-300">
              Register MCP Endpoint
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-stone-400 block mb-1">Server Name</label>
                <input
                  type="text"
                  required
                  value={mcpName}
                  onChange={(e) => setMcpName(e.target.value)}
                  placeholder="e.g. Postgres DB Explorer"
                  className="w-full px-3 py-2 bg-black/40 border border-stone-800 rounded-lg text-stone-200 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-stone-400 block mb-1">Server URL</label>
                <input
                  type="text"
                  required
                  value={mcpEndpoint}
                  onChange={(e) => setMcpEndpoint(e.target.value)}
                  placeholder="http://localhost:3000/sse"
                  className="w-full px-3 py-2 bg-black/40 border border-stone-800 rounded-lg text-stone-200 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddingMcp(false)}
                className="px-3 py-1.5 text-xs text-stone-400 hover:text-stone-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold rounded-lg"
              >
                Connect Server
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {mcpServers.map((server) => (
            <div
              key={server.id}
              className="p-4 rounded-2xl bg-stone-900/40 border border-stone-800/80 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="text-sm font-medium text-stone-200">{server.name}</h5>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        server.status === 'connected'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : server.status === 'connecting'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {server.status}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 font-mono mt-0.5">{server.endpoint}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-500 font-mono">
                  {server.toolsCount} tools
                </span>
                <button
                  onClick={() => removeMCPServer(server.id)}
                  className="p-1.5 text-stone-500 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Tool Subsystem Section */}
      <div className="space-y-4 pt-4 border-t border-stone-800/60">
        <div>
          <h3 className="text-lg font-medium text-stone-100 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-amber-400" />
            Built-in Tool Registry & Sandbox
          </h3>
          <p className="text-sm text-stone-400">
            Inspect native tool capabilities and test real-time tool execution.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Tool Selector List */}
          <div className="space-y-2">
            {tools.map((tool) => {
              const isSelected = selectedTool?.name === tool.name;
              return (
                <button
                  key={tool.name}
                  onClick={() => {
                    setSelectedTool(tool);
                    setToolResult(null);
                    if (tool.name === 'web_search') setToolInputJson('{"query": "quantum computing"}');
                    else if (tool.name === 'calculate') setToolInputJson('{"expression": "Math.sqrt(144) * 25"}');
                    else if (tool.name === 'get_current_time') setToolInputJson('{"timezone": "America/New_York"}');
                    else if (tool.name === 'manage_memory') setToolInputJson('{"action": "list"}');
                    else if (tool.name === 'system_diagnostics') setToolInputJson('{}');
                    else setToolInputJson('{}');
                  }}
                  className={`w-full p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                      : 'bg-stone-900/30 border-stone-800/70 text-stone-300 hover:bg-stone-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-medium">{tool.name}</span>
                    <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/40 text-stone-400">
                      {tool.riskLevel} risk
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 mt-1 line-clamp-2">{tool.description}</p>
                </button>
              );
            })}
          </div>

          {/* Tool Runner & Results */}
          <div className="md:col-span-2 p-4 rounded-2xl bg-stone-900/50 border border-stone-800 space-y-3">
            {selectedTool && (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-amber-400" />
                    <h5 className="text-sm font-mono font-medium text-stone-200">
                      {selectedTool.name}
                    </h5>
                  </div>
                  <button
                    onClick={handleExecuteTool}
                    disabled={isExecuting}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <Play className="w-3 h-3 fill-black" />
                    <span>{isExecuting ? 'Running...' : 'Execute'}</span>
                  </button>
                </div>

                <div>
                  <label className="text-xs text-stone-400 block mb-1">JSON Arguments</label>
                  <textarea
                    rows={3}
                    value={toolInputJson}
                    onChange={(e) => setToolInputJson(e.target.value)}
                    className="w-full px-3 py-2 bg-black/60 border border-stone-800 rounded-lg text-stone-200 font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                {toolResult && (
                  <div>
                    <label className="text-xs text-stone-400 block mb-1">Execution Output</label>
                    <pre className="p-3 bg-black/80 border border-stone-800 rounded-lg text-emerald-300 font-mono text-xs overflow-x-auto max-h-48 no-scrollbar">
                      {JSON.stringify(toolResult, null, 2)}
                    </pre>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

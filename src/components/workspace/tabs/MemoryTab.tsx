import React, { useState } from 'react';
import { useAssistantStore } from '../../../core/state/useAssistantStore';
import type { MemoryItem } from '../../../types/assistant';
import {
  Brain,
  Plus,
  Trash2,
  Search,
} from 'lucide-react';

export const MemoryTab: React.FC = () => {
  const { memories, addMemory, removeMemory } = useAssistantStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  
  // New memory form state
  const [newKey, setNewKey] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryItem['category']>('preference');

  const filteredMemories = memories.filter(
    (m) =>
      m.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newContent.trim()) return;

    addMemory({
      key: newKey.trim(),
      content: newContent.trim(),
      category: newCategory,
    });

    setNewKey('');
    setNewContent('');
    setIsAdding(false);
  };

  const getCategoryColor = (cat: MemoryItem['category']) => {
    switch (cat) {
      case 'preference':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
      case 'fact':
        return 'bg-sky-500/10 text-sky-300 border-sky-500/20';
      case 'project':
        return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
      case 'instruction':
        return 'bg-purple-500/10 text-purple-300 border-purple-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium text-stone-100 flex items-center gap-2">
            <Brain className="w-5 h-5 text-amber-400" />
            Long-Term Memory Vault
          </h3>
          <p className="text-sm text-stone-400 mt-0.5">
            Inspect, create, and manage persistent knowledge that informs the assistant's behavior.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{isAdding ? 'Cancel' : 'Add Memory'}</span>
        </button>
      </div>

      {/* Add Memory Modal/Drawer */}
      {isAdding && (
        <form
          onSubmit={handleSaveMemory}
          className="p-4 rounded-2xl bg-stone-900/80 border border-amber-500/30 space-y-3"
        >
          <h4 className="text-sm font-medium text-amber-300">New Memory Entry</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-stone-400 block mb-1">Key / Topic</label>
              <input
                type="text"
                required
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="e.g. Tone Preference, Project Codename..."
                className="w-full px-3 py-2 bg-black/40 border border-stone-800 rounded-lg text-stone-200 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-xs text-stone-400 block mb-1">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="w-full px-3 py-2 bg-black/40 border border-stone-800 rounded-lg text-stone-200 text-xs focus:outline-none focus:border-amber-500"
              >
                <option value="preference">Preference</option>
                <option value="fact">Fact</option>
                <option value="project">Project</option>
                <option value="instruction">Instruction</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-stone-400 block mb-1">Memory Content</label>
            <textarea
              required
              rows={3}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Describe the knowledge or rule to store..."
              className="w-full px-3 py-2 bg-black/40 border border-stone-800 rounded-lg text-stone-200 text-xs focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-xs text-stone-400 hover:text-stone-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold rounded-lg"
            >
              Save Memory
            </button>
          </div>
        </form>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-stone-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter memories by keyword or category..."
          className="w-full pl-10 pr-4 py-2.5 bg-stone-900/60 border border-stone-800/80 rounded-xl text-stone-200 placeholder-stone-500 text-xs focus:outline-none focus:border-amber-500/40"
        />
      </div>

      {/* Memory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredMemories.map((mem) => (
          <div
            key={mem.id}
            className="p-4 rounded-2xl bg-stone-900/40 border border-stone-800/70 hover:border-amber-500/30 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded-full border ${getCategoryColor(
                    mem.category
                  )}`}
                >
                  {mem.category}
                </span>
                <button
                  onClick={() => removeMemory(mem.id)}
                  className="p-1 text-stone-500 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove memory"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <h5 className="text-sm font-medium text-stone-100">{mem.key}</h5>
              <p className="text-xs text-stone-300 mt-1 leading-relaxed">{mem.content}</p>
            </div>

            <div className="mt-3 pt-2 border-t border-stone-800/40 text-[10px] text-stone-500">
              Stored {new Date(mem.createdAt).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>

      {filteredMemories.length === 0 && (
        <div className="p-8 text-center text-stone-500 text-xs">
          No matching memories found.
        </div>
      )}
    </div>
  );
};

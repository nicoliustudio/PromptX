import { useState, useEffect, useCallback } from 'react';
import { AppView, Category, Prompt } from './types';
import { loadPrompts, savePrompts, loadCategories } from './store/data';
import { LayoutDashboard, Settings2, PanelLeftClose, PanelLeft, BookOpen, Puzzle } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [prompts, setPrompts] = useState<Prompt[]>(() => loadPrompts());
  const [categories] = useState<Category[]>(() => loadCategories());
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(() => {
    const saved = loadPrompts();
    return saved.length > 0 ? saved[0].id : null;
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Persist prompts whenever they change
  useEffect(() => {
    savePrompts(prompts);
  }, [prompts]);

  // ⌘ / Ctrl + N 快速新建
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        createBlankPrompt();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prompts.length]);

  const updatePrompt = useCallback((updatedPrompt: Prompt) => {
    setPrompts(prev => prev.map(p => p.id === updatedPrompt.id ? updatedPrompt : p));
  }, []);

  const addPrompt = useCallback((newPrompt: Prompt) => {
    setPrompts(prev => [newPrompt, ...prev]);
    setSelectedPromptId(newPrompt.id);
  }, []);

  const createBlankPrompt = useCallback(() => {
    const id = 'p-' + Date.now();
    const newPrompt: Prompt = {
      id,
      title: '未命名提示词',
      command: '',
      categoryId: categories[0]?.id || 'cat-1',
      template: '',
      variables: [],
      style: '',
      bestFor: [],
      history: [],
    };
    setPrompts(prev => [newPrompt, ...prev]);
    setSelectedPromptId(id);
    setCurrentView('dashboard');
  }, [categories]);

  const deletePrompt = useCallback((id: string) => {
    setPrompts(prev => {
      const next = prev.filter(p => p.id !== id);
      if (selectedPromptId === id) {
        setSelectedPromptId(next.length > 0 ? next[0].id : null);
      }
      return next;
    });
  }, [selectedPromptId]);

  const navItems = [
    { id: 'dashboard' as AppView, label: '提示词', icon: <LayoutDashboard size={20} /> },
  ];

  return (
    <div className="flex h-screen w-full relative overflow-hidden bg-[#0F0F10]">
      {/* Sidebar Toggle Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute top-4 left-4 z-30 p-2 rounded-[8px] text-white/40 hover:text-white hover:bg-white/[0.05] transition-all duration-300"
        title={sidebarOpen ? '收起菜单' : '展开菜单'}
      >
        {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
      </button>

      {/* Sidebar Navigation */}
      <nav
        className={`flex flex-col items-center py-6 px-3 shrink-0 transition-all duration-300 z-20 overflow-hidden border-r border-white/[0.03] ${sidebarOpen ? 'w-[200px]' : 'w-0 p-0 border-none opacity-0 pointer-events-none'}`}
      >
        <div className="w-full flex items-center gap-3 mb-8 px-2">
          <div className="w-7 h-7 bg-white text-[#121212] rounded-[6px] flex items-center justify-center font-bold text-sm">
            P
          </div>
          <span className="font-bold text-base tracking-tight text-white">PromptX</span>
        </div>

        <div className="w-full space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setCurrentView(item.id); setSettingsOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] transition-all duration-200 text-sm
                ${currentView === item.id ? 'bg-white/[0.06] text-white font-medium' : 'text-white/50 hover:bg-white/[0.03] hover:text-white/80 font-normal'}`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-auto w-full px-2 space-y-1">
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] transition-all duration-200 text-sm text-white/40 hover:bg-white/[0.03] hover:text-white/70 font-normal`}
          >
            <Settings2 size={18} />
            设置
          </button>
          <a
            href="https://github.com/nicoliustudio/PromptX/blob/master/docs/user-guide.md"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] transition-all duration-200 text-sm text-white/30 hover:bg-white/[0.03] hover:text-white/50 font-normal"
          >
            <BookOpen size={16} />
            使用文档
          </a>
          <a
            href="https://github.com/nicoliustudio/PromptX/tree/master/extension"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] transition-all duration-200 text-sm text-white/30 hover:bg-white/[0.03] hover:text-white/50 font-normal"
          >
            <Puzzle size={16} />
            浏览器扩展
          </a>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#0F0F10] z-10 relative">
        <Dashboard 
          prompts={prompts} 
          categories={categories} 
          selectedPromptId={selectedPromptId}
          onSelectPrompt={setSelectedPromptId}
          onUpdatePrompt={updatePrompt}
          onCreatePrompt={addPrompt}
          onCreateBlank={createBlankPrompt}
          onDeletePrompt={deletePrompt}
        />
      </main>

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F0F10]/80 backdrop-blur-[20px]" onClick={() => setSettingsOpen(false)}>
          <div className="bg-[#151517] border border-white/[0.05] rounded-[16px] w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <Settings />
          </div>
        </div>
      )}
    </div>
  );
}

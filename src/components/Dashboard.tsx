import { useState, useMemo } from 'react';
import { Category, Prompt } from '../types';
import { Search, Plus, History, Command, Save, CheckCircle2, Loader2, Sparkles, X, PanelRightClose, Trash2, Variable } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DashboardProps {
  prompts: Prompt[];
  categories: Category[];
  selectedPromptId: string | null;
  onSelectPrompt: (id: string) => void;
  onUpdatePrompt: (prompt: Prompt) => void;
  onCreatePrompt?: (prompt: Prompt) => void;
  onCreateBlank?: () => void;
  onDeletePrompt?: (id: string) => void;
}

export default function Dashboard({ prompts, categories, selectedPromptId, onSelectPrompt, onUpdatePrompt, onCreatePrompt, onCreateBlank, onDeletePrompt }: DashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const selectedPrompt = prompts.find(p => p.id === selectedPromptId);

  const [isAddingPrompt, setIsAddingPrompt] = useState(false);
  const [addMode, setAddMode] = useState<'manual' | 'extract'>('extract');
  const [extractText, setExtractText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedPrompt, setExtractedPrompt] = useState<Partial<Prompt> | null>(null);
  const [timelineOpen, setTimelineOpen] = useState(false);

  // ── 手动创建表单状态 ──
  const [manualTitle, setManualTitle] = useState('');
  const [manualCommand, setManualCommand] = useState('');
  const [manualCategoryId, setManualCategoryId] = useState('');
  const [manualTemplate, setManualTemplate] = useState('');
  const [manualStyle, setManualStyle] = useState('');
  const [manualBestFor, setManualBestFor] = useState('');
  const [manualError, setManualError] = useState('');

  // 自动从模板中提取 {{变量}}
  const manualVariables = useMemo(() => {
    const matches = manualTemplate.match(/\{\{(.+?)\}\}/g);
    if (!matches) return [];
    return [...new Set(matches.map(m => m.slice(2, -2).trim()))];
  }, [manualTemplate]);

  const resetManualForm = () => {
    setManualTitle('');
    setManualCommand('');
    setManualCategoryId('');
    setManualTemplate('');
    setManualStyle('');
    setManualBestFor('');
    setManualError('');
  };

  const handleManualCreate = () => {
    // 校验必填字段
    if (!manualTitle.trim()) {
      setManualError('请输入提示词名称');
      return;
    }
    if (!manualCommand.trim()) {
      setManualError('请输入唤起命令');
      return;
    }
    if (!/^[a-z0-9_]+$/i.test(manualCommand.trim())) {
      setManualError('唤起命令只能包含英文字母、数字和下划线');
      return;
    }
    // 检查命令是否重复
    if (prompts.some(p => p.command.toLowerCase() === manualCommand.trim().toLowerCase())) {
      setManualError(`唤起命令 "${manualCommand.trim()}" 已被使用，请换一个`);
      return;
    }
    if (!manualTemplate.trim()) {
      setManualError('请输入提示词模板');
      return;
    }
    const categoryId = manualCategoryId || categories[0]?.id || 'cat-1';

    onCreatePrompt?.({
      id: 'p-' + Date.now(),
      title: manualTitle.trim(),
      command: manualCommand.trim(),
      categoryId,
      template: manualTemplate.trim(),
      variables: manualVariables,
      style: manualStyle.trim() || '通用',
      bestFor: manualBestFor.trim() ? manualBestFor.split(/[,，]/).map(s => s.trim()).filter(Boolean) : [],
      history: [],
    });

    resetManualForm();
    setIsAddingPrompt(false);
  };

  const filteredPrompts = prompts.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.command.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory ? p.categoryId === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  // ── 运行模式状态 ──
  const [editMode, setEditMode] = useState<'edit' | 'run'>('edit');
  const [runValues, setRunValues] = useState<Record<string, string>>({});

  // 切换提示词时重置运行模式
  const handleSelectPromptWithReset = (id: string) => {
    onSelectPrompt(id);
    setEditMode('edit');
    setRunValues({});
  };

  // 组装最终提示词
  const assembledPrompt = useMemo(() => {
    if (!selectedPrompt) return '';
    let result = selectedPrompt.template;
    selectedPrompt.variables.forEach(v => {
      const val = runValues[v] || '';
      result = result.replace(new RegExp(`\\{\\{\\s*${v}\\s*\\}\\}`, 'g'), val || `{{${v}}}`);
    });
    return result;
  }, [selectedPrompt, runValues]);

  const handleCopyAssembled = () => {
    navigator.clipboard.writeText(assembledPrompt);
    showCopyToast();
  };

  const [copyToast, setCopyToast] = useState(false);
  const showCopyToast = () => {
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 2000);
  };

  const handleContentChange = (newContent: string) => {
    if (!selectedPrompt) return;
    onUpdatePrompt({
      ...selectedPrompt,
      template: newContent
    });
  };

  const handleSaveSnapshot = () => {
    if (!selectedPrompt) return;
    const newVersion = {
      id: "v-" + Date.now(),
      template: selectedPrompt.template,
      timestamp: Date.now()
    };
    onUpdatePrompt({
      ...selectedPrompt,
      history: [newVersion, ...selectedPrompt.history]
    });
  }

  const handleRestore = (content: string) => {
    if (!selectedPrompt) return;
    onUpdatePrompt({
      ...selectedPrompt,
      template: content
    });
  }

  const handleSimulateExtract = () => {
    setIsExtracting(true);
    setTimeout(() => {
      setExtractedPrompt({
        title: '小红书探店方法论',
        command: 'xhs_pro',
        template: '定位：我是一个小红书爆款探店写手。\n\n写作结构：\n1. 【吸睛标题】：包含情绪词汇，如"绝绝子"、"宝藏"\n2. 【核心卖点】：深入描写 {{亮点}}\n3. 【体验感受】：结合个人视角谈 {{感受细节}}\n\n要求：字数控制在 {{字数}} 字左右，多使用 Emoji。',
        variables: ['亮点', '感受细节', '字数'],
        style: '网感/种草/情绪化',
        bestFor: ['餐饮探店', '测评', '文旅打卡']
      });
      setIsExtracting(false);
    }, 2500);
  };

  const handleSaveExtracted = () => {
    if (extractedPrompt && onCreatePrompt) {
      onCreatePrompt({
        id: 'p-' + Date.now(),
        title: extractedPrompt.title!,
        command: extractedPrompt.command!,
        categoryId: categories[0].id,
        template: extractedPrompt.template!,
        variables: extractedPrompt.variables!,
        style: extractedPrompt.style!,
        bestFor: extractedPrompt.bestFor!,
        history: []
      });
      setIsAddingPrompt(false);
    }
  };

  return (
    <div className="flex h-full w-full bg-transparent text-[#FAFAFA]">
      {/* Left Column: Prompt List */}
      <div className="w-[280px] border-r border-white/[0.04] flex flex-col shrink-0">
        <div className="p-5 border-b border-white/[0.04] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-title text-[16px]">提示词</h2>
            <button 
              onClick={() => onCreateBlank?.()}
              className="text-[13px] font-medium text-[#D4AF37] hover:opacity-80 transition-opacity flex items-center gap-1"
            >
              <Plus size={16} />
              新建提示词
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 text-white/30" size={16} />
            <input 
              type="text" 
              placeholder="搜索提示词..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input-minimal pl-7 border-b border-white/[0.08] pb-2 placeholder-white/25 text-[14px]"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button 
              onClick={() => setSelectedCategory(null)}
              className={`whitespace-nowrap px-3 py-1 rounded-[8px] text-xs font-medium transition-colors ${selectedCategory === null ? 'bg-white/[0.08] text-white' : 'bg-transparent text-white/40 hover:text-white/70'}`}
            >
              全部
            </button>
            {categories.map(c => (
              <button 
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`whitespace-nowrap px-3 py-1 rounded-[8px] text-xs font-medium transition-colors ${selectedCategory === c.id ? 'bg-white/[0.08] text-white' : 'bg-transparent text-white/40 hover:text-white/70'}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {filteredPrompts.map(prompt => (
            <button
              key={prompt.id}
              onClick={() => handleSelectPromptWithReset(prompt.id)}
              className={`w-full text-left p-3 rounded-[8px] transition-all duration-200 ${selectedPromptId === prompt.id ? 'bg-white/[0.06]' : 'bg-transparent hover:bg-white/[0.02]'}`}
            >
               <div className="font-medium text-[14px] text-white line-clamp-1">{prompt.title}</div>
              <div className="text-[12px] text-white/40 mt-1.5 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 font-mono">
                  <Command size={11} />
                  {prompt.command || '未设置'}
                </span>
                {prompt.style && (
                  <>
                    <span className="opacity-30">·</span>
                    <span className="truncate">{prompt.style}</span>
                  </>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right Column: Editor */}
      {selectedPrompt ? (
        <div className="flex-1 flex min-w-0 bg-[#0F0F10]">
          <div className="flex-1 flex flex-col min-w-0 border-r border-white/[0.03] relative">
            {/* Header */}
            <div className="px-8 py-5 border-b border-white/[0.03] flex items-center justify-between">
              <div className="flex items-center gap-4 min-w-0">
                <input
                  type="text"
                  value={selectedPrompt.title}
                  onChange={e => onUpdatePrompt({ ...selectedPrompt, title: e.target.value })}
                  className="bg-transparent text-lg font-bold text-white outline-none border-b border-transparent hover:border-white/[0.1] focus:border-[#D4AF37] transition-colors min-w-0 w-[200px]"
                  placeholder="未命名提示词"
                />
                <div className="flex items-center gap-2 text-[13px]">
                  <span className="text-white/30 font-mono">/</span>
                  <input
                    type="text"
                    value={selectedPrompt.command}
                    onChange={e => onUpdatePrompt({ ...selectedPrompt, command: e.target.value })}
                    className="bg-transparent text-white/60 font-mono text-[13px] outline-none border-b border-transparent hover:border-white/[0.1] focus:border-[#D4AF37] transition-colors w-[100px]"
                    placeholder="快捷命令"
                  />
                  {selectedPrompt.variables.length > 0 && (
                    <span className="text-white/30 ml-1">{selectedPrompt.variables.length} 变量</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* 编辑 / 运行 切换 */}
                <div className="flex bg-white/[0.04] rounded-[6px] p-0.5">
                  <button
                    onClick={() => setEditMode('edit')}
                    className={`px-3 py-1.5 text-[13px] font-medium rounded-[4px] transition-colors ${editMode === 'edit' ? 'bg-white/[0.08] text-white' : 'text-white/40 hover:text-white/70'}`}
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => { setEditMode('run'); setRunValues({}); }}
                    className={`px-3 py-1.5 text-[13px] font-medium rounded-[4px] transition-colors ${editMode === 'run' ? 'bg-white/[0.08] text-white' : 'text-white/40 hover:text-white/70'}`}
                  >
                    运行
                  </button>
                </div>
                <button onClick={handleSaveSnapshot} className="btn-secondary text-[13px] h-[32px] px-3" title="保存版本">
                  <Save size={14} />
                  版本
                </button>
                <button
                  onClick={() => setTimelineOpen(!timelineOpen)}
                  className={`btn-icon ${timelineOpen ? 'text-white/70' : 'text-white/30'}`}
                  title="版本历史"
                >
                  <History size={16} />
                </button>
                {onDeletePrompt && (
                  <button 
                    onClick={() => { if (confirm(`确定要删除「${selectedPrompt.title}」吗？`)) onDeletePrompt(selectedPrompt.id); }}
                    className="btn-icon text-white/20 hover:text-red-400"
                    title="删除"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
            
            {/* Editor Body */}
            <div className="flex-1 overflow-y-auto">
              {editMode === 'edit' ? (
                <div className="h-full p-8">
                  <div className="relative w-full h-full font-sans text-[15px] leading-[1.7] rounded-[8px] overflow-hidden">
                    {/* Variable highlight overlay */}
                    <div 
                      className="absolute inset-0 pointer-events-none whitespace-pre-wrap break-words text-transparent font-sans"
                      aria-hidden="true"
                    >
                      {selectedPrompt.template.split(/({{.*?}})/g).map((part, i) => {
                        if (part.startsWith('{{') && part.endsWith('}}')) {
                          return <span key={i} className="px-1.5 py-0.5 bg-[#D4AF37]/15 text-transparent border border-[#D4AF37]/25 rounded-[4px] text-[14px] mx-0.5 leading-none align-baseline inline-block font-mono">{part}</span>;
                        }
                        return <span key={i}>{part}</span>;
                      })}
                      {'\n'}
                    </div>
                    
                    <textarea
                      value={selectedPrompt.template}
                      onChange={e => handleContentChange(e.target.value)}
                      className="absolute inset-0 w-full h-full resize-none bg-transparent outline-none text-white/90 caret-[#D4AF37] font-sans p-0"
                      spellCheck={false}
                      placeholder="在此输入提示词模板...&#10;&#10;使用 {{变量名}} 定义占位符，例如：&#10;你是一个专业翻译。请将以下内容翻译为 {{语言}}：&#10;{{内容}}"
                    />
                  </div>
                </div>
              ) : (
                /* 运行模式：变量表单 + 终预览 */
                <div className="p-8 space-y-6 max-w-[960px] mx-auto">
                  {selectedPrompt.variables.length === 0 ? (
                    <div className="text-white/30 text-[14px] py-12 text-center">
                      该提示词没有定义变量，无需填写参数。
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <p className="text-[13px] text-white/40">填写变量后即可复制完整的提示词</p>
                      {selectedPrompt.variables.map(v => (
                        <div key={v}>
                          <label className="text-[12px] font-medium text-white/40 block mb-2">{`{{${v}}}`}</label>
                          <textarea
                            value={runValues[v] || ''}
                            onChange={e => setRunValues(prev => ({ ...prev, [v]: e.target.value }))}
                            className="input-card w-full min-h-[60px] resize-none"
                            placeholder={`输入 ${v}...`}
                            rows={2}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 组装预览 */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-[12px] font-medium text-white/30 uppercase tracking-widest">最终提示词</label>
                      <button
                        onClick={handleCopyAssembled}
                        className="text-[12px] text-[#D4AF37] hover:opacity-80 transition-opacity flex items-center gap-1"
                      >
                        {copyToast ? '已复制' : '复制'}
                      </button>
                    </div>
                    <div className="bg-[#151517] border border-white/[0.04] rounded-[8px] p-5 font-sans text-[14px] leading-[1.7] whitespace-pre-wrap text-white/80">
                      {assembledPrompt || selectedPrompt.template}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Version Panel (Drawer) */}
          <div className={`bg-[#151517] flex flex-col shrink-0 transition-all duration-300 ${timelineOpen ? 'w-[280px] max-w-[280px] border-l border-white/[0.04]' : 'w-0 overflow-hidden'}`}>
            {timelineOpen && (
              <>
                <div className="px-6 py-4 border-b border-white/[0.04] flex items-center justify-between text-[14px] font-medium text-white">
                  版本历史
                  <button onClick={() => setTimelineOpen(false)} className="btn-icon">
                    <PanelRightClose size={14} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  <div className="text-[13px] text-white/50">
                    当前版本 · {new Date().toLocaleDateString()}
                  </div>
                  {selectedPrompt.history.length === 0 ? (
                    <p className="text-[13px] text-white/20">暂无历史版本</p>
                  ) : (
                    selectedPrompt.history.map((ver, idx) => (
                      <div key={ver.id} className="border-l border-white/[0.06] pl-4">
                        <div className="text-[13px] text-white/50 font-mono">{new Date(ver.timestamp).toLocaleString()}</div>
                        <button 
                          onClick={() => handleRestore(ver.template)}
                          className="text-[12px] text-[#D4AF37] hover:opacity-80 mt-2 transition-opacity"
                        >
                          回滚至此版本
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center flex-col gap-4 opacity-20">
          <Command size={40} className="text-white" />
          <p className="text-[14px] text-white font-medium">选择提示词，或点击 [+ 新建提示词] 开始</p>
        </div>
      )}

      {/* Add Prompt Modal */}
      <AnimatePresence>
        {isAddingPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#121212]/80 backdrop-blur-[30px]">
            <motion.div 
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[#1A1A1A] border border-white/[0.05] rounded-[16px] subtle-shadow-3 w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between p-8 border-b border-white/[0.05]">
                <h2 className="text-[20px] font-bold text-white flex items-center gap-3">
                  <Sparkles className="text-[#D4AF37]" size={20} />
                  新增系统能力
                </h2>
                <button 
                  onClick={() => setIsAddingPrompt(false)}
                  className="btn-icon"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex border-b border-white/[0.05]">
                <button 
                  onClick={() => setAddMode('extract')}
                  className={`flex-1 py-4 text-[14px] font-medium transition-colors ${addMode === 'extract' ? 'text-[#D4AF37] border-b-2 border-[#D4AF37]' : 'text-white/40 hover:text-white/80'}`}
                >
                  对话提纯 
                </button>
                <button 
                  onClick={() => setAddMode('manual')}
                  className={`flex-1 py-4 text-[14px] font-medium transition-colors ${addMode === 'manual' ? 'text-[#D4AF37] border-b-2 border-[#D4AF37]' : 'text-white/40 hover:text-white/80'}`}
                >
                  手动创建 
                </button>
              </div>

              <div className="p-8 overflow-y-auto flex-1">
                {addMode === 'manual' ? (
                  <div className="space-y-6">
                    <div className="text-[14px] text-white/60 leading-[1.6]">
                      <strong className="text-white block mb-2 font-medium">手动创建提示词</strong>
                      填入基本信息并编写模板，系统会自动识别 <code className="text-[#D4AF37] bg-[#D4AF37]/10 px-1.5 py-0.5 rounded-[4px] text-[13px]">{'{{变量}}'}</code>。
                    </div>

                    {manualError && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-[13px] text-red-400 bg-red-400/10 border border-red-400/20 rounded-[8px] px-4 py-3"
                      >
                        {manualError}
                      </motion.div>
                    )}

                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <label className="text-[12px] font-bold text-white/30 uppercase tracking-widest block mb-2">
                          提示词名称 <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={manualTitle}
                          onChange={e => { setManualTitle(e.target.value); setManualError(''); }}
                          placeholder="例如：小红书种草文案"
                          className="input-card w-full"
                        />
                      </div>
                      <div>
                        <label className="text-[12px] font-bold text-white/30 uppercase tracking-widest block mb-2">
                          唤起命令 <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 font-mono text-[14px]">/</span>
                          <input
                            type="text"
                            value={manualCommand}
                            onChange={e => { setManualCommand(e.target.value); setManualError(''); }}
                            placeholder="xhs"
                            className="input-card w-full pl-8 font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[12px] font-bold text-white/30 uppercase tracking-widest block mb-2">所属分类</label>
                      <select
                        value={manualCategoryId}
                        onChange={e => setManualCategoryId(e.target.value)}
                        className="input-card w-full appearance-none cursor-pointer"
                      >
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <label className="text-[12px] font-bold text-white/30 uppercase tracking-widest block mb-2">执行风格</label>
                        <input
                          type="text"
                          value={manualStyle}
                          onChange={e => setManualStyle(e.target.value)}
                          placeholder="例如：专业严谨"
                          className="input-card w-full"
                        />
                      </div>
                      <div>
                        <label className="text-[12px] font-bold text-white/30 uppercase tracking-widest block mb-2">适用场景</label>
                        <input
                          type="text"
                          value={manualBestFor}
                          onChange={e => setManualBestFor(e.target.value)}
                          placeholder="用逗号分隔，例如：探店,美妆,生活方式"
                          className="input-card w-full"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[12px] font-bold text-white/30 uppercase tracking-widest block mb-2">
                        提示词模板 <span className="text-red-400">*</span>
                        {manualVariables.length > 0 && (
                          <span className="ml-2 text-[#D4AF37] font-normal normal-case tracking-normal">
                            · 已识别 {manualVariables.length} 个变量
                          </span>
                        )}
                      </label>
                      <textarea
                        value={manualTemplate}
                        onChange={e => { setManualTemplate(e.target.value); setManualError(''); }}
                        placeholder={'使用 {{变量名}} 来定义占位符\n\n例如：\n你是一个小红书爆款文案专家。请为主题：{{topic}} 撰写一篇种草文案。\n风格要求：{{tone}}\n字数：{{length}}字'}
                        className="input-card w-full h-48 font-mono text-[13px] leading-[1.7] resize-none"
                        spellCheck={false}
                      />
                    </div>

                    {manualVariables.length > 0 && (
                      <div>
                        <label className="text-[12px] font-bold text-white/30 uppercase tracking-widest block mb-2">
                          <Variable size={14} className="inline mr-1.5 -mt-0.5" />
                          自动变量
                        </label>
                        <div className="flex gap-2 flex-wrap">
                          {manualVariables.map((v, i) => (
                            <span key={i} className="px-3 py-1.5 bg-[#D4AF37]/10 rounded-[6px] text-[13px] text-[#D4AF37] font-mono border border-[#D4AF37]/20">
                              {`{{${v}}}`}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleManualCreate}
                      className="btn-primary w-full"
                    >
                      保存至资产库
                    </button>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="text-[14px] text-white/60 leading-[1.6]">
                      <strong className="text-white block mb-2 font-medium">什么是对话提纯？</strong>
                      直接粘贴历史记录，AI 会自动为您提取并结构化到底层模板中。
                    </div>

                    {!extractedPrompt && (
                      <div className="space-y-4">
                        <textarea
                          value={extractText}
                          onChange={e => setExtractText(e.target.value)}
                          placeholder="粘贴对话历史..."
                          className="input-card w-full h-48 font-mono text-[13px] leading-[1.6] resize-none"
                        />
                        <button 
                          onClick={handleSimulateExtract}
                          disabled={isExtracting}
                          className="btn-primary w-full disabled:opacity-50"
                        >
                          {isExtracting ? (
                            <>
                              <Loader2 size={18} className="animate-spin" />
                              正在深度分析...
                            </>
                          ) : (
                            <>
                              一键提取
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {extractedPrompt && !isExtracting && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/[0.02] border border-white/[0.05] rounded-[12px] p-8"
                      >
                        <div className="flex items-start gap-6">
                          <div className="w-12 h-12 rounded-full bg-[#165D4C]/20 flex items-center justify-center text-[#165D4C] shrink-0">
                            <CheckCircle2 size={24} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-[18px] font-bold text-white mb-2">提纯成功</h3>
                            <p className="text-[14px] text-white/50 mb-8">系统已自动提取出 {extractedPrompt.variables?.length} 个自动参数。</p>
                            
                            <div className="space-y-6">
                              <div className="grid grid-cols-2 gap-6">
                                <div>
                                  <label className="text-[12px] font-bold text-white/30 uppercase tracking-widest block mb-2">能力名称</label>
                                  <div className="text-[14px] text-white font-medium">{extractedPrompt.title}</div>
                                </div>
                                <div>
                                  <label className="text-[12px] font-bold text-white/30 uppercase tracking-widest block mb-2">唤起命令</label>
                                  <div className="text-[14px] text-white/80 font-mono">/{extractedPrompt.command}</div>
                                </div>
                              </div>
                              
                              <div>
                                <label className="text-[12px] font-bold text-white/30 uppercase tracking-widest block mb-2">自动变量</label>
                                <div className="flex gap-2 flex-wrap">
                                  {extractedPrompt.variables?.map((v, i) => (
                                    <span key={i} className="px-3 py-1.5 bg-white/[0.03] rounded-[6px] text-[13px] text-white/70 font-mono border border-white/[0.05]">
                                      {v}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <label className="text-[12px] font-bold text-white/30 uppercase tracking-widest block mb-2">结构化底层模板</label>
                                <div className="text-[13px] text-white/60 font-mono bg-[#121212]/50 border border-white/[0.04] rounded-[8px] p-5 whitespace-pre-wrap leading-[1.6]">
                                  {extractedPrompt.template}
                                </div>
                              </div>
                            </div>

                            <button 
                              onClick={handleSaveExtracted}
                              className="btn-primary w-full mt-8"
                            >
                              保存至资产库
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

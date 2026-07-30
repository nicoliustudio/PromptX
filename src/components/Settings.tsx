import { useState, useEffect, useRef } from 'react';
import { AISettings, AIProvider, PROVIDER_PRESETS } from '../types';
import { loadSettings, saveSettings, clearSettings, maskApiKey } from '../store/settings';
import { exportAll, downloadExport, importAll, clearAllData, publishExtensionData } from '../store/data';
import type { ImportResult } from '../store/data';
import { Shield, Key, Globe, Cpu, Trash2, CheckCircle2, AlertTriangle, Download, Upload, FileJson, RefreshCw, Send } from 'lucide-react';
import { motion } from 'motion/react';

const PROVIDERS = Object.entries(PROVIDER_PRESETS) as [AIProvider, typeof PROVIDER_PRESETS[AIProvider]][];

export default function Settings() {
  const [settings, setSettings] = useState<AISettings>(loadSettings);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const handleProviderChange = (provider: AIProvider) => {
    const preset = PROVIDER_PRESETS[provider];
    setSettings(prev => ({
      ...prev,
      provider,
      baseURL: preset.baseURL,
      model: preset.models[0] || prev.model,
    }));
  };

  const handleSave = () => {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    if (confirm('确定要清除所有 API 配置吗？此操作不可撤销。')) {
      clearSettings();
      setSettings({ provider: 'gemini', apiKey: '', baseURL: PROVIDER_PRESETS.gemini.baseURL, model: 'gemini-2.5-flash', githubToken: '' });
    }
  };

  const handlePublish = async () => {
    if (!settings.githubToken) {
      setPublishMsg({ ok: false, text: '请先填入 GitHub Token。' });
      return;
    }
    setPublishing(true);
    setPublishMsg(null);
    const result = await publishExtensionData(settings.githubToken);
    setPublishMsg({ ok: result.success, text: result.message });
    setPublishing(false);
  };

  const handleExport = () => {
    const data = exportAll();
    downloadExport(data);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      const result = importAll(reader.result as string);
      setImportResult(result);
      setImporting(false);
      if (result.success) {
        // Reload settings from localStorage
        setSettings(loadSettings());
      }
    };
    reader.onerror = () => {
      setImportResult({ success: false, promptsCount: 0, categoriesCount: 0, hasSettings: false, error: '文件读取失败。' });
      setImporting(false);
    };
    reader.readAsText(file);
    // Reset input so same file can be re-imported
    e.target.value = '';
  };

  const handleResetAll = () => {
    if (confirm('确定要清除所有本地数据（提示词、分类、API 配置）并恢复默认吗？此操作不可撤销。')) {
      clearSettings();
      clearAllData();
      setSettings({ provider: 'gemini', apiKey: '', baseURL: PROVIDER_PRESETS.gemini.baseURL, model: 'gemini-2.5-flash', githubToken: '' });
      window.location.reload();
    }
  };

  const selectedPreset = PROVIDER_PRESETS[settings.provider];
  const isCustom = settings.provider === 'custom';

  return (
    <div className="flex h-full w-full bg-transparent text-[#FAFAFA]">
      <div className="flex-1 max-w-2xl mx-auto px-12 py-10 overflow-y-auto">
        <div className="mb-8">
          <h1 className="text-[28px] font-bold tracking-tight text-white flex items-center gap-3 mb-2">
            <Shield className="text-[#D4AF37]" size={24} />
            设置中心
          </h1>
          <p className="text-white/50 text-[14px]">
            管理 API 密钥、数据导入导出与备份。
          </p>
        </div>

        {/* Security Notice */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-5 mb-8 flex items-start gap-3 border-[#D4AF37]/20"
        >
          <AlertTriangle size={20} className="text-[#D4AF37] shrink-0 mt-0.5" />
          <div className="text-[13px] text-white/70 leading-relaxed">
            <p className="font-medium text-white/90 mb-1">安全提示</p>
            <p>你的 API Key 仅存储在浏览器 localStorage 中，不会上传到任何远程服务器。每次调用都直接从你的浏览器发起请求到对应 AI 服务商。</p>
          </div>
        </motion.div>

        {/* Provider Selection */}
        <div className="glass-card p-6 mb-6 space-y-5">
          <div className="flex items-center gap-2 text-[13px] font-bold text-white/40 uppercase tracking-widest">
            <Cpu size={14} />
            选择提供商
          </div>
          <div className="grid grid-cols-2 gap-3">
            {PROVIDERS.map(([key, preset]) => (
              <button
                key={key}
                onClick={() => handleProviderChange(key)}
                className={`p-4 rounded-[12px] border text-left transition-all duration-200 ${
                  settings.provider === key
                    ? 'border-[#D4AF37]/50 bg-[#D4AF37]/5'
                    : 'border-white/[0.06] bg-white/[0.01] hover:border-white/[0.12]'
                }`}
              >
                <div className="font-medium text-[15px] text-white">{preset.label}</div>
                <div className="text-[12px] text-white/40 mt-1 truncate">
                  {key === 'custom' ? 'OpenAI 兼容接口' : preset.baseURL}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* API Key */}
        <div className="glass-card p-6 mb-6 space-y-5">
          <div className="flex items-center gap-2 text-[13px] font-bold text-white/40 uppercase tracking-widest">
            <Key size={14} />
            API Key
          </div>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={settings.apiKey}
              onChange={e => setSettings(prev => ({ ...prev, apiKey: e.target.value }))}
              placeholder={settings.apiKey ? maskApiKey(settings.apiKey) : '输入你的 API Key...'}
              className="w-full input-card pr-16 font-mono text-[14px]"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-white/40 hover:text-white/80 transition-colors"
            >
              {showKey ? '隐藏' : '显示'}
            </button>
          </div>
          {!settings.apiKey && (
            <p className="text-[12px] text-white/30">尚未配置 API Key，部分功能将不可用。</p>
          )}
        </div>

        {/* Base URL (only for custom or custom-edited) */}
        <div className="glass-card p-6 mb-6 space-y-5">
          <div className="flex items-center gap-2 text-[13px] font-bold text-white/40 uppercase tracking-widest">
            <Globe size={14} />
            接口地址
          </div>
          <input
            type="text"
            value={settings.baseURL}
            onChange={e => setSettings(prev => ({ ...prev, baseURL: e.target.value }))}
            placeholder={isCustom ? 'https://your-api.example.com/v1' : selectedPreset.baseURL}
            className="w-full input-card font-mono text-[14px]"
          />
          <p className="text-[12px] text-white/30">
            {isCustom
              ? '输入兼容 OpenAI 协议的 API 地址。'
              : '默认地址已自动填充，如需代理地址可手动修改。'}
          </p>
        </div>

        {/* Model */}
        <div className="glass-card p-6 mb-8 space-y-5">
          <div className="flex items-center gap-2 text-[13px] font-bold text-white/40 uppercase tracking-widest">
            <Cpu size={14} />
            模型
          </div>
          {isCustom ? (
            <input
              type="text"
              value={settings.model}
              onChange={e => setSettings(prev => ({ ...prev, model: e.target.value }))}
              placeholder="输入模型名称，如 gpt-4o"
              className="w-full input-card font-mono text-[14px]"
            />
          ) : selectedPreset.models.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {selectedPreset.models.map(m => (
                <button
                  key={m}
                  onClick={() => setSettings(prev => ({ ...prev, model: m }))}
                  className={`p-3 rounded-[8px] border text-left font-mono text-[13px] transition-all duration-200 ${
                    settings.model === m
                      ? 'border-[#D4AF37]/50 bg-[#D4AF37]/5 text-white'
                      : 'border-white/[0.06] bg-white/[0.01] text-white/60 hover:border-white/[0.12]'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          ) : (
            <input
              type="text"
              value={settings.model}
              onChange={e => setSettings(prev => ({ ...prev, model: e.target.value }))}
              placeholder="输入模型名称"
              className="w-full input-card font-mono text-[14px]"
            />
          )}
        </div>

        {/* Data Import / Export */}
        <div className="glass-card p-6 mb-6 space-y-5">
          <div className="flex items-center gap-2 text-[13px] font-bold text-white/40 uppercase tracking-widest">
            <FileJson size={14} />
            数据备份
          </div>
          <p className="text-[13px] text-white/50">
            导出提示词库和设置到 JSON 文件，方便备份或迁移到其他设备。导入时会自动合并数据。
          </p>
          <div className="flex gap-4">
            <button onClick={handleExport} className="btn-secondary flex-1">
              <Download size={18} />
              导出备份
            </button>
            <button onClick={handleImportClick} disabled={importing} className="btn-secondary flex-1">
              {importing ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <Upload size={18} />
              )}
              {importing ? '导入中...' : '导入备份'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          {importResult && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-[10px] border text-[13px] ${
                importResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}
            >
              {importResult.success ? (
                <div className="space-y-1">
                  <p className="font-medium">导入成功</p>
                  <p>{importResult.promptsCount} 条提示词、{importResult.categoriesCount} 个分类已恢复。</p>
                  {importResult.hasSettings && <p>API 配置已同步更新。</p>}
                  <p className="text-[12px] opacity-70 mt-2">数据已写入本地存储，提示词变更已生效。</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="font-medium">导入失败</p>
                  <p>{importResult.error}</p>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Extension Sync */}
        <div className="glass-card p-6 mb-6 space-y-5">
          <div className="flex items-center gap-2 text-[13px] font-bold text-white/40 uppercase tracking-widest">
            <Send size={14} />
            扩展同步
          </div>
          <p className="text-[13px] text-white/50">
            将当前提示词库发布到线上，浏览器扩展即可同步最新数据。需要 GitHub Personal Access Token（<code className="text-[#D4AF37]">repo</code> 权限）。
          </p>
          <div className="relative">
            <input
              type="password"
              value={settings.githubToken}
              onChange={e => setSettings(prev => ({ ...prev, githubToken: e.target.value }))}
              placeholder="填入 GitHub Token..."
              className="w-full input-card font-mono text-[14px]"
            />
          </div>
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="btn-primary w-full"
          >
            {publishing ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
            {publishing ? '发布中...' : '发布到扩展'}
          </button>
          {publishMsg && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-[10px] border text-[13px] ${
                publishMsg.ok
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}
            >
              {publishMsg.text}
            </motion.div>
          )}
        </div>

        {/* Reset All Data */}
        <div className="glass-card p-6 mb-8 space-y-5 border-red-500/10">
          <div className="flex items-center gap-2 text-[13px] font-bold text-red-400/60 uppercase tracking-widest">
            <Trash2 size={14} />
            重置所有数据
          </div>
          <p className="text-[13px] text-white/40">
            清除浏览器中所有 PromptX 本地数据（提示词、分类、API 配置），恢复为初始状态。建议先导出备份。
          </p>
          <button onClick={handleResetAll} className="btn-secondary w-full text-red-400/70 hover:text-red-400 hover:border-red-400/30">
            <Trash2 size={18} />
            清除所有数据并重置
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button onClick={handleSave} className="btn-primary px-8">
            <CheckCircle2 size={18} />
            {saved ? '已保存' : '保存配置'}
          </button>
          <button onClick={handleClear} className="btn-secondary px-8 text-white/40 hover:text-red-400">
            <Trash2 size={18} />
            清除配置
          </button>
        </div>

        <div className="mt-12 pb-8 text-[12px] text-white/20 leading-relaxed">
          <p>PromptX 不会在任何服务器上存储你的 API Key。</p>
          <p>所有请求直接从你的浏览器发送到对应的 AI 服务商。</p>
        </div>
      </div>
    </div>
  );
}

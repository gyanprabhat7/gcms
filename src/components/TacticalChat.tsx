'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, X, MessageSquare, Settings, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

const DEFAULT_BASE_URL = process.env.NEXT_PUBLIC_CHAT_BASE_URL || 'https://api.openai.com/v1';
const DEFAULT_MODEL = process.env.NEXT_PUBLIC_CHAT_MODEL || 'gpt-4o-mini';
const STORAGE_KEY = 'gcms_chat_config';

interface ChatConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
}

type Message = { role: 'user' | 'assistant'; content: string };

function loadConfig(): ChatConfig {
  if (typeof window === 'undefined') return { baseUrl: DEFAULT_BASE_URL, model: DEFAULT_MODEL, apiKey: '' };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // If the stored baseUrl doesn't match the current env default AND it's still the old OpenAI default,
      // the user likely changed .env — reset to new defaults.
      if (parsed.baseUrl && parsed.baseUrl !== DEFAULT_BASE_URL && parsed.baseUrl === 'https://api.openai.com/v1') {
        localStorage.removeItem(STORAGE_KEY);
        return { baseUrl: DEFAULT_BASE_URL, model: DEFAULT_MODEL, apiKey: '' };
      }
      return { baseUrl: DEFAULT_BASE_URL, model: DEFAULT_MODEL, apiKey: '', ...parsed };
    }
  } catch { /* ignore */ }
  return { baseUrl: DEFAULT_BASE_URL, model: DEFAULT_MODEL, apiKey: '' };
}

export default function TacticalChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'THERON online. I deal in facts, not conjecture. State your query — and bring sources if you have them.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<ChatConfig>(loadConfig);
  const [draftConfig, setDraftConfig] = useState<ChatConfig>(loadConfig);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const saveConfig = useCallback(() => {
    setConfig(draftConfig);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draftConfig));
    setShowSettings(false);
  }, [draftConfig]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          conversationHistory: newMessages.slice(1), // exclude initial greeting
          baseUrl: config.baseUrl !== DEFAULT_BASE_URL ? config.baseUrl : undefined,
          model: config.model !== DEFAULT_MODEL ? config.model : undefined,
          apiKey: config.apiKey || undefined,
        })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || 'No response received.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Secure Uplink Failed.' }]);
    } finally {
      setLoading(false);
    }
  };

  const isCustomConfig = config.baseUrl !== DEFAULT_BASE_URL || config.model !== DEFAULT_MODEL;

  return (
    <>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-primary-fg rounded-full shadow-[0_0_20px_var(--primary)] flex items-center justify-center z-[100] border-2 border-background"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
        {isCustomConfig && !isOpen && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-secondary rounded-full border-2 border-background" />
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-80 md:w-96 bg-card/95 backdrop-blur-xl border border-primary/50 rounded-lg shadow-2xl z-[100] flex flex-col overflow-hidden"
            style={{ height: showSettings ? 'auto' : '500px' }}
          >
            {/* Header */}
            <div className="p-3 border-b border-primary/30 bg-primary/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                <span className="text-xs font-mono font-bold text-primary tracking-widest">TACTICAL AI</span>
                {isCustomConfig && (
                  <span className="text-[8px] font-mono text-secondary bg-secondary/10 border border-secondary/30 px-1.5 py-0.5 rounded uppercase">Local</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setDraftConfig(config); setShowSettings(!showSettings); }}
                  className={`p-1.5 rounded transition-colors ${showSettings ? 'text-secondary bg-secondary/10' : 'text-muted-foreground hover:text-primary hover:bg-primary/10'}`}
                  title="Model Settings"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Settings Panel */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border-b border-border bg-background/80 overflow-hidden shrink-0"
                >
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono text-secondary uppercase tracking-widest">Model Configuration</span>
                      <ChevronDown
                        className="w-3 h-3 text-muted-foreground cursor-pointer hover:text-primary"
                        onClick={() => setShowSettings(false)}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Base URL</label>
                      <input
                        type="text"
                        value={draftConfig.baseUrl}
                        onChange={e => setDraftConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                        placeholder="https://api.openai.com/v1"
                        className="w-full bg-background border border-border rounded px-2 py-1.5 text-[10px] font-mono text-foreground focus:outline-none focus:border-primary transition-colors"
                      />
                      <p className="text-[8px] text-muted-foreground font-mono">Ollama: http://localhost:11434/v1</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Model Name</label>
                      <input
                        type="text"
                        value={draftConfig.model}
                        onChange={e => setDraftConfig(prev => ({ ...prev, model: e.target.value }))}
                        placeholder="gpt-4o-mini"
                        className="w-full bg-background border border-border rounded px-2 py-1.5 text-[10px] font-mono text-foreground focus:outline-none focus:border-primary transition-colors"
                      />
                      <p className="text-[8px] text-muted-foreground font-mono">e.g. llama3, mistral, gpt-4o</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">API Key <span className="normal-case opacity-60">(leave blank for local)</span></label>
                      <input
                        type="password"
                        value={draftConfig.apiKey}
                        onChange={e => setDraftConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                        placeholder="sk-... (uses server .env key if blank)"
                        className="w-full bg-background border border-border rounded px-2 py-1.5 text-[10px] font-mono text-foreground focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={saveConfig}
                        className="flex-1 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary text-[10px] font-mono uppercase tracking-wider rounded border border-primary/30 transition-colors"
                      >
                        Apply
                      </button>
                      <button
                        onClick={() => {
                          const reset = { baseUrl: DEFAULT_BASE_URL, model: DEFAULT_MODEL, apiKey: '' };
                          setDraftConfig(reset);
                          setConfig(reset);
                          localStorage.removeItem(STORAGE_KEY);
                          setShowSettings(false);
                        }}
                        className="py-1.5 px-3 bg-background hover:bg-white/5 text-muted-foreground text-[10px] font-mono uppercase tracking-wider rounded border border-border transition-colors"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            {!showSettings && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs" ref={scrollRef}>
                  {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] p-2.5 rounded text-[11px] leading-relaxed ${m.role === 'user'
                        ? 'bg-primary text-primary-fg rounded-tr-none'
                        : 'bg-secondary/10 text-secondary border border-secondary/30 rounded-tl-none'
                      }`}>
                        {m.role === 'assistant' ? (
                          <div className="prose prose-invert prose-xs max-w-none prose-p:my-1 prose-headings:my-1.5 prose-ul:my-1 prose-li:my-0.5 prose-strong:text-current prose-code:text-[10px] prose-code:bg-black/20 prose-code:px-1 prose-code:rounded">
                            <ReactMarkdown>{m.content}</ReactMarkdown>
                          </div>
                        ) : m.content}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-secondary/10 text-secondary p-2.5 rounded border border-secondary/30 text-[11px]">
                        <span className="animate-pulse">ANALYZING</span>
                        <span className="animate-bounce inline-block ml-0.5">.</span>
                        <span className="animate-bounce inline-block" style={{ animationDelay: '0.15s' }}>.</span>
                        <span className="animate-bounce inline-block" style={{ animationDelay: '0.3s' }}>.</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="p-3 border-t border-primary/30 bg-background/50 flex gap-2 shrink-0">
                  <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder="Enter query..."
                    className="flex-1 bg-background border border-primary/30 rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-primary text-foreground transition-colors"
                  />
                  <button
                    onClick={handleSend}
                    disabled={loading || !input.trim()}
                    className="p-2 bg-primary/20 hover:bg-primary/40 text-primary rounded border border-primary/50 transition-colors disabled:opacity-40"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
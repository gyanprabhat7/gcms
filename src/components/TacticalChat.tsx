'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, X, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TacticalChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([
    { role: 'assistant', content: 'Tactical AI Online. Awaiting queries.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || 'Connection lost.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Secure Uplink Failed.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.button onClick={() => setIsOpen(!isOpen)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-primary-fg rounded-full shadow-[0_0_20px_var(--primary)] flex items-center justify-center z-[100] border-2 border-background">
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }} className="fixed bottom-24 right-6 w-80 md:w-96 h-[500px] bg-card/95 backdrop-blur-xl border border-primary/50 rounded-lg shadow-2xl z-[100] flex flex-col overflow-hidden">
            <div className="p-3 border-b border-primary/30 bg-primary/10 flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" />
              <span className="text-xs font-mono font-bold text-primary tracking-widest">TACTICAL AI v2.0</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs" ref={scrollRef}>
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-2 rounded ${m.role === 'user' ? 'bg-primary text-primary-fg rounded-tr-none' : 'bg-secondary/10 text-secondary border border-secondary/30 rounded-tl-none'}`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && <div className="flex justify-start"><div className="bg-secondary/10 text-secondary p-2 rounded border border-secondary/30 animate-pulse">ANALYZING...</div></div>}
            </div>
            <div className="p-3 border-t border-primary/30 bg-background/50 flex gap-2">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Enter query..." className="flex-1 bg-background border border-primary/30 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-primary text-foreground" />
              <button onClick={handleSend} disabled={loading} className="p-2 bg-primary/20 hover:bg-primary/40 text-primary rounded border border-primary/50 transition-colors"><Send className="w-4 h-4" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
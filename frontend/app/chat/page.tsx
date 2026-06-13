'use client';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import SophieAvatar from '../../components/SophieAvatar';
import Spinner from '../../components/Spinner';
import { api, ChatMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';

const SUGGESTIONS = [
  'Comment utiliser le subjonctif ?',
  'Quelle est la différence entre "depuis" et "il y a" ?',
  'Peux-tu m\'aider à améliorer ma lettre de motivation ?',
  'Explique-moi les temps du passé en français',
];

export default function ChatPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim();
    if (!content || streaming) return;
    setInput('');

    const userMsg: ChatMessage = { role: 'user', content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setStreaming(true);

    const assistantMsg: ChatMessage = { role: 'assistant', content: '' };
    setMessages(m => [...m, assistantMsg]);

    await api.ai.chatStream(newMessages, (chunk) => {
      setMessages(m => {
        const updated = [...m];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: updated[updated.length - 1].content + chunk,
        };
        return updated;
      });
    });

    setStreaming(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex flex-col">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center gap-4">
          <button onClick={() => router.push('/dashboard')} className="text-slate-400 hover:text-indigo-600 transition-colors">← Dashboard</button>
          <div className="flex items-center gap-2">
            <SophieAvatar mood={streaming ? 'thinking' : 'idle'} size="sm" showMessage={false} />
            <div>
              <div className="font-bold text-slate-800 text-sm">Sophie · Tutrice IA</div>
              <div className="text-xs text-emerald-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {streaming ? 'En train d\'écrire...' : 'En ligne'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 space-y-4 overflow-y-auto">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-6 py-10"
          >
            <SophieAvatar mood="happy" size="md" showMessage={true} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
              {SUGGESTIONS.map((s) => (
                <motion.button
                  key={s}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => sendMessage(s)}
                  className="text-left text-sm bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all shadow-sm"
                >
                  {s}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {msg.role === 'assistant' && (
                <div className="flex-shrink-0">
                  <SophieAvatar
                    mood={streaming && i === messages.length - 1 ? 'thinking' : 'explain'}
                    size="sm"
                    showMessage={false}
                  />
                </div>
              )}
              <div
                className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
                  ${msg.role === 'user'
                    ? 'bg-gradient-to-r from-indigo-600 to-cyan-500 text-white rounded-tr-sm ml-auto'
                    : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm shadow-sm'
                  }`}
              >
                {msg.content}
                {streaming && i === messages.length - 1 && msg.role === 'assistant' && !msg.content && (
                  <span className="inline-flex gap-1 items-center">
                    <Spinner size={14} color="#6366f1" />
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white/80 backdrop-blur border-t border-slate-100 sticky bottom-0">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
            className="flex items-end gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-md focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all"
          >
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Pose une question à Sophie..."
              rows={1}
              disabled={streaming}
              className="flex-1 text-sm outline-none resize-none text-slate-700 placeholder-slate-400 bg-transparent"
              style={{ maxHeight: '120px' }}
            />
            <motion.button
              type="submit"
              disabled={streaming || !input.trim()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex-shrink-0 w-9 h-9 bg-gradient-to-r from-indigo-600 to-cyan-500 rounded-xl flex items-center justify-center text-white shadow disabled:opacity-40 transition-all"
            >
              {streaming ? <Spinner size={16} color="#fff" /> : <span className="text-base">↑</span>}
            </motion.button>
          </form>
          <p className="text-xs text-center text-slate-400 mt-2">Sophie est propulsée par Claude IA · Appuie sur Entrée pour envoyer</p>
        </div>
      </div>
    </div>
  );
}

// src/components/admin/ConversationsView.tsx
// Vista de Conversaciones del CRM. Conectada al chatbot via /api/* + Realtime
// de Supabase para refrescar mensajes y toggles en vivo.

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Instagram, Send, Search, Phone, Mail, MapPin, Calendar,
  Paperclip, Smile, Pause, Bot, User, CheckCheck,
  Home, Sparkles, PanelRightClose, PanelRightOpen, AlertTriangle,
  MessageCircle, Loader2,
} from 'lucide-react';
import {
  chatbotApi,
  type Channel,
  type Conversation,
  type ConversationDetail,
  type Message,
} from '@/lib/chatbotApi';
import { supabase } from '@/lib/supabase';

// ---------- Constantes ----------

const CHANNELS: Record<Channel, { label: string; color: string }> = {
  whatsapp:  { label: 'WhatsApp',  color: '#25D366' },
  instagram: { label: 'Instagram', color: '#E1306C' },
  messenger: { label: 'Messenger', color: '#0084FF' },
  telegram:  { label: 'Telegram',  color: '#27A7E7' },
};

const STAGES = ['nuevo', 'calificado', 'visita_agendada', 'visito', 'cerrado'];

const STAGE_LABEL: Record<string, string> = {
  nuevo: 'Nuevo',
  calificado: 'Calificado',
  visita_agendada: 'Cita agendada',
  visito: 'Visitó',
  cerrado: 'Cerrado',
};

const AVATAR_COLORS = [
  'bg-emerald-700', 'bg-indigo-700', 'bg-rose-700', 'bg-amber-700',
  'bg-sky-700', 'bg-violet-700', 'bg-fuchsia-700', 'bg-teal-700',
  'bg-orange-700', 'bg-cyan-700', 'bg-pink-700', 'bg-lime-700',
];

// ---------- Helpers ----------

function initials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function avatarIdx(chatId: string): number {
  let h = 0;
  for (let i = 0; i < chatId.length; i++) h = (h * 31 + chatId.charCodeAt(i)) | 0;
  return Math.abs(h) % AVATAR_COLORS.length;
}

function fmtTime(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const diffDays = Math.round((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return d.toLocaleDateString('es-MX', { weekday: 'short' });
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}

function fmtMoney(n?: number | null): string {
  if (n == null) return '—';
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);
}

// ---------- Atomos ----------

function ChannelBadge({ channel, size = 16 }: { channel: Channel; size?: number }) {
  const common = 'flex items-center justify-center rounded-full ring-2 ring-white dark:ring-zinc-900';
  if (channel === 'whatsapp') {
    return (
      <span className={common} style={{ width: size, height: size, background: '#25D366' }}>
        <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} fill="#fff">
          <path d="M17.4 14.4c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1-.7-.3-1.5-.7-2.3-1.5-.6-.5-1-1.2-1.2-1.4-.1-.2 0-.3.1-.4l.3-.4c.1-.1.2-.2.2-.4.1-.1 0-.3 0-.4s-.6-1.4-.8-2c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.2-.9.9-.9 2.2 0 1.3 1 2.5 1.1 2.7.1.2 1.9 2.9 4.6 4 .6.3 1.1.4 1.5.5.6.2 1.2.2 1.6.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.2zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.4 5L2 22l5.1-1.3c1.5.8 3.2 1.3 4.9 1.3 5.5 0 10-4.5 10-10S17.5 2 12 2z" />
        </svg>
      </span>
    );
  }
  if (channel === 'instagram') {
    return (
      <span className={common} style={{ width: size, height: size, background: 'linear-gradient(135deg,#FEDA77 0%,#F58529 30%,#DD2A7B 60%,#8134AF 100%)' }}>
        <Instagram size={size * 0.6} color="#fff" strokeWidth={2.4} />
      </span>
    );
  }
  if (channel === 'messenger') {
    return (
      <span className={common} style={{ width: size, height: size, background: '#0084FF' }}>
        <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} fill="#fff">
          <path d="M12 2C6.5 2 2 6.1 2 11.6c0 3.1 1.5 5.9 3.9 7.7V22l3.6-2c1 .3 2 .4 2.5.4 5.5 0 10-4.1 10-9.6S17.5 2 12 2zm1 12.8l-2.5-2.7-4.9 2.7 5.4-5.7 2.6 2.7 4.8-2.7-5.4 5.7z" />
        </svg>
      </span>
    );
  }
  return (
    <span className={common} style={{ width: size, height: size, background: '#27A7E7' }}>
      <Send size={size * 0.55} color="#fff" strokeWidth={2.4} style={{ transform: 'translate(-1px,0.5px) rotate(15deg)' }} />
    </span>
  );
}

function Avatar({ name, chatId, channel, size = 44 }: { name: string; chatId: string; channel: Channel; size?: number }) {
  const color = AVATAR_COLORS[avatarIdx(chatId)];
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className={`${color} rounded-full w-full h-full flex items-center justify-center text-white font-semibold`}
        style={{ fontSize: size * 0.36 }}
      >
        {initials(name)}
      </div>
      <div className="absolute -right-0.5 -bottom-0.5">
        <ChannelBadge channel={channel} size={Math.round(size * 0.42)} />
      </div>
    </div>
  );
}

function StageChip({ stage }: { stage: string }) {
  const map: Record<string, string> = {
    nuevo:           'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30',
    calificado:      'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30',
    visita_agendada: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
    visito:          'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-500/15 dark:text-fuchsia-300 dark:border-fuchsia-500/30',
    cerrado:         'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
  };
  return (
    <span className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border font-medium ${map[stage] || map.nuevo}`}>
      {STAGE_LABEL[stage] || stage}
    </span>
  );
}

function BotToggle({ on, busy, onChange }: { on: boolean; busy?: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      onClick={() => !busy && onChange(!on)}
      disabled={busy}
      className={`group relative flex items-center gap-3 pl-2 pr-4 py-1.5 rounded-full border transition-all duration-200 disabled:opacity-60
        ${on
          ? 'bg-emerald-500/10 border-emerald-500/40 hover:bg-emerald-500/15'
          : 'bg-amber-500/10 border-amber-500/40 hover:bg-amber-500/15'}`}
      aria-pressed={on}
    >
      <span className={`relative inline-flex w-11 h-6 rounded-full transition-colors ${on ? 'bg-emerald-500' : 'bg-zinc-500'}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-200 flex items-center justify-center ${on ? 'translate-x-5' : 'translate-x-0'}`}>
          {busy ? <Loader2 size={12} className="animate-spin text-zinc-600" /> :
            on ? <Bot size={12} className="text-emerald-600" strokeWidth={2.5} /> :
                 <User size={12} className="text-amber-600" strokeWidth={2.5} />}
        </span>
      </span>
      <span className="flex flex-col items-start leading-tight">
        <span className={`text-[11px] font-mono uppercase tracking-wider ${on ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
          Bot automático
        </span>
        <span className="text-sm font-semibold text-zinc-900 dark:text-white">
          {on ? 'Activo · respondiendo' : 'Desactivado · tú controlas'}
        </span>
      </span>
    </button>
  );
}

// ---------- Columna izquierda ----------

const FILTERS = [
  { id: 'all',       label: 'Todas' },
  { id: 'whatsapp',  label: 'WhatsApp' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'messenger', label: 'Messenger' },
  { id: 'telegram',  label: 'Telegram' },
  { id: 'botoff',    label: 'Bot apagado' },
  { id: 'unread',    label: 'No leídas' },
] as const;

type FilterId = typeof FILTERS[number]['id'];

function ConversationList({
  conversations, selectedId, onSelect, search, setSearch, filter, setFilter, loading,
}: {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  search: string;
  setSearch: (s: string) => void;
  filter: FilterId;
  setFilter: (f: FilterId) => void;
  loading: boolean;
}) {
  const filtered = useMemo(() => conversations.filter(c => {
    if (search) {
      const s = search.toLowerCase();
      if (!c.name.toLowerCase().includes(s) && !(c.telefono || '').includes(search)) return false;
    }
    if (filter === 'all') return true;
    if (filter === 'botoff') return !c.bot_enabled;
    if (filter === 'unread') return c.unread_count > 0;
    return c.channel === filter;
  }), [conversations, search, filter]);

  return (
    <aside className="h-full w-full flex flex-col border-r border-zinc-200/70 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-[1px_0_0_0_rgba(0,0,0,0.02)]">
      <div className="px-4 pt-5 pb-3">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">Conversaciones</h1>
      </div>
      <div className="px-4 pb-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o teléfono…"
            className="w-full pl-9 pr-3 py-2.5 text-sm rounded-2xl bg-zinc-100/80 dark:bg-zinc-800/60 border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 focus:bg-white dark:focus:bg-zinc-900 focus:shadow-sm outline-none transition text-zinc-900 dark:text-white placeholder:text-zinc-400"
          />
        </div>
      </div>
      <div className="px-4 pb-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-2.5 py-1 text-[12px] rounded-full border whitespace-nowrap transition-all
                ${filter === f.id
                  ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm dark:bg-white dark:text-zinc-900 dark:border-white'
                  : 'bg-transparent text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 hover:shadow-sm'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {loading && (
          <div className="text-center text-sm text-zinc-500 pt-10 flex items-center justify-center gap-2">
            <Loader2 className="animate-spin" size={14} /> Cargando…
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-center text-sm text-zinc-500 dark:text-zinc-400 pt-10">
            No hay conversaciones que coincidan.
          </div>
        )}
        {filtered.map(c => {
          const isActive = c.chat_id === selectedId;
          return (
            <button
              key={c.chat_id}
              onClick={() => onSelect(c.chat_id)}
              className={`w-full text-left rounded-2xl p-3 mb-1 flex gap-3 transition-all
                ${isActive
                  ? 'bg-zinc-900 dark:bg-zinc-800 shadow-md ring-1 ring-zinc-900/5 dark:ring-white/5'
                  : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:shadow-sm'}`}
            >
              <Avatar name={c.name} chatId={c.chat_id} channel={c.channel} size={44} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm font-semibold truncate ${isActive ? 'text-white' : 'text-zinc-900 dark:text-zinc-100'}`}>
                    {c.name}
                  </span>
                  <span className={`text-[11px] font-mono shrink-0 ${isActive ? 'text-zinc-300' : 'text-zinc-500 dark:text-zinc-400'}`}>
                    {fmtTime(c.last_at)}
                  </span>
                </div>
                <div className={`text-[11px] font-mono truncate ${isActive ? 'text-zinc-400' : 'text-zinc-500 dark:text-zinc-500'}`}>
                  {c.telefono || c.chat_id}
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className={`text-[13px] truncate ${isActive ? 'text-zinc-300' : 'text-zinc-600 dark:text-zinc-400'} ${c.unread_count > 0 && !isActive ? 'font-medium text-zinc-800 dark:text-zinc-200' : ''}`}>
                    {c.last_sender === 'advisor' ? '👤 ' : c.last_sender === 'bot' ? '🤖 ' : ''}{c.last_message}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!c.bot_enabled && (
                      <span title="Bot desactivado" className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500/20 text-amber-500">
                        <Pause size={9} strokeWidth={2.5} fill="currentColor" />
                      </span>
                    )}
                    {c.unread_count > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
                        {c.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

// ---------- Centro: mensajes ----------

function MessageBubble({ m, prevSender }: { m: Message; prevSender: string | null }) {
  const isIn = m.sender === 'user';
  const isBot = m.sender === 'bot';
  const bubbleClass = isIn
    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-tr-2xl rounded-br-2xl rounded-bl-2xl rounded-tl-md ring-1 ring-zinc-900/5 dark:ring-white/5'
    : isBot
      ? 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700/60 rounded-tl-2xl rounded-bl-2xl rounded-br-md rounded-tr-2xl'
      : 'bg-emerald-600 text-white rounded-tl-2xl rounded-bl-2xl rounded-br-md rounded-tr-2xl';
  const showLabel = prevSender !== m.sender;

  return (
    <div className={`flex ${isIn ? 'justify-start' : 'justify-end'} mb-2`}>
      <div className="max-w-[78%] md:max-w-[62%]">
        {showLabel && !isIn && (
          <div className="flex items-center gap-1.5 mb-1.5 justify-end">
            {isBot ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                <Bot size={11} strokeWidth={2.5} /> Bot
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                <User size={11} strokeWidth={2.5} /> Asesor · {m.advisor_name || 'Tú'}
              </span>
            )}
          </div>
        )}
        <div className={`px-3.5 py-2 text-[14px] shadow-[0_1px_2px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] whitespace-pre-wrap break-words ${bubbleClass}`}>
          {m.content}
          <div className={`text-[10px] mt-0.5 text-right ${isIn ? 'text-zinc-400' : isBot ? 'text-zinc-400' : 'text-emerald-100/80'}`}>
            {fmtTime(m.created_at)}
            {!isIn && <CheckCheck size={11} className="inline ml-1 -mt-0.5" strokeWidth={2.5} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function MessagesPane({ messages, loading }: { messages: Message[]; loading: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-10 py-6 bg-zinc-50 dark:bg-zinc-900">
      {loading && (
        <div className="text-center text-sm text-zinc-500 py-8 flex items-center justify-center gap-2">
          <Loader2 className="animate-spin" size={14} /> Cargando mensajes…
        </div>
      )}
      {!loading && messages.length === 0 && (
        <div className="text-center text-sm text-zinc-500 py-8">No hay mensajes en esta conversación.</div>
      )}
      {messages.map((m, i) => (
        <MessageBubble key={m.id} m={m} prevSender={i > 0 ? messages[i - 1].sender : null} />
      ))}
    </div>
  );
}

function Composer({ botOn, onSend, sending }: { botOn: boolean; onSend: (text: string) => void; sending: boolean }) {
  const [text, setText] = useState('');
  const send = () => {
    const t = text.trim();
    if (!t || botOn || sending) return;
    onSend(t);
    setText('');
  };
  return (
    <div className="border-t border-zinc-200 dark:border-zinc-800 px-4 md:px-6 py-3 bg-white dark:bg-zinc-950">
      {botOn && (
        <div className="mb-2 flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <div className="text-[12px] leading-snug">
            <span className="font-semibold">El bot responderá automáticamente.</span> Apaga el bot arriba para tomar control.
          </div>
        </div>
      )}
      <div className={`flex items-end gap-2 rounded-2xl border transition-all
        ${botOn
          ? 'bg-zinc-100/60 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 opacity-70'
          : 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 shadow-sm focus-within:border-emerald-500 focus-within:shadow-md'}`}>
        <button disabled={botOn} className="p-2.5 text-zinc-500 disabled:cursor-not-allowed">
          <Paperclip size={18} />
        </button>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          disabled={botOn || sending}
          placeholder={botOn ? 'Bot activo — apaga para escribir manualmente' : 'Escribe un mensaje…'}
          rows={1}
          className="flex-1 resize-none bg-transparent outline-none text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 py-3 max-h-32"
        />
        <button disabled={botOn} className="p-2.5 text-zinc-500 disabled:cursor-not-allowed">
          <Smile size={18} />
        </button>
        <button
          onClick={send}
          disabled={botOn || !text.trim() || sending}
          className={`m-1 px-3 py-2 rounded-xl flex items-center gap-1.5 text-sm font-semibold transition-all
            ${botOn || !text.trim() || sending
              ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm hover:shadow-md'}`}
        >
          {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} strokeWidth={2.5} />}
          Enviar
        </button>
      </div>
      <div className="text-[10px] font-mono text-zinc-400 mt-1.5 px-1">
        Enter para enviar · Shift+Enter para salto de línea
      </div>
    </div>
  );
}

function ConversationPane({
  conversation, messages, loadingMessages, onToggleBot, onSend, sending, onOpenPanel, panelOpen, togglingBot,
}: {
  conversation: Conversation;
  messages: Message[];
  loadingMessages: boolean;
  onToggleBot: (next: boolean) => void;
  onSend: (text: string) => void;
  sending: boolean;
  onOpenPanel: () => void;
  panelOpen: boolean;
  togglingBot: boolean;
}) {
  const botOn = conversation.bot_enabled;
  return (
    <section className="h-full flex flex-col bg-white dark:bg-zinc-950">
      <header className={`px-4 md:px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 transition-colors duration-300 ${botOn ? '' : 'bg-amber-500/[0.04] dark:bg-amber-500/[0.06]'}`}>
        <div className="flex items-center gap-3">
          <Avatar name={conversation.name} chatId={conversation.chat_id} channel={conversation.channel} size={42} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-semibold text-zinc-900 dark:text-white truncate">{conversation.name}</h2>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: CHANNELS[conversation.channel].color }} />
                {CHANNELS[conversation.channel].label}
              </span>
            </div>
            <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
              {conversation.telefono || conversation.chat_id} {conversation.etapa_seguimiento && `· ${STAGE_LABEL[conversation.etapa_seguimiento] || conversation.etapa_seguimiento}`}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BotToggle on={botOn} busy={togglingBot} onChange={onToggleBot} />
            <button onClick={onOpenPanel} title={panelOpen ? 'Ocultar perfil' : 'Mostrar perfil'} className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:shadow-sm text-zinc-500 transition-all">
              {panelOpen ? <PanelRightClose size={17} /> : <PanelRightOpen size={17} />}
            </button>
          </div>
        </div>
      </header>
      <MessagesPane messages={messages} loading={loadingMessages} />
      <Composer botOn={botOn} onSend={onSend} sending={sending} />
    </section>
  );
}

// ---------- Panel derecho ----------

function Section({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{title}</h3>
        {actions}
      </div>
      {children}
    </div>
  );
}

function Row({ icon: Icon, label, value, mono }: { icon: any; label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <Icon size={14} className="text-zinc-400 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">{label}</div>
        <div className={`text-[13px] text-zinc-900 dark:text-zinc-100 truncate ${mono ? 'font-mono' : ''}`}>{value || '—'}</div>
      </div>
    </div>
  );
}

// Fila editable inline. Click → input. Blur o Enter → guarda.
function EditableRow({
  icon: Icon,
  label,
  value,
  onSave,
  mono,
  type = 'text',
  placeholder = '—',
  options,
}: {
  icon: any;
  label: string;
  value: string | number | null | undefined;
  onSave: (next: string | number | null) => void;
  mono?: boolean;
  type?: 'text' | 'number' | 'email';
  placeholder?: string;
  options?: { value: string; label: string }[]; // si se pasa, render select
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(value == null ? '' : String(value));
  useEffect(() => { setDraft(value == null ? '' : String(value)); }, [value]);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    const cur = value == null ? '' : String(value);
    if (trimmed === cur) return;
    if (trimmed === '') { onSave(null); return; }
    if (type === 'number') {
      const n = Number(trimmed.replace(/[, $]/g, ''));
      if (Number.isFinite(n)) onSave(n);
      return;
    }
    onSave(trimmed);
  };

  const display = value == null || value === '' ? placeholder : String(value);

  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <Icon size={14} className="text-zinc-400 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">{label}</div>
        {editing ? (
          options ? (
            <select
              autoFocus
              value={draft}
              onChange={e => { setDraft(e.target.value); }}
              onBlur={commit}
              className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded px-1.5 py-0.5 text-[13px] text-zinc-900 dark:text-zinc-100 outline-none"
            >
              <option value="">—</option>
              {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : (
            <input
              autoFocus
              type={type === 'number' ? 'text' : type}
              inputMode={type === 'number' ? 'numeric' : undefined}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); commit(); }
                if (e.key === 'Escape') { setDraft(value == null ? '' : String(value)); setEditing(false); }
              }}
              className={`w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded px-1.5 py-0.5 text-[13px] text-zinc-900 dark:text-zinc-100 outline-none ${mono ? 'font-mono' : ''}`}
            />
          )
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            title="Click para editar"
            className={`text-left w-full text-[13px] truncate hover:bg-zinc-100 dark:hover:bg-zinc-800/60 rounded px-1 -mx-1 transition-colors ${mono ? 'font-mono' : ''} ${value == null || value === '' ? 'text-zinc-400' : 'text-zinc-900 dark:text-zinc-100'}`}
          >
            {display}
          </button>
        )}
      </div>
    </div>
  );
}

function ContactPanel({ conversation, detail, onUpdateField }: {
  conversation: Conversation;
  detail: ConversationDetail | null;
  onUpdateField: (patch: Record<string, any>) => void;
}) {
  const c = conversation;
  const stage = c.etapa_seguimiento || 'nuevo';
  const propiedad = detail?.propiedad_interesada;
  const notes = (detail?.contacto?.notas_internas as string) || '';
  const [draftNotes, setDraftNotes] = useState(notes);
  useEffect(() => { setDraftNotes(notes); }, [notes]);

  const saveNotes = useCallback(() => {
    if (draftNotes !== notes) onUpdateField({ notas_internas: draftNotes });
  }, [draftNotes, notes, onUpdateField]);

  return (
    <aside className="h-full w-full flex flex-col border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-y-auto">
      <div className="px-5 pt-6 pb-4 flex flex-col items-center text-center border-b border-zinc-200 dark:border-zinc-800">
        <Avatar name={c.name} chatId={c.chat_id} channel={c.channel} size={72} />
        <h2 className="mt-3 text-[17px] font-semibold text-zinc-900 dark:text-white">{c.name}</h2>
        <div className="text-[12px] font-mono text-zinc-500 dark:text-zinc-400">{c.telefono || c.chat_id}</div>
        <div className="mt-2"><StageChip stage={stage} /></div>
      </div>
      <Section title="Datos de contacto">
        <EditableRow icon={Phone} label="Teléfono" value={c.telefono} mono
          onSave={v => onUpdateField({ telefono: v })} placeholder="Sin teléfono" />
        <EditableRow icon={Mail} label="Email" value={c.correo} type="email"
          onSave={v => onUpdateField({ correo: v })} placeholder="Sin email" />
        <Row icon={MessageCircle} label="Canal" value={CHANNELS[c.channel].label} />
        <Row icon={Calendar} label="Última actividad" value={fmtTime(c.last_at)} />
      </Section>
      <Section title="Información de prospecto">
        <EditableRow icon={MapPin} label="Zona de interés" value={c.zona_interes}
          onSave={v => onUpdateField({ zona_interes: v })} placeholder="Sin definir" />
        <EditableRow icon={Home} label="Presupuesto máx." value={c.presupuesto_max ?? null} mono type="number"
          onSave={v => onUpdateField({ presupuesto_max: v })} placeholder="Sin definir" />
        <EditableRow icon={Sparkles} label="Tipo de crédito" value={c.tipo_credito}
          onSave={v => onUpdateField({ tipo_credito: v })} placeholder="Sin definir"
          options={[
            { value: 'infonavit', label: 'Infonavit' },
            { value: 'fovissste', label: 'Fovissste' },
            { value: 'bancario', label: 'Bancario' },
            { value: 'contado', label: 'Contado' },
            { value: 'otro', label: 'Otro' },
          ]} />
        <div className="mt-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1.5">Etapa de seguimiento</div>
          <div className="flex gap-1">
            {STAGES.map((s, i) => {
              const cur = STAGES.indexOf(stage);
              const done = i <= cur;
              return (
                <button
                  key={s}
                  onClick={() => onUpdateField({ etapa_seguimiento: s })}
                  className="flex-1 flex flex-col items-center gap-1 group"
                  title={STAGE_LABEL[s]}
                >
                  <div className={`w-full h-1 rounded-full transition-colors ${done ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-800 group-hover:bg-zinc-300 dark:group-hover:bg-zinc-700'}`} />
                  <span className={`text-[9px] font-mono uppercase text-center leading-tight ${done ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'}`}>
                    {STAGE_LABEL[s].split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </Section>
      {propiedad && (
        <Section title="Propiedad de interés">
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-2.5 bg-zinc-50 dark:bg-zinc-900/50">
            <div className="text-[12px] font-semibold text-zinc-900 dark:text-zinc-100">{propiedad.nombre}</div>
            <div className="text-[10px] font-mono text-zinc-500">
              {propiedad.recamaras} rec · {propiedad.banos} baños · {propiedad.metros_cuadrados} m²
            </div>
            <div className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400">{fmtMoney(Number(propiedad.precio))}</div>
          </div>
        </Section>
      )}
      <Section title="Notas internas">
        <textarea
          value={draftNotes}
          onChange={e => setDraftNotes(e.target.value)}
          onBlur={saveNotes}
          placeholder="Notas visibles solo para el equipo…"
          rows={4}
          className="w-full resize-none rounded-lg bg-zinc-100 dark:bg-zinc-800/60 border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 focus:bg-white dark:focus:bg-zinc-900 outline-none p-2.5 text-[12px] text-zinc-900 dark:text-zinc-100"
        />
        <div className="text-[10px] font-mono text-zinc-400 mt-1">
          Asesor asignado: <span className="text-zinc-600 dark:text-zinc-300">{c.asesor_asignado || '—'}</span>
        </div>
      </Section>
    </aside>
  );
}

// ---------- Vista principal ----------

export default function ConversationsView() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterId>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [togglingBot, setTogglingBot] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);

  const fetchList = useCallback(async () => {
    try {
      const r = await chatbotApi.listConversations();
      setConversations(r.items);
      setSelectedId(prev => prev ?? r.items[0]?.chat_id ?? null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingList(false);
    }
  }, []);

  const fetchMessages = useCallback(async (id: string) => {
    setLoadingMessages(true);
    try {
      const [m, d] = await Promise.all([
        chatbotApi.listMessages(id),
        chatbotApi.getConversation(id),
      ]);
      setMessages(m.items);
      setDetail(d);
      chatbotApi.markRead(id).catch(() => undefined);
      // Reset unread localmente sin esperar al refetch
      setConversations(cs => cs.map(c => c.chat_id === id ? { ...c, unread_count: 0 } : c));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);
  useEffect(() => { if (selectedId) fetchMessages(selectedId); }, [selectedId, fetchMessages]);

  // Realtime: nuevos mensajes y cambios de bot_settings
  useEffect(() => {
    const ch = supabase
      .channel('crm-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'n8n_chat_histories' }, (payload: any) => {
        const sid = payload.new?.session_id;
        if (!sid) return;
        // Si es la conversación abierta, append in-place
        if (sid === selectedId) {
          fetchMessages(sid);
        } else {
          // Refresca la lista para actualizar último mensaje y unread
          fetchList();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bot_settings' }, () => fetchList())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contactos' }, () => {
        fetchList();
        if (selectedId) chatbotApi.getConversation(selectedId).then(setDetail).catch(() => undefined);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selectedId, fetchList, fetchMessages]);

  const selected = useMemo(
    () => conversations.find(c => c.chat_id === selectedId) || null,
    [conversations, selectedId],
  );

  const handleToggleBot = async (next: boolean) => {
    if (!selected) return;
    setTogglingBot(true);
    // Update optimista
    setConversations(cs => cs.map(c => c.chat_id === selected.chat_id ? { ...c, bot_enabled: next } : c));
    try {
      await chatbotApi.patchConversation(selected.chat_id, { bot_enabled: next });
    } catch (e) {
      console.error(e);
      setConversations(cs => cs.map(c => c.chat_id === selected.chat_id ? { ...c, bot_enabled: !next } : c));
    } finally {
      setTogglingBot(false);
    }
  };

  const handleSend = async (text: string) => {
    if (!selected) return;
    setSending(true);
    try {
      await chatbotApi.sendMessage(selected.chat_id, text /*, advisorName */);
      // Realtime traerá el mensaje, pero refrescamos por si acaso
      fetchMessages(selected.chat_id);
    } catch (e) {
      console.error(e);
      alert(`Error enviando: ${(e as Error).message}`);
    } finally {
      setSending(false);
    }
  };

  const handleUpdateField = async (patch: Record<string, any>) => {
    if (!selected) return;
    try {
      await chatbotApi.patchConversation(selected.chat_id, patch);
      fetchList();
      chatbotApi.getConversation(selected.chat_id).then(setDetail).catch(() => undefined);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] flex bg-zinc-50 dark:bg-zinc-900">
      {/* Izquierda */}
      <div className="w-[320px] shrink-0 hidden md:block">
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          onSelect={setSelectedId}
          search={search}
          setSearch={setSearch}
          filter={filter}
          setFilter={setFilter}
          loading={loadingList}
        />
      </div>
      {/* Centro */}
      <div className="flex-1 min-w-0">
        {selected ? (
          <ConversationPane
            conversation={selected}
            messages={messages}
            loadingMessages={loadingMessages}
            onToggleBot={handleToggleBot}
            onSend={handleSend}
            sending={sending}
            onOpenPanel={() => setPanelOpen(o => !o)}
            panelOpen={panelOpen}
            togglingBot={togglingBot}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-zinc-500">
            Selecciona una conversación
          </div>
        )}
      </div>
      {/* Derecha */}
      {panelOpen && selected && (
        <div className="w-[300px] shrink-0 hidden lg:block">
          <ContactPanel conversation={selected} detail={detail} onUpdateField={handleUpdateField} />
        </div>
      )}
    </div>
  );
}

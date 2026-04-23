// src/lib/chatbotApi.ts
// Cliente para la API REST del chatbot (FastAPI en EasyPanel).
// Todas las llamadas usan el header X-API-Key. Las URLs y la key vienen de
// VITE_CHATBOT_API_URL / VITE_CHATBOT_API_KEY (configuradas en Vercel y .env.local).

const BASE = import.meta.env.VITE_CHATBOT_API_URL as string;
const KEY = import.meta.env.VITE_CHATBOT_API_KEY as string;

if (!BASE || !KEY) {
  // eslint-disable-next-line no-console
  console.warn(
    'chatbotApi: VITE_CHATBOT_API_URL o VITE_CHATBOT_API_KEY no estan configurados.',
  );
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': KEY,
      ...(init.headers || {}),
    },
  });
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`${r.status} ${r.statusText}: ${body.slice(0, 200)}`);
  }
  return r.json() as Promise<T>;
}

export type Channel = 'whatsapp' | 'instagram' | 'messenger' | 'telegram';
export type Sender = 'user' | 'bot' | 'advisor';

export type Conversation = {
  chat_id: string;
  channel: Channel;
  channel_internal: 'manychat' | 'telegram';
  bot_enabled: boolean;
  name: string;
  telefono?: string | null;
  correo?: string | null;
  etapa_seguimiento?: string | null;
  zona_interes?: string | null;
  presupuesto_max?: number | null;
  tipo_credito?: string | null;
  asesor_asignado?: string | null;
  last_message: string;
  last_sender: Sender;
  last_at: string;
  unread_count: number;
};

export type Message = {
  id: number;
  sender: Sender;
  advisor_name?: string | null;
  content: string;
  created_at: string;
};

export type ConversationDetail = {
  chat_id: string;
  channel: Channel;
  channel_internal: 'manychat' | 'telegram';
  bot_enabled: boolean;
  last_read_at?: string | null;
  contacto: Record<string, any> | null;
  propiedad_interesada: Record<string, any> | null;
  last_message_at?: string | null;
};

export type ConversationPatch = {
  bot_enabled?: boolean;
  etapa_seguimiento?: string;
  asesor_asignado?: string;
  zona_interes?: string | null;
  tipo_credito?: string | null;
  presupuesto_max?: number | null;
  notas_internas?: string;
  nombre?: string | null;
  telefono?: string | null;
  correo?: string | null;
};

export const chatbotApi = {
  listConversations: (
    params: { search?: string; channel?: string; filter?: string } = {},
  ) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v) q.set(k, String(v));
    });
    return call<{ items: Conversation[]; total: number }>(
      `/api/conversations?${q.toString()}`,
    );
  },

  getConversation: (chatId: string) =>
    call<ConversationDetail>(`/api/conversations/${encodeURIComponent(chatId)}`),

  listMessages: (chatId: string, limit = 100) =>
    call<{ items: Message[] }>(
      `/api/conversations/${encodeURIComponent(chatId)}/messages?limit=${limit}`,
    ),

  patchConversation: (chatId: string, body: ConversationPatch) =>
    call<{ ok: boolean }>(`/api/conversations/${encodeURIComponent(chatId)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  sendMessage: (chatId: string, text: string, advisor_name?: string) =>
    call<{ ok: boolean }>(
      `/api/conversations/${encodeURIComponent(chatId)}/send`,
      { method: 'POST', body: JSON.stringify({ text, advisor_name }) },
    ),

  markRead: (chatId: string) =>
    call<{ ok: boolean }>(
      `/api/conversations/${encodeURIComponent(chatId)}/read`,
      { method: 'POST' },
    ),
};

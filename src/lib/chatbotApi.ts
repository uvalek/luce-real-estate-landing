// src/lib/chatbotApi.ts
// Cliente para la API REST del chatbot (FastAPI en EasyPanel).
//
// SEGURIDAD (ver SECURITY_AUDIT.md, hallazgo CRITICO #1):
// Ya NO llamamos directo a la FastAPI con una X-API-Key incrustada en el
// bundle. En su lugar llamamos a la Edge Function `chatbot-proxy` enviando el
// JWT de la sesion del admin (Authorization: Bearer ...). El proxy verifica el
// JWT en el servidor y solo entonces reenvia la peticion a la FastAPI con la
// X-API-Key del lado servidor. Asi la key del chatbot nunca llega al navegador.

import { supabase } from '@/lib/supabase';

const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  'https://lrxwvyilfobwyndikqpq.supabase.co';
const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '';

// El proxy vive en /functions/v1/chatbot-proxy y reenvia todo lo que venga
// despues (ej. /api/conversations) tal cual a la FastAPI.
const PROXY = `${SUPABASE_URL}/functions/v1/chatbot-proxy`;

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token ?? '';

  const r = await fetch(`${PROXY}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      // El gateway de Supabase (verify_jwt) acepta el JWT del usuario; el proxy
      // tambien lo re-verifica. apikey satisface al gateway en el preflight.
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`${r.status} ${r.statusText}: ${body.slice(0, 200)}`);
  }
  return r.json() as Promise<T>;
}

export type Channel = 'whatsapp' | 'instagram' | 'messenger' | 'telegram' | 'webchat';
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

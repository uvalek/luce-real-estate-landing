# Auditoría de Seguridad — LUCE Real Estate

**Fecha:** 2026-05-29
**Stack:** Vite 5 · React 18 · TypeScript · react-router-dom 6 · Supabase · Vercel (SPA estática)
**Rama de trabajo:** `security/audit-fixes`
**Proyecto Supabase auditado:** `lrxwvyilfobwyndikqpq`

> **Léeme primero (en lenguaje simple).** Tu página es una *SPA*: todo el código
> que está en `/src` se descarga al navegador del visitante. No hay "servidor
> secreto" en la página donde esconder llaves. Por eso la seguridad real vive en
> **Supabase** (las reglas RLS de tus tablas) y en la **configuración del
> hosting** (headers de Vercel). Esta auditoría arregló lo que se puede arreglar
> en el código y te deja una lista clara de lo que tienes que tocar tú en los
> paneles de Supabase y Vercel.

---

## 1. Resumen ejecutivo

| Severidad | Cantidad | Estado |
|-----------|----------|--------|
| 🔴 Crítica | 1 | Mitigación entregada — requiere acción tuya (rotar key + desplegar proxy) |
| 🟠 Alta | 2 | 1 arreglada en código · 1 acción manual (Vercel headers, pendiente dominio) |
| 🟡 Media | 4 | Arregladas en código / SQL listo para aplicar |
| 🟢 Baja | 5 | Arregladas / documentadas |

**Lo bueno que ya estaba bien:**
- ✅ Las **11 tablas** de Supabase tienen RLS activado (verificado con el linter oficial).
- ✅ No hay secretos hardcodeados en `/src` ni en el historial de git.
- ✅ La `service_role` key NO está en ningún lado del repo (solo se usa server-side en la Edge Function `create-admin-user`).
- ✅ Casi no hay superficie de XSS (un solo `dangerouslySetInnerHTML`, y es seguro).

---

## 2. Top 5 cosas más importantes

1. **🔴 La API key del chatbot viaja al navegador** (`VITE_CHATBOT_API_KEY`). Cualquiera puede extraerla del sitio publicado y usar tu API. → Entregué un proxy (Edge Function) + plan de migración. **Tienes que rotar la key y desplegarlo.**
2. **🟠 Faltaban TODOS los headers de seguridad en Vercel** (CSP, HSTS, anti-clickjacking, etc.). → `vercel.json` reforzado (pendiente tu dominio del chatbot para el CSP).
3. **🟡 16 vulnerabilidades de dependencias** corregidas con `npm audit fix` (quedan 2 solo de entorno de desarrollo).
4. **🟡 Source maps de producción** podían exponer tu código fuente → desactivados.
5. **🟡 Config de Supabase hardcodeada** → movida a variables de entorno con auth explícita y un solo lugar para el "project ref".

---

## 3. Hallazgos detallados

### 🔴 CRÍTICO #1 — API key del chatbot expuesta en el bundle del cliente
- **Archivo:** `src/lib/chatbotApi.ts` (líneas 6–7, 16–30)
- **Qué pasa:** el cliente llama directo a la API FastAPI del chatbot mandando
  `X-API-Key: VITE_CHATBOT_API_KEY`. En Vite, toda variable `VITE_*` se
  **incrusta en el JavaScript** que Vercel sirve. Cualquier visitante puede
  abrir las herramientas de desarrollador (o descargar el `.js`) y leer la key.
  Con esa key puede: listar TODAS las conversaciones, leer datos de contactos,
  enviar mensajes en tu nombre y modificar leads.
- **Aclaración importante:** la key **NO está filtrada en git** (nunca se
  hardcodeó; solo se referencia la variable). El problema es que se publica en
  el bundle al hacer build. Aun así, debe considerarse **comprometida** porque
  ha estado sirviéndose al público.
- **Qué hice:**
  - Creé `supabase/functions/chatbot-proxy/index.ts`: un proxy que (1) verifica
    el JWT de Supabase del admin, (2) reenvía la petición a tu FastAPI poniendo
    la `X-API-Key` **del lado servidor** (desde `Deno.env`, nunca expuesta).
  - **NO cambié todavía el cliente** para no romper el CRM en producción antes
    de que el proxy esté desplegado. El "cutover" es manual (abajo).
- **Acción tuya (obligatoria):** ver §6 "Cutover del chatbot" + rotar la key.

---

### 🟠 ALTO #1 — Faltaban headers de seguridad HTTP en Vercel
- **Archivo:** `vercel.json`
- **Qué pasaba:** `vercel.json` solo tenía el rewrite de SPA. Sin
  `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`,
  etc., el sitio es más vulnerable a clickjacking, sniffing de tipo MIME y XSS.
- **Qué hice / haré:** reforcé `vercel.json` con HSTS, X-Frame-Options DENY,
  X-Content-Type-Options, Referrer-Policy y Permissions-Policy restrictivo, más
  un CSP a la medida (Supabase + Google Fonts + imágenes).
  > ⏳ **Pendiente:** el CSP necesita el dominio de tu API del chatbot en
  > `connect-src` o el CRM dejará de cargar. En cuanto me lo pases, cierro este
  > punto. (Ver el commit de `vercel.json`.)

### 🟠 ALTO #2 — Vulnerabilidades de dependencias (resuelto)
- **Qué pasaba:** `npm audit` reportaba 18 vulnerabilidades (9 altas).
- **Qué hice:** `npm audit fix` resolvió 16 (postcss, rollup, ws, yaml, etc.).
- **Quedan 2** (moderadas, `esbuild`/`vite`): son del **servidor de desarrollo
  local**, NO se publican a producción. Arreglarlas exige subir a Vite 8 (cambio
  mayor que rompería el build). **Decisión:** no hacerlo ahora; riesgo bajo.

---

### 🟡 MEDIO #1 — Config de Supabase hardcodeada (resuelto)
- **Archivos:** `src/lib/supabase.ts`, `src/lib/uploadImage.ts`
- **Nota:** la URL y la **anon key** son **públicas por diseño** (no es una
  fuga). Pero estaban duplicadas y hardcodeadas.
- **Qué hice:** ahora se leen de `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
  con *fallback* a los valores actuales (para no romper nada). Un solo lugar
  define el "project ref". Añadí auth explícita (`persistSession`,
  `autoRefreshToken`, `detectSessionInUrl`).

### 🟡 MEDIO #2 — Source maps de producción (resuelto)
- **Archivo:** `vite.config.ts`
- **Qué hice:** `build.sourcemap` ahora es `true` solo en desarrollo. En
  producción NO se publican source maps (tu código fuente legible no queda
  expuesto en el navegador).

### 🟡 MEDIO #3 — `search_path` mutable en funciones de Postgres (SQL listo)
- **Detectado por el advisor de Supabase.** Funciones: `match_documents`,
  `buscar_propiedades`.
- **Qué hice:** SQL listo en `supabase/security-policies.sql` (Hallazgo 1).
  **Acción tuya:** correrlo en el SQL Editor.

### 🟡 MEDIO #4 — Bucket público permite listar todos los archivos (SQL listo)
- **Bucket:** `fotospropiedades`. El advisor detectó una política SELECT amplia
  que permite **enumerar todos los archivos**. Las URLs públicas siguen
  funcionando sin esa política.
- **Qué hice:** SQL listo en `supabase/security-policies.sql` (Hallazgo 2).

---

### 🟢 BAJO #1 — Guard de rutas centralizado (resuelto)
- **Archivos:** nuevo `src/components/ProtectedRoute.tsx`, `src/App.tsx`
- Antes el guard estaba inline en `AdminDashboard`. Ahora `/admin` está envuelto
  en `<ProtectedRoute>`. **Recuerda:** esto es solo UX. La seguridad real es RLS.

### 🟢 BAJO #2 — `.gitignore` no ignoraba `.env` explícitamente (resuelto)
- Ahora ignora `.env` y `.env.*` (excepto `.env.example`).

### 🟢 BAJO #3 — Faltaba `.env.example` (resuelto)
- Creado, documentando qué variables son públicas y cuáles nunca deben serlo.

### 🟢 BAJO #4 — Políticas RLS de escritura "siempre verdaderas" (documentado)
- El advisor marca que cualquier usuario **autenticado** puede escribir/borrar
  en `propiedades`, `contactos`, `crm_atributo_opciones` y borrar en
  `bot_settings`, `n8n_chat_histories`. **Es aceptable hoy** porque todos los
  usuarios son personal de confianza (creados por el owner; no hay registro
  público). Si más adelante quieres que solo el `owner` pueda borrar, hay SQL de
  ejemplo en `supabase/security-policies.sql` (Hallazgo 3).

### 🟢 BAJO #5 — `dangerouslySetInnerHTML` revisado (seguro)
- **Archivo:** `src/components/ui/chart.tsx` (línea 70). Solo inyecta variables
  CSS de color definidas por el desarrollador, no contenido del usuario.
  **No es vulnerable.** No requiere acción.

---

## 4. XSS, inputs y almacenamiento local (revisado)
- **`dangerouslySetInnerHTML`:** 1 uso, seguro (arriba).
- **`eval` / `new Function`:** ninguno. ✅
- **`localStorage`:** solo guarda anchos de columnas del CRM (no sensible). El
  token de sesión lo maneja Supabase en localStorage (estándar). ✅
- **Mensajes de login:** `AdminLogin.tsx` ya usa un mensaje genérico
  ("Credenciales incorrectas"), evitando *user enumeration*. ✅
- **Formulario público (`LeadForm.tsx`):** hoy solo hace `console.log`, no envía
  datos a ningún lado. Si lo conectas a la tabla `leads`, ver §3 Hallazgo 4 del
  SQL (política de INSERT solo para `anon`, sin SELECT).

---

## 5. Auditoría de RLS — estado real (verificado con el linter de Supabase)

Tablas detectadas usadas por el frontend: **`propiedades`** (lectura pública +
escritura admin), **`contactos`** y **`crm_atributo_opciones`** (solo admin).

| Tabla | RLS activo | Notas |
|-------|:----------:|-------|
| propiedades | ✅ | Lectura pública OK; escritura = cualquier autenticado |
| contactos | ✅ | Solo autenticados (datos personales — bien) |
| crm_atributo_opciones | ✅ | Solo autenticados |
| documents / documents_privado | ✅ | RLS sin políticas = solo service_role (chatbot RAG) |
| n8n_chat_histories / bot_settings / channel_flags | ✅ | Usadas por el chatbot/n8n |
| leads / visitas / message_buffer | ✅ | Vacías; sin políticas (deny-all) |

**Conclusión:** ninguna tabla está abierta al público sin control. Los ajustes
recomendados (search_path, listado de bucket, endurecer borrado) están en
`supabase/security-policies.sql`.

---

## 6. ✅ Acciones manuales pendientes (tú, en los paneles)

### A. Cutover del chatbot (cierra el CRÍTICO #1)
1. En EasyPanel, **genera una nueva API key** para la FastAPI (rota la vieja).
2. Guarda los secretos en Supabase (Edge Functions):
   ```
   supabase secrets set CHATBOT_API_URL="https://TU-CHATBOT.easypanel.host"
   supabase secrets set CHATBOT_API_KEY="la-key-NUEVA"
   supabase secrets set ALLOWED_ORIGIN="https://tu-dominio.vercel.app"
   ```
3. Despliega el proxy: `supabase functions deploy chatbot-proxy`
4. Cambia `src/lib/chatbotApi.ts` para que `BASE` apunte al proxy y mande el JWT
   en vez de la `X-API-Key`. Snippet:
   ```ts
   import { supabase } from "@/lib/supabase";
   const PROXY = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chatbot-proxy`;
   async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
     const { data: { session } } = await supabase.auth.getSession();
     const r = await fetch(`${PROXY}${path}`, {
       ...init,
       headers: {
         "Content-Type": "application/json",
         Authorization: `Bearer ${session?.access_token ?? ""}`,
         ...(init.headers || {}),
       },
     });
     if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
     return r.json() as Promise<T>;
   }
   ```
5. **Borra `VITE_CHATBOT_API_KEY` de Vercel** (ya no se usa en el cliente).

### B. Supabase Dashboard
- [ ] Correr `supabase/security-policies.sql` (Hallazgos 1 y 2) en el SQL Editor.
- [ ] **Auth → Providers:** activar **"Leaked password protection"** (HaveIBeenPwned). *(advisor WARN)*
- [ ] **Auth → URL Configuration:** Site URL y Redirect URLs solo con tus dominios reales.
- [ ] **Auth → Rate Limits:** revisar límites de login/signup/recovery.
- [ ] **Auth → confirmar verificación de email** activada.
- [ ] (Opcional) Endurecer borrado a solo `owner` (Hallazgo 3 del SQL).
- [ ] Volver a correr **Advisors → Security** y confirmar que bajaron los WARN.

### C. Vercel Dashboard
- [ ] Pasarme el **dominio del chatbot** para cerrar el CSP de `vercel.json`.
- [ ] Confirmar **HTTPS forzado** en el dominio.
- [ ] Variables de entorno: dejar solo las `VITE_*` realmente públicas
      (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). Quitar
      `VITE_CHATBOT_API_KEY` tras el cutover.
- [ ] Revisar logs de build recientes (que no se filtren secretos).

### D. Rotación de keys
- [ ] **Chatbot FastAPI API key** → rotar en EasyPanel (estuvo en el bundle público).
- [ ] **Supabase anon key** → NO requiere rotación (es pública por diseño).
- [ ] **Supabase service_role** → solo rotar si alguna vez la pusiste en el cliente
      o en una `VITE_*` (no se encontró rastro de ello).

---

## 7. Recomendaciones a futuro
- **Monitoreo de errores:** integrar Sentry (o similar) para ver errores en producción.
- **Conectar `LeadForm`** a la tabla `leads` con política de INSERT-only para `anon`.
- **Endurecer RLS por rol** (owner vs agente) cuando crezca el equipo.
- **Pentest profesional** cuando el negocio escale.
- **Revisar `npm audit` periódicamente** y subir a Vite 8 en una ventana planificada.

---

## 8. Cambios por archivo (en esta rama)
| Archivo | Cambio |
|---------|--------|
| `src/lib/supabase.ts` | Env vars + auth explícita + singleton documentado |
| `src/lib/uploadImage.ts` | URL de storage desde env var (sin hardcode duplicado) |
| `vite.config.ts` | `build.sourcemap` solo en dev |
| `.gitignore` | Ignora `.env` / `.env.*` (salvo `.env.example`) |
| `.env.example` | Nuevo — documenta variables públicas vs. secretas |
| `package-lock.json` | `npm audit fix` (16 vulns resueltas) |
| `src/components/ProtectedRoute.tsx` | Nuevo — guard de ruta centralizado |
| `src/App.tsx` | `/admin` envuelto en `<ProtectedRoute>` |
| `supabase/functions/chatbot-proxy/index.ts` | Nuevo — proxy JWT para la API del chatbot |
| `supabase/security-policies.sql` | Nuevo — hardening SQL basado en el advisor real |
| `vercel.json` | Headers de seguridad + CSP (pendiente dominio chatbot) |
| `SECURITY_AUDIT.md` | Este informe |

-- ============================================================================
-- LUCE Real Estate — Hardening de seguridad de la base de datos (Supabase)
-- ----------------------------------------------------------------------------
-- Este archivo NO es un template genérico: refleja el ESTADO REAL del proyecto
-- lrxwvyilfobwyndikqpq, auditado el 2026-05-29 con el linter de seguridad de
-- Supabase. Cada bloque corresponde a un hallazgo concreto del advisor.
--
-- CÓMO USAR: Dashboard de Supabase → SQL Editor → pega el bloque que quieras
-- aplicar → Run. Lee los comentarios: algunos bloques son DECISIONES de negocio.
--
-- ESTADO BASE (bueno): las 11 tablas del esquema public YA tienen RLS activado.
--   documents, documents_privado, n8n_chat_histories, propiedades, leads,
--   visitas, message_buffer, contactos, crm_atributo_opciones, bot_settings,
--   channel_flags  → todas con rowsecurity = true.
-- ============================================================================


-- ============================================================================
-- HALLAZGO 1 (WARN) — search_path mutable en funciones
-- Funciones afectadas: public.match_documents, public.buscar_propiedades
-- Riesgo: una función sin search_path fijo puede ser engañada para ejecutar
-- código contra objetos de un esquema inesperado (search_path injection).
-- Arreglo: fijar el search_path. Es seguro y no cambia el comportamiento.
-- ----------------------------------------------------------------------------
-- NOTA: si tus funciones referencian tablas SIN calificar el esquema (ej.
-- `propiedades` en vez de `public.propiedades`), usa `public` (no '') para no
-- romperlas. Ejecuta y prueba el buscador después.
ALTER FUNCTION public.match_documents SET search_path = public;
ALTER FUNCTION public.buscar_propiedades SET search_path = public;


-- ============================================================================
-- HALLAZGO 2 (WARN) — Bucket público permite LISTAR todos los archivos
-- Bucket: fotospropiedades  (política "Public read fotospropiedades")
-- Riesgo: la política SELECT amplia permite que cualquiera ENUMERE todos los
-- archivos del bucket. Para un bucket público NO hace falta: las URLs públicas
-- de cada objeto siguen funcionando sin esta política.
-- Arreglo: quitar la política de listado amplio. (El upload del admin y las
-- URLs públicas de imágenes siguen funcionando.)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public read fotospropiedades" ON storage.objects;
-- (Opcional) Si prefieres conservar lectura por URL explícita pero sin listar,
-- en un bucket PÚBLICO no necesitas recrear ninguna política de SELECT.


-- ============================================================================
-- HALLAZGO 3 (WARN) — Políticas RLS "siempre verdaderas" en escritura
-- Tablas/políticas afectadas (todas para el rol `authenticated`):
--   propiedades            → "Solo autenticados pueden editar"  (ALL,  true/true)
--   contactos              → "Auth write contactos"             (ALL,  true/true)
--   crm_atributo_opciones  → "crm_opciones_auth_all"            (ALL,  true/true)
--   bot_settings           → "auth_delete_bot_settings"         (DELETE, true)
--   n8n_chat_histories     → "auth_delete_chat_histories"       (DELETE, true)
--
-- QUÉ SIGNIFICA: cualquier usuario AUTENTICADO puede escribir/borrar cualquier
-- fila. Para LUCE esto es ACEPTABLE hoy: todos los usuarios autenticados son
-- personal de confianza (owner / agente) creados manualmente por el owner. No
-- hay registro público de usuarios, así que no entra cualquiera.
--
-- DECISIÓN DE NEGOCIO (no obligatorio): si en el futuro quieres que SOLO el
-- "owner" pueda BORRAR (y los agentes solo crear/editar), reemplaza las
-- políticas de DELETE por algo basado en el rol guardado en el JWT. Ejemplo
-- para propiedades:
--
--   DROP POLICY IF EXISTS "Solo autenticados pueden editar" ON public.propiedades;
--   -- Crear/editar: cualquier autenticado
--   CREATE POLICY "propiedades_write_auth" ON public.propiedades
--     FOR INSERT TO authenticated WITH CHECK (true);
--   CREATE POLICY "propiedades_update_auth" ON public.propiedades
--     FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
--   -- Borrar: SOLO owner (rol leído del JWT)
--   CREATE POLICY "propiedades_delete_owner" ON public.propiedades
--     FOR DELETE TO authenticated
--     USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner' );
--
-- Aplica el mismo patrón a contactos y a los DELETE de bot_settings /
-- n8n_chat_histories si quieres restringir el borrado al owner.
-- (Déjalo como está si el equipo es pequeño y todos son de confianza.)


-- ============================================================================
-- HALLAZGO 4 (INFO) — Tablas con RLS activado pero SIN políticas
-- Tablas: channel_flags, documents, documents_privado, leads, visitas,
--         message_buffer
-- QUÉ SIGNIFICA: RLS activo + 0 políticas = NADIE puede leer/escribir vía la
-- anon/authenticated key. Solo el service_role (servidor: chatbot/n8n) accede.
-- Esto es SEGURO (deny-by-default). El frontend no consulta estas tablas, así
-- que NO hay que hacer nada. Solo se documenta para que sepas por qué el linter
-- las marca como INFO (no como error).
--
-- ⚠️ EXCEPCIÓN A VIGILAR: la tabla `leads`. El formulario público de la landing
-- (src/components/LeadForm.tsx) hoy NO guarda nada (solo console.log). Si algún
-- día conectas ese formulario para que un VISITANTE ANÓNIMO inserte en `leads`,
-- necesitarás una política de INSERT para el rol `anon` — pero SOLO INSERT,
-- nunca SELECT (para que nadie pueda leer los leads de otros). Ejemplo seguro:
--
--   CREATE POLICY "leads_public_insert" ON public.leads
--     FOR INSERT TO anon WITH CHECK (true);
--   -- (NO crear política de SELECT para anon: los leads no se leen desde el cliente)


-- ============================================================================
-- VERIFICACIÓN — corre esto para confirmar el estado de RLS:
--
--   SELECT tablename, rowsecurity
--   FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
--
-- Y vuelve a correr el advisor de seguridad en:
--   Dashboard → Advisors → Security
-- ============================================================================

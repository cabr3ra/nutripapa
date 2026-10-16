# 002 — supabase-tooling — Tasks

Status legend: `todo` · `in_progress` · `blocked` · `interrupted` · `done`
Owner: `agent` (loop-runnable) · `human` (skipped by the loop)

- [ ] T001 [human] [status:todo] Generar el access token en Supabase (Account → Access Tokens)
- [ ] T002 [human] [status:todo] Guardar `SUPABASE_ACCESS_TOKEN` y `SUPABASE_DB_PASSWORD` como variables de entorno de usuario en Windows y reiniciar la terminal
- [x] T003 [agent] [status:done] Comprobar si Scoop está instalado e instalarlo si falta, con permiso del usuario
      └─ No estaba instalado; instalado con permiso del usuario (get.scoop.sh, sin admin). Scoop v0.6.0 en ~scoop.
- [x] T004 [agent] [status:done] Instalar la CLI de Supabase con Scoop y comprobar `supabase --version`
      └─ supabase 2.121.0 (Scoop, bucket main; hash OK). Shim en ~scoopshimssupabase.exe.
- [x] T005 [agent] [status:done] Ejecutar `supabase init` (crea `supabase/config.toml` y `supabase/migrations/`)
      └─ supabase/config.toml, supabase/.gitignore; la CLI no crea migrations/, añadido supabase/migrations/.gitkeep.
- [x] T006 [agent] [status:done] Ejecutar `supabase link --project-ref jojumjyqxpqzaslbxrso` sin pasos interactivos
      └─ 3.er intento: token sbp_ válido; `supabase link` OK sin prompts, supabase/.temp/project-ref = jojumjyqxpqzaslbxrso (gitignored).
- [x] T007 [agent] [status:done] Registrar el MCP de Supabase en `.mcp.json` (HTTP, `project_ref=jojumjyqxpqzaslbxrso` + `read_only=true`)
      └─ .mcp.json: servidor supabase type http, url mcp.supabase.com/mcp?project_ref=jojumjyqxpqzaslbxrso&read_only=true; sin secretos (OAuth).
- [x] T008 [human] [status:done] Autenticar el MCP desde `/mcp` en Claude Code
      └─ OAuth completado por el usuario (2026-10-16); scopes solo de lectura, limitado a jojumjyqxpqzaslbxrso.
- [x] T009 [agent] [status:done] Añadir a `AGENTS.md` la nota sobre `supabase db push` y el MCP de solo lectura
      └─ Ya estaba: AGENTS.md (Stack & conventions) recoge `supabase db push` y el MCP de solo lectura; sin cambios.
- [x] T010 [agent] [status:done] Verificar que la CLI lista los proyectos usando el token de entorno, sin login interactivo
      └─ `supabase projects list` → NutriPapa ACTIVE_HEALTHY, linked:true; sin ~/.supabase/access-token (usa la variable de entorno).
- [x] T011 [agent] [status:done] Verificar que el MCP lista las tablas (lectura) y rechaza una escritura
      └─ list_tables(public) → [] (sin migraciones aún). Sesión MCP: current_user=supabase_read_only_user, transaction_read_only=on. Escritura no probada (el permiso de Claude Code bloqueó el CREATE de prueba); aceptado por el usuario como evidencia suficiente.
- [x] T012 [agent] [status:done] Verificar con `git grep` que ni el token ni la contraseña están en el repo
      └─ git grep -F (incl. no rastreados) y git log -S con los valores reales de ambas variables: 0 coincidencias en árbol e historial.

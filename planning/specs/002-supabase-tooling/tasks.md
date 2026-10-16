# 002 — supabase-tooling — Tasks

Status legend: `todo` · `in_progress` · `blocked` · `interrupted` · `done`
Owner: `agent` (loop-runnable) · `human` (skipped by the loop)

- [ ] T001 [human] [status:todo] Generar el access token en Supabase (Account → Access Tokens)
- [ ] T002 [human] [status:todo] Guardar `SUPABASE_ACCESS_TOKEN` y `SUPABASE_DB_PASSWORD` como variables de entorno de usuario en Windows y reiniciar la terminal
- [ ] T003 [agent] [status:todo] Comprobar si Scoop está instalado e instalarlo si falta, con permiso del usuario
- [ ] T004 [agent] [status:todo] Instalar la CLI de Supabase con Scoop y comprobar `supabase --version`
- [ ] T005 [agent] [status:todo] Ejecutar `supabase init` (crea `supabase/config.toml` y `supabase/migrations/`)
- [ ] T006 [agent] [status:todo] Ejecutar `supabase link --project-ref jojumjyqxpqzaslbxrso` sin pasos interactivos
- [ ] T007 [agent] [status:todo] Registrar el MCP de Supabase en `.mcp.json` (HTTP, `project_ref=jojumjyqxpqzaslbxrso` + `read_only=true`)
- [ ] T008 [human] [status:todo] Autenticar el MCP desde `/mcp` en Claude Code
- [ ] T009 [agent] [status:todo] Añadir a `AGENTS.md` la nota sobre `supabase db push` y el MCP de solo lectura
- [ ] T010 [agent] [status:todo] Verificar que la CLI lista los proyectos usando el token de entorno, sin login interactivo
- [ ] T011 [agent] [status:todo] Verificar que el MCP lista las tablas (lectura) y rechaza una escritura
- [ ] T012 [agent] [status:todo] Verificar con `git grep` que ni el token ni la contraseña están en el repo

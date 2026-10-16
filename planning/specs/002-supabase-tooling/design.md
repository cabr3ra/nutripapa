# 002 — supabase-tooling — Design

## Approach

La CLI de Supabase se instala de forma global en Windows con Scoop, para no depender del
`package.json` de la 001. El usuario guarda `SUPABASE_ACCESS_TOKEN` y `SUPABASE_DB_PASSWORD`
como variables de entorno de usuario de Windows, así la CLI funciona sin login interactivo.
El agente ejecuta `supabase init` (crea `supabase/`) y `supabase link --project-ref
jojumjyqxpqzaslbxrso`. El MCP se registra con el endpoint alojado de Supabase en ámbito de
proyecto (`.mcp.json` en el repo, sin secretos):
`https://mcp.supabase.com/mcp?project_ref=jojumjyqxpqzaslbxrso&read_only=true`. La
autenticación del MCP se hace por OAuth desde `/mcp`, así que no hay token en el archivo.

## Deliverables

- CLI de Supabase instalada globalmente (Scoop).
- Variables de entorno de usuario `SUPABASE_ACCESS_TOKEN` y `SUPABASE_DB_PASSWORD` (fuera del repo).
- `supabase/config.toml` y carpeta `supabase/migrations/` (vacía) en el repo.
- `.mcp.json` con el servidor `supabase` (HTTP, `project_ref` + `read_only=true`).
- Nota breve en `AGENTS.md`: cómo aplicar migraciones (`supabase db push`) y que el MCP es de solo lectura.

## Sequencing

1. Usuario: token y contraseña como variables de entorno → reiniciar la terminal.
2. Agente: instalar la CLI → `init` → `link` → registrar el MCP.
3. Usuario: autenticar el MCP en `/mcp` → agente verifica lectura y rechazo de escritura.

## Open questions / deferred

- Si Scoop no está instalado, el agente lo instala primero (requiere permiso del usuario en PowerShell).

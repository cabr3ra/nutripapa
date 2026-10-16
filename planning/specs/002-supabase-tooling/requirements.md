# 002 — supabase-tooling — Requirements

## What's being built

Las herramientas para que el agente trabaje contra el proyecto Supabase
`jojumjyqxpqzaslbxrso`: la CLI de Supabase enlazada al proyecto (para aplicar migraciones
con `supabase db push`) y el servidor MCP de Supabase registrado en Claude Code (para
inspeccionar el esquema y los datos).

## Who/what it serves

- El agente: 003 (esquema) aplica migraciones con la CLI, y todas las specs con datos
  pueden consultar la base vía MCP.
- El usuario: no tiene que aplicar migraciones a mano (decisión de la entrevista).

## Hard constraints

- Proyecto `jojumjyqxpqzaslbxrso` (eu-west-1). No tocar ningún otro.
- Autenticación de la CLI sin pasos interactivos: `SUPABASE_ACCESS_TOKEN` y `SUPABASE_DB_PASSWORD` como variables de entorno, más `supabase link --project-ref jojumjyqxpqzaslbxrso` _(standard: CLI de Supabase — token por variable de entorno en entornos no interactivos; `db push` requiere `link` y crea `supabase_migrations.schema_migrations` — https://supabase.com/llms/cli.txt)_
- El token y la contraseña de la BD solo en la máquina local: nunca en el repo, ni en `.env.example`, ni en el bundle.
- Servidor MCP limitado al proyecto (`project_ref=jojumjyqxpqzaslbxrso`) y en **modo solo lectura** (`read_only=true`): las escrituras al esquema van siempre por migraciones versionadas con la CLI _(standard: parámetros `project_ref` y `read_only` del MCP de Supabase — guías de terceros https://qveris.ai/guides/how-to-add-supabase-mcp-to-claude-code, https://playbooks.com/mcp/supabase; secundaria, no se encontró la doc oficial)_ _(judgement, no standard: solo lectura para reforzar la regla "nunca borrar datos reales")_
- Regla del proyecto: nunca borrar datos reales de Supabase.

## Acceptance criteria

- `supabase projects list` (o equivalente) funciona sin login interactivo usando el token de entorno.
- `supabase link --project-ref jojumjyqxpqzaslbxrso` termina sin error y `supabase/config.toml` existe en el repo.
- En Claude Code, `/mcp` muestra el servidor de Supabase conectado y una consulta de solo lectura (por ejemplo, listar tablas) funciona.
- Un intento de escritura vía MCP es rechazado por el modo solo lectura.
- `git grep` no encuentra el token ni la contraseña en el repo.

## Out of scope

- Crear tablas o migraciones reales (003).
- Configurar la app con la URL y la clave publicable (eso es `.env.local`, 001/003).
- Instalar o usar el MCP fuera de este repo.

## Dependencies

Ninguna en el roadmap. Necesita el proyecto Supabase ya creado (hecho) y un access token
de la cuenta del usuario.

## Owner split

- human: generar el access token en Supabase (Account → Access Tokens), tener a mano la contraseña de la BD y exportarlos como variables de entorno locales; aprobar el registro del MCP y autenticarlo en `/mcp`.
- agent: inicializar `supabase/` en el repo, enlazar el proyecto, registrar el MCP con la configuración indicada y verificar.

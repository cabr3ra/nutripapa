// Comprueba que, sin sesión (rol anon), no se puede leer ni escribir nada en Supabase.
// Uso: pnpm check:anon  (lee VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY de .env.local)
// Importante: este script nunca borra nada. Si un insert funciona, se reporta como FALLO.
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const envPath = fileURLToPath(new URL('../.env.local', import.meta.url))

// Carga .env.local si existe; si no, se usan las variables ya presentes en el entorno.
try {
  process.loadEnvFile(envPath)
} catch {
  // Sin .env.local: se comprueba abajo si faltan las variables.
}

const url = process.env.VITE_SUPABASE_URL
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !publishableKey) {
  console.error(
    'Faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_PUBLISHABLE_KEY. ' +
      'Rellénalas en .env.local (en la raíz del proyecto) y vuelve a ejecutar.',
  )
  process.exit(2)
}

// Cliente anónimo: sin sesión guardada ni renovación de tokens.
const supabase = createClient(url, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})

const BUCKET = 'sent-pdfs'
const fakeId = randomUUID()

// Filas mínimas válidas por tabla (los UUID de FK son inventados: el permiso se comprueba antes).
const minimalRows = {
  weekly_sheets: { start_date: '2026-10-12', menu_number: 1 },
  foods: { name: 'anon-check' },
  meal_entries: {
    sheet_id: fakeId,
    food_id: randomUUID(),
    day_of_week: 1,
    meal_slot: 'breakfast',
  },
  daily_logs: { sheet_id: fakeId, day_of_week: 1 },
  sent_pdfs: { sheet_id: fakeId, storage_path: `anon-check/${fakeId}.pdf` },
}

let failures = 0

function report(ok, label, detail) {
  if (!ok) failures += 1
  const suffix = detail ? ` (${detail})` : ''
  console.log(`${ok ? 'OK   ' : 'FALLO'} ${label}${suffix}`)
}

// Un error de red no demuestra que el acceso esté bloqueado: cuenta como fallo.
function isNetworkError(error) {
  const text = `${error?.name ?? ''} ${error?.message ?? ''}`
  return /fetch failed|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|network/i.test(text)
}

function describeError(error) {
  const code = error?.code ?? error?.statusCode ?? error?.status
  return code ? `${code}: ${error.message}` : String(error?.message ?? error)
}

// Evalúa el resultado de una operación que debe estar bloqueada.
// allowEmpty: un resultado vacío sin error también cuenta como bloqueado (lecturas).
function expectBlocked(label, { data, error }, { allowEmpty }) {
  if (error) {
    if (isNetworkError(error)) {
      report(false, label, `no se pudo conectar: ${describeError(error)}`)
    } else {
      report(true, label, `rechazado: ${describeError(error)}`)
    }
    return
  }
  if (allowEmpty && Array.isArray(data) && data.length === 0) {
    report(true, label, '0 resultados')
    return
  }
  const count = Array.isArray(data) ? `${data.length} resultados` : 'sin error'
  report(false, label, `acceso permitido sin sesión: ${count}`)
}

// Ejecuta una operación capturando excepciones (se tratan como error de la operación).
async function run(operation) {
  try {
    return await operation()
  } catch (error) {
    return { data: null, error }
  }
}

console.log('Comprobando acceso anónimo (sin sesión) a Supabase…\n')

for (const [table, row] of Object.entries(minimalRows)) {
  const selectResult = await run(() => supabase.from(table).select('id').limit(1))
  expectBlocked(`Leer ${table}`, selectResult, { allowEmpty: true })

  // Sin .select(): no se pide que devuelva la fila.
  const insertResult = await run(() => supabase.from(table).insert(row))
  expectBlocked(`Insertar en ${table}`, insertResult, { allowEmpty: false })
}

// Storage: listar la raíz y una carpeta, y subir un PDF mínimo.
const rootList = await run(() => supabase.storage.from(BUCKET).list(''))
expectBlocked(`Listar raíz del bucket ${BUCKET}`, rootList, { allowEmpty: true })

const folderList = await run(() => supabase.storage.from(BUCKET).list(fakeId))
expectBlocked(`Listar una carpeta del bucket ${BUCKET}`, folderList, { allowEmpty: true })

const minimalPdf = new Blob(['%PDF-1.4\n%%EOF\n'], { type: 'application/pdf' })
const uploadResult = await run(() =>
  supabase.storage
    .from(BUCKET)
    .upload(`anon-check/${fakeId}.pdf`, minimalPdf, { contentType: 'application/pdf' }),
)
expectBlocked(`Subir un PDF al bucket ${BUCKET}`, uploadResult, { allowEmpty: false })

console.log(
  failures === 0
    ? '\nTodo bien: sin sesión no se puede leer ni escribir nada.'
    : `\nHay ${failures} comprobación(es) con FALLO: revisa RLS, permisos y Storage.`,
)
process.exit(failures === 0 ? 0 : 1)

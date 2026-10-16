// Genera los iconos PNG provisionales de la PWA a partir de los SVG de origen.
// Uso: pnpm icons
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const publicDir = fileURLToPath(new URL('../public/', import.meta.url))
// Icono "any": esquinas redondeadas (también es el favicon)
const anySource = fileURLToPath(new URL('../public/favicon.svg', import.meta.url))
// Icono maskable: fondo a sangre y contenido dentro de la zona segura (círculo de radio 40 %)
const maskableSource = fileURLToPath(new URL('./maskable-icon.svg', import.meta.url))

const targets = [
  { source: anySource, output: 'pwa-192x192.png', size: 192 },
  { source: anySource, output: 'pwa-512x512.png', size: 512 },
  { source: maskableSource, output: 'maskable-512x512.png', size: 512 },
  { source: maskableSource, output: 'apple-touch-icon-180x180.png', size: 180 },
]

for (const { source, output, size } of targets) {
  const svg = await readFile(source)
  await sharp(svg, { density: 300 })
    .resize(size, size)
    .png()
    .toFile(publicDir + output)
  console.log(`✔ ${output}`)
}

import { copyFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const source = path.join(root, 'tools/registrazione')
const target = path.join(root, 'dist/corvoc/rec')

await mkdir(target, { recursive: true })
for (const file of ['app.js', 'audio-quality.js', 'style.css']) {
  await copyFile(path.join(source, file), path.join(target, file))
}
await copyFile(path.join(source, 'online.html'), path.join(target, 'index.html'))

console.log(`Studio online copiato in ${path.relative(root, target)}`)

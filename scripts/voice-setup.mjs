#!/usr/bin/env node
// Compila eSpeak NG con la voce sarda (sc) in .cache. Il supporto sardo è
// ancora in una pull request: il commit è fissato per rendere la build
// riproducibile. Quando il supporto entrerà in una release, basterà cambiare
// ESPEAK_REPOSITORY/ESPEAK_REF (o usare un pacchetto di sistema).
//
// Il binario resta fuori dal repository e non viene distribuito: in produzione
// la voce passa da SARDINIAN_TTS_URL. Vedi docs/voce-sarda.md.

import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'

const REPOSITORY = process.env.ESPEAK_REPOSITORY || 'https://github.com/asereze/espeak-ng.git'
const REF = process.env.ESPEAK_REF || '97caf4aea887b4d02668aaf4c4029a1c4ebdde7a'
const ROOT = process.cwd()
const CHECKOUT = path.join(ROOT, '.cache/espeak-ng')
const BUILD = path.join(CHECKOUT, 'build')
const BIN = path.join(BUILD, 'src/espeak-ng')
const DATA = path.join(BUILD, 'espeak-ng-data')

const run = (command, args, { cwd = ROOT } = {}) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { cwd, stdio: 'inherit' })
  child.on('error', reject)
  child.on('close', (code) => {
    if (code === 0) resolve()
    else reject(new Error(`${command} ${args.join(' ')}: exit ${code}`))
  })
})

const main = async () => {
  await mkdir(path.join(ROOT, '.cache'), { recursive: true })

  if (!existsSync(path.join(CHECKOUT, '.git'))) {
    console.log(`Clono ${REPOSITORY} in .cache/espeak-ng…`)
    await run('git', ['clone', '--filter=blob:none', REPOSITORY, CHECKOUT])
  }

  console.log(`Uso il commit ${REF}…`)
  await run('git', ['fetch', '--depth', '1', 'origin', REF], { cwd: CHECKOUT }).catch(() => {})
  await run('git', ['checkout', '--force', REF], { cwd: CHECKOUT })

  console.log('Configuro la build…')
  await run('cmake', [
    '-B', BUILD,
    '-DCMAKE_BUILD_TYPE=Release',
    '-DCMAKE_INSTALL_PREFIX', path.join(CHECKOUT, 'install'),
    '-DUSE_ASYNC=OFF',
  ], { cwd: CHECKOUT })

  console.log(`Compilo con ${Math.max(1, os.cpus().length)} processi…`)
  await run('cmake', ['--build', BUILD, '-j', String(Math.max(1, os.cpus().length))], { cwd: CHECKOUT })

  if (!existsSync(BIN) || !existsSync(DATA)) {
    throw new Error('La build è terminata ma il binario o i dati non ci sono.')
  }

  console.log('\nVerifico la voce sarda…')
  await run(BIN, ['--path', DATA, '--voices=sc'])
  await run(BIN, ['--path', DATA, '-v', 'sc', '-q', '--ipa', 'Bonas dies, comente istas?'])

  console.log('\nPronto. Aggiungi al tuo .env.local (o esporta nella shell):')
  console.log(`SARDINIAN_ESPEAK_BIN=${BIN}`)
  console.log(`SARDINIAN_ESPEAK_DATA=${DATA}`)
  console.log('\nPoi genera il corpus dimostrativo con: npm run voice:synth')
}

main().catch((error) => {
  console.error(`\nErrore: ${error.message}`)
  process.exitCode = 1
})

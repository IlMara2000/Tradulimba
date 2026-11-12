import react from '@vitejs/plugin-react'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import { createVoice, VoiceError } from './api/_voice.js'
import { translateText, TranslatorError } from './api/_translator.js'

const BODY_LIMIT_BYTES = 48 * 1024

const readRequestBody = (request) => new Promise((resolve, reject) => {
  const chunks = []
  let total = 0

  request.on('data', (chunk) => {
    total += chunk.length
    if (total > BODY_LIMIT_BYTES) {
      reject(Object.assign(new Error('Richiesta troppo grande.'), { statusCode: 413 }))
      request.destroy()
      return
    }
    chunks.push(chunk)
  })
  request.on('end', () => {
    try {
      resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'))
    } catch {
      reject(Object.assign(new Error('Richiesta non valida.'), { statusCode: 400 }))
    }
  })
  request.on('error', reject)
})

const sendJson = (response, statusCode, payload) => {
  response.statusCode = statusCode
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.end(JSON.stringify(payload))
}

const methodGuard = (request, response) => {
  if (request.method === 'POST') return false
  response.setHeader('Allow', 'POST')
  sendJson(response, 405, { error: 'Metodo non supportato.' })
  return true
}

// In sviluppo, se il motore eSpeak NG con voce sarda è stato compilato in
// .cache, l'app lo usa senza configurare nulla. In produzione il binario non
// esiste: lì serve SARDINIAN_TTS_URL, come spiega docs/voce-sarda.md.
const withLocalVoice = (env) => {
  if (env.SARDINIAN_TTS_URL || env.SARDINIAN_ESPEAK_BIN) return env
  const bin = path.resolve(process.cwd(), '.cache/espeak-ng/build/src/espeak-ng')
  const data = path.resolve(process.cwd(), '.cache/espeak-ng/build/espeak-ng-data')
  if (!existsSync(bin) || !existsSync(data)) return env
  return { ...env, SARDINIAN_ESPEAK_BIN: bin, SARDINIAN_ESPEAK_DATA: data }
}

const translatorDevApi = (env) => ({
  name: 'tradulimba-local-api',
  configureServer(server) {
    const voiceEnv = withLocalVoice(env)

    server.middlewares.use('/api/translate', async (request, response) => {
      if (methodGuard(request, response)) return

      try {
        const input = await readRequestBody(request)
        sendJson(response, 200, await translateText(input, env))
      } catch (error) {
        sendJson(response, error instanceof TranslatorError ? error.statusCode : error.statusCode || 500, {
          error: error.message || 'Errore durante la traduzione.',
          code: error.code || 'INTERNAL_ERROR',
        })
      }
    })

    const voiceHandler = async (request, response) => {
      if (methodGuard(request, response)) return

      try {
        const input = await readRequestBody(request)
        sendJson(response, 200, await createVoice(input, voiceEnv))
      } catch (error) {
        sendJson(response, error instanceof VoiceError ? error.statusCode : error.statusCode || 500, {
          error: error.message || 'Errore durante la generazione della voce.',
          code: error.code || 'INTERNAL_ERROR',
        })
      }
    }

    server.middlewares.use('/api/voice', voiceHandler)
    server.middlewares.use('/api/speech', voiceHandler)
  },
})

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    logLevel: 'info',
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), 'src'),
      },
    },
    plugins: [react(), translatorDevApi(env)],
  }
})

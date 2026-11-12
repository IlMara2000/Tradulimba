import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

export const MAX_VOICE_CHARACTERS = 1000
export const MAX_AUDIO_BYTES = 4 * 1024 * 1024
const DEFAULT_TIMEOUT_MS = 20_000

const VARIANTS = new Set(['lsc', 'campidanese', 'logudorese'])
const AUDIO_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/opus',
  'audio/mp4',
  'audio/aac',
])

export class VoiceError extends Error {
  constructor(message, statusCode = 500, code = 'VOICE_ERROR') {
    super(message)
    this.name = 'VoiceError'
    this.statusCode = statusCode
    this.code = code
  }
}

/**
 * Il motore sardo riceve il testo nella grafia originale. La vecchia route
 * riscriveva tutto in grafia italiana per una voce italiana: quel passaggio qui
 * non esiste più.
 * @param {Record<string, any>} input
 */
export const normalizeVoiceInput = (input = {}) => {
  const text = typeof input.text === 'string' ? input.text.trim() : ''
  const language = input.language === undefined ? 'srd' : input.language
  const variant = input.variant === undefined ? 'lsc' : input.variant

  if (!text) throw new VoiceError('Non c’è ancora un testo da ascoltare.', 400, 'EMPTY_TEXT')
  if (text.length > MAX_VOICE_CHARACTERS) {
    throw new VoiceError(
      `L’ascolto è disponibile fino a ${MAX_VOICE_CHARACTERS} caratteri.`,
      413,
      'TEXT_TOO_LONG',
    )
  }
  if (language !== 'srd') {
    throw new VoiceError(
      'Il motore vocale sardo legge solo testi sardi. Per l’italiano usa la voce del dispositivo.',
      400,
      'UNSUPPORTED_LANGUAGE',
    )
  }
  if (!VARIANTS.has(variant)) {
    throw new VoiceError('La varietà della voce non è valida.', 400, 'INVALID_VARIANT')
  }

  return { text, language, variant }
}

const parseHttpUrl = (value) => {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const url = new URL(value.trim())
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

/**
 * Sceglie il motore: prima il servizio HTTP configurato, poi un binario
 * eSpeak NG locale (utile in sviluppo o su un server dedicato). In produzione
 * Vercel non c'è un binario: serve SARDINIAN_TTS_URL.
 * @param {Record<string, string | undefined>} env
 */
export const resolveVoiceEngine = (env = {}) => {
  const httpUrl = parseHttpUrl(env.SARDINIAN_TTS_URL)
  if (env.SARDINIAN_TTS_URL && !httpUrl) {
    return { kind: 'none', reason: 'INVALID_ENGINE_URL' }
  }
  if (httpUrl) {
    return {
      kind: 'http',
      url: httpUrl,
      key: env.SARDINIAN_TTS_KEY?.trim() || '',
      format: env.SARDINIAN_TTS_FORMAT?.trim() || 'mp3',
    }
  }

  const bin = env.SARDINIAN_ESPEAK_BIN?.trim()
  if (bin) {
    return {
      kind: 'espeak',
      bin,
      data: env.SARDINIAN_ESPEAK_DATA?.trim() || '',
      voice: env.SARDINIAN_ESPEAK_VOICE?.trim() || 'sc',
      speed: Number(env.SARDINIAN_ESPEAK_SPEED || 145),
    }
  }

  return { kind: 'none', reason: 'VOICE_NOT_CONFIGURED' }
}

const runProcess = (command, args, { input, timeoutMs }) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { stdio: ['pipe', 'ignore', 'pipe'] })
  let stderr = ''
  let settled = false

  const finish = (error, code) => {
    if (settled) return
    settled = true
    clearTimeout(timer)
    if (error) reject(error)
    else resolve(code)
  }

  const timer = setTimeout(() => {
    child.kill('SIGKILL')
    finish(Object.assign(new Error('voice engine timeout'), { code: 'VOICE_TIMEOUT' }))
  }, timeoutMs)

  child.stderr.on('data', (chunk) => {
    if (stderr.length < 16_384) stderr += chunk.toString('utf8')
  })
  child.on('error', (error) => finish(error))
  child.on('close', (code) => {
    if (code !== 0) {
      finish(Object.assign(new Error('voice engine failed'), { code: 'VOICE_ENGINE_FAILED', stderr }))
      return
    }
    finish(null, code)
  })

  child.stdin.on('error', () => {})
  child.stdin.end(input)
})

const readAudioResponse = async (response) => {
  const contentType = (response.headers.get('content-type') || '').split(';', 1)[0].trim().toLowerCase()

  if (contentType === 'application/json' || contentType.endsWith('+json')) {
    const data = await response.json()
    if (typeof data.audio !== 'string' || !data.audio) {
      throw new VoiceError('Il motore vocale ha restituito una risposta senza audio.', 502, 'EMPTY_AUDIO')
    }
    const bytes = Buffer.from(data.audio, 'base64')
    if (bytes.byteLength === 0) {
      throw new VoiceError('Il motore vocale ha restituito un audio vuoto.', 502, 'EMPTY_AUDIO')
    }
    if (bytes.byteLength > MAX_AUDIO_BYTES) {
      throw new VoiceError('L’audio restituito è troppo grande.', 502, 'AUDIO_TOO_LARGE')
    }
    return {
      audio: bytes.toString('base64'),
      mediaType: typeof data.mediaType === 'string' ? data.mediaType : 'audio/mpeg',
      engine: typeof data.engine === 'string' ? data.engine : 'http',
      engineLabel: typeof data.engineLabel === 'string' ? data.engineLabel : 'motore TTS sardo',
      warnings: Array.isArray(data.warnings) ? data.warnings.filter((item) => typeof item === 'string') : [],
    }
  }

  if (!AUDIO_TYPES.has(contentType) && !contentType.startsWith('audio/')) {
    throw new VoiceError('Il motore vocale non ha restituito un file audio.', 502, 'INVALID_AUDIO_TYPE')
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.byteLength === 0) {
    throw new VoiceError('Il motore vocale ha restituito un audio vuoto.', 502, 'EMPTY_AUDIO')
  }
  if (buffer.byteLength > MAX_AUDIO_BYTES) {
    throw new VoiceError('L’audio restituito è troppo grande.', 502, 'AUDIO_TOO_LARGE')
  }
  return {
    audio: buffer.toString('base64'),
    mediaType: contentType,
    engine: 'http',
    engineLabel: 'motore TTS sardo',
    warnings: [],
  }
}

const synthesizeHttp = async (input, engine) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

  try {
    const headers = { 'Content-Type': 'application/json', Accept: 'audio/*, application/json' }
    if (engine.key) headers.Authorization = `Bearer ${engine.key}`

    const response = await fetch(engine.url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        text: input.text,
        language: 'srd',
        variant: input.variant,
        format: engine.format,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new VoiceError('Il motore vocale sardo non è raggiungibile.', 502, 'VOICE_ENGINE_ERROR')
    }

    const result = await readAudioResponse(response)
    const variantSupported = response.headers.get('x-voice-variant-support')
    const warnings = [...result.warnings]
    if (input.variant !== 'lsc' && variantSupported === 'lsc-only') {
      warnings.push('Il motore legge in LSC: la varietà selezionata non è resa.')
    }

    return { ...result, warnings, variant: input.variant }
  } catch (error) {
    if (error instanceof VoiceError) throw error
    if (error.name === 'AbortError') {
      throw new VoiceError('La generazione della voce sta impiegando troppo tempo.', 504, 'VOICE_TIMEOUT')
    }
    throw new VoiceError('Il motore vocale sardo non è raggiungibile.', 502, 'VOICE_UNAVAILABLE')
  } finally {
    clearTimeout(timeout)
  }
}

const synthesizeEspeak = async (input, engine) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'tradulimba-voce-'))
  const output = path.join(directory, 'voce.wav')

  try {
    const args = []
    if (engine.data) args.push('--path', engine.data)
    args.push('-v', engine.voice, '-s', String(Number.isFinite(engine.speed) ? engine.speed : 145), '-w', output, '--stdin')

    await runProcess(engine.bin, args, { input: input.text, timeoutMs: DEFAULT_TIMEOUT_MS })
    const buffer = await readFile(output)
    if (buffer.subarray(0, 4).toString('ascii') !== 'RIFF') {
      throw new VoiceError('Il motore locale non ha prodotto un WAV valido.', 502, 'INVALID_AUDIO')
    }
    if (buffer.byteLength > MAX_AUDIO_BYTES) {
      throw new VoiceError('L’audio restituito è troppo grande.', 502, 'AUDIO_TOO_LARGE')
    }

    const warnings = input.variant === 'lsc'
      ? []
      : ['eSpeak NG legge in LSC: la varietà selezionata non è resa.']

    return {
      audio: buffer.toString('base64'),
      mediaType: 'audio/wav',
      engine: 'espeak',
      engineLabel: `eSpeak NG · ${engine.voice}`,
      warnings,
      variant: input.variant,
    }
  } catch (error) {
    if (error instanceof VoiceError) throw error
    if (error.code === 'VOICE_TIMEOUT') {
      throw new VoiceError('La generazione della voce sta impiegando troppo tempo.', 504, 'VOICE_TIMEOUT')
    }
    throw new VoiceError('Il motore vocale locale non è disponibile.', 503, 'VOICE_ENGINE_UNAVAILABLE')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

/**
 * @param {Record<string, any>} rawInput
 * @param {Record<string, string | undefined>} env
 */
export const createVoice = async (rawInput, env = process.env) => {
  const input = normalizeVoiceInput(rawInput)
  const engine = resolveVoiceEngine(env)

  if (engine.kind === 'none') {
    throw new VoiceError(
      'Il motore vocale sardo non è configurato. Imposta SARDINIAN_TTS_URL oppure, in locale, SARDINIAN_ESPEAK_BIN.',
      503,
      engine.reason || 'VOICE_NOT_CONFIGURED',
    )
  }

  if (engine.kind === 'http') return synthesizeHttp(input, engine)
  return synthesizeEspeak(input, engine)
}

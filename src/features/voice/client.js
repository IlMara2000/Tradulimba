import { validateVoiceManifest } from './corpus.js'

export class VoiceRequestError extends Error {
  constructor(message, code, status) {
    super(message)
    this.name = 'VoiceRequestError'
    this.code = code
    this.status = status
  }
}

// Su Vercel il corpus online è dinamico; in locale resta il manifest statico.
// Si prova prima la route dinamica, poi il file: una risposta HTML del dev
// server non deve impedire il fallback.
const MANIFEST_URLS = ['/api/corvoc/manifest', '/voce/manifest.json']
let manifestPromise = null

const fetchManifest = async () => {
  for (const url of MANIFEST_URLS) {
    try {
      const response = await fetch(url, { headers: { accept: 'application/json' } })
      if (!response.ok) continue
      return validateVoiceManifest(await response.json())
    } catch {
      // Prova la sorgente successiva.
    }
  }
  return { version: 1, entries: [] }
}

/**
 * Carica una sola volta il manifest del corpus. Se nessuna sorgente risponde
 * l'app continua con il motore o con la voce del dispositivo.
 * @returns {Promise<{ version: number, entries: Array<Record<string, any>> }>}
 */
export const loadVoiceManifest = () => {
  if (!manifestPromise) manifestPromise = fetchManifest()
  return manifestPromise
}

/**
 * Chiede al backend una sintesi sarda. Il testo arriva al motore nella grafia
 * sarda originale: non viene più riscritto in grafia italiana.
 * @param {string} text
 * @param {string} variant
 * @param {AbortSignal} [signal]
 * @returns {Promise<{ audio: string, mediaType: string, engine?: string, engineLabel?: string, warnings?: string[] }>}
 */
export const fetchEngineVoice = async (text, variant, signal) => {
  const response = await fetch('/api/voice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, language: 'srd', variant }),
    signal,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || typeof data.audio !== 'string' || !data.audio) {
    throw new VoiceRequestError(
      data.error || 'Il motore vocale sardo non è disponibile.',
      data.code || 'VOICE_UNAVAILABLE',
      response.status,
    )
  }
  return data
}

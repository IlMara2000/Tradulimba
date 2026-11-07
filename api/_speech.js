import { generateSpeech } from 'ai'
import { resolveGatewayProvider } from './_aiGateway.js'
import { buildSpeechScript } from '../src/features/translation/speechScript.js'

export const MAX_SPEECH_CHARACTERS = 1000

const VARIANT_INSTRUCTIONS = {
  lsc: 'Il testo è una trascrizione fonetica in grafia italiana del sardo: leggilo alla lettera, senza correggere né tradurre le parole.',
  campidanese: 'Il testo è una trascrizione fonetica in grafia italiana del campidanese: leggilo alla lettera, con cadenza prudente e senza caricature.',
  logudorese: 'Il testo è una trascrizione fonetica in grafia italiana del logudorese: leggilo alla lettera, con cadenza prudente e senza caricature.',
}

export class SpeechError extends Error {
  constructor(message, statusCode = 500, code = 'SPEECH_ERROR') {
    super(message)
    this.name = 'SpeechError'
    this.statusCode = statusCode
    this.code = code
  }
}

export const normalizeSpeechInput = (input = {}) => {
  const text = typeof input.text === 'string' ? input.text.trim() : ''
  const language = input.language === undefined ? 'srd' : input.language
  const variant = input.variant === undefined ? 'lsc' : input.variant

  if (!text) throw new SpeechError('Non c’è ancora una traduzione da ascoltare.', 400, 'EMPTY_TEXT')
  if (text.length > MAX_SPEECH_CHARACTERS) {
    throw new SpeechError(
      `L’ascolto AI è disponibile fino a ${MAX_SPEECH_CHARACTERS} caratteri.`,
      413,
      'TEXT_TOO_LONG',
    )
  }
  if (!['ita', 'srd'].includes(language)) {
    throw new SpeechError('La lingua della voce non è valida.', 400, 'INVALID_LANGUAGE')
  }
  if (!['lsc', 'campidanese', 'logudorese'].includes(variant)) {
    throw new SpeechError('La varietà della voce non è valida.', 400, 'INVALID_VARIANT')
  }

  return { text, language, variant }
}

export const createSpeech = async (rawInput, env = process.env) => {
  const input = normalizeSpeechInput(rawInput)
  const provider = resolveGatewayProvider(env)
  if (!provider) {
    throw new SpeechError('La voce AI non è configurata.', 503, 'SPEECH_NOT_CONFIGURED')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 22000)

  try {
    const result = await generateSpeech({
      model: provider.speechModel(env.SPEECH_AI_MODEL || 'openai/tts-1'),
      text: input.language === 'srd' ? buildSpeechScript(input.text, input.variant) : input.text,
      voice: env.SPEECH_AI_VOICE || 'nova',
      outputFormat: 'mp3',
      speed: input.language === 'srd' ? 0.9 : 1,
      instructions: input.language === 'srd'
        ? VARIANT_INSTRUCTIONS[input.variant]
        : 'Leggi in italiano con tono naturale e chiaro.',
      maxRetries: 1,
      abortSignal: controller.signal,
    })
    return {
      audio: result.audio.base64,
      mediaType: result.audio.mediaType || 'audio/mpeg',
      warnings: result.warnings || [],
    }
  } catch (error) {
    if (error instanceof SpeechError) throw error
    if (error.name === 'AbortError') {
      throw new SpeechError('La generazione della voce sta impiegando troppo tempo.', 504, 'SPEECH_TIMEOUT')
    }
    throw new SpeechError('Il servizio vocale non è raggiungibile.', 502, 'SPEECH_UNAVAILABLE')
  } finally {
    clearTimeout(timeout)
  }
}

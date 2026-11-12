// Decodifica i WAV PCM mono 16 bit prodotti dallo studio. Il controllo è
// volutamente stretto: il server non deve accettare formati che il browser non
// ha validato o header incoerenti.

export class WavError extends Error {
  constructor(message, code = 'INVALID_WAV') {
    super(message)
    this.name = 'WavError'
    this.code = code
  }
}

/**
 * @param {Buffer} buffer
 * @returns {{ samples: Float32Array, sampleRate: number, duration: number }}
 */
export const decodePcmWav = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 44) {
    throw new WavError('Il file WAV è vuoto o incompleto.')
  }
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    throw new WavError('Il file non è un WAV valido.')
  }

  let offset = 12
  let fmt = null
  let data = null
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('ascii', offset, offset + 4)
    const size = buffer.readUInt32LE(offset + 4)
    const body = offset + 8
    if (body + size > buffer.length) {
      throw new WavError('Il file WAV contiene un blocco incompleto.')
    }
    if (id === 'fmt ') {
      fmt = {
        audioFormat: buffer.readUInt16LE(body),
        channels: buffer.readUInt16LE(body + 2),
        sampleRate: buffer.readUInt32LE(body + 4),
        bitsPerSample: buffer.readUInt16LE(body + 14),
      }
    } else if (id === 'data') {
      data = buffer.subarray(body, body + size)
    }
    offset = body + size + (size % 2)
  }

  if (!fmt || !data) throw new WavError('Mancano i blocchi fmt o data del WAV.')
  if (fmt.audioFormat !== 1 || fmt.channels !== 1 || fmt.bitsPerSample !== 16) {
    throw new WavError('Servono WAV PCM mono a 16 bit.', 'UNSUPPORTED_WAV')
  }
  if (!Number.isFinite(fmt.sampleRate) || fmt.sampleRate < 8000 || fmt.sampleRate > 96000) {
    throw new WavError('Frequenza di campionamento non valida.')
  }
  if (data.length % 2 !== 0) throw new WavError('Il blocco audio è incompleto.')

  const samples = new Float32Array(data.length / 2)
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = data.readInt16LE(index * 2) / 32768
  }

  return {
    samples,
    sampleRate: fmt.sampleRate,
    duration: samples.length / fmt.sampleRate,
  }
}

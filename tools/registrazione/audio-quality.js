const FRAME_SECONDS = 0.02
const MIN_SPEECH_DB = -60
const MIN_DURATION_SECONDS = 0.3
const MAX_DURATION_SECONDS = 30

const toDb = (value) => Math.max(-90, 20 * Math.log10(Math.max(value, 1e-9)))

const percentile = (sorted, ratio) => {
  if (sorted.length === 0) return -90
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * ratio)))
  return sorted[index]
}

export const formatDuration = (seconds) =>
  Number.isFinite(seconds) ? `${seconds.toFixed(2).replace('.', ',')} s` : '—'

export const formatDb = (value) =>
  Number.isFinite(value) ? `${value.toFixed(1).replace('.', ',')} dB` : '—'

const emptyResult = (message) => ({
  duration: 0,
  speechStart: null,
  speechEnd: null,
  leadingSilence: null,
  trailingSilence: null,
  peakDb: -90,
  rmsDb: -90,
  noiseFloorDb: -90,
  snrDb: null,
  clippedSamples: 0,
  clippedRatio: 0,
  silentRatio: 1,
  issues: [{ code: 'empty', severity: 'error', message }],
  grade: 'error',
  headline: 'Da rifare',
})

/**
 * Analizza una ripresa mono in Float32 (-1…1) e restituisce misure e avvisi.
 * Non blocca di per sé il salvataggio: lo fa il chiamante in base a `grade`.
 */
export const analyzeRecording = (samples, sampleRate) => {
  if (!samples || samples.length === 0) {
    return emptyResult('Nessun audio: la ripresa è vuota.')
  }
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
    return emptyResult('Frequenza di campionamento non valida.')
  }

  const length = samples.length
  const duration = length / sampleRate
  let peak = 0
  let sumSquares = 0
  let clippedSamples = 0

  for (const sample of samples) {
    const absolute = Math.abs(sample)
    if (absolute > peak) peak = absolute
    sumSquares += sample * sample
    if (absolute >= 0.999) clippedSamples += 1
  }

  const rms = Math.sqrt(sumSquares / length)
  const frameSize = Math.max(1, Math.round(sampleRate * FRAME_SECONDS))
  const frameCount = Math.ceil(length / frameSize)
  const frameDb = new Array(frameCount)

  for (let frame = 0; frame < frameCount; frame += 1) {
    const start = frame * frameSize
    const end = Math.min(length, start + frameSize)
    let frameSquares = 0
    for (let index = start; index < end; index += 1) {
      frameSquares += samples[index] * samples[index]
    }
    frameDb[frame] = toDb(Math.sqrt(frameSquares / Math.max(1, end - start)))
  }

  const sorted = [...frameDb].sort((left, right) => left - right)
  const noiseFloorDb = percentile(sorted, 0.1)
  const thresholdDb = Math.max(noiseFloorDb + 10, MIN_SPEECH_DB)

  let firstSpeechFrame = -1
  let lastSpeechFrame = -1
  let silentFrames = 0
  for (let frame = 0; frame < frameCount; frame += 1) {
    if (frameDb[frame] >= thresholdDb) {
      if (firstSpeechFrame === -1) firstSpeechFrame = frame
      lastSpeechFrame = frame
    } else {
      silentFrames += 1
    }
  }

  const clippedRatio = clippedSamples / length
  const peakDb = toDb(peak)
  const rmsDb = toDb(rms)
  let hasSpeech = firstSpeechFrame !== -1
  let continuous = false

  // Un take che inizia e finisce subito può non avere frame di silenzio: se il
  // livello è chiaramente udibile, trattalo come parlato continuo e avvisa,
  // invece di bocciarlo come “nessun parlato”.
  if (!hasSpeech && rmsDb > -45 && peakDb > -30) {
    firstSpeechFrame = 0
    lastSpeechFrame = frameCount - 1
    hasSpeech = true
    continuous = true
  }

  const speechStart = hasSpeech ? (firstSpeechFrame * frameSize) / sampleRate : null
  const speechEnd = hasSpeech
    ? Math.min(duration, ((lastSpeechFrame + 1) * frameSize) / sampleRate)
    : null
  const leadingSilence = hasSpeech ? speechStart : null
  const trailingSilence = hasSpeech ? duration - speechEnd : null
  const speechDb = hasSpeech
    ? percentile(
        frameDb.slice(firstSpeechFrame, lastSpeechFrame + 1).sort((left, right) => left - right),
        0.8,
      )
    : null
  const snrDb = hasSpeech && !continuous ? Math.max(0, speechDb - noiseFloorDb) : null
  const issues = []
  const add = (code, severity, message) => issues.push({ code, severity, message })

  if (duration < MIN_DURATION_SECONDS) {
    add('too-short', 'error', `Troppo corta (${formatDuration(duration)}): registra almeno una parola intera.`)
  } else if (duration < 0.5) {
    add('short', 'warning', `Molto corta (${formatDuration(duration)}): controlla di aver registrato tutta la riga.`)
  } else if (duration > MAX_DURATION_SECONDS + 0.5) {
    add('too-long', 'error', 'Oltre 30 secondi: registra una riga per volta.')
  } else if (duration > 15) {
    add('long', 'warning', `Lunga (${formatDuration(duration)}): verifica che sia una sola riga.`)
  }

  if (!hasSpeech) {
    if (duration >= MIN_DURATION_SECONDS) {
      add('no-speech', 'error', 'Nessun parlato rilevato: il rumore di fondo copre la voce o il microfono è muto.')
    }
  } else {
    if (continuous) {
      add('no-silence', 'warning', 'Nessun silenzio ai lati: lascia circa 0,3 s prima e dopo la frase.')
    } else if (duration >= MIN_DURATION_SECONDS) {
      if (leadingSilence < 0.1) {
        add('tight-start', 'warning', 'L’attacco è a filo dell’inizio: lascia circa 0,3 s di silenzio prima di parlare.')
      } else if (leadingSilence > 2.5) {
        add('long-leading-silence', 'warning', `Silenzio iniziale lungo (${formatDuration(leadingSilence)}): taglia l’inizio o riparti più vicino alla frase.`)
      }

      if (trailingSilence < 0.15) {
        add('tight-end', 'warning', 'Manca il silenzio finale: lascia circa 0,3 s dopo l’ultima parola.')
      } else if (trailingSilence > 2.5) {
        add('long-trailing-silence', 'warning', `Silenzio finale lungo (${formatDuration(trailingSilence)}): taglia la coda.`)
      }

      if (noiseFloorDb > -40) {
        add('noisy', 'warning', `Rumore di fondo alto (${formatDb(noiseFloorDb)}): chiudi finestre e ventilatori.`)
      }
      if (snrDb < 20) {
        add('low-snr', 'warning', `Voce poco sopra il rumore (${snrDb.toFixed(0)} dB): avvicinati al microfono o riduci il rumore.`)
      }
    }

    if (peakDb < -30) {
      add('quiet', 'warning', `Registrazione molto bassa (picco ${formatDb(peakDb)}): avvicinati al microfono.`)
    }
  }

  if (clippedSamples > 0) {
    const severity = clippedRatio > 0.005 ? 'error' : 'warning'
    add(
      'clipping',
      severity,
      `Clipping su ${clippedSamples} campioni (${(clippedRatio * 100).toFixed(2).replace('.', ',')}%): abbassa il guadagno del microfono e ripeti.`,
    )
  } else if (peakDb > -0.5) {
    add('near-clipping', 'warning', `Picco quasi a fondo scala (${formatDb(peakDb)}): abbassa leggermente il guadagno.`)
  }

  const hasError = issues.some((issue) => issue.severity === 'error')
  const grade = hasError ? 'error' : issues.length > 0 ? 'warning' : 'ok'

  return {
    duration,
    speechStart,
    speechEnd,
    leadingSilence,
    trailingSilence,
    peakDb,
    rmsDb,
    noiseFloorDb: continuous ? null : noiseFloorDb,
    snrDb,
    clippedSamples,
    clippedRatio,
    silentRatio: continuous ? 0 : frameCount > 0 ? silentFrames / frameCount : 1,
    issues,
    grade,
    headline: grade === 'ok' ? 'Qualità buona' : grade === 'warning' ? 'Da controllare' : 'Da rifare',
  }
}

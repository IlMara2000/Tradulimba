import { analyzeRecording, formatDb, formatDuration } from './audio-quality.js'

const $ = (id) => document.getElementById(id)

const VARIANT_LABELS = {
  lsc: 'LSC',
  campidanese: 'Campidanese',
  logudorese: 'Logudorese',
}

const ONLINE = document.body.dataset.corvoc === 'online'
const TOKEN_STORAGE_KEY = 'tradulimba:corvoc-token'

const els = {
  count: $('count'),
  bar: $('bar'),
  enable: $('enable'),
  micStatus: $('mic-status'),
  group: $('group'),
  filter: $('filter'),
  search: $('search'),
  list: $('list'),
  groupLabel: $('group-label'),
  counter: $('counter'),
  variant: $('variant'),
  line: $('line'),
  lineStatus: $('line-status'),
  level: $('level'),
  timer: $('timer'),
  speaker: $('speaker'),
  consent: $('consent'),
  token: $('corvoc-token'),
  speakerStatus: $('speaker-status'),
  metadataPath: $('metadata-path'),
  clearSpeaker: $('clear-speaker'),
  quality: $('quality'),
  qualityGrade: $('quality-grade'),
  qDuration: $('q-duration'),
  qLead: $('q-lead'),
  qTail: $('q-tail'),
  qPeak: $('q-peak'),
  qNoise: $('q-noise'),
  qSnr: $('q-snr'),
  qClip: $('q-clip'),
  qualityIssues: $('quality-issues'),
  record: $('record'),
  stop: $('stop'),
  save: $('save'),
  retry: $('retry'),
  prev: $('prev'),
  next: $('next'),
  synthetic: $('synthetic'),
  recorded: $('recorded'),
  take: $('take'),
}

let rows = []
let currentIndex = 0
let stream = null
let audioContext = null
let analyser = null
let recorder = null
let isRecording = false
let takeBlob = null
let takeUrl = null
let takeQuality = null
let takeSaved = false
let timerId = null
let levelRaf = null
let maxTimer = null
let startedAt = 0
let takeGeneration = 0

const currentRow = () => rows[currentIndex] || null

const setStatus = (text, kind = '') => {
  els.lineStatus.textContent = text
  els.lineStatus.className = `status${kind ? ` is-${kind}` : ''}`
}

const setMicStatus = (text, kind = '') => {
  els.micStatus.textContent = text
  els.micStatus.className = `status${kind ? ` is-${kind}` : ''}`
}

const SPEAKER_STORAGE_KEY = 'tradulimba:voice-speaker'

const cleanSpeakerText = (value) => String(value || '')
  .replace(/[\u0000-\u001f\u007f]+/gu, ' ')
  .replace(/\s+/gu, ' ')
  .trim()
  .slice(0, 120)

const readSpeakerProfile = () => {
  const speaker = cleanSpeakerText(els.speaker.value)
  const consentRef = cleanSpeakerText(els.consent.value)
  return { speaker, consentRef, valid: Boolean(speaker && consentRef) }
}

const readToken = () => {
  if (!ONLINE) return ''
  const fromInput = cleanSpeakerText(els.token?.value)
  if (fromInput) return fromInput
  try {
    return cleanSpeakerText(sessionStorage.getItem(TOKEN_STORAGE_KEY))
  } catch {
    return ''
  }
}

const persistToken = () => {
  if (!ONLINE) return
  try {
    const token = cleanSpeakerText(els.token?.value)
    if (token) sessionStorage.setItem(TOKEN_STORAGE_KEY, token)
    else sessionStorage.removeItem(TOKEN_STORAGE_KEY)
  } catch {
    // sessionStorage può essere disabilitato: il codice resta nel campo.
  }
}

const setSpeakerStatus = (text, kind = '') => {
  els.speakerStatus.textContent = text
  els.speakerStatus.className = `status${kind ? ` is-${kind}` : ''}`
}

const persistSpeakerProfile = (profile) => {
  try {
    if (!profile.speaker && !profile.consentRef) {
      localStorage.removeItem(SPEAKER_STORAGE_KEY)
      return
    }
    localStorage.setItem(SPEAKER_STORAGE_KEY, JSON.stringify({
      speaker: profile.speaker,
      consentRef: profile.consentRef,
    }))
  } catch {
    // localStorage può essere disabilitato: i campi restano validi per la sessione.
  }
}

const updateSaveState = () => {
  const profile = readSpeakerProfile()
  els.save.disabled = takeSaved
    || !takeBlob
    || takeQuality?.grade === 'error'
    || !profile.valid
    || (ONLINE && !readToken())
}

const refreshTakeStatus = () => {
  if (!takeBlob || !takeQuality || takeSaved) return
  if (takeQuality.grade === 'error') {
    setStatus('Ripresa da rifare: controlla i problemi rossi. Puoi ascoltarla, ma non salvarla.', 'error')
    return
  }
  if (!readSpeakerProfile().valid) {
    setStatus('Ripresa pronta, ma completa parlante e riferimento consenso per salvarla.', 'warning')
    return
  }
  if (ONLINE && !readToken()) {
    setStatus('Ripresa pronta, ma inserisci il codice di accesso per salvarla online.', 'warning')
    return
  }
  if (takeQuality.grade === 'warning') {
    setStatus('Ripresa pronta, ma controlla gli avvisi gialli prima di salvare.', 'warning')
    return
  }
  setStatus('Ripresa pronta: qualità buona. Ascoltala e salva.', 'ok')
}

const updateSpeakerState = () => {
  const profile = readSpeakerProfile()
  if (ONLINE && !readToken()) {
    setSpeakerStatus('Inserisci il codice di accesso per salvare online.', 'warning')
  } else if (profile.valid) {
    setSpeakerStatus(`Dati pronti: ${profile.speaker} · ${profile.consentRef}`, 'ok')
  } else {
    setSpeakerStatus('Inserisci parlante e riferimento consenso per salvare.', 'warning')
  }
  persistSpeakerProfile(profile)
  updateSaveState()
  refreshTakeStatus()
}

const restoreSpeakerProfile = () => {
  try {
    const raw = localStorage.getItem(SPEAKER_STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      els.speaker.value = typeof data?.speaker === 'string' ? data.speaker.slice(0, 120) : ''
      els.consent.value = typeof data?.consentRef === 'string' ? data.consentRef.slice(0, 120) : ''
    }
  } catch {
    // Un profilo locale illeggibile non deve impedire di registrare.
  }
  if (ONLINE && els.token) {
    try {
      els.token.value = sessionStorage.getItem(TOKEN_STORAGE_KEY) || ''
    } catch {
      // Il codice resta vuoto se sessionStorage non è disponibile.
    }
  }
  updateSpeakerState()
}

const updateProgress = () => {
  const recorded = rows.filter((row) => row.recorded).length
  els.count.textContent = `${recorded} / ${rows.length}`
  els.bar.style.width = rows.length > 0 ? `${(recorded / rows.length) * 100}%` : '0%'
}

const setAudioSource = (audio, url) => {
  if (url) {
    audio.src = url
    audio.load()
  } else {
    audio.removeAttribute('src')
    audio.load()
  }
}

const clearQuality = () => {
  takeQuality = null
  els.quality.hidden = true
  els.qualityGrade.textContent = '—'
  els.qualityGrade.className = 'quality-grade'
  els.qualityIssues.replaceChildren()
  for (const key of ['qDuration', 'qLead', 'qTail', 'qPeak', 'qNoise', 'qSnr', 'qClip']) {
    els[key].textContent = '—'
  }
}

const renderQuality = (quality) => {
  els.quality.hidden = false
  els.qualityGrade.textContent = quality.headline
  els.qualityGrade.className = `quality-grade is-${quality.grade}`
  els.qDuration.textContent = formatDuration(quality.duration)
  els.qLead.textContent = quality.leadingSilence == null ? '—' : formatDuration(quality.leadingSilence)
  els.qTail.textContent = quality.trailingSilence == null ? '—' : formatDuration(quality.trailingSilence)
  els.qPeak.textContent = formatDb(quality.peakDb)
  els.qNoise.textContent = formatDb(quality.noiseFloorDb)
  els.qSnr.textContent = formatDb(quality.snrDb)
  els.qClip.textContent = quality.clippedSamples === 0
    ? 'nessuno'
    : `${quality.clippedSamples} (${(quality.clippedRatio * 100).toFixed(2).replace('.', ',')}%)`

  els.qualityIssues.replaceChildren()
  if (quality.issues.length === 0) {
    const item = document.createElement('li')
    item.className = 'is-ok'
    item.textContent = 'Nessun problema rilevato.'
    els.qualityIssues.append(item)
  } else {
    for (const issue of quality.issues) {
      const item = document.createElement('li')
      item.className = `is-${issue.severity}`
      item.textContent = issue.message
      els.qualityIssues.append(item)
    }
  }
}

const resetTake = () => {
  takeGeneration += 1
  takeSaved = false
  if (takeUrl) URL.revokeObjectURL(takeUrl)
  takeUrl = null
  takeBlob = null
  clearQuality()
  setAudioSource(els.take, null)
  updateSaveState()
  els.retry.disabled = true
  els.timer.textContent = '0,0 s'
  els.level.style.width = '0%'
}

const renderGroups = () => {
  const groups = new Map()
  for (const row of rows) {
    if (row.group) groups.set(row.group, row.groupLabel || row.group)
  }
  els.group.replaceChildren(new Option('Tutti i gruppi', ''))
  for (const [id, label] of groups) els.group.append(new Option(label, id))
}

const renderList = () => {
  const group = els.group.value
  const status = els.filter.value
  const term = els.search.value.trim().toLocaleLowerCase('it')

  const filtered = rows.filter((row) => {
    if (group && row.group !== group) return false
    if (status === 'missing' && row.recorded) return false
    if (status === 'recorded' && !row.recorded) return false
    if (term && !`${row.text} ${row.id}`.toLocaleLowerCase('it').includes(term)) return false
    return true
  })

  els.list.replaceChildren()
  if (filtered.length === 0) {
    const empty = document.createElement('p')
    empty.className = 'status'
    empty.textContent = 'Nessuna riga con questi filtri.'
    els.list.append(empty)
    return
  }

  for (const row of filtered) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = `row${row.index === currentIndex ? ' is-current' : ''}`

    const dot = document.createElement('span')
    dot.className = `dot${row.recorded ? ' ok' : row.synthetic ? ' syn' : ''}`
    dot.setAttribute('aria-hidden', 'true')

    const text = document.createElement('span')
    text.className = 'row-text'
    text.textContent = row.text

    const note = document.createElement('small')
    if (row.recorded) {
      note.textContent = row.consentRef ? 'voce umana' : 'voce umana · senza consenso'
      if (row.speaker || row.consentRef) {
        button.title = `Parlante: ${row.speaker || '—'}${row.consentRef ? ` · Consenso: ${row.consentRef}` : ' · Consenso mancante'}`
      }
    } else if (row.synthetic) {
      note.textContent = 'solo sintetica'
    } else {
      note.textContent = 'manca'
    }
    text.append(note)

    button.append(dot, text)
    button.addEventListener('click', () => selectRow(row.index))
    els.list.append(button)
  }

  els.list.querySelector('.row.is-current')?.scrollIntoView({ block: 'nearest' })
}

const selectRow = (index) => {
  if (isRecording || index < 0 || index >= rows.length) return
  currentIndex = index
  const row = rows[currentIndex]

  els.groupLabel.textContent = row.groupLabel || 'Copione'
  els.counter.textContent = `${currentIndex + 1} / ${rows.length}`
  els.variant.textContent = VARIANT_LABELS[row.variant] || row.variant
  els.line.textContent = row.text
  els.save.textContent = row.recorded ? 'Sostituisci nel corpus' : ONLINE ? 'Salva online' : 'Salva nel corpus'

  resetTake()
  setAudioSource(els.synthetic, row.synthetic?.url)
  setAudioSource(els.recorded, row.recorded?.url)

  if (row.recorded) {
    setStatus('Registrazione umana presente. Puoi ascoltarla o rifarla.', 'ok')
  } else if (row.synthetic) {
    setStatus('C’è una clip sintetica: ascoltala per confronto, poi registra la voce umana.')
  } else {
    setStatus('Nessun audio: registra questa riga.')
  }

  renderList()
}

const enableMic = async () => {
  if (stream) return stream
  if (!navigator.mediaDevices?.getUserMedia) {
    setMicStatus('Microfono non disponibile: apri lo studio su http://127.0.0.1:8788.', 'error')
    return null
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    })
    audioContext = new AudioContext()
    const source = audioContext.createMediaStreamSource(stream)
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 1024
    source.connect(analyser)
    setMicStatus('Microfono attivo. Tieni il livello sotto la zona rossa e parla a 15–20 cm.', 'ok')
    els.enable.disabled = true
    return stream
  } catch (error) {
    setMicStatus(`Microfono non disponibile: ${error.message || 'permesso negato'}.`, 'error')
    return null
  }
}

const updateTimer = () => {
  const seconds = Math.max(0, (performance.now() - startedAt) / 1000)
  els.timer.textContent = `${seconds.toFixed(1).replace('.', ',')} s`
}

const updateLevel = () => {
  if (!analyser) return
  const data = new Uint8Array(analyser.fftSize)
  analyser.getByteTimeDomainData(data)
  let peak = 0
  for (const value of data) peak = Math.max(peak, Math.abs(value - 128) / 128)
  els.level.style.width = `${Math.min(100, peak * 100)}%`
  levelRaf = requestAnimationFrame(updateLevel)
}

const writeString = (view, offset, value) => {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index))
  }
}

const toWav = async (blob) => {
  if (!audioContext) audioContext = new AudioContext()
  await audioContext.resume()
  const audioBuffer = await audioContext.decodeAudioData(await blob.arrayBuffer())
  const { numberOfChannels, length, sampleRate } = audioBuffer
  const mono = new Float32Array(length)

  for (let channel = 0; channel < numberOfChannels; channel += 1) {
    const data = audioBuffer.getChannelData(channel)
    for (let index = 0; index < length; index += 1) {
      mono[index] += data[index] / numberOfChannels
    }
  }

  const buffer = new ArrayBuffer(44 + length * 2)
  const view = new DataView(buffer)
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + length * 2, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(view, 36, 'data')
  view.setUint32(40, length * 2, true)

  let offset = 44
  for (const sample of mono) {
    const clamped = Math.max(-1, Math.min(1, sample))
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true)
    offset += 2
  }

  return { blob: new Blob([view], { type: 'audio/wav' }), samples: mono, sampleRate }
}

const finalizeRecording = async (finishedRecorder, finishedChunks, generation) => {
  const type = finishedRecorder?.mimeType || 'audio/webm'
  const blob = new Blob(finishedChunks, { type })
  if (blob.size === 0) {
    if (generation === takeGeneration) {
      setStatus('La ripresa è vuota: controlla il microfono e riprova.', 'error')
    }
    return
  }

  try {
    const converted = await toWav(blob)
    if (generation !== takeGeneration) return
    takeBlob = converted.blob
    takeQuality = analyzeRecording(converted.samples, converted.sampleRate)
    if (takeUrl) URL.revokeObjectURL(takeUrl)
    takeUrl = URL.createObjectURL(takeBlob)
    els.take.src = takeUrl
    els.take.load()
    renderQuality(takeQuality)
    takeSaved = false
    els.retry.disabled = false
    updateSaveState()
    refreshTakeStatus()
  } catch (error) {
    if (generation !== takeGeneration) return
    els.save.disabled = true
    setStatus(`Non riesco a convertire la ripresa in WAV: ${error.message}`, 'error')
  }
}

const startRecording = async () => {
  if (isRecording) return
  if (!(await enableMic())) return
  if (typeof MediaRecorder === 'undefined') {
    setStatus('Questo browser non supporta la registrazione audio.', 'error')
    return
  }

  resetTake()
  const generation = takeGeneration
  const chunks = []
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
  const mimeType = candidates.find((type) => MediaRecorder.isTypeSupported(type)) || ''
  const currentRecorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 128000 } : { audioBitsPerSecond: 128000 })
  recorder = currentRecorder
  currentRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data)
  }
  currentRecorder.onstop = () => {
    finalizeRecording(currentRecorder, chunks, generation)
  }
  currentRecorder.start(250)

  isRecording = true
  startedAt = performance.now()
  els.record.disabled = true
  els.stop.disabled = false
  els.save.disabled = true
  els.retry.disabled = true
  els.prev.disabled = true
  els.next.disabled = true
  setStatus('Registrazione in corso…')
  timerId = window.setInterval(updateTimer, 100)
  levelRaf = requestAnimationFrame(updateLevel)
  maxTimer = window.setTimeout(() => {
    if (isRecording) {
      stopRecording()
      setStatus('Fermata automatica a 30 secondi: la riga è troppo lunga.', 'error')
    }
  }, 30_000)
}

const stopRecording = () => {
  if (!isRecording) return
  isRecording = false
  window.clearInterval(timerId)
  window.clearTimeout(maxTimer)
  cancelAnimationFrame(levelRaf)
  els.level.style.width = '0%'
  els.record.disabled = false
  els.stop.disabled = true
  els.prev.disabled = false
  els.next.disabled = false
  recorder?.stop()
}

const saveRecording = async () => {
  if (!takeBlob || !currentRow() || takeQuality?.grade === 'error' || takeSaved) return
  const profile = readSpeakerProfile()
  if (!profile.valid) {
    setStatus('Prima di salvare inserisci parlante e riferimento consenso.', 'error')
    updateSaveState()
    return
  }
  if (ONLINE && !readToken()) {
    setStatus('Prima di salvare inserisci il codice di accesso dello studio online.', 'error')
    updateSaveState()
    return
  }

  const row = currentRow()
  els.save.disabled = true
  setStatus('Salvataggio nel corpus…')

  try {
    const query = `id=${encodeURIComponent(row.id)}${row.recorded ? '&overwrite=1' : ''}`
    const response = await fetch(`/api/record?${query}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'audio/wav',
        'X-Voice-Speaker': encodeURIComponent(profile.speaker),
        'X-Voice-Consent': encodeURIComponent(profile.consentRef),
        ...(ONLINE ? { 'X-Corvoc-Token': readToken() } : {}),
      },
      body: takeBlob,
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      if (response.status === 401) {
        setStatus('Codice di accesso non valido: controllalo e riprova.', 'error')
        updateSaveState()
        return
      }
      if (response.status === 503) {
        setStatus('Studio online non configurato: manca il codice o l’archivio.', 'error')
        updateSaveState()
        return
      }
      if (data.saved) {
        row.recorded = row.recorded || {
          file: data.file || null,
          url: `/api/audio?source=registrata&id=${encodeURIComponent(row.id)}&t=${Date.now()}`,
        }
        setAudioSource(els.recorded, row.recorded.url)
        renderList()
      }
      updateSaveState()
      setStatus(data.error || 'Salvataggio non riuscito.', 'error')
      return
    }

    if (data.metadata) {
      row.speaker = data.metadata.speaker
      row.consentRef = data.metadata.consentRef
      row.recordedAt = data.metadata.recordedAt
    }
    row.recorded = {
      file: data.file,
      url: `/api/audio?source=registrata&id=${encodeURIComponent(row.id)}&t=${Date.now()}`,
    }
    takeSaved = true
    setAudioSource(els.recorded, row.recorded.url)
    els.save.disabled = true
    els.save.textContent = 'Sostituisci nel corpus'
    setStatus(
      ONLINE
        ? `Salvata online per ${data.metadata?.speaker || profile.speaker}. Il corpus si aggiorna subito: ricarica l’app per ascoltarla.`
        : `Salvata per ${data.metadata?.speaker || profile.speaker}. Manifest aggiornato: ricarica l’app per ascoltarla nel traduttore.`,
      'ok',
    )
    updateProgress()
    renderList()

    window.setTimeout(() => {
      const next = rows.findIndex((item, index) => index > currentIndex && !item.recorded)
      if (next !== -1) selectRow(next)
    }, 1100)
  } catch (error) {
    updateSaveState()
    setStatus(`Salvataggio non riuscito: ${error.message}`, 'error')
  }
}

const boot = async () => {
  restoreSpeakerProfile()
  try {
    const response = await fetch('/api/script')
    if (!response.ok) throw new Error('Il server dello studio non risponde.')
    const data = await response.json()
    rows = data.rows
    if (data.metadataFile) els.metadataPath.textContent = data.metadataFile
    renderGroups()
    updateProgress()
    const firstMissing = rows.findIndex((row) => !row.recorded)
    selectRow(firstMissing === -1 ? 0 : firstMissing)
  } catch (error) {
    setStatus(`Impossibile leggere il copione: ${error.message}`, 'error')
    els.line.textContent = ONLINE
      ? 'Lo studio online non è raggiungibile o non è configurato.'
      : 'Avvia lo studio con npm run voice:record.'
  }
}

els.enable.addEventListener('click', enableMic)
els.speaker.addEventListener('input', updateSpeakerState)
els.consent.addEventListener('input', updateSpeakerState)
els.token?.addEventListener('input', () => {
  persistToken()
  updateSpeakerState()
})
els.clearSpeaker.addEventListener('click', () => {
  els.speaker.value = ''
  els.consent.value = ''
  try {
    localStorage.removeItem(SPEAKER_STORAGE_KEY)
  } catch {
    // Niente da fare se localStorage non è disponibile.
  }
  updateSpeakerState()
  setSpeakerStatus('Dati del parlante cancellati da questo browser.', '')
})
els.record.addEventListener('click', startRecording)
els.stop.addEventListener('click', stopRecording)
els.save.addEventListener('click', saveRecording)
els.retry.addEventListener('click', () => {
  resetTake()
  startRecording()
})
els.prev.addEventListener('click', () => selectRow(currentIndex - 1))
els.next.addEventListener('click', () => selectRow(currentIndex + 1))
els.group.addEventListener('change', renderList)
els.filter.addEventListener('change', renderList)
els.search.addEventListener('input', renderList)

document.addEventListener('keydown', (event) => {
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName) || event.target.closest('button, audio')) return

  if (event.code === 'Space') {
    event.preventDefault()
    if (isRecording) stopRecording()
    else startRecording()
  } else if (event.key === 'Enter' && takeBlob && !els.save.disabled) {
    event.preventDefault()
    saveRecording()
  } else if (event.key.toLocaleLowerCase('it') === 'r') {
    event.preventDefault()
    resetTake()
    startRecording()
  } else if (event.key === 'ArrowLeft') {
    selectRow(currentIndex - 1)
  } else if (event.key === 'ArrowRight') {
    selectRow(currentIndex + 1)
  }
})

boot()

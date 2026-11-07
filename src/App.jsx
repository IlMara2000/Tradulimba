import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRightLeft,
  AudioLines,
  BookOpenText,
  Check,
  Clipboard,
  Clock3,
  Copy,
  ExternalLink,
  Info,
  Languages,
  LoaderCircle,
  MapPinned,
  ShieldCheck,
  Sparkles,
  Square,
  Trash2,
  Volume2,
  X,
} from 'lucide-react'
import NaraPromo from './components/NaraPromo'
import {
  addTranslationHistoryEntry,
  loadTranslationHistory,
  saveTranslationHistory,
} from './features/translation/history'

const loadNaraGame = () => import('./components/NaraGame')
const NaraGame = lazy(loadNaraGame)

const MAX_CHARACTERS = 4000
const MAX_SPEECH_CHARACTERS = 1000

const LANGUAGE_LABELS = {
  ita: 'Italiano',
  srd: 'Sardu',
}

const VARIANTS = [
  { id: 'lsc', short: 'Sardu comune', label: 'Limba Sarda Comuna', note: 'Standard scritto' },
  { id: 'campidanese', short: 'Campidanesu', label: 'Campidanesu', note: 'Assistito · sud' },
  { id: 'logudorese', short: 'Logudoresu', label: 'Logudoresu', note: 'Assistito · centro-nord' },
]

const EXAMPLES = [
  'Buongiorno, come stai?',
  'La lingua custodisce la memoria di un popolo.',
  'Dove si trova la fermata dell’autobus?',
]

const getVariant = (variantId) => (
  VARIANTS.find((variant) => variant.id === variantId) || VARIANTS[0]
)

const browserSpeech = (text, language, variant, onEnd, onError) => {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return null

  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'it-IT'
  utterance.rate = language === 'srd' ? 0.86 : 0.94
  utterance.pitch = variant === 'campidanese' ? 1.03 : 0.98
  utterance.onend = onEnd
  utterance.onerror = onError

  const italianVoice = window.speechSynthesis
    .getVoices()
    .find((voice) => voice.lang?.toLowerCase().startsWith('it'))
  if (italianVoice) utterance.voice = italianVoice

  window.speechSynthesis.speak(utterance)
  return utterance
}

function BrandMark({ compact = false }) {
  return (
    <span className={`brand-mark${compact ? ' brand-mark--compact' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 48 48" role="img">
        <path className="brand-mark__bubble" d="M9 8.5h30a4.5 4.5 0 0 1 4.5 4.5v19A4.5 4.5 0 0 1 39 36.5H23l-8.5 6v-6H9A4.5 4.5 0 0 1 4.5 32V13A4.5 4.5 0 0 1 9 8.5Z" />
        <path className="brand-mark__wave brand-mark__wave--green" d="M12 26v-7" />
        <path className="brand-mark__wave brand-mark__wave--yellow" d="M20 30V15" />
        <path className="brand-mark__wave brand-mark__wave--orange" d="M28 27V18" />
        <path className="brand-mark__wave brand-mark__wave--blue" d="M36 30V15" />
      </svg>
    </span>
  )
}

function LanguageSwitch({ source, target, onSwap }) {
  return (
    <div className="language-switch" aria-label="Lingue della traduzione">
      <div className="language-switch__side">
        <span className="eyebrow">Da</span>
        <strong>{LANGUAGE_LABELS[source]}</strong>
      </div>
      <button
        type="button"
        className="swap-button"
        onClick={onSwap}
        aria-label="Scambia italiano e sardo"
        title="Scambia lingue"
      >
        <ArrowRightLeft size={20} strokeWidth={2.1} />
      </button>
      <div className="language-switch__side language-switch__side--right">
        <span className="eyebrow">A</span>
        <strong>{LANGUAGE_LABELS[target]}</strong>
      </div>
    </div>
  )
}

function App() {
  const [source, setSource] = useState('ita')
  const [target, setTarget] = useState('srd')
  const [variant, setVariant] = useState('lsc')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [status, setStatus] = useState('idle')
  const [audioStatus, setAudioStatus] = useState('idle')
  const [error, setError] = useState('')
  const [translationNotice, setTranslationNotice] = useState('')
  const [audioNotice, setAudioNotice] = useState('')
  const [resultMeta, setResultMeta] = useState(null)
  const [copied, setCopied] = useState(false)
  const [history, setHistory] = useState(loadTranslationHistory)
  const [showInfo, setShowInfo] = useState(false)
  const [showGame, setShowGame] = useState(false)
  const requestRef = useRef(null)
  const requestSequenceRef = useRef(0)
  const speechRequestRef = useRef(null)
  const audioRef = useRef(null)
  const utteranceRef = useRef(null)
  const textAreaRef = useRef(null)
  const infoButtonRef = useRef(null)
  const modalRef = useRef(null)
  const closeButtonRef = useRef(null)

  const isLoading = status === 'loading'
  const resultVariantLabel = useMemo(() => {
    if (output && resultMeta?.variantApplied === false) {
      return target === 'srd' ? 'LSC · fallback' : 'Da LSC · fallback'
    }
    const effectiveVariant = getVariant(resultMeta?.effectiveVariant || variant)
    return target === 'srd' ? effectiveVariant.short : `Da ${effectiveVariant.short}`
  }, [output, resultMeta, target, variant])

  // Un termine del glossario può non comparire nel risultato: la forma
  // preferita resta visibile come divergenza da verificare.
  const glossaryHits = useMemo(() => {
    const hits = resultMeta?.glossary
    if (!Array.isArray(hits) || !output) return []
    const haystack = output.toLocaleLowerCase('it')
    return hits.map((item) => ({
      ...item,
      applied: haystack.includes(item.translation.toLocaleLowerCase('it')),
    }))
  }, [output, resultMeta])

  const cancelTranslation = useCallback(() => {
    requestSequenceRef.current += 1
    requestRef.current?.abort()
    requestRef.current = null
  }, [])

  const stopPlayback = useCallback(() => {
    speechRequestRef.current?.abort()
    speechRequestRef.current = null

    const currentAudio = audioRef.current
    audioRef.current = null
    if (currentAudio) {
      currentAudio.pause()
      currentAudio.removeAttribute('src')
      currentAudio.load()
    }

    utteranceRef.current = null
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    setAudioStatus('idle')
  }, [])

  useEffect(() => () => {
    requestRef.current?.abort()
    speechRequestRef.current?.abort()
    audioRef.current?.pause()
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  }, [])

  useEffect(() => {
    if (!showInfo) return undefined

    const previouslyFocused = document.activeElement
    const pageRegions = document.querySelectorAll('.site-header, main, .site-footer')
    pageRegions.forEach((region) => region.setAttribute('inert', ''))
    closeButtonRef.current?.focus()

    const handleModalKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setShowInfo(false)
        return
      }

      if (event.key !== 'Tab' || !modalRef.current) return
      const focusable = [...modalRef.current.querySelectorAll(
        'button:not(:disabled), a[href], textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      )]
      if (!focusable.length) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleModalKeyDown)
    return () => {
      document.removeEventListener('keydown', handleModalKeyDown)
      pageRegions.forEach((region) => region.removeAttribute('inert'))
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [showInfo])

  const addToHistory = (entry) => {
    setHistory((current) => {
      const next = addTranslationHistoryEntry(current, entry)
      saveTranslationHistory(next)
      return next
    })
  }

  const translate = async (textOverride, directionOverride = {}) => {
    const text = (typeof textOverride === 'string' ? textOverride : input).trim()
    const activeSource = directionOverride.source || source
    const activeTarget = directionOverride.target || target
    const activeVariant = directionOverride.variant || variant
    if (!text) return

    requestRef.current?.abort()
    const controller = new AbortController()
    const requestId = requestSequenceRef.current + 1
    requestSequenceRef.current = requestId
    requestRef.current = controller
    stopPlayback()
    setStatus('loading')
    setError('')
    setTranslationNotice('')
    setAudioNotice('')
    setResultMeta(null)
    setCopied(false)

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          source: activeSource,
          target: activeTarget,
          variant: activeVariant,
        }),
        signal: controller.signal,
      })
      const data = await response.json().catch(() => ({}))

      if (requestId !== requestSequenceRef.current || controller.signal.aborted) return

      if (!response.ok) {
        throw new Error(data.error || 'La traduzione non è disponibile in questo momento.')
      }

      const translatedText = typeof data.translation === 'string' ? data.translation.trim() : ''
      if (!translatedText) {
        throw new Error('Il servizio non ha restituito una traduzione valida. Riprova tra poco.')
      }

      const variantApplied = data.variantApplied !== false
      const effectiveVariant = variantApplied ? activeVariant : 'lsc'
      const warning = typeof data.warning === 'string' ? data.warning : ''
      const glossary = (Array.isArray(data.glossary) ? data.glossary : [])
        .slice(0, 4)
        .map((item) => ({
          term: typeof item?.term === 'string' ? item.term.trim() : '',
          translation: typeof item?.translation === 'string' ? item.translation.trim() : '',
          note: typeof item?.note === 'string' ? item.note.trim() : '',
        }))
        .filter((item) => item.term && item.translation)

      setOutput(translatedText)
      setStatus('success')
      setTranslationNotice(warning)
      setResultMeta({
        requestedVariant: activeVariant,
        effectiveVariant,
        variantApplied,
        engine: typeof data.engine === 'string' ? data.engine : '',
        glossary,
      })
      addToHistory({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        input: text,
        output: translatedText,
        source: activeSource,
        target: activeTarget,
        variant: activeVariant,
        effectiveVariant,
        variantApplied,
        createdAt: new Date().toISOString(),
        engine: data.engine,
        warning,
      })
    } catch (translationError) {
      if (translationError.name === 'AbortError' || requestId !== requestSequenceRef.current) return
      setStatus('error')
      setError(translationError.message || 'Non sono riuscito a tradurre il testo.')
    } finally {
      if (requestId === requestSequenceRef.current) requestRef.current = null
    }
  }

  const swapLanguages = () => {
    const hasResult = Boolean(output)
    const swappedVariant = hasResult ? resultMeta?.effectiveVariant || variant : variant
    cancelTranslation()
    stopPlayback()
    setSource(target)
    setTarget(source)
    setInput(output || input)
    setOutput(output ? input : '')
    if (hasResult) setVariant(swappedVariant)
    setResultMeta(hasResult ? {
      requestedVariant: resultMeta?.requestedVariant || swappedVariant,
      effectiveVariant: swappedVariant,
      variantApplied: resultMeta?.variantApplied !== false,
      engine: resultMeta?.engine || '',
    } : null)
    setStatus('idle')
    setError('')
    setTranslationNotice('')
    setAudioNotice('')
    window.setTimeout(() => textAreaRef.current?.focus(), 0)
  }

  const pasteText = async () => {
    cancelTranslation()
    stopPlayback()
    try {
      const clipboardText = await navigator.clipboard.readText()
      if (clipboardText) {
        setInput(clipboardText.slice(0, MAX_CHARACTERS))
        setOutput('')
        setResultMeta(null)
        setStatus('idle')
        setError('')
        setTranslationNotice('')
        setAudioNotice('')
      }
    } catch {
      setError('Il browser non consente di leggere gli appunti. Incolla il testo manualmente.')
    }
  }

  const copyTranslation = async () => {
    if (!output) return
    try {
      await navigator.clipboard.writeText(output)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setError('Non riesco a copiare automaticamente. Seleziona il testo e copialo manualmente.')
    }
  }

  const playTranslation = async () => {
    if (!output) return
    if (audioStatus === 'loading' || audioStatus === 'playing') {
      stopPlayback()
      return
    }

    const spokenText = output
    const spokenLanguage = target
    const spokenVariant = resultMeta?.effectiveVariant || variant
    const playDeviceVoice = (reason = '') => {
      const utterance = browserSpeech(
        spokenText,
        spokenLanguage,
        spokenVariant,
        () => {
          if (utteranceRef.current !== utterance) return
          utteranceRef.current = null
          setAudioStatus('idle')
        },
        () => {
          if (utteranceRef.current !== utterance) return
          utteranceRef.current = null
          setAudioStatus('idle')
          setError('La voce si è interrotta su questo dispositivo.')
        },
      )

      if (!utterance) {
        setAudioStatus('idle')
        setError('La voce non è disponibile su questo dispositivo.')
        return
      }

      utteranceRef.current = utterance
      setAudioStatus('playing')
      setAudioNotice(reason || (spokenLanguage === 'srd'
        ? 'Voce del dispositivo attiva: la pronuncia sarda è solo indicativa.'
        : 'Voce italiana del dispositivo attiva.'))
    }

    if (spokenText.length > MAX_SPEECH_CHARACTERS) {
      playDeviceVoice(`Per testi oltre ${MAX_SPEECH_CHARACTERS.toLocaleString('it-IT')} caratteri uso la voce del dispositivo; la pronuncia sarda resta indicativa.`)
      return
    }

    const controller = new AbortController()
    speechRequestRef.current = controller
    setAudioStatus('loading')
    setError('')
    setAudioNotice('')

    try {
      const response = await fetch('/api/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: spokenText, language: spokenLanguage, variant: spokenVariant }),
        signal: controller.signal,
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.audio) throw new Error(data.error || 'Voce AI non disponibile')
      if (controller.signal.aborted) return

      const audio = new Audio(`data:${data.mediaType || 'audio/mpeg'};base64,${data.audio}`)
      audioRef.current = audio
      audio.addEventListener('ended', () => {
        if (audioRef.current !== audio) return
        audioRef.current = null
        setAudioStatus('idle')
      }, { once: true })
      audio.addEventListener('error', () => {
        if (audioRef.current !== audio) return
        audioRef.current = null
        setAudioStatus('idle')
        setError('Non riesco a riprodurre l’audio generato.')
      }, { once: true })
      await audio.play()
      setAudioStatus('playing')
      if (Array.isArray(data.warnings) && data.warnings.length > 0) {
        setAudioNotice('Audio generato, con resa della pronuncia indicativa segnalata dal servizio vocale.')
      } else if (spokenLanguage === 'srd') {
        setAudioNotice('Audio assistito: la pronuncia può variare da paese a paese.')
      }
    } catch (speechError) {
      if (speechError.name === 'AbortError' || controller.signal.aborted) return
      const failedAudio = audioRef.current
      audioRef.current = null
      failedAudio?.pause()
      playDeviceVoice(spokenLanguage === 'srd'
        ? 'Il servizio vocale assistito non è disponibile: uso la voce del dispositivo, con pronuncia sarda indicativa.'
        : 'Il servizio vocale assistito non è disponibile: uso la voce italiana del dispositivo.')
    } finally {
      if (speechRequestRef.current === controller) speechRequestRef.current = null
    }
  }

  const clearAll = () => {
    cancelTranslation()
    stopPlayback()
    setInput('')
    setOutput('')
    setResultMeta(null)
    setStatus('idle')
    setError('')
    setTranslationNotice('')
    setAudioNotice('')
    textAreaRef.current?.focus()
  }

  const handleExample = (example) => {
    cancelTranslation()
    stopPlayback()
    setSource('ita')
    setTarget('srd')
    setInput(example)
    setOutput('')
    setStatus('idle')
    translate(example, { source: 'ita', target: 'srd', variant })
  }

  const restoreHistory = (item) => {
    cancelTranslation()
    stopPlayback()
    setSource(item.source)
    setTarget(item.target)
    setVariant(item.variant)
    setInput(item.input)
    setOutput(item.output)
    setResultMeta({
      requestedVariant: item.variant,
      effectiveVariant: item.effectiveVariant,
      variantApplied: item.variantApplied,
      engine: item.engine,
    })
    setStatus('success')
    setError('')
    setTranslationNotice(item.warning || '')
    setAudioNotice('')
    document.querySelector('.translator-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const clearHistory = () => {
    if (!window.confirm('Vuoi eliminare tutte le traduzioni salvate su questo dispositivo?')) return
    setHistory([])
    saveTranslationHistory([])
  }

  const selectVariant = (variantId) => {
    cancelTranslation()
    stopPlayback()
    setVariant(variantId)
    setOutput('')
    setResultMeta(null)
    setStatus('idle')
    setTranslationNotice('')
    setAudioNotice('')
  }

  const handleVariantKeyDown = (event, currentIndex) => {
    const direction = {
      ArrowRight: 1,
      ArrowDown: 1,
      ArrowLeft: -1,
      ArrowUp: -1,
    }[event.key]
    let nextIndex = direction === undefined
      ? currentIndex
      : (currentIndex + direction + VARIANTS.length) % VARIANTS.length

    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = VARIANTS.length - 1
    if (nextIndex === currentIndex && !['Home', 'End'].includes(event.key)) return

    event.preventDefault()
    selectVariant(VARIANTS[nextIndex].id)
    event.currentTarget.parentElement
      ?.querySelectorAll('[role="radio"]')
      ?.[nextIndex]
      ?.focus()
  }

  if (showGame) {
    return (
      <Suspense fallback={<main className="nara-loading" role="status"><LoaderCircle className="spin" /><span>Carico il percorso NARA…</span></main>}>
        <NaraGame
          onExit={() => {
            setShowGame(false)
            window.setTimeout(() => {
              const launcher = document.querySelector('[data-nara-launcher]')
              if (launcher instanceof HTMLElement) launcher.focus()
            }, 0)
          }}
        />
      </Suspense>
    )
  }

  return (
    <div className="app-shell">
      <div className="page-texture" aria-hidden="true" />
      <a className="skip-link" href="#traduttore">Vai al traduttore</a>

      <header className="site-header">
        <a className="brand" href="#top" aria-label="TraduLimba, torna all’inizio">
          <BrandMark compact />
          <span className="brand__name">Tradu<span>Limba</span></span>
        </a>
        <nav className="site-nav" aria-label="Navigazione principale">
          <a href="#come-funziona">Come funziona</a>
          <button ref={infoButtonRef} type="button" className="nav-info" aria-label="Il progetto" onClick={() => setShowInfo(true)}>
            <Info size={17} />
            <span className="nav-info__label">Il progetto</span>
          </button>
        </nav>
        <span className="release-badge"><span className="release-badge__wide">Versione </span>1.0</span>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero__kicker"><Sparkles size={15} /> Italiano ↔ Sardu</div>
          <h1 id="hero-title">Ogni parola<br /><em>trova casa.</em></h1>
          <p>
            Traduci tra italiano e sardo rispettando la varietà che senti più vicina.
            Semplice, aperto, fatto per migliorare insieme.
          </p>
        </section>

        <section id="traduttore" className="translator-wrap" aria-label="Traduttore italiano sardo" tabIndex={-1}>
          <div className="translator-card">
            <LanguageSwitch source={source} target={target} onSwap={swapLanguages} />

            <div className="variant-bar">
              <div className="variant-bar__label">
                <MapPinned size={18} />
                <span>Quale sardo vuoi usare?</span>
              </div>
              <div className="variant-options" role="radiogroup" aria-label="Variante sarda">
                {VARIANTS.map((item, index) => (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={variant === item.id}
                    tabIndex={variant === item.id ? 0 : -1}
                    key={item.id}
                    className={`variant-option variant-option--${item.id}${variant === item.id ? ' is-active' : ''}`}
                    onClick={() => selectVariant(item.id)}
                    onKeyDown={(event) => handleVariantKeyDown(event, index)}
                  >
                    <span className="variant-option__name">
                      {variant === item.id && <Check size={14} strokeWidth={3} />}
                      {item.short}
                    </span>
                    <small>{item.note}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="translation-panels">
              <section className="text-panel text-panel--source">
                <div className="text-panel__heading">
                  <span>{LANGUAGE_LABELS[source]}</span>
                  <div className="text-panel__tools">
                    <button type="button" onClick={pasteText} title="Incolla dagli appunti">
                      <Clipboard size={17} />
                      <span>Incolla</span>
                    </button>
                    {input && (
                      <button type="button" onClick={clearAll} title="Cancella tutto" aria-label="Cancella tutto">
                        <X size={18} />
                      </button>
                    )}
                  </div>
                </div>
                <textarea
                  ref={textAreaRef}
                  value={input}
                  maxLength={MAX_CHARACTERS}
                  onChange={(event) => {
                    cancelTranslation()
                    stopPlayback()
                    setInput(event.target.value)
                    setOutput('')
                    setResultMeta(null)
                    setStatus('idle')
                    setError('')
                    setTranslationNotice('')
                    setAudioNotice('')
                  }}
                  onKeyDown={(event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                      event.preventDefault()
                      translate()
                    }
                  }}
                  placeholder="Scrivi o incolla un testo…"
                  aria-label={`Testo in ${LANGUAGE_LABELS[source]}`}
                  lang={source === 'srd' ? 'sc' : 'it'}
                />
                <div className="text-panel__footer">
                  <span className="character-count">{input.length.toLocaleString('it-IT')} / {MAX_CHARACTERS.toLocaleString('it-IT')}</span>
                  <span className="keyboard-hint">Ctrl/⌘ Invio per tradurre</span>
                </div>
              </section>

              <section className="text-panel text-panel--result" aria-live="polite" aria-busy={isLoading}>
                <div className="text-panel__heading">
                  <span>{LANGUAGE_LABELS[target]}</span>
                  <span className="result-variant">{resultVariantLabel}</span>
                </div>
                <div className={`translation-output${!output ? ' is-empty' : ''}`} lang={output && target === 'srd' ? 'sc' : 'it'}>
                  {isLoading ? (
                    <div className="loading-copy">
                      <LoaderCircle className="spin" size={25} />
                      <span>Stiamo cercando le parole giuste…</span>
                    </div>
                  ) : output || 'La traduzione apparirà qui.'}
                </div>
                <div className="text-panel__footer result-actions">
                  <button type="button" onClick={copyTranslation} disabled={!output}>
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                    {copied ? 'Copiata' : 'Copia'}
                  </button>
                  <button type="button" onClick={playTranslation} disabled={!output}>
                    {audioStatus === 'loading' && <LoaderCircle className="spin" size={18} />}
                    {audioStatus === 'playing' && <Square size={17} fill="currentColor" />}
                    {audioStatus === 'idle' && <Volume2 size={18} />}
                    {audioStatus === 'loading' ? 'Annulla' : audioStatus === 'playing' ? 'Ferma' : 'Ascolta'}
                    <span className="voice-tag">assistita</span>
                  </button>
                </div>
                {!isLoading && glossaryHits.length > 0 && (
                  <div className="glossary-hits" aria-label="Termini del glossario presenti nel testo">
                    <span className="glossary-hits__label"><BookOpenText size={15} /> Glossario</span>
                    <ul>
                      {glossaryHits.map((item) => (
                        <li
                          key={`${item.term}-${item.translation}`}
                          className={item.applied ? 'is-applied' : 'is-missing'}
                          title={item.applied
                            ? (item.note || 'Forma del glossario presente nel risultato.')
                            : 'La forma del glossario non compare nel risultato: verificala con un parlante.'}
                        >
                          <span lang={source === 'srd' ? 'sc' : 'it'}>{item.term}</span>
                          <ArrowRightLeft size={11} aria-hidden="true" />
                          <strong lang={source === 'srd' ? 'it' : 'sc'}>{item.translation}</strong>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            </div>

            {(error || translationNotice) && (
              <div className={`inline-message${error ? ' inline-message--error' : ''}`} role={error ? 'alert' : 'status'}>
                <Info size={17} />
                <span>{error || translationNotice}</span>
              </div>
            )}
            {audioNotice && !error && (
              <div className="inline-message inline-message--audio" role="status">
                <AudioLines size={17} />
                <span>{audioNotice}</span>
              </div>
            )}

            <div className="translate-row">
              <div className="engine-note">
                <ShieldCheck size={17} />
                <span>Il testo passa ai servizi linguistici; solo la cronologia resta su questo dispositivo.</span>
              </div>
              <button
                type="button"
                className="translate-button"
                onClick={() => translate()}
                disabled={!input.trim() || isLoading}
              >
                {isLoading ? <LoaderCircle className="spin" size={20} /> : <Languages size={20} />}
                {isLoading ? 'Traduzione…' : 'Traduci'}
              </button>
            </div>
          </div>

          <div className="examples" aria-label="Frasi di esempio">
            <span>Prova con</span>
            {EXAMPLES.map((example) => (
              <button key={example} type="button" onClick={() => handleExample(example)}>
                “{example}”
              </button>
            ))}
          </div>
        </section>

        {history.length > 0 && (
          <section className="history-section" aria-labelledby="history-title">
            <div className="section-heading">
              <div>
                <span className="eyebrow"><Clock3 size={15} /> Sul tuo dispositivo</span>
                <h2 id="history-title">Traduzioni recenti</h2>
              </div>
              <button type="button" className="clear-history" onClick={clearHistory}>
                <Trash2 size={16} /> Cancella
              </button>
            </div>
            <div className="history-grid">
              {history.slice(0, 4).map((item) => (
                <button type="button" className="history-card" key={item.id} onClick={() => restoreHistory(item)}>
                  <span className="history-card__route">
                    {LANGUAGE_LABELS[item.source]} <ArrowRightLeft size={13} /> {LANGUAGE_LABELS[item.target]}
                  </span>
                  <strong lang={item.source === 'srd' ? 'sc' : 'it'}>{item.input}</strong>
                  <p lang={item.target === 'srd' ? 'sc' : 'it'}>{item.output}</p>
                  <small>{item.variantApplied === false ? 'Sardu comune · fallback' : getVariant(item.effectiveVariant).short}</small>
                </button>
              ))}
            </div>
          </section>
        )}

        <section id="come-funziona" className="how-section" aria-labelledby="how-title">
          <div className="how-intro">
            <span className="eyebrow">Un traduttore, più voci</span>
            <h2 id="how-title">Il sardo cambia<br />da zona a zona.</h2>
            <p>
              Per questo TraduLimba mostra sempre la varietà scelta. La LSC è il riferimento
              scritto; campidanese e logudorese usano un adattamento automatico da verificare con parlanti e linguisti.
            </p>
          </div>
          <div className="principles-grid">
            <article>
              <span className="principle-number">01</span>
              <BookOpenText size={24} />
              <h3>Base linguistica aperta</h3>
              <p>La traduzione standard parte dalla coppia italiano–sardo di Apertium, con regole verificabili.</p>
              <a href="https://github.com/apertium/apertium-srd-ita" target="_blank" rel="noreferrer">
                Scopri Apertium <ExternalLink size={14} />
              </a>
            </article>
            <article>
              <span className="principle-number">02</span>
              <MapPinned size={24} />
              <h3>Varietà dichiarate</h3>
              <p>Niente “sardo unico”: scegli LSC, campidanese o logudorese prima di tradurre.</p>
            </article>
            <article>
              <span className="principle-number">03</span>
              <AudioLines size={24} />
              <h3>Voce assistita</h3>
              <p>L’audio offre un riferimento d’ascolto, ma non sostituisce la pronuncia di un parlante nativo.</p>
            </article>
          </div>
        </section>

        <NaraPromo onPlay={() => setShowGame(true)} onWarmup={loadNaraGame} />
      </main>

      <footer className="site-footer">
        <div className="brand brand--footer">
          <BrandMark compact />
          <span className="brand__name">Tradu<span>Limba</span></span>
        </div>
        <p className="site-footer__tagline">Il sardo, in tutte le sue voci.</p>
        <button type="button" className="footer-info" onClick={() => setShowInfo(true)}>Privacy e limiti</button>
        <span>Versione ufficiale 1.0 · 2026</span>
        <p className="footer-declaration">SARDINIA NO EST ITALIA</p>
      </footer>

      {showInfo && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowInfo(false)}>
          <section
            ref={modalRef}
            className="info-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="info-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button ref={closeButtonRef} type="button" className="modal-close" onClick={() => setShowInfo(false)} aria-label="Chiudi">
              <X size={20} />
            </button>
            <BrandMark />
            <span className="eyebrow">Perché TraduLimba</span>
            <h2 id="info-title">Tecnologia al servizio di una lingua viva.</h2>
            <p>
              TraduLimba è un servizio pubblico di traduzione automatica, trasparente sui propri limiti
              e costruito per accogliere più varietà del sardo.
            </p>
            <h3>Come viene trattato il testo</h3>
            <p>
              Per tradurre, il contenuto viene inviato ad Apertium; gli adattamenti di varietà e la voce
              possono usare Vercel AI Gateway e il relativo fornitore AI. TraduLimba non richiede un account
              e salva nel browser soltanto cronologia e progressi NARA. Non inserire dati personali o sensibili.
            </p>
            <div className="modal-note">
              <Info size={19} />
              <span>Non usare senza revisione per testi medici, legali o amministrativi. Modi di dire, nomi propri e forme locali possono essere tradotti male.</span>
            </div>
            <button type="button" className="translate-button" onClick={() => setShowInfo(false)}>Inizia a tradurre</button>
          </section>
        </div>
      )}
    </div>
  )
}

export default App

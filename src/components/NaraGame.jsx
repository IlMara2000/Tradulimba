import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  Hand,
  Hash,
  Heart,
  House,
  Languages,
  LockKeyhole,
  MessagesSquare,
  RotateCcw,
  Signpost,
  Sparkles,
  Star,
  Trophy,
  UserRound,
  UsersRound,
  Utensils,
  XCircle,
  Zap,
} from 'lucide-react'
import {
  NARA_COURSE_REFERENCES,
  NARA_LEVEL_IDS,
  NARA_LEVELS,
} from '../features/nara/naraCourse'
import {
  completeNaraLevel,
  getCompletedLevelCount,
  getVisibleNaraLevels,
  isNaraLevelUnlocked,
  loadNaraProgress,
  saveNaraProgress,
} from '../features/nara/naraProgress'
import {
  continueNaraSession,
  createNaraSession,
  getNaraScore,
  selectNaraAnswer,
  submitNaraAnswer,
} from '../features/nara/naraSession'
import NaraMark from './NaraMark'

const LEVEL_ICONS = {
  hand: Hand,
  user: UserRound,
  hash: Hash,
  users: UsersRound,
  house: House,
  utensils: Utensils,
  clock: Clock3,
  signpost: Signpost,
  languages: Languages,
  messages: MessagesSquare,
}

function LevelIcon({ name, size = 26 }) {
  const Icon = LEVEL_ICONS[name] || Sparkles
  return <Icon size={size} aria-hidden="true" />
}

function NaraTopbar({ completedCount, totalXp, isMap, onBack }) {
  return (
    <header className="nara-game__header">
      <button type="button" className="nara-icon-button" onClick={onBack} aria-label={isMap ? 'Torna a TraduLimba' : 'Torna al percorso'}>
        <ArrowLeft />
      </button>
      <div className="nara-game__brand"><NaraMark compact /><strong>NARA!</strong></div>
      <div className="nara-game__stats" aria-label="Statistiche del percorso">
        <span><Zap size={16} fill="currentColor" /> {totalXp} XP</span>
        <span>{completedCount} / {NARA_LEVELS.length}</span>
      </div>
    </header>
  )
}

function NaraMap({ progress, onStart }) {
  const titleRef = useRef(null)
  const completedCount = getCompletedLevelCount(progress, NARA_LEVEL_IDS)
  const visibleLevels = getVisibleNaraLevels(progress, NARA_LEVELS)

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  return (
    <main className="nara-map">
      <section className="nara-map__intro">
        <div>
          <span className="eyebrow">Sentiero base · LSC</span>
          <h1 ref={titleRef} tabIndex={-1}>Parola dopo parola,<br />la limba si fa vicina.</h1>
        </div>
        <div className="nara-map__summary">
          <Star size={21} fill="currentColor" />
          <div><strong>{completedCount === 0 ? 'Pronti, via!' : `${completedCount} di 10`}</strong><small>{completedCount === 0 ? 'Inizia dai saluti' : 'Livelli completati'}</small></div>
        </div>
      </section>

      <ol className="nara-path" aria-label={`Percorso di ${NARA_LEVEL_IDS.length} livelli`}>
        {visibleLevels.map((level, index) => {
          const completion = progress.completed[level.id]
          const isComplete = Boolean(completion)
          const isCurrent = !isComplete && index === completedCount

          return (
            <li key={level.id} className={`nara-path__item nara-path__item--${level.color}${isComplete ? ' is-complete' : ''}${isCurrent ? ' is-current' : ''}`}>
              <button type="button" className="nara-level" onClick={() => onStart(level)}>
                <span className="nara-level__number">{String(level.number).padStart(2, '0')}</span>
                <span className="nara-level__icon"><LevelIcon name={level.icon} />{isComplete && <Check size={15} strokeWidth={3} />}</span>
                <span className="nara-level__copy">
                  <strong>{level.title}</strong>
                  <small>{level.objective}</small>
                  <em>{isComplete ? `Completato · ${completion.bestScore}% · Rigioca` : 'Disponibile · 4 sfide'}</em>
                </span>
                <ChevronRight className="nara-level__arrow" />
              </button>
            </li>
          )
        })}
      </ol>

      {completedCount < NARA_LEVELS.length && (
        <div className="nara-path__locked" role="status">
          <LockKeyhole size={18} />
          <span>Completa questo livello: il passo successivo apparirà qui.</span>
        </div>
      )}

      {completedCount === NARA_LEVELS.length && (
        <div className="nara-path__complete">
          <Trophy size={24} />
          <div><strong>Sentiero completato!</strong><span>Tutti i livelli restano disponibili per allenarti.</span></div>
        </div>
      )}

      <aside className="nara-course-note">
        <strong>Una base comune, non un sardo “unico”.</strong>
        <p>NARA! usa la LSC come riferimento scritto. Pronuncia e parole possono cambiare da paese a paese.</p>
        <div>
          {NARA_COURSE_REFERENCES.map((reference) => (
            <a key={reference.href} href={reference.href} target="_blank" rel="noreferrer">
              {reference.label} <ExternalLink size={13} />
            </a>
          ))}
        </div>
      </aside>
    </main>
  )
}

function Dialogue({ lines }) {
  const detailsRef = useRef(null)

  useEffect(() => {
    if (detailsRef.current) detailsRef.current.open = true
  }, [])

  if (!lines) return null

  return (
    <details ref={detailsRef} className="nara-dialogue">
      <summary>Rileggi il dialogo</summary>
      <div>
        {lines.map(([speaker, text], index) => (
          <p key={`${speaker}-${index}`} className={speaker === 'B' ? 'is-speaker-b' : ''}>
            <b>{speaker}</b><span>{text}</span>
          </p>
        ))}
      </div>
    </details>
  )
}

function NaraLesson({ level, session, onSelect, onCheck, onContinue }) {
  const questionTitleRef = useRef(null)
  const question = level.questions.find(({ id }) => id === session.queue[0])
  const masteredCount = session.mastered.length
  const questionCount = level.questions.length
  const progressPercent = Math.round((masteredCount / questionCount) * 100)

  useEffect(() => {
    if (!session.feedback) questionTitleRef.current?.focus()
  }, [question?.id, session.feedback])

  if (!question) return null

  const optionClass = (index) => {
    if (!session.feedback) return session.selectedIndex === index ? ' is-selected' : ''
    if (index === session.feedback.correctIndex) return ' is-correct'
    if (index === session.feedback.selectedIndex) return ' is-incorrect'
    return ''
  }

  return (
    <main className="nara-lesson">
      <div className="nara-lesson__status">
        <div
          className="nara-lesson__progress"
          role="progressbar"
          aria-label="Progresso della lezione"
          aria-valuemin={0}
          aria-valuemax={questionCount}
          aria-valuenow={masteredCount}
        >
          <span style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="nara-hearts" aria-live="polite" aria-label={`${session.hearts} vite rimaste`}>
          {Array.from({ length: 3 }, (_, index) => (
            <Heart key={index} size={21} fill={index < session.hearts ? 'currentColor' : 'none'} className={index < session.hearts ? '' : 'is-empty'} />
          ))}
          <strong>{session.hearts}</strong>
        </div>
      </div>

      <section className="nara-question">
        <div className="nara-question__meta">
          <span>Livello {level.number} · {level.title}</span>
          <span>{masteredCount + 1} / {questionCount}</span>
        </div>
        <Dialogue lines={level.dialogue} />
        <fieldset>
          <legend ref={questionTitleRef} tabIndex={-1}>{question.prompt}</legend>
          <div className="nara-options">
            {question.options.map((option, index) => (
              <button
                key={option}
                type="button"
                className={`nara-option${optionClass(index)}`}
                onClick={() => onSelect(index)}
                aria-pressed={session.selectedIndex === index}
                disabled={Boolean(session.feedback)}
              >
                <span>{index + 1}</span>
                <strong>{option}</strong>
                {session.feedback && index === session.feedback.correctIndex && <CheckCircle2 aria-label="Risposta corretta" />}
                {session.feedback && !session.feedback.isCorrect && index === session.feedback.selectedIndex && <XCircle aria-label="Risposta errata" />}
              </button>
            ))}
          </div>
        </fieldset>
      </section>

      <div className={`nara-answer-tray${session.feedback ? (session.feedback.isCorrect ? ' is-correct' : ' is-incorrect') : ''}`}>
        {session.feedback ? (
          <div className="nara-feedback" role="status" aria-live="polite">
            {session.feedback.isCorrect ? <CheckCircle2 /> : <XCircle />}
            <div>
              <strong>{session.feedback.isCorrect ? 'Perfetto!' : `Quasi! La risposta è “${question.options[question.answer]}”.`}</strong>
              <span>{question.note}</span>
            </div>
          </div>
        ) : (
          <span className="nara-answer-tray__hint">Scegli una risposta per continuare.</span>
        )}
        <button
          type="button"
          className="nara-primary-button"
          onClick={session.feedback ? onContinue : onCheck}
          disabled={!session.feedback && session.selectedIndex === null}
        >
          {session.feedback ? 'Continua' : 'Verifica'}
          <ChevronRight size={19} />
        </button>
      </div>
    </main>
  )
}

function NaraResult({ level, awardedXp, score, isCourseComplete, onMap, onReplay }) {
  const titleRef = useRef(null)

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  return (
    <main className="nara-outcome">
      <div className="nara-outcome__icon"><Trophy /></div>
      <span className="eyebrow">Livello completato</span>
      <h1 ref={titleRef} tabIndex={-1}>{isCourseComplete ? 'Hai percorso tutto il sentiero!' : 'Bravu, avanti così!'}</h1>
      <p>Hai concluso <strong>{level.title}</strong>. Da ora puoi rigiocarlo quando vuoi.</p>
      <div className="nara-rewards">
        <article><Zap size={24} fill="currentColor" /><strong>+{awardedXp} XP</strong><span>{awardedXp === 20 ? 'Primo completamento' : 'Allenamento'}</span></article>
        <article><Star size={24} fill="currentColor" /><strong>{score}%</strong><span>Precisione</span></article>
      </div>
      <div className="nara-outcome__actions">
        <button type="button" className="nara-secondary-button" onClick={onReplay}><RotateCcw size={18} /> Rigioca</button>
        <button type="button" className="nara-primary-button" onClick={onMap}>{isCourseComplete ? 'Torna al percorso' : 'Scopri il prossimo'} <ChevronRight size={18} /></button>
      </div>
    </main>
  )
}

function NaraFailed({ level, onMap, onRetry }) {
  const titleRef = useRef(null)

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  return (
    <main className="nara-outcome nara-outcome--failed">
      <div className="nara-outcome__icon"><Heart /></div>
      <span className="eyebrow">Vite finite</span>
      <h1 ref={titleRef} tabIndex={-1}>Un altro giro?</h1>
      <p><strong>{level.title}</strong> resta disponibile. Riparti con tre vite e prova ancora.</p>
      <div className="nara-outcome__actions">
        <button type="button" className="nara-secondary-button" onClick={onMap}>Torna al percorso</button>
        <button type="button" className="nara-primary-button" onClick={onRetry}><RotateCcw size={18} /> Riprova</button>
      </div>
    </main>
  )
}

export default function NaraGame({ onExit }) {
  const [progress, setProgress] = useState(() => loadNaraProgress(NARA_LEVEL_IDS))
  const [screen, setScreen] = useState('map')
  const [activeLevelId, setActiveLevelId] = useState(null)
  const [session, setSession] = useState(null)
  const [result, setResult] = useState({ awardedXp: 0, score: 100 })
  const [storageNotice, setStorageNotice] = useState('')
  const activeLevel = useMemo(
    () => NARA_LEVELS.find(({ id }) => id === activeLevelId) || null,
    [activeLevelId],
  )
  const completedCount = getCompletedLevelCount(progress, NARA_LEVEL_IDS)

  const returnToMap = useCallback(() => {
    setScreen('map')
    setSession(null)
  }, [])

  const handleBack = useCallback(() => {
    if (screen === 'map') {
      onExit()
      return
    }

    if (screen === 'lesson' && !window.confirm('Vuoi lasciare questa lezione? Le risposte del tentativo in corso andranno perse.')) {
      return
    }
    returnToMap()
  }, [onExit, returnToMap, screen])

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      handleBack()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [handleBack])

  const startLevel = (level) => {
    if (!isNaraLevelUnlocked(progress, level.id, NARA_LEVEL_IDS)) return
    setActiveLevelId(level.id)
    setSession(createNaraSession(level))
    setScreen('lesson')
  }

  const selectAnswer = (optionIndex) => {
    setSession((current) => selectNaraAnswer(current, optionIndex))
  }

  const checkAnswer = () => {
    setSession((current) => submitNaraAnswer(current, activeLevel))
  }

  const continueLesson = () => {
    const nextSession = continueNaraSession(session)

    if (nextSession.status === 'failed') {
      setSession(nextSession)
      setScreen('failed')
      return
    }

    if (nextSession.status === 'complete') {
      const score = getNaraScore(nextSession)
      const completion = completeNaraLevel(
        progress,
        activeLevel.id,
        NARA_LEVEL_IDS,
        score,
        new Date().toISOString(),
      )
      setProgress(completion.progress)
      if (!saveNaraProgress(completion.progress)) {
        setStorageNotice('Livello completato, ma il browser non consente di salvare il progresso in modo permanente.')
      }
      setResult({ awardedXp: completion.awardedXp, score })
      setSession(nextSession)
      setScreen('result')
      return
    }

    setSession(nextSession)
  }

  return (
    <div className="nara-game">
      <NaraTopbar
        completedCount={completedCount}
        totalXp={progress.totalXp}
        isMap={screen === 'map'}
        onBack={handleBack}
      />
      {storageNotice && <div className="nara-storage-notice" role="status">{storageNotice}</div>}
      {screen === 'map' && <NaraMap progress={progress} onStart={startLevel} />}
      {screen === 'lesson' && activeLevel && session && (
        <NaraLesson
          level={activeLevel}
          session={session}
          onSelect={selectAnswer}
          onCheck={checkAnswer}
          onContinue={continueLesson}
        />
      )}
      {screen === 'result' && activeLevel && (
        <NaraResult
          level={activeLevel}
          awardedXp={result.awardedXp}
          score={result.score}
          isCourseComplete={completedCount === NARA_LEVELS.length}
          onMap={returnToMap}
          onReplay={() => startLevel(activeLevel)}
        />
      )}
      {screen === 'failed' && activeLevel && (
        <NaraFailed
          level={activeLevel}
          onMap={returnToMap}
          onRetry={() => startLevel(activeLevel)}
        />
      )}
    </div>
  )
}

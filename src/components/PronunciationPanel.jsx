import { useMemo } from 'react'
import { AudioLines, BookOpenText, Info, Volume2 } from 'lucide-react'
import { compareVarieties } from '../features/linguistics/varieties.js'
import { buildSpeechScript } from '../features/translation/speechScript.js'

const SEVERITY_LABEL = {
  error: 'Errore',
  warning: 'Avviso',
  info: 'Nota',
}

function SyllableChips({ word, syllables, stressedIndex }) {
  const parts = Array.isArray(syllables) && syllables.length > 0 ? syllables : [word]
  return (
    <span className="syllable-chips" aria-label={`Sillabe di ${word}`}>
      {parts.map((syllable, index) => (
        <span
          // Le sillabe possono ripetersi: l'indice è l'unica chiave stabile.
          key={`${word}-${index}`}
          className={index === stressedIndex ? 'syllable-chip is-stressed' : 'syllable-chip'}
        >
          {syllable}
        </span>
      ))}
    </span>
  )
}

const MAX_IPA_DISPLAY = 600

function PronunciationPanel({ analysis, fixes = [], side = 'target', text = '', onSpeakStart = null, onSpeakWord = null }) {
  const comparison = useMemo(
    () => (side === 'target' && text ? compareVarieties(text) : []),
    [side, text],
  )

  if (!analysis || !Array.isArray(analysis.words) || analysis.words.length === 0) return null

  const visibleWords = analysis.words.slice(0, 8)
  const issues = Array.isArray(analysis.issues) ? analysis.issues : []
  const notes = Array.isArray(analysis.notes) ? analysis.notes : []
  const appliedFixes = Array.isArray(fixes) ? fixes : []
  const ipa = typeof analysis.ipa === 'string' && analysis.ipa.length > MAX_IPA_DISPLAY
    ? `${analysis.ipa.slice(0, MAX_IPA_DISPLAY)}…`
    : analysis.ipa
  const respelling = typeof analysis.respelling === 'string' && analysis.respelling.length > MAX_IPA_DISPLAY
    ? `${analysis.respelling.slice(0, MAX_IPA_DISPLAY)}…`
    : analysis.respelling

  const speakWord = (word) => {
    if (onSpeakWord) {
      onSpeakStart?.()
      onSpeakWord(word, analysis.variant)
      return
    }
    // Ripiego locale se il pannello viene usato fuori dal traduttore.
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return
    onSpeakStart?.()
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(buildSpeechScript(word, analysis.variant))
    utterance.lang = 'it-IT'
    utterance.rate = 0.82
    const italianVoice = window.speechSynthesis
      .getVoices()
      .find((voice) => voice.lang?.toLowerCase().startsWith('it'))
    if (italianVoice) utterance.voice = italianVoice
    window.speechSynthesis.speak(utterance)
  }

  return (
    <section className="pronunciation" aria-label="Pronuncia e analisi ortografica">
      <div className="pronunciation__head">
        <span className="pronunciation__title">
          <AudioLines size={16} />
          {side === 'source' ? 'Il sardo che hai scritto' : 'Pronuncia della traduzione'}
        </span>
        <span className="pronunciation__variant">{analysis.variantLabel}</span>
      </div>

      <p className="pronunciation__ipa" lang="sc">{ipa}</p>
      <p className="pronunciation__reading">
        <span>Come si legge</span>
        <strong lang="sc">{respelling}</strong>
      </p>

      <ul className="pronunciation__words">
        {visibleWords.map((word, index) => (
          <li key={`${word.word}-${index}`}>
            <span className="pronunciation__word" lang="sc">{word.word}</span>
            <SyllableChips word={word.word} syllables={word.syllables} stressedIndex={word.stressedIndex} />
            <span className="pronunciation__word-ipa">{word.ipa}</span>
            <button
              type="button"
              className="pronunciation__speak"
              onClick={() => speakWord(word.word)}
              aria-label={`Ascolta ${word.word}`}
              title="Ascolta la parola con la voce sarda del corpus o del motore; se manca, con la voce del dispositivo"
            >
              <Volume2 size={14} />
            </button>
            <small>{word.stressType}</small>
          </li>
        ))}
      </ul>
      {analysis.truncated && (
        <p className="pronunciation__more">
          Analizzate le prime {analysis.words.length} parole: il testo è più lungo.
        </p>
      )}

      {notes.length > 0 && (
        <details className="pronunciation__details">
          <summary><Info size={15} /> Note di pronuncia</summary>
          <ul>
            {notes.map((note) => <li key={note}>{note}</li>)}
          </ul>
        </details>
      )}

      {appliedFixes.length > 0 && (
        <details className="pronunciation__details">
          <summary><BookOpenText size={15} /> Correzioni ortografiche applicate</summary>
          <ul>
            {appliedFixes.map((fix) => (
              <li key={`${fix.rule}-${fix.after}`}>
                {fix.rule} <em>{fix.reference}</em>
              </li>
            ))}
          </ul>
        </details>
      )}

      {issues.length > 0 && (
        <details className="pronunciation__details pronunciation__details--issues" open>
          <summary><Info size={15} /> Controllo ortografico ({issues.length})</summary>
          <ul>
            {issues.map((issue, index) => (
              <li key={`${issue.code}-${index}`} className={`issue issue--${issue.severity}`}>
                <span className="issue__label">{SEVERITY_LABEL[issue.severity] || issue.severity}</span>
                <span>{issue.message}</span>
                {issue.suggestion && issue.suggestion !== issue.message && (
                  <span className="issue__suggestion">→ {issue.suggestion}</span>
                )}
                <em>{issue.reference}</em>
              </li>
            ))}
          </ul>
        </details>
      )}

      {comparison.length > 0 && (
        <details className="pronunciation__details">
          <summary><BookOpenText size={15} /> Confronta le varietà</summary>
          <div className="variety-compare">
            {comparison.map((item) => (
              <div key={item.id} className={`variety-compare__row variety-compare__row--${item.id}`}>
                <span>{item.label}</span>
                <p lang="sc">{item.text}</p>
                {item.note && <small>{item.note}</small>}
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  )
}

export default PronunciationPanel

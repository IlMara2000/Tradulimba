import { useMemo, useState } from 'react'
import {
  AudioLines,
  BookOpenText,
  ExternalLink,
  Info,
  MapPinned,
  Search,
  Sparkles,
} from 'lucide-react'
import PronunciationPanel from './PronunciationPanel'
import { analyzeSardinian } from '../features/linguistics/index.js'
import {
  ACCENT_RULES,
  ALPHABET_ROWS,
  COMMON_MISTAKES,
  GUIDE_SOURCES,
  GUIDE_TABS,
  SOUND_FEATURES,
  VARIETY_ROWS,
} from '../features/linguistics/guide.js'

const SAMPLE = 'Sas domos sunt mannas e su bentu est fretu.'

function AlphabetTable() {
  return (
    <div className="guide-table-wrap">
      <table className="guide-table">
        <caption>Grafemi della Limba Sarda Comuna e valore fonetico orientativo.</caption>
        <thead>
          <tr>
            <th scope="col">Grafema</th>
            <th scope="col">Suono</th>
            <th scope="col">Esempio</th>
            <th scope="col">Nota</th>
          </tr>
        </thead>
        <tbody>
          {ALPHABET_ROWS.map((row) => (
            <tr key={row.grapheme}>
              <th scope="row"><span lang="sc">{row.grapheme}</span></th>
              <td className="guide-table__ipa">{row.sound}</td>
              <td><span lang="sc">{row.example}</span></td>
              <td>{row.note || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AccentPanel() {
  return (
    <div className="guide-accent">
      {ACCENT_RULES.map((rule) => (
        <article key={rule.title}>
          <h3>{rule.title}</h3>
          <p>{rule.body}</p>
          {rule.examples.length > 0 && (
            <ul className="guide-examples">
              {rule.examples.map((example) => <li key={example} lang="sc">{example}</li>)}
            </ul>
          )}
        </article>
      ))}
      <div className="guide-callout">
        <Info size={18} />
        <p>
          La norma segna l’accento solo dove serve a indicare una tonica non penultima.
          Un testo sardo corretto non ha accenti su ogni parola: <span lang="sc">domo</span>,
          <span lang="sc"> sardu</span>, <span lang="sc">iscola</span> restano senza accento.
        </p>
      </div>
    </div>
  )
}

function SoundPanel() {
  return (
    <div className="guide-sounds">
      {SOUND_FEATURES.map((feature) => (
        <article key={feature.title}>
          <span className="guide-sounds__ipa">{feature.ipa}</span>
          <h3>{feature.title}</h3>
          <p>{feature.body}</p>
          <small>{feature.source}</small>
        </article>
      ))}
    </div>
  )
}

function VarietyPanel() {
  return (
    <div className="guide-variety">
      <div className="guide-table-wrap">
        <table className="guide-table">
          <caption>Tratti orientativi delle tre varietà offerte dal traduttore.</caption>
          <thead>
            <tr>
              <th scope="col">Tratto</th>
              <th scope="col">LSC</th>
              <th scope="col">Campidanese</th>
              <th scope="col">Logudorese</th>
            </tr>
          </thead>
          <tbody>
            {VARIETY_ROWS.map((row) => (
              <tr key={row.feature}>
                <th scope="row">{row.feature}</th>
                <td lang="sc">{row.lsc}</td>
                <td lang="sc">{row.campidanese}</td>
                <td lang="sc">{row.logudorese}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="guide-callout">
        <MapPinned size={18} />
        <p>
          I confini non sono netti: esistono parlate di transizione e ogni paese ha forme proprie.
          Anche il nuorese ha tratti specifici e non si riduce al logudorese.
          La LSC non sostituisce le varietà parlate: è una grafia di riferimento.
        </p>
      </div>
    </div>
  )
}

function MistakesPanel() {
  return (
    <div className="guide-mistakes">
      {COMMON_MISTAKES.map((item) => (
        <article key={item.wrong}>
          <p className="guide-mistakes__pair">
            <span className="is-wrong">{item.wrong}</span>
            <span aria-hidden="true">→</span>
            <strong lang="sc">{item.right}</strong>
          </p>
          <p>{item.why}</p>
        </article>
      ))}
    </div>
  )
}

function SourcesPanel() {
  return (
    <div className="guide-sources">
      <p className="guide-sources__intro">
        La guida distingue la norma scritta dalla pronuncia e cita le fonti. Le trascrizioni IPA
        sono larghe e orientative: la pronuncia cambia da paese a paese e, in alcuni dettagli,
        da parlante a parlante.
      </p>
      <ul>
        {GUIDE_SOURCES.map((source) => (
          <li key={source.href}>
            <a href={source.href} target="_blank" rel="noreferrer">
              {source.label} <ExternalLink size={13} />
            </a>
            <p>{source.note}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Analyzer() {
  const [sample, setSample] = useState(SAMPLE)
  const analysis = useMemo(() => analyzeSardinian(sample, { variant: 'lsc' }), [sample])

  return (
    <div className="guide-analyzer">
      <div className="guide-analyzer__head">
        <div>
          <span className="eyebrow"><Search size={14} /> Prova l’analisi</span>
          <h3>Scrivi in sardo e osserva sillabe, accento e IPA.</h3>
        </div>
        <label className="guide-analyzer__field">
          <span>Testo sardo (LSC)</span>
          <textarea
            value={sample}
            onChange={(event) => setSample(event.target.value.slice(0, 400))}
            rows={3}
            lang="sc"
            spellCheck="false"
            placeholder="Es. Sas domos sunt mannas."
          />
        </label>
      </div>
      <PronunciationPanel analysis={analysis} side="source" />
    </div>
  )
}

function LanguageGuide() {
  const [tab, setTab] = useState('alfabeto')
  const activeTab = GUIDE_TABS.find((item) => item.id === tab) || GUIDE_TABS[0]

  return (
    <section id="sa-limba" className="language-guide" aria-labelledby="sa-limba-title">
      <div className="language-guide__intro">
        <span className="eyebrow"><Sparkles size={15} /> Sa limba, oltre la traduzione</span>
        <h2 id="sa-limba-title">Scrivere e leggere<br />il sardo con criterio.</h2>
        <p>
          Alfabeto, accento, suoni e differenze tra varietà spiegati con le regole della
          Limba Sarda Comuna e con le fonti. Un’analisi automatica mostra sillabe, tonica,
          trascrizione IPA e punti da correggere.
        </p>
        <div className="language-guide__badges" aria-label="Contenuti della guida">
          <span><BookOpenText size={14} /> Norma LSC 2006</span>
          <span><AudioLines size={14} /> IPA e pronuncia</span>
          <span><MapPinned size={14} /> Tre varietà</span>
        </div>
      </div>

      <div className="language-guide__card">
        <div className="guide-tabs" role="tablist" aria-label="Sezioni della guida linguistica">
          {GUIDE_TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`guide-tab-${item.id}`}
              aria-selected={tab === item.id}
              aria-controls={tab === item.id ? `guide-panel-${item.id}` : undefined}
              tabIndex={tab === item.id ? 0 : -1}
              className={tab === item.id ? 'is-active' : ''}
              onClick={() => setTab(item.id)}
              onKeyDown={(event) => {
                if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
                event.preventDefault()
                const current = GUIDE_TABS.findIndex((entry) => entry.id === tab)
                const direction = event.key === 'ArrowRight' ? 1 : -1
                const next = GUIDE_TABS[(current + direction + GUIDE_TABS.length) % GUIDE_TABS.length]
                setTab(next.id)
                document.getElementById(`guide-tab-${next.id}`)?.focus()
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div
          className="guide-panel"
          role="tabpanel"
          id={`guide-panel-${activeTab.id}`}
          aria-labelledby={`guide-tab-${activeTab.id}`}
        >
          {tab === 'alfabeto' && (
            <>
              <p className="guide-panel__lead">
                L’alfabeto LSC usa le lettere dell’italiano con poche differenze decisive:
                <span lang="sc"> tz</span> e <span lang="sc">z</span> distinguono sorda e sonora,
                <span lang="sc"> j</span> è semivocale, <span lang="sc"> ll</span> non è la gl italiana.
                La <span lang="sc">q</span> non si usa; <span lang="sc">k, w, y, x</span> restano fuori
                dalla norma (la x appartiene alla grafia campidanese).
              </p>
              <AlphabetTable />
            </>
          )}

          {tab === 'accento' && (
            <>
              <p className="guide-panel__lead">
                L’accento grafico non segna ogni tonica: segna solo le tronche e le sdrucciole.
                Le piane restano senza accento. L’analisi qui sotto applica la stessa regola e
                propone le correzioni.
              </p>
              <AccentPanel />
              <Analyzer />
            </>
          )}

          {tab === 'suoni' && (
            <>
              <p className="guide-panel__lead">
                La LSC è una norma scritta: la pronuncia si appoggia alla varietà di chi legge.
                Questi sono i fenomeni che una grafia italiana da sola non rende.
              </p>
              <SoundPanel />
            </>
          )}

          {tab === 'varieta' && <VarietyPanel />}
          {tab === 'errori' && <MistakesPanel />}
          {tab === 'fonti' && <SourcesPanel />}
        </div>
      </div>
    </section>
  )
}

export default LanguageGuide

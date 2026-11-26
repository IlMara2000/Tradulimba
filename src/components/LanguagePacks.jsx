import { useEffect, useRef } from 'react'
import { Check, Download, Languages, ShieldCheck, X } from 'lucide-react'
import { OPTIONAL_LANGUAGE_PACKS } from '../features/translation/languagePacks.js'

export default function LanguagePacks({ open, installed, onInstall, onUninstall, onClose }) {
  const modalRef = useRef(null)
  const closeRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    const previouslyFocused = document.activeElement
    closeRef.current?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !modalRef.current) return

      const focusable = [...modalRef.current.querySelectorAll(
        'button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])',
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

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [open, onClose])

  if (!open) return null

  const installedSet = new Set(installed)

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        ref={modalRef}
        className="info-modal language-packs-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="language-packs-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button ref={closeRef} type="button" className="modal-close" onClick={onClose} aria-label="Chiudi">
          <X size={20} />
        </button>
        <span className="eyebrow"><Languages size={15} /> Lingue installabili</span>
        <h2 id="language-packs-title">Più lingue,<br />stesso traduttore.</h2>
        <p>
          Italiano e sardo restano sempre attivi. Installa le altre lingue per aggiungerle
          al traduttore: la scelta resta su questo dispositivo e puoi rimuoverla quando vuoi.
        </p>
        <div className="language-packs-grid">
          {OPTIONAL_LANGUAGE_PACKS.map((pack) => {
            const isInstalled = installedSet.has(pack.code)
            return (
              <article key={pack.code} className={`language-pack${isInstalled ? ' is-installed' : ''}`}>
                <span className="language-pack__tag" aria-hidden="true">{pack.tag}</span>
                <div className="language-pack__copy">
                  <strong>{pack.name}</strong>
                  <small lang={pack.htmlLang}>{pack.native}</small>
                </div>
                <button
                  type="button"
                  className="language-pack__action"
                  onClick={() => (isInstalled ? onUninstall(pack.code) : onInstall(pack.code))}
                  aria-label={`${isInstalled ? 'Rimuovi' : 'Installa'} ${pack.name}`}
                >
                  {isInstalled ? <Check size={15} /> : <Download size={15} />}
                  {isInstalled ? 'Rimuovi' : 'Installa'}
                </button>
              </article>
            )
          })}
        </div>
        <div className="modal-note">
          <ShieldCheck size={18} />
          <span>
            Le lingue extra passano dal fornitore AI del progetto. Senza gateway configurato
            restano installabili, ma non traducono.
          </span>
        </div>
      </section>
    </div>
  )
}

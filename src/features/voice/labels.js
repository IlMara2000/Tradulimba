// Etichette mostrate accanto al pulsante di ascolto. Servono a non far passare
// per sarda una voce italiana: la provenienza dell'audio è sempre dichiarata.

export const VOICE_SOURCE_LABELS = {
  registrata: 'Voce sarda registrata',
  sintetica: 'Voce sarda sintetica',
  motore: 'Voce sarda · motore',
  dispositivo: 'Voce italiana · approssimata',
}

export const VOICE_TAG_LABELS = {
  idle: 'sarda',
  registrata: 'registrata',
  sintetica: 'sintetica',
  motore: 'motore',
  dispositivo: 'italiana',
}

/**
 * Data della registrazione in formato italiano. La data è salvata in UTC e
 * mostrata in UTC per non cambiare giorno a seconda del fuso del dispositivo.
 * @param {string | null | undefined} value
 * @returns {string | null}
 */
const formatVoiceDate = (value) => {
  if (typeof value !== 'string' || !value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/**
 * Nota mostrata sotto il traduttore. Il testo sintetico non viene spacciato per
 * una registrazione: chi ascolta deve sapere se la voce è umana o generata.
 * Per le registrazioni umane la nota riporta parlante, riferimento al consenso
 * e data del take, quando presenti nel manifest.
 * @param {'registrata' | 'sintetica' | 'motore' | 'dispositivo'} source
 * @param {{
 *   speaker?: string | null,
 *   consentRef?: string | null,
 *   recordedAt?: string | null,
 *   engine?: string | null,
 *   warnings?: string[],
 * }} [details]
 * @returns {string}
 */
export const voiceNotice = (source, details = {}) => {
  const warnings = Array.isArray(details.warnings) ? details.warnings.filter(Boolean) : []
  const suffix = warnings.length > 0 ? ` ${warnings.join(' ')}` : ''

  if (source === 'registrata') {
    const speaker = details.speaker ? ` da ${details.speaker}` : ''
    const consent = details.consentRef ? ` Consenso: ${details.consentRef}.` : ''
    const date = formatVoiceDate(details.recordedAt)
    const recorded = date ? ` Registrata il ${date}.` : ''
    return `Voce sarda registrata${speaker}, presa dal corpus.${consent}${recorded}${suffix}`
  }
  if (source === 'sintetica') {
    return `Voce sarda sintetica (${details.engine || 'eSpeak NG · sc'}), dal corpus. Le registrazioni umane hanno priorità.${suffix}`
  }
  if (source === 'motore') {
    return `Voce generata dal motore TTS sardo ${details.engine ? `(${details.engine})` : 'configurato'}: non è una registrazione umana.${suffix}`
  }
  return 'Motore vocale sardo non disponibile: uso la voce italiana del dispositivo con una trascrizione fonetica approssimata.'
}

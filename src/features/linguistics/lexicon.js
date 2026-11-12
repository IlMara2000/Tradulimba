// Lessico di pronuncia.
//
// La grafia LSC non segna l'apertura di e/o (§5.1 delle norme regionali) e la
// posizione dell'accento si deduce dalla regola §4.2.6. Per le parole di uso
// frequente qui sotto la trascrizione è fissata una volta, così l'analisi non
// deve indovinare qualità vocalica e accento. I valori sono trascrizioni larghe
// in IPA, con l'accento primario sulla sillaba tonica: servono come guida di
// lettura, non come certificazione fonetica di ogni parlata.
//
// Le forme sono in LSC; il modulo phonology.js applica le differenze di varietà
// (vocale finale campidanese, lenizione) senza duplicare le voci.

/**
 * @typedef {object} PronunciationEntry
 * @property {string} ipa Trascrizione larga in IPA, con accento primario.
 * @property {string} [note]
 */

/** @type {Record<string, PronunciationEntry>} */
export const PRONUNCIATION_LEXICON = {
  // Saluti e cortesia
  salude: { ipa: 'saˈlude' },
  bona: { ipa: 'ˈbɔna' },
  die: { ipa: 'ˈdi.e', note: 'Iato: dì-e, non una sola sillaba.' },
  note: { ipa: 'ˈnɔte' },
  sera: { ipa: 'ˈsera' },
  gràtzias: { ipa: 'ˈɡratsjas', note: 'tz = [ts]; il nesso finale si riduce spesso a [sjas].' },
  meda: { ipa: 'ˈmeda' },
  praghere: { ipa: 'ˈpraɡere' },
  nudda: { ipa: 'ˈnuɖɖa', note: 'dd retroflessa.' },
  deo: { ipa: 'ˈde.o' },
  so: { ipa: 'so' },
  tue: { ipa: 'ˈtu.e' },
  ses: { ipa: 'ses' },
  issu: { ipa: 'ˈissu' },
  issa: { ipa: 'ˈissa' },
  est: { ipa: 'est' },
  semus: { ipa: 'ˈsemus' },
  seis: { ipa: 'ˈseis' },
  sunt: { ipa: 'sunt' },
  naro: { ipa: 'ˈnaro' },
  naras: { ipa: 'ˈnaras' },

  // Casa e famiglia
  domo: { ipa: 'ˈdɔmo', note: 'In campidanese la finale suona [u]: [ˈdɔmu].' },
  domos: { ipa: 'ˈdɔmos' },
  domu: { ipa: 'ˈdɔmu' },
  domus: { ipa: 'ˈdɔmus' },
  coghina: { ipa: 'koˈɡina' },
  bagnu: { ipa: 'ˈbaɲɲu' },
  mesa: { ipa: 'ˈmesa' },
  cadrea: { ipa: 'kaˈdrea' },
  mama: { ipa: 'ˈmama' },
  babbu: { ipa: 'ˈbabbu' },
  frade: { ipa: 'ˈfrade' },
  sorre: { ipa: 'ˈsorre' },
  fìgiu: { ipa: 'ˈfidʒu', note: 'gi = [dʒ], come l’italiano gi.' },
  fìgia: { ipa: 'ˈfidʒa' },

  // A tavola
  abba: { ipa: 'ˈabba' },
  casu: { ipa: 'ˈkazu' },
  pische: { ipa: 'ˈpiske' },
  pane: { ipa: 'ˈpane' },
  binu: { ipa: 'ˈbinu' },
  petza: { ipa: 'ˈpetsa', note: 'tz = [ts] sorda.' },
  ite: { ipa: 'ˈite' },
  boles: { ipa: 'ˈboles' },
  mandigare: { ipa: 'mandiˈɡare' },

  // Tempo e luoghi
  oe: { ipa: 'ˈo.e' },
  eris: { ipa: 'ˈeris' },
  cras: { ipa: 'kras' },
  mangianu: { ipa: 'manˈdʒanu' },
  merie: { ipa: 'meˈri.e' },
  sero: { ipa: 'ˈsero' },
  manca: { ipa: 'ˈmanka' },
  dereta: { ipa: 'deˈreta' },
  inoghe: { ipa: 'iˈnoɡe' },
  pratza: { ipa: 'ˈprattsa' },
  ue: { ipa: 'ˈu.e' },

  // Verbi e lessico di base
  èssere: { ipa: 'ˈessere' },
  àere: { ipa: 'ˈa.e.re' },
  libru: { ipa: 'ˈlibru' },
  faeddare: { ipa: 'fa.edˈdare', note: 'ae è iato: fa-ed-da-re.' },
  sardu: { ipa: 'ˈsardu' },
  bìvere: { ipa: 'ˈbivere' },
  limba: { ipa: 'ˈlimba' },
  terra: { ipa: 'ˈterra' },
  chelu: { ipa: 'ˈkelu' },
  gherra: { ipa: 'ˈɡerra' },
  gatu: { ipa: 'ˈɡatu' },
  manu: { ipa: 'ˈmanu' },
  mannu: { ipa: 'ˈmannu' },
  logu: { ipa: 'ˈloɡu' },
  cosa: { ipa: 'ˈkɔza' },
  bidda: { ipa: 'ˈbidda' },
  sedda: { ipa: 'ˈseɖɖa', note: 'dd retroflessa [ɖɖ].' },
  cuddu: { ipa: 'ˈkuɖɖu' },
  ando: { ipa: 'ˈando' },
  boxi: { ipa: 'ˈboʒi', note: 'In campidanese x = [ʒ].' },
  tziu: { ipa: 'ˈtsiu' },
  putzu: { ipa: 'ˈputsu' },
  fizu: { ipa: 'ˈfidzu', note: 'z = [dz] sonora.' },
  bìngia: { ipa: 'ˈbindʒa' },
  màllia: { ipa: 'ˈmaʎʎa', note: 'lli = [ʎʎ].' },
  campànnia: { ipa: 'kamˈpaɲɲa', note: 'nni = [ɲɲ].' },
  provìntzia: { ipa: 'proˈvintsja' },
  istùdiu: { ipa: 'isˈtudju' },
  cùcuru: { ipa: 'ˈkukuru' },
  fèmina: { ipa: 'ˈfemina' },
  òmine: { ipa: 'ˈomine' },
  pìbera: { ipa: 'ˈpibera' },
  iscola: { ipa: 'isˈkola' },
  matessi: { ipa: 'maˈtessi' },
  tribù: { ipa: 'triˈbu' },

  // Numeri
  unu: { ipa: 'ˈunu' },
  una: { ipa: 'ˈuna' },
  duos: { ipa: 'ˈdu.os' },
  duas: { ipa: 'ˈdu.as' },
  tres: { ipa: 'tres' },
  bator: { ipa: 'ˈbator' },
  chimbe: { ipa: 'ˈkimbe' },
  sete: { ipa: 'ˈsete' },
  oto: { ipa: 'ˈoto' },
  noe: { ipa: 'ˈno.e' },
  deghe: { ipa: 'ˈdeɡe' },
}

/**
 * Forme che la conversione a regole non deve toccare: monosillabi grammaticali,
 * prestiti e parole in cui la finale non è una vocale lessicale.
 * @type {ReadonlySet<string>}
 */
export const VARIANT_STOP_WORDS = new Set([
  'a', 'as', 'at', 'ant', 'amus', 'ades', 'apo', 'de', 'che', 'chi', 'ne', 'nen',
  'se', 'me', 'te', 'le', 'in', 'chin', 'chena', 'pro', 'cun', 'sin', 'non', 'no',
  'e', 'o', 'ma', 'ca', 'si', 'bi', 'mi', 'ti', 'lu', 'la', 'li', 'su', 'sa',
  'est', 'sunt', 'ses', 'so', 'seis', 'semus', 'cras', 'tres', 'et', 'ecce',
  'die', 'dies',
  'sardigna', 'sardegna', 'italia', 'nùgoro', 'cagliari', 'casteddu', 'oristano',
  'sassari', 'olbia', 'orosei', 'lanusei', 'tortolì', 'sanluri', 'villacidro',
])

/**
 * Termini italiani frequenti con la forma sarda consigliata. Sono segnalazioni
 * da verificare, non sostituzioni automatiche: in un testo sardo una parola
 * italiana può essere una citazione o un prestito voluto.
 * @type {Record<string, { suggestion: string, note?: string }>}
 */
export const ITALIANISMS = {
  ciao: { suggestion: 'salude' },
  buongiorno: { suggestion: 'bona die' },
  buonasera: { suggestion: 'bona sera' },
  buonanotte: { suggestion: 'bona note' },
  grazie: { suggestion: 'gràtzias' },
  citta: { suggestion: 'tzitade' },
  città: { suggestion: 'tzitade' },
  casa: { suggestion: 'domo', note: 'In sardo casa indica anche il focolare domestico.' },
  cucina: { suggestion: 'coghina' },
  finestra: { suggestion: 'ventana' },
  libro: { suggestion: 'libru' },
  perché: { suggestion: 'pro ite' },
  anche: { suggestion: 'fintzas' },
  molto: { suggestion: 'meda' },
  adesso: { suggestion: 'como' },
  oggi: { suggestion: 'oe' },
  domani: { suggestion: 'cras' },
  ieri: { suggestion: 'eris' },
  mangiare: { suggestion: 'mandigare' },
  parlare: { suggestion: 'faeddare' },
  acqua: { suggestion: 'abba' },
  vino: { suggestion: 'binu' },
  formaggio: { suggestion: 'casu' },
  pesce: { suggestion: 'pische' },
  carne: { suggestion: 'petza' },
  piazza: { suggestion: 'pratza' },
  sinistra: { suggestion: 'manca' },
  destra: { suggestion: 'dereta' },
  dove: { suggestion: 'in ue' },
  quando: { suggestion: 'cando' },
  come: { suggestion: 'comente' },
  ragazzo: { suggestion: 'tzìvalu' },
  bambino: { suggestion: 'pipiu' },
  grande: { suggestion: 'mannu' },
  piccolo: { suggestion: 'minore' },
  bello: { suggestion: 'bellu' },
  brutto: { suggestion: 'feu' },
  strada: { suggestion: 'istrada' },
  paese: { suggestion: 'bidda' },
  lavoro: { suggestion: 'trabàlliu' },
  soldi: { suggestion: 'dineri' },
  amico: { suggestion: 'amigu' },
  famiglia: { suggestion: 'famìlia' },
  giorno: { suggestion: 'die' },
  notte: { suggestion: 'note' },
  tempo: { suggestion: 'tempus' },
  anno: { suggestion: 'annu' },
  mese: { suggestion: 'mese' },
  settimana: { suggestion: 'chida' },
  lingua: { suggestion: 'limba' },
  parola: { suggestion: 'faeddu' },
}

/**
 * Lessico di varietà: forme LSC con la corrispondente campidanese documentata.
 * Solo le voci sicure; il resto lo fanno le regole fonetiche di varieties.js.
 * @type {Record<string, string>}
 */
export const CAMPIDANESE_LEXICON = {
  deo: 'deu',
  tue: 'tui',
  nois: 'nosu',
  bois: 'bosatrus',
  issos: 'issus',
  sos: 'is',
  sas: 'is',
  ite: 'ita',
  oe: 'oi',
  èssere: 'èssiri',
  àere: 'àiri',
  bìvere: 'bìviri',
  nàrrere: 'nàrriri',
  inoghe: 'inoghi',
  merie: 'merie',
  pische: 'pisci',
}

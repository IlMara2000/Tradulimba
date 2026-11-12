// Dati della guida linguistica mostrata nell'interfaccia. Le regole vengono
// dalle norme LSC del 2006; i riferimenti fonetici da studi peer-reviewed e da
// fonti istituzionali. Ogni voce dichiara la propria fonte, così la guida resta
// verificabile e non confonde la norma scritta con la pronuncia di una varietà.

export const GUIDE_TABS = [
  { id: 'alfabeto', label: 'Alfabeto' },
  { id: 'accento', label: 'Accento' },
  { id: 'suoni', label: 'Suoni' },
  { id: 'varieta', label: 'Varietà' },
  { id: 'errori', label: 'Errori comuni' },
  { id: 'fonti', label: 'Fonti' },
]

export const ALPHABET_ROWS = [
  { grapheme: 'a', sound: '[a]', example: 'abba', note: 'Vocale aperta centrale.' },
  { grapheme: 'b', sound: '[b] ~ [β]', example: 'binu', note: 'In campidanese tra vocali può diventare [β].' },
  { grapheme: 'c', sound: '[k]', example: 'casa', note: 'Davanti a a, o, u.' },
  { grapheme: 'ch', sound: '[k]', example: 'chelu', note: 'Davanti a e, i: la h serve solo a mantenere il suono velare.' },
  { grapheme: 'd', sound: '[d] ~ [ð]', example: 'domo', note: 'Tra vocali, in campidanese, può lenirsi in [ð].' },
  { grapheme: 'dd', sound: '[ɖɖ]', example: 'sedda', note: 'Retroflessa lunga: la punta della lingua si piega all’indietro.' },
  { grapheme: 'e', sound: '[e] / [ɛ]', example: 'bene', note: 'La LSC non segna l’apertura: dipende dalla parola e dalla varietà.' },
  { grapheme: 'f', sound: '[f]', example: 'frade' },
  { grapheme: 'g', sound: '[ɡ]', example: 'gatu', note: 'Davanti a a, o, u. La LSC non raddoppia la t.' },
  { grapheme: 'gh', sound: '[ɡ]', example: 'gherra', note: 'Davanti a e, i.' },
  { grapheme: 'gn', sound: '[ɲ]', example: 'bagnu', note: 'Come gn italiano; la LSC ammette anche nni.' },
  { grapheme: 'i', sound: '[i] / [j]', example: 'limba', note: 'Può essere vocale o semivocale.' },
  { grapheme: 'j', sound: '[j]', example: 'maju', note: 'Semiconsonante interna; si legge come la i di ieri.' },
  { grapheme: 'l', sound: '[l]', example: 'limba' },
  { grapheme: 'll', sound: '[ll]', example: 'bellu', note: 'Laterale lunga, non la gl italiana.' },
  { grapheme: 'lli', sound: '[ʎʎ]', example: 'màllia', note: 'Laterale palatale lunga, come gl italiano di maglia.' },
  { grapheme: 'm', sound: '[m]', example: 'mama' },
  { grapheme: 'n', sound: '[n]', example: 'naro' },
  { grapheme: 'nn', sound: '[nn]', example: 'mannu', note: 'La lunghezza distingue manu “mano” da mannu “grande”.' },
  { grapheme: 'nni', sound: '[ɲɲ]', example: 'campànnia', note: 'Nasale palatale lunga.' },
  { grapheme: 'o', sound: '[o] / [ɔ]', example: 'domo', note: 'Come per e, l’apertura non è segnata dalla LSC.' },
  { grapheme: 'p', sound: '[p]', example: 'pane' },
  { grapheme: 'r', sound: '[r]', example: 'sardu', note: 'Vibrante; in campidanese la d intervocalica può diventare [ɾ].' },
  { grapheme: 'rr', sound: '[rr]', example: 'terra' },
  { grapheme: 's', sound: '[s] / [z]', example: 'sardu', note: 'La sonorizzazione intervocalica varia: in molte parlate resta sorda.' },
  { grapheme: 'ss', sound: '[ss]', example: 'matessi' },
  { grapheme: 'sc', sound: '[ʃ]', example: 'iscena', note: 'Davanti a e, i.' },
  { grapheme: 't', sound: '[t]', example: 'terra' },
  { grapheme: 'tz', sound: '[ts]', example: 'petza', note: 'Zeta sorda, come zz di pezza. Non si raddoppia graficamente.' },
  { grapheme: 'u', sound: '[u] / [w]', example: 'unu', note: 'Dopo c e g davanti a vocale è semivocale: cuadru = [ˈkwadru].' },
  { grapheme: 'v', sound: '[v]', example: 'bìvere' },
  { grapheme: 'x', sound: '[ʒ]', example: 'boxi', note: 'Solo nella grafia campidanese; vale come j francese di jour.' },
  { grapheme: 'z', sound: '[dz]', example: 'fizu', note: 'Zeta sonora. Non si raddoppia graficamente.' },
]

export const ACCENT_RULES = [
  {
    title: 'Tronche: accento obbligatorio',
    body: 'Quando la tonica è sull’ultima sillaba, l’accento grafico si scrive sempre.',
    examples: ['tribù', 'però', 'perché'],
  },
  {
    title: 'Sdrucciole: accento obbligatorio',
    body: 'Quando la tonica è sulla terzultima sillaba, l’accento grafico si scrive sempre.',
    examples: ['cùcuru', 'fèmina', 'òmine', 'provìntzia', 'istùdiu', 'fìgiu', 'màllia'],
  },
  {
    title: 'Piane: nessun accento',
    body: 'Quando la tonica è sulla penultima, la norma non segna l’accento. La penultima è anche il valore predefinito dell’analisi automatica.',
    examples: ['domo', 'iscola', 'matessi', 'sardu'],
  },
  {
    title: 'Monosillabi: nessun accento',
    body: 'I monosillabi restano senza accento grafico; l’accento esiste nella pronuncia ma non si scrive.',
    examples: ['cras', 'tres', 'so', 'est', 'sunt'],
  },
  {
    title: 'La grafia non è la pronuncia',
    body: 'In LSC la i di gi/ci e la u di cu/gu possono contare come vocali nella divisione ortografica e come semivocali nella pronuncia: fì-gi-u si legge [ˈfidʒu], pro-vìn-tzi-a [proˈvintsja].',
    examples: [],
  },
]

export const SOUND_FEATURES = [
  {
    title: 'Vocali: cinque o sette?',
    ipa: '[i e ɛ a ɔ o u]',
    body: 'La base è a cinque vocali. In campidanese la tonica ha fino a sette realizzazioni, con [e]/[o] spesso condizionate dalla metafonia: bella [ˈbɛlla] ma bellu [ˈbellu]. La LSC non segna l’apertura.',
    source: 'Mereu, JIPA',
  },
  {
    title: 'Retroflesse',
    ipa: '[ɖɖ] · [ɳɖ]',
    body: 'dd è una occlusiva retroflessa lunga: sedda [ˈseɖɖa], cuddu [ˈkuɖɖu]. La sequenza nd può avere una realizzazione retroflessa [ɳɖ] in alcune parlate, ma non è una regola unica.',
    source: 'Mereu, JIPA',
  },
  {
    title: 'Lenizione',
    ipa: '[β] · [ð] · [ɣ]',
    body: 'In campidanese b, d, g tra vocali possono indebolirsi in fricative sonore: meda [ˈmeða], sa domo [sa ˈðɔmo]. Il fenomeno dipende dal contesto e dalla parlata; non è obbligatorio in ogni parola.',
    source: 'Katz & Pitzanti, Laboratory Phonology',
  },
  {
    title: 'Sibilanti e affricate',
    ipa: '[ts] · [dz] · [ʃ] · [ʒ]',
    body: 'tz è [ts] sorda, z è [dz] sonora; sc davanti a e/i è [ʃ]; in campidanese x è [ʒ]. La s intervocalica può sonorizzare in [z], ma la grafia non lo segna.',
    source: 'LSC §4.2.5 · Mereu',
  },
  {
    title: 'Sandhi di frase',
    ipa: 'sas domos → [sar ˈdɔmos]',
    body: 'La -s finale si assimila spesso alla consonante seguente; la consonante iniziale mobile può cadere dopo l’articolo: su bentu → [su ˈentu]. La grafia resta stabile: la LSC privilegia la costanza morfologica.',
    source: 'LSC §4.1–4.2.2',
  },
  {
    title: 'Intonazione',
    ipa: '↗ · ↘',
    body: 'Non esiste una cadenza unica per campidanese e logudorese. Le domande sì/no non hanno sempre un finale ascendente come in italiano; contano anche marcatori lessicali e prominenze iniziali.',
    source: 'Vanrell et al., Sardinian intonational phonology',
  },
]

export const VARIETY_ROWS = [
  { feature: 'Articolo plurale', lsc: 'sos / sas (oppure is)', campidanese: 'is', logudorese: 'sos / sas' },
  { feature: 'Vocali finali', lsc: '-o / -e', campidanese: '-u / -i', logudorese: '-o / -e' },
  { feature: 'Infinito', lsc: '-are / -ere / -ire', campidanese: '-ai / -iri', logudorese: '-are / -ere / -ire' },
  { feature: '“io”', lsc: 'deo', campidanese: 'deu', logudorese: 'deo' },
  { feature: '“tu”', lsc: 'tue', campidanese: 'tui', logudorese: 'tue' },
  { feature: '“noi”', lsc: 'nois', campidanese: 'nosu', logudorese: 'nois' },
  { feature: '“voi”', lsc: 'bois', campidanese: 'bosatrus', logudorese: 'bois' },
  { feature: 'x', lsc: 'adattata (spesso ss)', campidanese: '[ʒ]', logudorese: 'assente' },
  { feature: 'dd', lsc: '[ɖɖ]', campidanese: '[ɖɖ]', logudorese: '[ɖɖ]' },
]

export const COMMON_MISTAKES = [
  { wrong: 'grazie', right: 'gràtzias', why: 'La forma italiana non appartiene al lessico sardo.' },
  { wrong: 'casa', right: 'domo', why: 'In sardo casa indica piuttosto il focolare; l’edificio è domo.' },
  { wrong: 'quadru', right: 'cuadru', why: 'La q non si usa: qu diventa cu (§4.2.15).' },
  { wrong: 'figlio', right: 'fìgiu', why: 'gl italiano si adatta con gi o lli; fìgiu è sdrucciola e vuole l’accento.' },
  { wrong: 'maglia', right: 'màllia', why: 'gli + vocale diventa lli + vocale (§5.3.3).' },
  { wrong: 'sardo', right: 'sardu', why: 'La -o finale italiana non è sarda: sardu, domo, libru.' },
  { wrong: 'd’istiu', right: 'de istiu', why: 'La preposizione de si scrive sempre intera (§4.2.3).' },
  { wrong: 'i domos', right: 'sos domos / is domos', why: 'L’articolo plurale è sos/sas in LSC, is in campidanese.' },
  { wrong: 'petza con z sorda', right: 'petza = [ˈpetsa]', why: 'tz è sempre sorda; z da sola è sonora [dz].' },
  { wrong: 'maju con j francese', right: 'maju = [ˈmaju]', why: 'j rappresenta la semivocale [j], non [ʒ].' },
]

export const GUIDE_SOURCES = [
  {
    label: 'Regione Sardegna — Limba Sarda Comuna, norme 2006',
    href: 'https://www.regione.sardegna.it/documenti/1_72_20060418160308.pdf',
    note: 'Fonte primaria per alfabeto, accento, apostrofo, tz/z, adattamento dei prestiti e morfologia.',
  },
  {
    label: 'Regione Sardegna — Deliberazione 16/14 del 18 aprile 2006',
    href: 'https://www.regione.sardegna.it/documenti/1_74_20060503165850.pdf',
    note: 'Adozione sperimentale della LSC per la lingua scritta dell’Amministrazione regionale.',
  },
  {
    label: 'Mereu — “Cagliari Sardinian”, Journal of the International Phonetic Association',
    href: 'https://www.cambridge.org/core/journals/journal-of-the-international-phonetic-association/article/cagliari-sardinian/5B30AFE68BBB1CB462067B3C9A9CED45',
    note: 'Vocalismo, retroflesse, lenizione e accento del campidanese cagliaritano.',
  },
  {
    label: 'Katz & Pitzanti — “The phonetics and phonology of lenition”',
    href: 'https://www.journal-labphon.org/article/id/6252/',
    note: 'Studio sperimentale sulla lenizione nel campidanese.',
  },
  {
    label: 'Vanrell et al. — “Sardinian intonational phonology”',
    href: 'https://academic.oup.com/book/1562/chapter/141047923',
    note: 'Intonazione delle dichiarative e delle interrogative in logudorese e campidanese.',
  },
  {
    label: 'Treccani — “Sardi, dialetti”',
    href: 'https://www.treccani.it/enciclopedia/dialetti-sardi_(Enciclopedia-dell%27Italiano)',
    note: 'Quadro delle macro-varietà e dei principali contrasti.',
  },
  {
    label: 'SardegnaCultura — “Varietà campidanesi”',
    href: 'https://www.sardegnacultura.it/en/articles/varieta-campidanesi',
    note: 'Geografia e tratti delle varietà meridionali.',
  },
  {
    label: 'Apertium — Sardo e italiano',
    href: 'https://wiki.apertium.org/wiki/Sardo_e_italiano',
    note: 'Motore a regole usato come base della traduzione; il rapporto finale documenta copertura e limiti.',
  },
  {
    label: 'Ditzionàriu in línia de sa limba e de sa cultura sarda',
    href: 'https://ditzionariu.nor-web.eu/it/ditzionariu/presentada',
    note: 'Lessicografia sarda con varianti. Opera protetta: consultazione, non riuso del dataset senza autorizzazione.',
  },
  {
    label: 'Wikipedia in sardo',
    href: 'https://sc.wikipedia.org/wiki/',
    note: 'Corpus contemporaneo eterogeneo per varietà e grafia; riuso secondo licenza Wikimedia.',
  },
  {
    label: 'SINTESA — Università di Cagliari',
    href: 'https://iris.unica.it/handle/11584/134275',
    note: 'Ricerca su fonetica, fonologia e prosodia per la sintesi vocale sarda.',
  },
  {
    label: 'SardinianVoxes — ISCA Archive',
    href: 'https://www.isca-archive.org/interspeech_2025/carta25_interspeech.html',
    note: 'Dataset audio-testo e benchmark ASR; verificare accesso e licenza prima del riuso.',
  },
  {
    label: 'Lupinu — Manualetto di linguistica sarda',
    href: 'https://iris.uniss.it/retrieve/daa4be4e-97a5-4705-9973-dc3a4e8d8fdf/78-Libro-849-1-10-20241128-1.pdf',
    note: 'Inquadramento scientifico di varietà, morfologia e paradigmi.',
  },
]

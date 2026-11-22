export const NARA_COURSE_REFERENCES = [
  {
    label: 'Norma LSC · Regione Sardegna',
    href: 'https://www.regione.sardegna.it/documenti/1_72_20060418160308.pdf',
  },
  {
    label: 'Dizionario Apertium sardo–italiano',
    href: 'https://github.com/apertium/apertium-srd-ita',
  },
]

const LEVELS = [
  {
    id: 'salude',
    title: 'Salude!',
    objective: 'Saluta, ringrazia e chiedi con cortesia.',
    icon: 'hand',
    color: 'yellow',
    questions: [
      {
        prompt: 'Scegli il saluto che significa “ciao / salve”.',
        options: ['Salude', 'Gràtzias', 'Adiosu'],
        answer: 0,
        note: 'Salude è un saluto generale; nel parlato esistono anche forme locali.',
      },
      {
        prompt: 'Come si dice “buongiorno”?',
        options: ['Bona note', 'Bona die', 'Bona sera'],
        answer: 1,
        note: 'Die significa “giorno”.',
      },
      {
        prompt: 'Che cosa significa “Gràtzias”?',
        options: ['Per favore', 'Grazie', 'Scusa'],
        answer: 1,
        note: 'Per ringraziare con più enfasi si può dire gràtzias meda.',
      },
      {
        prompt: 'Scegli la forma LSC per “per favore”.',
        options: ['De nudda', 'A pustis', 'Pro praghere'],
        answer: 2,
        note: 'De nudda significa invece “di niente”.',
      },
    ],
  },
  {
    id: 'presentatziones',
    title: 'Mi naro…',
    objective: 'Presentati usando i pronomi e il verbo èssere.',
    icon: 'user',
    color: 'green',
    questions: [
      {
        prompt: 'Che cosa significa “Deo so Anna”?',
        options: ['Anna è qui', 'Io conosco Anna', 'Io sono Anna'],
        answer: 2,
        note: 'Deo significa “io” e so significa “sono”.',
      },
      {
        prompt: 'Completa: “Tue ___ Gavinu”.',
        options: ['est', 'ses', 'semus'],
        answer: 1,
        note: 'Tue ses significa “tu sei”.',
      },
      {
        prompt: 'Che cosa significa “Ite ti naras?”',
        options: ['Come ti chiami?', 'Dove abiti?', 'Quanti anni hai?'],
        answer: 0,
        note: 'Qui si usa la forma LSC con nàrrere; sono diffuse anche domande locali diverse.',
      },
      {
        prompt: 'Traduci “Mi naro Maria”.',
        options: ['Conosco Maria', 'Mi chiamo Maria', 'Sono con Maria'],
        answer: 1,
        note: 'Naro è la prima persona presente di nàrrere.',
      },
    ],
  },
  {
    id: 'numeros',
    title: 'Contamus!',
    objective: 'Conta da uno a dieci e accorda uno e due al genere.',
    icon: 'hash',
    color: 'blue',
    questions: [
      {
        prompt: 'Come si dice “tre”?',
        options: ['Ses', 'Bator', 'Tres'],
        answer: 2,
        note: 'Uno–tre: unu/una, duos/duas, tres.',
      },
      {
        prompt: 'Qual è il numero “quattro”?',
        options: ['Bator', 'Chimbe', 'Oto'],
        answer: 0,
        note: 'Bator è la forma prevista dalla LSC.',
      },
      {
        prompt: 'Completa la sequenza: “chimbe, ses, sete, ___”.',
        options: ['Noe', 'Oto', 'Deghe'],
        answer: 1,
        note: 'La sequenza è cinque, sei, sette, otto.',
      },
      {
        prompt: 'Come si dice “due case”?',
        options: ['Duos domos', 'Duas domos', 'Duas domu'],
        answer: 1,
        note: 'Domo è femminile: perciò si usa duas. Il plurale è domos.',
      },
    ],
  },
  {
    id: 'familia',
    title: 'Sa famìlia',
    objective: 'Riconosci i membri più vicini della famiglia.',
    icon: 'users',
    color: 'orange',
    questions: [
      {
        prompt: 'Come si dice “madre / mamma”?',
        options: ['Mama', 'Sorre', 'Fìgia'],
        answer: 0,
        note: 'Mama è il termine LSC per “madre” o “mamma”.',
      },
      {
        prompt: 'Che cosa significa “babbu”?',
        options: ['Fratello', 'Padre', 'Figlio'],
        answer: 1,
        note: 'Babbu può significare “padre” o “papà”.',
      },
      {
        prompt: 'Quale coppia significa “fratello / sorella”?',
        options: ['Babbu / mama', 'Fìgiu / fìgia', 'Frade / sorre'],
        answer: 2,
        note: 'Il plurale regolare è frades e sorres.',
      },
      {
        prompt: 'Traduci “su fìgiu e sa fìgia”.',
        options: ['Il padre e la madre', 'Il fratello e la sorella', 'Il figlio e la figlia'],
        answer: 2,
        note: 'Su è l’articolo maschile; sa quello femminile.',
      },
    ],
  },
  {
    id: 'domo',
    title: 'In domo',
    objective: 'Nomina gli spazi e gli oggetti essenziali della casa.',
    icon: 'house',
    color: 'earth',
    questions: [
      {
        prompt: 'Che cosa significa “domo”?',
        options: ['Porta', 'Casa', 'Stanza'],
        answer: 1,
        note: 'In LSC si scrive domo; la forma parlata varia nel territorio.',
      },
      {
        prompt: 'Qual è la “cucina”?',
        options: ['Coghina', 'Cadrea', 'Ventana'],
        answer: 0,
        note: 'Coghina significa “cucina”; coghinare significa “cucinare”.',
      },
      {
        prompt: 'Che cosa significa “In ue est su bagnu?”',
        options: ['Il bagno è libero?', 'Dov’è il bagno?', 'Questa è la cucina?'],
        answer: 1,
        note: 'In ue introduce una domanda di luogo.',
      },
      {
        prompt: 'Quale coppia significa “tavolo / sedia”?',
        options: ['Letu / porta', 'Bagnu / coghina', 'Mesa / cadrea'],
        answer: 2,
        note: 'Mesa è il tavolo; cadrea è la sedia.',
      },
    ],
  },
  {
    id: 'a-mesa',
    title: 'A mesa',
    objective: 'Impara cibi, bevande e una domanda utile a tavola.',
    icon: 'utensils',
    color: 'yellow',
    questions: [
      {
        prompt: 'Come si dice “acqua”?',
        options: ['Abba', 'Binu', 'Latte'],
        answer: 0,
        note: 'Abba può indicare anche la pioggia, secondo il contesto.',
      },
      {
        prompt: 'Che cosa significa “casu”?',
        options: ['Carne', 'Formaggio', 'Pesce'],
        answer: 1,
        note: 'Casu è il formaggio; pische è il pesce.',
      },
      {
        prompt: 'Quale coppia significa “pane e vino”?',
        options: ['Petza e pische', 'Abba e cafè', 'Pane e binu'],
        answer: 2,
        note: 'Binu significa “vino”.',
      },
      {
        prompt: 'Traduci “Ite boles a mandigare?”',
        options: ['Che cosa vuoi mangiare?', 'Dove vuoi andare?', 'Quanto costa il pane?'],
        answer: 0,
        note: 'Ite = che cosa; boles = vuoi; mandigare = mangiare.',
      },
    ],
  },
  {
    id: 'tempus',
    title: 'Ite ora est?',
    objective: 'Parla di oggi, ieri, domani e dei momenti della giornata.',
    icon: 'clock',
    color: 'green',
    questions: [
      {
        prompt: 'Che cosa significa “oe”?',
        options: ['Oggi', 'Ieri', 'Domani'],
        answer: 0,
        note: 'Oe è l’avverbio LSC per “oggi”.',
      },
      {
        prompt: 'Qual è la sequenza “ieri, oggi, domani”?',
        options: ['Oe, cras, eris', 'Cras, eris, oe', 'Eris, oe, cras'],
        answer: 2,
        note: 'Eris = ieri; oe = oggi; cras = domani.',
      },
      {
        prompt: 'Che cosa significa “Ite ora est?”',
        options: ['Dove sei?', 'Che ora è?', 'Che giorno è?'],
        answer: 1,
        note: 'Nella scrittura LSC le parole restano intere: ite ora, non it’ora.',
      },
      {
        prompt: 'Traduci “a mangianu”.',
        options: ['Di mattina', 'Di sera', 'Ieri'],
        answer: 0,
        note: 'A merie è “di pomeriggio”; a sero è “di sera”.',
      },
    ],
  },
  {
    id: 'inditos',
    title: 'In ue est?',
    objective: 'Chiedi un luogo e capisci indicazioni semplici.',
    icon: 'signpost',
    color: 'blue',
    questions: [
      {
        prompt: 'Che cosa significa “a manca”?',
        options: ['A destra', 'A sinistra', 'Indietro'],
        answer: 1,
        note: 'Si può dire anche a manu manca.',
      },
      {
        prompt: 'Scegli “a destra”.',
        options: ['A dereta', 'A tesu', 'A pustis'],
        answer: 0,
        note: 'È diffusa anche la locuzione a manu dereta.',
      },
      {
        prompt: 'Che cosa significa “inoghe”?',
        options: ['Lontano', 'Qui', 'Sotto'],
        answer: 1,
        note: 'In cue indica invece “lì / là”.',
      },
      {
        prompt: 'Traduci “In ue est sa pratza?”',
        options: ['Quanto è grande la piazza?', 'Dov’è la piazza?', 'La piazza è qui?'],
        answer: 1,
        note: 'Pratza significa “piazza”.',
      },
    ],
  },
  {
    id: 'verbos',
    title: 'Verbos in atzione',
    objective: 'Usa èssere, àere e il presente dei verbi regolari in -are.',
    icon: 'languages',
    color: 'orange',
    questions: [
      {
        prompt: 'Quale coppia significa “essere / avere”?',
        options: ['Andare / dare', 'Èssere / àere', 'Bìvere / faeddare'],
        answer: 1,
        note: 'Gli accenti distinguono chiaramente gli infiniti LSC.',
      },
      {
        prompt: 'Completa: “Deo ___ Anna”.',
        options: ['ses', 'so', 'est'],
        answer: 1,
        note: 'Il presente di èssere comincia con: deo so, tue ses, issu/issa est.',
      },
      {
        prompt: 'Completa: “Deo ___ unu libru”.',
        options: ['apo', 'as', 'at'],
        answer: 0,
        note: 'Il presente di àere comincia con: deo apo, tue as, issu/issa at.',
      },
      {
        prompt: 'Completa: “Tue ___ su sardu”.',
        options: ['faeddo', 'faeddat', 'faeddas'],
        answer: 2,
        note: 'Faeddare segue il modello regolare: faeddo, faeddas, faeddat.',
      },
    ],
  },
  {
    id: 'dialogu',
    title: 'Su diàlogu finale',
    objective: 'Comprendi una conversazione che riunisce le lezioni.',
    icon: 'messages',
    color: 'earth',
    dialogue: [
      ['A', 'Salude! Ite ti naras?'],
      ['B', 'Mi naro Anna. E tue?'],
      ['A', 'Mi naro Gavinu. In ue bives?'],
      ['B', 'Bivo in Nùgoro.'],
      ['A', 'Ite ora est?'],
      ['B', 'Sunt sas tres.'],
      ['A', 'Ite boles a mandigare?'],
      ['B', 'Pane e casu. In ue est su bar?'],
      ['A', 'Acanta de sa pratza.'],
      ['B', 'Gràtzias!'],
      ['A', 'De nudda. A si bìere luego!'],
    ],
    questions: [
      {
        prompt: 'Qual è la risposta adatta a “Ite ti naras?”',
        options: ['Mi naro Anna', 'Bivo in Nùgoro', 'Sunt sas tres'],
        answer: 0,
        note: 'La domanda chiede il nome.',
      },
      {
        prompt: 'Che cosa significa “Bivo in Nùgoro”?',
        options: ['Vengo da Nuoro', 'Abito a Nuoro', 'Vado a Nuoro'],
        answer: 1,
        note: 'Bìvere può significare “vivere / abitare”; qui la forma è bivo.',
      },
      {
        prompt: 'Nel dialogo, qual è la risposta a “Ite ora est?”',
        options: ['Pane e casu', 'Sunt sas tres', 'De nudda'],
        answer: 1,
        note: 'Sunt sas tres significa “sono le tre”.',
      },
      {
        prompt: 'Secondo il dialogo, dov’è il bar?',
        options: ['Accanto alla piazza', 'A casa di Anna', 'A sinistra del bagno'],
        answer: 0,
        note: 'Acanta de sa pratza significa “accanto alla piazza”.',
      },
    ],
  },
  {
    id: 'campidanesu',
    title: 'Su campidanesu',
    objective: 'Passa dal sardo LSC alle forme campidanesi verificate della base TraduLimba.',
    icon: 'languages',
    color: 'green',
    questions: [
      {
        prompt: 'In campidanese, come si dice “mangiare”?',
        options: ['Papai', 'Mandigare', 'Bufai'],
        answer: 0,
        note: 'Papai viene dal lemma papàre; mandigare è la forma LSC, bufai vale “bere”.',
      },
      {
        prompt: 'In campidanese “puru” corrisponde al LSC…',
        options: ['Fìntzas', 'Meda', 'Pagu'],
        answer: 0,
        note: 'Puru e fintzas valgono “anche”; meda è “molto” e pagu è “poco”.',
      },
      {
        prompt: 'Quale forma campidanese corrisponde a “strada”?',
        options: ['Istràda', 'Pratza', 'Porta'],
        answer: 0,
        note: 'Istràda è attestata sul dizionario; “camina” non esiste ed è l’errore da non ripetere.',
      },
      {
        prompt: 'Che giorno della settimana è “chenàbura”?',
        options: ['Mercoledì', 'Venerdì', 'Domenica'],
        answer: 1,
        note: 'Chenàbura è il venerdì; mércuris è mercoledì e giòbia è giovedì.',
      },
    ],
  },
]

export const NARA_LEVELS = LEVELS.map((level, levelIndex) => ({
  ...level,
  number: levelIndex + 1,
  questions: level.questions.map((question, questionIndex) => ({
    ...question,
    id: `${level.id}-${questionIndex + 1}`,
  })),
}))

export const NARA_LEVEL_IDS = NARA_LEVELS.map(({ id }) => id)

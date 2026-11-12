# TraduLimba 1.0

Release stabile del traduttore web pubblico italiano ↔ sardo, con scelta esplicita tra:

- Limba Sarda Comuna (riferimento scritto)
- Campidanese (adattamento assistito)
- Logudorese (adattamento assistito)

Il frontend non importa Supabase, non richiede un account e conserva le traduzioni recenti soltanto nel `localStorage` del browser. Il backend storico resta separato come archivio e non viene modificato.

Il design usa un neomorfismo minimale con una palette ispirata ai colori della Sardegna: blu, verde, giallo e arancio su superfici grigio-perla. Marchio e icona sono originali.

## Motore linguistico

La traduzione di base usa la coppia open source [`apertium-srd-ita`](https://github.com/apertium/apertium-srd-ita) attraverso l'API pubblica Apertium. Le varianti campidanese e logudorese possono essere rifinite da un modello AI tramite Vercel AI Gateway; se il servizio AI non è configurato, l'app restituisce la forma standard e lo dichiara nell'interfaccia.

La voce non passa più da un modello italiano. L'app sceglie in quest'ordine: registrazione umana del corpus, clip sintetica sarda, motore TTS sardo configurato, voce del dispositivo. Solo nell'ultimo caso `src/features/translation/speechScript.js` riscrive il testo in grafia italiana e l'interfaccia dichiara che la voce è italiana e approssimata. Negli altri casi il testo sardo arriva al motore nella grafia originale.

## Lingua scritta e parlata

Il motore linguistico sta in `src/features/linguistics/` ed è puro JavaScript, condiviso tra browser e funzioni serverless:

- `syllables.js` divide le parole in sillabe e ricava la tonica dalla regola LSC §4.2.6 (accento obbligatorio su tronche e sdrucciole, assente sulle piane);
- `phonology.js` produce una trascrizione IPA larga e una grafia italiana di lettura, con differenze per varietà (finali campidanesi, lenizione, `x` = [ʒ]);
- `orthography.js` controlla le regole LSC (accento, `q`, `tz`, `gli`, `sce/sci`, consonanti doppie, elisione di `de`) e applica solo le correzioni non ambigue;
- `varieties.js` adatta la bozza LSC a campidanese e logudorese con regole dichiarate, prima dell'eventuale post-editor AI;
- `index.js` espone `analyzeSardinian()`, usata dall'API e dall'interfaccia.

La traduzione include ora un pannello con IPA, sillabe, sillaba tonica, note di pronuncia, segnalazioni ortografiche e confronto tra le tre varietà. La sezione **Sa limba** dell'interfaccia raccoglie alfabeto, regole dell'accento, fenomeni fonetici, differenze tra varietà, errori comuni, fonti e un analizzatore live per il testo sardo. La ricerca completa, con riferimenti e limiti dichiarati, è in [`docs/lingua-sarda.md`](docs/lingua-sarda.md).

## Voce sarda

Il corpus vocale sta in `voice/copione.json` e viene costruito da `scripts/voice-corpus.mjs`. Le registrazioni umane vanno in `public/voce/registrata/<id>.<estensione>`; le clip sintetiche in `public/voce/sintetica/`. Lo stesso testo può avere entrambe: l'app preferisce sempre la registrazione umana. Il manifest è `public/voce/manifest.json`.

```sh
npm run voice:setup    # compila eSpeak NG con la voce sarda (sc) in .cache
npm run voice:synth    # genera le clip LSC e ricostruisce il manifest
npm run voice:corpus   # ricostruisce il manifest dalle clip già presenti
npm run voice:list     # stampa gli id dei file da registrare
npm run voice:check    # elenca le righe ancora senza audio
npm run voice:server   # espone eSpeak via HTTP per il self-hosting
npm run voice:record   # apre lo studio locale per registrare riga per riga
npm run voice:report   # esporta CSV/Markdown delle righe senza voce umana
```

Lo stesso studio è disponibile online su <https://tradulimba.space/corvoc/rec>: salva in Vercel Blob ed è protetto da un codice di accesso, da condividere solo con chi registra. Il codice è nel file locale `.corvoc-token`, escluso da Git, e corrisponde alla variabile `CORVOC_RECORD_TOKEN` del progetto Vercel. Il manifest e il riepilogo online si aggiornano subito; lo studio locale resta disponibile per lavorare offline.

Lo studio guidato locale si apre con `npm run voice:record` su <http://127.0.0.1:8788>: mostra il copione, fa ascoltare la clip sintetica di confronto, registra dal microfono, converte in WAV mono e salva in `public/voce/registrata/<id>.wav`. Prima del salvataggio analizza durata, silenzi ai lati, rumore di fondo, rapporto voce/rumore e clipping: gli avvisi si possono accettare, mentre i take inutilizzabili (senza parlato, troppo corti o lunghi, con clipping esteso) vengono bloccati. Il manifest viene ricostruito a ogni salvataggio. Lo studio chiede anche il parlante (nome o codice) e il riferimento al consenso: li salva in `voice/registrazioni.json` e li riporta nel manifest e nella nota di ascolto. Il manifest è pubblico, quindi usa un codice e non inserire il documento di consenso. Le registrazioni devono essere fatte da una persona madrelingua: l'assistente non può registrare né produrre una voce che venga presentata come umana. Finché una persona non registra, il corpus umano resta vuoto e l'app usa le clip sintetiche dichiarandole come tali.

Il riepilogo delle righe mancanti si genera con `npm run voice:report`: scrive `voice/riepilogo-registrazioni.csv` (una riga per registrazione da fare) e `.md` (totali per gruppo, con stima dei tempi). Gli stessi due formati si scaricano dallo studio. Il riepilogo contiene testo, id e tempi, non audio né dati del parlante, quindi si può condividere con chi registra.

Il corpus incluso contiene 206 clip sintetiche sarde in LSC, generate con eSpeak NG `sc`; non contiene voci umane. `màllia` e `campànnia` restano volutamente senza clip sintetica perché l'attuale voce eSpeak non rende il fonema [ʎ] e legge `lli` come due `l`: vanno registrate da una persona. Le registrazioni umane si sostituiscono alle clip sintetiche senza cambiare codice.

Per l'audio arbitrario in produzione serve un motore TTS sardo raggiungibile via HTTP: Vercel non può eseguire il binario eSpeak. Imposta `SARDINIAN_TTS_URL` (e, se serve, `SARDINIAN_TTS_KEY`). Il contratto, le opzioni Piper/SINTESA/SardinianVoxes e i limiti sono in [`docs/voce-sarda.md`](docs/voce-sarda.md). In locale, se `.cache/espeak-ng` è compilato, il server di sviluppo usa automaticamente il motore locale.

La trascrizione avvicina i suoni ma non li riproduce: una voce italiana non rende le retroflesse di `sedda` e `ando`, le leni [β]/[ð], l'apertura vocalica che la LSC non segna né le assimilazioni di frase (`sas domos` → `sar domos`). L'audio resta un riferimento d'ascolto e non sostituisce un parlante nativo.

La dicitura “release stabile” riguarda affidabilità e completezza dell'applicazione, non costituisce una certificazione linguistica. Gli adattamenti di varietà e la pronuncia vanno verificati con parlanti competenti prima di usi editoriali, didattici o istituzionali.

Per un lancio commerciale su larga scala è consigliato ospitare Apertium in proprio, verificare gli obblighi GPL e introdurre un glossario revisionato da linguisti e parlanti delle diverse aree.

## Avvio locale

```sh
npm install
npm run dev
```

La traduzione LSC funziona senza segreti. Per il post-editing delle varianti copia `.env.example` in `.env.local` e imposta `AI_GATEWAY_API_KEY`. Su Vercel si può usare l'identità OIDC automatica senza salvare una chiave permanente. Per la voce sarda in locale esegui `npm run voice:setup` e `npm run voice:synth`; in produzione imposta `SARDINIAN_TTS_URL`.

## Verifiche

```sh
npm test
npm run test:e2e   # carica un WAV di prova e verifica manifest, metadati e nota
npm run lint
npm run typecheck
npm run build
```

## Registrazione della voce

Il [copione completo](docs/copione-registrazione-voce.md) divide la registrazione in fasi: fonetica di base, frasi naturali, numeri e date, parole moderne, prosodia e blocchi separati per campidanese e logudorese. Le registrazioni non vanno inviate a un fornitore senza consenso esplicito del parlante e verifica delle condizioni d’uso.

## API

- `POST /api/translate` — massimo 4.000 caratteri
- `POST /api/voice` — massimo 1.000 caratteri, motore TTS sardo
- `POST /api/speech` — alias storico di `/api/voice`

La risposta di `/api/translate` include `translation`, `variantApplied`, `method` (`apertium`, `rules` o `rules+ai`), `analysisSide` (`target` o `source`), `analysis` (IPA, sillabe, tonica, parole, note e segnalazioni), `orthography` (correzioni applicate) e `varietyChanges` (sostituzioni di varietà). In questo modo anche un client diverso dall'interfaccia può mostrare la stessa analisi linguistica.

Entrambe le route validano l'input, non salvano i testi e applicano un limite per client: 40 traduzioni e 12 sintesi vocali al minuto.

Il limite è condiviso tra le istanze serverless tramite un Redis raggiungibile via HTTPS (protocollo REST di Upstash, lo stesso usato da Vercel KV). Basta impostare una delle due coppie:

- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
- `KV_REST_API_URL` + `KV_REST_API_TOKEN` (integrazione Vercel KV)

L'incremento e la scadenza della finestra avvengono in un unico script Lua, quindi due istanze concorrenti non possono creare due finestre per lo stesso client. La chiave contiene l'hash dell'indirizzo IP, non l'indirizzo in chiaro, e `/api/translate` e `/api/voice` hanno contatori separati.

Senza queste variabili lo script usa il contatore in memoria: corretto in locale, insufficiente in produzione perché ogni istanza conterebbe per sé. Se Redis non risponde la richiesta non viene rifiutata (fail-open): il limite torna locale per quell'istanza e nei log compare un solo evento `rate_limit_store_unavailable`, così un disservizio dello store non blocca il traduttore.

La risposta di `/api/translate` include `glossary`: i termini presenti nel testo, con la forma preferita in LSC e l'eventuale nota. Le voci stanno in `src/features/translation/glossaryData.js` e ognuna porta la propria provenienza, cioè la lezione NARA (`level`) e la domanda che ne attesta la forma (`question`), perché vengono dalle forme già verificate del percorso NARA; `glossary.js` tiene la ricerca, il prompt del post-editor e le riesporta per chi le usava già. Per campidanese e logudorese sono passate al post-editor come vincolo, mentre in LSC restano un riferimento visibile nell'interfaccia. Il glossario non riscrive il testo da solo: senza vedere la frase, una sostituzione produrrebbe errori di accordo.

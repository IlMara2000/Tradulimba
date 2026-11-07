# TraduLimba 1.0

Release stabile del traduttore web pubblico italiano ↔ sardo, con scelta esplicita tra:

- Limba Sarda Comuna (riferimento scritto)
- Campidanese (adattamento assistito)
- Logudorese (adattamento assistito)

Il frontend non importa Supabase, non richiede un account e conserva le traduzioni recenti soltanto nel `localStorage` del browser. Il backend storico resta separato come archivio e non viene modificato.

Il design usa un neomorfismo minimale con una palette ispirata ai colori della Sardegna: blu, verde, giallo e arancio su superfici grigio-perla. Marchio e icona sono originali.

## Motore linguistico

La traduzione di base usa la coppia open source [`apertium-srd-ita`](https://github.com/apertium/apertium-srd-ita) attraverso l'API pubblica Apertium. Le varianti campidanese e logudorese possono essere rifinite da un modello AI tramite Vercel AI Gateway; se il servizio AI non è configurato, l'app restituisce la forma standard e lo dichiara nell'interfaccia.

La funzione vocale prova Vercel AI Gateway e, se non disponibile, usa la sintesi vocale italiana del dispositivo come fallback. In entrambi i casi il testo sardo non arriva al motore così com'è: `src/features/translation/speechScript.js` lo riscrive in grafia italiana per la sola sintesi vocale, lasciando invariato il testo mostrato a schermo. La `tz` diventa `zz` ([ts]), la `s` intervocalica raddoppia per restare sorda, la `j` diventa `i`, `lli` e `nni` seguono la grafia italiana e, in campidanese, la `d` intervocalica passa a `r` e la `x` prende il valore della scrittura locale.

La trascrizione avvicina i suoni ma non li riproduce: una voce italiana non rende le retroflesse di `sedda` e `ando`, le leni [β]/[ð], l'apertura vocalica che la LSC non segna né le assimilazioni di frase (`sas domos` → `sar domos`). L'audio resta un riferimento d'ascolto e non sostituisce un parlante nativo.

La dicitura “release stabile” riguarda affidabilità e completezza dell'applicazione, non costituisce una certificazione linguistica. Gli adattamenti di varietà e la pronuncia vanno verificati con parlanti competenti prima di usi editoriali, didattici o istituzionali.

Per un lancio commerciale su larga scala è consigliato ospitare Apertium in proprio, verificare gli obblighi GPL e introdurre un glossario revisionato da linguisti e parlanti delle diverse aree.

## Avvio locale

```sh
npm install
npm run dev
```

La traduzione LSC funziona senza segreti. Per il post-editing delle varianti e la voce AI, copia `.env.example` in `.env.local` e imposta `AI_GATEWAY_API_KEY`. Su Vercel si può usare l'identità OIDC automatica senza salvare una chiave permanente.

## Verifiche

```sh
npm test
npm run lint
npm run typecheck
npm run build
```

## Registrazione della voce

Il [copione completo](docs/copione-registrazione-voce.md) divide la registrazione in fasi: fonetica di base, frasi naturali, numeri e date, parole moderne, prosodia e blocchi separati per campidanese e logudorese. Le registrazioni non vanno inviate a un fornitore senza consenso esplicito del parlante e verifica delle condizioni d’uso.

## API

- `POST /api/translate` — massimo 4.000 caratteri
- `POST /api/speech` — massimo 1.000 caratteri

Entrambe le route validano l'input, non salvano i testi e applicano un limite per client: 40 traduzioni e 12 sintesi vocali al minuto.

Il limite è condiviso tra le istanze serverless tramite un Redis raggiungibile via HTTPS (protocollo REST di Upstash, lo stesso usato da Vercel KV). Basta impostare una delle due coppie:

- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
- `KV_REST_API_URL` + `KV_REST_API_TOKEN` (integrazione Vercel KV)

L'incremento e la scadenza della finestra avvengono in un unico script Lua, quindi due istanze concorrenti non possono creare due finestre per lo stesso client. La chiave contiene l'hash dell'indirizzo IP, non l'indirizzo in chiaro, e `/api/translate` e `/api/speech` hanno contatori separati.

Senza queste variabili lo script usa il contatore in memoria: corretto in locale, insufficiente in produzione perché ogni istanza conterebbe per sé. Se Redis non risponde la richiesta non viene rifiutata (fail-open): il limite torna locale per quell'istanza e nei log compare un solo evento `rate_limit_store_unavailable`, così un disservizio dello store non blocca il traduttore.

La risposta di `/api/translate` include `glossary`: i termini di `src/features/translation/glossary.js` presenti nel testo, con la forma preferita in LSC e l'eventuale nota. Le voci vengono dalle forme già verificate del percorso NARA; per campidanese e logudorese sono passate al post-editor come vincolo, mentre in LSC restano un riferimento visibile nell'interfaccia. Il glossario non riscrive il testo da solo: senza vedere la frase, una sostituzione produrrebbe errori di accordo.

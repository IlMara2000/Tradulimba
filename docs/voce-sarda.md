# Voce sarda: corpus, motore e limiti

Questa nota descrive come TraduLimba produce l'audio sardo dopo la sostituzione
della voce italiana. L'obiettivo non è “una voce qualsiasi che legge lettere
sarde”, ma una voce che riceva il testo nella grafia sarda originale e che, quando
non può, lo dichiari.

## Ordine di scelta

L'app prova le sorgenti in questo ordine:

1. **registrazione umana** nel corpus (`public/voce/registrata/`);
2. **clip sintetica sarda** nel corpus (`public/voce/sintetica/`);
3. **motore TTS sardo** configurato su `/api/voice` (`SARDINIAN_TTS_URL`) o, in
   sviluppo, il binario eSpeak NG locale;
4. **voce italiana del dispositivo**, con la trascrizione fonetica di
   `speechScript.js`.

L'etichetta accanto a “Ascolta” e la nota sotto il traduttore dicono sempre quale
sorgente è stata usata: `registrata`, `sintetica`, `motore` o `italiana`. Una
voce italiana non viene mai presentata come sarda.

La ricerca nel corpus è esatta sul testo normalizzato (maiuscole, punteggiatura e
apostrofi tipografici non contano) e sulla varietà. Non si passa da una varietà
all'altra: una clip LSC non viene usata per una frase campidanese, perché finali
e lessico cambierebbero.

## Il corpus

`voice/copione.json` è il copione unico. Contiene gruppi di parole e frasi in LSC,
più l'elenco `excludeSynthesis` delle righe che l'attuale motore sintetico non sa
pronunciare correttamente.

```sh
npm run voice:list     # id, varietà, tipo e testo di ogni riga
npm run voice:corpus   # ricostruisce public/voce/manifest.json
npm run voice:synth    # genera le clip LSC mancanti con eSpeak e poi il manifest
npm run voice:check    # elenca le righe senza audio (esce con codice 1)
npm run voice:record   # apre lo studio locale per registrare riga per riga
npm run voice:report   # esporta CSV/Markdown delle righe senza voce umana
npm run test:e2e       # prova isolata di upload, metadati, manifest e nota
```

### Registrare una voce umana

Le registrazioni devono essere fatte da una persona madrelingua. L'assistente
non può registrare una voce né produrre un audio che possa essere presentato
come umano: senza una persona il corpus umano resta vuoto.

#### Studio guidato (consigliato)

1. Esegui `npm run voice:record` e apri <http://127.0.0.1:8788>.
2. Compila **Parlante** (nome o codice) e **Riferimento consenso**: senza questi
   dati il salvataggio è bloccato.
3. Scegli la riga: il filtro “Senza voce umana” parte dalle righe da fare.
4. Ascolta la clip sintetica di confronto, poi premi “Attiva il microfono”.
5. Registra una riga, controlla il pannello qualità, riascolta la ripresa e salva.
   Se sbagli, ripeti tutta la riga.
6. Lo studio scrive `public/voce/registrata/<id>.wav`, aggiorna i metadati e
   ricostruisce il manifest.
7. Ricarica l'app: la registrazione vince sulla clip sintetica dello stesso testo e
   la nota di ascolto riporta parlante, consenso e data.

Prima del salvataggio lo studio misura la ripresa e mostra un semaforo:

- **durata**: sotto 0,3 s il take è bloccato, sopra 30 s pure; sotto 0,5 s o
  sopra 15 s ricevi un avviso;
- **silenzio iniziale e finale**: l'ideale è circa 0,3 s per lato; meno di 0,1–0,15 s
  o più di 2,5 s produce un avviso, perché l'attacco o la coda vanno rifatti;
- **rumore di fondo**: sopra −40 dBFS ricevi un avviso; il rapporto voce/rumore
  deve restare sopra 20 dB, altrimenti la voce è troppo vicina al rumore;
- **picco**: sotto −30 dBFS la ripresa è troppo bassa; un picco quasi a fondo scala
  riceve un avviso;
- **clipping**: pochi campioni a fondo scala sono un avviso, oltre lo 0,5% del
  segnale è un errore e il take va ripetuto con più margine.

Gli avvisi gialli non bloccano il salvataggio: sei tu a decidere se il take va
bene. I problemi rossi (nessun parlato, ripresa troppo corta, clipping esteso)
bloccano il pulsante “Salva nel corpus”; “Ripeti” registra di nuovo la stessa riga.

Lo studio è solo locale e non carica nulla su Internet. Il browser chiede il
permesso del microfono; servono una pagina loopback (`127.0.0.1` o `localhost`)
e un browser con `MediaRecorder`. Per usare una cartella diversa, per esempio in
una prova, imposta `VOICE_RECORDINGS_DIR`; con una cartella esterna al corpus il
manifest non viene toccato. `VOICE_RECORDER_PORT` cambia la porta.

#### Studio online

Lo stesso studio è pubblicato su <https://tradulimba.space/corvoc/rec>. A
differenza di quello locale non scrive sul filesystem: carica i WAV in Vercel
Blob e aggiorna un indice dei metadati letto dalle API serverless.

- Il salvataggio richiede il codice `CORVOC_RECORD_TOKEN`; la pagina lo chiede
  una volta e lo tiene in `sessionStorage`. Il codice locale è in
  `.corvoc-token`, escluso da Git: condividilo solo con chi registra.
- Lo storage usa `BLOB_READ_WRITE_TOKEN`, creato collegando lo store Blob
  `corvoc` al progetto Vercel.
- `POST /api/corvoc/record` accetta solo WAV PCM mono 16 bit fino a 4 MB,
  richiede parlante e riferimento al consenso e rifiuta i take con errori
  bloccanti di qualità. Il limite è 30 richieste al minuto per client.
- Il manifest dell'app viene composto al volo da `/api/corvoc/manifest`:
  contiene le clip sintetiche statiche più le registrazioni online. L'audio
  online passa da `/api/audio?source=registrata&id=...`, stessa origine del
  manifest, così CSP e validazione dei percorsi restano coerenti.
- Il riepilogo è su `/api/report?format=csv|md|json`.

L'indice è un unico JSON: due salvataggi simultanei possono sovrascriversi.
Per un uso con più parlanti conviene usare codici separati e serializzare le
registrazioni. Il codice condiviso è una protezione contro gli abusi, non
un'identità personale: parlante e consenso restano la fonte dei dati nel
manifest pubblico.

#### Metodo manuale

1. Esegui `npm run voice:list` e prendi l'`id` della riga.
2. Registra la riga seguendo il
   [copione](copione-registrazione-voce.md): WAV mono, stanza silenziosa, stessa
   distanza dal microfono, mezzosecondo di silenzio prima e dopo.
3. Salva il file come `public/voce/registrata/<id>.wav` (vanno bene anche
   `.mp3`, `.ogg`, `.m4a`, `.opus`).
4. Esegui `npm run voice:corpus`.
5. Ricarica l'app: la registrazione vince sulla clip sintetica dello stesso testo.

Non rinominare il file a mano in un testo qualsiasi: l'`id` contiene uno slug e
un hash, e il manifest lo usa per collegare audio e testo. Se aggiungi righe al
copione, `npm run voice:list` stampa i nuovi id.

### Metadati del parlante e consenso

Lo studio salva per ogni take il parlante, il riferimento al consenso e la data
in `voice/registrazioni.json`. Il file non sta in `public/`, ma i campi vengono
copiati nel manifest e mostrati nella nota di ascolto dell'app:

```json
{
  "version": 1,
  "recordings": {
    "abba-7f1f4a": {
      "speaker": "Maria P.",
      "consentRef": "CONS-2026-011",
      "license": "consenso del parlante",
      "recordedAt": "2026-11-11T22:23:23.119Z"
    }
  }
}
```

Il manifest è pubblico se l'app viene pubblicata: **non inserire il documento di
consenso** e, se serve, usa uno pseudonimo o un codice di protocollo. Il
riferimento deve bastare a ritrovare il consenso firmato, non a sostituirlo.
Con il metodo manuale il take non ha metadati: il manifest lo segnala come
registrazione senza riferimento al consenso. Puoi aggiungerli registrando dallo
studio oppure scrivendo la voce in `voice/registrazioni.json` e rieseguendo
`npm run voice:corpus`. Il campo `speaker` del copione resta come fallback per il
nome, ma non fornisce un riferimento al consenso.

Per una prova o un corpus separato puoi cambiare `VOICE_RECORDINGS_DIR`: i
metadati vengono scritti accanto alla cartella. `VOICE_METADATA_FILE` sposta
l'indice altrove; `VOICE_MANIFEST_FILE` sposta il manifest generato. Sono le
stesse variabili usate da `npm run test:e2e`, che carica un WAV di prova in una
cartella temporanea, verifica qualità, metadati, manifest e nota di ascolto, poi
elimina tutto senza toccare il corpus reale.

### Riepilogo esportabile

```sh
npm run voice:report
npm run voice:report -- --out /tmp --json
```

Genera in `voice/` due file:

- `riepilogo-registrazioni.csv`: una riga per ogni registrazione ancora da fare,
  con gruppo, id, varietà, tipo, testo, presenza della clip sintetica e tempi
  stimati. È separato da punto e virgola e ha il BOM UTF-8, così si apre bene in
  Excel italiano; il testo è tra virgolette quando contiene separatori.
- `riepilogo-registrazioni.md`: tabella per gruppo con righe mancanti, quante
  hanno solo la clip sintetica, quante non hanno audio, voce effettiva e tempo
  del take. Include i totali e la formula della stima.

Con `--json` viene scritto anche `riepilogo-registrazioni.json`; con `--out` si
cambia la cartella. Le righe che hanno già una voce umana sono escluse: dopo una
sessione di registrazione basta rieseguire il comando.

La stima è dichiaratamente approssimativa: 0,45 s per parola + 0,035 s per
carattere, minimo 1,2 s di voce, più 4,5 s per take (ascolto della clip,
registrazione, controllo qualità e salvataggio). Non conta pause, ripetizioni o
errori. Il riepilogo non contiene audio né parlante/consenso, quindi si può
condividere con chi registra.

Il Markdown include anche un **piano delle sessioni** che divide le righe in
blocchi da 25 minuti, indicando l'id della prima e dell'ultima riga di ogni
sessione e il tempo di take stimato. Serve a chi registra per sapere dove
iniziare e finire ogni seduta.

```sh
npm run voice:report -- --no-sessions   # esclude il piano delle sessioni
```

Dallo studio gli stessi contenuti si scaricano dai link **CSV** e **Markdown**
nel pannello delle righe; l'endpoint è `/api/report?format=csv|md|json`.

### Manifest

`public/voce/manifest.json` è statico e viene letto dal browser. Ogni voce ha
`id`, `text`, `normalized`, `variant`, `source`, `file`, `mediaType`, `kind`,
`engine`, `speaker`, `consentRef`, `recordedAt` e `license`. Il client scarta file
fuori da `/voce/registrata/` e `/voce/sintetica/`, così un manifest manomesso non
può caricare percorsi arbitrari.

Il corpus incluso è **sintetico**: 206 clip LSC generate con eSpeak NG `sc`.
Non contiene registrazioni umane e non viene presentato come tale. Le clip sono
in `public/voce/sintetica/` e occupano circa 2,8 MB.

`màllia` e `campànnia` sono escluse dalla sintesi: l'attuale voce eSpeak non ha
il fonema [ʎ] e legge `lli` come due `l`. Restano nel copione e `voice:check` le
segnala; finché non vengono registrate, l'app ripiega sul motore o sulla voce del
dispositivo. Non è una scelta estetica: una clip sbagliata sarebbe peggio di
nessuna clip.

## Il motore TTS

### eSpeak NG con voce sarda

La voce `sc` nasce dalla pull request
[espeak-ng#2665](https://github.com/espeak-ng/espeak-ng/pull/2665), aperta il
7 novembre 2026 e non ancora mergiata. Segue la grafia LSC e la pronuncia
“sarda neutra” del progetto SINTESA (Università di Cagliari, 2013–2015); il
lessico di controllo è quello del modulo MaryTTS SINTESA (LGPL v3). La PR
dichiara il 96,9% di trascrizioni coincidenti su 10.528 parole.

`npm run voice:setup` clona il fork `asereze/espeak-ng` nel commit
`97caf4aea887b4d02668aaf4c4029a1c4ebdde7a`, compila con CMake e verifica
`--voices=sc`. Servono `git`, `cmake` e un compilatore C (Xcode Command Line
Tools su macOS, `build-essential` su Linux). Il commit è fissato perché il ramo
può cambiare; è recuperabile anche da solo con `git fetch origin <sha>`. Il
binario resta in `.cache/` (ignorato da Git) e non viene distribuito.

```sh
npm run voice:setup
npm run voice:synth
```

In sviluppo `vite.config.js` usa automaticamente
`.cache/espeak-ng/build/src/espeak-ng` e i suoi dati. In produzione Vercel non
può eseguire quel binario: serve un servizio HTTP.

Limiti noti della voce `sc`:

- non ha [ʎ], quindi `lli` palatale non è reso;
- legge in LSC, non nelle varietà campidanese e logudorese;
- è una voce formantica, chiaramente sintetica;
- non modella l'intonazione di frase di una parlata locale.

### Contratto HTTP

`POST /api/voice` inoltra al motore configurato:

```json
{
  "text": "Sa petza est bona",
  "language": "srd",
  "variant": "lsc",
  "format": "mp3"
}
```

Il testo è quello sardo mostrato all'utente: **non** viene riscritto in grafia
italiana. Il motore può rispondere in due modi:

- JSON: `{ "audio": "<base64>", "mediaType": "audio/mpeg", "engine": "sintesa", "engineLabel": "SINTESA", "warnings": [] }`;
- audio binario con `Content-Type: audio/*`.

Se il motore legge solo la LSC può aggiungere l'header
`X-Voice-Variant-Support: lsc-only`: l'app mostra un avviso quando la varietà
richiesta è campidanese o logudorese.

Variabili:

| Variabile | Uso |
| --- | --- |
| `SARDINIAN_TTS_URL` | endpoint HTTP del motore (obbligatorio in produzione) |
| `SARDINIAN_TTS_KEY` | bearer token opzionale, resta sul server |
| `SARDINIAN_TTS_FORMAT` | formato richiesto, default `mp3` |
| `SARDINIAN_ESPEAK_BIN` | binario eSpeak NG locale (alternativa allo HTTP) |
| `SARDINIAN_ESPEAK_DATA` | cartella `espeak-ng-data` |
| `SARDINIAN_ESPEAK_VOICE` | default `sc` |
| `SARDINIAN_ESPEAK_SPEED` | default `145` |

La route valida il JSON, limita il testo a 1.000 caratteri, applica 12 richieste
al minuto per client, impone un timeout di 20 secondi e un tetto di 4 MB
sull'audio. L'URL del motore viene solo dall'ambiente: il client non può farlo
puntare a un host arbitrario. Il token non viene mai registrato nei log.

### Server pronto

Il repository include un server minimale che espone eSpeak con lo stesso
contratto, utile su una macchina o un VPS con la build locale:

```sh
SARDINIAN_ESPEAK_BIN="$PWD/.cache/espeak-ng/build/src/espeak-ng" \
SARDINIAN_ESPEAK_DATA="$PWD/.cache/espeak-ng/build/espeak-ng-data" \
VOICE_SERVER_TOKEN="scegli-un-token" \
npm run voice:server
```

Ascolta su `127.0.0.1:8787` per impostazione predefinita. `GET /health`
risponde con lo stato; `POST /v1/speak` accetta lo stesso JSON descritto sopra e
restituisce `{ audio, mediaType, engine, engineLabel, warnings }`. Per esporlo
su una rete metti `VOICE_SERVER_HOST=0.0.0.0`, usa un reverse proxy con HTTPS e
imposta `SARDINIAN_TTS_URL` / `SARDINIAN_TTS_KEY` nell'app. Senza token il
server va lasciato su loopback o su una rete privata.

### Produrre una voce più naturale

Le strade sensate, in ordine di costo:

1. **Registrare il copione** con una persona madrelingua. È l'unica strada che
   dà una voce davvero sarda e permette di scegliere la varietà. Il corpus è già
   predisposto: non serve modificare il codice.
2. **Ospitare eSpeak NG `sc`** dietro un piccolo servizio HTTP. Qualità
   sintetica, ma pronuncia sarda e nessun costo per richiesta.
3. **Addestrare una voce Piper** su un corpus sardo autorizzato. Piper è
   GPL-3.0, usa eSpeak per la fonemizzazione e produce ONNX; servono dati con
   licenza compatibile, consenso dei parlanti e tempo di calcolo. Non è incluso
   in questo progetto.
4. **Usare SINTESA** (Università di Cagliari, LGPL v3, sperimentale). Non risulta
   un'API pubblica stabile: va ospitato o autorizzato, non interrogato per
   scraping. La pagina storica è `https://sintesa.nor-web.eu/`.
5. **SardinianVoxes** (Interspeech 2025) è un dataset audio-testo di circa 170
   ore, utile per ASR e per addestrare una voce, non un TTS pronto. Vanno
   verificati accesso e licenza prima del riuso:
   [ISCA Archive](https://www.isca-archive.org/interspeech_2025/carta25_interspeech.html),
   [codice](https://github.com/ai4limba/sardinian-voxes).

## Perché non c'è una voce umana inclusa

Una voce umana è un dato personale e richiede un consenso esplicito, separato
dalla licenza del testo. Non è corretto scaricare campioni da un sito, da un
video o da un dataset senza leggere le condizioni. Il repository include quindi
solo clip sintetiche, dichiarate come tali, e un percorso pronto per le
registrazioni di chi vorrà concederle.

## Verifica

```sh
npm test
npm run test:e2e
npm run lint
npm run typecheck
npm run build
npm run voice:check
```

I test coprono normalizzazione e ricerca nel corpus, precedenza della
registrazione umana, rifiuto dei percorsi non sicuri, validazione dell'input
vocale, scelta del motore, invio del testo sardo originale, risposta JSON e
binaria, errori senza fuga di corpo e una sintesi eSpeak reale quando il binario
locale è presente. Il test E2E carica un WAV di prova, verifica metadati,
manifest e nota di ascolto e controlla che il corpus reale non venga modificato.

Prova manuale:

1. `npm run voice:setup && npm run voice:synth`
2. `npm run dev`
3. Apri l'app, traduci una frase e premi **Ascolta**: deve comparire
   l'etichetta `sintetica` (o `motore` per un testo non nel corpus).
4. Nella sezione **Sa limba**, ascolta una parola del corpus: deve partire la
   clip, non la voce italiana.
5. Controlla in DevTools che `/voce/manifest.json` e i file `.mp3` rispondano
   200 e che `/api/voice` restituisca `audio`.

## Limiti dichiarati

- Le clip incluse sono sintetiche, non una voce umana.
- La voce eSpeak non rende [ʎ] e non distingue campidanese e logudorese.
- Per l'audio arbitrario in produzione serve un motore HTTP: senza
  `SARDINIAN_TTS_URL` l'app lo dichiara e usa la voce italiana del dispositivo.
- La qualità dipende dal motore scelto; il corpus umano resta il riferimento.
- Nessun audio viene salvato sul server: la sintesi è effimera.

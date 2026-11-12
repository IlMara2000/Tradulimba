# Il sardo scritto e parlato in TraduLimba

Questa nota raccoglie la ricerca che sostiene il motore linguistico dell’app e
spiega che cosa il codice applica davvero. Distingue tre livelli che non vanno
confusi:

1. **norma scritta** — la Limba Sarda Comuna (LSC), adottata dalla Regione
   Sardegna nel 2006 in via sperimentale per la lingua scritta
   dell’Amministrazione;
2. **pronuncia** — non esiste un unico accento LSC: la stessa grafia si legge
   con la fonetica della varietà di chi parla;
3. **varietà locali** — campidanese, logudorese, nuorese e parlate di
   transizione hanno tratti propri, e la LSC non le sostituisce.

L’app dichiara questa distinzione nell’interfaccia e nell’API. Una trascrizione
IPA «larga» è una guida di lettura, non una certificazione fonetica di ogni
paese.

## 1. La norma scritta

La fonte primaria è _Limba Sarda Comuna. Norme linguistiche di riferimento a
carattere sperimentale per la lingua scritta dell’Amministrazione regionale_,
allegata alla deliberazione della Giunta n. 16/14 del 18 aprile 2006.

- [Norme LSC, PDF regionale](https://www.regione.sardegna.it/documenti/1_72_20060418160308.pdf)
- [Deliberazione 16/14](https://www.regione.sardegna.it/documenti/1_74_20060503165850.pdf)

La norma si presenta come modello di mediazione: non impone una pronuncia e
lascia spazio a grafie locali. La LSU (Limba Sarda Unificada) del 2001 è una
proposta precedente, non adottata; non va presentata come un secondo standard
regionale equivalente.

### Regole ortografiche applicate

| Regola | Contenuto | Riferimento |
| --- | --- | --- |
| Alfabeto | `c`/`ch` e `g`/`gh` per i suoni velari; `tz` sorda, `z` sonora; `j` semivocale interna | §4.3, §4.2.5, §4.2.13 |
| Accento | obbligatorio su tronche e sdrucciole, assente sulle piane | §4.2.6 |
| Apostrofo | l’elisione non si scrive, salvo pochi monosillabi e `unu/una` | §4.2.16 |
| `de` | si scrive sempre intero: mai `d’` o `’e` | §4.2.3 |
| `q` | non si usa: `qu` diventa `cu` | §4.2.15 |
| `gli` + vocale | diventa `lli` + vocale | §5.3.3 |
| `sce`/`sci` iniziali | diventano `isce`/`isci` | §5.3.5 |
| Consonanti doppie | solo `b, d, l, m, n, r, s` | §4.2.4 |
| Clitici | punto mediano, non trattino: `nara·bi·lu` | §4.2.7 |

La norma non prescrive in modo esaustivo l’uso di `k, w, y, x` nei nomi propri
stranieri; per questo l’analizzatore li segnala come «fuori dall’alfabeto LSC»
invece di riscriverli automaticamente. La `x` è invece legittima nella grafia
campidanese, dove vale [ʒ].

### Accento e sillabe

La regola è semplice ma ha conseguenze precise sulla divisione in sillabe:

- tronca → accento grafico obbligatorio: `tribù`;
- sdrucciola → accento grafico obbligatorio: `cùcuru, fèmina, òmine,
  provìntzia, istùdiu, fìgiu, màllia, campànnia`;
- piana → nessun accento: `domo, iscola, matessi, sardu`;
- monosillabo → nessun accento: `cras, tres, so, est, sunt`.

Gli esempi della norma implicano una scansione vocalica in iato: `fì-gi-u`,
`pro-vìn-tzi-a`, `is-tù-di-u`, `màl-li-a`, `cam-pàn-ni-a`. Il motore usa
questa scansione per dedurre la tonica; se l’accento è scritto, vince quello.
Quando manca, la penultima sillaba è il valore predefinito. Il lessico di
pronuncia (`src/features/linguistics/lexicon.js`) copre le forme frequenti in
cui la sola grafia non basta, per esempio `fìgiu` scritto `figiu`.

La divisione ortografica non coincide sempre con quella fonetica: in `fìgiu` la
`i` di `gi` è un segno di palatalità, non una vocale piena. L’IPA usa la
pronuncia (`[ˈfidʒu]`), le sillabe mostrate nell’interfaccia restano quelle
ortografiche (`fì-gi-u`).

## 2. Pronuncia

### Vocali

La base è un sistema a cinque vocali. In campidanese la tonica ha fino a sette
realizzazioni di superficie, con [e]/[o] spesso condizionate dalla metafonia:
_bella_ [ˈbɛlla] ma _bellu_ [ˈbellu]. La LSC non segna l’apertura di `e` e `o`.
Per questo l’IPA dell’app è «larga» e il lessico fissa solo le parole comuni.

### Consonanti

- `dd` = [ɖɖ] retroflessa: _sedda_ [ˈseɖɖa], _cuddu_ [ˈkuɖɖu]. In alcune
  parlate la realizzazione può essere dentale/alveolare lunga.
- `nd` può avere una realizzazione retroflessa [ɳɖ] in alcune varietà, ma non è
  una regola unica.
- `ll` resta [ll], non diventa [ʎ] come in italiano: _bellu_ [ˈbellu].
  `lli` e `nni` valgono invece [ʎʎ] e [ɲɲ].
- `tz` = [ts] sorda, `z` = [dz] sonora, `sc` davanti a e/i = [ʃ], `x`
  campidanese = [ʒ].
- `s` intervocalica può sonorizzare in [z], ma la variazione è locale: l’app
  mantiene [s] nella trascrizione di base e lo dichiara nelle note.

### Lenizione e sandhi

In campidanese le occlusive sonore intervocaliche possono lenirsi:
_meda_ [ˈmeða], _sa domo_ [sa ˈðɔmo]. La -s finale si assimila spesso alla
consonante seguente (_sas domos_ → [sar ˈdɔmos]) e la consonante iniziale
mobile può cadere dopo l’articolo (_su bentu_ → [su ˈentu]). Sono fenomeni del
parlato connesso, non della grafia: la norma privilegia la costanza morfologica.

### Intonazione

Non esiste una cadenza unica per campidanese e logudorese. Le domande sì/no non
hanno sempre un finale ascendente come in italiano; contano marcatori lessicali
e prominenze iniziali. L’app non impone una curva intonativa «etnica» alla voce.

## 3. Varietà

| Tratto | LSC | Campidanese | Logudorese |
| --- | --- | --- | --- |
| Articolo plurale | `sos` / `sas` (o `is`) | `is` | `sos` / `sas` |
| Finali | `-o` / `-e` | `-u` / `-i` | `-o` / `-e` |
| Infinito | `-are/-ere/-ire` | `-ai/-iri` | `-are/-ere/-ire` |
| «io» | `deo` | `deu` | `deo` |
| «tu» | `tue` | `tui` | `tue` |
| «noi» | `nois` | `nosu` | `nois` |
| «voi» | `bois` | `bosatrus` | `bois` |
| `x` | adattata (spesso `ss`) | [ʒ] | assente |

La conversione automatica in `src/features/linguistics/varieties.js` applica
solo corrispondenze documentate e dichiara ogni modifica:

- articolo plurale `sos/sas` → `is`;
- finali `-o/-e` → `-u/-i`, plurali `-os/-es` → `-us/-is`;
- infiniti `-are` → `-ai`, `-ere/-ire` → `-iri`;
- lessico sicuro (`deo` → `deu`, `tue` → `tui`, `pische` → `pisci`, ...).

Non converte lessico locale, verbi irregolari, toponimi e forme dubbiose. Il
logudorese resta quasi identico alla LSC: le differenze sono soprattutto
lessicali e locali, e l’app lo dichiara invece di inventare una varietà.

## 4. Come è implementato

```
src/features/linguistics/
  syllables.js      divisione in sillabe, accento, tipo di parola
  phonology.js      grafia → IPA e grafia italiana di lettura
  lexicon.js        pronuncia di forme frequenti, italianismi, lessico di varietà
  orthography.js    controllo LSC e normalizzazione non ambigua
  varieties.js      adattamento a regole e confronto tra varietà
  guide.js          dati della guida mostrata nell’interfaccia
  index.js          analyzeSardinian(): API unica per client e server
```

Il modulo è puro JavaScript, senza dipendenze, e viene usato sia dal browser sia
dalle funzioni serverless. `POST /api/translate` restituisce, oltre alla
traduzione:

- `analysis`: IPA, sillabe, tonica, parole analizzate, note e segnalazioni;
- `analysisSide`: `target` (traduzione sarda) o `source` (testo sardo in
  ingresso);
- `orthography`: correzioni non ambigue applicate al testo (q, gli, ts, sce/sci);
- `varietyChanges`: elenco delle sostituzioni di varietà applicate;
- `method`: `apertium`, `rules` o `rules+ai`.

L’adattamento a regole viene eseguito prima del post-editor AI. Se il provider
non è configurato, l’app mostra comunque la varietà adattata e dichiara che si
tratta di regole da verificare, invece di etichettare la forma LSC come
campidanese.

## 5. Voce

La sintesi vocale usa una voce italiana su una riscrittura fonetica
(`src/features/translation/speechScript.js`): `tz` → `zz`, `j` → `i`,
intervocalica `s` → `ss`, `x` secondo la varietà, e in campidanese anche
`d` intervocalica → `r` e finali `-o/-e` → `-u/-i`. È un compromesso: una voce
italiana non rende le retroflesse [ɖɖ], le leni [β]/[ð]/[ɣ], l’apertura
vocalica non segnata né le assimilazioni di frase.

Per una voce sarda vera servono un parlante e un corpus registrato. La ricerca
italiana offre due precedenti:

- **SINTESA** (Università di Cagliari, 2015): prototipo TTS basato su analisi
  fonetica, fonologica e prosodica di una varietà sarda;
- **SardinianVoxes** (ISCA, 2025): dataset audio-testo di circa 170 ore,
  annotato per la diversità interna delle varietà, con protocollo di valutazione
  ASR.

Prima di usare questi materiali vanno verificati accesso, licenza e condizioni
di riuso. Il [copione di registrazione](copione-registrazione-voce.md) descrive
come costruire un corpus proprio con consenso esplicito dei parlanti.

## 6. Limiti dichiarati

- L’IPA è larga e generata da regole: non sostituisce la pronuncia di un
  parlante.
- L’apertura di `e`/`o` è lessicale; il lessico copre solo le forme frequenti.
- La lenizione è applicata alle occlusive sonore intervocaliche in campidanese,
  ma nella realtà dipende da prosodia, contesto e parlante.
- L’adattamento di varietà non è una traduzione: è una conversione di grafia e
  di poche forme documentate.
- Il controllo ortografico segnala possibili italianismi, non li corregge
  d’autorità: una parola italiana può essere una citazione o un prestito voluto.
- La LSC è una norma sperimentale per la lingua scritta amministrativa, non una
  certificazione linguistica né un obbligo per ogni autore.

## 7. Fonti

- Regione Autonoma della Sardegna, _Limba Sarda Comuna_, 2006:
  <https://www.regione.sardegna.it/documenti/1_72_20060418160308.pdf>
- Deliberazione 16/14: <https://www.regione.sardegna.it/documenti/1_74_20060503165850.pdf>
- Mereu, «Cagliari Sardinian», _Journal of the International Phonetic
  Association_: <https://www.cambridge.org/core/journals/journal-of-the-international-phonetic-association/article/cagliari-sardinian/5B30AFE68BBB1CB462067B3C9A9CED45>
- Katz & Pitzanti, «The phonetics and phonology of lenition»:
  <https://www.journal-labphon.org/article/id/6252/>
- Vanrell et al., «Sardinian intonational phonology»:
  <https://academic.oup.com/book/1562/chapter/141047923>
- Treccani, «Sardi, dialetti»:
  <https://www.treccani.it/enciclopedia/dialetti-sardi_(Enciclopedia-dell%27Italiano)>
- SardegnaCultura, «Varietà campidanesi»:
  <https://www.sardegnacultura.it/en/articles/varieta-campidanesi>
- Apertium, «Sardo e italiano»: <https://wiki.apertium.org/wiki/Sardo_e_italiano>
- Apertium, rapporto finale:
  <https://wiki.apertium.org/wiki/Sardo_e_italiano/Rapporto_finale>
- Ditzionàriu in línia: <https://ditzionariu.nor-web.eu/it/ditzionariu/presentada>
  (opera protetta: consultazione, non riuso del dataset senza autorizzazione)
- Wikipedia in sardo: <https://sc.wikipedia.org/wiki/>
- SINTESA, Università di Cagliari: <https://iris.unica.it/handle/11584/134275>
- SardinianVoxes, ISCA: <https://www.isca-archive.org/interspeech_2025/carta25_interspeech.html>
- Lupinu, _Manualetto di linguistica sarda_:
  <https://iris.uniss.it/retrieve/daa4be4e-97a5-4705-9973-dc3a4e8d8fdf/78-Libro-849-1-10-20241128-1.pdf>

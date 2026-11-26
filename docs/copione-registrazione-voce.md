# TraduLimba — copione per registrare la voce

Questo copione serve a creare in seguito una voce personale per TraduLimba. Non va caricato automaticamente su alcun servizio: prima dell’invio delle registrazioni sarà necessario scegliere il fornitore e approvare esplicitamente destinazione, condizioni d’uso e trattamento della voce.

La **Limba Sarda Comuna è soprattutto una norma scritta**, non un unico accento orale. Leggi quindi con la tua pronuncia reale e naturale. Non imitare campidanese o logudorese se non sono la tua varietà. Per offrire più accenti, è meglio usare parlanti distinti e corpora separati.

Prima della registrazione definitiva fai controllare il testo sardo da un parlante madrelingua della tua zona e, per la LSC, da una persona competente nella norma scritta.

Per il corpus di ascolto dell'app non serve rinominare i file: usa lo studio `npm run voice:record`, che salva ogni riga con l'`id` del copione e aggiorna il manifest. Lo studio richiede anche un nome o codice del parlante e un riferimento al consenso, li salva in `voice/registrazioni.json` e li riporta nel manifest pubblico e nella nota di ascolto. Non incollare il documento di consenso: usa un codice di protocollo. Lo studio controlla inoltre durata, silenzio iniziale e finale, rumore di fondo, rapporto voce/rumore e clipping prima del salvataggio. Per pianificare le sessioni, `npm run voice:report` esporta le righe mancanti divise per gruppo con i tempi stimati. I nomi `TL_DM01_...` descritti qui servono se in futuro registri un dataset separato per addestrare un modello vocale.

## Preparazione

- Registra in una stanza silenziosa, senza riverbero, ventilatori, musica o notifiche.
- Usa sempre lo stesso microfono, a circa 15–20 cm dalla bocca.
- Formato consigliato: WAV mono, 48 kHz, 24 bit, senza compressione o effetti.
- All’inizio registra 10 secondi di silenzio della stanza.
- Una riga per file, con circa mezzo secondo di silenzio prima e dopo.
- Se sbagli, ripeti tutta la riga: non unire parole registrate in momenti diversi.
- Mantieni un tono naturale, senza voce pubblicitaria e senza rallentare troppo.
- Fai sessioni di 20–30 minuti con pause.
- Primo obiettivo: 90–120 minuti puliti. Per una voce più robusta: 3–5 ore.

Nomi file consigliati: `TL_DM01_LSC_S01_NAT_001_T01.wav`.

- `DM01`: codice del parlante
- `LSC`, `CAMP` o `LOG`: varietà
- `S01`: sessione
- `NAT`: tono naturale
- `001`: numero della riga
- `T01`: numero della ripresa

## Fase 0 — consenso separato

Questa frase va conservata separatamente e **non inserita nel modello vocale**.

> Mi chiamo [nome e cognome]. In data [data] autorizzo [titolare del progetto] a creare e utilizzare una voce sintetica basata sulla mia voce per TraduLimba, nei limiti descritti nel consenso scritto che ho firmato. Sono consapevole che si tratta di una voce artificiale e conosco le modalità previste per chiederne la disattivazione o la cancellazione.

Il consenso scritto dovrà indicare: uso commerciale o non commerciale, durata, conservazione, eventuali fornitori, revoca, cancellazione e divieto di impieghi non autorizzati.

## Fase 1 — vocali, consonanti e parole fondamentali

Registra ogni riga come file distinto.

```text
a, e, i, o, u
ànima, àghina, èssere, fèmina, lìberu, òmine, nùmene
bentu, boe, binu, saba, nabu, abe, cabu
abba, ebba, babbu, àbbila
cane, coa, cuddu, chessa, chida
dente, domo, die, seda, meda, ladu, sedda
gana, gosu, agu, largu, àngulu
lughe, aghedu, arghentu, pranghende
àgiu, fìgiu, giogu, càgiu, bìngia, angione
maju, operaju
cala, calla
cana, canna
caru, carru
ando, cando
apo, tropu
pesare, essire
gatu, fatu
tziu, petza, putzu
frore, frùmene, pane, pannu
logu, boghe, fogu, nughe, paghe
craru, crèsia, ogru, agru
madassa, letu, atzàrgiu, latzu
prenu, lavra, iscola, ispiga, istare
arbu, farche, pedde, arga
curpa, artu, inferru, àrbore
porcu, surdu, ortu, piscare, pische
mascru, bespe, fossa, festa, pedra
prànghere, ungra, limba, sàmbene
ghennàrgiu, Sardigna
```

## Fase 1B — coppie di parole, accento e suoni difficili

Queste righe servono a insegnare al corpus le distinzioni che una voce italiana
non rende. Pronuncia ogni coppia due volte, prima isolata e poi dentro una frase.
Non forzare la retroflessione se la tua parlata non la usa: registra la tua
realizzazione reale e annotala nel foglio di trascrizione.

```text
manu [ˈmanu] / mannu [ˈmannu]
caru [ˈkaru] / carru [ˈkarru]
bella [ˈbɛlla] / bellu [ˈbellu]
sedda [ˈseɖɖa] / seta [ˈseta]
fìgiu [ˈfidʒu] / fizu [ˈfidzu]
màllia [ˈmaʎʎa] / malia [maˈlia]
```

Frasi per il sandhi e l’accento di frase:

```text
Sas domos sunt mannas. — [sar ˈdɔmos sunt ˈmannas]
Su bentu est fretu. — [su ˈentu est ˈfretu]
Sa domo est abertu. — [sa ˈðɔmo est aˈbertu]
Deo so inoghe, tue ses in cue.
Non b’est perunu problema.
```

L’analizzatore della sezione **Sa limba** mostra IPA, sillabe e tonica delle
parole che scrivi: usalo per controllare la trascrizione del copione prima
della registrazione definitiva. Le trascrizioni qui sopra sono larghe e
orientative, non una norma di pronuncia.

## Fase 2 — frasi naturali in LSC

Queste sono bozze di lavoro da revisionare prima della registrazione definitiva.

```text
Bonas dies, comente istas?
Oe su chelu est lìmpidu e su mare est calmu.
Cras amus a andare a su mercadu de bonu mangianu.
Custa domo est pitica, ma est prena de lughe.
Pro praghere, podes repìtere prus a bellu?
Non apo cumpresu custa paràula.
Ue s’agatat sa firmada de su postale?
A ite ora movet su trenu pro Casteddu?
Dia bòlere una tassa de abba e unu cantu de pane.
Cale est su caminu prus curtzu pro arribare a su paisu?
Ite bella die!
Atentzione: su pamentu est infusu.
In Sardigna cada paisu custoit paràulas e sonos diferentes.
Faeddo cun calma, sena cùrrere, e lasso una curtza pàusa.
Custa est una pregonta?
Custa est una risposta.
Fortzis apo a bènnere cras; oe non potzo.
Sa boghe est crara e naturale.
Cada frase depet àere unu ritmu naturale.
In crèsia b’aiat unos chimbe òmines e unas chentu fèminas.
A nde boles petza?
A nche lu leas a domo?
Deo so inoghe e tue ses cun megus.
Nois semus istados in su paisu.
Bois seis bènnidos a tempus?
Issos ant fatu unu traballu bonu.
Deo apo a fàghere una prova noa.
Tue as a bènnere cun nois?
Sos pitzinnos giogant in sa pratza.
Sas domos sunt antigas e sas gennas sunt abertas.
```

## Fase 3 — numeri, date e dati pratici

```text
Zeru, unu, duos, tres, bator, chimbe, ses, sete, oto, noe, deghe.
Ùndighi, dòighi, trèighi, batòrdighi, bìndighi, sèighi.
Deghessete, degheoto, deghennoe, binti.
Trinta, baranta, chimbanta, sessanta, setanta, otanta, noranta.
Chentu, dughentos, milli, duamìgia, unu millione.
Su nùmeru meu est tres, bator, sete, zeru, noe, duos.
S’addòbiu est in sas sèighi e trinta.
Su prètziu totale est de bintitrès èuros e chimbanta tzentèsimos.
Sa temperadura est de bintisete grados.
Oe est lunis, bintibator de austu de duamìgia e bintisès.
```

Registra inoltre, nella tua varietà naturale:

- tutti i giorni della settimana;
- tutti i mesi;
- tre date complete;
- tre orari;
- tre prezzi;
- un numero telefonico scandito cifra per cifra;
- un indirizzo, un’email e un indirizzo web.

## Fase 4 — parole moderne e prestiti

Pronunciale come le diresti realmente dentro una conversazione sarda.

```text
tzitadinu, provìntzia, arantzu, gente
Gènova, Parigi, giacheta, giorronada
giustìtzia, geografia, cardiologia
màllia, campagna, Sardigna, iscena, isciropu
TraduLimba, Internet, Wi-Fi, email
smartphone, computer, browser, podcast
streaming, WhatsApp, QR code, GPS, USB
tradulimba punto space
```

## Fase 5 — ritmo, domande ed emozioni

Registra ogni riga una volta in tono neutro e, dove indicato, una seconda volta con l’emozione richiesta.

```text
Custa est sa domo. — tono neutro
Custa est sa domo? — domanda naturale
Ue ses andende? — domanda informativa
Beni inoghe, pro praghere. — invito cordiale
Beni inoghe! — urgenza, senza gridare
Ite bella die! — gioia
Oe no; cras, fortzis. — contrasto
Apo pane, càgiu, abba e binu. — elenco
Non apo cumpresu custa paràula. — dispiacere lieve
Pro praghere, podes repìtere prus a bellu? — cortesia
```

Non imporre automaticamente alle domande sarde la salita finale tipica dell’italiano: usa l’intonazione spontanea della tua parlata.

## Fase 6A — campidanese

Esegui questo blocco soltanto se è la tua varietà reale. Fai controllare grafia e trascrizione da un madrelingua campidanese.

```text
celu, centu, pisci, luxi
domu, sànguni, lingua
scola, scala, sciri, deu
cani, gatus, nii
buca, sabudu, cibudda
Seu papendi.
Apu a papai.
```

Dopo le parole, crea spontaneamente una frase naturale con ciascuna e trascrivi esattamente quello che hai pronunciato.

### Blocco esteso — fonemi critici e 48 frasi

Questo blocco è già nel copione operativo `voice/copione.json`, nei gruppi
`campidanese-suoni` e `campidanese-frasi`, quindi compare nello studio di
registrazione con i suoi id. Serve a coprire i cinque punti in cui una voce
italiana o una LSC letto con pronuncia italiana sbaglia di più.

Parole isolate (`campidanese-suoni`):

```text
grafia x / j — atteso [ʒ]
Puxeddu, Nuxis, Maxia
grafia sc — atteso [ʃ]
Pusceddu, Nuscis, sciri, iscola, pisci
grafia tz — atteso [ts]
ditzionàriu, pretzisu, pratza, tziu
grafia dd — atteso [ɖɖ] retroflesso
bidda, caddu, casteddu, puddu
vocali toniche e lunghe
lìngua, Mòguru, pìndulas, fèmina, númeru
```

**Revisione del gruppo parole (22 novembre 2026).** Ogni voce è stata cercata
sul *Ditzionàriu in Línia*. Confermate `tzíu`, `castédhu`, `písci`, `pretzísu`,
`púdhu`, `píndula`, `númeru`; sostituiti `iscriiri` → niente (l'infinito
campidanese non ha lemma: il dizionario ha `iscríere`), `sci` → `sciri`,
`pratzu` (lemma assente) → `pratza`. Rimossi senza sostituto `ativat` e `beddu`,
che non hanno lemma. Il gruppo è quindi sceso da 24 a 21 parole: le righe che
restano coperte sono x/j, sc, tz, dd e le vocali toniche.

Frasi (`campidanese-frasi`), in ordine, 48 righe:

<!-- copione-table:campidanese-frasi:start -->
| # | Frase |
| --- | --- |
| 1 | Puxeddu est unu fueddu de sa bidda. |
| 2 | Nuxis est una bidda de sa Sardigna. |
| 3 | Nuscis e Nuxis sunt duus fueddos. |
| 4 | Sa genti de Nuxis est in fèsta. |
| 5 | Maxia est unu fueddu de sa limba sarda. |
| 6 | Sa x de Puxeddu no est sa sc de Pusceddu. |
| 7 | In iscola su maistru est unu òmini de Nuxis. |
| 8 | Su sardu de Nuxis est in su ditzionàriu. |
| 9 | S'iscola de sa bidda est manna. |
| 10 | Su ditzionàriu est in s'iscola. |
| 11 | Custu est su ditzionàriu de sa limba sarda. |
| 12 | Su pitzinnu est in s'iscola. |
| 13 | Is pitzinnos sunt in s'iscola. |
| 14 | Su maistru de s'iscola est cun is pitzinnos. |
| 15 | Gratzias meda, sa limba sarda est bella. |
| 16 | Su chelu est iscuru immui. |
| 17 | Sa bidda est in su monti. |
| 18 | Su caddu est in sa bidda. |
| 19 | Su caddu est mannu e bellu. |
| 20 | Sa bidda de su monti est manna. |
| 21 | Milli e centu annos sunt meda. |
| 22 | Custu est s'annu de sa fèsta. |
| 23 | Su pipiu est piticu, su caddu est mannu. |
| 24 | Mércuris, giòbia e chenàbura sunt dies de sa cida. |
| 25 | Oi est mércuris. |
| 26 | Cras est giòbia. |
| 27 | A mangianu su chelu est bellu. |
| 28 | A sero sa bidda est iscura. |
| 29 | Unu, duus, tres, bàtoro, cincu. |
| 30 | Ses, otu, noi, dexi. |
| 31 | Lunis, martis, mércuris, giòbia, chenàbura. |
| 32 | Sàbadu e domíniga sunt dies de fèsta. |
| 33 | Su pani est in sa domo. |
| 34 | Su binu est in sa domo. |
| 35 | S'abba est in sa domo. |
| 36 | Su pani e su binu sunt in sa domo. |
| 37 | Sa domo de sa bidda est betza. |
| 38 | S'òmini e sa fèmina sunt in domo. |
| 39 | Su pipiu e sa mama sunt in domo. |
| 40 | Sa mùsica de sa fèsta est in sa bidda. |
| 41 | Torrai a domo est bellu. |
| 42 | Immui sa mùsica est in sa bidda. |
| 43 | Sa terra de sa bidda est manna e bella. |
| 44 | Su monti e su mari sunt in sa terra sarda. |
| 45 | Totu is pitzinnos sunt in s'iscola. |
| 46 | Su pipiu est in domo chene sa mama. |
| 47 | Sa dimanda de su pitzinnu est tosta. |
| 48 | Chene agiudu sa faddina est tosta puru. |
<!-- copione-table:campidanese-frasi:end -->

**Revisione del 22 novembre 2026.** Le frasi sono state ripassate una per una
sul *Ditzionàriu in Línia*: ogni parola di contenuto ora ha un lemma attestato.
Sono entrate forme verificate che prima mancavano — `cincu`, `ses`, `otu`,
`noi`, `dexi`, `lunis`, `martis`, `sàbadu`, `domíniga`, `prus`, `genti`,
`caddu`, `iscuru`, `tardu`, `fèsta`, `mùsica`, `pitzinnu`, `cústu` — e `sunt`
al posto di `funt`, che il dizionario non registra.

Sono uscite, perché **non ho trovato il lemma**, queste forme: `pronuntziant`,
`cognome`, `agatat`, `traxi`, `sezus`, `andaus`, `iscriiri`,
`imparaus`, `apu`, `frescu`, `iscarpas`, `noas`,
`funt`, `iscrizionis`, `depit`, `depis`,
`curreta`, `pratzu`, `ativat`, `fait`, `bortas`,
`currit`, `beddu`, `differentzia`, `antiga`, `pìndulas`, `curtas`,
`craras`, `stas`, `ajò`, `perdast`, `serrat`,
`si chistionat`, `si fait`, `si intendit`,
`si depit`, `si pronuntziant`, `s'agatat`.

Elenco ridotto dopo verifica sul Puddu (22 nov 2026): le forme che hanno in
realtà un lemma accentato (`matessi` → `matéssi`, `innantis` → `innàntis`,
`pentzu` → `péntzu`, `mezus` → `mézus`, `cadira` → `cadíra`,
`bixinau` → `bixinàu`, `prenu` → `prénu`, `ancora` → `ancòra`,
`iscusa` → `iscúsa`, `intesu` → `intésu`, `dìa` → `dí, día`,
`armariu` → `armàriu`, `abertu` → `abértu`, `cursu` → `cúrsu`,
`rete` → `rète`, `lughe` → `lúghe`, `miu` → `míu`, `tzilleri` → `tzilléri`,
`costau` → `costàtu`, `pratu` → `pràtu`, `sesi` → `sèse`,
`mercau` → `mercàtu`, `premiu` → `prémiu`, `andau` → `andhàu`,
`minore` → `minòre`, `mia` → `mía`, `peus` → `péus`,
`campagna` → `campàgna`, `pedra` → `pèdra`, `casteddu` → `castédhu`,
`puddu` → `púdhu`, `pudda` → `púdha`, `corte` → `còrte`,
`cumpletu` → `complétu`, `tesu` → `tésu`, `sòlitu` → `sólitu`,
`stau` → `stàu`, `bisu` → `bísu`, `traballu` → `trabàlliu`,
`sciu` → `scíu`) sono state tolte; `s'agatat` non è verificabile (errore
server sul dizionario).

Un'eccezione in quella lista: `manera` un lemma ce l'ha, accentato — `manèra`
(nf, avb). La grafia corrente resta senza accento, e la parola non compare
comunque nelle 48 frasi attuali. Restano fuori anche le altre forme segnalate
per le vecchie frasi 12 e 18: `imparaus`, `depit`, `curreta` non hanno lemma
(«Parola non trovata»), perché il dizionario registra solo gli infiniti
`imparài`, `dèpi` e `cúrri`/`cúrrere`.

Restano da far controllare a un madrelingua campidanese, perché sono forme generate dalla
morfologia e non lemmi: il plurale `pitzinnos`, `fueddos`, `dies`, `annos`; il
femminile `manna`, `iscura`, `betza`, `bella`, `tosta`, `sarda`; l'articolo
`is`/`s'`; e i nomi propri `Puxeddu`, `Pusceddu`, `Nuxis`, `Nuscis`, `Maxia`,
`Sardigna`, che non si verificano sul dizionario perché sono nomi.

Indicazioni per questo blocco:

- **Non fondere `x` e `sc`**: `Puxeddu` [ʒ] e `Pusceddu` [ʃ] sono due parole
diverse, e la riga 6 serve proprio a verificare che restino distinte. Vale lo
stesso per `Nuxis` e `Nuscis`.
- **`dd` è retroflesso** [ɖɖ] in `bidda` e `caddu` (righe 1, 3, 17, 18, 20,
37, 40). Dopo la revisione non ci sono più coppie di controllo come
`beddu`/`puddu`: quelle parole non hanno attestazione e vanno verificate prima
di tornare nel copione. Se la tua parlata non usa la retroflessione, registra la
tua realizzazione reale e annotala: meglio un dato vero che una pronuncia
imitata.
- **Allunga la tonica** dove la varietà lo richiede e non spostare l'accento
sulle sdrucciole: `Mòguru`, `pìndulas`, `númeru`.
- Leggi in tono naturale, come se spiegassi a uno studente: non recitare e non
rallentare per "far capire meglio".
- Le righe campidanese **non vengono sintetizzate** con eSpeak, che copre solo la
LSC: compaiono in `npm run voice:check` come mancanti finché una persona non le
registra. È il comportamento previsto, non un errore.
- Fai controllare i testi da un madrelingua dell'area di Mogoro prima della
sessione definitiva: riregistrare 48 frasi costa più di una revisione.

## Fase 6B — logudorese

Esegui questo blocco soltanto se è la tua varietà reale. Fai controllare grafia e trascrizione da un madrelingua logudorese.

```text
chelu, chentu, pische, lughe
domo, sàmbene, limba
iscola, iscala, ischire, deo
cane, deghe, pane
fìgiu, bìngia, boghe
```

Anche qui crea una frase spontanea per ogni parola e trascrivila fedelmente.

## Fase 7 — parlato spontaneo

Registra 2–3 minuti per argomento. In seguito il materiale andrà diviso in segmenti di circa 5–12 secondi, ognuno con trascrizione esatta.

- Presentati e racconta da quale paese proviene la tua parlata.
- Descrivi casa, paese, mare e campagna.
- Spiega una ricetta tradizionale.
- Racconta un ricordo d’infanzia.
- Dai indicazioni stradali.
- Simula un dialogo al mercato.
- Descrivi il tempo di oggi e quello previsto domani.
- Racconta un episodio divertente.
- Spiega il significato di cinque parole sarde.
- Leggi una traduzione e poi ripetila in modo più naturale.

## Come entra nel corpus

Il copione operativo è `voice/copione.json`; l'elenco delle righe con i relativi
id si ottiene con:

```sh
npm run voice:list
```

Ogni riga ha un id stabile (slug più un breve hash). Salva la registrazione in
`public/voce/registrata/<id>.wav` — vanno bene anche `.mp3`, `.ogg`, `.m4a` e
`.opus` — poi ricostruisci il manifest:

```sh
npm run voice:corpus
```

La registrazione umana ha priorità sulla clip sintetica dello stesso testo. Le
righe elencate in `excludeSynthesis` (`màllia`, `campànnia`) non vengono
generate con eSpeak perché quella voce non rende [ʎ]: sono tra le prime da
registrare. `npm run voice:check` mostra cosa manca. Il contratto del corpus e
del motore è in [`voce-sarda.md`](voce-sarda.md).

## Controllo finale

- Ascolta tutti i file in cuffia e scarta rumori, clipping, colpi sul tavolo e letture forzate.
- Conserva un foglio con: `file_id`, testo esatto, varietà, parlante, data, ripresa, revisore e stato di approvazione.
- Fai ascoltare il corpus ad almeno un madrelingua della stessa zona.
- Non mescolare accenti imitati in una singola voce.
- Conserva i file originali WAV e crea copie separate per eventuali elaborazioni.

Riferimenti utili: [norme ufficiali LSC della Regione Sardegna](https://www.regione.sardegna.it/documenti/1_72_20060418160308.pdf) e [ricerca sull’intonazione campidanese e logudorese](https://academic.oup.com/book/1562/chapter-abstract/141047923).

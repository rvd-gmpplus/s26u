# Masterplan s26u

Doel: een interactieve 3D-explosietekening van de Samsung Galaxy S26 Ultra op het niveau van een volledige teardown, met de
werkwijze en kwaliteitslat van `rvd-gmpplus/laguna3`. Het toestel is dat van de gebruiker: 1 TB met 16 GB RAM, White (wit
achterglas, zilveren frame).

## Keuzes van de gebruiker

| Vraag | Keuze |
|---|---|
| Detailniveau | Volledige teardown: alle lagen zoals iFixit (scherm, frame, moederbord, batterij, koeling, camera's, S Pen, kleine delen) |
| Hergebruik van laguna3 | Kern één keer kopiëren, daarna los; laguna3 blijft ongewijzigd |
| Uitvoering | Eigen toestel: 1 TB, White met zilveren frame |

## Ontwerpbesluiten

- **Schaal.** Eén wereldeenheid is 40 mm (`MM` in `src/core.js`). In het eerste plan stond meter als eenheid met een apart
  object voor alle schaalafhankelijke constanten. Bij het overzetten bleek dat de app en de tests tientallen van zulke
  constanten verspreid hebben staan (uitklapminimum, optillen, camera-afstanden, near en far, vloer, ankertoleranties,
  doorsteekmarges). Met 40 mm per eenheid is de telefoon 4,09 eenheden lang, vrijwel even groot als de Laguna (4,7) in de
  oude app, en blijven al die afgestelde constanten kloppen. Maten in de code staan altijd in millimeters via `mm()`.
- **Ligging.** Scherm op de vloer, achterkant boven, bovenrand naar -z. De demontagevolgorde van een Galaxy (achterglas
  eerst, scherm als laatste van het frame) wordt zo een stapel die naar boven uitklapt.
- **Hoofdgroepen.** Achterkant, Camera's, Moederbord, Energie en koeling, Randapparatuur, S Pen, Behuizing, Scherm. De
  kleuren per systeem en de röntgenweergave (achterkant, behuizing en scherm doorzichtig) staan in `src/app1.js`.

## Golven

### Golf 0: repo opzetten (klaar)
- Kern gekopieerd: `build.py`, `src/core.js`, `src/app1.js`, `src/app2.js`, `src/presets.js` (motor), `src/head.html`,
  de testset en de orkestratiescripts. Namen omgezet (`__s26u`, `__S26U_VERSION__`, `S26U_TEST`, `S26U_TIMEOUT_MS`,
  cachemap `~/.cache/s26u`).
- Auto-specifieke delen vervangen: hoofdgroepkleuren, röntgen, camerarichtingen, zoeksynoniemen, teksten, hint,
  onderdeelnummerpaneel (Samsung-servicenummers, status `model` in plaats van `vin`), materialen, vormhelpers.
- Plaatshouder `src/phone.js`: drie lagen op de buitenmaat. Vijf overzichtspresets.
- Testset groen: `lint smoke integ inner opentest tri pub stats`.

### Golf 1: bronnen en skelet (klaar)
1. `docs/specificaties-en-bronnen.md` aanvullen met maten, materialen en demontagevolgorde. Bronnen:
   - de iFixit-teardown en de iFixit-gidsen;
   - de JerryRigEverything- en PBKreviews-teardowns;
   - de specificatiepagina's van Samsung;
   - de maattekening (hoekstraal, camera-eiland, knoppen).
2. Open punten sluiten:
   - kleur: White met zilveren frame (vastgesteld door de gebruiker);
   - materiaal van het frame;
   - diafragma van de hoofdcamera (f/1,4 of f/1,7 volgens verschillende bronnen).
3. Het volledige skelet van de boom vastleggen (`data/tree.json`) en `tools/anchors.json` uitbreiden:
   - de acht hoofdgroepen met `contains` en `content`;
   - budgetten, voorlopig 450.000 driehoeken in totaal.
4. `tools/silhouette.py` met referentieprofielen voor voor-, zij- en achteraanzicht uit de maattekening.

### Golven 2 en 3: geometrie per domein (klaar)
Parallel in eigen worktrees, met `mergecheck.py` vóór elke samenvoeging.

| Domein | Bestand | Inhoud |
|---|---|---|
| Behuizing | `frame.js` | Middenframe met antennesplitsingen, knoppen, SIM-lade, S Pen-garage, middenplaat |
| Achterkant | `rear.js` | Achterglas, camera-ringen, draadloze laadspoel met NFC, grafietfolie |
| Scherm | `display.js` | Coverglas, OLED-paneel, Wacom-digitizer, ultrasone vingerafdruksensor, selfiecamera |
| Camera's | `camera.js` | Hoofdcamera 200 MP, ultragroothoek 50 MP, tele 10 MP, periscoop 50 MP met prisma, flitser, laser-AF |
| Moederbord | `board.js` | Moederbord (sandwich met interposer), SoC, 16 GB RAM, 1 TB opslag, modem en RF, afschermkapjes, connectoren |
| Energie en koeling | `power.js` | Batterij met treklip en lijmhuls, vapor chamber, koelstapel van vier lagen |
| Randapparatuur, S Pen | `peripherals.js` | USB-C-subbord, luidsprekers, oorspeaker, microfoons, trilmotor, flexkabels, S Pen (ontleed) |

- Golf 2 bouwt de buitenkant (behuizing, achterkant, buitenlaag van het scherm), zodat het silhouet en `ui_inner` kloppen
  voordat het binnenwerk komt.
- Golf 3 bouwt het binnenwerk.

### Golf 4: openers, presets, interactie (klaar)
- Openers, met `open.min` van minstens 0,8 maal de slag:
  - S Pen;
  - SIM-lade;
  - achterglas;
  - batterij met treklip;
  - scherm.
- Ongeveer twintig presets, waaronder een rondleiding "Batterij vervangen" stap voor stap zoals iFixit.
- `itest.py`, `anchorcheck.py` en `visdiff.py` komen terug, aangepast aan de telefoon.

### Golf 5: onderdeelnummers (eerste ronde klaar)
- Samsung-servicenummers in `data/pn/units/*.json`, met bewijs A tot D en een bron per nummer.
- Een onzeker nummer krijgt graad D of blijft weg.

### Golf 6: tests, publiceren, terugkoppelen

Succesmaat, openlijk: ALLES GROEN op Linux in de Actions-job `volledig`; op macOS alle 12 beoordeelde tests groen, visdiff
"platform, niet beoordeeld". Visdiff is op macOS niet beoordelend omdat tekst daar met CoreText rastert en in de basislijn
met FreeType (zie `docs/testen.md`).

- Volledige strikte set groen in de Linux-job `volledig` (`.github/workflows/ci.yml`, bij `workflow_dispatch` en `pull_request`).
- `docs/cijfers.md` vernieuwen uit het geuploade Actions-resultaat (stappen in `docs/testen.md`) en baselines vastleggen.
- Publiceren via PR `golf-6` naar `main`; daarna:
  - GitHub Pages staat al aan (legacy-build vanaf `main` `/`, `https://rvd-gmpplus.github.io/s26u/`) en serveert v1 sinds
    2026-10-16 14:01 UTC. v1 heeft geen doctype en geen viewport, dus telefoons krijgen nu de 980 px-indeling; v2 herstelt
    dat. Na het samenvoegen moet Pages de nieuwe commit van `main` serveren (stap (f) in `docs/publiceren.md`);
  - daarnaast het bestaande claude.ai-artifact "Galaxy S26 Ultra explosietekening" bijwerken met dezelfde bytes, volgens
    stap (g) in `docs/publiceren.md` (zelfde artifact, geen nieuw);
  - de URL teruglezen en vergelijken volgens de vergelijkingsdefinitie in `docs/publiceren.md`
    (hulpmiddelen: `tools/orkestratie/bytecheck.py`, `tools/orkestratie/verwijzingen.py`).
- Telefoontest: geëmuleerd gedaan in `tools/pubsmoke.py` (Pages-vorm en artifact-verpakking, drie telefoonviewports). Het
  punt "op het toestel zelf" blijft open tot de tabel in `docs/telefoontest.md` is gevuld.

#### Premortem golf 6

| Oorzaak | Stand | Waar |
|---|---|---|
| 1. Visdiff geeft op een andere renderer valse rood of vals groen | Mechanisme klaar; dicht na de eerste groene run van `volledig` (`.github/workflows/ci.yml`, `tools/orkestratie/finaltests.sh`). Geeft die job op ongewijzigd `edb37f2` al een beeld boven 1,5 procent, dan stopt punt 1 en kiest de gebruiker; een Actions-basislijn breekt het vaste punt over de Linux-container en gebeurt alleen na die keuze. | `.github/workflows/ci.yml`, `tools/orkestratie/finaltests.sh` |
| 2. Een gedempte consolemelding verbergt een echte fout | Gesloten: smal filter met de exacte zin "GPU stall due to ReadPixels" en een tegenproef met `S26U_TEGENPROEF=1` (handmatig, `finaltests.sh` draait hem niet) | `tools/orkestratie/renderer.py`, `tools/harness.py` |
| 3. De testversie wijkt af van wat de telefoon krijgt (geen doctype, viewport) | Gesloten: doctype, charset en viewport in `src/head.html`, testversie is de ruwe Pages-vorm, lintcontrole | `src/head.html`, `build.py` |
| 4. De artifact-host weigert of verandert de pagina | Geaccepteerd (buiten onze controle): een weigering wordt vastgelegd en het punt blijft open. Overdracht: de gebruiker beslist of Pages volstaat. | `tools/pubsmoke.py`, `docs/telefoontest.md` |
| 5. Na de groene Linux-run wordt nog aan het beeld gesleuteld | Geaccepteerd met bevriezing: verbeteringen die beelden raken gaan naar golf 7, of naar een galerijcommit met een basislijn uit Actions na melding aan de gebruiker | orkestrator |
| 6. De telefoontest wordt nooit op het toestel gedaan, of IMEI lekt in de logs | Geaccepteerd, eigenaar de gebruiker: protocol in `docs/telefoontest.md`, IMEI-regel (nooit in repo, pagina of commitbericht), controles op 19 en 23 oktober | `docs/telefoontest.md`, `docs/publiceren.md` |
| 7. OneDrive onder de repo corrumpeert of dupliceert bestanden | Geaccepteerd risico. `~/Documents` is een symlink naar `OneDrive-Persoonlijk(2)/Documenten`, dus de golf-6-worktree, de gedeelde `.git` in de main-worktree en de runmap `~/Documents/GitHub/s26u-runs` staan allemaal in OneDrive. De worktree staat dus niet buiten OneDrive. Mitigatie: struikeldraad op conflictkopieën (zie hieronder). Na golf 6 beslist de gebruiker: de worktrees met `git worktree move` naar een map buiten OneDrive, of de map `GitHub` uitsluiten van synchronisatie. Niet nu verplaatsen: lopende agents gebruiken dit pad. | orkestrator |

Struikeldraden:

| Signaal | Drempel | Moment | Eigenaar | Actie |
|---|---|---|---|---|
| Visdiff op ongewijzigd `edb37f2` in de Linux-job | Boven 1,5 procent afwijkende pixels | Eerste run van `volledig` | Orkestrator, dan gebruiker | Punt 1 stopt; gebruiker kiest over een Actions-basislijn |
| Consolefilter slikt meer dan de ene zin | `S26U_TEGENPROEF=1 python3 tools/smoke.py` blijft groen (hoort rood te worden) | Bij elke wijziging van `IGNORE`, `IGNORE_DARWIN` of `ARGS` in `tools/harness.py` en vóór de PR | Orkestrator | Filter terug naar de exacte zin |
| Testversie en Pages-vorm verschillen | `pubsmoke` of lint rood | Elke push | Orkestrator | Eerst `src/head.html` herstellen |
| Artifact-host weigert de bytes | Eén weigering | Na publiceren | Orkestrator | Vastleggen; punt open; melden aan gebruiker |
| Beeldwijziging na de groene Linux-run | Elke wijziging die een preset-beeld raakt | Na de groene run | Orkestrator | Bevriezen; golf 7 of galerijcommit na melding |
| Telefoontest niet gedaan | Tabel in `docs/telefoontest.md` leeg | 19 oktober en 23 oktober | Gebruiker | Herinneren; toestel blijft open |
| Wijzigingen in de main-worktree | `git status --porcelain` niet leeg | Begin van elke sessie | Orkestrator | Stoppen en melden vóór verder werk |
| OneDrive-conflictkopie in de worktree of in `.git` | Één of meer treffers van `find . "$(git rev-parse --git-common-dir)" \( -name '* [0-9]' -o -name '* [0-9].*' -o -name '*conflicted copy*' -o -name '*-MacBook-*' \) -print` (namen met ` 2`, ` 3` of een computernaam; `git status` ziet dit in `.git` niet) | Begin van elke sessie en vóór elke commit | Orkestrator | Stoppen; niets committen; de kopie niet verwijderen of samenvoegen maar melden aan de gebruiker, die kiest welk bestand geldt |

## Geverifieerde basisfeiten
Zie `docs/specificaties-en-bronnen.md`; dit plan herhaalt de getallen niet.

## Afwijkingen van het oorspronkelijke plan

- Schaal 40 mm per wereldeenheid in plaats van meter met een apart object voor de constanten (zie Ontwerpbesluiten).
- De selfiecamera hoort bij Camera's in plaats van bij het Scherm: hij zit onder het moederbord (iFixit).
- De S Pen-as ligt op x +28,7 in plaats van +31,8, zodat de pen recht uit de onderrand schuift en niet door de afgeronde
  hoek van het frame.
- Het achterglas is een scharnier (als een boek open) in plaats van een schuif: zo blijft het binnenwerk in beeld.
- Extra test: `tools/overlap.py` (doorsteken tussen domeinen). `tools/anchorcheck.py` uit laguna3 is niet overgenomen; `itest.py` is nieuw geschreven voor de telefoon.
- Onderdeelnummers: alleen service packs uit leverancierslijsten (bewijs B en C); een servicecatalogus van Samsung was niet
  beschikbaar.

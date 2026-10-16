# Masterplan s26u

Doel: een interactieve 3D-explosietekening van de Samsung Galaxy S26 Ultra op het niveau van een volledige teardown, met de
werkwijze en kwaliteitslat van `rvd-gmpplus/laguna3`. Het toestel is dat van de gebruiker: 1 TB met 16 GB RAM, lichte kleur
(White of Silver Shadow, vast te stellen in golf 1).

## Keuzes van de gebruiker

| Vraag | Keuze |
|---|---|
| Detailniveau | Volledige teardown: alle lagen zoals iFixit (scherm, frame, moederbord, batterij, koeling, camera's, S Pen, kleine delen) |
| Hergebruik van laguna3 | Kern één keer kopiëren, daarna los; laguna3 blijft ongewijzigd |
| Uitvoering | Eigen toestel: 1 TB, lichte kleur |

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

### Golf 1: bronnen en skelet
1. `docs/specificaties-en-bronnen.md` aanvullen met maten, materialen en demontagevolgorde. Bronnen:
   - de iFixit-teardown en de iFixit-gidsen;
   - de JerryRigEverything- en PBKreviews-teardowns;
   - de specificatiepagina's van Samsung;
   - de maattekening (hoekstraal, camera-eiland, knoppen).
2. Open punten sluiten:
   - kleur: White of Silver Shadow;
   - materiaal van het frame;
   - diafragma van de hoofdcamera (f/1,4 of f/1,7 volgens verschillende bronnen).
3. Het volledige skelet van de boom vastleggen (`data/tree.json`) en `tools/anchors.json` uitbreiden:
   - de acht hoofdgroepen met `contains` en `content`;
   - budgetten, voorlopig 450.000 driehoeken in totaal.
4. `tools/silhouette.py` met referentieprofielen voor voor-, zij- en achteraanzicht uit de maattekening.

### Golven 2 en 3: geometrie per domein
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

### Golf 4: openers, presets, interactie
- Openers, met `open.min` van minstens 0,8 maal de slag:
  - S Pen;
  - SIM-lade;
  - achterglas;
  - batterij met treklip;
  - scherm.
- Ongeveer twintig presets, waaronder een rondleiding "Batterij vervangen" stap voor stap zoals iFixit.
- `itest.py`, `anchorcheck.py` en `visdiff.py` komen terug, aangepast aan de telefoon.

### Golf 5: onderdeelnummers
- Samsung-servicenummers in `data/pn/units/*.json`, met bewijs A tot D en een bron per nummer.
- Een onzeker nummer krijgt graad D of blijft weg.

### Golf 6: tests, publiceren, terugkoppelen
- Volledige strikte set groen.
- `docs/cijfers.md` vernieuwen en baselines vastleggen.
- Publiceren:
  - GitHub Pages: de gebruiker zet Pages aan in de instellingen van de repo;
  - daarnaast een claude.ai-artifact met dezelfde bytes;
  - de URL teruglezen en byte voor byte vergelijken.
- Telefoontest op het toestel zelf.

## Geverifieerde basisfeiten
Zie `docs/specificaties-en-bronnen.md`; dit plan herhaalt de getallen niet.

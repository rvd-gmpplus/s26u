# Ontwerp en architectuur

De architectuur is in golf 0 overgenomen uit `rvd-gmpplus/laguna3` (versie 8). Dit document beschrijft wat daarvan hier
geldt en wat voor de telefoon anders is. Voor de achtergrond van de app-functies (uitklappen, openmodus, presets, labels,
gebundeld tekenen) blijft `docs/ontwerp-en-architectuur.md` van laguna3 de uitgebreide uitleg; de code is op die punten gelijk.

## Bouw

`build.py` plakt `src/head.html` en de scripts in `ORDER` tot één `index.html`:

```
core.js  phone.js  partnumbers.js  app1.js  presets.js  app2.js
```

In golf 2 en 3 komen de domeinbestanden vóór `phone.js`: `frame.js`, `rear.js`, `display.js`, `camera.js`, `board.js`,
`power.js` en `peripherals.js`. De lint stopt bij:
- dubbele functienamen op het hoogste niveau;
- dubbele materiaalnamen;
- een syntaxfout in het samengevoegde script of in een inline script van `head.html`.

De scripttags van three.js krijgen een sha384-integriteitshash uit het lokale npm-pakket. `VERSION` plus een inhoudshash
komen in de pagina als `__S26U_VERSION__`.

## Lagen van de code

| Bestand | Rol |
|---|---|
| `core.js` | Renderer, scène, camera, licht, schaal (`MM`, `mm`, `mmv`), basismaterialen, vormhelpers, de knoop-API `A()` en `P()` |
| `phone.js` | `buildPhone()`: de opbouw van het hele toestel en de uitklaprichtingen van de hoofdgroepen |
| domeinbestanden | Bouwfuncties per hoofdgroep (vanaf golf 2) |
| `partnumbers.js` | `PN_DATA`, gegenereerd uit `data/pn/` |
| `app1.js` | Boom doorlopen, uitklappen, openmodus, zichtbaarheid, materialen, camera-inpassing, vloer, geschiedenis, bundelen |
| `presets.js` | Presets als gegevens plus één toepassingsmotor en de rondleiding |
| `app2.js` | Paneel, boom en zoeken, aanwijzen, labels, dock, thema, export, render-lus, testkoppeling `window.__s26u` |

## Schaal

Eén wereldeenheid is 40 mm (`MM = 1 / 40` in `core.js`). De app en de tests hebben veel constanten die op de grootte van het
model zijn afgesteld, zoals:
- uitklapminimum en optillen;
- camera-afstanden, near en far;
- vloer en schaduw;
- toleranties van ankers en doorsteken.

Met deze schaal is de telefoon 4,09 eenheden lang, ongeveer zo groot als het model waarvoor die constanten in laguna3 zijn
afgesteld. Ze blijven daardoor kloppen zonder dat iemand ze opnieuw moet afstellen. Regels:
- maten in de code staan altijd in millimeters via `mm()` (één waarde) of `mmv()` (een rij, zoals een positie);
- `ex` (uitklapvector) staat in wereldeenheden: het is een afstand in de explosie, geen maat van het toestel;
- `probe.py` geeft kaders in wereldeenheden; vermenigvuldig met 40 voor millimeters.

## Assen en ligging

- x: breedte, y: dikte, z: lengte.
- De telefoon ligt met het scherm op de vloer (y = 0) en de achterkant boven, met de bovenrand naar -z. Omgedraaid (zie
  Omdraaien) ligt hij met het scherm boven en het camera-eiland op y = 0; de bouwcode kent alleen de gemonteerde stand.
- Gezien op het scherm met de bovenrand van je af is +x links; `sideName()` volgt die afspraak.
- Camerarichtingen (`DIRS` in `app1.js`):
  - `front`: op het scherm;
  - `rear`: op de achterkant;
  - `top` en `under`: op de boven- en onderrand;
  - `side`: zijkant;
  - `iso` en `isoRear`: schuin;
  - `isoFront`: schuin op het scherm (het kader na het omdraaien).

### Omdraaien (golf 7)

De schakelaar Omdraaien (knop naast ? in de bovenbalk, rij in Weergave, sneltoets F, `?flip=1`) legt het toestel met het scherm
boven. De afspraken:

- Alleen `ROOT.obj` krijgt een draaiing van 180 graden om de lengteas (z) en een verplaatsing; alles eronder blijft in zijn eigen
  frame. Uitklapvectoren (`ex`, `exv`), openers, labels, batches, isoleren, dimmen en aanwijzen werken dus in beide standen
  zonder aanpassing: het model klapt mee om. Omgedraaid klapt het achterglas naar beneden (-y) en het scherm naar boven (+y).
- Het toestel ligt daarna op de vloer met zijn laagste punt: het camera-eiland steekt in de omgedraaide stand onder
  het achterglas uit en raakt y = 0; het scherm ligt dan op de hoogte van het eiland boven de vloer. De doorsnede (x, y) van het gemonteerde toestel (`UI_FLIP_BOX`)
  komt uit de begrenzende dozen van alle meshes. Tijdens de draai rolt het toestel over de vloer: `uiFlipPose(a)` zet het midden
  van de doorsnede op de hoogte waarbij het laagste hoekpunt y = 0 raakt, dus er steekt niets door de vloer (de begrenzende
  doos is iets ruimer dan de afgeronde hoeken, tot 0,3 mm speling midden in de draai).
- De vloer en de schaduw volgen via `updateGround()` (die rekent met de eindstand van een lopende draai, zie `uiWithFinal`) en
  `uiGroundSide()`: van onder gezien (de achterkant in de omgedraaide stand) tekenen we de vloer niet.
- Camera: alle richtingen staan in het frame van het toestel (`DIRS`, `cam.dir` van presets, `open.look.dir`, de camknoppen).
  `focusNodes` draait ze met `uiDirW(d)` mee (omgedraaid: (-x, -y, z), een draaiing om z). Elke preset toont daardoor hetzelfde
  deel van het toestel, nu van de andere kant van de wereld: Gemonteerd toont de achterkant van onderen, de knop Scherm
  kijkt van boven. `uiLastFit` bewaart de richting in het frame van het toestel, zodat een kader bij een formaatwissel
  mee blijft klappen. Na het omdraaien kadert de camera op de isolatie of het hele toestel: aan in `isoFront`, dus van boven op
  het scherm in een driekwartaanzicht, uit in `iso` (van boven op de achterkant).
- Toestand: `FLIP` (gewenst), `uiFlipA` (hoek, 0 of PI), `uiFlipAnim`. `uiSnap` bewaart `flip`, dus stap terug draait mee om.
  De animatie duurt 0,9 s en is bij `prefers-reduced-motion` direct (`REDUCED`).
- URL: `?flip=1` gaat mee in `uiUrlSync` en `uiUrlApply` en combineert met `?preset=` en `?open=`. Onthouden in de browser
  gebeurt niet.
- Testkoppeling: `__s26u.flip(on?)` (zonder argument wisselt, geeft de nieuwe stand terug), `__s26u.state().flip`,
  `__s26u.flipInfo()` (hoek, verplaatsing, doorsnede). `tools/itest.py` (controle 11) meet het laagste hoekpunt van alle meshes.

## Hoofdgroepen en eigendom

| Hoofdgroep | Bestand | Röntgen doorzichtig |
|---|---|---|
| Achterkant | `rear.js` | ja |
| Camera's | `camera.js` | nee |
| Moederbord | `board.js` | nee |
| Energie en koeling | `power.js` | nee |
| Randapparatuur | `peripherals.js` | nee |
| S Pen | `peripherals.js` | nee |
| Behuizing | `frame.js` | ja |
| Scherm | `display.js` | ja |

Elke hoofdgroep komt uit zijn domeinbestand; zolang een bouwfunctie ontbreekt, zet `phone.js` een plaatshouder in de zone van
het domein (zo kon elk domein in een eigen worktree met de volledige testset werken). De kleuren per hoofdgroep staan in
`SYS_COLORS` (`app1.js`); de legenda toont alleen de groepen die bestaan. `tools/orkestratie/mergecheck.py` kent de
domeinen en de alleen-lezenbestanden.

## Knopen

`A(naam, opties, kinderen)` maakt een groep, `P(naam, geometrie, materiaal, opties)` een onderdeel. De opties zijn:

| Optie | Betekenis |
|---|---|
| `d` | Beschrijving, verplicht |
| `spec` | Paren [label, waarde], alleen met status bevestigd in `docs/specificaties-en-bronnen.md` |
| `ex`, `exs` | Uitklapvector en -schaal |
| `p`, `r`, `q`, `s` | Positie, rotatie, quaternion, schaal |
| `inner` | Van buiten nooit te zien zolang de groep dicht is |
| `open` | Scharnier of schuif in de openmodus |
| `stay`, `hideWhen` | Gedrag naast een opener |

## Materialen

Basismaterialen staan in `core.js`. Bijvoorbeeld:
- `backGlass`, `coverGlass`, `oled`;
- `frameAlu`, `pcb`, `shield`, `graphite`, `battery`.

De kleur van het toestel staat op één plek: `TOESTELKLEUR`. Een domein maakt eigen materialen met zijn voorvoegsel.

## Onderdeelnummers

`data/pn/` is de bron; `tools/orkestratie/build_pn.py` maakt `src/partnumbers.js` en `docs/onderdeelnummers.csv`. De statussen
zijn:
- `past`;
- `model`: hangt af van modelcode, regio of kleur;
- `nietgevonden`.

Het paneel noemt Samsung-servicenummers en nummers van andere fabrikanten, met bewijs A tot D.

## Openers

De openers staan in `PH_OPENERS` in `phone.js`. De orkestrator zet ze na de bouw op de knopen, zodat de domeinbestanden
alleen geometrie bevatten.

| Opener | Beweging | Opmerking |
|---|---|---|
| Achterglas eraf | Scharnier over de +x-rand, 165 graden | Komt omgekeerd naast het toestel te liggen, met de laadspoel eraan |
| Luidspreker onder eruit | Schuif 18 mm omhoog | De onderafdekplaat is een volger; `needs` het achterglas |
| Batterij eruit | Schuif 22 mm omhoog | `needs` het achterglas |
| SIM-lade | Schuif 15 mm langs +z | |
| S Pen | Schuif 70 mm langs +z | Uit de silo op x +28,7 |
| Scherm eraf | Schuif 16 mm omlaag | De vloer zakt mee |

`needs` gaat één niveau diep. De volledige volgorde van de iFixit-teardown staat in de presets onder Reparatie en in de
rondleiding.

## Indeling en botsingen

`docs/indeling.md` is het ruimtelijk contract: lagen in de dikte, zones per domein, het gemeten camera-eiland en de
afspraken op de raakvlakken. `tools/overlap.py` bewaakt dat onderdelen van verschillende domeinen niet door elkaar steken.

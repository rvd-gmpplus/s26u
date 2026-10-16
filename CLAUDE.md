# s26u: afspraken voor wie hier bouwt

Interactieve 3D-explosietekening van een Samsung Galaxy S26 Ultra (1 TB, 16 GB RAM, White) in three.js r147. Alle
geometrie staat in code; `build.py` plakt `src/head.html` en `src/*.js` (volgorde `ORDER`) tot één `index.html`. De kern
(bouw, app, testset) is in golf 0 eenmalig gekopieerd uit `rvd-gmpplus/laguna3` en evolueert hier los verder. Nederlands is
de taal van code-commentaar, beschrijvingen, docs en commits. Geen em-dashes in tekst.

## Bouwen en testen

- `tools/setup.sh` maakt een verse omgeving klaar (Playwright uit `requirements.txt`, three.js 0.147.0 met hashcontrole).
- `python3 build.py --lint` voor elke commit; `python3 build.py` herbouwt `index.html` (gecommit, hoort bij `src/`).
- Volledige set: `tools/orkestratie/finaltests.sh UITMAP` (strikt, één exitcode, tijd per test). Losse scripts in `tools/`.
- Budgetten (driehoeken per hoofdgroep) staan in `tools/anchors.json`; `tools/tri.py --gate` bewaakt ze.
- Een melding van de gebruiker eerst narekenen met `tools/orkestratie/pick.py`, `probe.py` of stralen; dan pas wijzigen.

## Schaal en assen

- Eén wereldeenheid is 40 mm (`MM` in `core.js`). Maten staan in de code altijd in millimeters via `mm()` en `mmv()`;
  nooit losse wereldgetallen voor maten van onderdelen.
- De telefoon ligt met het scherm op de vloer (y = 0), achterkant boven (+y), bovenrand naar -z, breedte langs x.
  `sideName()` noemt links en rechts zoals je ze ziet als je op het scherm kijkt.

## Eigendom en contracten

- Eén bestand per domein: behuizing (`frame.js`), achterkant (`rear.js`), scherm (`display.js`), camera's (`camera.js`),
  moederbord (`board.js`), energie en koeling (`power.js`), randapparatuur en S Pen (`peripherals.js`), app (`core.js`,
  `app1.js`, `presets.js`, `app2.js`, `head.html`). `phone.js` (de opbouw van het hele toestel) is van de orkestrator.
  Voorvoegsels per eigenaar voor functies, materialen en cachesleutels.
- Alleen-lezen voor domeineigenaars: `core.js`, `phone.js`, `tools/anchors.json`, `tools/open_allow.json`, de
  testscripts, `IGNORE` in `tools/harness.py`. Wijzigen gaat via de orkestrator, met een melding aan de eigenaren.
- Knopen: `A(naam, opties, kinderen)` en `P(naam, geometrie, materiaal, opties)` met verplicht `d` (Nederlandse
  beschrijving), `spec` alleen voor geverifieerde feiten in Nederlandse notatie, `ex` als uitklapvector, `inner` alleen
  voor wat van buiten nooit te zien is, `hideWhen` voor wat uitgenomen is zolang een opener open staat. Openers hebben
  altijd `open.min` van minstens 0,8 maal de volle hoek of slag.
- `src/partnumbers.js` en `docs/onderdeelnummers.csv` komen uit `data/pn/` via `tools/orkestratie/build_pn.py`; niet met de
  hand. `python3 tools/pncheck.py` bewaakt dat.
- IMEI, serienummer en telefoonnummer van de gebruiker komen nooit in de repo, de pagina of een commitbericht.
- Geen Samsung-logo, beeldmerk of producttekst nabouwen of overnemen. De pagina zegt dat het een onafhankelijk model is.
- Nummers in de docs: één bron (`docs/cijfers.md`); elders ernaar verwijzen in plaats van getallen herhalen.

## Werkwijze

- Golven per domein in eigen worktrees; `tools/orkestratie/mergecheck.py` vóór samenvoegen; na samenvoegen de volledige
  set, dan pas `index.html` herbouwen en publiceren; na publiceren de URL teruglezen en byte voor byte vergelijken.
- `VERSION` is het versienummer van de volgende publicatie; `build.py` zet nummer plus inhoudshash in de pagina.
- Begin elke sessie met `git ls-remote --heads origin` en een vergelijking van elke tak met `main`.
- Volledige uitleg: `docs/masterplan.md`, `docs/ontwerp-en-architectuur.md`, `docs/testen.md`.

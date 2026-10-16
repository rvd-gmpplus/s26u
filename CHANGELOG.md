# Wijzigingen

## Versie 3

- De S Pen zit in de afgeronde hoek linksonder (as x +32,0): de opening ligt in de hoekboog en de einddop is schuin
  afgesneden, zodat hij gelijk ligt met het frame (zoals bij het echte toestel).
- Omdraaien: het toestel draait 180 graden om de lange as, zodat het scherm boven ligt. Knop in de bovenbalk, schakelaar
  in Weergave, sneltoets F en `?flip=1` in de URL; presets en camera draaien mee.
- Lokale Linux-VM voor de volledige set (`tools/linux/vmtests.sh`).
- Aantallen: zie `docs/cijfers.md`.

## Versie 2

- Doctype, charset en viewport in `src/head.html`: de telefoon gebruikt de standaardmodus.
- De testversie is gelijk aan de Pages-vorm (de ruwe `index.html`).
- Actions-job `volledig` op Linux met de hele testset; `bron.txt` en `renderer.txt` bij het resultaat.
- Visdiff meldt op macOS "platform, niet beoordeeld".
- Smal consolefilter met de exacte zin en een tegenproef (`S26U_TEGENPROEF=1`).
- Publicatiehulpmiddelen (`docs/publiceren.md`) en de telefoontest (`docs/telefoontest.md`).
- Aantallen: zie `docs/cijfers.md`.

## Versie 1

Eerste publicatie, golf 0 tot en met 6.

- Acht hoofdgroepen gebouwd in parallelle domeinen (247 onderdelen; aantallen in `docs/cijfers.md`), met een ruimtelijk
  contract in `docs/indeling.md` en het camera-eiland gemeten op de officiële render.
- Specificaties tegen het persbericht van Samsung; teardownbevindingen uit verslagen van de iFixit-teardown.
- Openers: achterglas, luidspreker met onderafdekplaat, batterij, SIM-lade, S Pen, scherm.
- 28 presets in zes categorieën, rondleiding met de batterijwissel.
- Samsung-servicenummers (service packs) met bron, keuze White bij kleurafhankelijke delen.
- Testset uitgebreid met silhouet, overlap, een nieuwe itest en een visuele basislijn.

## Golf 0

- Repo opgezet. De kern (bouw, app, testset, orkestratie) is overgenomen uit laguna3 versie 8 en omgezet naar de telefoon.
  Het gaat om hoofdgroepen, röntgen, camerarichtingen, zoeksynoniemen, teksten, het onderdeelnummerpaneel en materialen.
- Schaal van 40 mm per wereldeenheid, zodat de afgestelde constanten van de app blijven kloppen.
- Plaatshouder van het toestel: achterkant, behuizing en scherm op de echte buitenmaat, met vijf overzichtspresets.
- Testset groen: lint, smoke, integ, inner, opentest, tri, pub, stats.

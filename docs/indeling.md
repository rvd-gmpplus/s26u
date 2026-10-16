# Indeling: het ruimtelijk contract tussen de domeinen

Dit document legt vast waar elk onderdeel in het toestel zit, zodat de domeinen (golf 2 en 3) los van elkaar kunnen bouwen
zonder dat onderdelen door elkaar steken. Alle maten in millimeters, in het modelframe. In de code altijd via `mm()` en
`mmv()` (één wereldeenheid is 40 mm, zie `docs/ontwerp-en-architectuur.md`).

Wijzigen gaat via de orkestrator. Een domein dat meer ruimte nodig heeft, vraagt dat eerst; het pakt geen ruimte van een
ander domein.

## Assen

- **x**: breedte. Bij een blik op het scherm met de bovenrand van je af is **+x links**. Vanaf de achterkant gezien is +x
  rechts.
- **y**: dikte. Het scherm ligt op de vloer (y = 0), de achterkant boven (y = 7,9).
- **z**: lengte, de bovenrand bij z = -81,8 en de onderrand bij z = +81,8.
- **Buitenmaat**: x van -39,05 tot +39,05; y van 0 tot 7,9; z van -81,8 tot +81,8 (163,6 × 78,1 × 7,9; primaire bron,
  zie `docs/specificaties-en-bronnen.md`).
- **Hoekstraal in bovenaanzicht**: 8,5 mm, gemeten op de officiële achteraanzichtrender (status: meting).

## Lagen in de dikte (y)

| Laag | y van | y tot | Domein | Status |
|---|---|---|---|---|
| Coverglas | 0 | 0,7 | Scherm | schatting |
| Optische lijm, polarisator en OLED-paneel | 0,7 | 1,25 | Scherm | schatting |
| Wacom-digitizer en koper-/grafietfolie onder het paneel | 1,25 | 1,7 | Scherm | schatting |
| Middenplaat van het frame | 1,7 | 2,4 | Behuizing | schatting |
| Vapor chamber (op de middenplaat, achterkantzijde) | 2,4 | 2,8 | Energie en koeling | schatting |
| Binnenruimte: moederbord, batterij, modules | 2,8 | 7,0 | per zone hieronder | schatting |
| Laadspoel, NFC en grafietfolie | 7,0 | 7,2 | Achterkant | schatting |
| Achterglas | 7,2 | 7,9 | Achterkant | schatting |
| Camera-eiland (verhoogd glas) | 7,9 | 8,9 | Achterkant | schatting |
| Lensringen boven het eiland | 8,9 | 9,7 | Achterkant | schatting |

De zijranden van het frame lopen over de volle dikte (y 0 tot 7,9). Hun binnenkant ligt op 2,0 mm van de buitenrand; de
binnenruimte is dus x -37,0 tot +37,0 en z -79,8 tot +79,8, binnen de hoekstraal.

## Camera's (achteraanzicht gemeten, omgerekend naar het modelframe)

Gemeten op de officiële achteraanzichtrender, schaal 6,17 px/mm uit de breedte van 78,1 mm. De volgorde van de camera's
in de kolom is een schatting (zelfde indeling als de S24 en S25 Ultra).

| Element | x | z | Maat | Opmerking |
|---|---|---|---|---|
| Camera-eiland (capsule) | -34,55 tot -13,75 | -77,3 tot -20,5 | 20,8 breed, straal 10,4 | verhoogd glas in de kleur van het toestel |
| Lens boven in de kolom: ultragroothoek 50 MP | -24,15 | -67,1 | venster Ø 15,6, ring Ø 17 | |
| Lens midden: hoofdcamera 200 MP | -24,15 | -48,9 | venster Ø 15,6, ring Ø 17 | |
| Lens onder: telecamera 10 MP (3×) | -24,15 | -30,7 | venster Ø 15,6, ring Ø 17 | |
| Kleine lens boven: periscoop 50 MP (5×) | -6,2 | -67,1 | venster Ø 8,2, ring Ø 9,6 | prisma eronder, module langs +z |
| Flitser | -6,5 | -58,3 | Ø 3 | |
| Kleine lens onder: laser-AF | -6,2 | -48,8 | venster Ø 8,2, ring Ø 9,6 | |

Cameramodules zitten tussen y 1,9 en 7,2 in uitsparingen van moederbord en middenplaat; de hoofdcamera mag tot y 1,2
zakken (door een gat in de middenplaat). De periscoopmodule ligt plat: x -10 tot -2, z -76 tot -40, y 2,9 tot 6,9.

## Zones in het vlak (x, z) voor de binnenruimte (y 2,8 tot 7,0)

| Zone | x | z | y | Domein |
|---|---|---|---|---|
| Moederbord (sandwich) | -36 tot +36 | -79 tot -19, behalve de camera-uitsparingen hieronder en de S Pen-zone | 2,9 tot 6,4 | Moederbord |
| Uitsparing camerakolom | -34 tot -14 | -77 tot -21 | | Camera's |
| Uitsparing periscoop en laser-AF | -11 tot -1 | -77 tot -40 | | Camera's |
| Bovenafdekplaat moederbord (kunststof, antennes) | -36 tot +36 | -79 tot -19 | 6,4 tot 7,0 | Moederbord |
| Selfiecamera | -3,5 tot +3,5 | -78 tot -71 | 1,0 tot 4,5 (onder het bord, door het scherm heen kijkend) | Camera's |
| Oorspeaker | +4 tot +18 | -80 tot -75 | 2,9 tot 4,9 | Randapparatuur |
| Batterij | -34 tot +26 | -16 tot +62 | 2,8 tot 7,0 | Energie en koeling |
| S Pen-silo (in het frame) | +27 tot +36,5 | -26 tot +81,8 | 2,0 tot 7,0, buis Ø 6,4 om as x +31,8, y 4,5 | Behuizing |
| S Pen (in de silo) | as x +31,8, y 4,5 | -24 tot +81,4 | Ø 5,8 | S Pen |
| Hoofdflexkabel bord naar subbord | -36,8 tot -34,4 | -21 tot +66 | 2,9 tot 3,4 | Randapparatuur |
| Trilmotor | -34 tot -24 | +63 tot +67 | 3,0 tot 6,0 | Randapparatuur |
| Luidspreker onder | -34 tot -8 | +68 tot +79 | 2,9 tot 6,9 | Randapparatuur |
| USB-C-subbord met SIM-lezer | -6 tot +24 | +64 tot +79,5 | 2,9 tot 6,4 | Randapparatuur |
| USB-C-poort | -4,5 tot +4,5 | +72 tot +81,8 | 2,3 tot 5,5 | Randapparatuur |
| SIM-lade | +8 tot +22 | +67 tot +81,8 | 3,2 tot 4,4 | Randapparatuur |
| Onderafdekplaat (kunststof) | -36 tot +26 | +63 tot +79,8 | 6,9 tot 7,0 | Randapparatuur |

## Scherm

| Element | x | z | y | Status |
|---|---|---|---|---|
| Coverglas | volle buitenmaat min 0,3 rondom | | 0 tot 0,7 | schatting |
| Actief paneel | -37,4 tot +37,4 | -79,6 tot +79,6 | 0,7 tot 1,25 | schatting |
| Selfiecameragat (punch-hole) | midden x 0, z -76 | Ø 3,2 | | gezien op de foto |
| Ultrasone vingerafdruksensor | -4,5 tot +4,5 | +44 tot +53 | 1,25 tot 1,7 (in een uitsparing van de digitizer) | schatting |
| Displayflex | -6 tot +6 | gaat aan de onderrand om en naar de achterkant, eindigt bij z +60 | | volgens iFixit alleen van achteren bereikbaar |

## Knoppen en randen

| Element | Zijde | z | Status |
|---|---|---|---|
| Volumeknop | -x (rechts op het scherm) | -48 tot -26 | schatting |
| Aan/uit-knop | -x | -16 tot -4 | schatting |
| USB-C, microfoon, luidsprekergaten, SIM-lade | onderrand | zie de zones | schatting |
| S Pen-opening | onderrand, +x | x +31,8 | schatting |

## Uitklaprichtingen van de hoofdgroepen

Stapel naar boven, van buiten (achterglas) naar binnen (scherm). Volgorde van de wortelkinderen, met `ex` in wereldeenheden:

| Hoofdgroep | `ex` |
|---|---|
| Achterkant | [0, 2.6, 0] |
| Camera's | [-0.9, 2.0, -0.4] |
| Moederbord | [0, 1.6, -0.3] |
| Energie en koeling | [0, 1.1, 0.3] |
| Randapparatuur | [0.2, 1.3, 1.1] |
| S Pen | [1.9, 0.5, 0.6] |
| Behuizing | [0, 0.5, 0] |
| Scherm | [0, -0.35, 0] |

## Voorvoegsels per domein

| Domein | Bestand | Functies, materialen en cachesleutels | Bouwfunctie |
|---|---|---|---|
| Behuizing | `frame.js` | `fr` | `frBuild()` |
| Achterkant | `rear.js` | `re` | `reBuild()` |
| Scherm | `display.js` | `di` | `diBuild()` |
| Camera's | `camera.js` | `ca` | `caBuild()` |
| Moederbord | `board.js` | `bo` | `boBuild()` |
| Energie en koeling | `power.js` | `pw` | `pwBuild()` |
| Randapparatuur en S Pen | `peripherals.js` | `pe` | `peBuild()` en `peBuildPen()` |

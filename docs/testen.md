# Testen

Alle tests draaien in Chromium via Playwright met software-rendering (SwiftShader). `tools/harness.py` bouwt een testversie
van de pagina, serveert hem lokaal en verzamelt console- en paginafouten. Een waarschuwing telt als fout, behalve wat in
`IGNORE` staat. De testversie is de ruwe vorm van de Pages-versie. Alleen twee dingen wijken af: het three-pad (`three/` in plaats van
jsDelivr) en de versiestempel (", testversie"). De integrity-attributen zijn gelijk. Gemeten met `build.py --test-only MAP`
tegen `index.html`.

Omgevingsvariabelen:
- `S26U_TEST`: een bestaande testmap gebruiken;
- `S26U_TIMEOUT_MS`: wachttijd op laden, standaard 120 s (CI: 300 s in `snel`, 600 s in `volledig`);
- `PUBSMOKE_READY_MS`: grens voor `ready` in `tools/pubsmoke.py`, standaard 20 s (CI: 120 s);
- `S26U_TEGENPROEF`: `1` lokt een melding uit voor de tegenproef (zie Consolefilter);
- `THREE_DIR`, `CHROMIUM`.

## De volledige set

`tools/orkestratie/finaltests.sh UITMAP` draait deze tests in twee parallelle reeksen. Bij een rode test is de exitcode 1.

| Naam | Script | Bewaakt |
|---|---|---|
| lint | `build.py --lint` | Dubbele functie- en materiaalnamen, syntaxis |
| smoke | `tools/smoke.py` | Laden op bureaublad en telefoon, aantallen, rendercijfers, geen horizontale scroll |
| integ | `tools/integrity.py` | Namen, beschrijvingen, lege groepen, geometrie, buitengrens van het toestel, uitklapvectoren, het contract in `tools/anchors.json` (ankers per domein, `contains`, openers, presets), presets |
| sil | `tools/silhouette.py` | Buitenvorm met stralen: omtrek en hoekstraal van boven, dikte 7,9 mm buiten het camera-eiland, verhoogd eiland, flanken, boven- en onderrand |
| overlap | `tools/overlap.py` | Geen onderdeel van het ene domein steekt meer dan 0,08 mm in een onderdeel van een ander domein (punten binnen een gesloten vorm, getest met stralen in drie richtingen) |
| inner | `tools/ui_inner.py --open --strict` | Geen `inner`-onderdeel zichtbaar van buiten, met stralen uit meer dan 200 richtingen, ook met de openers open |
| opentest | `tools/opentest.py --strikt-min` | Per opener: eindstand en terugkeer, `open.min` (minstens 0,8 maal de slag), botsingen langs de baan (uitzonderingen met reden in `tools/open_allow.json`), wat de opening blootlegt, prestaties |
| itest | `tools/itest.py` | Klikken, duiken, stap terug, rechtsklik, openmodus, kader van alle presets, labels, zoeken met synoniem, deellink, rondleiding, omdraaien (laagste hoekpunt op de vloer, knop, sneltoets F, camera, presets, `?flip=1`), telefoon (tik, lang drukken, scroll) |
| tri | `tools/tri.py --gate` | Driehoeken per hoofdgroep en totaal tegen de budgetten |
| pub | `tools/pubsmoke.py` | Twee vormen: de Pages-vorm (de ruwe `index.html`) en de artifact-verpakking, elk op drie telefoonviewports (plus desktop); fouten en waarschuwingen tellen, gefilterd met dezelfde `is_ignored`; de CDN-bestanden byte voor byte gelijk aan het npm-pakket |
| stats | `tools/orkestratie/stats.py` | Cijfers voor `docs/cijfers.md`, plus de controle op consolefouten |
| shots | `tools/orkestratie/presetshots.py` | Een beeld van elke preset |
| visdiff | `tools/visdiff.py` | Die beelden tegen de basislijn in `docs/baseline/` (verkleind, 256 kleuren); boven 1,5 procent afwijkende pixels is rood |

## Platformen

- Linux (Actions-job `volledig`): alle tests beoordelen, ook visdiff. De basislijn in `docs/baseline/` komt uit die job (`ubuntu-latest`, vernieuwd in golf 6 op 2026-10-16; de oude basislijn uit
  de cloudcontainer gaf op de runner 6,6 tot 8,1 procent verschil, alleen tekst en randen).
- Linux-VM op de Mac (`tools/linux/vmtests.sh UITMAP [REF]`, Apple `container`, Ubuntu 24.04 amd64 via Rosetta): alle
  tests beoordelen, ook visdiff. Gemeten op 2026-10-16: ALLES GROEN, visdiff 0,00 procent op alle 27 beelden, dus gelijk aan
  de runner. Bedoeld als lokale voorproef; het oordeel voor publiceren blijft de Actions-job `volledig`.
- macOS (lokaal): 12 tests beoordelen en moeten groen zijn. Visdiff meldt "platform, niet beoordeeld": tekst wordt op macOS
  met CoreText gerasterd en in de basislijn met FreeType, dus de pixelverschillen zeggen niets over de pagina.
- `finaltests.sh` schrijft `bron.txt` (platform, commit en omgeving van de run) en `renderer.txt` (de gemeten renderer) in de
  uitmap.
- Eis aan de renderer: SwiftShader. `tools/smoke.py` wordt rood bij een andere renderer. `tools/orkestratie/renderer.py` legt
  de renderer alleen vast (`renderer.txt`) en telt niet mee voor het oordeel. De driehoekkiertjes en de basislijn horen bij
  software-rendering.

## Consolefilter (IGNORE)

Twee lijsten in `tools/harness.py`, elke regel met reden en datum:
- `IGNORE` geldt op alle platformen en bevat `favicon.ico`;
- `IGNORE_DARWIN` geldt alleen op macOS en bevat `GPU stall due to ReadPixels` (een prestatiehint van ANGLE bij readPixels).

Een melding valt weg als die zin erin voorkomt. Linux en CI filteren dus alleen `favicon.ico`.

Tegenproef: die is handmatig en draait niet in `finaltests.sh` of CI. `S26U_TEGENPROEF=1 python3 tools/smoke.py` en
`S26U_TEGENPROEF=1 python3 tools/pubsmoke.py` laten elke pagina een afwijkende waarschuwing geven (`s26u tegenproef`) en
moeten allebei exit 1 geven (2026-10-16 op macOS: exit 1). Blijft hij
groen, dan is het filter te breed. Draai hem bij elke wijziging van `IGNORE`, `IGNORE_DARWIN` of `ARGS` (mergecheck
waarschuwt daarvoor) en vóór de PR.

## Lint en vorm van de pagina

`build.py --lint` controleert `src/head.html`, niet `index.html`: die moet beginnen met `<!doctype html>`, een
`<meta charset="utf-8">` hebben en een `<meta name="viewport">` met `width=device-width`. Zonder doctype draait een telefoon
in quirks mode, zonder viewport met een lay-outbreedte van 980 px.

## Cijfers vernieuwen

`docs/cijfers.md` wordt niet met de hand bewerkt. Na de groene Linux-run haalt de orkestrator het uitvoerpakket van de job
op en draait:

```
python3 tools/orkestratie/cijfers.py UIT/stats.json UIT/tri.json > docs/cijfers.md
```

De koptekst van de opstarttijdlijn noemt het platform uit `stats.json` (staat dat er niet in, dan verwijst hij naar `bron.txt`).

## CI

CI (`.github/workflows/ci.yml`) kent twee jobs. `snel` draait bij elke push:
- lint;
- de controle dat `index.html` bij `src/` hoort;
- pncheck;
- smoke, integrity, silhouet en overlap;
- de budgetpoort;
- de controle op de testlijst van `finaltests.sh`.

De job `volledig` draait `finaltests.sh` bij `workflow_dispatch` en `pull_request` en uploadt de uitmap.

De basislijn vernieuwt alleen de orkestrator, in een eigen commit, met `python3 tools/visdiff.py --basislijn BRONMAP docs/baseline`.

## Bekende beperkingen

- In software-rendering (SwiftShader, in de Linux-job) tonen heel dunne, langgerekte driehoeken van de schermlagen soms
  lichte kiertjes. Op een echte GPU gebeurt dat niet.
- De batterij tilt in één beweging op; de batterijflex raakt daarbij de bovenafdekplaat van het moederbord (uitzondering in
  `tools/open_allow.json`).

## Contract

`tools/anchors.json` legt het volgende vast:
- de wortel en de hoofdgroepen, in volgorde;
- ankernamen die precies één keer voorkomen;
- `contains` en `content`-regels;
- de lijst openers en preset-id's;
- de driehoekbudgetten.

Alleen de orkestrator wijzigt dit bestand. Een domeineigenaar die een anker hernoemt, meldt dat eerst.

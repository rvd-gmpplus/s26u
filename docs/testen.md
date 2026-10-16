# Testen

Alle tests draaien in Chromium via Playwright met software-rendering (SwiftShader). `tools/harness.py` bouwt een testversie
van de pagina, serveert hem lokaal en verzamelt console- en paginafouten. Een waarschuwing telt als fout, behalve wat in
`IGNORE` staat.

Omgevingsvariabelen:
- `S26U_TEST`: een bestaande testmap gebruiken;
- `S26U_TIMEOUT_MS`: wachttijd op laden, standaard 120 s;
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
| itest | `tools/itest.py` | Klikken, duiken, stap terug, rechtsklik, openmodus, kader van alle presets, labels, zoeken met synoniem, deellink, rondleiding, telefoon (tik, lang drukken, scroll) |
| tri | `tools/tri.py --gate` | Driehoeken per hoofdgroep en totaal tegen de budgetten |
| pub | `tools/pubsmoke.py` | De CDN-versie in de verpakking van de artefacthost; de CDN-bestanden byte voor byte gelijk aan het npm-pakket |
| stats | `tools/orkestratie/stats.py` | Cijfers voor `docs/cijfers.md`, plus de controle op consolefouten |
| shots | `tools/orkestratie/presetshots.py` | Een beeld van elke preset |
| visdiff | `tools/visdiff.py` | Die beelden tegen de basislijn in `docs/baseline/` (verkleind, 256 kleuren); boven 1,5 procent afwijkende pixels is rood |

CI (`.github/workflows/ci.yml`) draait bij elke push:
- lint;
- de controle dat `index.html` bij `src/` hoort;
- pncheck;
- smoke, integrity, silhouet en overlap;
- de budgetpoort;
- de controle op de testlijst van `finaltests.sh`.

De basislijn vernieuwt alleen de orkestrator, in een eigen commit, met `python3 tools/visdiff.py --basislijn BRONMAP docs/baseline`.

## Bekende beperkingen

- In software-rendering (SwiftShader in de container) tonen heel dunne, langgerekte driehoeken van de schermlagen soms
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

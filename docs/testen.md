# Testen

Alle tests draaien in Chromium via Playwright met software-rendering (SwiftShader). `tools/harness.py` bouwt een testversie
van de pagina, serveert hem lokaal en verzamelt console- en paginafouten. Een waarschuwing telt als fout, behalve wat in
`IGNORE` staat.

Omgevingsvariabelen:
- `S26U_TEST`: een bestaande testmap gebruiken;
- `S26U_TIMEOUT_MS`: wachttijd op laden, standaard 120 s;
- `THREE_DIR`, `CHROMIUM`.

## De set in golf 0

`tools/orkestratie/finaltests.sh UITMAP` draait deze tests in twee parallelle reeksen. Bij een rode test is de exitcode 1.

| Naam | Script | Bewaakt |
|---|---|---|
| lint | `build.py --lint` | Dubbele functie- en materiaalnamen, syntaxis |
| smoke | `tools/smoke.py` | Laden op bureaublad en telefoon, aantallen, rendercijfers, geen horizontale scroll |
| integ | `tools/integrity.py` | Namen, beschrijvingen, lege groepen, geometrie, buitengrens van het toestel, uitklapvectoren, het contract in `tools/anchors.json`, presets |
| inner | `tools/ui_inner.py --open --strict` | Geen `inner`-onderdeel zichtbaar van buiten, met stralen uit meer dan 200 richtingen |
| opentest | `tools/opentest.py --strikt-min` | Per opener: eindstand, terugkeer, `open.min`, botsingen (uitzonderingen in `tools/open_allow.json`), prestaties |
| tri | `tools/tri.py --gate` | Driehoeken per hoofdgroep en totaal tegen de budgetten in `tools/anchors.json` |
| pub | `tools/pubsmoke.py` | De CDN-versie in de verpakking van de artefacthost; de CDN-bestanden byte voor byte gelijk aan het npm-pakket |
| stats | `tools/orkestratie/stats.py` | Cijfers voor `docs/cijfers.md`, plus de controle op consolefouten |

CI (`.github/workflows/ci.yml`) draait bij elke push:
- lint;
- de controle dat `index.html` bij `src/` hoort;
- pncheck;
- smoke, integrity en de budgetpoort;
- de controle op de testlijst van `finaltests.sh`.

## Komt terug

| Test | Golf | Waarom later |
|---|---|---|
| `silhouette.py` | 2 | Heeft referentieprofielen van het echte toestel nodig (maattekening) |
| `itest.py` | 4 | Interactietests op echte onderdelen en openers; die van laguna3 noemen auto-onderdelen |
| `anchorcheck.py`, `visdiff.py`, presetshots | 6 | Baselines zijn pas zinvol als het model af is |

## Contract

`tools/anchors.json` legt het volgende vast:
- de wortel en de hoofdgroepen, in volgorde;
- ankernamen die precies één keer voorkomen;
- `contains` en `content`-regels;
- de lijst openers en preset-id's;
- de driehoekbudgetten.

Alleen de orkestrator wijzigt dit bestand. Een domeineigenaar die een anker hernoemt, meldt dat eerst.

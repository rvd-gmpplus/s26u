# Telefoontest

Wat de pagina op een telefoon doet: eerst geëmuleerd in Chromium, daarna op het toestel zelf. Getallen (laadtijden,
driehoeken, tekenopdrachten) staan in `docs/cijfers.md` en worden hier niet herhaald.

## a. Geëmuleerd getest

`tools/pubsmoke.py` laadt de pagina in twee vormen:

- **pages**: de bytes van `index.html` zoals ze op schijf staan, zonder verpakking, geserveerd als
  `https://rvd-gmpplus.github.io/s26u/` met `content-type: text/html; charset=utf-8`. Dit is wat GitHub Pages levert.
- **artifact**: dezelfde pagina in het HTML-geraamte van de artefacthost.

Eerst eist hij dat de in het geheugen gebouwde pagina byte voor byte gelijk is aan `index.html` op schijf. Daarna draait
elke vorm in Chromium met SwiftShader (software-rendering, geen echte GPU) op 1280 x 800 en op drie telefoonviewports met
touch en `is_mobile`, alle drie met dpr 3. Per telefoonviewport controleert hij: `document.compatMode` is `CSS1Compat`,
`innerWidth` is de viewportbreedte, geen horizontale scroll, het paneel staat onderaan en past binnen de breedte, een tik
op het midden van het canvas selecteert iets (`__s26u.state().selected` verandert), geen console- of paginafouten en
`__s26u` klaar binnen `PUBSMOKE_READY_MS`.

Resultaat van de volledige Linux-run (pages-vorm; de artifact-vorm staat in dezelfde uitvoer):

| Viewport | compatMode | innerWidth | Paneel onderaan en binnen de breedte | Tik selecteert | Resultaat |
|---|---|---|---|---|---|
| 390 x 844, dpr 3 | in te vullen door de orkestrator na de volledige Linux-run | | | | |
| 360 x 780, dpr 3 (Android-achtig) | in te vullen door de orkestrator na de volledige Linux-run | | | | |
| 430 x 932, dpr 3 | in te vullen door de orkestrator na de volledige Linux-run | | | | |

Datum: in te vullen. Bronhash (versiestempel uit `index.html`): in te vullen.

Ter vergelijking, gemeten op 16 oktober 2026 op macOS met een kopie buiten de repo: met de oude `head.html` (versie 1,
bron 11d04bf, zonder doctype en viewport) is de pages-vorm rood op alle drie telefoonviewports, met `BackCompat` en
`innerWidth` 980, de bureaubladindeling met het paneel rechts in plaats van onderaan en een tik in het midden die
niets selecteert. Met doctype, charset en viewport in `head.html`
(versie 2, bron 60852be) gaf dezelfde test `PUBLICATIEROOKTEST OK` in beide vormen. Dat is een voormeting, geen invulling
van de tabel hierboven: de bron kan in golf 6 nog veranderen.

## b. Wat emulatie niet dekt

- Een echte GPU en zijn driver: SwiftShader rekent op de processor, dus fps en tekentijd zeggen niets over het toestel.
- Safari (WebKit) en Samsung Internet: de test draait alleen Chromium.
- Warmte en terugschakelen van de klok bij langer gebruik.
- Geheugendruk: de browser die het tabblad weggooit of de WebGL-context verliest.
- Aanraaklatentie, echte gebaren met meerdere vingers en de systeemgebaren aan de schermrand.
- Adresbalk die in- en uitschuift, schermuitsparing en veilige randen van het echte scherm.
- Het netwerk: in de emulatie komen de three.js-bestanden uit het lokale npm-pakket en de lettertypen als lege stylesheet (tools/pubsmoke.py onderschept die verzoeken). Laden via jsDelivr en Google Fonts over een mobiel netwerk, de eerste laadtijd en gedrag zonder verbinding test alleen het toestel.
- De echte artifact-levering: die is niet geëmuleerd. De artifact-vorm van `tools/pubsmoke.py` bootst alleen het HTML-geraamte na. Het echte kanaal loopt via claude.ai, waar de pagina in een iframe met sandbox en CSP draait, en een privé-artifact vraagt eerst om inloggen. Of de pagina daar laadt, test alleen het toestel.

## c. Toestelprotocol (Galaxy S26 Ultra van de gebruiker)

Op het toestel wordt de Pages-URL getest (`https://rvd-gmpplus.github.io/s26u/`), niet de artifact-vorm. Rij 9 is optioneel en dekt het artifact-kanaal.

| Nr | Handeling | Verwacht |
|---|---|---|
| 1 | Open `https://rvd-gmpplus.github.io/s26u/` staand | Model verschijnt, paneel onderaan, niets schuift zijwaarts, tekst is leesbaar zonder inzoomen |
| 2 | Open `https://rvd-gmpplus.github.io/s26u/?debug=1` en noteer de versiestempel | Overlay toont fps (of `rust`) en `versie N (bron xxxxxxx)`; dezelfde stempel staat onder de knop `?` |
| 3 | Tik op het toestel | De groep klapt uit en de kaart onderaan toont de naam |
| 4 | Houd een onderdeel vast tot de ring vol is | De groep van dat onderdeel klapt in; geen systeemmenu of tekstselectie |
| 5 | Sleep met een vinger, knijp en schuif met twee | Draaien, zoomen en schuiven volgen de vingers; de pagina zelf scrolt of zoomt niet |
| 6 | Kies bovenin `Openen` en tik op het achterglas of de SIM-lade | De opener draait of schuift open |
| 7 | Kies `Rondleiding` onder Overzicht | De stappen spelen af; pauze, volgende en stop werken |
| 8 | Draai het toestel naar liggend en terug | De indeling past zich aan, niets valt buiten beeld |
| 9 (optioneel) | Open `https://claude.ai/artifact/4WvFbz8L3JZLEAGLcHPC4F` op het toestel, ingelogd, en noteer of de pagina laadt | De pagina laadt en toont het model; noteer anders wat er verschijnt (inlogscherm, lege pagina, foutmelding) |

## d. Invultabel

De rijen 1 tot en met 8 gaan over de Pages-URL. Rij 9 (optioneel) gaat over de artifact-URL.

Datum:
Browser en versie:
Versiestempel (rij 2):

| Nr | GOED of NIET GOED | Opmerking (bij rij 2 ook de fps) |
|---|---|---|
| 1 | | |
| 2 | | |
| 3 | | |
| 4 | | |
| 5 | | |
| 6 | | |
| 7 | | |
| 8 | | |
| 9 (optioneel, laadt de artifact-URL) | | |

## e. Privacy

Geen IMEI, serienummer of telefoonnummer in deze tabel, in de repo, in een issue of in een commitbericht. Geen
schermafbeelding van `Over de telefoon` of andere toestelinstellingen. Alleen schermafbeeldingen van de pagina zelf.

## f. Status

Het masterplanpunt `Telefoontest op het toestel zelf` (`docs/masterplan.md`) blijft open tot de invultabel hierboven
gevuld is. Controlemomenten: 19 oktober 2026 en 23 oktober 2026.

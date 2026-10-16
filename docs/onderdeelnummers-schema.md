# Schema van docs/onderdeelnummers.csv

`docs/onderdeelnummers.csv` is de platte uitvoer van de nummergegevens in `data/pn/`, bedoeld voor wie de nummers buiten de
pagina wil gebruiken. De pagina leest dezelfde gegevens als `PN_DATA` uit `src/partnumbers.js`. Beide bestanden maakt
`python3 tools/orkestratie/build_pn.py`; niemand bewerkt ze met de hand. `python3 tools/pncheck.py` bouwt ze in het geheugen
opnieuw en vergelijkt byte voor byte. In golf 0 zijn er nog geen nummers: elke rij heeft status `niet onderzocht`.

## Bestandsvorm

| Kenmerk | Waarde |
|---|---|
| Codering | UTF-8 zonder BOM |
| Scheidingsteken | puntkomma (`;`) |
| Regeleinde | CRLF, ook op de laatste regel; `.gitattributes` houdt dat zo (`*.csv -text`) |
| Kopregel | ja, de 23 kolomnamen hieronder, in deze volgorde |
| Aanhalen | alleen als het veld een puntkomma, aanhalingsteken of regeleinde bevat (RFC 4180) |
| Volgorde | alfabetisch op `pad`; binnen een pad eerst de Samsung-nummers, dan de fabrikantnummers, in de volgorde van het record |

## Rijen

1. Een pad dat in `data/pn/map.json` aan een verkoopeenheid is gekoppeld en waarvan de eenheid nummers heeft: één rij per
   nummer.
2. Een gekoppeld pad waarvan de eenheid geen nummer heeft: één rij zonder nummer.
3. Een pad uit `data/tree.json` zonder koppeling: één rij met status `niet onderzocht`.

De wortel `Samsung Galaxy S26 Ultra` staat niet in de CSV; alle paden zijn zonder wortel.

## Kolommen

| Nr | Kolom | Betekenis |
|---|---|---|
| 1 | `pad` | Pad zonder wortel, één veld; niet splitsen op `/` (een naam kan een schuine streep bevatten) |
| 2 | `naam` | Naam van de knoop |
| 3 | `diepte` | Diepte onder de wortel, 1 voor een hoofdgroep |
| 4 | `knoop` | `groep` of `onderdeel` |
| 5 | `unit_id` | Verkoopeenheid als `plak:ID` |
| 6 | `verkoopeenheid` | Naam van de verkoopeenheid |
| 7 | `relatie` | `zelf`, `deel` of `set` |
| 8 | `regel` | Toelichting bij de koppeling |
| 9 | `status` | Zie de statuslabels hieronder |
| 10 | `soort` | `Samsung` voor een servicenummer uit `oe`, `fabrikant` voor een nummer uit `am` |
| 11 | `merk` | Merk van het nummer |
| 12 | `nummer` | Het nummer, letterlijk zoals de bron het schrijft |
| 13 | `bewijs` | A: in een servicecatalogus voor dit model op de juiste plaats; B: Samsung-servicenummer van zo'n artikel; C: kruisverwijzing; D: alleen uit een advertentie of teardown |
| 14 | `opmerking` | Korte Nederlandse aanduiding bij het nummer; geen letterlijke catalogustekst |
| 15 | `var` | Varianten en waarvan de keuze afhangt (modelcode, regio, kleur) |
| 16 | `per` | Verpakking of aantal per toestel |
| 17 | `bronnen` | Alle bron-URL's van de eenheid, gescheiden door `\|` |
| 18 | `gekozen` | `ja` op de rij van een nummer dat voor het toestel van de gebruiker is gekozen |
| 19 | `uitvoering_keuze` | De gekozen uitvoering in woorden |
| 20 | `zekerheid_keuze` | `hoog`, `middel` of `laag` |
| 21 | `grond_keuze` | Waarop de keuze steunt (kleur, geheugen); IMEI en serienummer staan er nooit in |
| 22 | `bronnen_keuze` | Bron-URL's van de keuze, gescheiden door `\|` |
| 23 | `info` | Onderhoudsregels en bekende problemen van het pad |

## Statuslabels

| `status` | Wanneer |
|---|---|
| `past volgens catalogus` | eenheid met `st` = `past` |
| `variant: kies op modelcode en kleur` | eenheid met `st` = `model` zonder keuze |
| `gekozen voor dit toestel` | eenheid met `st` = `model` en een keuze (`kz`) |
| `niet gevonden` | eenheid met `st` = `nietgevonden` |
| `niet onderzocht` | pad zonder koppeling |

## Geen productteksten

De repo neemt geen productteksten, prijzen of foto's over. Feiten zoals maat, zijde of kleur van een artikel mogen wel, in eigen
Nederlandse woorden.

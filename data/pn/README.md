# data/pn: de canonieke nummergegevens

De bron van `src/partnumbers.js` en `docs/onderdeelnummers.csv`. `tools/orkestratie/build_pn.py` bouwt beide; het
schema van de CSV staat in `docs/onderdeelnummers-schema.md`.

| Bestand | Inhoud |
|---|---|
| `meta.json` | Het toestel (`toestel`), eventueel `checked` (controledatum) en `note` |
| `units/<plak>.json` | Verkoopeenheden per onderzoeksplak, id `plak:ID` -> `{ n, st, oe, am, var, per, note, src, kz }` |
| `map.json` | Pad zonder wortel -> `[eenheid, 'zelf' \| 'deel' \| 'set', regel]` |
| `info.json` | Pad zonder wortel -> `[[label, waarde, bron, zekerheid]]` |

Golf 0 heeft nog geen eenheden. Golf 5 vult ze, met deze regels:
- elk nummer heeft een bron met https;
- bewijs A tot D zoals in het paneel;
- een onzeker nummer krijgt graad D of blijft weg;
- IMEI, serienummer en telefoonnummer van de gebruiker staan nooit in deze gegevens.

Na een wijziging van de boom eerst `python3 tools/pncheck.py --tree --update`, dan `python3 tools/orkestratie/build_pn.py`.

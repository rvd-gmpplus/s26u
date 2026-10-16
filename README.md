# Galaxy S26 Ultra explosietekening

Interactieve 3D-explosietekening van een Samsung Galaxy S26 Ultra (1 TB, 16 GB RAM, White) in de browser. Klik op een
onderdeel om zijn groep uit te klappen, dubbelklik om er direct heen te gaan, rechtsklik of houd vast om in te klappen. Alle
geometrie staat in JavaScript; er worden geen 3D-bestanden, foto's of productteksten gebruikt.

Onafhankelijk schematisch model, niet van of namens Samsung. Samsung en Galaxy zijn merken van Samsung Electronics.

## Stand

Golf 0 van het masterplan is klaar. De bouw, de app en de testset zijn overgenomen uit
[laguna3](https://github.com/rvd-gmpplus/laguna3), en het toestel staat er als plaatshouder in: drie lagen op de echte
buitenmaat. De volledige teardown volgt in golf 1 tot 6, zie `docs/masterplan.md`. De kerncijfers staan in
`docs/cijfers.md`.

## Bouwen en testen

```
tools/setup.sh                                  # Playwright, three.js 0.147.0 (met hashcontrole), Chromium
python3 build.py --lint                         # controles zonder te schrijven
python3 build.py                                # schrijft index.html
tools/orkestratie/finaltests.sh UITMAP          # volledige strikte testset, één exitcode
```

`index.html` is één bestand. three.js r147 komt van jsDelivr, met integriteitshashes. Zet je het bestand op een webserver of
GitHub Pages, dan werkt het.

## Documentatie

- `CLAUDE.md`: afspraken voor wie hier bouwt.
- `docs/masterplan.md`: doel, keuzes, ontwerpbesluiten en de golven.
- `docs/ontwerp-en-architectuur.md`: bouw, onderdelenboom, schaal en assen, eigendom.
- `docs/testen.md`: de testset en wat elke test bewaakt.
- `docs/specificaties-en-bronnen.md`: geverifieerde gegevens en bronnen.
- `docs/onderdeelnummers-schema.md`: de CSV met onderdeelnummers.

## Licentie

MIT, zie `LICENSE`.

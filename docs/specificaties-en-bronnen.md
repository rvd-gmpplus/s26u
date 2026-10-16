# Specificaties en bronnen

Een gegeven komt pas in een `spec` van het model als het hier staat met status **bevestigd**: minstens twee onafhankelijke
bronnen die het eens zijn en die zelf zijn opgehaald en gelezen, of één primaire bron (Samsung zelf). Wijken bronnen af, dan
staat dat hieronder met de keuze en de reden. Zo blijft één plek de bron van de getallen in de pagina.

## Statussen

| Status | Betekenis |
|---|---|
| bevestigd | twee opgehaalde, onafhankelijke bronnen eens, of een primaire bron |
| open | bronnen spreken elkaar tegen, of er is maar één opgehaalde bron; niet in `spec` |
| schatting | maat in de geometrie zonder bron (laagdikte, hoekstraal); nooit in `spec`, wel in het commentaar van de code |

## Toestel (stand 16 oktober 2026)

[0] is het persbericht van Samsung met de specificatietabel en geldt als primaire bron.

| Gegeven | Waarde | Status | Bronnen |
|---|---|---|---|
| Afmetingen | 163,6 × 78,1 × 7,9 mm | bevestigd | [0], [1], [2] |
| Gewicht | 214 g | bevestigd | [0], [1], [2] |
| Scherm | 6,9 inch QHD+ Dynamic AMOLED 2X, 1 tot 120 Hz (6,7 inch met afgeronde hoeken) | bevestigd | [0] |
| Resolutie | 3120 × 1440 | bevestigd | [1], [2] |
| Chip | Snapdragon 8 Elite Gen 5 for Galaxy | bevestigd | [0] |
| Geheugen van dit toestel | 16 GB RAM bij 1 TB; de andere uitvoeringen zijn 12 + 512 en 12 + 256 GB | bevestigd | [0] |
| Batterij | 5000 mAh typisch, 4855 mAh nominaal | bevestigd | [0] |
| Bedraad laden | tot 75% in ongeveer 30 minuten met een 60W-adapter | bevestigd | [0], [4] |
| Draadloos laden | 25 W | open | [1]; Samsung noemt alleen "Super Fast Wireless Charging" |
| Hoofdcamera | 200 MP, f/1,4 | bevestigd | [0], [1] (de archiefversie van [1] noemde nog f/1,7), [2] |
| Ultragroothoek | 50 MP, f/1,9 | bevestigd | [0], [1] |
| Tele 5× | 50 MP, f/2,9 | bevestigd | [0], [1] |
| Tele 3× | 10 MP, f/2,4 | bevestigd | [0], [1] |
| Selfiecamera | 12 MP, f/2,2 | bevestigd | [0], [1] |
| Kleur van dit toestel | White, met een zilveren frame | bevestigd | kleur door de gebruiker; "White" staat in [0]; het zilveren frame bij White in [8] en door de gebruiker |
| Materiaal frame | aluminium ("Armor Aluminum") | open | alleen persverslagen [8] |
| Modelcode | begint met SM-S948 | bevestigd | [1], en SM-S948B... op de Samsung-pagina [9] |
| Vapor chamber | herontworpen, met warmtegeleidend materiaal langs de zijkanten van de processor | bevestigd | [0] |

## Gemeten op de officiële achteraanzichtrender

De officiële productrender van de achterkant (Silver Shadow, met S Pen, afgebeeld bij [11]) is gemeten op schaal 6,17 px/mm (de breedte van 78,1 mm). De meetwaarden staan in `docs/indeling.md`. Het
gaat om de hoekstraal (8,5 mm), het camera-eiland (20,8 × 56,8 mm, 4,5 mm uit de rand), de lensvensters (Ø 15,6 en 8,2 mm)
en de flitser.

## Teardowns

| Bevinding | Status | Bronnen |
|---|---|---|
| Toegang via het achterglas (verwarmen en loswrikken) | bevestigd | [6], [10] |
| Batterij met kunststof omhulling met lijm en een treklip; eerst de luidspreker onderin eruit | bevestigd | [10], [11] |
| USB-C-poort los vervangbaar | bevestigd | [6], [10] |
| Camera's zitten van onderen op het moederbord; voor een camera moet het bord eruit | bevestigd | [10] |
| Schermconnector alleen van achteren bereikbaar | bevestigd | [10], [12] |
| Selfiecamera onder het moederbord, zwaar verlijmd | bevestigd | [10], [12] |
| Herstelbaarheid voorlopig 5 van 10 (iFixit) | bevestigd | [10], [11] |
| Vapor chamber ongeveer 15% groter dan bij de S25 Ultra | open | [7] (JerryRigEverything via ChannelNews), niet zelf gemeten |
| Koelstapel van vier lagen: grafietfolie, thermische pads, koelpasta, vapor chamber | open | [7] (PBKreviews via ChannelNews) |

De pagina van de iFixit-teardown zelf was niet op te halen; de bevindingen hierboven komen uit drie verslagen die het eens zijn.

## Schattingen

Laagdiktes, de binnenindeling, de volgorde van de camera's in de kolom en de plek van knoppen, SIM-lade en S Pen-opening zijn
schattingen. Ze staan met hun status in `docs/indeling.md` en in de beschrijving van het onderdeel; ze komen nooit in een `spec`.

## Bronnen

0. Samsung Newsroom, persbericht en specificatietabel Galaxy S26-serie: https://news.samsung.com/global/samsung-unveils-galaxy-s26-series-the-most-intuitive-galaxy-ai-phone-yet
1. iFixit, apparaatpagina Samsung Galaxy S26 Ultra: https://www.ifixit.com/Device/Samsung_Galaxy_S26_Ultra (archief maart 2026: https://wikipedia.jakami.de/content/ifixit_de_all_2026-03/Device/Samsung_Galaxy_S26_Ultra)
2. One NZ, specificaties Galaxy S26 Ultra: https://userguide.one.nz/samsung/galaxy-s26-ultra-android-16/specifications/
3. Smartprix, uitvoering 16 GB + 1 TB: https://us.smartprix.com/mobiles/samsung-galaxy-s26-ultra-16gb-ram-1tb-ppd1bezatu2m
4. Notebookcheck over de 60W-lader: https://notebookcheck.net/samsung-releases-new-compact-60w-charger-for-galaxy-s26-ultra.1235650.0.html
5. SamMobile over de kleuren: https://www.sammobile.com/news/galaxy-s26-colors-doing-something-right
6. 9to5Google over de iFixit-teardown: https://9to5google.com/2026/03/24/galaxy-s26-ultra-teardown-easy-battery-repairs-parts/
7. ChannelNews over de koelstapel: https://www.channelnews.com.au/galaxy-s26-ultra-teardown-reveals-new-multi-layer-cooling-design/
8. PhoneArena over de witte uitvoering: https://www.phonearena.com/news/why-the-stunning-white-s26-ultra-is-the-only-design-choice-that-matters-this-year_id178416
9. Samsung Saudi-Arabië, specificatiepagina (kleuren en modelcodes): https://www.samsung.com/sa_en/smartphones/galaxy-s26-ultra/specs/
10. GSMArena over de iFixit-teardown: https://www.gsmarena.com/new_samsung_galaxy_s26_ultra_teardown_praises_how_easy_it_is_to_replace_the_battery-news-72092.php
11. Android Central over de iFixit-teardown: https://www.androidcentral.com/phones/samsung-galaxy/samsung-galaxy-s26-ultra-teardown-reveals-a-battery-thats-easy-to-replace-and-not-much-else
12. Droid Life over de iFixit-teardown: https://www.droid-life.com/2026/03/25/galaxy-s26-ultra-teardown/

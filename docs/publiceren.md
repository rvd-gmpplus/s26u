# Publiceren

Procedure voor de orkestrator, van werktak tot gepubliceerde versie. Vastgelegd in golf 6 (2026-10-16) naar aanleiding van
de premortem (punten 3 tot en met 7). Testen en platformen: `docs/testen.md`. Toestelstest: `docs/telefoontest.md`.

Vaste namen in deze procedure:
- werktak: `golf-6`, in een eigen worktree;
- main-worktree: de main-worktree van de orkestrator (pad via `git worktree list`);
- uitvoer van runs: `/tmp/s26u-runs/` (nooit in de repo, bewust buiten OneDrive; op 2026-10-16 draaiden de runs per
  abuis in `~/Documents/GitHub/s26u-runs`, een map die in OneDrive staat). Zeg dit pad in elke opdracht aan subagents;
- artifact (claude.ai): `https://claude.ai/artifact/4WvFbz8L3JZLEAGLcHPC4F` (bestaand; versie 1 gemeten op 2026-10-16);
- hulpmiddelen: `tools/orkestratie/bytecheck.py`, `tools/orkestratie/verwijzingen.py`, `tools/orkestratie/mergecheck.py`.

## Stappen

1. **(a) Voor elke subagent en elke commit.**
   - Controleer de tak: `git branch --show-current` geeft `golf-6`.
   - Controleer de main-worktree: `git -C <main-worktree> status --porcelain` is leeg. Is hij niet leeg, dan stoppen en
     uitzoeken wie daar schreef.
   - Testuitvoer gaat naar `/tmp/s26u-runs/<naam>`.
   - Eenmalig: `git remote set-head origin -a`. Lokaal wijst `origin/HEAD` nog naar de claude-tak; zonder deze stap
     vergelijken scripts en `git merge-base` tegen de verkeerde basis.
   - Een subagenttak gaat pas samen na `python3 tools/orkestratie/mergecheck.py DOMEIN COMMIT`. Een WAARSCHUWING over
     `IGNORE` of `ARGS` in `tools/harness.py` beoordeelt de orkestrator zelf (premortem oorzaak 2, consolefilter).

2. **(b) Mac-run en Linux-job `volledig`.**
   - Mac: `tools/orkestratie/finaltests.sh /tmp/s26u-runs/mac-<datum>`. Twaalf tests moeten groen zijn; visdiff meldt
     "platform, niet beoordeeld" (zie `docs/testen.md`, Platformen).
   - Linux: de Actions-job `volledig` (bij `workflow_dispatch` en bij een pull request naar main). Dit is de beoordelende run.
   - Nulmeting: draai `volledig` eerst op een hulptak vanaf `edb37f2` met alleen de nieuwe `.github/workflows/ci.yml`. Zo
     is te zien wat visdiff op Linux meet zonder wijziging in `src/`.
   - Stopregel: geeft de nulmeting of de run van `golf-6` een beeld boven 1,5 procent afwijkende pixels, dan stopt de
     orkestrator en legt de keuze voor aan de gebruiker (basislijn vernieuwen, oorzaak zoeken of uitstellen). Geen eigen
     besluit.
   - Dezelfde stopregel geldt als de nulmeting of de run van `golf-6` rood is door een andere test dan visdiff: stoppen en
     de uitvoer letterlijk vastleggen. Geen regel in `IGNORE` of `IGNORE_DARWIN`, geen drempel, tolerantie of
     omgevingsvariabele verruimen zonder melding aan de gebruiker. Een nieuwe `IGNORE`-regel alleen met exacte zin, reden,
     datum en een rode tegenproef (`S26U_TEGENPROEF=1`).

3. **(c) Bevriezing.**
   - Na de groene Linux-run geen wijziging meer in `src/`, `build.py` of `VERSION` zonder een nieuwe groene Linux-run.
   - Haal de uitmap van de job op (artefact `volledig-uitvoer`) naar `/tmp/s26u-runs/volledig-<run-id>` en draai
     `python3 tools/orkestratie/bytecheck.py groen /tmp/s26u-runs/volledig-<run-id>` op een schone werkmap. Exit 0 is
     de voorwaarde voor de PR (premortem oorzaak 5, bevriezing: niets publiceren dat niet groen gemeten is). Het script vergelijkt de
     bron-sha256 uit `bron.txt` met de werkmap; de rekenwijze staat in de docstring van `bytecheck.py` en is dezelfde als
     in `finaltests.sh`.
   - Verbeteringen die beelden raken gaan naar golf 7, of naar een aparte galerijcommit met een basislijn uit Actions.
     Dat laatste alleen na melding aan de gebruiker.

4. **(d) Verwijzingen en geheimen.** Vlak voor de PR, op de vastgelegde boom:
   - `python3 tools/orkestratie/verwijzingen.py --ref HEAD` geeft exit 0 (geen verwijzing naar een ontbrekend bestand);
   - `python3 tools/orkestratie/verwijzingen.py --geheim --ref HEAD` geeft exit 0 (geen IMEI of serienummer in bestanden
     of in de commitberichten van `main..HEAD`).
   - Een treffer toont alleen de laatste 4 tekens. De volledige waarde nooit in een melding, commit of PR overnemen.

5. **(e) Pull request en samenvoegen.**
   - `gh pr create --base main --head golf-6`.
   - CI: de jobs `snel` en `volledig` zijn groen. Pas dan samenvoegen.

6. **(f) Pages.** Na het samenvoegen: `python3 tools/orkestratie/bytecheck.py pages --ref main`. Het script wacht tot de
   Pages-build de commit van main heeft (`--wacht`, standaard 900 s), haalt de pagina op met `?cb=<commit>` (Pages
   geeft `max-age=600`) en vergelijkt byte voor byte met `index.html` op main. Alleen exit 0 en de regel `gelijk` tellen.
   Na het samenvoegen mag er geen andere commit naar main tot (f) en (g) klaar zijn: `bytecheck pages` wacht op precies
   de commit die hij bij de start ophaalt.

7. **(g) Artifact (claude.ai).** Altijd in deze volgorde, met de bytes van `origin/main`, nooit de werkmap of een
   lokale `main`:
   - `git fetch origin`.
   - `git show origin/main:index.html > /tmp/s26u-runs/index-<commit>.html`, met `<commit>` de korte hash van
     `git rev-parse origin/main`.
   - Artifact read van `https://claude.ai/artifact/4WvFbz8L3JZLEAGLcHPC4F`. Eerst lezen is verplicht: zonder read in
     dezelfde sessie weigert de tool het publiceren naar een bestaand artifact.
   - Lees het bestand dat die read opslaat volledig (elke regel, in delen; versie 1 had 5730 regels) en laat het
     ongewijzigd. De tool telt een versie pas als gelezen als elke regel gelezen is en weigert anders de publish op het
     bestaande artifact. Een weigering die alleen hierdoor ontstaat is geen hostweigering: alsnog volledig lezen en
     opnieuw publiceren.
   - Lees `/tmp/s26u-runs/index-<commit>.html` volledig (de tool publiceert niets wat niet gelezen is).
   - Publish met `url` gelijk aan de artifact-URL en `file_path` gelijk aan `/tmp/s26u-runs/index-<commit>.html`, zonder
     `icon` (het is een bestaand artifact; het houdt zijn icoon).
   - Lees het artifact terug met een Artifact read. De tool slaat de teruggegeven bron op als bestand en noemt het pad;
     kopieer dat bestand ongewijzigd naar `/tmp/s26u-runs/artifact-<commit>.html`.
   - `python3 tools/orkestratie/bytecheck.py artifact /tmp/s26u-runs/artifact-<commit>.html --ref main`. Het script
     haalt eerst `origin` op en vergelijkt met `origin/main:index.html`.
   - Verwacht: `gelijk (na vaste verpakking)` (de host zet `SKELETON_HEAD` en `SKELETON_TAIL` uit `tools/pubsmoke.py`
     eromheen; gemeten op 2026-10-16), of `gelijk (bron)` als de host een pagina met eigen doctype niet verpakt. Dat
     zijn de enige twee uitkomsten die "byte gelijk" mogen heten; er wordt niets genormaliseerd.
   - Elke andere uitkomst (ook een weigering van de host bij publish of read) letterlijk vastleggen, inclusief de
     offset en de context uit `bytecheck.py`, en aan de gebruiker voorleggen. Geen eigen aanpassing van de verpakking
     zonder nieuwe meting, en geen claim zonder meting.

8. **(h) Controlemomenten toestelstest.** Op 19 oktober 2026 en 23 oktober 2026 test de gebruiker de gepubliceerde versie
   op het toestel volgens `docs/telefoontest.md`. Eigenaar: de gebruiker. De orkestrator biedt bij de oplevering een
   herinnering voor beide data aan en noteert de uitkomst.

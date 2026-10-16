/* ===================== onderdeelnummers ===================== */
// Gegevens, geen code. Gemaakt door de orkestrator uit de geverifieerde onderzoeksbestanden (build_pn.py); niet met de hand bewerken.
// units: id -> { n, st: 'past' | 'model' | 'nietgevonden', oe: [[nummer, opmerking, bewijs]], am: [[merk, nummer, opmerking, bewijs]],
//                var, per, note, src: [[url, label]], kz }; bewijs A, B, C of D (zie het paneel).
// kz (alleen bij een gekozen uitvoering voor het toestel van de gebruiker): { o: [gekozen Samsung-nummers], a: [[merk, nummer]], v: uitvoering, b: bewijs, z: zekerheid, g: grond, s: [bronnen] }.
// map: pad zonder wortel -> [unit-id, 'zelf' | 'deel' | 'set', regel]. Een pad dat niet in map staat, is 'niet onderzocht'.
// info: pad zonder wortel -> [[label, waarde, bron, zekerheid]] (onderhoud en bekende problemen).
const PN_DATA = {"meta":{"toestel":"Samsung Galaxy S26 Ultra, 1 TB met 16 GB RAM, lichte kleur (White of Silver Shadow, vast te stellen in golf 1).","note":"Alleen nummers met een bron; bewijs A tot D zoals in het paneel. IMEI, serienummer en telefoonnummer van de gebruiker staan nooit in deze gegevens."},"units":{},"map":{},"info":{}};

"""Meet welke WebGL-renderer de testbrowser echt gebruikt (orkestrator golf 6, 2026-10-16).

docs/testen.md belooft dat alle tests in SwiftShader draaien. Dit script controleert dat: het opent via harness.session()
de testpagina, leest via WEBGL_debug_renderer_info UNMASKED_VENDOR_WEBGL en UNMASKED_RENDERER_WEBGL (van een vers
canvas en, als die er is, van de three.js-context van de pagina), plus platform en Chromium-versie.

    python3 tools/orkestratie/renderer.py              # drukt 'renderer: ...' af; exitcode 1 als het geen SwiftShader is
    python3 tools/orkestratie/renderer.py --json PAD   # schrijft het resultaat ook als JSON weg

Exitcode: 0 bij SwiftShader, 1 als de renderer geen 'SwiftShader' bevat of niet te lezen is.
"""
import os, sys, json, platform

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import harness


def meet(s):
    """Meet de renderer in een open harness-sessie (via harness.renderer_info). Geeft een dict met o.a. 'renderer' en
    'swiftshader'."""
    pg = s.page(640, 480)
    out = harness.renderer_info(pg)
    pg.context.close()
    out.update({'platform': platform.platform(), 'chromium': s.browser.version, 'args': list(s.args)})
    return out


def regel(m):
    return f"renderer: {m['renderer']} | vendor: {m['vendor']} | chromium {m['chromium']} | {m['platform']}"


def main(argv):
    pad = None
    if '--json' in argv:
        i = argv.index('--json')
        if i + 1 >= len(argv):
            raise SystemExit('--json verwacht een pad')
        pad = argv[i + 1]
    with harness.session() as s:
        m = meet(s)
    print(regel(m))
    print('args:', ' '.join(m['args']))
    if pad:
        with open(pad, 'w') as f:
            json.dump(m, f, indent=2, ensure_ascii=False)
    if not m['swiftshader']:
        print('FOUT: renderer is geen SwiftShader (docs/testen.md belooft SwiftShader)')
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))

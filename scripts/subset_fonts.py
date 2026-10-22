import re, sys, urllib.request, urllib.parse, pathlib
site = pathlib.Path(sys.argv[1])
chars = set(chr(c) for c in range(0x20, 0x7f))
chars |= set(chr(c) for c in range(0xa0, 0x100))        # Latin-1: accents, ©, ×, etc.
chars |= set("‘’“”–—…•·→←↗↙▶▼◆◎★♥™€")
for page in site.rglob("*.html"):
    chars |= set(re.sub(r"<[^>]+>", "", page.read_text()))
for script in (site / "assets").glob("*.js"):
    chars |= set(script.read_text())  # text the scripts put on the page
chars = "".join(sorted(c for c in chars if c.isprintable()))
print("glyphs:", len(chars), "non-latin:", "".join(c for c in chars if ord(c) > 0x2000))
ua = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
out = site / "assets/fonts"
for family, slug, weights in [("Dela Gothic One", "delagothicone", [400]), ("Zen Kaku Gothic New", "zenkakugothicnew", [400, 500, 700])]:
    for w in weights:
        url = "https://fonts.googleapis.com/css2?" + urllib.parse.urlencode({"family": f"{family}:wght@{w}", "text": chars, "display": "swap"})
        css = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": ua})).read().decode()
        srcs = re.findall(r"url\((https://[^)]+)\) format\('woff2'\)", css)
        assert len(srcs) == 1, (family, w, css[:300])
        data = urllib.request.urlopen(srcs[0]).read()
        (out / f"{slug}-{w}.woff2").write_bytes(data)
        print(slug, w, len(data))

#!/usr/bin/env python3
"""Deep IP scan over the RAW generation prompts, restricted to assets that SHIPPED.

Two things the existing scan cannot do:
  * entries.json truncates `name` to ~60 chars, so a franchise named later in a
    prompt was never seen. The staging results file keeps the whole prompt.
  * it reports on the source library, most of which was never shipped. Only an
    asset present in /opt/cr-realms-store can hurt anyone, so every hit is
    cross-referenced against the store by its id8 before being reported.

Word boundaries matter more than they look: without them `minion` matches the
realm name "dominion", `luffy` matches "fluffy", `avenger` matches "Scavenger"
and `hulk` matches "hulking ogre". Every one of those fired on the first run.

This NOMINATES ONLY. A prompt naming a franchise does not prove the texture
shows it, and a clean prompt does not prove it does not. Render every hit and
decide by eye.
"""
import json, re, os, glob, sys

SOURCES = [
    '/mnt/usb4/moveweight-assets/cr-realms-staging/_results.json',
    '/opt/cryptic-realm/tmp/picktura_names.json',
    '/opt/cryptic-realm/tmp/allrows_picktura.json',
    '/opt/cryptic-realm/tmp/nonhum_src.json',
]
STORE = '/opt/cr-realms-store'

# Multi-word marks are safe as-is; single words get \b and are chosen to have no
# common English superstring.
TERMS = {
 'comics/film': [
   r"\bsuperman\b", r"\bbizarro\b", r"\bkryptonian\b", r"man of steel", r"\bbatman\b",
   r"dark knight", r"spider[\s-]?man", r"\bwolverine\b", r"\bdeadpool\b", r"iron man",
   r"captain america", r"black panther", r"\bwakanda\b", r"the hulk", r"incredible hulk",
   r"\bavengers\b", r"x-men", r"\bmarvel\b", r"dc comics", r"justice league",
   r"\baquaman\b", r"wonder woman", r"green lantern", r"harley quinn", r"\bthanos\b",
   r"star wars", r"\bjedi\b", r"\bsith\b", r"\bdarth\b", r"\byoda\b", r"\bmandalorian\b",
   r"\bstormtrooper\b", r"\blightsaber\b", r"\bchewbacca\b",
   r"harry potter", r"\bhogwarts\b", r"\bvoldemort\b", r"\bdumbledore\b",
   r"lord of the rings", r"\bgandalf\b", r"\bfrodo\b", r"\bsauron\b", r"\bgollum\b",
   r"\bterminator\b", r"\bt-800\b", r"\bxenomorph\b", r"\bgodzilla\b", r"king kong",
   r"\btransformers\b", r"optimus prime", r"\bgundam\b", r"\bevangelion\b",
   r"\bdisney\b", r"\bpixar\b", r"mickey mouse", r"\bshrek\b", r"\bspongebob\b",
   r"\bsimpsons\b", r"rick and morty", r"ninja turtles", r"\bghostbuster",
   r"jurassic park", r"indiana jones", r"james bond",
 ],
 'games': [
   r"\bpokemon\b", r"\bpikachu\b", r"\bcharizard\b", r"super mario", r"\bmario\b",
   r"\bluigi\b", r"\bbowser\b", r"\bzelda\b", r"\bhyrule\b", r"sonic the hedgehog",
   r"\bminecraft\b", r"\bfortnite\b", r"master chief", r"doom slayer", r"\bdoomguy\b",
   r"\bwitcher\b", r"\bgeralt\b", r"god of war", r"\bkratos\b", r"\boverwatch\b",
   r"league of legends", r"world of warcraft", r"\bwarcraft\b", r"\bdiablo\b",
   r"\bstarcraft\b", r"final fantasy", r"\bsephiroth\b", r"cloud strife",
   r"elden ring", r"dark souls", r"\bskyrim\b", r"\bdovahkiin\b", r"vault boy",
   r"assassin's creed", r"resident evil", r"street fighter", r"mortal kombat",
   r"crash bandicoot", r"\bspyro\b", r"\bmegaman\b", r"mega man", r"\bcastlevania\b",
 ],
 'anime': [
   r"\bnaruto\b", r"\bsasuke\b", r"dragon ball", r"\bgoku\b", r"\bvegeta\b",
   r"super saiyan", r"one piece", r"monkey d", r"\bzoro\b", r"attack on titan",
   r"demon slayer", r"\btanjiro\b", r"\bnezuko\b", r"jujutsu kaisen",
   r"my hero academia", r"all might", r"sailor moon", r"\btotoro\b",
   r"fullmetal alchemist", r"death note", r"chainsaw man",
 ],
 'brands': [
   r"\badidas\b", r"\bnike\b", r"\bpuma\b", r"\breebok\b", r"new balance",
   r"under armour", r"\bgucci\b", r"louis vuitton", r"\bbalenciaga\b", r"\bprada\b",
   r"\bversace\b", r"off-white", r"north face", r"\byeezy\b", r"air jordan",
   r"\bconverse\b", r"\btimberland\b", r"\bferrari\b", r"\blamborghini\b",
   r"\bporsche\b", r"\bbugatti\b", r"\bmercedes\b", r"coca[\s-]?cola", r"\bpepsi\b",
   r"mcdonald", r"burger king", r"\bstarbucks\b", r"red bull", r"monster energy",
   r"\bplaystation\b", r"\bxbox\b", r"\bnintendo\b",
 ],
 'real people': [
   r"donald trump", r"joe biden", r"elon musk", r"\bkanye\b", r"taylor swift",
   r"cristiano ronaldo", r"lionel messi", r"lebron james", r"michael jordan",
   r"keanu reeves", r"dwayne johnson", r"mr\.? ?beast", r"\bputin\b", r"\bobama\b",
 ],
}
PATTERNS = {k: re.compile('|'.join(v), re.I) for k, v in TERMS.items()}

# Everything actually shipped, indexed by its id8.
shipped = {}
for path in glob.glob(f'{STORE}/**/*.glb', recursive=True):
    base = os.path.basename(path)
    for tok in re.findall(r'[0-9a-f]{8}', base):
        shipped.setdefault(tok, []).append(path)
print('shipped GLBs:', len(glob.glob(f'{STORE}/**/*.glb', recursive=True)), '| distinct id8:', len(shipped))

def strings(node, out):
    if isinstance(node, dict):
        for v in node.values(): strings(v, out)
    elif isinstance(node, list):
        for v in node: strings(v, out)
    elif isinstance(node, str) and len(node) > 3:
        out.append(node)

records = []
for src in SOURCES:
    if not os.path.exists(src):
        continue
    try:
        data = json.load(open(src, encoding='utf-8', errors='replace'))
    except Exception:
        continue
    items = data if isinstance(data, list) else list(data.values()) if isinstance(data, dict) else []
    for it in items:
        blob = []
        strings(it, blob)
        text = ' | '.join(blob)
        ident = ''
        if isinstance(it, dict):
            for key in ('id', 'result_id', 'resultId', 'key', 'file', 'name'):
                if it.get(key):
                    ident = str(it[key]); break
        records.append((ident, text))
print('records scanned:', len(records))

flagged, live = {}, {}
for ident, text in records:
    for cat, pat in PATTERNS.items():
        m = pat.search(text)
        if not m:
            continue
        id8 = (re.match(r'([0-9a-f]{8})', ident) or [None, None])[1] if ident else None
        rec = (cat, m.group(0).strip(), text[:160], id8)
        flagged[ident or text[:40]] = rec
        if id8 and id8 in shipped:
            live[id8] = rec
        break

print(f'\nflagged in the source library: {len(flagged)}')
print(f'OF THOSE, SHIPPED INTO THE STORE: {len(live)}\n')
out = []
for id8, (cat, term, snippet, _) in sorted(live.items(), key=lambda kv: kv[1][0]):
    print(f'[{cat}] {term!r}  id8={id8}')
    for f in shipped[id8][:3]:
        print(f'    file: {f}')
        out.append({'id8': id8, 'cat': cat, 'term': term, 'file': f, 'prompt': snippet})
    print(f'    prompt: {snippet}')
json.dump(out, open('/opt/cryptic-realm/tmp/ip_deep_hits.json', 'w'), indent=1)
print('wrote /opt/cryptic-realm/tmp/ip_deep_hits.json with', len(out), 'file rows')

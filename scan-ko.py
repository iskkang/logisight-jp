import io, os, re

HAN = re.compile(r'[가-힣]')
rows = []
for root, _, files in os.walk('src'):
    for f in files:
        if not f.endswith(('.tsx', '.ts')):
            continue
        p = os.path.join(root, f).replace(os.sep, '/')
        s = io.open(p, encoding='utf-8').read()
        n = 0
        for line in s.split('\n'):
            t = line.strip()
            if t.startswith('//') or t.startswith('*') or t.startswith('/*'):
                continue
            code = re.sub(r'//.*$', '', line)
            if HAN.search(code):
                n += 1
        if n:
            rows.append((n, p))
rows.sort(reverse=True)
out = '\n'.join('%4d  %s' % (n, p) for n, p in rows)
out += '\n\nTOTAL FILES %d  LINES %d' % (len(rows), sum(n for n, _ in rows))
io.open('korean-scan.txt', 'w', encoding='utf-8').write(out)

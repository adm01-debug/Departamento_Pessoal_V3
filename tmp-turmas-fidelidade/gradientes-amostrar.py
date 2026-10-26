"""TEMPORÁRIO — amostra o fundo dos cards renderizados (evita textos/ícones)."""
from PIL import Image
import json
import sys

sufixo = sys.argv[1] if len(sys.argv) > 1 else 'r1'
info = json.load(open(f'tmp-turmas-fidelidade/gradientes-{sufixo}.json', encoding='utf-8'))['info']

PONTOS = [
    ('topo-esq', 0.06, 0.018),
    ('topo-25', 0.25, 0.018),
    ('topo-centro', 0.50, 0.018),
    ('topo-75', 0.75, 0.018),
    ('topo-dir', 0.94, 0.018),
    ('dir-10', 0.985, 0.10),
    ('dir-35', 0.985, 0.35),
    ('dir-60', 0.985, 0.60),
    ('dir-85', 0.985, 0.85),
    ('esq-45', 0.012, 0.45),
    ('esq-65', 0.012, 0.65),
    ('esq-85', 0.012, 0.85),
    ('faixa-tags', 0.50, 0.465),
    ('faixa-funil', 0.50, 0.835),
    ('base-esq', 0.06, 0.985),
    ('base-centro', 0.50, 0.985),
    ('base-dir', 0.94, 0.985),
]

def media(img, nx, ny, raio=2):
    w, h = img.size
    x, y = int(nx * (w - 1)), int(ny * (h - 1))
    px = img.convert('RGB').load()
    cores = []
    for dy in range(-raio, raio + 1):
        for dx in range(-raio, raio + 1):
            xx, yy = min(max(x + dx, 0), w - 1), min(max(y + dy, 0), h - 1)
            cores.append(px[xx, yy])
    return tuple(round(sum(c[i] for c in cores) / len(cores)) for i in range(3))

saida = []
for i, card in enumerate(info):
    img = Image.open(f'tmp-turmas-fidelidade/gradientes-{sufixo}-card-{i}.png')
    amostras = {nome: media(img, nx, ny) for nome, nx, ny in PONTOS}
    saida.append({
        'indice': i,
        'titulo': card['titulo'],
        'familia': card['backgroundImage'][:90],
        'borda': card['border'],
        'sombra': card['shadow'],
        'amostras': {k: '#%02x%02x%02x' % v for k, v in amostras.items()},
    })

print(json.dumps(saida, ensure_ascii=False, indent=2))

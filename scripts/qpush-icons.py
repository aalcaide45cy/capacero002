"""Genera los iconos de Llamadas rápidas (PWA y extensión) y el módulo api/_lib/qpush/icons.js con los PNG en base64.
Uso: python3 scripts/qpush-icons.py   (requiere Pillow)"""
import base64, io, os
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
S = 1024  # lienzo de trabajo (se reduce con suavizado)

def gradient(size):
    img = Image.new('RGB', (size, size))
    px = img.load()
    a, b = (14, 165, 233), (99, 102, 241)  # azul cielo -> índigo, como el panel
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * size)
            px[x, y] = tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))
    return img

def handset(scale):
    """Móvil blanco con ondas de aviso, en un lienzo transparente S x S, ocupando `scale` del lado."""
    layer = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x0, y0, x1, y1 = S * 0.27, S * 0.16, S * 0.64, S * 0.84
    d.rounded_rectangle((x0, y0, x1, y1), radius=int(S * 0.07), fill='white')
    d.rounded_rectangle((x0 + S * 0.04, y0 + S * 0.09, x1 - S * 0.04, y1 - S * 0.12), radius=int(S * 0.03), fill=(40, 90, 220, 255))
    d.ellipse((S * 0.425, y1 - S * 0.095, S * 0.485, y1 - S * 0.035), fill=(40, 90, 220, 255))
    for i, r in enumerate((0.17, 0.26)):
        cx, cy = S * 0.64, S * 0.30
        d.arc((cx - S * r, cy - S * r, cx + S * r, cy + S * r), 285, 355, fill='white', width=int(S * 0.05))
    bbox = layer.getbbox()
    layer = layer.crop(bbox)
    side = int(S * scale)
    layer.thumbnail((side, side), Image.LANCZOS)
    out = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    out.paste(layer, ((S - layer.width) // 2, (S - layer.height) // 2), layer)
    return out

def render(size, kind):
    bg = gradient(S).convert('RGBA')
    if kind == 'rounded':
        mask = Image.new('L', (S, S), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, S - 1, S - 1), radius=int(S * 0.22), fill=255)
        bg.putalpha(mask)
        glyph = handset(0.58)
    elif kind == 'maskable':
        glyph = handset(0.42)  # dentro de la zona segura (80 % central)
    else:  # 'full': sin transparencia (apple-touch-icon)
        glyph = handset(0.58)
    bg.alpha_composite(glyph)
    return bg.resize((size, size), Image.LANCZOS)

def save(img, path):
    full = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    img.save(full, optimize=True)
    return full

ext = {16: 'rounded', 48: 'rounded', 128: 'rounded'}
for s, k in ext.items():
    save(render(s, k), f'chrome-extension/icons/icon{s}.png')

pwa = {
    'icon-192.png': (192, 'rounded'),
    'icon-512.png': (512, 'rounded'),
    'icon-maskable-512.png': (512, 'maskable'),
    'apple-touch-icon.png': (180, 'full'),
}
b64 = {}
for name, (s, k) in pwa.items():
    img = render(s, k)
    buf = io.BytesIO()
    img.convert('RGBA' if k == 'rounded' else 'RGB').save(buf, 'PNG', optimize=True)
    b64[name] = base64.b64encode(buf.getvalue()).decode()

js = ['// Generado por scripts/qpush-icons.py. No editar a mano.', 'export const ICONS = {']
for name, data in b64.items():
    js.append(f"  '{name}': '{data}',")
js.append('};')
with open(os.path.join(ROOT, 'api/_lib/qpush/icons.js'), 'w') as f:
    f.write('\n'.join(js) + '\n')
print({k: len(v) for k, v in b64.items()})

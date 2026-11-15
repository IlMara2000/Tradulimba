"""Genera i PNG del logo TraduLimba partendo dalle stesse forme dell'SVG.

Usa solo PIL (Pillow). Esegui con:
    python3 scripts/generate-icons.py
oppure tramite il package.json "icon:generate".
"""

import sys
from PIL import Image, ImageDraw, ImageFont

COLORS = {
    'bg': (238, 240, 242, 255),
    'stroke': (255, 255, 255, 255),
    'body': (23, 56, 75, 255),
    'green': (75, 119, 33, 255),
    'amber': (244, 170, 10, 255),
    'orange': (245, 130, 20, 255),
    'blue': (42, 102, 132, 255),
    'text_dark': (90, 107, 116, 255),
}

SIZES = [
    ('favicon-96x96.png', 96),
    ('web-app-manifest-192x192.png', 192),
    ('web-app-manifest-512x512.png', 512),
    ('apple-touch-icon.png', 180),
]


def _font(size, bold=False):
    candidates = [
        '/Users/danielemarangoni/Library/Fonts/Ubuntu-BoldItalic.ttf' if bold else '/Users/danielemarangoni/Library/Fonts/Ubuntu-Italic.ttf',
        '/System/Library/Fonts/Helvetica.ttc',
        '/System/Library/Fonts/HelveticaNeue.ttc',
        '/Library/Fonts/Arial.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except (OSError, IOError):
            continue
    return ImageFont.load_default()


def draw_logo(size, out_path, social=False):
    if social:
        W, H = 1200, 630
        scale = 1200 / 128.0  # stessa base vettoriale 128, adattata al card
        im = Image.new('RGBA', (W, H), COLORS['bg'])
        draw = ImageDraw.Draw(im)
    else:
        scale = size / 128.0
        im = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(im)

    def s(v):
        return int(round(v * scale))

    x, y, w, h = s(22), s(18), s(84), s(84)
    r = s(16)
    draw.rounded_rectangle([x, y, x + w, y + h], radius=r,
                           fill=COLORS['bg'], outline=COLORS['stroke'], width=s(3))

    bars = [
        (s(34), s(64), s(7), s(22), COLORS['green']),
        (s(48), s(52), s(7), s(34), COLORS['amber']),
        (s(62), s(64), s(7), s(22), COLORS['orange']),
        (s(76), s(52), s(7), s(34), COLORS['blue']),
    ]
    for bx, by, bw, bh, color in bars:
        draw.rounded_rectangle([bx, by, bx + bw, by + bh], radius=s(3.5), fill=color)

    draw.ellipse([s(96) - s(5), s(40) - s(5), s(96) + s(5), s(40) + s(5)],
                 fill=COLORS['orange'])

    if social:
        # Card 1200x630: logo compatto centrato, testo sotto
        logo_size = 240
        logo_x = (W - logo_size) // 2
        logo_y = 40
        x, y, w, h = logo_x, logo_y, logo_size, logo_size
        r = 30
        draw.rounded_rectangle([x, y, x + w, y + h], radius=r,
                               fill=COLORS['bg'], outline=COLORS['stroke'], width=6)
        bars = [
            (x + 45, y + 175, 28, 85, COLORS['green']),
            (x + 98, y + 125, 28, 135, COLORS['amber']),
            (x + 151, y + 175, 28, 85, COLORS['orange']),
            (x + 204, y + 125, 28, 135, COLORS['blue']),
        ]
        for bx, by, bw, bh, color in bars:
            draw.rounded_rectangle([bx, by, bx + bw, by + bh], radius=14, fill=color)
        draw.ellipse([x + 280 - 20, y + 85 - 20,
                      x + 280 + 20, y + 85 + 20], fill=COLORS['orange'])

        font = _font(64, bold=True)
        draw.text((W // 2, logo_y + logo_size + 24), 'TraduLimba',
                  fill=COLORS['body'], font=font, anchor='mt')
        font2 = _font(32)
        draw.text((W // 2, logo_y + logo_size + 86),
                  'Il sardo, in tutte le sue voci.',
                  fill=COLORS['text_dark'], font=font2, anchor='mt')

    im.save(out_path, 'PNG')
    print(f'wrote {out_path} {im.size}')


def main():
    for name, size in SIZES:
        draw_logo(size, f'public/{name}')
    draw_logo(0, 'public/tradulimba-social.png', social=True)


if __name__ == '__main__':
    sys.exit(main())
"""Genera le icone TraduLimba a partire dai due SVG del marchio.

Le fonti sono due file, non coordinate sparse nel codice:

- public/favicon.svg, il disegno completo, rasterizzato a 1024 px. Lo script
  misura nell'immagine il fondo, la nuvoletta con la coda e le barre, e da
  quelle misure ricava le taglie grandi e le proporzioni della card social.
- public/favicon-small.svg, il disegno ottico per 16 e 32 px: barre più alte,
  punto omesso, griglia intera. I frame 16 e 32 dell'ICO sono il raster diretto
  di quel file, senza ricalcolare la geometria.

    python3 scripts/generate-icons.py
    npm run icon:generate

Rasterizzatori provati in ordine: rsvg-convert, resvg, inkscape, ImageMagick,
QuickLook (macOS).
"""

import os
import re
import shutil
import subprocess
import sys
import tempfile
from collections import deque

from PIL import Image, ImageChops, ImageDraw, ImageFont

SVG = 'public/favicon.svg'
SVG_SMALL = 'public/favicon-small.svg'
RENDER_SIZE = 1024
SMALL_RENDER_SIZE = 512

SIZES = [
    ('favicon-96x96.png', 96),
    ('web-app-manifest-192x192.png', 192),
    ('web-app-manifest-512x512.png', 512),
    ('apple-touch-icon.png', 180),
]

ICO_FRAMES = [16, 32, 48, 64]

TITLE_COLOUR = (0x17, 0x38, 0x4B)
SUBTITLE_COLOUR = (0x5A, 0x6B, 0x74)


# ---------------------------------------------------------------- rasterizzare

def _raster_commands(svg, size, out_path, tmp_dir):
    return (
        ('rsvg-convert', ['-w', str(size), '-h', str(size), svg, '-o', out_path]),
        ('resvg', ['--width', str(size), '--height', str(size), svg, out_path]),
        ('inkscape', ['--export-type=png', f'--export-filename={out_path}',
                      f'--export-width={size}', svg]),
        ('magick', [svg, '-background', 'none', '-resize', f'{size}x{size}', out_path]),
        ('qlmanage', ['-t', '-s', str(size), '-o', tmp_dir, svg]),
    )


def _sized_svg(svg, size, out_dir):
    """Copia temporanea con width/height = `size`.

    Serve per QuickLook, che disegna l'SVG alla sua dimensione intrinseca: con un
    viewBox piccolo lascierebbe il disegno in un angolo di un riquadro bianco
    invece di riempire la taglia richiesta.
    """
    text = open(svg, encoding='utf-8').read()

    def fix(match):
        tag = re.sub(r'\s(width|height)="[^"]*"', '', match.group(0))
        tag = tag[:-1].rstrip()
        tag = tag[:-1] if tag.endswith('/') else tag
        return f'{tag.rstrip()} width="{size}" height="{size}">'

    sized = re.sub(r'<svg\b[^>]*>', fix, text, count=1)
    path = os.path.join(out_dir, 'render-' + str(size) + '.svg')
    with open(path, 'w', encoding='utf-8') as handle:
        handle.write(sized)
    return path


def rasterize(size=RENDER_SIZE, svg=SVG):
    """Rende `svg` a `size` px quadrati con il primo strumento disponibile."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        out_path = os.path.join(tmp_dir, 'render.png')
        sized = _sized_svg(svg, size, tmp_dir)
        for tool, args in _raster_commands(sized, size, out_path, tmp_dir):
            if not shutil.which(tool):
                continue
            if tool == 'qlmanage':
                produced = os.path.join(tmp_dir, os.path.basename(sized) + '.png')
            else:
                produced = out_path
            try:
                subprocess.run([tool] + args, check=True, timeout=120,
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            except (subprocess.SubprocessError, OSError):
                continue
            if not os.path.exists(produced):
                continue

            with Image.open(produced) as rendered:
                image = rendered.convert('RGBA')
            if image.size != (size, size):
                image = image.resize((size, size), Image.LANCZOS)
            return image, tool

    raise SystemExit(
        'Nessun rasterizzatore SVG disponibile: installa rsvg-convert, resvg, '
        'inkscape o ImageMagick (su macOS basta QuickLook).'
    )


# ------------------------------------------------------------------- misurare

def _mask_for(image, colour):
    r, g, b = image.split()
    return ImageChops.multiply(
        ImageChops.multiply(
            r.point(lambda v, c=colour[0]: 255 if v == c else 0),
            g.point(lambda v, c=colour[1]: 255 if v == c else 0),
        ),
        b.point(lambda v, c=colour[2]: 255 if v == c else 0),
    )


def _components(mask, box, min_area=8):
    """Componenti connesse (4-vicini) dentro il riquadro, come bbox assolute."""
    x0, y0, x1, y1 = box
    crop = mask.crop(box)
    width, height = crop.size
    pixels = crop.load()
    seen = [[False] * width for _ in range(height)]
    found = []

    for row in range(height):
        for column in range(width):
            if seen[row][column] or pixels[column, row] == 0:
                continue
            queue = deque([(column, row)])
            seen[row][column] = True
            area = 0
            left, right, top, bottom = column, column, row, row

            while queue:
                cx, cy = queue.popleft()
                area += 1
                left = min(left, cx)
                right = max(right, cx)
                top = min(top, cy)
                bottom = max(bottom, cy)
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < width and 0 <= ny < height \
                            and not seen[ny][nx] and pixels[nx, ny]:
                        seen[ny][nx] = True
                        queue.append((nx, ny))

            if area >= min_area:
                found.append((left + x0, top + y0, right + 1 + x0, bottom + 1 + y0))

    return found


def _row_widths(mask, box):
    """Larghezza del riempimento per ogni riga del riquadro."""
    widths = []
    x0, y0, x1, y1 = box
    for row in range(y0, y1):
        row_box = mask.crop((x0, row, x1, row + 1)).getbbox()
        widths.append((row, 0 if not row_box else row_box[2] - row_box[0]))
    return widths


def analyse(rendered):
    """Legge dal render fondo, nuvoletta, coda, barre e punto."""
    image = rendered.convert('RGB')
    total = image.size[0] * image.size[1]
    counted = sorted(image.getcolors(total), key=lambda item: item[0], reverse=True)
    if not counted or counted[0][0] < total * 0.2:
        raise SystemExit('Il render non ha un fondo dominante: SVG inatteso.')

    background = counted[0][1]
    palette = [colour for _, colour in counted if colour != background]

    def luminance(colour):
        return sum(colour) / 3

    bubbles = [colour for colour in palette if luminance(colour) > 200]
    if not bubbles:
        raise SystemExit('Il render non contiene la nuvoletta chiara.')
    bubble = max(bubbles, key=lambda colour: dict(counted).get(colour, 0))

    accents = [colour for colour in palette if colour != bubble]
    bubble_mask = _mask_for(image, bubble)
    bubble_box = bubble_mask.getbbox()
    if not bubble_box:
        raise SystemExit('Il render non contiene la nuvoletta.')

    bars = []
    dot = None
    for colour in accents:
        mask = _mask_for(image, colour)
        box = mask.getbbox()
        if not box:
            continue
        for part in _components(mask, box):
            left, top, right, bottom = part
            width, height = right - left, bottom - top
            if height > width * 1.4:
                bars.append({'left': left, 'top': top, 'right': right,
                             'bottom': bottom, 'colour': colour})
            else:
                dot = {'left': left, 'top': top, 'right': right,
                       'bottom': bottom, 'colour': colour}

    if len(bars) < 2:
        raise SystemExit('Il render non contiene le barre del marchio.')

    bars.sort(key=lambda bar: bar['left'])

    widths = _row_widths(bubble_mask, bubble_box)
    full_width = max(width for _, width in widths) or 1
    body_bottom = max(row for row, width in widths if width >= full_width * 0.5)
    tail_rows = [(row, width) for row, width in widths if row > body_bottom and width]
    tail = None
    if tail_rows:
        tail_top = min(row for row, _ in tail_rows)
        tail_bottom = max(row for row, _ in tail_rows)
        tail_x = bubble_mask.crop(
            (bubble_box[0], tail_top, bubble_box[2], tail_bottom + 1)
        ).getbbox()
        if tail_x:
            tail = {
                'left': tail_x[0] + bubble_box[0],
                'bottom': tail_bottom,
                'right': tail_x[2] + bubble_box[0],
            }

    # Raggio degli angoli: quanto la prima riga è più stretta del corpo.
    top_row_width = max(width for row, width in widths if row <= bubble_box[1] + 1)
    radius = max(0.0, (full_width - top_row_width) / 2)

    return {
        'size': image.size[0],
        'background': background,
        'bubble': bubble,
        'bubble_box': bubble_box,
        'radius': radius,
        'tail': tail,
        'bars': bars,
        'dot': dot,
        'body_bottom': body_bottom,
    }


# ------------------------------------------------------------------- disegnare

def render_small(size):
    """Frame 16/32: raster del disegno ottico, nessuna geometria ricalcolata.

    Si rasterizza a SMALL_RENDER_SIZE e si scende di un fattore intero con NEAREST:
    la griglia del piccolo SVG è fatta di unità intere, quindi ogni pixel finale
    resta un colore pieno del disegno e i bordi non si sfumano. Rasterizzare
    QuickLook direttamente a 16 px lascerebbe il disegno in un angolo bianco.
    """
    if SMALL_RENDER_SIZE % size:
        raise SystemExit(f'{SMALL_RENDER_SIZE} non è un multiplo di {size}: scala non intera')
    master, _tool = rasterize(SMALL_RENDER_SIZE, SVG_SMALL)
    return master.convert('RGB').resize((size, size), Image.NEAREST)


def render_detailed(master, model, size):
    """Disegno completo: il render dell'SVG ridotto alla taglia richiesta."""
    if size >= model['size']:
        return master.convert('RGB')
    return master.convert('RGB').resize((size, size), Image.LANCZOS)


# ------------------------------------------------------------------ card social

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


def draw_social(master, model, out_path):
    width, height = 1200, 630
    card = Image.new('RGB', (width, height), model['background'])
    logo_size = 240
    logo_y = 40
    logo = master.convert('RGB').resize((logo_size, logo_size), Image.LANCZOS)
    card.paste(logo, ((width - logo_size) // 2, logo_y))

    draw = ImageDraw.Draw(card)
    # Colori di brand fissi: il titolo e il payoff non seguono il fondo, che
    # può cambiare senza che il testo diventi grigio.
    draw.text((width // 2, logo_y + logo_size + 24), 'TraduLimba',
              fill=TITLE_COLOUR, font=_font(64, bold=True), anchor='mt')
    draw.text((width // 2, logo_y + logo_size + 86),
              'Il sardo, in tutte le sue voci.',
              fill=SUBTITLE_COLOUR, font=_font(32), anchor='mt')
    card.save(out_path, 'PNG')
    print(f'wrote {out_path} {card.size}')


# ----------------------------------------------------------------------- main

def main():
    rendered, tool = rasterize()
    print(f'render {rendered.size[0]}px con {tool}')
    model = analyse(rendered)
    master = render_detailed(rendered, model, model['size'])
    master.save('public/icona-1024.png', 'PNG', optimize=True)
    print(f"wrote public/icona-1024.png {master.size}")

    for name, size in SIZES:
        render_detailed(rendered, model, size).save(f'public/{name}', 'PNG', optimize=True)
        print(f'wrote public/{name} {size}x{size}')

    frames = {}
    for size in ICO_FRAMES:
        frames[size] = render_small(size) if size <= 32 \
            else render_detailed(rendered, model, size)
    print('frame ' + '/'.join(str(size) for size in ICO_FRAMES if size <= 32)
          + ' da ' + SVG_SMALL)

    ico_path = 'public/favicon.ico'
    try:
        frames[64].save(ico_path, sizes=[(s, s) for s in ICO_FRAMES],
                        append_images=[frames[s] for s in ICO_FRAMES if s != 64])
    except (TypeError, ValueError):
        master.save(ico_path, sizes=[(s, s) for s in ICO_FRAMES])
        print('nota: Pillow non accetta frame dedicati, ico ridotto dal render')
    print('wrote public/favicon.ico ' + '/'.join(str(size) for size in ICO_FRAMES))

    draw_social(rendered, model, 'public/tradulimba-social.png')


if __name__ == '__main__':
    sys.exit(main())

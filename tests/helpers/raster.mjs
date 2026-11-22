// Aiuti per confrontare le icone con l'SVG che le ha generate.
//
// Serve un rasterizzatore SVG (lo stesso che usa scripts/generate-icons.py) e un
// decoder PNG: qui non ci sono dipendenze, il PNG si scompatta con zlib.
//
// Il raster dell'SVG passa per la stessa strada del generatore: copia con
// width/height uguali alla taglia voluta (QuickLook altrimenti disegna l'SVG
// alla sua dimensione intrinseca) e nessuna riscalatura, così il confronto è
// pixel su pixel.

import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import { inflateSync } from 'node:zlib'

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

const CHANNELS_BY_COLOUR_TYPE = { 0: 1, 2: 3, 4: 2, 6: 4 }

/** Primo rasterizzatore SVG presente nel PATH, o null. */
export const findRasterizer = () => {
  const path = (process.env.PATH || '').split(delimiter).filter(Boolean)
  for (const tool of ['rsvg-convert', 'resvg', 'inkscape', 'magick', 'qlmanage']) {
    if (path.some((directory) => existsSync(join(directory, tool)))) return tool
  }
  return null
}

/** Scompatta un PNG a 8 bit in RGB(A), applicando i filtri per riga. */
export const decodePng = (buffer) => {
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error('non è un PNG')

  let offset = 8
  let width = 0
  let height = 0
  let interlace = 0
  let channels = 0
  const parts = []

  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.toString('ascii', offset + 4, offset + 8)
    const data = buffer.subarray(offset + 8, offset + 8 + length)

    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      const bitDepth = data[8]
      const colourType = data[9]
      interlace = data[12]
      channels = CHANNELS_BY_COLOUR_TYPE[colourType]
      if (bitDepth !== 8) throw new Error(`PNG a ${bitDepth} bit: atteso 8`)
      if (!channels) throw new Error(`tipo di colore PNG ${colourType} non gestito`)
    } else if (type === 'IDAT') {
      parts.push(data)
    } else if (type === 'IEND') {
      break
    }

    offset += 12 + length
  }

  if (interlace) throw new Error('PNG interlacciato non gestito')

  const raw = inflateSync(Buffer.concat(parts))
  const stride = width * channels
  const pixels = Buffer.alloc(height * stride)

  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)]
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
    const out = pixels.subarray(y * stride, (y + 1) * stride)
    const previous = y > 0 ? pixels.subarray((y - 1) * stride, y * stride) : null

    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? out[x - channels] : 0
      const up = previous ? previous[x] : 0
      const upLeft = previous && x >= channels ? previous[x - channels] : 0
      let value = line[x]

      if (filter === 1) value += left
      else if (filter === 2) value += up
      else if (filter === 3) value += (left + up) >> 1
      else if (filter === 4) {
        const estimate = left + up - upLeft
        const toLeft = Math.abs(estimate - left)
        const toUp = Math.abs(estimate - up)
        const toUpLeft = Math.abs(estimate - upLeft)
        value += toLeft <= toUp && toLeft <= toUpLeft ? left : toUp <= toUpLeft ? up : upLeft
      } else if (filter !== 0) throw new Error(`filtro PNG ${filter} non gestito`)

      out[x] = value & 0xff
    }
  }

  return { width, height, channels, pixels }
}

/** Voce RGB del pixel (x, y) di un'immagine decodificata. */
export const pixelAt = (image, x, y) => {
  const start = (y * image.width + x) * image.channels
  return [image.pixels[start], image.pixels[start + 1], image.pixels[start + 2]]
}

/** Rasterizza `svgPath` a `size` px quadrati con il primo rasterizzatore utile. */
export const rasterizeSvg = (svgPath, size) => {
  const tool = findRasterizer()
  if (!tool) throw new Error('nessun rasterizzatore SVG disponibile')

  const directory = mkdtempSync(join(tmpdir(), 'tradulimba-raster-'))

  try {
    const scaled = join(directory, `render-${size}.svg`)
    const text = readFileSync(svgPath, 'utf8').replace(/<svg\b[^>]*>/u, (tag) => {
      const cleaned = tag.replace(/\s(width|height)="[^"]*"/gu, '')
      const body = cleaned.slice(0, -1).trim().replace(/\/$/u, '')
      return `${body} width="${size}" height="${size}">`
    })
    writeFileSync(scaled, text)

    const out = join(directory, 'render.png')
    const commands = {
      'rsvg-convert': ['-w', `${size}`, '-h', `${size}`, scaled, '-o', out],
      resvg: ['--width', `${size}`, '--height', `${size}`, scaled, out],
      inkscape: ['--export-type=png', `--export-filename=${out}`, `--export-width=${size}`, scaled],
      magick: [scaled, '-background', 'none', '-resize', `${size}x${size}`, out],
      qlmanage: ['-t', '-s', `${size}`, '-o', directory, scaled],
    }
    const produced = tool === 'qlmanage' ? join(directory, 'render-512.svg.png') : out

    execFileSync(tool, commands[tool], { stdio: 'ignore', timeout: 120_000 })
    return decodePng(readFileSync(produced))
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

/**
 * Riduzione a scalini interi: ogni pixel finale prende il pixel sorgente al
 * centro del suo blocco, come la NEAREST che usa il generatore.
 */
export const downsampleNearest = (image, size) => {
  if (image.width % size !== 0) throw new Error(`${image.width} non è multiplo di ${size}`)
  const factor = image.width / size
  const pixels = Buffer.alloc(size * size * 3)

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const sourceX = Math.min(image.width - 1, Math.floor((x + 0.5) * factor))
      const sourceY = Math.min(image.height - 1, Math.floor((y + 0.5) * factor))
      const [r, g, b] = pixelAt(image, sourceX, sourceY)
      const target = (y * size + x) * 3
      pixels[target] = r
      pixels[target + 1] = g
      pixels[target + 2] = b
    }
  }

  return { width: size, height: size, channels: 3, pixels }
}

/** Elenca i frame di un ICO: taglia dichiarata e PNG incorporato. */
export const readIcoFrames = (buffer) => {
  const count = buffer.readUInt16LE(4)
  const frames = []

  for (let index = 0; index < count; index += 1) {
    const entry = 6 + index * 16
    const size = buffer[entry] || 256
    const bytes = buffer.readUInt32LE(entry + 8)
    const offset = buffer.readUInt32LE(entry + 12)
    frames.push({ size, png: buffer.subarray(offset, offset + bytes) })
  }

  return frames
}

/** Pixel diversi fra due immagini delle stesse dimensioni. */
export const comparePixels = (left, right) => {
  const differences = []
  for (let y = 0; y < left.height; y += 1) {
    for (let x = 0; x < left.width; x += 1) {
      const a = pixelAt(left, x, y)
      const b = pixelAt(right, x, y)
      if (a[0] !== b[0] || a[1] !== b[1] || a[2] !== b[2]) differences.push({ x, y, expected: a, found: b })
    }
  }
  return differences
}

import type { AktaBlock } from './types'

// ─── Regex patterns ──────────────────────────────────────────────────────────

/** ---Pasal N--- or full dash-line with "Pasal N" in center */
const PASAL_RE = /^-{2,}\s*pasal\s+(\d+)\s*-{2,}$/i

/** full dash-line with "DEMIKIANLAH AKTA INI" in center */
const PENUTUP_RE = /^-{2,}\s*demikianlah\s+akta\s+ini\s*-{2,}/i

/** "Nomor: 94" or "Nomor : 94" */
const NOMOR_RE = /^nomor\s*:\s*.+$/i

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isAllCaps(line: string): boolean {
  const letters = line.replace(/[^a-zA-Z]/g, '')
  return letters.length > 2 && letters === letters.toUpperCase()
}

// ─── Parser ──────────────────────────────────────────────────────────────────

/**
 * Convert plain akta text (KontenTemplate with optional {{KEY}} placeholders)
 * into AktaBlock[] for rendering by AktaViewer.
 *
 * Detection rules (in priority order):
 * 1. \f character          → pagebreak
 * 2. ---Pasal N---         → pasal
 * 3. ---DEMIKIANLAH...---  → penutup
 * 4. "Nomor: X"            → nomor
 * 5. ALL CAPS, no dash     → judul
 * 6. Starts with "-"       → paragraf
 * 7. Everything else       → paragraf
 */
/**
 * Convert AktaBlock[] back to plain text (inverse of parseRawText).
 * Used when editing blocks and need to propagate changes back to raw text.
 */
export function blocksToText(blocks: AktaBlock[]): string {
  return blocks
    .map((b) => {
      switch (b.type) {
        case 'judul':    return b.text
        case 'nomor':    return b.text
        case 'paragraf': return b.text
        case 'pasal':    return `---Pasal ${b.number}---`
        case 'penutup':  return '---DEMIKIANLAH AKTA INI---'
        case 'pagebreak': return '\f'
        case 'blank':    return ''
        default:         return ''
      }
    })
    .join('\n')
}

export function parseRawText(raw: string): AktaBlock[] {
  if (!raw?.trim()) return []

  const blocks: AktaBlock[] = []

  // Split on form-feed to handle page breaks
  const pages = raw.split('\f')

  pages.forEach((page, pageIdx) => {
    if (pageIdx > 0) {
      blocks.push({ type: 'pagebreak' })
    }

    const lines = page.split('\n')

    for (const line of lines) {
      const trimmed = line.trim()

      // Blank line
      if (!trimmed) {
        // Only add blank if previous block isn't already blank/pagebreak
        const last = blocks[blocks.length - 1]
        if (last && last.type !== 'blank' && last.type !== 'pagebreak') {
          blocks.push({ type: 'blank' })
        }
        continue
      }

      // Pasal separator
      const pasalMatch = trimmed.match(PASAL_RE)
      if (pasalMatch) {
        blocks.push({ type: 'pasal', number: parseInt(pasalMatch[1], 10) })
        continue
      }

      // Penutup
      if (PENUTUP_RE.test(trimmed)) {
        blocks.push({ type: 'penutup' })
        continue
      }

      // Nomor akta (line like "Nomor: 94")
      if (NOMOR_RE.test(trimmed)) {
        blocks.push({ type: 'nomor', text: trimmed })
        continue
      }

      // Judul — ALL CAPS line, no leading dash, not too long
      if (
        isAllCaps(trimmed) &&
        !trimmed.startsWith('-') &&
        trimmed.length < 150
      ) {
        blocks.push({ type: 'judul', text: trimmed })
        continue
      }

      // Default: paragraf
      blocks.push({ type: 'paragraf', text: trimmed })
    }
  })

  return blocks
}

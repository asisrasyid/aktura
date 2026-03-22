import { useMemo } from 'react'
import type { AktaBlock, TtdLayout } from './types'
import { DEFAULT_TTD_LAYOUT } from './types'
import { parseRawText } from './parser'
import TtdDropZone from './TtdDropZone'

// ─── Constants ───────────────────────────────────────────────────────────────

/** Folio/F4: 215mm × 330mm */
const FOLIO_W = '215mm'
const FOLIO_H = '330mm'

/** Total chars per line (Courier New 12pt, Folio margins 4/3 cm) */
const LINE_CHARS = 68

// ─── Line generators ─────────────────────────────────────────────────────────

function makePasalLine(n: number): string {
  const label = ` Pasal ${n} `
  const dashes = Math.max(0, LINE_CHARS - label.length)
  const left = Math.floor(dashes / 2)
  return '-'.repeat(left) + label + '-'.repeat(dashes - left)
}

function makePenutupLine(): string {
  const label = ' DEMIKIANLAH AKTA INI '
  const dashes = Math.max(0, LINE_CHARS - label.length)
  const left = Math.floor(dashes / 2)
  return '-'.repeat(left) + label + '-'.repeat(dashes - left)
}

// ─── Placeholder highlight ────────────────────────────────────────────────────

function renderText(text: string): React.ReactNode {
  const parts = text.split(/({{[^}]+}})/g)
  return (
    <>
      {parts.map((part, i) =>
        /^{{[^}]+}}$/.test(part) ? (
          <span
            key={i}
            style={{
              background: '#fff3cd',
              color: '#856404',
              borderRadius: 2,
              padding: '0 2px',
              fontSize: 'inherit',
            }}
          >
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  )
}

// ─── Block renderer ──────────────────────────────────────────────────────────

function Block({ block, idx }: { block: AktaBlock; idx: number }) {
  switch (block.type) {
    case 'judul':
      return (
        <div
          key={idx}
          style={{
            textAlign: 'center',
            letterSpacing: '0.35em',
            fontWeight: 'normal',
            lineHeight: 1.5,
            marginBottom: 0,
          }}
        >
          {renderText(block.text)}
        </div>
      )

    case 'nomor':
      return (
        <div key={idx} style={{ textAlign: 'center', marginBottom: '10pt' }}>
          {renderText(block.text)}
        </div>
      )

    case 'pasal':
      return (
        <div
          key={idx}
          style={{
            textAlign: 'center',
            margin: '10pt 0',
            whiteSpace: 'pre',
            overflow: 'hidden',
            fontFamily: '"Courier New", Courier, monospace',
          }}
        >
          {makePasalLine(block.number)}
        </div>
      )

    case 'penutup':
      return (
        <div
          key={idx}
          style={{
            textAlign: 'center',
            margin: '10pt 0',
            whiteSpace: 'pre',
            overflow: 'hidden',
            fontFamily: '"Courier New", Courier, monospace',
          }}
        >
          {makePenutupLine()}
        </div>
      )

    case 'pagebreak':
      return (
        <div
          key={idx}
          style={{
            margin: '20pt 0',
            borderTop: '2px dashed #ccc',
            position: 'relative',
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: -9,
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#fff',
              padding: '0 10px',
              fontSize: '8pt',
              color: '#aaa',
              whiteSpace: 'nowrap',
            }}
          >
            — halaman baru —
          </span>
        </div>
      )

    case 'blank':
      return <div key={idx} style={{ height: '7pt' }} />

    case 'paragraf':
    default:
      return (
        <div
          key={idx}
          style={{
            textAlign: 'justify',
            marginBottom: '1.5pt',
            lineHeight: 1.5,
          }}
        >
          {renderText((block as { type: string; text: string }).text ?? '')}
        </div>
      )
  }
}

// ─── AktaViewer ──────────────────────────────────────────────────────────────

interface AktaViewerProps {
  /** Raw akta text (KontenTemplate, may contain {{KEY}} placeholders) */
  text: string
  /** TTD layout — if omitted, DEFAULT_TTD_LAYOUT is used */
  ttdLayout?: TtdLayout
  /** Called when user changes TTD layout in edit mode */
  onTtdChange?: (layout: TtdLayout) => void
  /** If true, TTD area is not editable and no drag handles shown */
  readOnly?: boolean
}

export default function AktaViewer({
  text,
  ttdLayout,
  onTtdChange,
  readOnly = true,
}: AktaViewerProps) {
  const blocks  = useMemo(() => parseRawText(text), [text])
  const layout  = ttdLayout ?? DEFAULT_TTD_LAYOUT
  const isEmpty = !text?.trim()

  return (
    <div
      style={{
        background: '#d8d8d8',
        padding: '24px 16px',
        minHeight: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
      }}
    >
      {/* Folio/F4 page */}
      <div
        style={{
          width: FOLIO_W,
          minHeight: FOLIO_H,
          background: '#fff',
          // left 4cm, right 3cm, top 3cm, bottom 3cm
          padding: '30mm 30mm 30mm 40mm',
          boxShadow: '0 4px 20px rgba(0,0,0,0.22)',
          fontFamily: '"Courier New", Courier, monospace',
          fontSize: '12pt',
          lineHeight: 1.5,
          color: '#000',
          boxSizing: 'border-box',
        }}
      >
        {isEmpty ? (
          <div
            style={{
              color: '#bbb',
              fontStyle: 'italic',
              fontFamily: 'Inter, sans-serif',
              fontSize: '11pt',
              textAlign: 'center',
              marginTop: 60,
            }}
          >
            Preview akta akan tampil di sini setelah template memiliki konten.
          </div>
        ) : (
          <>
            {blocks.map((block, idx) => (
              <Block key={idx} block={block} idx={idx} />
            ))}

            {/* TTD section */}
            <div style={{ marginTop: '24pt' }}>
              <TtdDropZone
                layout={layout}
                onChange={onTtdChange}
                readOnly={readOnly}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

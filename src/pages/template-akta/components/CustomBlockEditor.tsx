/**
 * CustomBlockEditor — pengganti BlockNote.
 * contentEditable sederhana bergaya dokumen legal.
 * Interface identik dengan BlockNoteEditor agar drop-in replacement di TemplateAktaEditor.
 */
import { useRef, useEffect, useCallback } from 'react';

interface Props {
  initialText?: string;
  onChange: (json: string, plainText: string) => void;
  onSelectionMark: (selectedText: string) => void;
}

/** Konversi plain text ke plain text (backward compat — dulunya JSON blocks) */
export function blocksToText(input: unknown): string {
  if (typeof input === 'string') return input;
  // Jika masih format BlockNote JSON lama: [{type:'paragraph', content:[{text:'...'}]}]
  if (Array.isArray(input)) {
    return (input as { content?: { text?: string }[] }[])
      .map(block =>
        (block.content ?? []).map(c => c.text ?? '').join(''),
      )
      .join('\n\n');
  }
  return '';
}

export default function CustomBlockEditor({ initialText, onChange, onSelectionMark }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const suppressRef = useRef(false); // hindari re-trigger onChange saat set initialText

  // ── Set konten awal ──────────────────────────────────────────
  useEffect(() => {
    const el = editorRef.current;
    if (!el || initialText === undefined) return;
    suppressRef.current = true;
    // Preserve cursor jika sudah ada konten
    if (el.innerText !== initialText) {
      // Bersihkan dan isi ulang
      el.innerHTML = '';
      const lines = initialText.split('\n');
      lines.forEach((line, i) => {
        const p = document.createElement('p');
        p.style.margin = '8px 0';
        p.style.minHeight = '1.5em';
        if (line.trim() === '') {
          p.innerHTML = '<br>';
        } else {
          p.textContent = line;
        }
        el.appendChild(p);
        if (i < lines.length - 1 && line === '' && lines[i + 1] === '') return; // skip double blank
      });
    }
    // Langsung emit current state
    const plainText = el.innerText;
    onChange(plainText, plainText);
    suppressRef.current = false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialText]);

  // ── Input handler ────────────────────────────────────────────
  const handleInput = useCallback(() => {
    if (suppressRef.current) return;
    const el = editorRef.current;
    if (!el) return;
    const plainText = el.innerText;
    onChange(plainText, plainText);
  }, [onChange]);

  // ── Selection handler ────────────────────────────────────────
  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    const text = sel?.toString().trim();
    if (!text) return;
    onSelectionMark(text);
  }, [onSelectionMark]);

  // ── Paste: strip HTML, hanya plain text ─────────────────────
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }, []);

  // ── Enter key: pastikan selalu bikin <p> baru ─────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      document.execCommand('insertParagraph');
    }
  }, []);

  return (
    <div style={{ background: '#F7F7F5', minHeight: '100%', padding: '24px 0 48px' }}>
      {/* Hint bar */}
      <div style={{
        maxWidth: 860, margin: '0 auto 0', padding: '0 0 6px',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{
          fontSize: 10.5, color: '#9CA3AF', fontStyle: 'italic',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}>
          Edit langsung · sorot teks untuk menandai placeholder
        </span>
      </div>

      {/* A4 Paper */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onMouseUp={handleMouseUp}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        style={{
          fontFamily: '"Times New Roman", Georgia, serif',
          fontSize: 14,
          lineHeight: 1.9,
          padding: '80px 96px',
          background: '#fff',
          maxWidth: 860,
          margin: '0 auto',
          minHeight: 720,
          outline: 'none',
          cursor: 'text',
          borderRadius: 4,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 6px 28px rgba(0,0,0,0.07)',
          color: '#2F2F2F',
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
        }}
        data-placeholder="Teks akta tampil di sini. Klik untuk mengedit..."
      />

      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #C0BFBE;
          font-style: italic;
          pointer-events: none;
        }
        [contenteditable] p { margin: 8px 0; min-height: 1.5em; }
        [contenteditable]:focus { box-shadow: 0 1px 4px rgba(0,0,0,0.04), 0 6px 28px rgba(0,0,0,0.10); }
      `}</style>
    </div>
  );
}

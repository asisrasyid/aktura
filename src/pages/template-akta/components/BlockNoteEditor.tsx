import { useCallback } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import type { Block, PartialBlock } from '@blocknote/core';

// ── helpers ─────────────────────────────────────────────────────────────────

/** Ubah plain text (paragraf dipisah \n\n) → PartialBlock[] */
export function textToBlocks(text: string): PartialBlock[] {
  const paras = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  if (paras.length === 0) return [{ type: 'paragraph', content: [] }];
  return paras.map((p) => ({
    type: 'paragraph' as const,
    content: [{ type: 'text', text: p, styles: {} }],
  }));
}

/** Ekstrak plain text dari BlockNote document */
export function blocksToText(blocks: Block[]): string {
  return blocks
    .map((block) => {
      const content = block.content;
      if (!Array.isArray(content)) return '';
      return content
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((c: any) => (c.type === 'text' ? String(c.text ?? '') : ''))
        .join('');
    })
    .filter(Boolean)
    .join('\n\n');
}

// ── component ────────────────────────────────────────────────────────────────

interface Props {
  /** Plain text untuk isi awal editor (dikonversi ke blocks saat mount) */
  initialText?: string;
  /** Dipanggil setiap kali konten berubah */
  onChange: (blocksJson: string, plainText: string) => void;
  /** Dipanggil ketika user men-select teks di editor */
  onSelectionMark?: (selectedText: string) => void;
  editable?: boolean;
}

export default function BlockNoteEditor({
  initialText,
  onChange,
  onSelectionMark,
  editable = true,
}: Props) {
  const editor = useCreateBlockNote({
    initialContent: initialText ? (textToBlocks(initialText) as PartialBlock[]) : undefined,
  });

  const handleChange = useCallback(() => {
    const blocks = editor.document;
    const json = JSON.stringify(blocks);
    const text = blocksToText(blocks as Block[]);
    onChange(json, text);
  }, [editor, onChange]);

  const handleMouseUp = useCallback(() => {
    if (!onSelectionMark) return;
    const sel = window.getSelection();
    const text = sel?.toString().trim();
    if (text) onSelectionMark(text);
  }, [onSelectionMark]);

  return (
    <div
      onMouseUp={handleMouseUp}
      style={{
        background: '#fff',
        maxWidth: 860,
        margin: '24px auto',
        borderRadius: 4,
        boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 6px 28px rgba(0,0,0,0.07)',
        minHeight: 600,
        padding: '40px 20px',
        fontFamily: '"Times New Roman", Georgia, serif',
      }}
    >
      <BlockNoteView
        editor={editor}
        editable={editable}
        theme="light"
        onChange={handleChange}
      />
    </div>
  );
}

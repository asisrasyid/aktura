// ─── AktaBlock ─────────────────────────────────────────────────────────────

export type AktaBlock =
  | { type: 'judul';    text: string }
  | { type: 'nomor';    text: string }
  | { type: 'paragraf'; text: string }
  | { type: 'pasal';    number: number }
  | { type: 'penutup' }
  | { type: 'pagebreak' }
  | { type: 'blank' }

// ─── TTD Types ──────────────────────────────────────────────────────────────

export type TtdItemType = 'pihak' | 'notaris' | 'meterai' | 'sidikjari' | 'kosong'

export interface TtdItem {
  id: string
  type: TtdItemType
  label: string
  /** Placeholder key for the signature name, e.g. "{{NAMA_PENGHADAP_1}}" */
  namaPlaceholder?: string
}

export interface TtdLayout {
  items: TtdItem[]
}

export const DEFAULT_TTD_LAYOUT: TtdLayout = {
  items: [
    {
      id: 'ttd-pihak-1',
      type: 'pihak',
      label: 'PIHAK PERTAMA',
      namaPlaceholder: '{{NAMA_PENGHADAP_1}}',
    },
    {
      id: 'ttd-pihak-2',
      type: 'pihak',
      label: 'PIHAK KEDUA',
      namaPlaceholder: '{{NAMA_PENGHADAP_2}}',
    },
    {
      id: 'ttd-notaris',
      type: 'notaris',
      label: 'Notaris di {{WILAYAH_NOTARIS}}',
      namaPlaceholder: '{{NAMA_NOTARIS}}',
    },
  ],
}

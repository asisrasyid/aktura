import { useState } from 'react';
import { Select, Button, Popconfirm, Tooltip, Avatar } from 'antd';
import { PlusOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import type { AktaKlienItem } from '../../../types';
import { klienService } from '../../../services/klien.service';

const PERAN_OPTIONS = [
  'Pihak Pertama',
  'Pihak Kedua',
  'Pihak Ketiga',
  'Penjual',
  'Pembeli',
  'Pemberi Hibah',
  'Penerima Hibah',
  'Pemberi Kuasa',
  'Penerima Kuasa',
  'Penghadap',
  'Saksi I',
  'Saksi II',
  'Lainnya',
];

interface Props {
  paraPihak: AktaKlienItem[];
  onChange: (paraPihak: AktaKlienItem[]) => void;
}

interface KlienOption {
  value: string;
  label: string;
  nik: string;
  nama: string;
}

export default function ParaPihakSection({ paraPihak, onChange }: Props) {
  const [showAdd, setShowAdd]         = useState(false);
  const [klienOptions, setKlienOptions] = useState<KlienOption[]>([]);
  const [searching, setSearching]     = useState(false);
  const [newKlienId, setNewKlienId]   = useState<string | null>(null);
  const [newPeran, setNewPeran]       = useState('Pihak Pertama');

  const searchKlien = async (q: string) => {
    if (q.length < 1) return;
    setSearching(true);
    try {
      const res = await klienService.getAll(1, 20, q);
      setKlienOptions(res.items.map(k => ({
        value: k.id,
        label: `${k.nama} — ${k.nik}`,
        nik: k.nik,
        nama: k.nama,
      })));
    } finally {
      setSearching(false);
    }
  };

  const addPihak = () => {
    if (!newKlienId) return;
    const opt = klienOptions.find(o => o.value === newKlienId);
    if (!opt) return;

    // Cek duplikat
    if (paraPihak.some(p => p.klienId === newKlienId)) return;

    onChange([
      ...paraPihak,
      {
        klienId: opt.value,
        namaKlien: opt.nama,
        nik: opt.nik,
        peran: newPeran,
        urutan: paraPihak.length,
      },
    ]);
    setNewKlienId(null);
    setShowAdd(false);
  };

  const removePihak = (klienId: string) => {
    onChange(paraPihak.filter(p => p.klienId !== klienId));
  };

  const updatePeran = (klienId: string, peran: string) => {
    onChange(paraPihak.map(p => p.klienId === klienId ? { ...p, peran } : p));
  };

  return (
    <div>
      {paraPihak.length === 0 && (
        <div style={{ color: '#bfbfbf', fontStyle: 'italic', padding: '8px 0' }}>
          Belum ada pihak yang ditambahkan.
        </div>
      )}

      {paraPihak.map(p => (
        <div
          key={p.klienId}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 0',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <Avatar icon={<UserOutlined />} size="small" style={{ background: '#0f2344', flexShrink: 0 }} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.namaKlien}
            </div>
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>{p.nik}</div>
          </div>

          <Select
            value={p.peran}
            onChange={v => updatePeran(p.klienId, v)}
            style={{ width: 180 }}
            size="small"
            variant="borderless"
            options={[
              ...PERAN_OPTIONS.map(o => ({ value: o, label: o })),
              { value: p.peran, label: p.peran }, // keep custom value
            ].filter((o, i, arr) => arr.findIndex(x => x.value === o.value) === i)}
          />

          <Popconfirm
            title="Hapus pihak ini dari akta?"
            onConfirm={() => removePihak(p.klienId)}
            okText="Ya" cancelText="Tidak"
          >
            <Tooltip title="Hapus">
              <Button size="small" type="text" icon={<DeleteOutlined />} danger />
            </Tooltip>
          </Popconfirm>
        </div>
      ))}

      {showAdd ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}>
          <Select
            showSearch
            placeholder="Cari klien..."
            filterOption={false}
            onSearch={searchKlien}
            onChange={setNewKlienId}
            loading={searching}
            options={klienOptions}
            style={{ flex: 1 }}
            notFoundContent={searching ? 'Mencari...' : 'Ketik nama atau NIK klien'}
          />
          <Select
            value={newPeran}
            onChange={setNewPeran}
            options={PERAN_OPTIONS.map(o => ({ value: o, label: o }))}
            style={{ width: 160 }}
          />
          <Button type="primary" size="small" onClick={addPihak} disabled={!newKlienId}>
            Tambah
          </Button>
          <Button size="small" onClick={() => setShowAdd(false)}>Batal</Button>
        </div>
      ) : (
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          size="small"
          onClick={() => setShowAdd(true)}
          style={{ marginTop: 8, color: '#8c8c8c', borderColor: '#d9d9d9' }}
        >
          Tambah Pihak
        </Button>
      )}
    </div>
  );
}

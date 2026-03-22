import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Input, Select, DatePicker, InputNumber,
  Button, Space, Divider, Skeleton,
  message, Badge,
} from 'antd';
import {
  ArrowLeftOutlined, SaveOutlined, CheckCircleOutlined,
  NumberOutlined, CalendarOutlined, TagOutlined,
  EnvironmentOutlined, DollarOutlined, FileTextOutlined,
  EditOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Akta, AktaStatus, CreateAktaPayload, DynamicField } from '../../types';
import { aktaService } from '../../services/akta.service';
import DynamicFieldsSection from './components/DynamicFieldsSection';
import ParaPihakSection from './components/ParaPihakSection';
import ApprovalPanel from './components/ApprovalPanel';
import DokumenWarkahSection from './components/DokumenWarkahSection';
import { JENIS_PRODUK } from '../../constants/jenisProduk';

// ---- Constants ----
// JENIS_PRODUK diambil dari konstanta bersama (src/constants/jenisProduk.ts)

const STATUS_OPTIONS: { value: AktaStatus; label: string; color: string; managed?: boolean }[] = [
  { value: 'Draft',               label: 'Draft',                color: 'default' },
  { value: 'MenungguPersetujuan', label: 'Menunggu Persetujuan', color: 'warning',    managed: true },
  { value: 'DalamProses',         label: 'Dalam Proses',         color: 'processing' },
  { value: 'Selesai',             label: 'Selesai',              color: 'success' },
  { value: 'Ditolak',             label: 'Ditolak',              color: 'error',      managed: true },
  { value: 'Dibatalkan',          label: 'Dibatalkan',           color: 'error' },
];

// ---- Section wrapper (notion-style) ----

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        {icon && <span style={{ color: '#8c8c8c' }}>{icon}</span>}
        <span style={{ fontSize: 12, fontWeight: 600, color: '#8c8c8c', textTransform: 'uppercase', letterSpacing: 1 }}>
          {title}
        </span>
        <div style={{ flex: 1, height: 1, background: '#f0f0f0' }} />
      </div>
      {children}
    </div>
  );
}

// ---- Property row (notion-style) ----

function PropertyRow({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f5f5f5' }}>
      <div style={{ width: 180, display: 'flex', alignItems: 'center', gap: 8, color: '#8c8c8c', fontSize: 13, flexShrink: 0 }}>
        {icon}
        <span>{label}</span>
      </div>
      <div style={{ flex: 1 }}>
        {children}
      </div>
    </div>
  );
}

// ---- Main Component ----

export default function AktaDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [draft, setDraft]     = useState<Akta | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await aktaService.getById(id);
      setDraft(structuredClone(data));
    } catch {
      message.error('Gagal memuat data akta');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // ---- Draft helpers ----

  const patch = (changes: Partial<Akta>) => {
    setDraft(prev => prev ? { ...prev, ...changes } : prev);
    setIsDirty(true);
    setSaved(false);
  };

  const patchFields = (fields: DynamicField[]) => patch({ dynamicFields: fields });
  const patchParaPihak = (paraPihak: Akta['paraPihak']) => patch({ paraPihak });

  // ---- Konsep Dokumen ----

  const handleKonsepDokumen = () => {
    if (!draft) return;
    navigate('/konsep-dokumen', {
      state: {
        aktaContext: {
          jenisAkta:     draft.jenisAkta,
          nomorAkta:     draft.nomorAkta,
          judul:         draft.judul,
          tanggalAkta:   draft.tanggalAkta,
          paraPihak:     draft.paraPihak.map(p => ({
            nama: p.namaKlien,
            nik:  p.nik,
            peran: p.peran,
          })),
          nilaiTransaksi: draft.nilaiTransaksi,
          lokasiObjek:   draft.lokasiObjek,
          dynamicFields: draft.dynamicFields
            .filter(f => f.value)
            .map(f => ({ label: f.label, value: f.value })),
        },
      },
    });
  };

  // ---- Save ----

  const handleSave = async () => {
    if (!draft || !id) return;
    setSaving(true);
    try {
      const payload: CreateAktaPayload = {
        nomorAkta:     draft.nomorAkta,
        judul:         draft.judul,
        tanggalAkta:   draft.tanggalAkta,
        jenisAkta:     draft.jenisAkta,
        status:        draft.status,
        nilaiTransaksi: draft.nilaiTransaksi,
        lokasiObjek:   draft.lokasiObjek,
        keterangan:    draft.keterangan,
        dynamicFields: draft.dynamicFields,
        paraPihak:     draft.paraPihak.map((p, i) => ({
          klienId: p.klienId,
          peran:   p.peran,
          urutan:  i,
        })),
      };
      const updated = await aktaService.update(id, payload);
      setDraft(structuredClone(updated));
      setIsDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal menyimpan';
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ---- Render ----

  if (loading) {
    return (
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 24px' }}>
        <Skeleton active paragraph={{ rows: 10 }} />
      </div>
    );
  }

  if (!draft) return <div style={{ padding: 40, color: '#8c8c8c' }}>Akta tidak ditemukan.</div>;

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 24px 60px' }}>

      {/* ── Top bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/akta')}
          style={{ color: '#8c8c8c' }}
        >
          Daftar Akta
        </Button>

        <Space>
          {saved && (
            <span style={{ color: '#52c41a', fontSize: 13 }}>
              <CheckCircleOutlined style={{ marginRight: 4 }} />Tersimpan
            </span>
          )}
          <Button
            icon={<EditOutlined />}
            onClick={handleKonsepDokumen}
            style={{ borderColor: '#C6A75E', color: '#C6A75E' }}
          >
            Konsep Dokumen
          </Button>
          {isDirty && (
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={saving}
            >
              Simpan Perubahan
            </Button>
          )}
        </Space>
      </div>

      {/* ── Document Icon + Title ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 48, lineHeight: 1, marginBottom: 8 }}>📄</div>
        <Input
          value={draft.judul}
          onChange={e => patch({ judul: e.target.value })}
          variant="borderless"
          style={{
            fontSize: 30,
            fontWeight: 700,
            color: '#1f1f1f',
            padding: '4px 0',
            lineHeight: 1.3,
          }}
          placeholder="Judul Akta..."
        />
      </div>

      {/* ── Status & Jenis (quick badges) ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap' }}>
        <Select
          value={draft.status}
          onChange={v => patch({ status: v })}
          variant="borderless"
          style={{ width: 210 }}
          disabled={STATUS_OPTIONS.find(s => s.value === draft.status)?.managed === true}
          options={STATUS_OPTIONS.map(s => ({
            value: s.value,
            label: <Badge status={s.color as 'default' | 'processing' | 'success' | 'error' | 'warning'} text={s.label} />,
          }))}
        />
        <Select
          value={draft.jenisAkta}
          onChange={v => patch({ jenisAkta: v })}
          variant="borderless"
          style={{ width: 220 }}
          showSearch
          placeholder="Pilih jenis produk"
          options={JENIS_PRODUK.map(j => ({ value: j, label: j }))}
        />
      </div>

      {/* ── Info Register (muncul setelah Selesai) ── */}
      {(draft.nomorRepertorium || draft.nomorBukuDaftar) && (
        <div style={{
          display:      'flex',
          gap:          8,
          flexWrap:     'wrap',
          marginBottom: 20,
          padding:      '10px 14px',
          background:   '#f7f7f5',
          border:       '1px solid #e9e9e7',
          borderRadius: 8,
        }}>
          <span style={{ fontSize: 11.5, color: '#9b9a97', alignSelf: 'center' }}>
            Terdaftar di:
          </span>
          {draft.nomorRepertorium && (
            <span style={{
              padding: '2px 10px', borderRadius: 4,
              background: '#e8e3ff', color: '#7c6dba',
              fontSize: 11, fontWeight: 600, fontFamily: 'monospace',
            }}>
              Repertorium {draft.nomorRepertorium}
            </span>
          )}
          {draft.nomorBukuDaftar && (
            <span style={{
              padding: '2px 10px', borderRadius: 4,
              background: '#d3e5ef', color: '#4a7fa5',
              fontSize: 11, fontWeight: 600, fontFamily: 'monospace',
            }}>
              {draft.jenisBukuDaftar === 'WASIAT' ? 'Wasiat' : 'Buku Akta'} {draft.nomorBukuDaftar}
            </span>
          )}
        </div>
      )}

      {/* ── Approval Panel ── */}
      {id && (
        <ApprovalPanel
          aktaId={id}
          aktaStatus={draft.status}
          onRefresh={load}
        />
      )}

      {/* ── Properti Akta ── */}
      <Section title="Properti Akta" icon={<TagOutlined />}>
        <PropertyRow label="Nomor Akta" icon={<NumberOutlined />}>
          <Input
            value={draft.nomorAkta}
            onChange={e => patch({ nomorAkta: e.target.value })}
            variant="borderless"
            placeholder="Nomor akta..."
          />
        </PropertyRow>

        <PropertyRow label="Tanggal Akta" icon={<CalendarOutlined />}>
          <DatePicker
            value={draft.tanggalAkta ? dayjs(draft.tanggalAkta) : null}
            onChange={d => patch({ tanggalAkta: d ? d.format('YYYY-MM-DD') : '' })}
            variant="borderless"
            format="DD MMMM YYYY"
            style={{ width: '100%' }}
          />
        </PropertyRow>

        <PropertyRow label="Nilai Transaksi" icon={<DollarOutlined />}>
          <InputNumber
            value={draft.nilaiTransaksi}
            onChange={v => patch({ nilaiTransaksi: v ?? undefined })}
            variant="borderless"
            style={{ width: '100%' }}
            placeholder="0"
            prefix="Rp"
            formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
            parser={v => v?.replace(/\./g, '') as unknown as number}
          />
        </PropertyRow>

        <PropertyRow label="Lokasi Objek" icon={<EnvironmentOutlined />}>
          <Input
            value={draft.lokasiObjek ?? ''}
            onChange={e => patch({ lokasiObjek: e.target.value || undefined })}
            variant="borderless"
            placeholder="Alamat / lokasi objek akta..."
          />
        </PropertyRow>
      </Section>

      {/* ── Para Pihak ── */}
      <Section title="Para Pihak" icon={<span>👥</span>}>
        <ParaPihakSection
          paraPihak={draft.paraPihak}
          onChange={patchParaPihak}
        />
      </Section>

      {/* ── Field Dinamis ── */}
      <Section title="Field Tambahan" icon={<span>⚙️</span>}>
        <p style={{ fontSize: 12, color: '#bfbfbf', margin: '0 0 12px', fontStyle: 'italic' }}>
          Tambah field sesuai kebutuhan akta — luas tanah, nomor SHM, data khusus, dll.
        </p>
        <DynamicFieldsSection
          fields={draft.dynamicFields}
          onChange={patchFields}
        />
      </Section>

      {/* ── Dokumen Warkah ── */}
      <Section title="Dokumen Warkah" icon={<span>📎</span>}>
        <p style={{ fontSize: 12, color: '#bfbfbf', margin: '0 0 12px', fontStyle: 'italic' }}>
          Upload dokumen pendukung akta (opsional) — KTP, NPWP, SHM, SPPT, dan lainnya.
          Dapat diupload kapan saja sebelum atau sesudah pengajuan persetujuan.
        </p>
        <DokumenWarkahSection aktaId={id!} />
      </Section>

      {/* ── Keterangan / Catatan ── */}
      <Section title="Keterangan" icon={<FileTextOutlined />}>
        <Input.TextArea
          value={draft.keterangan ?? ''}
          onChange={e => patch({ keterangan: e.target.value || undefined })}
          variant="borderless"
          autoSize={{ minRows: 3, maxRows: 12 }}
          placeholder="Catatan atau keterangan tambahan mengenai akta ini..."
          style={{ fontSize: 14, color: '#595959' }}
        />
      </Section>

      {/* ── Meta info ── */}
      <Divider />
      <div style={{ display: 'flex', gap: 24, color: '#bfbfbf', fontSize: 12 }}>
        <span>Dibuat: {dayjs(draft.createdAt).format('DD MMM YYYY HH:mm')}</span>
        {draft.updatedAt && (
          <span>Diperbarui: {dayjs(draft.updatedAt).format('DD MMM YYYY HH:mm')}</span>
        )}
      </div>
    </div>
  );
}

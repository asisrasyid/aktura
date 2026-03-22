import { useEffect } from 'react';
import {
  Drawer, Form, Input, DatePicker, Select, Button,
  Typography, Alert,
} from 'antd';
import dayjs from 'dayjs';
import type {
  JenisBuku,
  RegisterAktaDetail,
  CreateRegisterAktaRequest,
  UpdateRegisterAktaRequest,
} from '../../../services/registerAkta.service';

const { Text } = Typography;
const { TextArea } = Input;

// ── Design tokens ────────────────────────────────────────────────
const T = {
  text:   '#37352f',
  muted:  '#9b9a97',
  border: '#e9e9e7',
  hover:  '#f7f7f5',
};

// ── Field tambahan per jenis buku ────────────────────────────────
const DETAIL_FIELDS: Record<
  string,
  { name: string; label: string; type?: 'select' | 'date'; options?: string[] }[]
> = {
  AKTA: [
    { name: 'nomorAkta',  label: 'Nomor Akta' },
    { name: 'jenisAkta',  label: 'Jenis Akta' },
    { name: 'saksi1',     label: 'Saksi 1' },
    { name: 'saksi2',     label: 'Saksi 2' },
    { name: 'nilaiObjek', label: 'Nilai / Objek' },
  ],
  LEGALITAS: [
    { name: 'jenisDokumen', label: 'Jenis Dokumen' },
    { name: 'jumlahLembar', label: 'Jumlah Lembar' },
  ],
  WAARMERKING: [
    { name: 'jenisDokumen',       label: 'Jenis Dokumen' },
    { name: 'tanggalDokumenAsli', label: 'Tanggal Dokumen Asli', type: 'date' },
    { name: 'penerbitDokumen',    label: 'Penerbit Dokumen' },
    { name: 'jumlahLembar',       label: 'Jumlah Lembar' },
  ],
  PROTES: [
    {
      name: 'jenisProtes', label: 'Jenis Protes', type: 'select',
      options: ['Wesel', 'Cek', 'Surat Sanggup'],
    },
    { name: 'jumlahNominal', label: 'Jumlah Nominal' },
    { name: 'alasanProtes',  label: 'Alasan Protes' },
  ],
  WASIAT: [
    { name: 'nikPewasiat',      label: 'NIK Pewasiat' },
    { name: 'tglLahirPewasiat', label: 'Tanggal Lahir Pewasiat', type: 'date' },
    {
      name: 'jenisWasiat', label: 'Jenis Wasiat', type: 'select',
      options: ['Olografis', 'Umum', 'Rahasia'],
    },
    { name: 'nomorAkta', label: 'Nomor Akta (jika wasiat notaril)' },
  ],
};

const JENIS_OPTIONS: { value: JenisBuku; label: string }[] = [
  { value: 'REPERTORIUM', label: 'Repertorium' },
  { value: 'AKTA',        label: 'Buku Daftar Akta' },
  { value: 'LEGALITAS',   label: 'Buku Daftar Legalitas' },
  { value: 'WAARMERKING', label: 'Buku Daftar Waarmerking' },
  { value: 'PROTES',      label: 'Buku Daftar Protes' },
  { value: 'WASIAT',      label: 'Buku Daftar Wasiat' },
];

const JENIS_META: Record<string, { bg: string; color: string }> = {
  REPERTORIUM: { bg: '#e8e3ff', color: '#7c6dba' },
  AKTA:        { bg: '#d3e5ef', color: '#4a7fa5' },
  LEGALITAS:   { bg: '#dbeddb', color: '#448844' },
  WAARMERKING: { bg: '#fdecc8', color: '#b37a2c' },
  PROTES:      { bg: '#ffd6d6', color: '#c44444' },
  WASIAT:      { bg: '#ffe2dd', color: '#c94a2e' },
};

// ── Section divider ──────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display:       'flex',
      alignItems:    'center',
      gap:           8,
      margin:        '18px 0 14px',
    }}>
      <div style={{ flex: 1, height: 1, background: T.border }} />
      <Text style={{
        fontSize:      10,
        fontWeight:    600,
        color:         T.muted,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        whiteSpace:    'nowrap',
      }}>
        {children}
      </Text>
      <div style={{ flex: 1, height: 1, background: T.border }} />
    </div>
  );
}

// ── Props & form types ───────────────────────────────────────────
interface Props {
  open:             boolean;
  defaultJenisBuku?: JenisBuku;
  editData?:        RegisterAktaDetail | null;
  loading:          boolean;
  onClose:          () => void;
  onSubmit:         (values: CreateRegisterAktaRequest | UpdateRegisterAktaRequest) => Promise<void>;
}

type FormValues = {
  tanggal:        dayjs.Dayjs;
  jenisBuku:      JenisBuku;
  judulSingkat:   string;
  paraPihak?:     string;
  keterangan?:    string;
  statusLaporan?: string;
  tanggalLaporan?: dayjs.Dayjs;
  [key: string]:  unknown;
};

// ── Component ────────────────────────────────────────────────────
export default function RegisterEntryDrawer({
  open, defaultJenisBuku, editData, loading, onClose, onSubmit,
}: Props) {
  const [form] = Form.useForm<FormValues>();
  const watchedJenis = Form.useWatch('jenisBuku', form) as JenisBuku | undefined;
  const isEdit = !!editData;

  useEffect(() => {
    if (!open) return;
    if (editData) {
      const detail = editData.detailJson ? JSON.parse(editData.detailJson) : {};
      const prefixed: Record<string, unknown> = {};
      Object.entries(detail).forEach(([k, v]) => { prefixed[`d_${k}`] = v; });

      form.setFieldsValue({
        tanggal:        dayjs(editData.tanggal),
        jenisBuku:      editData.jenisBuku,
        judulSingkat:   editData.judulSingkat,
        paraPihak:      editData.paraPihak,
        keterangan:     editData.keterangan,
        statusLaporan:  editData.statusLaporan,
        tanggalLaporan: editData.tanggalLaporan ? dayjs(editData.tanggalLaporan) : undefined,
        ...prefixed,
      });
    } else {
      form.resetFields();
      if (defaultJenisBuku) form.setFieldValue('jenisBuku', defaultJenisBuku);
      form.setFieldValue('tanggal', dayjs());
    }
  }, [open, editData, defaultJenisBuku, form]);

  const handleFinish = async (values: FormValues) => {
    const detail: Record<string, string> = {};
    const extraFields = DETAIL_FIELDS[values.jenisBuku] ?? [];
    extraFields.forEach(({ name }) => {
      const val = values[`d_${name}`];
      if (val !== undefined && val !== null && val !== '') {
        detail[name] = val instanceof dayjs
          ? (val as dayjs.Dayjs).format('YYYY-MM-DD')
          : String(val);
      }
    });

    const payload = {
      tanggal:      values.tanggal.format('YYYY-MM-DD'),
      judulSingkat: values.judulSingkat,
      paraPihak:    values.paraPihak || undefined,
      detail:       Object.keys(detail).length ? detail : undefined,
      keterangan:   values.keterangan || undefined,
      ...(isEdit
        ? {
            statusLaporan:  values.statusLaporan || undefined,
            tanggalLaporan: values.tanggalLaporan?.format('YYYY-MM-DD'),
          }
        : { jenisBuku: values.jenisBuku }),
    };

    await onSubmit(payload as CreateRegisterAktaRequest | UpdateRegisterAktaRequest);
  };

  const extraFields = DETAIL_FIELDS[watchedJenis ?? ''] ?? [];
  const jenisMeta   = editData ? JENIS_META[editData.jenisBuku] : undefined;

  return (
    <Drawer
      title={
        <span style={{ fontSize: 15, fontWeight: 600, color: T.text }}>
          {isEdit ? 'Edit Entri' : 'Tambah Entri Baru'}
        </span>
      }
      placement="right"
      width={500}
      open={open}
      onClose={onClose}
      destroyOnClose
      styles={{
        header: { borderBottom: `1px solid ${T.border}`, padding: '14px 20px' },
        body:   { padding: '20px', overflowY: 'auto' },
        footer: { borderTop: `1px solid ${T.border}`, padding: '12px 20px' },
      }}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onClose} size="small">Batal</Button>
          <Button
            type="primary"
            loading={loading}
            size="small"
            style={{ minWidth: 110 }}
            onClick={() => form.submit()}
          >
            {isEdit ? 'Simpan Perubahan' : 'Tambah Entri'}
          </Button>
        </div>
      }
    >
      {/* Info bar for edit mode */}
      {isEdit && jenisMeta && (
        <div style={{
          display:       'flex',
          alignItems:    'center',
          gap:           10,
          padding:       '8px 12px',
          borderRadius:  6,
          background:    T.hover,
          border:        `1px solid ${T.border}`,
          marginBottom:  20,
        }}>
          <span style={{
            padding:      '2px 8px',
            borderRadius: 4,
            background:   jenisMeta.bg,
            color:        jenisMeta.color,
            fontSize:     11,
            fontWeight:   600,
          }}>
            {JENIS_OPTIONS.find(j => j.value === editData?.jenisBuku)?.label}
          </span>
          <span style={{
            fontFamily: 'monospace',
            fontSize:   12,
            fontWeight: 600,
            color:      T.text,
            background: '#efefec',
            padding:    '1px 7px',
            borderRadius: 4,
          }}>
            {editData?.nomorDisplay}
          </span>
        </div>
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        requiredMark={false}
        size="small"
      >
        {/* Jenis buku — hanya saat tambah baru */}
        {!isEdit && (
          <Form.Item
            label={<Text style={{ fontSize: 12, color: T.muted, fontWeight: 600 }}>JENIS BUKU</Text>}
            name="jenisBuku"
            rules={[{ required: true, message: 'Pilih jenis buku' }]}
          >
            <Select
              placeholder="Pilih jenis buku..."
              options={JENIS_OPTIONS}
              style={{ width: '100%' }}
            />
          </Form.Item>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item
            label={<Text style={{ fontSize: 12, color: T.muted, fontWeight: 600 }}>TANGGAL</Text>}
            name="tanggal"
            rules={[{ required: true, message: 'Wajib diisi' }]}
            style={{ flex: 1 }}
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
        </div>

        <Form.Item
          label={<Text style={{ fontSize: 12, color: T.muted, fontWeight: 600 }}>JUDUL / PERIHAL</Text>}
          name="judulSingkat"
          rules={[{ required: true, message: 'Wajib diisi' }]}
        >
          <Input placeholder="Deskripsi singkat entri..." />
        </Form.Item>

        <Form.Item
          label={<Text style={{ fontSize: 12, color: T.muted, fontWeight: 600 }}>PARA PIHAK</Text>}
          name="paraPihak"
        >
          <TextArea
            rows={2}
            placeholder="Nama pihak-pihak yang terlibat..."
            style={{ resize: 'none' }}
          />
        </Form.Item>

        {/* Field tambahan per jenis buku */}
        {extraFields.length > 0 && (
          <>
            <SectionLabel>Detail</SectionLabel>
            {extraFields.map(({ name, label, type, options }) => (
              <Form.Item
                key={name}
                label={<Text style={{ fontSize: 12, color: T.muted, fontWeight: 600 }}>{label.toUpperCase()}</Text>}
                name={`d_${name}`}
              >
                {type === 'select' ? (
                  <Select
                    placeholder={`Pilih ${label.toLowerCase()}...`}
                    options={options?.map(o => ({ value: o, label: o }))}
                  />
                ) : type === 'date' ? (
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                ) : (
                  <Input />
                )}
              </Form.Item>
            ))}
          </>
        )}

        {/* Status laporan — hanya saat edit Wasiat */}
        {isEdit && editData?.jenisBuku === 'WASIAT' && (
          <>
            <SectionLabel>Laporan DPW</SectionLabel>
            {editData.statusLaporan === 'BELUM' && (
              <Alert
                type="warning"
                showIcon
                message="Wasiat belum dilaporkan ke Daftar Pusat Wasiat"
                style={{ marginBottom: 12, fontSize: 12, borderRadius: 6 }}
              />
            )}
            <Form.Item
              label={<Text style={{ fontSize: 12, color: T.muted, fontWeight: 600 }}>STATUS LAPORAN</Text>}
              name="statusLaporan"
            >
              <Select options={[
                { value: 'BELUM', label: 'Belum Dilaporkan' },
                { value: 'SUDAH', label: 'Sudah Dilaporkan' },
              ]} />
            </Form.Item>
            <Form.Item
              label={<Text style={{ fontSize: 12, color: T.muted, fontWeight: 600 }}>TANGGAL LAPORAN</Text>}
              name="tanggalLaporan"
            >
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </>
        )}

        <SectionLabel>Keterangan</SectionLabel>
        <Form.Item name="keterangan">
          <TextArea
            rows={2}
            placeholder="Catatan tambahan..."
            style={{ resize: 'none' }}
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button, Input, InputNumber, DatePicker, Form, message, Spin,
  Typography, Space, Divider, AutoComplete, Tag, Segmented,
} from 'antd';
import {
  ArrowLeftOutlined, SaveOutlined, PlusOutlined, DeleteOutlined,
  FileWordOutlined, DownloadOutlined, FilePdfOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { templateAktaService, triggerDownload } from '../../services/templateAkta.service';
import { aktaService } from '../../services/akta.service';
import { klienService } from '../../services/klien.service';
import type { TemplateAkta, PlaceholderDef, Klien } from '../../types';
import { AktaViewer } from '../../components/akta-viewer';
import type { TtdLayout } from '../../components/akta-viewer';
import { DEFAULT_TTD_LAYOUT } from '../../components/akta-viewer';

const { Title, Text } = Typography;

interface ParaPihakItem {
  klienId: string;
  namaKlien: string;
  nik: string;
  peran: string;
  urutan: number;
}

export default function GenerateAkta() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [template, setTemplate]       = useState<TemplateAkta | null>(null);
  const [loading, setLoading]         = useState(true);
  const [generating, setGenerating]   = useState(false);
  const [saving, setSaving]           = useState(false);
  const [values, setValues]           = useState<Record<string, string>>({});
  const [outputFormat, setOutputFormat] = useState<'docx' | 'pdf'>('docx');
  const [ttdLayout, setTtdLayout]       = useState<TtdLayout>(DEFAULT_TTD_LAYOUT);

  // Info akta
  const [nomorAkta, setNomorAkta]     = useState('');
  const [judul, setJudul]             = useState('');
  const [tanggalAkta, setTanggalAkta] = useState<dayjs.Dayjs>(dayjs());

  // Para pihak
  const [paraPihak, setParaPihak]         = useState<ParaPihakItem[]>([]);
  const [klienSearch, setKlienSearch]     = useState('');
  const [klienOptions, setKlienOptions]   = useState<Klien[]>([]);
  const [klienLoading, setKlienLoading]   = useState(false);
  const [selectedKlien, setSelectedKlien] = useState<Klien | null>(null);
  const [peranInput, setPeranInput]       = useState('');

  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    templateAktaService.getById(id)
      .then((res) => {
        setTemplate(res.data);
        const init: Record<string, string> = {};
        res.data.placeholders.forEach((p) => { init[p.key] = ''; });
        setValues(init);
        setJudul(res.data.nama);
      })
      .catch(() => message.error('Gagal memuat template.'))
      .finally(() => setLoading(false));
  }, [id]);

  const setValue = (key: string, val: string) =>
    setValues((prev) => ({ ...prev, [key]: val }));

  // Live preview (client-side substitution)
  const getPreview = useCallback(() => {
    if (!template) return '';
    let doc = template.kontenTemplate;
    Object.entries(values).forEach(([k, v]) => {
      doc = doc.replaceAll(`{{${k}}}`, v || `{{${k}}}`);
    });
    return doc;
  }, [template, values]);

  // ---- Klien search ----
  const handleKlienSearch = (val: string) => {
    setKlienSearch(val);
    setSelectedKlien(null);
    clearTimeout(searchTimer.current);
    if (!val.trim()) { setKlienOptions([]); return; }
    searchTimer.current = setTimeout(async () => {
      setKlienLoading(true);
      try {
        const res = await klienService.getAll(1, 10, val);
        setKlienOptions(res.items);
      } catch { /* ignore */ }
      finally { setKlienLoading(false); }
    }, 300);
  };

  const handleKlienSelect = (optionValue: string | number) => {
    const klien = klienOptions.find((k) => k.id === String(optionValue));
    if (klien) { setSelectedKlien(klien); setKlienSearch(klien.nama); }
  };

  const handleAddParaPihak = () => {
    if (!selectedKlien) { message.warning('Pilih klien dari hasil pencarian.'); return; }
    if (!peranInput.trim()) { message.warning('Peran tidak boleh kosong.'); return; }
    if (paraPihak.find((p) => p.klienId === selectedKlien.id)) {
      message.warning('Klien ini sudah ada dalam daftar.'); return;
    }
    setParaPihak((prev) => [
      ...prev,
      { klienId: selectedKlien.id, namaKlien: selectedKlien.nama, nik: selectedKlien.nik, peran: peranInput.trim(), urutan: prev.length },
    ]);
    setSelectedKlien(null); setKlienSearch(''); setPeranInput(''); setKlienOptions([]);
  };

  const handleRemoveParaPihak = (klienId: string) =>
    setParaPihak((prev) =>
      prev.filter((p) => p.klienId !== klienId).map((p, i) => ({ ...p, urutan: i }))
    );

  // ---- Generate Word/PDF (flow baru) ----
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const blob = await templateAktaService.generateWord(id!, values, outputFormat);
      const ext  = outputFormat === 'pdf' ? 'pdf' : 'docx';
      const name = `${template!.nama}_${dayjs().format('YYYYMMDD_HHmm')}.${ext}`;
      triggerDownload(blob, name);
      message.success(`Akta ${outputFormat.toUpperCase()} berhasil dihasilkan.`);
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { message?: string } }; message?: string };
      message.error(anyErr?.response?.data?.message ?? anyErr?.message ?? 'Gagal generate akta.');
    } finally {
      setGenerating(false);
    }
  };

  // ---- Simpan sebagai Akta ----
  const handleSaveAsAkta = async () => {
    if (!nomorAkta.trim()) { message.warning('Nomor akta wajib diisi.'); return; }
    if (!judul.trim()) { message.warning('Judul wajib diisi.'); return; }

    setSaving(true);
    try {
      const result = await aktaService.create({
        nomorAkta:      nomorAkta.trim(),
        judul:          judul.trim(),
        tanggalAkta:    tanggalAkta.format('YYYY-MM-DD'),
        jenisAkta:      template!.jenisAkta,
        status:         'Draft',
        templateAktaId: template!.id,
        kontenDokumen:  getPreview(),
        dynamicFields:  [],
        paraPihak:      paraPihak.map((p) => ({ klienId: p.klienId, peran: p.peran, urutan: p.urutan })),
      });
      message.success('Akta berhasil disimpan.');
      navigate(`/akta/${result.id}`);
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { message?: string } } };
      message.error(anyErr?.response?.data?.message ?? 'Gagal menyimpan akta.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 48, textAlign: 'center' }}><Spin size="large" /></div>;
  if (!template) return null;

  const preview = getPreview();

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f5f5' }}>

      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px',
        background: '#fff', borderBottom: '1px solid #f0f0f0', flexShrink: 0,
      }}>
        <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate('/template-akta')} />
        <div style={{ flex: 1 }}>
          <Title level={5} style={{ margin: 0 }}>Generate Akta — {template.nama}</Title>
          <Text type="secondary" style={{ fontSize: 12 }}>{template.jenisAkta}</Text>
        </div>
        <Space>
          <Tag color="blue" icon={<FileWordOutlined />} style={{ margin: 0 }}>
            {template.placeholders.length} placeholder
          </Tag>
          <Segmented
            options={[
              { label: 'Word', value: 'docx', icon: <FileWordOutlined /> },
              { label: 'PDF', value: 'pdf', icon: <FilePdfOutlined /> },
            ]}
            value={outputFormat}
            onChange={(v) => setOutputFormat(v as 'docx' | 'pdf')}
          />
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            loading={generating}
            onClick={handleGenerate}
          >
            Generate {outputFormat === 'pdf' ? 'PDF' : 'Word'}
          </Button>
          <Button type="default" icon={<SaveOutlined />} loading={saving} onClick={handleSaveAsAkta}>
            Simpan sebagai Akta
          </Button>
        </Space>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left: Form */}
        <div style={{
          width: 380, flexShrink: 0, overflow: 'auto',
          background: '#fff', borderRight: '1px solid #f0f0f0',
          padding: '16px 16px 24px',
        }}>

          {/* ── Info Akta ── */}
          <Text strong style={{ fontSize: 13 }}>Info Akta</Text>
          <Divider style={{ margin: '8px 0 12px' }} />
          <Form layout="vertical" size="small">
            <Form.Item label="Nomor Akta" required style={{ marginBottom: 10 }}>
              <Input
                value={nomorAkta}
                onChange={(e) => setNomorAkta(e.target.value)}
                placeholder="Contoh: 001/NOT/I/2026"
              />
            </Form.Item>
            <Form.Item label="Judul" required style={{ marginBottom: 10 }}>
              <Input value={judul} onChange={(e) => setJudul(e.target.value)} />
            </Form.Item>
            <Form.Item label="Tanggal Akta" style={{ marginBottom: 0 }}>
              <DatePicker
                style={{ width: '100%' }}
                format="DD-MM-YYYY"
                value={tanggalAkta}
                onChange={(d) => d && setTanggalAkta(d)}
              />
            </Form.Item>
          </Form>

          {/* ── Para Pihak ── */}
          <Divider style={{ margin: '16px 0 12px' }} />
          <Text strong style={{ fontSize: 13 }}>Para Pihak</Text>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <AutoComplete
              style={{ width: '100%' }}
              value={klienSearch}
              options={klienOptions.map((k) => ({ value: k.id, label: `${k.nama} — ${k.nik}` }))}
              onSearch={handleKlienSearch}
              onSelect={handleKlienSelect}
              placeholder="Cari nama / NIK klien..."
              notFoundContent={klienLoading ? <Spin size="small" /> : null}
              size="small"
            />
            <Input
              size="small"
              placeholder="Peran (cth: Penjual, Pembeli, Penerima Kuasa)"
              value={peranInput}
              onChange={(e) => setPeranInput(e.target.value)}
              onPressEnter={handleAddParaPihak}
            />
            <Button size="small" icon={<PlusOutlined />} onClick={handleAddParaPihak} block>
              Tambah Pihak
            </Button>
          </div>

          {paraPihak.length > 0 && (
            <div style={{ marginTop: 10 }}>
              {paraPihak.map((p) => (
                <div key={p.klienId} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '5px 8px', marginBottom: 4,
                  background: '#f9f9f9', borderRadius: 4, border: '1px solid #f0f0f0',
                }}>
                  <div style={{ minWidth: 0 }}>
                    <Text style={{ fontSize: 12 }}>{p.namaKlien}</Text>
                    <div>
                      <Text type="secondary" style={{ fontSize: 11 }}>{p.nik}</Text>
                      <Tag color="blue" style={{ marginLeft: 6, fontSize: 10 }}>{p.peran}</Tag>
                    </div>
                  </div>
                  <Button
                    type="text" danger size="small" icon={<DeleteOutlined />}
                    onClick={() => handleRemoveParaPihak(p.klienId)}
                  />
                </div>
              ))}
            </div>
          )}

          {/* ── Isi Placeholder ── */}
          {template.placeholders.length > 0 && (
            <>
              <Divider style={{ margin: '16px 0 12px' }} />
              <Text strong style={{ fontSize: 13 }}>Isi Placeholder</Text>
              <Text type="secondary" style={{ display: 'block', fontSize: 11, marginTop: 2, marginBottom: 12 }}>
                {template.placeholders.length} field · isi lalu klik Generate {outputFormat === 'pdf' ? 'PDF' : 'Word'}
              </Text>
              <Form layout="vertical" size="small">
                {template.placeholders.map((p) => (
                  <Form.Item key={p.key} label={p.label} style={{ marginBottom: 10 }}>
                    <PlaceholderInput
                      ph={p}
                      value={values[p.key] ?? ''}
                      onChange={(v) => setValue(p.key, v)}
                    />
                  </Form.Item>
                ))}
              </Form>
            </>
          )}
        </div>

        {/* Right: AktaViewer preview */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <AktaViewer
            text={preview}
            ttdLayout={ttdLayout}
            onTtdChange={setTtdLayout}
            readOnly={false}
          />
        </div>
      </div>
    </div>
  );
}

// ---- Input component sesuai tipe ----
function PlaceholderInput({
  ph, value, onChange,
}: {
  ph: PlaceholderDef;
  value: string;
  onChange: (v: string) => void;
}) {
  switch (ph.type) {
    case 'textarea':
      return (
        <Input.TextArea rows={3} value={value} onChange={(e) => onChange(e.target.value)} placeholder={ph.label} />
      );
    case 'number':
      return (
        <InputNumber
          style={{ width: '100%' }}
          value={value ? Number(value) : null}
          onChange={(v) => onChange(String(v ?? ''))}
          placeholder={ph.label}
        />
      );
    case 'currency':
      return (
        <InputNumber
          style={{ width: '100%' }}
          prefix="Rp"
          formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
          parser={(v) => Number(v?.replace(/\./g, '') ?? 0)}
          value={value ? Number(value) : null}
          onChange={(v) => onChange(String(v ?? ''))}
          placeholder={ph.label}
        />
      );
    case 'date':
      return (
        <DatePicker
          style={{ width: '100%' }}
          format="DD-MM-YYYY"
          value={value ? dayjs(value, 'DD-MM-YYYY') : null}
          onChange={(d) => onChange(d ? d.format('DD-MM-YYYY') : '')}
        />
      );
    default:
      return <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={ph.label} />;
  }
}

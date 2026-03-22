import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button, Input, DatePicker, Tabs, Upload, Table, message,
  Spin, Typography, Space, Divider, Tag, Modal,
} from 'antd';
import {
  ArrowLeftOutlined, PlusOutlined, DeleteOutlined,
  UploadOutlined, ThunderboltOutlined, FileWordOutlined,
  FileExcelOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { TemplateAkta, PlaceholderDef, PlaceholderType } from '../../types';
import { templateAktaService, triggerDownload } from '../../services/templateAkta.service';

const { Title, Text } = Typography;

type RowData = Record<string, string> & { _rowId: string };

let _rowCounter = 0;
const newRow = (placeholders: PlaceholderDef[]): RowData => ({
  _rowId: String(++_rowCounter),
  ...Object.fromEntries(placeholders.map((p) => [p.key, ''])),
});

export default function BulkGenerateAkta() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [template,   setTemplate]   = useState<TemplateAkta | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [generating, setGenerating] = useState(false);
  const [excelFile,  setExcelFile]  = useState<File | null>(null);
  const [dlTemplate, setDlTemplate] = useState(false);

  const [rows, setRows] = useState<RowData[]>([]);

  useEffect(() => {
    if (!id) return;
    templateAktaService.getById(id)
      .then((res) => {
        setTemplate(res.data);
        setRows([newRow(res.data.placeholders)]);
      })
      .catch(() => message.error('Gagal memuat template.'))
      .finally(() => setLoading(false));
  }, [id]);

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, newRow(template!.placeholders)]);
  }, [template]);

  const removeRow = (rowId: string) =>
    setRows((prev) => prev.filter((r) => r._rowId !== rowId));

  const updateCell = (rowId: string, key: string, value: string) =>
    setRows((prev) => prev.map((r) => r._rowId === rowId ? { ...r, [key]: value } : r));

  const showError = (title: string, errMsg: string) => {
    Modal.error({
      title,
      content: <div style={{ lineHeight: 1.7 }}><p>{errMsg}</p></div>,
      okText: 'Mengerti',
    });
  };

  const extractErrorMsg = (err: unknown): string => {
    const anyErr = err as { response?: { data?: { message?: string } }; message?: string };
    return anyErr?.response?.data?.message ?? anyErr?.message ?? 'Terjadi kesalahan.';
  };

  // ---- Download Excel template ----
  const handleDownloadExcelTemplate = async () => {
    setDlTemplate(true);
    try {
      const res  = await templateAktaService.downloadExcelTemplate(id!);
      const blob = new Blob([res.data as unknown as BlobPart], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      triggerDownload(blob, `template_${template?.nama ?? 'akta'}.xlsx`);
    } catch {
      message.error('Gagal mengunduh template Excel.');
    } finally {
      setDlTemplate(false);
    }
  };

  // ---- Bulk generate Word (manual rows) ----
  const handleBulkGenerateWord = async () => {
    const cleanRows = rows.map(({ _rowId, ...rest }) => rest);
    setGenerating(true);
    try {
      const blob = await templateAktaService.bulkGenerateWord(id!, cleanRows);
      triggerDownload(blob, `akta_bulk_${template?.nama ?? 'output'}.zip`);
      message.success(`${rows.length} akta Word berhasil di-generate.`);
    } catch (err) {
      showError('Gagal Generate Word', extractErrorMsg(err));
    } finally {
      setGenerating(false);
    }
  };

  // ---- Bulk generate Word dari Excel ----
  const handleBulkGenerateWordExcel = async () => {
    if (!excelFile) { message.warning('Pilih file Excel terlebih dahulu.'); return; }
    setGenerating(true);
    try {
      const blob = await templateAktaService.bulkGenerateWordFromExcel(id!, excelFile);
      triggerDownload(blob, `akta_bulk_${template?.nama ?? 'output'}.zip`);
      message.success('Akta Word berhasil di-generate dari Excel.');
    } catch (err) {
      showError('Gagal Generate dari Excel', extractErrorMsg(err));
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div style={{ padding: 48, textAlign: 'center' }}><Spin size="large" /></div>;
  if (!template) return null;

  const placeholders = template.placeholders;

  const columns: ColumnsType<RowData> = [
    {
      title: '#',
      width: 48,
      render: (_, __, i) => <Text type="secondary" style={{ fontSize: 12 }}>{i + 1}</Text>,
    },
    ...placeholders.map((ph) => ({
      title: (
        <span style={{ fontFamily: 'monospace', fontSize: 12 }} title={ph.label}>{ph.key}</span>
      ),
      key: ph.key,
      render: (_: unknown, row: RowData) => (
        <CellInput
          ph={ph}
          value={row[ph.key] ?? ''}
          onChange={(v) => updateCell(row._rowId, ph.key, v)}
        />
      ),
    })),
    {
      title: '',
      width: 40,
      render: (_: unknown, row: RowData) => (
        <Button
          type="text" danger size="small" icon={<DeleteOutlined />}
          disabled={rows.length === 1}
          onClick={() => removeRow(row._rowId)}
        />
      ),
    },
  ];

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f5f5' }}>

      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px',
        background: '#fff', borderBottom: '1px solid #f0f0f0', flexShrink: 0,
      }}>
        <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate('/template-akta')} />
        <div style={{ flex: 1 }}>
          <Title level={5} style={{ margin: 0 }}>Generate Massal — {template.nama}</Title>
          <Space size={4}>
            <Text type="secondary" style={{ fontSize: 12 }}>{template.jenisAkta}</Text>
            <Tag color="blue" icon={<FileWordOutlined />}>Word via base template</Tag>
            <Tag color="cyan">{placeholders.length} placeholder</Tag>
          </Space>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        <Tabs
          defaultActiveKey="manual"
          items={[
            {
              key: 'manual',
              label: 'Input Manual',
              children: (
                <div>
                  <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Button icon={<PlusOutlined />} onClick={addRow}>Tambah Baris</Button>
                    <Text type="secondary" style={{ fontSize: 12 }}>{rows.length} baris</Text>
                    <div style={{ flex: 1 }} />
                    <Tag color="blue">Output ZIP: {rows.length} file .docx</Tag>
                    <Button
                      type="primary"
                      icon={<ThunderboltOutlined />}
                      loading={generating}
                      onClick={handleBulkGenerateWord}
                    >
                      Generate & Download ZIP
                    </Button>
                  </div>

                  <Table
                    rowKey="_rowId"
                    columns={columns}
                    dataSource={rows}
                    pagination={false}
                    scroll={{ x: 'max-content' }}
                    size="small"
                    bordered
                  />
                </div>
              ),
            },
            {
              key: 'excel',
              label: 'Upload Excel',
              children: (
                <div style={{ maxWidth: 560 }}>
                  <Divider>Langkah 1 — Unduh Template Excel</Divider>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                    Template Excel berisi header sesuai key placeholder. Isi data mulai baris ke-3
                    (baris ke-2 adalah contoh/label).
                  </Text>
                  <Button
                    icon={<FileExcelOutlined />}
                    loading={dlTemplate}
                    onClick={handleDownloadExcelTemplate}
                    style={{ marginBottom: 24 }}
                  >
                    Unduh Template Excel
                  </Button>

                  <Divider>Langkah 2 — Upload Excel yang Sudah Diisi</Divider>
                  <Upload
                    accept=".xlsx,.xls"
                    fileList={excelFile ? [{ name: excelFile.name, uid: '1', status: 'done' as const }] : []}
                    beforeUpload={(file) => { setExcelFile(file); return false; }}
                    onRemove={() => setExcelFile(null)}
                    maxCount={1}
                  >
                    <Button icon={<UploadOutlined />}>Pilih File Excel</Button>
                  </Upload>

                  {excelFile && (
                    <Text style={{ display: 'block', marginTop: 8, fontSize: 12, color: '#52c41a' }}>
                      ✓ {excelFile.name}
                    </Text>
                  )}

                  <Divider>Langkah 3 — Generate</Divider>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Tag color="blue">Output ZIP: file .docx via base template Word</Tag>
                    <Button
                      type="primary"
                      icon={<ThunderboltOutlined />}
                      loading={generating}
                      disabled={!excelFile}
                      onClick={handleBulkGenerateWordExcel}
                    >
                      Generate & Download ZIP
                    </Button>
                  </Space>
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}

// ---- Cell input sesuai tipe ----
function CellInput({
  ph, value, onChange,
}: {
  ph: PlaceholderDef;
  value: string;
  onChange: (v: string) => void;
}) {
  switch (ph.type as PlaceholderType) {
    case 'textarea':
      return <Input.TextArea rows={2} size="small" value={value} onChange={(e) => onChange(e.target.value)} />;
    case 'number':
      return (
        <Input size="small" type="number" value={value}
          onChange={(e) => onChange(e.target.value)} style={{ width: 120 }} />
      );
    case 'currency':
      return (
        <Input size="small" prefix="Rp" type="number" value={value}
          onChange={(e) => onChange(e.target.value)} style={{ width: 160 }} />
      );
    case 'date':
      return (
        <DatePicker size="small" format="DD-MM-YYYY"
          value={value ? dayjs(value, 'DD-MM-YYYY') : null}
          onChange={(d) => onChange(d ? d.format('DD-MM-YYYY') : '')}
          style={{ width: 140 }} />
      );
    default:
      return (
        <Input size="small" value={value}
          onChange={(e) => onChange(e.target.value)} style={{ minWidth: 140 }} />
      );
  }
}

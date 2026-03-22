import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table, Button, Input, Select, Space, Popconfirm,
  message, Tag, Badge, Modal, Form, DatePicker, Tooltip, Alert, List, Spin, Empty,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, FileTextOutlined, CheckCircleOutlined, ThunderboltOutlined, LayoutOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import type { AktaListItem, AktaStatus, TemplateAktaListItem } from '../../types';
import { aktaService } from '../../services/akta.service';
import { templateAktaService } from '../../services/templateAkta.service';
import { JENIS_PRODUK } from '../../constants/jenisProduk';
import DokumenWarkahSection from './components/DokumenWarkahSection';

const STATUS_COLOR: Record<AktaStatus, 'default' | 'processing' | 'success' | 'error' | 'warning'> = {
  Draft:               'default',
  MenungguPersetujuan: 'warning',
  DalamProses:         'processing',
  Selesai:             'success',
  Ditolak:             'error',
  Dibatalkan:          'error',
};

const STATUS_LABEL: Record<AktaStatus, string> = {
  Draft:               'Draft',
  MenungguPersetujuan: 'Menunggu Persetujuan',
  DalamProses:         'Dalam Proses',
  Selesai:             'Selesai',
  Ditolak:             'Ditolak',
  Dibatalkan:          'Dibatalkan',
};

type CreateFormValues = {
  nomorAkta:  string;
  judul:      string;
  tanggalAkta: Dayjs;
  jenisAkta:  string;
};

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="aktura-skeleton-row">
          <div className="aktura-skeleton-cell" style={{ width: '15%' }} />
          <div className="aktura-skeleton-cell" style={{ width: '30%' }} />
          <div className="aktura-skeleton-cell" style={{ width: '18%' }} />
          <div className="aktura-skeleton-cell" style={{ width: '12%' }} />
          <div className="aktura-skeleton-cell" style={{ width: '12%' }} />
        </div>
      ))}
    </div>
  );
}

export default function AktaList() {
  const navigate = useNavigate();
  const [data, setData]         = useState<AktaListItem[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch]     = useState('');
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const [filterJenis, setFilterJenis]   = useState<string | undefined>();
  const [loading, setLoading]   = useState(false);

  // Generate from template modal
  const [genModal, setGenModal]           = useState(false);
  const [genLoading, setGenLoading]       = useState(false);
  const [genTemplates, setGenTemplates]   = useState<TemplateAktaListItem[]>([]);

  // Modal state
  const [modalOpen, setModalOpen]         = useState(false);
  const [creating, setCreating]           = useState(false);
  const [step, setStep]                   = useState<0 | 1>(0); // 0=form, 1=dokumen
  const [createdAktaId, setCreatedAktaId] = useState<string | null>(null);
  const [form] = Form.useForm<CreateFormValues>();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await aktaService.getAll(page, pageSize, search || undefined, filterStatus, filterJenis);
      setData(res.items);
      setTotal(res.totalCount);
    } catch {
      message.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, filterStatus, filterJenis]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id: string) => {
    try {
      await aktaService.delete(id);
      message.success('Produk berhasil dihapus');
      fetchData();
    } catch {
      message.error('Gagal menghapus produk');
    }
  };

  const handleCreate = async (values: CreateFormValues) => {
    setCreating(true);
    try {
      const result = await aktaService.create({
        nomorAkta:    values.nomorAkta,
        judul:        values.judul,
        tanggalAkta:  values.tanggalAkta.format('YYYY-MM-DD'),
        jenisAkta:    values.jenisAkta,
        status:       'Draft',
        dynamicFields: [],
        paraPihak:    [],
      });
      form.resetFields();
      setCreatedAktaId(result.id);
      setStep(1);
      fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Gagal membuat produk';
      message.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleOpenGenModal = async () => {
    setGenModal(true);
    setGenLoading(true);
    try {
      const res = await templateAktaService.getAll(1, 100);
      setGenTemplates(res.data.items.filter((t) => t.isActive));
    } catch {
      message.error('Gagal memuat daftar template.');
    } finally {
      setGenLoading(false);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setStep(0);
    setCreatedAktaId(null);
    form.resetFields();
  };

  const columns: ColumnsType<AktaListItem> = [
    {
      title: 'Nomor',
      dataIndex: 'nomorAkta',
      key: 'nomorAkta',
      width: 160,
      render: (val, row) => (
        <Button type="link" style={{ padding: 0, fontWeight: 600 }} onClick={() => navigate(`/akta/${row.id}`)}>
          {val}
        </Button>
      ),
    },
    {
      title: 'Judul / Perihal',
      dataIndex: 'judul',
      key: 'judul',
      render: (val, row) => (
        <span style={{ cursor: 'pointer', color: '#1f1f1f' }} onClick={() => navigate(`/akta/${row.id}`)}>
          <FileTextOutlined style={{ marginRight: 6, color: '#8c8c8c' }} />
          {val}
        </span>
      ),
    },
    {
      title: 'Jenis Produk',
      dataIndex: 'jenisAkta',
      key: 'jenisAkta',
      width: 180,
      render: (val) => <Tag>{val}</Tag>,
    },
    {
      title: 'Tanggal',
      dataIndex: 'tanggalAkta',
      key: 'tanggalAkta',
      width: 120,
      render: (val) => dayjs(val).format('DD MMM YYYY'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (val: AktaStatus) => (
        <Badge status={STATUS_COLOR[val]} text={STATUS_LABEL[val]} />
      ),
    },
    {
      title: 'Pihak',
      dataIndex: 'jumlahPihak',
      key: 'jumlahPihak',
      width: 70,
      align: 'center',
      render: (val) => <Tag color="blue">{val}</Tag>,
    },
    {
      title: 'Aksi',
      key: 'action',
      width: 90,
      fixed: 'right',
      render: (_, row) => (
        <Space>
          <Tooltip title="Buka / Edit">
            <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/akta/${row.id}`)} />
          </Tooltip>
          <Popconfirm title="Hapus produk ini?" onConfirm={() => handleDelete(row.id)} okText="Ya" cancelText="Tidak">
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Daftar Produk Notaris</h2>
        <Space>
          <Tooltip title="Generate akta baru dari template yang sudah ada">
            <Button icon={<ThunderboltOutlined />} onClick={handleOpenGenModal}>
              Generate dari Template
            </Button>
          </Tooltip>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setStep(0); setModalOpen(true); }}>
            Buat Produk
          </Button>
        </Space>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Input.Search
          placeholder="Cari nomor atau judul..."
          allowClear
          onSearch={val => { setSearch(val); setPage(1); }}
          style={{ width: 280 }}
        />
        <Select
          placeholder="Semua Status"
          allowClear
          style={{ width: 180 }}
          onChange={v => { setFilterStatus(v); setPage(1); }}
          options={[
            { value: 'Draft',               label: 'Draft' },
            { value: 'MenungguPersetujuan',  label: 'Menunggu Persetujuan' },
            { value: 'DalamProses',          label: 'Dalam Proses' },
            { value: 'Selesai',              label: 'Selesai' },
            { value: 'Dibatalkan',           label: 'Dibatalkan' },
          ]}
        />
        <Select
          placeholder="Semua Jenis"
          allowClear
          showSearch
          style={{ width: 220 }}
          onChange={v => { setFilterJenis(v); setPage(1); }}
          options={JENIS_PRODUK.map(j => ({ value: j, label: j }))}
        />
      </div>

      {loading && data.length === 0 ? (
        <TableSkeleton rows={pageSize} />
      ) : (
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading && data.length > 0}
        scroll={{ x: 900 }}
        onRow={() => ({ style: { cursor: 'pointer' } })}
        locale={{
          emptyText: (
            <div className="aktura-table-empty">
              <div className="aktura-table-empty-icon">
                <FileTextOutlined style={{ fontSize: 22, color: '#C6A75E' }} />
              </div>
              <div className="aktura-table-empty-title">Belum ada akta tercatat</div>
              <div className="aktura-table-empty-desc">
                Mulai buat akta baru atau generate dari template yang tersedia.
              </div>
              <Button type="primary" size="small" icon={<PlusOutlined />}
                onClick={() => { setStep(0); setModalOpen(true); }}
                style={{ background: '#1B365D', borderColor: '#1B365D', marginTop: 8 }}>
                Buat Akta
              </Button>
            </div>
          ),
        }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: t => `Total ${t} produk`,
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
        }}
      />
      )}

      {/* ── Generate dari Template Modal ── */}
      <Modal
        title={<Space><ThunderboltOutlined />Generate Akta dari Template</Space>}
        open={genModal}
        onCancel={() => setGenModal(false)}
        footer={null}
        width={560}
        destroyOnClose
      >
        {genLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        ) : genTemplates.length === 0 ? (
          <Empty
            image={<LayoutOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
            imageStyle={{ height: 60 }}
            description="Belum ada template akta yang tersedia"
          >
            <Alert
              type="info"
              showIcon
              message="Buat template terlebih dahulu"
              description="Template akta berisi format dan placeholder yang akan diisi saat generate. Setelah template dibuat, tombol Generate akan tersedia di sini."
              style={{ marginBottom: 16, textAlign: 'left' }}
            />
            <Button
              type="primary"
              icon={<LayoutOutlined />}
              onClick={() => { setGenModal(false); navigate('/template-akta/buat'); }}
            >
              Buat Template Akta
            </Button>
          </Empty>
        ) : (
          <List
            dataSource={genTemplates}
            renderItem={(t) => (
              <List.Item
                actions={[
                  <Button
                    key="gen"
                    type="primary"
                    size="small"
                    icon={<ThunderboltOutlined />}
                    onClick={() => { setGenModal(false); navigate(`/template-akta/${t.id}/generate`); }}
                  >
                    Pilih
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={t.nama}
                  description={
                    <Space>
                      <Tag>{t.jenisAkta}</Tag>
                      {t.deskripsi && <span style={{ fontSize: 12, color: '#8c8c8c' }}>{t.deskripsi}</span>}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Modal>

      {/* ── Create Modal (2 langkah) ── */}
      <Modal
        title={step === 0 ? 'Buat Produk Baru' : (
          <span>
            <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
            Produk Disimpan sebagai Draft
          </span>
        )}
        open={modalOpen}
        onCancel={handleModalClose}
        width={600}
        destroyOnClose
        footer={
          step === 0 ? [
            <Button key="cancel" onClick={handleModalClose}>Batal</Button>,
            <Button key="save" type="primary" loading={creating} onClick={() => form.submit()}>
              Simpan Draft
            </Button>,
          ] : [
            <Button key="close" onClick={handleModalClose}>Tutup</Button>,
            <Button key="open" type="primary" onClick={() => navigate(`/akta/${createdAktaId}`)}>
              Buka Detail
            </Button>,
          ]
        }
      >
        {/* Langkah 1: Form */}
        {step === 0 && (
          <Form form={form} layout="vertical" onFinish={handleCreate} style={{ marginTop: 16 }}>
            <Form.Item label="Nomor" name="nomorAkta" rules={[{ required: true, message: 'Wajib diisi' }]}>
              <Input placeholder="Contoh: 001/NOT/III/2026" />
            </Form.Item>
            <Form.Item label="Judul / Perihal" name="judul" rules={[{ required: true, message: 'Wajib diisi' }]}>
              <Input placeholder="Contoh: Akta Jual Beli Tanah dan Bangunan" />
            </Form.Item>
            <Form.Item label="Tanggal" name="tanggalAkta" rules={[{ required: true, message: 'Wajib diisi' }]}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item label="Jenis Produk" name="jenisAkta" rules={[{ required: true, message: 'Wajib diisi' }]}>
              <Select
                showSearch
                placeholder="Pilih jenis produk..."
                options={JENIS_PRODUK.map(j => ({ value: j, label: j }))}
                filterOption={(input, opt) =>
                  (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
          </Form>
        )}

        {/* Langkah 2: Upload dokumen */}
        {step === 1 && createdAktaId && (
          <div>
            <Alert
              type="success"
              message="Produk berhasil disimpan sebagai Draft"
              description="Ajukan persetujuan ke Notaris dari halaman detail setelah mengisi data dan dokumen."
              showIcon
              style={{ marginBottom: 20 }}
            />
            <div style={{ fontSize: 13, fontWeight: 600, color: '#595959', marginBottom: 12 }}>
              Upload Dokumen Warkah
              <span style={{ fontSize: 11, fontWeight: 400, color: '#bfbfbf', marginLeft: 8 }}>
                (opsional — dapat ditambah kapan saja)
              </span>
            </div>
            <DokumenWarkahSection aktaId={createdAktaId} />
          </div>
        )}
      </Modal>
    </div>
  );
}

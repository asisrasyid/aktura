import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table, Button, Select, Input, DatePicker, Space, Tag, Typography, Row, Col,
  Statistic, Card, Tooltip, message,
} from 'antd';
import {
  PlusOutlined, SearchOutlined, FileTextOutlined,
  DollarOutlined, CheckCircleOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import { invoiceService } from '../../services/invoice.service';
import type { InvoiceListItem, InvoiceSummary } from '../../types';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const STATUS_OPTIONS = [
  { value: '',                   label: 'Semua Status' },
  { value: 'DRAFT',              label: 'Draft' },
  { value: 'TERKIRIM',          label: 'Terkirim' },
  { value: 'MENUNGGU_VERIFIKASI', label: 'Menunggu Verifikasi' },
  { value: 'LUNAS',             label: 'Lunas' },
  { value: 'DIBATALKAN',        label: 'Dibatalkan' },
];

const STATUS_TAG: Record<string, { color: string; label: string }> = {
  DRAFT:               { color: 'default',   label: 'Draft' },
  TERKIRIM:            { color: 'blue',      label: 'Terkirim' },
  MENUNGGU_VERIFIKASI: { color: 'gold',      label: 'Menunggu Verifikasi' },
  LUNAS:               { color: 'green',     label: 'Lunas' },
  DIBATALKAN:          { color: 'red',       label: 'Dibatalkan' },
};

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="aktura-skeleton-row">
          <div className="aktura-skeleton-cell" style={{ width: '15%' }} />
          <div className="aktura-skeleton-cell" style={{ width: '25%' }} />
          <div className="aktura-skeleton-cell" style={{ width: '12%' }} />
          <div className="aktura-skeleton-cell" style={{ width: '10%' }} />
          <div className="aktura-skeleton-cell" style={{ width: '15%' }} />
        </div>
      ))}
    </div>
  );
}

export default function InvoiceList() {
  const navigate = useNavigate();
  const [items, setItems]     = useState<InvoiceListItem[]>([]);
  const [total, setTotal]     = useState(0);
  const [summary, setSummary] = useState<InvoiceSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage]       = useState(1);
  const [filter, setFilter]   = useState({
    status: '', search: '', dateFrom: '', dateTo: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, sumRes] = await Promise.all([
        invoiceService.getList({ ...filter, page, pageSize: 20 }),
        invoiceService.getSummary(),
      ]);
      setItems(listRes.items);
      setTotal(listRes.total);
      setSummary(sumRes);
    } catch {
      message.error('Gagal memuat data invoice.');
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => { load(); }, [load]);

  const columns = [
    {
      title: 'No. Invoice',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      render: (v: string, row: InvoiceListItem) => (
        <Button type="link" style={{ padding: 0, color: '#1B365D', fontWeight: 600 }}
          onClick={() => navigate(`/akuntansi/${row.id}`)}>
          {v}
        </Button>
      ),
    },
    { title: 'Klien', dataIndex: 'klienNama', key: 'klienNama' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => {
        const cfg = STATUS_TAG[s] ?? { color: 'default', label: s };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    { title: 'Tgl Terbit', dataIndex: 'issueDate', key: 'issueDate' },
    { title: 'Jatuh Tempo', dataIndex: 'dueDate', key: 'dueDate' },
    {
      title: 'Total',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      align: 'right' as const,
      render: (v: number) => <Text strong>{fmt(v)}</Text>,
    },
    {
      title: '',
      key: 'action',
      width: 80,
      render: (_: unknown, row: InvoiceListItem) => (
        <Tooltip title="Lihat Detail">
          <Button size="small" icon={<FileTextOutlined />}
            onClick={() => navigate(`/akuntansi/${row.id}`)} />
        </Tooltip>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
        <Col>
          <Title level={4} style={{ margin: 0, color: '#1B365D', fontFamily: "'Playfair Display', Georgia, serif" }}>
            Invoice
          </Title>
          <Text type="secondary">Kelola tagihan dan pembayaran klien</Text>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />}
            onClick={() => navigate('/akuntansi/buat')}
            style={{ background: '#1B365D', borderColor: '#1B365D' }}>
            Buat Invoice
          </Button>
        </Col>
      </Row>

      {/* Summary Cards */}
      {summary && (
        <Row gutter={16} style={{ marginBottom: 20 }}>
          {[
            { title: 'Total Tagihan', value: summary.totalTagihan, icon: <DollarOutlined />, color: '#1B365D' },
            { title: 'Sudah Lunas',   value: summary.totalLunas,   icon: <CheckCircleOutlined />, color: '#52c41a' },
            { title: 'Belum Lunas',   value: summary.totalPending, icon: <ClockCircleOutlined />, color: '#C6A75E' },
          ].map(s => (
            <Col xs={24} sm={8} key={s.title}>
              <Card bodyStyle={{ padding: '16px 20px' }}
                style={{ borderTop: `3px solid ${s.color}`, borderRadius: 8 }}>
                <Statistic
                  title={<Text style={{ fontSize: 12, color: '#666' }}>{s.title}</Text>}
                  value={s.value}
                  formatter={v => fmt(Number(v))}
                  prefix={<span style={{ color: s.color }}>{s.icon}</span>}
                  valueStyle={{ fontSize: 18, color: '#2F2F2F', fontWeight: 600 }}
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Filter Bar */}
      <Card style={{ marginBottom: 16, borderRadius: 8 }} bodyStyle={{ padding: '12px 16px' }}>
        <Space wrap>
          <Input
            placeholder="Cari nomor invoice / klien..."
            prefix={<SearchOutlined />}
            style={{ width: 250 }}
            value={filter.search}
            onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
            onPressEnter={load}
            allowClear
          />
          <Select
            style={{ width: 200 }}
            value={filter.status}
            onChange={v => setFilter(f => ({ ...f, status: v }))}
            options={STATUS_OPTIONS}
          />
          <RangePicker
            format="DD/MM/YYYY"
            onChange={dates => setFilter(f => ({
              ...f,
              dateFrom: dates?.[0]?.format('YYYY-MM-DD') ?? '',
              dateTo:   dates?.[1]?.format('YYYY-MM-DD') ?? '',
            }))}
          />
          <Button onClick={load} icon={<SearchOutlined />}>Cari</Button>
        </Space>
      </Card>

      {/* Table */}
      <Card style={{ borderRadius: 8 }} bodyStyle={{ padding: 0 }}>
        {loading && items.length === 0 ? (
          <TableSkeleton rows={20} />
        ) : (
        <Table
          columns={columns}
          dataSource={items}
          rowKey="id"
          loading={loading && items.length > 0}
          locale={{
            emptyText: (
              <div className="aktura-table-empty">
                <div className="aktura-table-empty-icon">
                  <DollarOutlined style={{ fontSize: 22, color: '#C6A75E' }} />
                </div>
                <div className="aktura-table-empty-title">Belum ada invoice</div>
                <div className="aktura-table-empty-desc">
                  Buat invoice pertama untuk klien Anda dan mulai kelola penagihan.
                </div>
                <Button type="primary" size="small" icon={<PlusOutlined />}
                  onClick={() => navigate('/akuntansi/buat')}
                  style={{ background: '#1B365D', borderColor: '#1B365D', marginTop: 8 }}>
                  Buat Invoice
                </Button>
              </div>
            ),
          }}
          pagination={{
            total,
            current: page,
            pageSize: 20,
            onChange: p => setPage(p),
            showTotal: t => `Total ${t} invoice`,
          }}
          size="middle"
        />
        )}
      </Card>
    </div>
  );
}

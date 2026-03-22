import { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Input, Select, Space, Popconfirm,
  message, Typography, Tooltip,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  WarningOutlined, ReadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import {
  registerAktaService,
  type JenisBuku,
  type RegisterAktaListItem,
  type RegisterSummary,
  type CreateRegisterAktaRequest,
  type UpdateRegisterAktaRequest,
} from '../../services/registerAkta.service';
import RegisterEntryDrawer from './components/RegisterEntryDrawer';

dayjs.locale('id');

const { Text } = Typography;

// ── Design tokens (Notion palette) ───────────────────────────────
const T = {
  text:    '#37352f',
  muted:   '#9b9a97',
  faint:   '#b7b5b0',
  border:  '#e9e9e7',
  hover:   '#f7f7f5',
  active:  '#efefec',
};

// ── Jenis buku metadata ──────────────────────────────────────────
const JENIS_META: Record<string, { label: string; bg: string; color: string }> = {
  REPERTORIUM: { label: 'Repertorium',  bg: '#e8e3ff', color: '#7c6dba' },
  AKTA:        { label: 'Buku Akta',    bg: '#d3e5ef', color: '#4a7fa5' },
  LEGALITAS:   { label: 'Legalitas',    bg: '#dbeddb', color: '#448844' },
  WAARMERKING: { label: 'Waarmerking',  bg: '#fdecc8', color: '#b37a2c' },
  PROTES:      { label: 'Protes',       bg: '#ffd6d6', color: '#c44444' },
  WASIAT:      { label: 'Wasiat',       bg: '#ffe2dd', color: '#c94a2e' },
};

const ALL_JENIS: JenisBuku[] = [
  'REPERTORIUM', 'AKTA', 'LEGALITAS', 'WAARMERKING', 'PROTES', 'WASIAT',
];

const BULAN_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: dayjs().month(i).format('MMMM'),
}));

const currentYear = dayjs().year();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => ({
  value: currentYear - i,
  label: String(currentYear - i),
}));

// ── Sub-components ───────────────────────────────────────────────

function JenisBadge({ value }: { value: string }) {
  const m = JENIS_META[value];
  if (!m) return <Text style={{ color: T.muted, fontSize: 12 }}>{value}</Text>;
  return (
    <span style={{
      padding: '2px 8px',
      borderRadius: 4,
      background: m.bg,
      color: m.color,
      fontSize: 11,
      fontWeight: 500,
      letterSpacing: 0.1,
      whiteSpace: 'nowrap',
    }}>
      {m.label}
    </span>
  );
}

function FilterTab({
  label, count, active, onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display:    'inline-flex',
        alignItems: 'center',
        gap:        5,
        padding:    '5px 10px',
        border:     'none',
        borderRadius: 6,
        background: active ? T.active : 'transparent',
        cursor:     'pointer',
        color:      active ? T.text : T.muted,
        fontSize:   13,
        fontWeight: active ? 600 : 400,
        whiteSpace: 'nowrap',
        transition: 'all 0.12s',
        flexShrink: 0,
      }}
    >
      {label}
      <span style={{
        minWidth:        18,
        height:          18,
        padding:         '0 4px',
        borderRadius:    10,
        background:      active ? T.text : '#e9e9e7',
        color:           active ? '#fff' : '#787774',
        fontSize:        10,
        fontWeight:      600,
        display:         'inline-flex',
        alignItems:      'center',
        justifyContent:  'center',
        lineHeight:      1,
      }}>
        {count}
      </span>
    </button>
  );
}

// ── Table row hover style injection ─────────────────────────────
const GLOBAL_STYLE = `
  .ra-table .ant-table-thead .ant-table-cell {
    background: #fff !important;
    font-size: 11px !important;
    color: #b7b5b0 !important;
    font-weight: 600 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.6px !important;
    border-bottom: 1px solid #e9e9e7 !important;
    padding-top: 8px !important;
    padding-bottom: 8px !important;
  }
  .ra-table .ant-table-tbody .ant-table-row:hover .ant-table-cell {
    background: #f7f7f5 !important;
  }
  .ra-table .ant-table-tbody .ant-table-cell {
    border-bottom: 1px solid #f3f3f1 !important;
    transition: background 0.1s;
  }
  .ra-table .ant-table {
    border-radius: 0 !important;
  }
  .ra-table .ant-table-wrapper {
    border-top: 1px solid #e9e9e7;
  }
  .ra-table .ant-pagination {
    margin: 12px 0 0 !important;
  }
`;

// ── Main page ────────────────────────────────────────────────────
export default function RegisterAkta() {
  const [data, setData]             = useState<RegisterAktaListItem[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [pageSize]                  = useState(20);
  const [search, setSearch]         = useState('');
  const [activeJenis, setActiveJenis] = useState<string>('semua');
  const [filterTahun, setFilterTahun] = useState<number>(currentYear);
  const [filterBulan, setFilterBulan] = useState<number | undefined>();
  const [loading, setLoading]       = useState(false);
  const [summary, setSummary]       = useState<RegisterSummary[]>([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editTarget, setEditTarget] = useState<RegisterAktaListItem | null>(null);
  const [editDetail, setEditDetail] = useState<import('../../services/registerAkta.service').RegisterAktaDetail | null>(null);

  // ── Fetching ──────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await registerAktaService.getAll({
        jenisBuku: activeJenis === 'semua' ? undefined : activeJenis,
        tahun:     filterTahun,
        bulan:     filterBulan,
        search:    search || undefined,
        page,
        pageSize,
      });
      setData(res.items);
      setTotal(res.totalCount);
    } catch {
      message.error('Gagal memuat data register');
    } finally {
      setLoading(false);
    }
  }, [activeJenis, filterTahun, filterBulan, search, page, pageSize]);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await registerAktaService.getSummary(filterTahun);
      setSummary(res);
    } catch { /* silent */ }
  }, [filterTahun]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  // ── Helpers ──────────────────────────────────────────────────
  const getCount = (jenis: string) =>
    summary.find(s => s.jenisBuku === jenis)?.total ?? 0;
  const totalAll = summary.reduce((acc, s) => acc + s.total, 0);

  const openCreate = () => {
    setEditTarget(null);
    setEditDetail(null);
    setDrawerOpen(true);
  };

  const openEdit = async (row: RegisterAktaListItem) => {
    setEditTarget(row);
    try {
      const detail = await registerAktaService.getById(row.id);
      setEditDetail(detail);
    } catch {
      message.error('Gagal memuat detail entri');
      return;
    }
    setDrawerOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await registerAktaService.delete(id);
      message.success('Entri berhasil dihapus');
      fetchData();
      fetchSummary();
    } catch {
      message.error('Gagal menghapus entri');
    }
  };

  const handleSubmit = async (
    values: CreateRegisterAktaRequest | UpdateRegisterAktaRequest,
  ) => {
    setSubmitting(true);
    try {
      if (editTarget) {
        await registerAktaService.update(editTarget.id, values as UpdateRegisterAktaRequest);
        message.success('Entri berhasil diperbarui');
      } else {
        await registerAktaService.create(values as CreateRegisterAktaRequest);
        message.success('Entri berhasil ditambahkan');
      }
      setDrawerOpen(false);
      fetchData();
      fetchSummary();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Gagal menyimpan entri';
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTabChange = (jenis: string) => {
    setActiveJenis(jenis);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setFilterBulan(undefined);
    setPage(1);
  };

  // ── Columns ──────────────────────────────────────────────────
  const columns: ColumnsType<RegisterAktaListItem> = [
    {
      title: 'Nomor',
      dataIndex: 'nomorDisplay',
      width: 96,
      render: (val) => (
        <span style={{
          fontFamily: '"SF Mono", "Fira Code", "Consolas", monospace',
          fontSize:   12,
          fontWeight: 600,
          color:      T.text,
          background: T.active,
          padding:    '2px 7px',
          borderRadius: 4,
          letterSpacing: 0.5,
        }}>
          {val}
        </span>
      ),
    },
    {
      title: 'Tanggal',
      dataIndex: 'tanggal',
      width: 104,
      render: (val) => (
        <span style={{ fontSize: 12.5, color: T.muted }}>
          {dayjs(val).format('D MMM YYYY')}
        </span>
      ),
    },
    ...(activeJenis === 'semua'
      ? [{
          title: 'Buku',
          dataIndex: 'jenisBuku',
          width: 120,
          render: (val: string) => <JenisBadge value={val} />,
        }]
      : []),
    {
      title: 'Perihal',
      dataIndex: 'judulSingkat',
      render: (val, row) => (
        <div>
          <div style={{
            fontSize:   13,
            color:      T.text,
            fontWeight: 500,
            lineHeight: 1.45,
          }}>
            {val}
          </div>
          {row.paraPihak && (
            <div style={{
              fontSize:   11.5,
              color:      T.muted,
              marginTop:  2,
              lineHeight: 1.35,
            }}>
              {row.paraPihak}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '',
      width: 28,
      render: (_, row) =>
        row.statusLaporan === 'BELUM' ? (
          <Tooltip title="Wasiat belum dilaporkan ke DPW" placement="left">
            <WarningOutlined style={{ color: '#e6a817', fontSize: 14 }} />
          </Tooltip>
        ) : null,
    },
    {
      title: '',
      key: 'action',
      width: 72,
      fixed: 'right',
      render: (_, row) => (
        <Space size={0}>
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined style={{ fontSize: 13 }} />}
              style={{ color: T.faint }}
              onClick={() => openEdit(row)}
            />
          </Tooltip>
          <Popconfirm
            title="Hapus entri ini?"
            description="Tindakan ini tidak dapat dibatalkan."
            onConfirm={() => handleDelete(row.id)}
            okText="Hapus"
            cancelText="Batal"
            okButtonProps={{ danger: true, size: 'small' }}
            cancelButtonProps={{ size: 'small' }}
          >
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined style={{ fontSize: 13 }} />}
              style={{ color: T.faint }}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ── Render ────────────────────────────────────────────────────
  return (
    <div style={{ color: T.text, minHeight: '100%' }}>
      <style>{GLOBAL_STYLE}</style>

      {/* ── Header ── */}
      <div style={{
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'flex-start',
        paddingBottom:  18,
        borderBottom:   `1px solid ${T.border}`,
      }}>
        <div>
          <div style={{
            display:    'flex',
            alignItems: 'center',
            gap:        8,
            marginBottom: 3,
          }}>
            <ReadOutlined style={{ fontSize: 15, color: T.muted }} />
            <span style={{
              fontSize:      19,
              fontWeight:    700,
              color:         T.text,
              letterSpacing: -0.4,
            }}>
              Register Akta
            </span>
          </div>
          <span style={{ fontSize: 13, color: T.muted }}>
            Buku Daftar Notaris &amp; PPAT — {filterTahun}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Select
            value={filterTahun}
            onChange={(v) => { setFilterTahun(v); setPage(1); }}
            options={YEAR_OPTIONS}
            size="small"
            style={{ width: 80 }}
            variant="borderless"
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreate}
            style={{ borderRadius: 6 }}
          >
            Tambah Entri
          </Button>
        </div>
      </div>

      {/* ── Filter tabs (replaces cards + old tabs) ── */}
      <div style={{
        display:      'flex',
        alignItems:   'center',
        gap:          2,
        overflowX:    'auto',
        padding:      '10px 0',
        borderBottom: `1px solid ${T.border}`,
        marginBottom: 14,
        scrollbarWidth: 'none',
      }}>
        <FilterTab
          label="Semua"
          count={totalAll}
          active={activeJenis === 'semua'}
          onClick={() => handleTabChange('semua')}
        />
        <span style={{
          width: 1, height: 16,
          background: T.border,
          flexShrink: 0,
          margin: '0 4px',
        }} />
        {ALL_JENIS.map((j) => (
          <FilterTab
            key={j}
            label={JENIS_META[j]?.label ?? j}
            count={getCount(j)}
            active={activeJenis === j}
            onClick={() => handleTabChange(j)}
          />
        ))}
      </div>

      {/* ── Search & filter row ── */}
      <div style={{
        display:       'flex',
        alignItems:    'center',
        gap:           8,
        marginBottom:  12,
        flexWrap:      'wrap',
      }}>
        <Input.Search
          placeholder="Cari nomor, perihal, pihak..."
          allowClear
          onSearch={(v) => { setSearch(v); setPage(1); }}
          style={{ width: 260 }}
          size="small"
        />
        <Select
          placeholder="Semua Bulan"
          allowClear
          onChange={(v) => { setFilterBulan(v); setPage(1); }}
          options={BULAN_OPTIONS}
          style={{ width: 146 }}
          size="small"
          value={filterBulan}
        />
        {(search || filterBulan !== undefined) && (
          <Button
            size="small"
            type="text"
            style={{ color: T.muted, fontSize: 12 }}
            onClick={clearFilters}
          >
            Reset filter
          </Button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: T.faint }}>
          {!loading && `${total} entri`}
        </span>
      </div>

      {/* ── Table ── */}
      <div className="ra-table">
        <Table
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={data}
          loading={loading}
          scroll={{ x: 640 }}
          locale={{
            emptyText: (
              <div style={{
                padding:   '40px 0',
                textAlign: 'center',
                color:     T.muted,
              }}>
                <ReadOutlined style={{ fontSize: 28, marginBottom: 10, display: 'block', color: T.border }} />
                <div style={{ fontSize: 14, fontWeight: 500, color: T.muted }}>
                  Belum ada entri
                </div>
                <div style={{ fontSize: 12, color: T.faint, marginTop: 4 }}>
                  Klik <strong>Tambah Entri</strong> untuk mulai mencatat
                </div>
              </div>
            ),
          }}
          pagination={{
            current:   page,
            pageSize,
            total,
            onChange:  (p) => setPage(p),
            simple:    true,
            showTotal: (t) => (
              <span style={{ fontSize: 12, color: T.muted }}>{t} entri</span>
            ),
          }}
        />
      </div>

      {/* ── Drawer ── */}
      <RegisterEntryDrawer
        open={drawerOpen}
        defaultJenisBuku={activeJenis !== 'semua' ? (activeJenis as JenisBuku) : undefined}
        editData={editDetail}
        loading={submitting}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

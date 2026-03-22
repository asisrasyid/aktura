import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Select, Button, Spin, Empty, Alert } from 'antd';
import { PrinterOutlined, BookOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { registerAktaService, type RegisterAktaListItem, type JenisBuku } from '../../services/registerAkta.service';

dayjs.locale('id');

// ── Types ────────────────────────────────────────────────────
type AnyDetail = Record<string, string | undefined>;

// ── Constants ────────────────────────────────────────────────
const JENIS_OPTIONS: { value: JenisBuku; label: string }[] = [
  { value: 'REPERTORIUM', label: 'Repertorium' },
  { value: 'AKTA',        label: 'Buku Akta' },
  { value: 'LEGALITAS',   label: 'Buku Legalitas' },
  { value: 'WAARMERKING', label: 'Buku Waarmerking' },
  { value: 'PROTES',      label: 'Buku Protes' },
  { value: 'WASIAT',      label: 'Buku Wasiat' },
];

const currentYear = dayjs().year();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => ({
  value: currentYear - i,
  label: String(currentYear - i),
}));

const HARI_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function hariDariTanggal(tanggal: string) {
  return HARI_ID[new Date(tanggal).getDay()];
}

function parseDetail(detailJson?: string | null): AnyDetail {
  if (!detailJson) return {};
  try { return JSON.parse(detailJson) as AnyDetail; }
  catch { return {}; }
}

// ── Column definitions per jenis ─────────────────────────────
type ColDef = {
  title: string;
  width?: string | number;
  render: (row: RegisterAktaListItem) => React.ReactNode;
};

function getColumns(jenis: JenisBuku): ColDef[] {
  switch (jenis) {
    case 'REPERTORIUM':
      return [
        {
          title: 'No.',
          width: 44,
          render: r => <b>{r.nomorDisplay}</b>,
        },
        {
          title: 'Hari',
          width: 64,
          render: r => hariDariTanggal(r.tanggal),
        },
        {
          title: 'Tanggal',
          width: 96,
          render: r => dayjs(r.tanggal).format('D MMM YYYY'),
        },
        {
          title: 'Perihal Akta',
          render: r => r.judulSingkat,
        },
        {
          title: 'Nama Para Penghadap',
          width: '28%',
          render: r => r.paraPihak ?? '—',
        },
        {
          title: 'Keterangan',
          width: '18%',
          render: r => r.keterangan ?? '',
        },
      ];

    case 'AKTA': {
      return [
        { title: 'No.',    width: 44,  render: r => <b>{r.nomorDisplay}</b> },
        { title: 'Tanggal', width: 96, render: r => dayjs(r.tanggal).format('D MMM YYYY') },
        { title: 'Jenis Akta', width: 120, render: r => parseDetail(r.detailJson)?.jenisAkta ?? '—' },
        { title: 'Perihal Akta', render: r => r.judulSingkat },
        { title: 'Para Pihak', width: '26%', render: r => r.paraPihak ?? '—' },
        { title: 'Saksi 1 / Saksi 2', width: 160, render: r => {
          const d = parseDetail(r.detailJson);
          if (d.saksi1 || d.saksi2) return `${d.saksi1 ?? '—'} / ${d.saksi2 ?? '—'}`;
          return '';
        }},
        { title: 'Keterangan', width: '14%', render: r => r.keterangan ?? '' },
      ];
    }

    case 'WASIAT': {
      return [
        { title: 'No.',    width: 44,  render: r => <b>{r.nomorDisplay}</b> },
        { title: 'Tanggal', width: 96, render: r => dayjs(r.tanggal).format('D MMM YYYY') },
        { title: 'Nama Pewasiat', width: '24%', render: r => r.paraPihak ?? '—' },
        { title: 'Jenis Wasiat', width: 110, render: r => parseDetail(r.detailJson)?.jenisWasiat ?? '—' },
        { title: 'Status Laporan ke DPW', width: 130, render: r => (
          <span style={{ color: r.statusLaporan === 'SUDAH' ? '#448844' : '#c44444', fontWeight: 600 }}>
            {r.statusLaporan ?? 'BELUM'}
          </span>
        )},
        { title: 'Tgl Laporan', width: 100, render: r => r.tanggalLaporan ? dayjs(r.tanggalLaporan).format('D MMM YYYY') : '' },
        { title: 'Keterangan', render: r => r.keterangan ?? '' },
      ];
    }

    case 'WAARMERKING': {
      return [
        { title: 'No.',    width: 44,  render: r => <b>{r.nomorDisplay}</b> },
        { title: 'Tanggal', width: 96, render: r => dayjs(r.tanggal).format('D MMM YYYY') },
        { title: 'Jenis Dokumen', width: '22%', render: r => parseDetail(r.detailJson)?.jenisDokumen ?? r.judulSingkat },
        { title: 'Yang Menyerahkan / Pemohon', width: '26%', render: r => r.paraPihak ?? '—' },
        { title: 'Jml Lembar', width: 80, render: r => parseDetail(r.detailJson)?.jumlahLembar ?? '' },
        { title: 'Keterangan', render: r => r.keterangan ?? '' },
      ];
    }

    case 'LEGALITAS': {
      return [
        { title: 'No.',    width: 44,  render: r => <b>{r.nomorDisplay}</b> },
        { title: 'Tanggal', width: 96, render: r => dayjs(r.tanggal).format('D MMM YYYY') },
        { title: 'Jenis Dokumen', width: '26%', render: r => parseDetail(r.detailJson)?.jenisDokumen ?? r.judulSingkat },
        { title: 'Pemohon', width: '24%', render: r => r.paraPihak ?? '—' },
        { title: 'Jml Lembar', width: 80, render: r => parseDetail(r.detailJson)?.jumlahLembar ?? '' },
        { title: 'Keterangan', render: r => r.keterangan ?? '' },
      ];
    }

    case 'PROTES': {
      return [
        { title: 'No.',    width: 44,  render: r => <b>{r.nomorDisplay}</b> },
        { title: 'Tanggal', width: 96, render: r => dayjs(r.tanggal).format('D MMM YYYY') },
        { title: 'Jenis Protes', width: 100, render: r => parseDetail(r.detailJson)?.jenisProtes ?? '—' },
        { title: 'Perihal / Pemegang Surat', render: r => r.judulSingkat },
        { title: 'Yang Diprotes / Pihak', width: '22%', render: r => r.paraPihak ?? '—' },
        { title: 'Jumlah Nominal', width: 130, render: r => parseDetail(r.detailJson)?.jumlahNominal ?? '' },
        { title: 'Keterangan', width: '14%', render: r => r.keterangan ?? '' },
      ];
    }

    default:
      return [
        { title: 'No.',    width: 44,  render: r => <b>{r.nomorDisplay}</b> },
        { title: 'Tanggal', width: 96, render: r => dayjs(r.tanggal).format('D MMM YYYY') },
        { title: 'Perihal', render: r => r.judulSingkat },
        { title: 'Para Pihak', width: '30%', render: r => r.paraPihak ?? '—' },
        { title: 'Keterangan', width: '18%', render: r => r.keterangan ?? '' },
      ];
  }
}

// ── Print styles ─────────────────────────────────────────────
const PRINT_STYLE = `
@media print {
  body * { visibility: hidden !important; }
  #buku-register-print, #buku-register-print * { visibility: visible !important; }
  #buku-register-print { position: absolute; left: 0; top: 0; width: 100%; }
  .no-print { display: none !important; }
  .buku-table td, .buku-table th {
    border: 1px solid #555 !important;
    font-size: 9pt !important;
  }
}
`;

// ── Main component ────────────────────────────────────────────
export default function BukuRegister() {
  const [jenis, setJenis]   = useState<JenisBuku>('REPERTORIUM');
  const [tahun, setTahun]   = useState<number>(currentYear);
  const [data, setData]     = useState<RegisterAktaListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const labelJenis = JENIS_OPTIONS.find(o => o.value === jenis)?.label ?? jenis;
  const columns    = getColumns(jenis);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await registerAktaService.getBuku(jenis, tahun);
      setData(result);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setError(`Gagal memuat data (${status ?? 'network error'}). Pastikan stored procedure sudah diperbarui.`);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [jenis, tahun]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePrint = () => window.print();

  // Group by month for section breaks
  const grouped = data.reduce<{ bulan: number; label: string; items: RegisterAktaListItem[] }[]>((acc, row) => {
    const m = dayjs(row.tanggal).month();
    const label = dayjs(row.tanggal).format('MMMM YYYY');
    const existing = acc.find(g => g.bulan === m);
    if (existing) existing.items.push(row);
    else acc.push({ bulan: m, label, items: [row] });
    return acc;
  }, []);

  return (
    <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: '#1a1a1a' }}>
      <style>{PRINT_STYLE}</style>

      {/* ── Mobile notice (P2.4) ── */}
      <div className="buku-register-mobile-notice" style={{
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '48px 24px', gap: 16, textAlign: 'center',
        background: '#F7F6F3', borderRadius: 12, border: '1px solid #E2DDD6',
      }}>
        <BookOutlined style={{ fontSize: 40, color: '#1B365D', opacity: 0.5 }} />
        <div style={{ fontSize: 15, fontWeight: 700, color: '#37352f' }}>
          Buka di Desktop
        </div>
        <p style={{ fontSize: 13, color: '#9b9a97', maxWidth: 280, lineHeight: 1.7, margin: 0 }}>
          Buku Register menampilkan dokumen format legal yang membutuhkan layar lebih lebar untuk dibaca dengan nyaman.
          Silakan buka halaman ini di komputer atau laptop.
        </p>
      </div>

      {/* ── Main content (hidden on mobile) ── */}
      <div className="buku-register-content">

      {/* ── Toolbar (hidden on print) ── */}
      <div className="no-print" style={{
        display: 'flex', alignItems: 'center', gap: 10,
        paddingBottom: 16, borderBottom: '1px solid #e9e9e7', marginBottom: 20,
      }}>
        <BookOutlined style={{ fontSize: 16, color: '#1B365D' }} />
        <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.3, fontFamily: 'system-ui, sans-serif' }}>
          Buku Register
        </span>
        <div style={{ flex: 1 }} />
        {JENIS_OPTIONS.map(o => (
          <button
            key={o.value}
            onClick={() => setJenis(o.value)}
            style={{
              padding: '5px 12px',
              border: 'none',
              borderRadius: 6,
              background: jenis === o.value ? '#1B365D' : '#F7F6F3',
              color: jenis === o.value ? '#fff' : '#6B7280',
              fontWeight: jenis === o.value ? 600 : 400,
              fontSize: 12.5,
              cursor: 'pointer',
              transition: 'all 0.12s',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            {o.label}
          </button>
        ))}
        <div style={{ width: 1, height: 20, background: '#e9e9e7' }} />
        <Select
          value={tahun}
          onChange={setTahun}
          options={YEAR_OPTIONS}
          size="small"
          style={{ width: 80, fontFamily: 'system-ui, sans-serif' }}
          variant="borderless"
        />
        <Button
          icon={<PrinterOutlined />}
          onClick={handlePrint}
          size="small"
          style={{ fontFamily: 'system-ui, sans-serif' }}
        >
          Cetak
        </Button>
      </div>

      {/* ── Printable area ── */}
      <div id="buku-register-print" ref={printRef}>

        {/* Book header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>
            {labelJenis}
          </div>
          <div style={{ fontSize: 11, color: '#555', letterSpacing: 0.5 }}>
            Tahun {tahun}
          </div>
          <div style={{ width: 80, height: 2, background: '#1a1a1a', margin: '8px auto 0' }} />
        </div>

        {error && (
          <Alert type="error" message={error} style={{ marginBottom: 16 }} showIcon />
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin size="large" />
          </div>
        ) : data.length === 0 ? (
          <Empty
            description={`Belum ada entri ${labelJenis} tahun ${tahun}`}
            style={{ padding: '60px 0' }}
          />
        ) : (
          <table
            className="buku-table"
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 12.5,
            }}
          >
            <thead>
              <tr style={{ background: '#EDE9E3' }}>
                {columns.map((col, i) => (
                  <th
                    key={i}
                    style={{
                      border: '1px solid #ccc',
                      padding: '7px 10px',
                      textAlign: 'center',
                      fontWeight: 700,
                      fontSize: 11,
                      letterSpacing: 0.3,
                      whiteSpace: 'nowrap',
                      width: col.width,
                    }}
                  >
                    {col.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grouped.map(group => (
                <React.Fragment key={`group-${group.bulan}`}>
                  {/* Month separator row */}
                  <tr>
                    <td
                      colSpan={columns.length}
                      style={{
                        background: '#efefec',
                        padding: '5px 10px',
                        fontWeight: 700,
                        fontSize: 11,
                        letterSpacing: 0.6,
                        textTransform: 'uppercase',
                        color: '#555',
                        border: '1px solid #ccc',
                      }}
                    >
                      {group.label}
                    </td>
                  </tr>
                  {group.items.map((row, rowIdx) => (
                    <tr
                      key={row.id}
                      style={{ background: rowIdx % 2 === 1 ? '#fafafa' : '#fff' }}
                    >
                      {columns.map((col, colIdx) => (
                        <td
                          key={colIdx}
                          style={{
                            border: '1px solid #ddd',
                            padding: '6px 10px',
                            verticalAlign: 'top',
                            lineHeight: 1.45,
                          }}
                        >
                          {col.render(row)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              ))}

              {/* Summary row */}
              <tr style={{ background: '#EDE9E3' }}>
                <td
                  colSpan={columns.length}
                  style={{
                    border: '1px solid #ccc',
                    padding: '6px 10px',
                    textAlign: 'right',
                    fontWeight: 700,
                    fontSize: 11.5,
                  }}
                >
                  Jumlah Entri: {data.length}
                </td>
              </tr>
            </tbody>
          </table>
        )}

        {/* Book footer */}
        {data.length > 0 && (
          <div style={{ marginTop: 32, fontSize: 11, color: '#777', textAlign: 'right' }}>
            Dicetak: {dayjs().format('D MMMM YYYY, HH:mm')}
          </div>
        )}
      </div>

      </div> {/* end buku-register-content */}
    </div>
  );
}

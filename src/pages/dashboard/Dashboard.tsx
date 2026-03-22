import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Skeleton, message } from 'antd';
import {
  FileTextOutlined, TeamOutlined, BookOutlined,
  CheckCircleOutlined, ClockCircleOutlined, EditOutlined,
  StopOutlined, BellOutlined, FolderOpenOutlined,
  ArrowUpOutlined, ArrowDownOutlined, MinusOutlined,
  ArrowRightOutlined, InboxOutlined, ExclamationCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { useAuthStore } from '../../store/auth.store';
import { dashboardService, type DashboardStats } from '../../services/dashboard.service';

dayjs.locale('id');

// ── Design tokens ─────────────────────────────────────────────
const T = {
  navy:    '#1B365D',
  gold:    '#C6A75E',
  ivory:   '#F7F6F3',
  ink:     '#2F2F2F',
  muted:   '#6B7280',
  faint:   '#9CA3AF',
  border:  '#E2DDD6',
  white:   '#ffffff',
  success: '#16a34a',
  warning: '#d97706',
  danger:  '#dc2626',
  teal:    '#0891b2',
  purple:  '#7c3aed',
  slate:   '#475569',
};

const SERIF = "'Playfair Display', 'EB Garamond', Georgia, serif";
const MONTH = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  Draft:               { label: 'Draft',       color: '#64748b', bg: '#f1f5f9', icon: <EditOutlined /> },
  MenungguPersetujuan: { label: 'Menunggu',     color: '#d97706', bg: '#fffbeb', icon: <ClockCircleOutlined /> },
  DalamProses:         { label: 'Dalam Proses', color: '#2563eb', bg: '#eff6ff', icon: <ClockCircleOutlined /> },
  Selesai:             { label: 'Selesai',      color: '#16a34a', bg: '#f0fdf4', icon: <CheckCircleOutlined /> },
  Ditolak:             { label: 'Ditolak',      color: '#dc2626', bg: '#fef2f2', icon: <StopOutlined /> },
  Dibatalkan:          { label: 'Dibatalkan',   color: '#dc2626', bg: '#fef2f2', icon: <StopOutlined /> },
};

const JENIS_META: Record<string, { label: string; color: string }> = {
  REPERTORIUM: { label: 'Repertorium', color: '#7c3aed' },
  AKTA:        { label: 'Buku Akta',   color: '#2563eb' },
  LEGALITAS:   { label: 'Legalitas',   color: '#16a34a' },
  WAARMERKING: { label: 'Waarmerking', color: '#d97706' },
  PROTES:      { label: 'Protes',      color: '#dc2626' },
  WASIAT:      { label: 'Wasiat',      color: '#be185d' },
  PPAT:        { label: 'PPAT',        color: '#0891b2' },
};

// ── Hooks ─────────────────────────────────────────────────────

function useWindowWidth() {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return w;
}

function useCountUp(target: number, duration = 750) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(ease * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return count;
}

function delta(cur: number, prev: number) {
  if (prev === 0) return cur > 0 ? 100 : 0;
  return Math.round(((cur - prev) / prev) * 100);
}

function relativeTime(createdAt: string): string {
  if (!createdAt) return '';
  const d = dayjs(createdAt);
  const diffMin = dayjs().diff(d, 'minute');
  if (diffMin < 60) return `${diffMin}m lalu`;
  const diffH = dayjs().diff(d, 'hour');
  if (diffH < 24) return `${diffH}j lalu`;
  const diffD = dayjs().diff(d, 'day');
  if (diffD < 7) return `${diffD}h lalu`;
  return d.format('D MMM');
}

// ── KPI Card ──────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, color, accentBg, d, onClick, alert }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub?: string;
  color: string;
  accentBg: string;
  d?: number;
  onClick?: () => void;
  alert?: boolean;
}) {
  const [hov, setHov] = useState(false);
  const counted = useCountUp(value);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: T.white,
        borderRadius: 14,
        padding: '16px 18px 18px',
        cursor: onClick ? 'pointer' : 'default',
        border: `1px solid ${alert ? '#fca5a5' : hov && onClick ? color + '40' : T.border}`,
        boxShadow: hov && onClick
          ? `0 8px 28px ${color}1a`
          : '0 1px 3px rgba(27,54,93,0.06)',
        transform: hov && onClick ? 'translateY(-3px)' : 'none',
        transition: 'all 0.2s cubic-bezier(0.25,0.46,0.45,0.94)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Bottom accent strip */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${color}, ${color}66)`,
        borderRadius: '0 0 14px 14px',
      }} />

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: accentBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 17, color,
        }}>
          {icon}
        </div>
        {d !== undefined ? (
          <span style={{
            display: 'flex', alignItems: 'center', gap: 2,
            fontSize: 10, fontWeight: 700,
            color: d > 0 ? T.success : d < 0 ? T.danger : T.muted,
            background: d > 0 ? '#f0fdf4' : d < 0 ? '#fef2f2' : T.ivory,
            padding: '2px 7px', borderRadius: 20,
          }}>
            {d > 0 ? <ArrowUpOutlined /> : d < 0 ? <ArrowDownOutlined /> : <MinusOutlined />}
            {Math.abs(d)}%
          </span>
        ) : alert ? (
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: T.danger, marginTop: 4 }} />
        ) : null}
      </div>

      {/* Value */}
      <div style={{
        fontSize: 30,
        fontWeight: 800,
        color: T.ink,
        lineHeight: 1,
        letterSpacing: -1,
        fontFamily: SERIF,
        marginBottom: 5,
      }}>
        {counted.toLocaleString('id-ID')}
      </div>

      {/* Label + sub */}
      <div style={{ fontSize: 12, fontWeight: 500, color: T.muted }}>{label}</div>
      {sub && <div style={{ fontSize: 10.5, color: T.faint, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ── SVG Area Sparkline ────────────────────────────────────────

function AreaSparkline({ data }: { data: { bulan: number; jumlah: number }[] }) {
  if (data.length === 0) return null;
  const W = 280;
  const H = 68;
  const pad = { l: 2, r: 2, t: 8, b: 18 };
  const cW = W - pad.l - pad.r;
  const cH = H - pad.t - pad.b;
  const max = Math.max(...data.map(d => d.jumlah), 1);

  const pts = data.map((d, i) => ({
    x: pad.l + (i / (data.length - 1)) * cW,
    y: pad.t + cH - (d.jumlah / max) * cH,
    ...d,
  }));

  // Smooth bezier path
  const linePath = pts.map((p, i) => {
    if (i === 0) return `M${p.x},${p.y}`;
    const prev = pts[i - 1];
    const cpX = (prev.x + p.x) / 2;
    return `C${cpX},${prev.y} ${cpX},${p.y} ${p.x},${p.y}`;
  }).join(' ');

  const areaPath = `${linePath} L${pts[pts.length - 1].x},${H - pad.b} L${pts[0].x},${H - pad.b} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }}>
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={T.gold} stopOpacity="0.4" />
          <stop offset="100%" stopColor={T.gold} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#areaFill)" />
      <path d={linePath} fill="none" stroke={T.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Last point highlight dot */}
      {pts.length > 0 && (
        <circle
          cx={pts[pts.length - 1].x}
          cy={pts[pts.length - 1].y}
          r="4.5" fill={T.gold} stroke="white" strokeWidth="2"
        />
      )}
      {/* Month labels */}
      {pts.map((p, i) => (
        <text key={i} x={p.x} y={H - 2} textAnchor="middle" fontSize="7"
          fill={i === pts.length - 1 ? T.gold : T.faint}
          fontWeight={i === pts.length - 1 ? '700' : '400'}
        >
          {MONTH[p.bulan - 1]}
        </text>
      ))}
    </svg>
  );
}

// ── Panel wrapper ─────────────────────────────────────────────

function Panel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: T.white,
      border: `1px solid ${T.border}`,
      borderRadius: 14,
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(27,54,93,0.05)',
      ...style,
    }}>
      {children}
    </div>
  );
}

function PanelTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexShrink: 0 }}>
      <span style={{
        fontSize: 11, fontWeight: 700, color: T.navy,
        letterSpacing: 0.6, textTransform: 'uppercase',
        borderLeft: `2.5px solid ${T.gold}`, paddingLeft: 8, lineHeight: 1.2,
      }}>
        {children}
      </span>
      {action}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const user     = useAuthStore(s => s.user);
  const [stats, setStats]     = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const width = useWindowWidth();

  const isDesktop = width >= 1200;
  const isTablet  = width >= 768 && width < 1200;
  const isMobile  = width < 640;
  const kpiCols   = isMobile ? 'repeat(2, 1fr)' : width < 900 ? 'repeat(3, 1fr)' : 'repeat(6, 1fr)';
  // Tablet (768-1199px): 2-column layout; Desktop: 3-column; Mobile: stacked
  const mainCols  = isDesktop ? '200px 1fr 196px' : isTablet ? '1fr 220px' : '1fr';

  useEffect(() => {
    dashboardService.getStats()
      .then(setStats)
      .catch(() => message.error('Gagal memuat data dashboard'))
      .finally(() => setLoading(false));
  }, []);

  const jam = dayjs().hour();
  const greeting = jam < 11 ? 'Selamat pagi' : jam < 15 ? 'Selamat siang' : jam < 18 ? 'Selamat sore' : 'Selamat malam';

  const trenData = useMemo(() => {
    if (!stats) return [];
    return Array.from({ length: 6 }, (_, i) => {
      const d = dayjs().subtract(5 - i, 'month');
      return {
        bulan:  d.month() + 1,
        jumlah: stats.trenAkta.find(t => t.tahun === d.year() && t.bulan === d.month() + 1)?.jumlah ?? 0,
      };
    });
  }, [stats]);

  const aktaDelta   = stats ? delta(stats.aktaBulanIni, stats.aktaBulanLalu) : 0;
  const statusOrder = ['Draft','MenungguPersetujuan','DalamProses','Selesai','Ditolak','Dibatalkan'];
  const statusItems = statusOrder.map(s => ({
    status: s,
    jumlah: stats?.aktaPerStatus.find(x => x.status === s)?.jumlah ?? 0,
  }));
  const totalStatus = statusItems.reduce((s, x) => s + x.jumlah, 0) || 1;
  const maxReg      = stats ? Math.max(...stats.registerPerJenis.map(r => r.total), 1) : 1;
  const hasUrgency  = stats ? (stats.draftLama > 0 || stats.approvalPending > 0) : false;

  const containerStyle: React.CSSProperties = isDesktop
    ? {
        margin: '-24px',
        height: 'calc(100vh - 64px)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        padding: '18px 22px',
        gap: 12,
        background: T.ivory,
        boxSizing: 'border-box',
      }
    : {
        margin: isMobile ? '-12px' : '-24px',
        background: T.ivory,
        padding: isMobile ? '14px 12px 24px' : '18px 20px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        boxSizing: 'border-box',
      };

  return (
    <div style={containerStyle}>

      {/* ── HEADER ─────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'flex-start' : 'center',
        justifyContent: 'space-between',
        gap: 10,
        paddingBottom: 14,
        borderBottom: `1px solid ${T.border}`,
      }}>
        <div>
          <div style={{
            fontSize: isMobile ? 18 : 22,
            fontWeight: 700,
            color: T.ink,
            fontFamily: SERIF,
            lineHeight: 1.2,
          }}>
            {greeting},{' '}
            <em style={{ color: T.navy }}>{user?.fullName?.split(' ')[0]}</em>
          </div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>
            {dayjs().format('dddd, D MMMM YYYY')}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/akta')}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '7px 16px', borderRadius: 8, border: 'none',
              background: T.navy, color: '#fff',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.15s',
              boxShadow: `0 2px 8px ${T.navy}40`,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#14294a'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = T.navy; }}
          >
            <PlusOutlined /> Produk Baru
          </button>
          {[
            { label: 'Register', path: '/buku-register' },
            { label: 'Inbox',    path: '/inbox', badge: stats?.approvalPending },
          ].map(b => (
            <button key={b.path} onClick={() => navigate(b.path)} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '7px 14px', borderRadius: 8,
              border: `1px solid ${T.border}`, background: T.white,
              color: T.ink, fontSize: 12, fontWeight: 500, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = T.navy + '60';
                (e.currentTarget as HTMLElement).style.background = T.ivory;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = T.border;
                (e.currentTarget as HTMLElement).style.background = T.white;
              }}
            >
              {b.label}
              {b.badge && b.badge > 0 ? (
                <span style={{
                  background: T.danger, color: '#fff',
                  borderRadius: 10, padding: '0 5px',
                  fontSize: 9.5, fontWeight: 700,
                }}>{b.badge}</span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* ── ALERT BAR ──────────────────────────────────────── */}
      {!loading && hasUrgency && stats && (
        <div style={{
          flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          background: '#FFFCF0',
          border: `1px solid ${T.gold}60`,
          borderLeft: `3px solid ${T.gold}`,
          borderRadius: 9, padding: '8px 14px',
        }}>
          <ExclamationCircleOutlined style={{ color: T.gold, fontSize: 13 }} />
          {stats.draftLama > 0 && (
            <span
              onClick={() => navigate('/akta')}
              style={{ fontSize: 12, color: T.ink, cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.color = T.navy)}
              onMouseLeave={e => (e.currentTarget.style.color = T.ink)}
            >
              <strong style={{ color: '#b45309' }}>{stats.draftLama}</strong> draft &gt;7 hari belum diselesaikan
            </span>
          )}
          {stats.approvalPending > 0 && (
            <span
              onClick={() => navigate('/inbox')}
              style={{ fontSize: 12, color: T.ink, cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.color = T.navy)}
              onMouseLeave={e => (e.currentTarget.style.color = T.ink)}
            >
              <strong style={{ color: T.danger }}>{stats.approvalPending}</strong> persetujuan menunggu
            </span>
          )}
        </div>
      )}

      {/* ── CONTENT ────────────────────────────────────────── */}
      {loading ? (
        <Skeleton active paragraph={{ rows: 12 }} />
      ) : stats ? (
        <>
          {/* KPI STRIP */}
          <div style={{ display: 'grid', gridTemplateColumns: kpiCols, gap: 10, flexShrink: 0 }}>
            <KpiCard
              icon={<FileTextOutlined />}
              label="Total Produk"
              value={stats.totalAkta}
              color={T.navy} accentBg="#E8EEF5"
              onClick={() => navigate('/akta')}
            />
            <KpiCard
              icon={<CheckCircleOutlined />}
              label="Produk Bulan Ini"
              value={stats.aktaBulanIni}
              sub={dayjs().format('MMM YYYY')}
              color={T.gold} accentBg="#FBF5E8"
              d={aktaDelta}
            />
            <KpiCard
              icon={<TeamOutlined />}
              label="Total Klien"
              value={stats.totalKlien}
              color={T.teal} accentBg="#E0F7FA"
              onClick={() => navigate('/klien')}
            />
            <KpiCard
              icon={<BookOutlined />}
              label="Register Tahun Ini"
              value={stats.totalRegisterTahunIni}
              sub={`Tahun ${dayjs().year()}`}
              color={T.purple} accentBg="#EDE9FE"
              onClick={() => navigate('/buku-register')}
            />
            <KpiCard
              icon={<BellOutlined />}
              label="Approval Pending"
              value={stats.approvalPending}
              color={stats.approvalPending > 0 ? T.danger : T.slate}
              accentBg={stats.approvalPending > 0 ? '#FEF2F2' : T.ivory}
              alert={stats.approvalPending > 0}
              onClick={() => navigate('/inbox')}
            />
            <KpiCard
              icon={<FolderOpenOutlined />}
              label="Total Arsip"
              value={stats.totalArsip}
              sub={stats.arsipDipinjam > 0 ? `${stats.arsipDipinjam} dipinjam` : undefined}
              color={T.slate} accentBg="#F1F5F9"
              onClick={() => navigate('/arsip')}
            />
          </div>

          {/* MAIN PANELS */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: mainCols,
            gap: 10,
            flex: isDesktop ? 1 : undefined,
            minHeight: isDesktop ? 0 : undefined,
          }}>

            {/* ── Col 1: Status + Register ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>

              {/* Status Produk */}
              <Panel style={{ flexShrink: 0 }}>
                <PanelTitle>Status Produk</PanelTitle>
                {/* Stacked bar */}
                <div style={{
                  display: 'flex', height: 7, borderRadius: 6,
                  overflow: 'hidden', background: '#F0EFEc', gap: 1.5, marginBottom: 12,
                }}>
                  {statusItems.map(item => {
                    const pct = (item.jumlah / totalStatus) * 100;
                    if (!pct) return null;
                    const meta = STATUS_META[item.status];
                    return (
                      <div
                        key={item.status}
                        title={`${meta?.label}: ${item.jumlah}`}
                        style={{
                          flex: `0 0 ${pct}%`,
                          background: meta?.color ?? T.muted,
                          transition: 'flex 0.5s ease',
                        }}
                      />
                    );
                  })}
                </div>
                {statusItems.filter(x => x.jumlah > 0).map(item => {
                  const meta = STATUS_META[item.status];
                  const pct  = Math.round((item.jumlah / totalStatus) * 100);
                  return (
                    <div key={item.status} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: meta?.color ?? T.muted, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 11.5, color: T.ink }}>{meta?.label ?? item.status}</span>
                      <span style={{ fontSize: 10.5, color: T.muted, minWidth: 26 }}>{pct}%</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: meta?.color ?? T.ink, minWidth: 18, textAlign: 'right' }}>{item.jumlah}</span>
                    </div>
                  );
                })}
              </Panel>

              {/* Register per jenis */}
              <Panel style={{ flex: isDesktop ? 1 : undefined, minHeight: 0 }}>
                <PanelTitle>Register {dayjs().year()}</PanelTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9, overflowY: 'auto', flex: 1 }}>
                  {stats.registerPerJenis.length === 0 ? (
                    <span style={{ fontSize: 12, color: T.muted, fontStyle: 'italic' }}>Belum ada entri register</span>
                  ) : stats.registerPerJenis.map(({ jenisBuku, total }) => {
                    const meta = JENIS_META[jenisBuku];
                    return (
                      <div key={jenisBuku}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 500, color: meta?.color ?? T.ink }}>{meta?.label ?? jenisBuku}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: meta?.color ?? T.ink }}>{total}</span>
                        </div>
                        <div style={{ height: 5, borderRadius: 3, background: '#F0EFEC', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 3,
                            width: `${(total / maxReg) * 100}%`,
                            background: `linear-gradient(90deg, ${meta?.color ?? T.muted}, ${meta?.color ?? T.muted}99)`,
                            transition: 'width 0.5s ease',
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Panel>
            </div>

            {/* ── Col 2: Activity Feed ── */}
            <Panel>
              <PanelTitle
                action={
                  <button
                    onClick={() => navigate('/akta')}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 11, color: T.muted,
                      display: 'flex', alignItems: 'center', gap: 3,
                      transition: 'color 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = T.navy)}
                    onMouseLeave={e => (e.currentTarget.style.color = T.muted)}
                  >
                    Lihat semua <ArrowRightOutlined />
                  </button>
                }
              >
                Aktivitas Terbaru
              </PanelTitle>
              <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                {stats.aktaTerbaru.length === 0 ? (
                  <div style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    height: '100%', gap: 10, padding: 32,
                  }}>
                    <FileTextOutlined style={{ fontSize: 40, color: T.faint }} />
                    <span style={{ fontSize: 13, color: T.muted }}>Belum ada aktivitas</span>
                  </div>
                ) : stats.aktaTerbaru.map((akta, idx) => {
                  const meta = STATUS_META[akta.status];
                  return (
                    <div
                      key={akta.id}
                      onClick={() => navigate(`/akta/${akta.id}`)}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 11,
                        padding: '10px 8px', cursor: 'pointer',
                        borderBottom: idx < stats.aktaTerbaru.length - 1 ? `1px solid ${T.border}` : 'none',
                        transition: 'background 0.12s', borderRadius: 7,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = T.ivory)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Timeline dot */}
                      <div style={{ flexShrink: 0, paddingTop: 5 }}>
                        <div style={{
                          width: 9, height: 9, borderRadius: '50%',
                          background: meta?.color ?? T.muted,
                          boxShadow: `0 0 0 3px ${meta?.bg ?? '#f0f0ee'}`,
                        }} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                          <code style={{
                            fontSize: 9.5, color: T.muted,
                            background: '#F4F3F0', padding: '1px 5px', borderRadius: 4,
                          }}>
                            {akta.nomorAkta}
                          </code>
                          <span style={{
                            fontSize: 9.5, fontWeight: 600,
                            color: meta?.color ?? T.muted,
                            background: meta?.bg ?? '#f0f0ee',
                            padding: '1px 7px', borderRadius: 20,
                          }}>
                            {meta?.label ?? akta.status}
                          </span>
                        </div>
                        <div style={{
                          fontSize: 12.5, fontWeight: 500, color: T.ink,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {akta.judul}
                        </div>
                        <div style={{ fontSize: 10.5, color: T.faint, marginTop: 1 }}>{akta.jenisAkta}</div>
                      </div>

                      <span style={{ fontSize: 10, color: T.faint, whiteSpace: 'nowrap', flexShrink: 0, paddingTop: 2 }}>
                        {relativeTime(akta.createdAt) || dayjs(akta.tanggalAkta).format('D MMM')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Panel>

            {/* ── Col 3: Trend + Quick Nav ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>

              {/* Trend chart */}
              <Panel style={{ flexShrink: 0 }}>
                <PanelTitle>Tren 6 Bulan</PanelTitle>
                <AreaSparkline data={trenData} />
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.border}`,
                }}>
                  <div>
                    <div style={{ fontSize: 10, color: T.muted, marginBottom: 2 }}>Bulan ini</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: T.ink, fontFamily: SERIF, lineHeight: 1 }}>
                      {stats.aktaBulanIni}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: T.muted, marginBottom: 2 }}>Disetujui</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: T.navy, fontFamily: SERIF, lineHeight: 1 }}>
                      {stats.approvalDisetujuiBulanIni}
                    </div>
                  </div>
                </div>
              </Panel>

              {/* Quick Nav */}
              <Panel style={{ flex: isDesktop ? 1 : undefined }}>
                <PanelTitle>Menu Cepat</PanelTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {[
                    { icon: <FileTextOutlined />,  label: 'Daftar Produk',  path: '/akta',          badge: 0,                         color: T.navy   },
                    { icon: <BookOutlined />,       label: 'Buku Register',  path: '/buku-register', badge: 0,                         color: T.purple },
                    { icon: <InboxOutlined />,      label: 'Inbox Approval', path: '/inbox',          badge: stats.approvalPending,     color: T.danger },
                    { icon: <FolderOpenOutlined />, label: 'Arsip',          path: '/arsip',          badge: 0,                         color: T.slate  },
                    { icon: <TeamOutlined />,       label: 'Klien',          path: '/klien',          badge: 0,                         color: T.teal   },
                  ].map(item => (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 9,
                        padding: '8px 10px', borderRadius: 8,
                        border: `1px solid ${T.border}`, background: 'transparent',
                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                        width: '100%',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.background = item.color + '0d';
                        (e.currentTarget as HTMLElement).style.borderColor = item.color + '44';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                        (e.currentTarget as HTMLElement).style.borderColor = T.border;
                      }}
                    >
                      <span style={{ color: item.color, fontSize: 14 }}>{item.icon}</span>
                      <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: T.ink }}>{item.label}</span>
                      {item.badge > 0 ? (
                        <span style={{
                          background: T.danger, color: '#fff',
                          borderRadius: 20, padding: '0 5px',
                          fontSize: 9.5, fontWeight: 700,
                        }}>{item.badge}</span>
                      ) : (
                        <ArrowRightOutlined style={{ fontSize: 9, color: T.faint }} />
                      )}
                    </button>
                  ))}
                </div>
              </Panel>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

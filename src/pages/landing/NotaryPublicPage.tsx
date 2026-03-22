import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Skeleton } from 'antd';
import {
  EnvironmentOutlined, SafetyCertificateOutlined, PhoneOutlined,
  MailOutlined, HomeOutlined, ClockCircleOutlined,
  ArrowLeftOutlined, FileTextOutlined, CalendarOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import api from '../../services/api';
import { NAVY, GOLD, IVORY, INK, MUTED, BORDER } from '../../theme/tokens';

const SERIF = "'EB Garamond', 'Playfair Display', Georgia, serif";
const BODY  = "'Lato', 'Inter', system-ui, sans-serif";

// ── Types ────────────────────────────────────────────────────

type SectionType = 'about' | 'services' | 'contact' | 'trust' | 'testimonials' | 'cta';

interface PageSection  { id: string; type: SectionType; visible: boolean; }
interface PageConfig   { version: 2; sections: PageSection[]; }

const DEFAULT_PAGE_CONFIG: PageConfig = {
  version: 2,
  sections: [
    { id: 's-about',    type: 'about',    visible: true },
    { id: 's-services', type: 'services', visible: true },
    { id: 's-contact',  type: 'contact',  visible: true },
  ],
};

function migrateToPageConfig(raw: unknown): PageConfig {
  if (!raw || typeof raw !== 'object') return DEFAULT_PAGE_CONFIG;
  const obj = raw as Record<string, unknown>;
  if (obj.version === 2 && Array.isArray(obj.sections)) return obj as unknown as PageConfig;
  const V1_MAP: Record<string, SectionType> = { about: 'about', layanan: 'services', kontak: 'contact' };
  const V1_SHOW: Record<string, string>     = { about: 'showAbout', layanan: 'showLayanan', kontak: 'showKontak' };
  const order = Array.isArray(obj.order) ? (obj.order as string[]) : ['about', 'layanan', 'kontak'];
  return {
    version: 2,
    sections: order.map((k, i) => ({
      id:      `s-${i}-${k}`,
      type:    V1_MAP[k] ?? 'about',
      visible: typeof obj[V1_SHOW[k]] === 'boolean' ? (obj[V1_SHOW[k]] as boolean) : true,
    })),
  };
}

interface NotarisDetail {
  namaLengkap:       string;
  slug:              string | null;
  wilayah:           string | null;
  spesialisasi:      string[];
  nomorSK:           string | null;
  foto:              string | null;
  cover:             string | null;
  deskripsi:         string | null;
  tagline:           string | null;
  bioPanjang:        string | null;
  tahunMulaiPraktik: number | null;
  telepon:           string | null;
  emailPublik:       string | null;
  alamatKantor:      string | null;
  jamOperasional:    string | null;
  jumlahAkta:        number;
  sectionConfig:     string | null;
}

// ── Helpers ──────────────────────────────────────────────────

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, inView };
}

const SERVICE_COLORS: Record<string, string> = {
  'Jual Beli Tanah': '#16a34a',
  'Fidusia':         '#0369a1',
  'Pendirian PT':    '#7c3aed',
  'Waris':           '#b45309',
  'Hibah':           '#be185d',
  'PPAT':            '#0f766e',
};

function serviceColor(s: string): string {
  for (const [k, v] of Object.entries(SERVICE_COLORS)) {
    if (s.toLowerCase().includes(k.toLowerCase())) return v;
  }
  return NAVY;
}

// ── Component ────────────────────────────────────────────────

export default function NotaryPublicPage() {
  const { slug }    = useParams<{ slug: string }>();
  const navigate    = useNavigate();
  const [data, setData]         = useState<NotarisDetail | null>(null);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);

  const aboutSection        = useInView(0.15);
  const serviceSection      = useInView(0.15);
  const contactSection      = useInView(0.15);
  const testimonialsSection = useInView(0.15);

  useEffect(() => {
    if (!slug) { setNotFound(true); setLoading(false); return; }
    api.get(`/public/notaris/${slug}`)
      .then(r => setData(r.data))
      .catch(err => { if (err?.response?.status === 404) setNotFound(true); })
      .finally(() => setLoading(false));
  }, [slug]);

  const tahunPengalaman = data?.tahunMulaiPraktik
    ? new Date().getFullYear() - data.tahunMulaiPraktik
    : null;

  const initial = data?.namaLengkap?.charAt(0)?.toUpperCase() ?? '?';

  // Parse page config
  const pageCfg: PageConfig = (() => {
    if (!data?.sectionConfig) return DEFAULT_PAGE_CONFIG;
    try { return migrateToPageConfig(JSON.parse(data.sectionConfig)); }
    catch { return DEFAULT_PAGE_CONFIG; }
  })();

  const isSectionVisible = (type: SectionType) =>
    pageCfg.sections.some(s => s.type === type && s.visible);

  // Fallback: if no sections configured show default 3
  const hasAnySections = pageCfg.sections.some(s => s.visible);

  // ── Not Found ─────────────────────────────────────────────
  if (!loading && notFound) {
    return (
      <div style={{ minHeight: '100vh', background: IVORY, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: BODY }}>
        <div style={{ fontSize: 72, fontFamily: SERIF, color: NAVY, fontWeight: 700, lineHeight: 1 }}>404</div>
        <div style={{ fontSize: 18, color: INK, fontWeight: 600, fontFamily: SERIF }}>Profil notaris tidak ditemukan</div>
        <p style={{ color: MUTED, fontSize: 14, textAlign: 'center', maxWidth: 320 }}>
          Halaman yang Anda cari tidak ada atau sudah tidak aktif.
        </p>
        <button
          onClick={() => navigate('/')}
          style={{ background: NAVY, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 14, fontFamily: BODY, transition: 'all 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#14294a'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = NAVY; }}
        >
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: IVORY, fontFamily: BODY }}>

      {/* ── Top nav bar ─────────────────────────────────────── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(15,35,64,0.96)', backdropFilter: 'blur(12px)',
        padding: '0 24px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 52,
        borderBottom: '1px solid rgba(198,167,94,0.15)',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none', border: 'none',
            color: 'rgba(255,255,255,0.55)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 7, fontSize: 13,
            transition: 'color 0.15s', fontFamily: BODY, padding: 0,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = GOLD; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.55)'; }}
        >
          <ArrowLeftOutlined style={{ fontSize: 11 }} /> Kembali
        </button>
        <span style={{
          color: 'rgba(255,255,255,0.38)', fontSize: 12,
          fontFamily: SERIF, fontStyle: 'italic', letterSpacing: 0.3,
        }}>
          {loading ? '' : data?.namaLengkap}
        </span>
        {data?.telepon ? (
          <a
            href={`https://wa.me/${data.telepon.replace(/[^0-9]/g, '')}`}
            target="_blank" rel="noopener noreferrer"
            style={{
              background: GOLD, color: NAVY, borderRadius: 6,
              padding: '6px 16px', fontSize: 12, fontWeight: 700,
              textDecoration: 'none', transition: 'all 0.15s', fontFamily: BODY,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#b8963f'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = GOLD; }}
          >
            Konsultasi
          </a>
        ) : <span style={{ width: 80 }} />}
      </div>

      {/* ── HERO — editorial horizontal split ───────────────── */}
      <section style={{
        background: `linear-gradient(150deg, #0d1f3c 0%, ${NAVY} 55%, #1a3060 100%)`,
        paddingTop: 52,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Cover photo background */}
        {data?.cover && (
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${data.cover})`,
            backgroundSize: 'cover', backgroundPosition: 'center top',
            opacity: 0.1,
          }} />
        )}
        {/* Soft radial glow top-right */}
        <div style={{
          position: 'absolute', top: -80, right: -80,
          width: 400, height: 400, borderRadius: '50%',
          background: `${GOLD}18`, filter: 'blur(80px)',
          pointerEvents: 'none',
        }} />
        {/* Bottom-left secondary glow */}
        <div style={{
          position: 'absolute', bottom: -40, left: -40,
          width: 280, height: 280, borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)', filter: 'blur(60px)',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px 0', position: 'relative' }}>
          {loading ? (
            <Skeleton active paragraph={{ rows: 4 }} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 52, flexWrap: 'wrap' }}>

              {/* Left — Avatar */}
              <div style={{ flexShrink: 0 }}>
                <div style={{
                  width: 160, height: 160, borderRadius: '50%',
                  border: `3px solid ${GOLD}`,
                  boxShadow: `0 0 0 10px ${GOLD}14, 0 24px 48px rgba(0,0,0,0.35)`,
                  overflow: 'hidden', background: `${NAVY}cc`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 60, color: GOLD, fontWeight: 700, fontFamily: SERIF,
                }}>
                  {data?.foto
                    ? <img src={data.foto} alt={data.namaLengkap} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : initial}
                </div>
              </div>

              {/* Right — Text */}
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{
                  fontSize: 10, letterSpacing: 3.5, color: GOLD,
                  fontWeight: 700, textTransform: 'uppercase', marginBottom: 14,
                  opacity: 0.85,
                }}>
                  Notaris &amp; PPAT Berlisensi
                </div>
                <h1 style={{
                  color: '#ffffff',
                  fontSize: 'clamp(26px, 4vw, 46px)',
                  fontFamily: SERIF, fontWeight: 700,
                  margin: '0 0 4px', lineHeight: 1.08,
                  letterSpacing: -0.5,
                }}>
                  {data?.namaLengkap}
                </h1>
                {data?.tagline && (
                  <p style={{
                    color: `${GOLD}cc`,
                    fontSize: 15, fontStyle: 'italic',
                    margin: '12px 0 0', fontFamily: SERIF,
                    lineHeight: 1.6,
                    maxWidth: 480,
                  }}>
                    &ldquo;{data.tagline}&rdquo;
                  </p>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 20 }}>
                  {data?.wilayah && (
                    <span style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.18)',
                      color: 'rgba(255,255,255,0.82)',
                      borderRadius: 6, padding: '5px 13px', fontSize: 12.5,
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}>
                      <EnvironmentOutlined style={{ fontSize: 11, color: GOLD }} /> {data.wilayah}
                    </span>
                  )}
                  {data?.nomorSK && (
                    <span style={{
                      background: `${GOLD}14`,
                      border: `1px solid ${GOLD}35`,
                      color: GOLD,
                      borderRadius: 6, padding: '5px 13px', fontSize: 12,
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}>
                      <SafetyCertificateOutlined style={{ fontSize: 11 }} /> {data.nomorSK}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Hero bottom — gold gradient line */}
        <div style={{ height: 48, marginTop: 40, position: 'relative' }}>
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
            background: `linear-gradient(90deg, transparent 0%, ${GOLD}90 20%, ${GOLD} 50%, ${GOLD}90 80%, transparent 100%)`,
          }} />
        </div>
      </section>

      {/* ── TRUST / STATS (section type: trust) ─────────────── */}
      {isSectionVisible('trust') && !loading && ((data?.jumlahAkta ?? 0) > 0 || (tahunPengalaman ?? 0) > 0 || data?.tahunMulaiPraktik) && (
        <div style={{ background: '#fff', borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ maxWidth: 840, margin: '0 auto', padding: '0 24px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', borderLeft: `1px solid ${BORDER}` }}>
              {(tahunPengalaman ?? 0) > 0 && (
                <StatItem value={tahunPengalaman!} suffix="+" label="Tahun Pengalaman" />
              )}
              {(data?.jumlahAkta ?? 0) > 0 && (
                <StatItem value={data!.jumlahAkta} suffix="+" label="Akta Telah Dibuat" />
              )}
              {data?.tahunMulaiPraktik && (
                <StatItem value={data.tahunMulaiPraktik} suffix="" label="Tahun Mulai Praktik" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── SECTIONS (ordered by pageCfg) ─────────────────────── */}
      {(hasAnySections ? pageCfg.sections : DEFAULT_PAGE_CONFIG.sections).map(sec => {
        if (!sec.visible) return null;
        const key = sec.type;

        if (key === 'about') return (
          <section
            key="about"
            ref={aboutSection.ref}
            className={`fade-up${aboutSection.inView ? ' in-view' : ''}`}
            style={{ background: IVORY, padding: 'clamp(48px, 6vw, 80px) 24px' }}
          >
            <div style={{ maxWidth: 840, margin: '0 auto', display: 'flex', gap: 48, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {/* Left column — section label (hidden on mobile P1.3) */}
              <div className="aktura-about-sidebar-label" style={{ flexShrink: 0, width: 120 }}>
                <div style={{
                  writingMode: 'vertical-rl', transform: 'rotate(180deg)',
                  fontSize: 10, letterSpacing: 3, fontWeight: 700,
                  color: GOLD, textTransform: 'uppercase', opacity: 0.7,
                }}>
                  Tentang Saya
                </div>
              </div>
              {/* Right column — content */}
              <div style={{ flex: 1, minWidth: 260 }}>
                <h2 style={{
                  color: NAVY, fontFamily: SERIF,
                  fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 700,
                  margin: '0 0 28px', lineHeight: 1.2, letterSpacing: -0.3,
                }}>
                  Riwayat &amp; Latar Belakang
                </h2>
                {loading ? (
                  <Skeleton active paragraph={{ rows: 4 }} />
                ) : (
                  <div>
                    {/* Decorative large open-quote */}
                    <div style={{
                      fontSize: 72, lineHeight: 0.6, color: GOLD, opacity: 0.18,
                      fontFamily: SERIF, fontWeight: 700, marginBottom: 20, userSelect: 'none',
                    }}>
                      &ldquo;
                    </div>
                    {(data?.bioPanjang || data?.deskripsi) ? (
                      <p style={{
                        color: INK, fontSize: 16, lineHeight: 2,
                        whiteSpace: 'pre-wrap', margin: 0, fontFamily: BODY,
                      }}>
                        {data.bioPanjang ?? data.deskripsi}
                      </p>
                    ) : (
                      <p style={{ color: MUTED, fontStyle: 'italic', fontFamily: BODY }}>Belum ada deskripsi profil.</p>
                    )}
                    {data?.tahunMulaiPraktik && (
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 10,
                        marginTop: 32, background: '#fff',
                        border: `1px solid ${BORDER}`, borderLeft: `3px solid ${GOLD}`,
                        borderRadius: 6, padding: '10px 18px',
                      }}>
                        <CalendarOutlined style={{ color: GOLD, fontSize: 14 }} />
                        <span style={{ fontSize: 13, color: MUTED, fontFamily: BODY }}>
                          Praktik sejak&nbsp;
                          <strong style={{ color: INK }}>{data.tahunMulaiPraktik}</strong>
                          {tahunPengalaman ? (
                            <>&nbsp;
                              <span style={{ color: GOLD, fontWeight: 700 }}>·</span>&nbsp;
                              <strong style={{ color: NAVY }}>{tahunPengalaman} tahun</strong> pengalaman
                            </>
                          ) : null}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        );

        if (key === 'services' && (loading || (data?.spesialisasi?.length ?? 0) > 0)) return (
          <section
            key={sec.id}
            ref={serviceSection.ref}
            className={`fade-up${serviceSection.inView ? ' in-view' : ''}`}
            style={{ background: '#fff', padding: 'clamp(48px, 6vw, 80px) 24px', borderTop: `1px solid ${BORDER}` }}
          >
            <div style={{ maxWidth: 840, margin: '0 auto' }}>
              {/* Section header */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, marginBottom: 40 }}>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: 3.5, fontWeight: 700, color: GOLD, textTransform: 'uppercase', marginBottom: 8, opacity: 0.8 }}>
                    Bidang Keahlian
                  </div>
                  <h2 style={{
                    color: NAVY, fontFamily: SERIF,
                    fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 700,
                    margin: 0, lineHeight: 1.15, letterSpacing: -0.3,
                  }}>
                    Layanan &amp; Spesialisasi
                  </h2>
                </div>
                <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${BORDER} 0%, transparent 100%)`, marginBottom: 8 }} />
              </div>

              {loading ? <Skeleton active paragraph={{ rows: 2 }} /> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                  {data!.spesialisasi.map((sp, i) => (
                    <div key={i}
                      className={serviceSection.inView ? 'aktura-stagger-item aktura-stagger-in' : 'aktura-stagger-item'}
                      style={{ animationDelay: serviceSection.inView ? `${i * 0.1}s` : undefined,
                      background: IVORY,
                      border: `1px solid ${BORDER}`,
                      borderRadius: 10,
                      padding: '20px 20px',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'all 0.2s ease',
                      cursor: 'default',
                    }}
                      onMouseEnter={e => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.transform = 'translateY(-3px)';
                        el.style.boxShadow = `0 8px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)`;
                        el.style.borderColor = `${serviceColor(sp)}40`;
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.transform = 'none';
                        el.style.boxShadow = 'none';
                        el.style.borderColor = BORDER;
                      }}
                    >
                      {/* Top accent bar */}
                      <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                        background: serviceColor(sp), borderRadius: '10px 10px 0 0',
                      }} />
                      {/* Icon circle */}
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: `${serviceColor(sp)}12`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: 14,
                      }}>
                        <FileTextOutlined style={{ color: serviceColor(sp), fontSize: 17 }} />
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: INK, lineHeight: 1.4, fontFamily: BODY }}>
                        {sp}
                      </div>
                      {/* Ordinal */}
                      <div style={{
                        position: 'absolute', bottom: 14, right: 16,
                        fontFamily: SERIF, fontSize: 28, fontWeight: 700,
                        color: NAVY, opacity: 0.05,
                        lineHeight: 1, userSelect: 'none',
                      }}>
                        {String(i + 1).padStart(2, '0')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        );

        if (key === 'contact') return (
          <section
            key={sec.id}
            ref={contactSection.ref}
            className={`fade-up${contactSection.inView ? ' in-view' : ''}`}
            style={{ background: IVORY, padding: 'clamp(48px, 6vw, 80px) 24px', borderTop: `1px solid ${BORDER}` }}
          >
            <div style={{ maxWidth: 840, margin: '0 auto' }}>
              {/* Section header */}
              <div style={{ marginBottom: 40 }}>
                <div style={{ fontSize: 10, letterSpacing: 3.5, fontWeight: 700, color: GOLD, textTransform: 'uppercase', marginBottom: 8, opacity: 0.8 }}>
                  Kontak
                </div>
                <h2 style={{
                  color: NAVY, fontFamily: SERIF,
                  fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 700,
                  margin: 0, lineHeight: 1.15, letterSpacing: -0.3,
                }}>
                  Hubungi Saya
                </h2>
              </div>

              <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                {/* Left: CTA block */}
                <div style={{
                  flex: '0 0 auto', width: 'min(100%, 280px)',
                  background: NAVY,
                  borderRadius: 16, padding: '32px 28px',
                  position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute', top: -60, right: -60,
                    width: 180, height: 180, borderRadius: '50%',
                    background: `${GOLD}10`, filter: 'blur(40px)',
                  }} />
                  <p style={{
                    color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.8,
                    margin: '0 0 24px', fontFamily: BODY, position: 'relative',
                  }}>
                    Konsultasikan kebutuhan dokumen legal Anda. Saya siap membantu proses berjalan aman dan sesuai hukum.
                  </p>
                  {data?.telepon && (
                    <a href={`https://wa.me/${data.telepon.replace(/[^0-9]/g, '')}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: 8, background: GOLD, color: NAVY,
                        borderRadius: 8, padding: '11px 20px',
                        fontWeight: 700, fontSize: 13.5, textDecoration: 'none',
                        transition: 'all 0.18s', fontFamily: BODY, position: 'relative',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#b8963f'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = GOLD; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
                    >
                      <PhoneOutlined /> Hubungi via WhatsApp
                    </a>
                  )}
                </div>

                {/* Right: contact detail cards */}
                {loading ? <Skeleton active paragraph={{ rows: 4 }} style={{ flex: 1 }} /> : (
                  <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {data?.telepon       && <ContactItem icon={<PhoneOutlined />}        label="Telepon / WhatsApp" value={data.telepon} />}
                    {data?.emailPublik   && <ContactItem icon={<MailOutlined />}         label="Email"             value={data.emailPublik} />}
                    {data?.alamatKantor  && <ContactItem icon={<HomeOutlined />}         label="Alamat Kantor"     value={data.alamatKantor} />}
                    {data?.jamOperasional && <ContactItem icon={<ClockCircleOutlined />} label="Jam Operasional"   value={data.jamOperasional} />}
                    {!data?.telepon && !data?.emailPublik && !data?.alamatKantor && !data?.jamOperasional && (
                      <p style={{ color: MUTED, fontStyle: 'italic', fontSize: 13, fontFamily: BODY }}>Informasi kontak belum tersedia.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        );

        if (key === 'testimonials') return (
          <section
            key={sec.id}
            ref={testimonialsSection.ref}
            className="fade-up in-view"
            style={{ background: IVORY, padding: 'clamp(48px, 6vw, 80px) 24px', borderTop: `1px solid ${BORDER}` }}
          >
            <div style={{ maxWidth: 840, margin: '0 auto' }}>
              {/* Section header */}
              <div style={{ marginBottom: 44, display: 'flex', alignItems: 'flex-end', gap: 20 }}>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: 3.5, fontWeight: 700, color: GOLD, textTransform: 'uppercase', marginBottom: 8, opacity: 0.8 }}>
                    Ulasan
                  </div>
                  <h2 style={{
                    color: NAVY, fontFamily: SERIF,
                    fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 700,
                    margin: 0, lineHeight: 1.15, letterSpacing: -0.3,
                  }}>
                    Kata Klien Kami
                  </h2>
                </div>
                <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${BORDER} 0%, transparent 100%)`, marginBottom: 8 }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
                {[
                  { name: 'Budi Santoso', role: 'Pengusaha',       text: 'Proses jual beli tanah berjalan lancar dan aman. Sangat profesional dan teliti dalam setiap dokumen.' },
                  { name: 'Sari Dewi',    role: 'Direktur PT',      text: 'Pendirian PT kami selesai tepat waktu. Penjelasan hukumnya sangat jelas dan mudah dipahami.' },
                  { name: 'Hendra W.',    role: 'Pemilik Properti', text: 'Sudah 3 kali menggunakan jasa ini. Selalu puas dengan hasilnya — cepat, tepat, terpercaya.' },
                ].map((t, i) => (
                  <div key={i}
                    className={testimonialsSection.inView ? 'aktura-stagger-item aktura-stagger-in' : 'aktura-stagger-item'}
                    style={{ animationDelay: testimonialsSection.inView ? `${i * 0.1}s` : undefined,
                    background: '#fff',
                    border: `1px solid ${BORDER}`, borderRadius: 12,
                    padding: '28px 24px', display: 'flex', flexDirection: 'column',
                    gap: 0, position: 'relative', overflow: 'hidden',
                    transition: 'box-shadow 0.2s',
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.07)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                  >
                    {/* Decorative large quote */}
                    <div style={{
                      position: 'absolute', top: 12, right: 20,
                      fontSize: 80, lineHeight: 1, color: GOLD, opacity: 0.08,
                      fontFamily: SERIF, fontWeight: 700, userSelect: 'none',
                    }}>
                      &rdquo;
                    </div>
                    {/* Stars */}
                    <div style={{ display: 'flex', gap: 3, marginBottom: 16 }}>
                      {[1,2,3,4,5].map(s => (
                        <svg key={s} width="13" height="13" viewBox="0 0 24 24" fill={GOLD}>
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                      ))}
                    </div>
                    {/* Text */}
                    <p style={{
                      color: INK, fontSize: 14, lineHeight: 1.85,
                      margin: '0 0 20px', fontFamily: BODY, flex: 1,
                    }}>
                      {t.text}
                    </p>
                    {/* Divider */}
                    <div style={{ height: 1, background: BORDER, marginBottom: 16 }} />
                    {/* Author */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: NAVY, border: `2px solid ${GOLD}30`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: GOLD, fontWeight: 700, fontFamily: SERIF, fontSize: 16,
                        flexShrink: 0,
                      }}>
                        {t.name[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: INK, fontFamily: BODY }}>{t.name}</div>
                        <div style={{ fontSize: 11.5, color: MUTED, fontFamily: BODY, marginTop: 1 }}>{t.role}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

        if (key === 'cta') return (
          <section
            key={sec.id}
            className="fade-up in-view"
            style={{ background: '#fff', padding: 'clamp(48px, 6vw, 80px) 24px', borderTop: `1px solid ${BORDER}` }}
          >
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
              {/* Editorial ornament line */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 36 }}>
                <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${BORDER})` }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: GOLD, flexShrink: 0 }} />
                <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${BORDER}, transparent)` }} />
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, letterSpacing: 3.5, fontWeight: 700, color: GOLD, textTransform: 'uppercase', marginBottom: 14, opacity: 0.8 }}>
                  Mulai Sekarang
                </div>
                <h2 style={{
                  color: NAVY, fontFamily: SERIF,
                  fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 700,
                  margin: '0 0 16px', lineHeight: 1.2, letterSpacing: -0.5,
                }}>
                  Siap Mengurus Dokumen Legal Anda?
                </h2>
                <p style={{
                  color: MUTED, fontSize: 15.5, lineHeight: 1.8,
                  margin: '0 0 36px', fontFamily: BODY, maxWidth: 500, marginLeft: 'auto', marginRight: 'auto',
                }}>
                  Proses cepat, transparan, dan didampingi profesional berpengalaman. Konsultasi pertama gratis.
                </p>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 32 }}>
                  {data?.telepon && (
                    <a href={`https://wa.me/${data.telepon.replace(/[^0-9]/g, '')}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 9,
                        background: NAVY, color: '#fff',
                        borderRadius: 8, padding: '14px 30px',
                        fontWeight: 700, fontSize: 14, textDecoration: 'none',
                        transition: 'all 0.18s', fontFamily: BODY,
                        boxShadow: `0 4px 20px ${NAVY}30`,
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#142850'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 28px ${NAVY}45`; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = NAVY; (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px ${NAVY}30`; }}
                    >
                      <PhoneOutlined /> Hubungi via WhatsApp
                    </a>
                  )}
                  {data?.emailPublik && (
                    <a href={`mailto:${data.emailPublik}`}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 9,
                        background: 'transparent', color: NAVY,
                        borderRadius: 8, padding: '14px 30px',
                        fontWeight: 600, fontSize: 14, textDecoration: 'none',
                        border: `1.5px solid ${NAVY}30`,
                        transition: 'all 0.18s', fontFamily: BODY,
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = GOLD; (e.currentTarget as HTMLElement).style.color = GOLD; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = `${NAVY}30`; (e.currentTarget as HTMLElement).style.color = NAVY; }}
                    >
                      <MailOutlined /> Kirim Email
                    </a>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {['Konsultasi Gratis', 'Proses Transparan', 'Dokumen Legal Terjamin'].map((text, i) => (
                    <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, color: MUTED, fontSize: 13, fontFamily: BODY }}>
                      <span style={{ width: 18, height: 18, borderRadius: '50%', background: `${GOLD}15`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <CheckCircleOutlined style={{ color: GOLD, fontSize: 10 }} />
                      </span>
                      {text}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        );

        return null;
      })}

      {/* ── Footer ────────────────────────────────────────────── */}
      <div style={{ background: '#0d1f3c', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <div style={{ width: 24, height: 1, background: `${GOLD}40` }} />
        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11.5, fontFamily: BODY, letterSpacing: 0.3 }}>
          Halaman dikelola melalui <span style={{ color: `${GOLD}70` }}>AKTURA</span> &mdash; Sistem Manajemen Notaris &amp; PPAT
        </span>
        <div style={{ width: 24, height: 1, background: `${GOLD}40` }} />
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

function StatItem({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  return (
    <div style={{
      flex: '1 1 160px', padding: '24px 28px',
      borderRight: `1px solid ${BORDER}`,
      textAlign: 'center',
    }}>
      <div style={{
        fontFamily: SERIF, fontWeight: 700, color: NAVY,
        fontSize: 'clamp(32px, 4vw, 46px)', lineHeight: 1,
        letterSpacing: -1,
      }}>
        {value}{suffix}
      </div>
      <div style={{
        fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase',
        color: MUTED, marginTop: 8, fontFamily: BODY, fontWeight: 600,
      }}>
        {label}
      </div>
    </div>
  );
}

function ContactItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{
      display: 'flex', gap: 14, alignItems: 'flex-start',
      background: '#fff', border: `1px solid ${BORDER}`,
      borderRadius: 10, padding: '14px 16px',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 8,
        background: `${GOLD}12`, border: `1px solid ${GOLD}20`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: GOLD, flexShrink: 0, fontSize: 16,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ color: MUTED, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 1.2, fontFamily: BODY, fontWeight: 700 }}>{label}</div>
        <div style={{ color: INK, fontSize: 13.5, marginTop: 4, lineHeight: 1.55, fontFamily: BODY }}>{value}</div>
      </div>
    </div>
  );
}

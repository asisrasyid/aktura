import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from 'antd';
import {
  HomeOutlined, ApartmentOutlined, FileDoneOutlined,
  CheckCircleOutlined, SafetyCertificateOutlined, AuditOutlined,
  SearchOutlined, MessageOutlined, FileTextOutlined,
  EnvironmentOutlined, ArrowRightOutlined, UserOutlined, StarFilled,
} from '@ant-design/icons';
import api from '../../services/api';
import { NAVY, GOLD, IVORY, INK, MUTED, BORDER } from '../../theme/tokens';

// ── Font stack ───────────────────────────────────────────────
const SERIF = "'EB Garamond', 'Playfair Display', Georgia, serif";
const BODY  = "'Lato', 'Inter', system-ui, sans-serif";

// ── Hooks ────────────────────────────────────────────────────

/** Counts up to `target` when `active` becomes true */
function useCountUp(target: number, active: boolean, duration = 1800) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) { setCount(target); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setCount(Math.round(eased * target));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [active, target, duration]);
  return count;
}

/** Returns { ref, inView } — inView flips true once element enters viewport */
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

// ── Static data ──────────────────────────────────────────────

interface NotarisItem {
  id: string;
  namaLengkap: string;
  wilayah: string | null;
  spesialisasi: string[];
  nomorSK: string | null;
  foto: string | null;
  deskripsi: string | null;
  slug: string | null;
}

const situations = [
  { icon: <HomeOutlined />,      label: 'Jual Beli Properti',    desc: 'Akta jual beli tanah dan bangunan yang sah secara hukum.' },
  { icon: <ApartmentOutlined />, label: 'Pendirian Perusahaan',  desc: 'Akta pendirian PT, CV, dan badan hukum lainnya.' },
  { icon: <FileDoneOutlined />,  label: 'Dokumen Waris & Hibah', desc: 'Surat wasiat, akta hibah, dan pembagian harta warisan.' },
];

const howItWorks = [
  { step: 1, icon: <SearchOutlined />,   title: 'Temukan Notaris',      desc: 'Cari notaris berdasarkan wilayah dan spesialisasi yang Anda butuhkan.' },
  { step: 2, icon: <MessageOutlined />,  title: 'Hubungi & Konsultasi', desc: 'Diskusikan kebutuhan dokumen legal Anda langsung dengan notaris pilihan.' },
  { step: 3, icon: <FileTextOutlined />, title: 'Dokumen Selesai',       desc: 'Proses berjalan transparan — Anda tahu statusnya setiap saat.' },
];

const pillars = [
  { icon: <SafetyCertificateOutlined />, title: 'Notaris Terverifikasi', desc: 'Setiap notaris terdaftar dengan nomor SK resmi yang dapat diverifikasi.' },
  { icon: <AuditOutlined />,            title: 'Proses Transparan',     desc: 'Pantau status dokumen Anda dari awal hingga selesai — tidak ada yang tersembunyi.' },
  { icon: <CheckCircleOutlined />,      title: 'Aman & Legal',          desc: 'Seluruh proses mengikuti regulasi UUJN dan peraturan PPAT yang berlaku.' },
];

const testimonials = [
  {
    name: 'Budi Santoso',
    role: 'Pengusaha, Jakarta Selatan',
    text: 'Proses pendirian PT kami selesai tepat waktu. Notaris yang kami temukan di AKTURA sangat profesional dan jelas menjelaskan setiap tahapannya.',
    rating: 5,
    initial: 'B',
  },
  {
    name: 'Sari Dewi',
    role: 'Ibu Rumah Tangga, Bandung',
    text: 'Akhirnya urusan balik nama tanah warisan bisa diselesaikan dengan mudah. Tidak perlu bingung lagi mencari notaris yang terpercaya.',
    rating: 5,
    initial: 'S',
  },
  {
    name: 'Hendra Wijaya',
    role: 'Direktur CV Maju Bersama',
    text: 'Sistem dokumentasinya sangat membantu. Kami bisa memantau progres akta perusahaan secara real-time — tidak ada lagi ketidakpastian.',
    rating: 5,
    initial: 'H',
  },
];

// ── Component ────────────────────────────────────────────────

export default function LandingPage() {
  const navigate = useNavigate();
  const [notaris, setNotaris]       = useState<NotarisItem[]>([]);
  const [loadingNotaris, setLoading] = useState(true);
  const [scrolled, setScrolled]     = useState(false);
  const direktoriRef = useRef<HTMLDivElement>(null);

  // Section visibility hooks
  const statsSection    = useInView(0.2);
  const serviceSection  = useInView(0.15);
  const howSection      = useInView(0.15);
  const pillarSection   = useInView(0.15);
  const testimoniSection = useInView(0.15);
  const dirSection      = useInView(0.1);

  // Count-up values — fire when stats are in view
  const notarisCount = useCountUp(notaris.length > 0 ? notaris.length : 12, statsSection.inView);
  const aktaCount    = useCountUp(500, statsSection.inView);
  const kotaCount    = useCountUp(15, statsSection.inView);

  useEffect(() => {
    api.get('/public/notaris').then(r => setNotaris(r.data)).catch(() => {}).finally(() => setLoading(false));
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToDirektori = () =>
    direktoriRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div style={{ background: IVORY, minHeight: '100vh', fontFamily: BODY, color: INK }}>

      {/* ── Navbar ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? 'rgba(247,246,243,0.97)' : 'transparent',
        backdropFilter: scrolled ? 'blur(8px)' : 'none',
        borderBottom: scrolled ? `1px solid ${BORDER}` : '1px solid transparent',
        transition: 'all 0.25s',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(20px, 4vw, 48px)', height: 64,
      }}>
        <span style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 700, color: NAVY, letterSpacing: -0.5 }}>
          AKTURA
        </span>
        <button
          onClick={() => navigate('/login')}
          style={{
            background: 'transparent', border: `1px solid ${BORDER}`,
            color: INK, padding: '7px 20px', borderRadius: 7,
            fontSize: 13.5, fontWeight: 500, cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = NAVY; (e.currentTarget as HTMLElement).style.color = NAVY; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = BORDER; (e.currentTarget as HTMLElement).style.color = INK; }}
        >
          Masuk
        </button>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 'clamp(100px, 12vw, 140px) clamp(20px, 4vw, 48px) 80px',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-block', background: `${GOLD}18`, border: `1px solid ${GOLD}44`,
          borderRadius: 20, padding: '4px 16px', marginBottom: 28,
          fontSize: 12, fontWeight: 600, color: '#8a6e3e', letterSpacing: 0.8,
          textTransform: 'uppercase',
        }}>
          Platform Notaris & PPAT Indonesia
        </div>

        <h1 style={{
          fontFamily: SERIF,
          fontSize: 'clamp(34px, 6vw, 64px)',
          fontWeight: 700, color: NAVY,
          lineHeight: 1.12, marginBottom: 24,
          maxWidth: 760, letterSpacing: -1,
        }}>
          Akta Anda<br />Dimulai dari Sini
        </h1>

        <p style={{
          fontFamily: BODY,
          fontSize: 'clamp(15px, 2vw, 18px)', color: MUTED,
          lineHeight: 1.75, maxWidth: 560, marginBottom: 40,
        }}>
          Temukan notaris terverifikasi, pahami prosesnya, dan selesaikan
          urusan legal Anda dengan tenang — tanpa bingung harus mulai dari mana.
        </p>

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={scrollToDirektori}
            style={{
              background: NAVY, color: '#fff',
              border: 'none', borderRadius: 8,
              padding: '13px 32px', fontSize: 15, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.18s',
              boxShadow: `0 4px 20px ${NAVY}30`,
              fontFamily: BODY,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#14294a'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = NAVY; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
          >
            Cari Notaris Sekarang
          </button>
          <button
            onClick={() => navigate('/daftar')}
            style={{
              background: 'transparent', color: INK,
              border: `1px solid ${BORDER}`, borderRadius: 8,
              padding: '13px 28px', fontSize: 15, fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.15s',
              fontFamily: BODY,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = NAVY; (e.currentTarget as HTMLElement).style.color = NAVY; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = BORDER; (e.currentTarget as HTMLElement).style.color = INK; }}
          >
            Buat Akun
          </button>
        </div>

        {/* Scroll hint */}
        <div style={{ marginTop: 64, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: MUTED, opacity: 0.5 }}>
          <div style={{ width: 1, height: 40, background: `linear-gradient(to bottom, transparent, ${MUTED})` }} />
          <span style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', fontFamily: BODY }}>Gulir ke bawah</span>
        </div>
      </section>

      {/* ── Stats Strip (count-up) ── */}
      <div
        ref={statsSection.ref}
        style={{
          background: NAVY, padding: 'clamp(28px, 4vw, 40px) clamp(20px, 4vw, 48px)',
          borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 32 }}>
          {[
            { value: notarisCount, suffix: '+', label: 'Notaris Terdaftar' },
            { value: aktaCount,    suffix: '+', label: 'Akta Diproses' },
            { value: kotaCount,    suffix: '+', label: 'Kota Terlayani' },
            { value: null,         suffix: '',  label: 'Mengikuti UUJN', text: 'UUJN' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: SERIF, fontSize: 'clamp(26px, 4vw, 34px)', fontWeight: 700, color: '#fff', lineHeight: 1 }}>
                {s.text ?? `${s.value}${s.suffix}`}
              </div>
              <div style={{ fontSize: 13, color: `${GOLD}cc`, marginTop: 6, fontFamily: BODY }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Situasi yang Kami Tangani ── */}
      <section
        ref={serviceSection.ref}
        className={`fade-up${serviceSection.inView ? ' in-view' : ''}`}
        style={{ background: '#fff', padding: 'clamp(48px, 6vw, 80px) clamp(20px, 4vw, 48px)', borderTop: `1px solid ${BORDER}` }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <SectionLabel>Layanan Kami</SectionLabel>
          <SectionTitle>Kami Siap Membantu Urusan Legal Anda</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
            {situations.map((s, i) => (
              <ServiceCard key={i} icon={s.icon} title={s.label} desc={s.desc} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Cara Kerja ── */}
      <section
        ref={howSection.ref}
        className={`fade-up${howSection.inView ? ' in-view' : ''}`}
        style={{ padding: 'clamp(48px, 6vw, 80px) clamp(20px, 4vw, 48px)', background: IVORY }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <SectionLabel>Cara Kerja</SectionLabel>
          <SectionTitle>Tiga Langkah Sederhana</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 40 }}>
            {howItWorks.map((s, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: `${GOLD}18`, border: `1.5px solid ${GOLD}55`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, fontWeight: 800, color: GOLD,
                  marginBottom: 20, fontFamily: SERIF,
                }}>
                  {s.step}
                </div>
                <div style={{ fontSize: 20, color: `${NAVY}99`, marginBottom: 12 }}>{s.icon}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: NAVY, marginBottom: 8, fontFamily: SERIF }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.75, margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Us ── */}
      <section
        ref={pillarSection.ref}
        className={`fade-up${pillarSection.inView ? ' in-view' : ''}`}
        style={{ background: NAVY, padding: 'clamp(48px, 6vw, 80px) clamp(20px, 4vw, 48px)' }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <SectionLabel light>Mengapa Aktura</SectionLabel>
          <SectionTitle light>Terpercaya. Transparan. Legal.</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
            {pillars.map((p, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.06)', borderRadius: 14,
                border: `1px solid rgba(255,255,255,0.12)`, padding: '28px',
                transition: 'all 0.2s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.10)'; (e.currentTarget as HTMLElement).style.borderColor = `${GOLD}55`; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
              >
                <div style={{ fontSize: 24, color: GOLD, marginBottom: 14 }}>{p.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8, fontFamily: SERIF }}>{p.title}</h3>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, margin: 0 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section
        ref={testimoniSection.ref}
        className={`fade-up${testimoniSection.inView ? ' in-view' : ''}`}
        style={{ background: '#fff', padding: 'clamp(48px, 6vw, 80px) clamp(20px, 4vw, 48px)', borderTop: `1px solid ${BORDER}` }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <SectionLabel>Kata Mereka</SectionLabel>
          <SectionTitle>Dipercaya oleh Klien di Seluruh Indonesia</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {testimonials.map((t, i) => (
              <div key={i} style={{
                background: IVORY, borderRadius: 14, padding: '28px',
                border: `1px solid ${BORDER}`, transition: 'all 0.2s',
                display: 'flex', flexDirection: 'column', gap: 16,
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${GOLD}55`; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px ${NAVY}0a`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = BORDER; (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
              >
                {/* Stars */}
                <div style={{ display: 'flex', gap: 3 }}>
                  {Array.from({ length: t.rating }).map((_, si) => (
                    <StarFilled key={si} style={{ color: GOLD, fontSize: 13 }} />
                  ))}
                </div>
                {/* Quote */}
                <p style={{
                  fontSize: 14.5, color: INK, lineHeight: 1.75, margin: 0,
                  fontStyle: 'italic', fontFamily: SERIF,
                }}>
                  "{t.text}"
                </p>
                {/* Author */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 'auto' }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: `${NAVY}18`, border: `1px solid ${NAVY}22`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, fontWeight: 700, color: NAVY, fontFamily: SERIF,
                    flexShrink: 0,
                  }}>
                    {t.initial}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: NAVY }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: MUTED }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Direktori Notaris ── */}
      <section
        ref={e => { (direktoriRef as React.MutableRefObject<HTMLElement | null>).current = e; (dirSection.ref as React.MutableRefObject<HTMLElement | null>).current = e; }}
        className={`fade-up${dirSection.inView ? ' in-view' : ''}`}
        style={{ padding: 'clamp(48px, 6vw, 80px) clamp(20px, 4vw, 48px)', background: IVORY, borderTop: `1px solid ${BORDER}` }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <SectionLabel>Direktori</SectionLabel>
          <SectionTitle>Notaris Terdaftar</SectionTitle>
          <p style={{ textAlign: 'center', color: MUTED, fontSize: 15, marginBottom: 44, lineHeight: 1.6 }}>
            Temukan notaris yang sesuai dengan kebutuhan dan lokasi Anda.
          </p>

          {loadingNotaris ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
              {[1, 2, 3].map(i => <Skeleton key={i} active avatar paragraph={{ rows: 3 }} />)}
            </div>
          ) : notaris.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '60px 24px',
              background: '#fff', borderRadius: 14, border: `1.5px dashed ${BORDER}`,
            }}>
              <div style={{ fontSize: 40, color: GOLD, marginBottom: 16, opacity: 0.7 }}>
                <UserOutlined />
              </div>
              <p style={{ color: MUTED, fontSize: 15, margin: 0 }}>
                Notaris sedang bergabung — kembali lagi segera.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
              {notaris.map(n => (
                <NotarisCard key={n.id} n={n} onClick={() => n.slug && navigate(`/notary/${n.slug}`)} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section style={{
        background: `linear-gradient(135deg, ${NAVY} 0%, #0f1e3a 100%)`,
        padding: 'clamp(48px, 6vw, 80px) clamp(20px, 4vw, 48px)',
        textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* subtle grid */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `linear-gradient(${GOLD}06 1px, transparent 1px), linear-gradient(90deg, ${GOLD}06 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }} />
        <div style={{ maxWidth: 640, margin: '0 auto', position: 'relative' }}>
          <h2 style={{
            fontFamily: SERIF,
            fontSize: 'clamp(24px, 4vw, 40px)', color: '#fff',
            fontWeight: 700, marginBottom: 16, letterSpacing: -0.5,
          }}>
            Siap Menyelesaikan Urusan Legal Anda?
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, marginBottom: 36, fontFamily: BODY }}>
            Bergabung gratis. Temukan notaris terpercaya dan mulai proses Anda hari ini.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={scrollToDirektori}
              style={{
                background: GOLD, color: '#fff', border: 'none', borderRadius: 8,
                padding: '14px 36px', fontSize: 15, fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.18s',
                boxShadow: `0 6px 28px ${GOLD}50`,
                fontFamily: BODY,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#b8963f'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = GOLD; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
            >
              Cari Notaris
            </button>
            <button
              onClick={() => navigate('/daftar')}
              style={{
                background: 'transparent', color: 'rgba(255,255,255,0.85)',
                border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8,
                padding: '14px 28px', fontSize: 15, fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.15s',
                fontFamily: BODY,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = GOLD; (e.currentTarget as HTMLElement).style.color = GOLD; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.3)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.85)'; }}
            >
              Buat Akun Gratis
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: NAVY, padding: 'clamp(28px, 4vw, 40px) clamp(20px, 4vw, 48px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24, marginBottom: 32 }}>
            <div>
              <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 8 }}>AKTURA</div>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0, maxWidth: 300, lineHeight: 1.6, fontFamily: BODY }}>
                Platform notaris digital yang memudahkan urusan legal Anda.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              <FooterLink onClick={() => navigate('/login')}>Masuk</FooterLink>
              <FooterLink onClick={() => navigate('/daftar')}>Daftar</FooterLink>
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, fontFamily: BODY }}>
              © {new Date().getFullYear()} Aktura. Seluruh hak dilindungi.
            </span>
            <button
              onClick={() => navigate('/untuk-notaris')}
              style={{
                background: 'transparent', border: 'none',
                color: 'rgba(255,255,255,0.45)', fontSize: 12.5,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                transition: 'color 0.15s', padding: 0, fontFamily: BODY,
              }}
              onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}
            >
              Anda seorang Notaris atau PPAT? Jelajahi lebih banyak <ArrowRightOutlined />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────

function SectionLabel({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p style={{
      textAlign: 'center', fontSize: 11, fontWeight: 700,
      letterSpacing: 2.5, color: light ? `${GOLD}cc` : GOLD,
      textTransform: 'uppercase', marginBottom: 12, fontFamily: BODY,
    }}>
      {children}
    </p>
  );
}

function SectionTitle({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <h2 style={{
      textAlign: 'center', fontFamily: SERIF,
      fontSize: 'clamp(22px, 3.5vw, 36px)',
      color: light ? '#fff' : NAVY,
      fontWeight: 700, marginBottom: 48, letterSpacing: -0.5,
    }}>
      {children}
    </h2>
  );
}

function ServiceCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div
      style={{
        background: IVORY, borderRadius: 14, padding: '28px',
        border: `1px solid ${BORDER}`, transition: 'all 0.2s', cursor: 'default',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${GOLD}66`; (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px ${NAVY}0a`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = BORDER; (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: `${GOLD}15`, border: `1px solid ${GOLD}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, color: GOLD, marginBottom: 18,
      }}>
        {icon}
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 8, fontFamily: SERIF }}>{title}</h3>
      <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.75, margin: 0 }}>{desc}</p>
    </div>
  );
}

function NotarisCard({ n, onClick }: { n: NotarisItem; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff', borderRadius: 14, padding: '20px',
        border: `1px solid ${BORDER}`, transition: 'all 0.2s',
        cursor: n.slug ? 'pointer' : 'default',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${GOLD}55`; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 6px 24px ${NAVY}0a`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = BORDER; (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
    >
      {/* Avatar row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 46, height: 46, borderRadius: '50%',
          background: `${NAVY}18`, border: `1px solid ${NAVY}22`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, color: NAVY, fontFamily: SERIF, fontWeight: 700,
          flexShrink: 0, overflow: 'hidden',
        }}>
          {n.foto
            ? <img src={n.foto} alt={n.namaLengkap} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : n.namaLengkap.charAt(0).toUpperCase()}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: NAVY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: SERIF }}>
            {n.namaLengkap}
          </div>
          {n.wilayah && (
            <div style={{ fontSize: 12, color: MUTED, display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
              <EnvironmentOutlined style={{ fontSize: 10 }} />
              {n.wilayah}
            </div>
          )}
        </div>
      </div>

      {/* Spesialisasi tags */}
      {n.spesialisasi?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {n.spesialisasi.slice(0, 3).map((sp, si) => (
            <span key={si} style={{
              fontSize: 10.5, fontWeight: 500, padding: '2px 9px',
              borderRadius: 20, background: `${NAVY}0f`, color: NAVY,
              border: `1px solid ${NAVY}1a`,
            }}>{sp}</span>
          ))}
          {n.spesialisasi.length > 3 && (
            <span style={{ fontSize: 10.5, color: MUTED }}>+{n.spesialisasi.length - 3}</span>
          )}
        </div>
      )}

      {/* Deskripsi */}
      {n.deskripsi && (
        <p style={{
          fontSize: 12.5, color: MUTED, lineHeight: 1.65, margin: '10px 0 0',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {n.deskripsi}
        </p>
      )}

      {n.nomorSK && (
        <div style={{ marginTop: 10, fontSize: 10.5, color: MUTED, fontFamily: 'monospace' }}>
          SK: {n.nomorSK}
        </div>
      )}

      {n.slug && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 11.5, color: GOLD, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            Lihat Profil <ArrowRightOutlined style={{ fontSize: 10 }} />
          </span>
        </div>
      )}
    </div>
  );
}

function FooterLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer', padding: 0, fontFamily: BODY, transition: 'color 0.15s' }}
      onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
    >
      {children}
    </button>
  );
}

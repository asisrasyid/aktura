import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RobotOutlined, TeamOutlined, CheckSquareOutlined,
  BookOutlined, ClockCircleOutlined, ArrowLeftOutlined, StarFilled,
} from '@ant-design/icons';
import api from '../../services/api';
import { NAVY, GOLD, IVORY, INK, MUTED, BORDER } from '../../theme/tokens';

const NAVY_D = '#14294a';

const SERIF = "'EB Garamond', 'Playfair Display', Georgia, serif";
const BODY  = "'Lato', 'Inter', system-ui, sans-serif";

// ── Hooks ────────────────────────────────────────────────────

function useCountUp(target: number, active: boolean, duration = 1800) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) { setCount(target); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setCount(Math.round(eased * target));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [active, target, duration]);
  return count;
}

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

const features = [
  { icon: <RobotOutlined />,       title: 'Generate Akta dengan AI',    desc: 'Draft akta dibuat otomatis sesuai standar notaris Indonesia — hemat waktu, konsisten, dan bisa direvisi langsung.' },
  { icon: <TeamOutlined />,        title: 'Manajemen Klien Terpusat',   desc: 'Database klien lengkap di satu tempat. Cari, kelola, dan pantau riwayat klien dengan cepat.' },
  { icon: <CheckSquareOutlined />, title: 'Sistem Approval Digital',    desc: 'Alur persetujuan akta yang terstruktur — tidak ada yang terlewat, setiap langkah terdokumentasi.' },
  { icon: <BookOutlined />,        title: 'Buku Register Digital',      desc: 'Pencatatan repertorium dan register akta otomatis, terhubung dengan setiap produk yang dibuat.' },
];

const steps = [
  { step: 1, title: 'Daftar Akun',          desc: 'Buat akun gratis dengan email Anda — proses cepat, tidak perlu verifikasi panjang.' },
  { step: 2, title: 'Lengkapi Profil',       desc: 'Isi nama, wilayah, spesialisasi, dan nomor SK. Profil Anda muncul di direktori publik.' },
  { step: 3, title: 'Mulai Kelola Praktik', desc: 'Dashboard siap pakai — buat akta, kelola klien, dan pantau semua dari satu tempat.' },
];

const testimonials = [
  {
    name: 'Notaris Ratna Puspita, S.H., M.Kn.',
    role: 'Notaris & PPAT, Surabaya',
    text: 'Sejak menggunakan AKTURA, waktu pembuatan akta berkurang hampir 60%. AI-nya benar-benar memahami format akta Indonesia.',
    rating: 5,
    initial: 'R',
  },
  {
    name: 'Notaris Darmawan, S.H.',
    role: 'Notaris, Yogyakarta',
    text: 'Manajemen klien dan buku register digital sangat membantu. Tidak ada lagi tumpukan kertas — semua terdokumentasi rapi.',
    rating: 5,
    initial: 'D',
  },
  {
    name: 'Notaris Indah Lestari, M.Kn.',
    role: 'Notaris & PPAT, Bandung',
    text: 'Sistem approval digital membuat koordinasi dengan staf jauh lebih mudah. Klien pun bisa memantau progres dokumen mereka.',
    rating: 5,
    initial: 'I',
  },
];

// ── Component ────────────────────────────────────────────────

export default function LandingPageNotaris() {
  const navigate = useNavigate();
  const [notarisCount, setNotarisCount] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);

  const statsSection    = useInView(0.2);
  const featureSection  = useInView(0.15);
  const stepsSection    = useInView(0.15);
  const testimoniSection = useInView(0.15);

  const notarisNum = useCountUp(notarisCount ?? 12, statsSection.inView);
  const aktaNum    = useCountUp(500, statsSection.inView);

  useEffect(() => {
    api.get('/public/notaris').then(r => setNotarisCount(r.data.length)).catch(() => {});
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div style={{ background: IVORY, minHeight: '100vh', fontFamily: BODY, color: INK }}>

      {/* ── Navbar ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? 'rgba(27,54,93,0.97)' : 'transparent',
        backdropFilter: scrolled ? 'blur(8px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
        transition: 'all 0.25s',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(20px, 4vw, 48px)', height: 64,
      }}>
        <span style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: -0.5 }}>
          AKTURA
        </span>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              background: 'transparent', border: '1px solid rgba(255,255,255,0.3)',
              color: 'rgba(255,255,255,0.85)', padding: '7px 18px', borderRadius: 7,
              fontSize: 13.5, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s', fontFamily: BODY,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = GOLD; (e.currentTarget as HTMLElement).style.color = GOLD; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.3)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.85)'; }}
          >
            Masuk
          </button>
          <button
            onClick={() => navigate('/daftar')}
            style={{
              background: GOLD, border: 'none', color: '#fff',
              padding: '7px 18px', borderRadius: 7,
              fontSize: 13.5, fontWeight: 600, cursor: 'pointer', transition: 'all 0.18s', fontFamily: BODY,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#b8963f'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = GOLD; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
          >
            Daftar Gratis
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        background: `linear-gradient(145deg, ${NAVY} 0%, #0f1e3a 100%)`,
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 'clamp(100px, 12vw, 140px) clamp(20px, 4vw, 48px) 80px',
        textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        {/* Subtle gold grid overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `linear-gradient(${GOLD}06 1px, transparent 1px), linear-gradient(90deg, ${GOLD}06 1px, transparent 1px)`,
          backgroundSize: '60px 60px', pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 800, margin: '0 auto' }}>
          <div style={{
            display: 'inline-block', background: `${GOLD}22`, border: `1px solid ${GOLD}55`,
            borderRadius: 20, padding: '4px 16px', marginBottom: 28,
            fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: 1.5, textTransform: 'uppercase',
          }}>
            Untuk Notaris & PPAT Indonesia
          </div>

          <h1 style={{
            fontFamily: SERIF,
            fontSize: 'clamp(32px, 6vw, 62px)',
            fontWeight: 700, color: '#fff',
            lineHeight: 1.12, marginBottom: 24,
            letterSpacing: -1,
          }}>
            Praktik Notaris Anda,<br />
            <span style={{ color: GOLD }}>Lebih Efisien.</span>
          </h1>

          <p style={{
            fontSize: 'clamp(15px, 2vw, 18px)', color: 'rgba(255,255,255,0.70)',
            lineHeight: 1.75, maxWidth: 560, margin: '0 auto 44px', fontFamily: BODY,
          }}>
            Kelola akta, klien, dan dokumen dari satu platform yang dirancang
            khusus untuk notaris dan PPAT Indonesia.
          </p>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => navigate('/daftar')}
              style={{
                background: GOLD, color: '#fff', border: 'none', borderRadius: 8,
                padding: '14px 36px', fontSize: 15, fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.18s',
                boxShadow: `0 4px 24px ${GOLD}40`, fontFamily: BODY,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#b8963f'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = GOLD; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
            >
              Daftar Gratis Sekarang
            </button>
            <button
              onClick={() => navigate('/login')}
              style={{
                background: 'transparent', color: 'rgba(255,255,255,0.8)',
                border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8,
                padding: '14px 28px', fontSize: 15, fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.15s', fontFamily: BODY,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = GOLD; (e.currentTarget as HTMLElement).style.color = GOLD; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.25)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.8)'; }}
            >
              Sudah Punya Akun
            </button>
          </div>
        </div>
      </section>

      {/* ── Stats Strip (count-up) ── */}
      <div
        ref={statsSection.ref}
        style={{ background: '#fff', padding: 'clamp(28px, 4vw, 40px) clamp(20px, 4vw, 48px)', borderBottom: `1px solid ${BORDER}` }}
      >
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 28 }}>
          {[
            { value: notarisNum, suffix: '+', label: 'Notaris Bergabung' },
            { value: aktaNum,    suffix: '+', label: 'Akta Diproses' },
            { value: null, label: '100%',       text: '100%', suffix2: 'Standar UUJN' },
            { value: null, label: 'Gratis',     text: 'Free',  suffix2: 'Untuk Mulai' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: SERIF, fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 700, color: NAVY }}>
                {s.text ?? `${s.value}${s.suffix}`}
              </div>
              <div style={{ fontSize: 13, color: MUTED, marginTop: 4, fontFamily: BODY }}>
                {s.suffix2 ?? s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 4 Fitur Unggulan ── */}
      <section
        ref={featureSection.ref}
        className={`fade-up${featureSection.inView ? ' in-view' : ''}`}
        style={{ padding: 'clamp(48px, 6vw, 80px) clamp(20px, 4vw, 48px)', background: IVORY }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, letterSpacing: 2.5, color: GOLD, textTransform: 'uppercase', marginBottom: 12, fontFamily: BODY }}>
            Fitur Platform
          </p>
          <h2 style={{ textAlign: 'center', fontFamily: SERIF, fontSize: 'clamp(22px, 3.5vw, 36px)', color: NAVY, fontWeight: 700, marginBottom: 48, letterSpacing: -0.5 }}>
            Semua yang Anda Butuhkan
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 22 }}>
            {features.map((f, i) => (
              <div key={i} style={{
                background: '#fff', borderRadius: 14, padding: '26px',
                border: `1px solid ${BORDER}`, transition: 'all 0.2s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${GOLD}66`; (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px ${NAVY}0a`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = BORDER; (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
              >
                <div style={{
                  width: 46, height: 46, borderRadius: 12,
                  background: `${NAVY}0f`, border: `1px solid ${NAVY}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, color: NAVY, marginBottom: 18,
                }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: INK, marginBottom: 8, fontFamily: SERIF }}>{f.title}</h3>
                <p style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.75, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: 22, display: 'flex', alignItems: 'center', gap: 10,
            background: `${GOLD}10`, border: `1px solid ${GOLD}33`,
            borderRadius: 10, padding: '12px 20px',
          }}>
            <ClockCircleOutlined style={{ color: GOLD, fontSize: 14 }} />
            <span style={{ fontSize: 13.5, color: '#8a6e3e', fontWeight: 500, fontFamily: BODY }}>
              <strong>Segera hadir:</strong> Invoicing & Penagihan — kelola tagihan klien langsung dari platform.
            </span>
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
          <p style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, letterSpacing: 2.5, color: GOLD, textTransform: 'uppercase', marginBottom: 12, fontFamily: BODY }}>
            Dipercaya Notaris
          </p>
          <h2 style={{ textAlign: 'center', fontFamily: SERIF, fontSize: 'clamp(22px, 3.5vw, 36px)', color: NAVY, fontWeight: 700, marginBottom: 48, letterSpacing: -0.5 }}>
            Kata Rekan Notaris Kami
          </h2>
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
                <div style={{ display: 'flex', gap: 3 }}>
                  {Array.from({ length: t.rating }).map((_, si) => (
                    <StarFilled key={si} style={{ color: GOLD, fontSize: 13 }} />
                  ))}
                </div>
                <p style={{ fontSize: 14.5, color: INK, lineHeight: 1.75, margin: 0, fontStyle: 'italic', fontFamily: SERIF }}>
                  "{t.text}"
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 'auto' }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: `${NAVY}18`, border: `1px solid ${NAVY}22`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, fontWeight: 700, color: NAVY, fontFamily: SERIF, flexShrink: 0,
                  }}>
                    {t.initial}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: NAVY }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: MUTED }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cara Bergabung ── */}
      <section
        ref={stepsSection.ref}
        className={`fade-up${stepsSection.inView ? ' in-view' : ''}`}
        style={{ padding: 'clamp(48px, 6vw, 80px) clamp(20px, 4vw, 48px)', background: IVORY, borderTop: `1px solid ${BORDER}` }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, letterSpacing: 2.5, color: GOLD, textTransform: 'uppercase', marginBottom: 12, fontFamily: BODY }}>
            Mulai Sekarang
          </p>
          <h2 style={{ textAlign: 'center', fontFamily: SERIF, fontSize: 'clamp(22px, 3.5vw, 36px)', color: NAVY, fontWeight: 700, marginBottom: 48, letterSpacing: -0.5 }}>
            Bergabung dalam 3 Langkah
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 40 }}>
            {steps.map((s, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: NAVY, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 20, fontWeight: 800,
                  color: GOLD, marginBottom: 20, fontFamily: SERIF,
                }}>
                  {s.step}
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: INK, marginBottom: 8, fontFamily: SERIF }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.75, margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section style={{
        background: `linear-gradient(135deg, ${NAVY} 0%, #0f1e3a 100%)`,
        padding: 'clamp(48px, 6vw, 80px) clamp(20px, 4vw, 48px)', textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `linear-gradient(${GOLD}06 1px, transparent 1px), linear-gradient(90deg, ${GOLD}06 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }} />
        <div style={{ maxWidth: 640, margin: '0 auto', position: 'relative' }}>
          <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(24px, 4vw, 40px)', color: '#fff', fontWeight: 700, marginBottom: 16, letterSpacing: -0.5 }}>
            Siap Digitalisasi Praktik Anda?
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, marginBottom: 36, fontFamily: BODY }}>
            Bergabung gratis. Tidak perlu kartu kredit.
            Mulai kelola akta dan klien hari ini.
          </p>
          <button
            onClick={() => navigate('/daftar')}
            style={{
              background: GOLD, color: '#fff', border: 'none', borderRadius: 8,
              padding: '15px 44px', fontSize: 16, fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.18s',
              boxShadow: `0 6px 28px ${GOLD}50`, fontFamily: BODY,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#b8963f'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = GOLD; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
          >
            Mulai Sekarang — Gratis
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: NAVY_D, padding: '28px clamp(20px, 4vw, 48px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, fontFamily: BODY }}>
            © {new Date().getFullYear()} Aktura. Seluruh hak dilindungi.
          </span>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'transparent', border: 'none',
              color: 'rgba(255,255,255,0.45)', fontSize: 12.5,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              transition: 'color 0.15s', padding: 0, fontFamily: BODY,
            }}
            onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}
          >
            <ArrowLeftOutlined /> Halaman Utama untuk Klien
          </button>
        </div>
      </footer>
    </div>
  );
}

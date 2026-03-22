import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuthStore } from '../store/auth.store';

// Lazy-loaded pages — code splitting per route
const AppLayout   = lazy(() => import('../components/layout/AppLayout'));
const Login       = lazy(() => import('../pages/auth/Login'));
const Register    = lazy(() => import('../pages/auth/Register'));
const LandingPage        = lazy(() => import('../pages/landing/LandingPage'));
const LandingPageNotaris = lazy(() => import('../pages/landing/LandingPageNotaris'));
const Dashboard   = lazy(() => import('../pages/dashboard/Dashboard'));
const KlienList          = lazy(() => import('../pages/klien/KlienList'));
const AktaList           = lazy(() => import('../pages/akta/AktaList'));
const AktaDetail         = lazy(() => import('../pages/akta/AktaDetail'));
const TemplateAktaList   = lazy(() => import('../pages/template-akta/TemplateAktaList'));
const TemplateAktaEditor = lazy(() => import('../pages/template-akta/TemplateAktaEditor'));
const GenerateAkta       = lazy(() => import('../pages/template-akta/GenerateAkta'));
const BulkGenerateAkta   = lazy(() => import('../pages/template-akta/BulkGenerateAkta'));
const RegisterAkta       = lazy(() => import('../pages/register-akta/RegisterAkta'));
const BukuRegister       = lazy(() => import('../pages/buku-register/BukuRegister'));
const Inbox              = lazy(() => import('../pages/inbox/Inbox'));
const Arsip              = lazy(() => import('../pages/arsip/Arsip'));
const Pengaturan         = lazy(() => import('../pages/pengaturan/Pengaturan'));
const KonsepDokumen      = lazy(() => import('../pages/konsep-dokumen/KonsepDokumen'));
const InvoiceList        = lazy(() => import('../pages/akuntansi/InvoiceList'));
const InvoiceForm        = lazy(() => import('../pages/akuntansi/InvoiceForm'));
const InvoiceDetail      = lazy(() => import('../pages/akuntansi/InvoiceDetail'));
const PublicInvoice      = lazy(() => import('../pages/akuntansi/PublicInvoice'));
const NotaryPublicPage   = lazy(() => import('../pages/landing/NotaryPublicPage'));

const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <Spin size="large" />
  </div>
);

// Guard: redirect unauthenticated users to /login
const ProtectedRoute = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

// Guard: redirect authenticated users away from /login and /daftar
const GuestRoute = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />;
};

// Guard: show landing page for guests, redirect authenticated users to /dashboard
const LandingRoute = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />;
};

const withSuspense = (element: React.ReactNode) => (
  <Suspense fallback={<PageLoader />}>{element}</Suspense>
);

export const router = createBrowserRouter([
  // Landing pages (public — authenticated users redirected to /dashboard)
  {
    element: <LandingRoute />,
    children: [
      { path: '/',               element: withSuspense(<LandingPage />) },
      { path: '/untuk-notaris', element: withSuspense(<LandingPageNotaris />) },
    ],
  },
  // Auth pages (only for guests)
  {
    element: <GuestRoute />,
    children: [
      { path: '/login',  element: withSuspense(<Login />) },
      { path: '/daftar', element: withSuspense(<Register />) },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      // Full-screen pages (tanpa AppLayout)
      { path: '/akta/:id',                         element: withSuspense(<AktaDetail />) },
      { path: '/template-akta/buat',               element: withSuspense(<TemplateAktaEditor />) },
      { path: '/template-akta/:id',                element: withSuspense(<TemplateAktaEditor />) },
      { path: '/template-akta/:id/generate',       element: withSuspense(<GenerateAkta />) },
      { path: '/template-akta/:id/bulk-generate',  element: withSuspense(<BulkGenerateAkta />) },
      // Pages dengan AppLayout
      {
        element: withSuspense(<AppLayout />),
        children: [
          { path: '/dashboard',      element: withSuspense(<Dashboard />) },
          { path: '/klien',          element: withSuspense(<KlienList />) },
          { path: '/akta',           element: withSuspense(<AktaList />) },
          { path: '/template-akta',  element: withSuspense(<TemplateAktaList />) },
          { path: '/register-akta',  element: withSuspense(<RegisterAkta />) },
          { path: '/buku-register',  element: withSuspense(<BukuRegister />) },
          { path: '/inbox',          element: withSuspense(<Inbox />) },
          { path: '/arsip',            element: withSuspense(<Arsip />) },
          { path: '/pengaturan',     element: withSuspense(<Pengaturan />) },
          { path: '/konsep-dokumen', element: withSuspense(<KonsepDokumen />) },
          { path: '/akuntansi',          element: withSuspense(<InvoiceList />) },
          { path: '/akuntansi/buat',     element: withSuspense(<InvoiceForm />) },
          { path: '/akuntansi/:id',      element: withSuspense(<InvoiceDetail />) },
          { path: '/akuntansi/:id/edit', element: withSuspense(<InvoiceForm />) },
        ],
      },
    ],
  },
  // Public invoice page — no auth required
  { path: '/invoice/:token', element: withSuspense(<PublicInvoice />) },
  // Public notaris profile — no auth required, accessible by anyone
  { path: '/notary/:slug', element: withSuspense(<NotaryPublicPage />) },
  { path: '*', element: <Navigate to="/" replace /> },
]);

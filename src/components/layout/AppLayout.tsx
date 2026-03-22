import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Layout, Drawer } from 'antd';
import Sidebar from './Sidebar';
import Header from './Header';
import AiAssistant from '../ai-assistant/AiAssistant';

const { Content } = Layout;

const SIDER_WIDTH = 220;
const SIDER_COLLAPSED_WIDTH = 80;
const MOBILE_BREAKPOINT = 768;

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BREAKPOINT);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const handler = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (!mobile) setDrawerOpen(false);
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Close drawer on navigation
  useEffect(() => {
    if (isMobile) setDrawerOpen(false);
  }, [pathname, isMobile]);

  const siderWidth = collapsed ? SIDER_COLLAPSED_WIDTH : SIDER_WIDTH;
  const contentMargin = isMobile ? 0 : siderWidth;

  const handleToggle = () => {
    if (isMobile) {
      setDrawerOpen(o => !o);
    } else {
      setCollapsed(c => !c);
    }
  };

  return (
    <>
      <Layout style={{ minHeight: '100vh' }}>
        {/* Desktop fixed sidebar */}
        {!isMobile && <Sidebar collapsed={collapsed} />}

        {/* Mobile drawer sidebar */}
        {isMobile && (
          <Drawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            placement="left"
            width={SIDER_WIDTH}
            styles={{
              body: { padding: 0, background: '#1B365D' },
              header: { display: 'none' },
            }}
            maskStyle={{ background: 'rgba(0,0,0,0.45)' }}
          >
            <Sidebar collapsed={false} />
          </Drawer>
        )}

        <Layout style={{ marginLeft: contentMargin, transition: 'margin-left 0.2s' }}>
          <Header
            collapsed={isMobile ? false : collapsed}
            onToggle={handleToggle}
            siderWidth={isMobile ? 0 : siderWidth}
          />
          <Content style={{
            marginTop: 64,
            padding: isMobile ? 12 : 24,
            background: '#F7F6F3',
            height: 'calc(100vh - 64px)',
            overflow: 'auto',
          }}>
            <div key={pathname} className="aktura-page-enter">
              <Outlet />
            </div>
          </Content>
        </Layout>
      </Layout>
      <AiAssistant />
    </>
  );
}

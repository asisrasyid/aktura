import { RouterProvider } from 'react-router-dom';
import { ConfigProvider, App as AntApp, notification } from 'antd';
import idID from 'antd/locale/id_ID';
import { router } from './router';

notification.config({ placement: 'bottomRight' });

// ── Design Tokens — AKTURA Brand System ────────────────────────
// Primary  : #1B365D  Navy
// Accent   : #C6A75E  Gold  (hover, divider, icon, brand mark — NOT buttons)
// Background: #F7F6F3 Ivory
// Text     : #2F2F2F  Ink Gray
// ────────────────────────────────────────────────────────────────

const theme = {
  token: {
    colorPrimary:         '#1B365D',
    colorLink:            '#1B365D',
    colorLinkHover:       '#C6A75E',
    colorSuccess:         '#389e0d',
    colorWarning:         '#d48806',
    colorError:           '#cf1322',
    borderRadius:         6,
    borderRadiusLG:       8,
    borderRadiusSM:       4,
    fontFamily:           "'Inter', 'Segoe UI', -apple-system, sans-serif",
    fontSize:             14,
    fontSizeLG:           15,
    fontWeightStrong:     600,
    lineHeight:           1.6,
    colorTextBase:        '#2F2F2F',
    colorTextSecondary:   '#595959',
    colorBgContainer:     '#ffffff',
    colorBgLayout:        '#F7F6F3',
    colorBorder:          '#E2DDD6',
    colorBorderSecondary: '#EDE9E3',
    boxShadow:            '0 1px 4px rgba(27,54,93,0.06)',
    boxShadowSecondary:   '0 4px 16px rgba(27,54,93,0.08)',
    motionDurationFast:   '0.12s',
    motionDurationMid:    '0.18s',
    motionDurationSlow:   '0.28s',
    motionEaseInOut:      'cubic-bezier(0.25,0.46,0.45,0.94)',
    motionEaseOut:        'cubic-bezier(0.0, 0.0, 0.2, 1)',
  },
  components: {
    Menu: {
      darkItemBg:            'transparent',
      darkItemSelectedBg:    'rgba(198,167,94,0.12)',
      darkItemSelectedColor: '#C6A75E',
      darkItemColor:         'rgba(255,255,255,0.68)',
      darkItemHoverColor:    'rgba(198,167,94,0.9)',
      darkItemHoverBg:       'rgba(255,255,255,0.04)',
    },
    Button: {
      borderRadius:         6,
      controlHeight:        36,
      controlHeightSM:      28,
      controlHeightLG:      42,
      paddingInline:        16,
      paddingInlineSM:      12,
      paddingInlineLG:      20,
      fontWeight:           500,
    },
    Card: {
      borderRadius:         8,
      boxShadow:            '0 1px 4px rgba(27,54,93,0.04)',
      paddingLG:            20,
    },
    Input: {
      borderRadius:         6,
      controlHeight:        36,
      controlHeightSM:      28,
    },
    Select: {
      borderRadius:         6,
      controlHeight:        36,
      controlHeightSM:      28,
    },
    DatePicker: {
      borderRadius:         6,
      controlHeight:        36,
    },
    Table: {
      borderRadius:         6,
      headerBg:             '#EDE9E3',
      headerColor:          '#1B365D',
      headerSortActiveBg:   '#E2DDD6',
      rowHoverBg:           '#F7F4EE',
      cellPaddingBlock:     10,
      cellPaddingInline:    14,
    },
    Modal: {
      borderRadius:         8,
      borderRadiusOuter:    8,
      titleFontSize:        16,
      titleLineHeight:      1.4,
    },
    Drawer: {
      borderRadius:         0,
    },
    Form: {
      itemMarginBottom:     18,
      labelHeight:          24,
      labelColor:           '#2F2F2F',
      labelFontSize:        13,
    },
    Badge: {
      statusSize:           8,
    },
    Tag: {
      borderRadius:         4,
      fontSize:             12,
    },
    Tooltip: {
      borderRadius:         6,
    },
    Tabs: {
      inkBarColor:          '#C6A75E',
      itemSelectedColor:    '#1B365D',
      itemHoverColor:       '#C6A75E',
    },
    Alert: {
      borderRadius:         6,
    },
    Spin: {
      colorPrimary:         '#1B365D',
    },
  },
};

const GLOBAL_CSS = `
  @media (prefers-reduced-motion: no-preference) {
    @keyframes aktura-page-in {
      from { opacity: 0; transform: translateY(5px); }
      to   { opacity: 1; transform: none; }
    }
    .aktura-page-enter {
      animation: aktura-page-in 0.25s cubic-bezier(0.0, 0.0, 0.2, 1);
    }
  }

  /* Subtle card hover lift */
  .aktura-card-hover {
    transition: box-shadow 0.2s ease, transform 0.2s ease !important;
  }
  .aktura-card-hover:hover {
    box-shadow: 0 6px 24px rgba(27,54,93,0.12) !important;
    transform: translateY(-2px);
  }

  /* Input & textarea focus transition */
  .ant-input, .ant-input-affix-wrapper,
  .ant-select-selector, .ant-picker {
    transition: border-color 0.18s ease, box-shadow 0.18s ease !important;
  }

  /* Alert / tag fade-in */
  .ant-alert {
    animation: aktura-page-in 0.2s ease-out;
  }

  /* Sidebar menu group label padding */
  .ant-menu-item-group-title {
    padding-top: 14px !important;
    padding-bottom: 2px !important;
  }

  /* Mobile: remove horizontal padding from content forms */
  @media (max-width: 767px) {
    .ant-form-item .ant-form-item-label {
      padding-bottom: 2px;
    }
    .ant-card-body {
      padding: 16px !important;
    }
    .ant-modal-content {
      margin: 0 12px;
    }
  }
`;

export default function App() {
  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <ConfigProvider theme={theme} locale={idID}>
        <AntApp>
          <RouterProvider router={router} />
        </AntApp>
      </ConfigProvider>
    </>
  );
}

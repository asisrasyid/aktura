import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { InvoiceDetail, InvoiceItemDto } from '../../types';
import { terbilang } from '../../utils/terbilang';

// ── Styles ──────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page: {
    fontFamily:  'Helvetica',
    fontSize:    9,
    color:       '#2F2F2F',
    paddingBottom: 40,
  },

  // Header block (navy bg, edge-to-edge)
  headerBlock: {
    backgroundColor: '#1B365D',
    paddingTop:      24,
    paddingBottom:   20,
    paddingHorizontal: 40,
    marginBottom:    20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems:    'flex-start',
    marginBottom:  14,
  },
  brandName:    { color: '#C6A75E', fontSize: 22, fontFamily: 'Helvetica-Bold' },
  brandSub:     { color: 'rgba(255,255,255,0.6)', fontSize: 7, marginTop: 3 },
  invoiceTitle: { color: '#fff', fontSize: 18, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  invoiceNum:   { color: '#C6A75E', fontSize: 11, textAlign: 'right', marginTop: 2 },

  statusPill: {
    marginTop: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
    alignSelf: 'flex-end',
  },
  statusText: { color: '#fff', fontSize: 7, fontFamily: 'Helvetica-Bold' },

  headerDivider: {
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(198,167,94,0.35)',
    marginBottom: 14,
  },

  headerInfoRow: {
    flexDirection: 'row',
    gap: 32,
  },
  infoBlock: { flex: 1 },
  labelTiny:    { color: 'rgba(255,255,255,0.45)', fontSize: 7, marginBottom: 2 },
  valueWhiteBold: { color: '#fff', fontFamily: 'Helvetica-Bold', fontSize: 9 },
  valueWhiteSub:  { color: 'rgba(255,255,255,0.7)', fontSize: 8 },
  valueGold:      { color: '#C6A75E', fontFamily: 'Helvetica-Bold', fontSize: 9 },

  // Content area
  content: {
    paddingHorizontal: 40,
  },

  // Table
  tableHeader: {
    flexDirection:   'row',
    borderBottomWidth: 1,
    borderBottomColor: '#d9d9d9',
    paddingBottom:   5,
    marginBottom:    2,
  },
  tableRow: {
    flexDirection:   'row',
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
  },
  thText: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: '#595959' },

  colNo:    { width: 18 },
  colDesc:  { flex: 1 },
  colType:  { width: 72 },
  colQty:   { width: 28, textAlign: 'right' },
  colPrice: { width: 72, textAlign: 'right' },
  colAmt:   { width: 72, textAlign: 'right' },

  // Totals
  totalsArea: { alignItems: 'flex-end', marginTop: 10 },
  totalsRow:  { flexDirection: 'row', marginBottom: 3 },
  totalsLbl:  { width: 110, textAlign: 'right', paddingRight: 12, fontSize: 9 },
  totalsVal:  { width: 72,  textAlign: 'right', fontSize: 9 },
  totalsBold: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: '#1B365D' },
  totalsDivider: {
    width: 194,
    borderTopWidth: 1,
    borderTopColor: '#d9d9d9',
    marginVertical: 4,
  },

  // Terbilang
  terbilangBox: {
    backgroundColor: '#F7F6F3',
    padding:         9,
    borderRadius:    3,
    marginTop:       10,
  },
  terbilangLabel: { fontSize: 7, color: '#8c8c8c', marginBottom: 2 },
  terbilangText:  { fontFamily: 'Helvetica-Bold', fontSize: 9 },

  // Notes
  notesBox: {
    backgroundColor: '#F7F6F3',
    padding:         9,
    borderRadius:    3,
    marginTop:       8,
  },
  notesLabel: { fontSize: 7, color: '#8c8c8c', marginBottom: 2 },
  notesText:  { fontSize: 9 },

  // Watermark
  watermark: {
    position:   'absolute',
    top:        '30%',
    left:       '5%',
    fontSize:   110,
    color:      'rgba(82,196,26,0.08)',
    fontFamily: 'Helvetica-Bold',
    transform:  'rotate(-45deg)',
  },
});

// ── Helpers ──────────────────────────────────────────────────────────────────
const ITEM_TYPE_LABEL: Record<string, string> = {
  JASA_NOTARIS: 'Jasa Notaris',
  BIAYA_NEGARA: 'Biaya Negara',
  LAINNYA:      'Lainnya',
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT:               '#8c8c8c',
  TERKIRIM:            '#1677ff',
  MENUNGGU_VERIFIKASI: '#d48806',
  LUNAS:               '#52c41a',
  DIBATALKAN:          '#ff4d4f',
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT:               'Draft',
  TERKIRIM:            'Terkirim',
  MENUNGGU_VERIFIKASI: 'Menunggu Verifikasi',
  LUNAS:               'Lunas',
  DIBATALKAN:          'Dibatalkan',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

// ── Component ──────────────────────────────────────────────────────────────
interface Props { inv: InvoiceDetail }

export default function InvoicePdfDocument({ inv }: Props) {
  const isLunas = inv.status === 'LUNAS';
  const statusColor = STATUS_COLOR[inv.status] ?? '#8c8c8c';
  const statusLabel = STATUS_LABEL[inv.status] ?? inv.status;

  return (
    <Document title={`Invoice ${inv.invoiceNumber}`}>
      <Page size="A4" style={S.page}>

        {/* Watermark */}
        {isLunas && <Text style={S.watermark}>LUNAS</Text>}

        {/* Header */}
        <View style={S.headerBlock}>
          <View style={S.headerTop}>
            <View>
              <Text style={S.brandName}>AKTURA</Text>
              <Text style={S.brandSub}>Sistem Manajemen Notaris</Text>
            </View>
            <View>
              <Text style={S.invoiceTitle}>INVOICE</Text>
              <Text style={S.invoiceNum}>{inv.invoiceNumber}</Text>
              <View style={{ ...S.statusPill, backgroundColor: statusColor }}>
                <Text style={S.statusText}>{statusLabel}</Text>
              </View>
            </View>
          </View>

          <View style={S.headerDivider} />

          <View style={S.headerInfoRow}>
            <View style={S.infoBlock}>
              <Text style={S.labelTiny}>TAGIHAN KEPADA</Text>
              <Text style={S.valueWhiteBold}>{inv.klienNama}</Text>
              {inv.klienAlamat ? <Text style={S.valueWhiteSub}>{inv.klienAlamat}</Text> : null}
              {inv.klienNoTelp ? <Text style={S.valueWhiteSub}>{inv.klienNoTelp}</Text> : null}
            </View>
            <View>
              <Text style={S.labelTiny}>TANGGAL TERBIT</Text>
              <Text style={S.valueWhiteBold}>{inv.issueDate}</Text>
              <Text style={{ ...S.labelTiny, marginTop: 6 }}>JATUH TEMPO</Text>
              <Text style={S.valueGold}>{inv.dueDate}</Text>
            </View>
            {inv.aktaNomor ? (
              <View>
                <Text style={S.labelTiny}>AKTA</Text>
                <Text style={S.valueWhiteBold}>{inv.aktaNomor}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Content area */}
        <View style={S.content}>

          {/* Table header */}
          <View style={S.tableHeader}>
            <Text style={{ ...S.colNo,    ...S.thText }}>#</Text>
            <Text style={{ ...S.colDesc,  ...S.thText }}>Deskripsi</Text>
            <Text style={{ ...S.colType,  ...S.thText }}>Jenis</Text>
            <Text style={{ ...S.colQty,   ...S.thText }}>Qty</Text>
            <Text style={{ ...S.colPrice, ...S.thText }}>Harga Satuan</Text>
            <Text style={{ ...S.colAmt,   ...S.thText }}>Jumlah</Text>
          </View>

          {/* Table rows */}
          {inv.items.map((item: InvoiceItemDto, idx: number) => (
            <View key={item.id} style={S.tableRow}>
              <Text style={S.colNo}>{idx + 1}</Text>
              <Text style={S.colDesc}>{item.description}</Text>
              <Text style={S.colType}>{ITEM_TYPE_LABEL[item.itemType] ?? item.itemType}</Text>
              <Text style={S.colQty}>{item.quantity}</Text>
              <Text style={S.colPrice}>{fmt(item.unitPrice)}</Text>
              <Text style={S.colAmt}>{fmt(item.amount)}</Text>
            </View>
          ))}

          {/* Totals */}
          <View style={S.totalsArea}>
            <View style={S.totalsRow}>
              <Text style={S.totalsLbl}>Subtotal</Text>
              <Text style={S.totalsVal}>{fmt(inv.subtotal)}</Text>
            </View>
            <View style={S.totalsRow}>
              <Text style={S.totalsLbl}>Pajak / Biaya Lain</Text>
              <Text style={S.totalsVal}>{fmt(inv.taxAmount)}</Text>
            </View>
            <View style={S.totalsDivider} />
            <View style={S.totalsRow}>
              <Text style={{ ...S.totalsLbl, ...S.totalsBold }}>TOTAL</Text>
              <Text style={{ ...S.totalsVal, ...S.totalsBold }}>{fmt(inv.totalAmount)}</Text>
            </View>
          </View>

          {/* Terbilang */}
          <View style={S.terbilangBox}>
            <Text style={S.terbilangLabel}>Terbilang:</Text>
            <Text style={S.terbilangText}>{terbilang(inv.totalAmount)}</Text>
          </View>

          {/* Notes */}
          {inv.notes ? (
            <View style={S.notesBox}>
              <Text style={S.notesLabel}>Keterangan:</Text>
              <Text style={S.notesText}>{inv.notes}</Text>
            </View>
          ) : null}

        </View>
      </Page>
    </Document>
  );
}

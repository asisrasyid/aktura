export interface User {
  fullName: string;
  email: string;
  role: 'Admin' | 'Notaris' | 'Staff';
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User, expiresAt: string) => void;
  logout: () => void;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  fullName: string;
  email: string;
  role: string;
  expiresAt: string;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

// ---- Akta ----

export type AktaStatus =
  | 'Draft'
  | 'MenungguPersetujuan'
  | 'DalamProses'
  | 'Selesai'
  | 'Ditolak'
  | 'Dibatalkan';
export type FieldType = 'text' | 'number' | 'currency' | 'date' | 'textarea' | 'select' | 'boolean';

export interface DynamicField {
  id: string;
  label: string;
  type: FieldType;
  value: string;
  options?: string[];
  order: number;
}

export interface AktaKlienItem {
  klienId: string;
  namaKlien: string;
  nik: string;
  peran: string;
  urutan: number;
}

export interface AktaListItem {
  id: string;
  nomorAkta: string;
  judul: string;
  tanggalAkta: string;
  jenisAkta: string;
  status: AktaStatus;
  jumlahPihak: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Akta {
  id: string;
  nomorAkta: string;
  judul: string;
  tanggalAkta: string;
  jenisAkta: string;
  status: AktaStatus;
  nilaiTransaksi?: number;
  lokasiObjek?: string;
  keterangan?: string;
  dynamicFields: DynamicField[];
  paraPihak: AktaKlienItem[];
  templateAktaId?: string;
  kontenDokumen?: string;
  createdAt: string;
  updatedAt?: string;
  // Info register (terisi setelah status = Selesai)
  repertoriumId?:    string;
  nomorRepertorium?: string;
  bukuDaftarId?:     string;
  nomorBukuDaftar?:  string;
  jenisBukuDaftar?:  string;
}

export interface CreateAktaPayload {
  nomorAkta: string;
  judul: string;
  tanggalAkta: string;
  jenisAkta: string;
  status: string;
  nilaiTransaksi?: number;
  lokasiObjek?: string;
  keterangan?: string;
  dynamicFields: DynamicField[];
  paraPihak: { klienId: string; peran: string; urutan: number }[];
  templateAktaId?: string;
  kontenDokumen?: string;
}

// ---- Template Akta ----

export type PlaceholderType = 'text' | 'textarea' | 'number' | 'currency' | 'date';

export interface PlaceholderDef {
  key: string;
  label: string;
  type: PlaceholderType;
  originalText?: string; // teks asli sebelum ditandai sebagai placeholder
}

export interface TemplateAktaListItem {
  id: string;
  nama: string;
  deskripsi?: string;
  jenisAkta: string;
  isActive: boolean;
  jumlahPlaceholder: number;
  tipeFile?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TemplateAkta {
  id: string;
  nama: string;
  deskripsi?: string;
  jenisAkta: string;
  kontenAsli?: string;
  kontenTemplate: string;
  kontenBlocks?: string | null;
  placeholders: PlaceholderDef[];
  isActive: boolean;
  tipeFile?: string;
  hasFile?: boolean;
  ttdLayoutJson?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateTemplateAktaPayload {
  nama: string;
  deskripsi?: string;
  jenisAkta: string;
  kontenAsli?: string;
  kontenTemplate: string;
  kontenBlocks?: string | null;
  placeholders: PlaceholderDef[];
  isActive: boolean;
  fileBase64?: string;
  tipeFile?: string;
  ttdLayoutJson?: string | null;
}

// ---- Klien ----

export interface Klien {
  id: string;
  nama: string;
  nik: string;
  tempatLahir: string;
  tanggalLahir: string; // "yyyy-MM-dd"
  jenisKelamin: 'L' | 'P';
  alamat: string;
  kelurahan?: string;
  kecamatan?: string;
  kota?: string;
  provinsi?: string;
  noTelp?: string;
  email?: string;
  pekerjaan?: string;
  statusPerkawinan: 'BelumKawin' | 'Kawin' | 'Cerai';
  kewarganegaraan: string;
  catatan?: string;
  createdAt: string;
}

export interface KlienPayload {
  nama: string;
  nik: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: 'L' | 'P';
  alamat: string;
  kelurahan?: string;
  kecamatan?: string;
  kota?: string;
  provinsi?: string;
  noTelp?: string;
  email?: string;
  pekerjaan?: string;
  statusPerkawinan: string;
  kewarganegaraan: string;
  catatan?: string;
}


// ── Invoice types ─────────────────────────────────────────────

export type InvoiceStatus = 'DRAFT' | 'TERKIRIM' | 'MENUNGGU_VERIFIKASI' | 'LUNAS' | 'DIBATALKAN';
export type InvoiceItemType = 'JASA_NOTARIS' | 'BIAYA_NEGARA' | 'LAINNYA';
export type PaymentMethodType = 'TRANSFER' | 'TUNAI' | 'LAINNYA';
export type PaymentStatusType = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface InvoiceListItem {
  id: string;
  invoiceNumber: string;
  klienNama: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
}

export interface InvoiceSummary {
  totalTagihan: number;
  totalLunas: number;
  totalPending: number;
  totalInvoice: number;
  menungguVerifikasi: number;
}

export interface InvoiceItemDto {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  itemType: InvoiceItemType;
  urutan: number;
}

export interface InvoicePaymentDto {
  id: string;
  paymentDate: string;
  amount: number;
  paymentMethod: PaymentMethodType;
  notes?: string;
  status: PaymentStatusType;
  verifiedAt?: string;
}

export interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  klienId: string;
  klienNama: string;
  klienAlamat?: string;
  klienNoTelp?: string;
  aktaId?: string;
  aktaNomor?: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  notes?: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  publicToken?: string;
  sentAt?: string;
  createdAt: string;
  items: InvoiceItemDto[];
  payments: InvoicePaymentDto[];
}

export interface PublicInvoice {
  id: string;
  invoiceNumber: string;
  klienNama: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  notes?: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  items: InvoiceItemDto[];
}

export interface InvoiceItemForm {
  description: string;
  quantity: number;
  unitPrice: number;
  itemType: InvoiceItemType;
  urutan: number;
}

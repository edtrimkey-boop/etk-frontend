'use client';

import { jsPDF } from 'jspdf';
import { serverCall, serverCallCached, getCachedServerCall } from './api-client';
import { ETK_LOGO_BASE64 } from './logo-base64';

export const ADMISSION_CLASSES = [
  'Pre-Nursery',
  'Nursery',
  'LKG',
  'UKG',
  'Class 1',
  'Class 2',
  'Class 3',
  'Class 4',
  'Class 5',
  'Class 6',
  'Class 7',
  'Class 8',
  'Class 9',
  'Class 10',
  'Class 11',
  'Class 12',
] as const;

export const ADMISSION_DOCUMENTS = [
  'Birth Certificate',
  'Transfer Certificate',
  'Previous Marksheet',
  'Aadhar / ID Proof',
  'Passport Photos (2x)',
  'Caste / EWS Cert',
] as const;

export type AdmissionStatus = 'Enquiry' | 'Applied' | 'Verified' | 'Admitted' | 'Cancelled';
export type FormLayoutVariant = 'keystone' | 'modern' | 'classic' | 'compact';
export type RightWidgetChoice =
  | 'calling_grid'
  | 'office_checklist'
  | 'admission_test_score'
  | 'fee_summary'
  | 'office_remarks'
  | 'none';
export type BottomWidgetChoice =
  | 'month_grid_3x12'
  | 'transport_hostel_strip'
  | 'coaching_batch_strip'
  | 'installment_strip'
  | 'docs_strip'
  | 'none';

export interface InstituteCounters {
  lastAdmSeq: number;
  lastEnqSeq: number;
  rollByClass: Record<string, number>;
  countersReady?: boolean;
}

export interface TemplateFieldConfig {
  key: string;
  label: string;
  section: 'academic' | 'personal' | 'family' | 'previous' | 'fee' | 'custom';
  visible: boolean;
  required: boolean;
  isCustom?: boolean;
  type?: 'text' | 'number' | 'date' | 'select';
  options?: string[];
}

export interface TemplateBranding {
  headerTitle: string;
  subHeader: string;
  addressBanner: string;
  contactLine: string;
  accentColor: string;
  admissionPrefix: string;
  admissionPadding: number;
  signatureUrl: string;
  declarationText: string;
  footerNote: string;
  signatureLabel: string;
  watermarkText: string;
  rightWidget: RightWidgetChoice;
  bottomWidget: BottomWidgetChoice;
  totalLabel: string;
}

export interface AdmissionFormTemplate {
  layoutVariant: FormLayoutVariant;
  branding: TemplateBranding;
  fieldsConfig: TemplateFieldConfig[];
  classCapacities: ClassCapacityMap;
}

export interface AdmissionRecord {
  id: string;
  supabaseStudentId?: string;
  admissionNo: string;
  previousAdmissionNo?: string;
  autoAssignAdmNo?: boolean;
  autoAssignRollNo?: boolean;
  admissionPrefix?: string;
  admissionPadding?: number;
  status: AdmissionStatus;
  studentStatus?: 'Active' | 'Inactive';
  className: string;
  section: string;
  rollNo: number | null;
  academicSession: string;
  admissionDate: string;
  studentName: string;
  dob: string;
  gender: 'Male' | 'Female' | 'Other';
  category: string;
  bloodGroup: string;
  aadhaar: string;
  photoUrl: string;
  fatherName: string;
  motherName: string;
  contactNo: string;
  guardianName: string;
  guardianMobile: string;
  village: string;
  address: string;
  prevSchool: string;
  prevClass: string;
  documents: string[];
  admFee: number;
  monthFee: number;
  uniformFee: number;
  concession: number;
  amountPaid: number;
  payMode: string;
  remarks: string;
  customFields?: Record<string, string>;
  enquirySource?: string;
  followUpDate?: string;
  formPdfUrl?: string;
  driveFileId?: string;
  receiptPdfUrl?: string;
  receiptDriveFileId?: string;
  updatedAt?: string;
}

export type ClassCapacityMap = Record<string, number>;

export const DEFAULT_FIELDS_CONFIG: TemplateFieldConfig[] = [
  { key: 'studentName', label: 'Name of the Candidate', section: 'personal', visible: true, required: true },
  { key: 'fatherName', label: "Father's Name", section: 'family', visible: true, required: true },
  { key: 'dob', label: 'Date of Birth', section: 'personal', visible: true, required: false },
  { key: 'address', label: 'Address', section: 'family', visible: true, required: false },
  { key: 'contactNo', label: 'Mobile Number', section: 'family', visible: true, required: true },
  { key: 'className', label: 'Class', section: 'academic', visible: true, required: true },
  { key: 'aadhaar', label: 'Aadhaar Number', section: 'personal', visible: true, required: false },
  { key: 'prevSchool', label: 'Previous School', section: 'previous', visible: true, required: false },
  { key: 'admFee', label: 'Admission Fee', section: 'fee', visible: true, required: false },
  { key: 'monthFee', label: 'Current Month Fee', section: 'fee', visible: true, required: false },
  { key: 'uniformFee', label: 'Uniform Charge', section: 'fee', visible: true, required: false },
  { key: 'guardianName', label: "Guardian's Name", section: 'family', visible: true, required: false },
  { key: 'guardianMobile', label: 'Mobile No', section: 'family', visible: true, required: false },
  { key: 'rollNo', label: 'Roll No', section: 'academic', visible: false, required: false },
  { key: 'section', label: 'Section', section: 'academic', visible: false, required: false },
  { key: 'academicSession', label: 'Academic Session', section: 'academic', visible: false, required: false },
  { key: 'motherName', label: "Mother's Name", section: 'family', visible: false, required: false },
  { key: 'gender', label: 'Gender', section: 'personal', visible: false, required: false },
  { key: 'category', label: 'Category', section: 'personal', visible: false, required: false },
  { key: 'bloodGroup', label: 'Blood Group', section: 'personal', visible: false, required: false },
  { key: 'village', label: 'Village / City', section: 'family', visible: false, required: false },
  { key: 'prevClass', label: 'Last Class Passed', section: 'previous', visible: false, required: false },
];

export function getDefaultClassCapacities(): ClassCapacityMap {
  const map: ClassCapacityMap = {};
  ADMISSION_CLASSES.forEach((cls) => {
    map[cls] = 40;
  });
  return map;
}

export function derivePrefixFromCode(instCode = 'ETK'): string {
  const clean = String(instCode || 'ETK')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);
  return `${clean || 'ETK'}-`;
}

export function getDefaultTemplate(
  instName = 'Ed-Trim Key Institute',
  instCode = 'ETK',
  instAddress = ''
): AdmissionFormTemplate {
  return {
    layoutVariant: 'keystone',
    branding: {
      headerTitle: instName,
      subHeader: 'ADMISSION FORM',
      addressBanner: instAddress || '',
      contactLine: '',
      accentColor: '#008FD5',
      admissionPrefix: derivePrefixFromCode(instCode),
      admissionPadding: 5,
      signatureUrl: '',
      declarationText:
        'I hereby declare that I have read and understood all rules and affirm that the information furnished above is true and correct.',
      footerNote: 'Digitally generated via Ed-Trim Key • Archived to Institutional Drive',
      signatureLabel: 'Signature of Director',
      watermarkText: '',
      rightWidget: 'calling_grid',
      bottomWidget: 'month_grid_3x12',
      totalLabel: 'TOTAL AMOUNT',
    },
    fieldsConfig: DEFAULT_FIELDS_CONFIG.map((f) => ({ ...f })),
    classCapacities: getDefaultClassCapacities(),
  };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function getCurrentAcademicSession(): string {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() >= 3 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

export function getTodayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function normalizeClassOrderIndex(cls: string): number {
  const idx = ADMISSION_CLASSES.findIndex((c) => c.toLowerCase() === String(cls || '').trim().toLowerCase());
  return idx === -1 ? 999 : idx;
}

export function getNextClassName(currentClass: string): string | null {
  const idx = ADMISSION_CLASSES.findIndex((c) => c.toLowerCase() === String(currentClass || '').trim().toLowerCase());
  if (idx === -1 || idx >= ADMISSION_CLASSES.length - 1) return null;
  return ADMISSION_CLASSES[idx + 1];
}

export function getPrevClassName(currentClass: string): string | null {
  const idx = ADMISSION_CLASSES.findIndex((c) => c.toLowerCase() === String(currentClass || '').trim().toLowerCase());
  if (idx <= 0) return null;
  return ADMISSION_CLASSES[idx - 1];
}

export async function resolveInstituteUuid(user: any, payload: any): Promise<string | null> {
  if (user?.institute_id && UUID_REGEX.test(user.institute_id)) return user.institute_id;
  if (user?.instId && UUID_REGEX.test(user.instId)) return user.instId;
  if (payload?.profile?.institute_id && UUID_REGEX.test(payload.profile.institute_id)) {
    return payload.profile.institute_id;
  }
  return null;
}

// =========================================================================
// Asset Pre-Caching Engine (CORS-Safe + Aspect-Ratio Preserving, <50ms PDF)
// =========================================================================
export interface CachedImageAsset {
  dataUrl: string;
  width: number;
  height: number;
}

const imageDataUrlCache = new Map<string, string>();
const imageAssetCache = new Map<string, CachedImageAsset>();

function measureAndOptimizeDataUrlForPdf(dataUrl: string): Promise<CachedImageAsset> {
  if (typeof window === 'undefined') {
    return Promise.resolve({ dataUrl, width: 100, height: 100 });
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const natW = img.naturalWidth || 100;
      const natH = img.naturalHeight || 100;
      const maxDim = 520;
      const isLarge = natW > maxDim || natH > maxDim || dataUrl.length > 120_000;
      if (!isLarge) {
        resolve({ dataUrl, width: natW, height: natH });
        return;
      }

      try {
        const scale = Math.min(1, maxDim / Math.max(natW, natH));
        const targetW = Math.max(1, Math.round(natW * scale));
        const targetH = Math.max(1, Math.round(natH * scale));
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ dataUrl, width: natW, height: natH });
          return;
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);

        // Preserve transparency for PNG logos/signatures; compress opaque photos as JPEG
        let hasAlpha = false;
        const lowerHead = dataUrl.slice(0, 40).toLowerCase();
        if (lowerHead.includes('image/png') || lowerHead.includes('image/webp')) {
          try {
            const sample = ctx.getImageData(0, 0, targetW, targetH).data;
            for (let i = 3; i < sample.length; i += 16) {
              if (sample[i] < 248) {
                hasAlpha = true;
                break;
              }
            }
          } catch {}
        }

        const outUrl = hasAlpha
          ? canvas.toDataURL('image/png')
          : canvas.toDataURL('image/jpeg', 0.84);
        resolve({
          dataUrl: outUrl.length < dataUrl.length ? outUrl : dataUrl,
          width: targetW,
          height: targetH,
        });
      } catch {
        resolve({ dataUrl, width: natW, height: natH });
      }
    };
    img.onerror = () => resolve({ dataUrl, width: 100, height: 100 });
    img.src = dataUrl;
  });
}

function detectImageFormat(dataUrl: string): 'PNG' | 'JPEG' | 'WEBP' {
  const lower = dataUrl.slice(0, 40).toLowerCase();
  if (lower.includes('image/jpeg') || lower.includes('image/jpg')) return 'JPEG';
  if (lower.includes('image/webp')) return 'WEBP';
  return 'PNG';
}

export async function preloadImageAsDataUrl(url?: string): Promise<string | null> {
  if (!url) return null;
  if (imageAssetCache.has(url)) return imageAssetCache.get(url)!.dataUrl;

  if (url.startsWith('data:image/')) {
    const asset = await measureAndOptimizeDataUrlForPdf(url);
    imageDataUrlCache.set(url, asset.dataUrl);
    imageAssetCache.set(url, asset);
    return asset.dataUrl;
  }

  let dataUrl: string | null = null;
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      dataUrl = await new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    }
  } catch {}

  // Fallback to authenticated server proxy when external storage blocks CORS
  if (!dataUrl && url.startsWith('https://')) {
    try {
      const proxyRes = await serverCall('fetchAssetBase64', { url });
      if (proxyRes?.success && typeof proxyRes.dataUrl === 'string') {
        dataUrl = proxyRes.dataUrl;
      }
    } catch {}
  }

  if (dataUrl) {
    const asset = await measureAndOptimizeDataUrlForPdf(dataUrl);
    imageDataUrlCache.set(url, asset.dataUrl);
    imageAssetCache.set(url, asset);
    return asset.dataUrl;
  }
  return null;
}

export function seedCachedAsset(url: string, dataUrl: string, width = 420, height = 540): void {
  if (!url || !dataUrl) return;
  imageDataUrlCache.set(url, dataUrl);
  imageAssetCache.set(url, { dataUrl, width, height });
}

export function getCachedImageDataUrl(url?: string): string | null {
  if (!url) return null;
  if (url.startsWith('data:image/')) return url;
  return imageAssetCache.get(url)?.dataUrl || imageDataUrlCache.get(url) || null;
}

export function getCachedImageAsset(url?: string): CachedImageAsset | null {
  if (!url) return null;
  const cached = imageAssetCache.get(url);
  if (cached) return cached;
  const raw = url.startsWith('data:image/') ? url : imageDataUrlCache.get(url);
  if (raw) return { dataUrl: raw, width: 100, height: 100 };
  return null;
}

function addImageFit(
  doc: jsPDF,
  assetOrDataUrl: CachedImageAsset | string | null | undefined,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  align: 'center' | 'left' = 'center'
) {
  if (!assetOrDataUrl) return;
  const asset: CachedImageAsset =
    typeof assetOrDataUrl === 'string'
      ? { dataUrl: assetOrDataUrl, width: 100, height: 100 }
      : assetOrDataUrl;
  if (!asset.dataUrl) return;

  const iw = Math.max(1, asset.width || 100);
  const ih = Math.max(1, asset.height || 100);
  const scale = Math.min(boxW / iw, boxH / ih);
  const drawW = iw * scale;
  const drawH = ih * scale;
  const drawX = align === 'center' ? boxX + (boxW - drawW) / 2 : boxX;
  const drawY = boxY + (boxH - drawH) / 2;

  try {
    doc.addImage(asset.dataUrl, detectImageFormat(asset.dataUrl), drawX, drawY, drawW, drawH, undefined, 'MEDIUM');
  } catch {}
}

// =========================================================================
// Local Fallback + Cache Keys (Scoped per Institute ID)
// =========================================================================
const metaKey = (instId: string) => `etk_adm_meta_${instId || 'default'}`;
const pipelineKey = (instId: string) => `etk_adm_pipeline_${instId || 'default'}`;
const capKey = (instId: string) => `etk_adm_cap_${instId || 'default'}`;
const tplKey = (instId: string) => `etk_adm_tpl_${instId || 'default'}`;

export function loadAdmissionMetaMap(instId: string): Record<string, Partial<AdmissionRecord>> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(metaKey(instId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveAdmissionMetaRecord(instId: string, record: AdmissionRecord): void {
  if (typeof window === 'undefined') return;
  try {
    const map = loadAdmissionMetaMap(instId);
    const key = (record.admissionNo || record.id).trim().toUpperCase();
    map[key] = record;
    localStorage.setItem(metaKey(instId), JSON.stringify(map));
  } catch {}
}

export function loadPipelineRecords(instId: string): AdmissionRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(pipelineKey(instId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePipelineRecords(instId: string, records: AdmissionRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(pipelineKey(instId), JSON.stringify(records));
  } catch {}
}

export function loadCachedTemplate(
  instId: string,
  instName: string,
  instCode = 'ETK',
  instAddress = ''
): AdmissionFormTemplate {
  const def = getDefaultTemplate(instName, instCode, instAddress);
  if (typeof window === 'undefined') return def;
  try {
    const raw = localStorage.getItem(tplKey(instId));
    if (!raw) return def;
    const parsed = JSON.parse(raw);
    return {
      layoutVariant: parsed.layoutVariant || def.layoutVariant,
      branding: { ...def.branding, ...(parsed.branding || {}) },
      fieldsConfig: Array.isArray(parsed.fieldsConfig) && parsed.fieldsConfig.length > 0 ? parsed.fieldsConfig : def.fieldsConfig,
      classCapacities: { ...def.classCapacities, ...(parsed.classCapacities || {}) },
    };
  } catch {
    return def;
  }
}

export function saveCachedTemplate(instId: string, template: AdmissionFormTemplate): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(tplKey(instId), JSON.stringify(template));
    localStorage.setItem(capKey(instId), JSON.stringify(template.classCapacities || {}));
  } catch {}
}

export function loadClassCapacities(instId: string): ClassCapacityMap {
  const defaults = getDefaultClassCapacities();
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = localStorage.getItem(capKey(instId));
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

export function saveClassCapacities(instId: string, map: ClassCapacityMap): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(capKey(instId), JSON.stringify(map));
  } catch {}
}

// =========================================================================
// Unified Multi-Tenant Bootstrap & Sync (Backend Gateway + Supabase Fallback)
// =========================================================================
function mapDbAdmissionRow(row: any): AdmissionRecord {
  const fee = row.fee_breakdown || {};
  return {
    id: row.id,
    supabaseStudentId: row.student_id || undefined,
    admissionNo: String(row.admission_no || '').trim().toUpperCase(),
    status: (row.status as AdmissionStatus) || 'Enquiry',
    studentStatus: 'Active',
    className: row.class_name || '',
    section: row.section || 'A',
    rollNo: row.roll_no !== null && row.roll_no !== undefined ? Number(row.roll_no) : null,
    academicSession: row.academic_session || getCurrentAcademicSession(),
    admissionDate: row.admission_date ? String(row.admission_date).slice(0, 10) : getTodayIsoDate(),
    studentName: row.student_name || '',
    dob: row.dob ? String(row.dob).slice(0, 10) : '',
    gender: (row.gender as any) || 'Male',
    category: row.category || 'General',
    bloodGroup: row.blood_group || '',
    aadhaar: row.aadhaar || '',
    photoUrl: row.photo_url || '',
    fatherName: row.father_name || '',
    motherName: row.mother_name || '',
    contactNo: row.contact_no || '',
    guardianName: row.guardian_name || '',
    guardianMobile: row.guardian_mobile || '',
    village: row.village || '-',
    address: row.address || '',
    prevSchool: row.prev_school || '',
    prevClass: row.prev_class || '',
    documents: Array.isArray(row.documents) ? row.documents : [],
    admFee: Number(fee.admFee || 0),
    monthFee: Number(fee.monthFee || 0),
    uniformFee: Number(fee.uniformFee || 0),
    concession: Number(fee.concession || 0),
    amountPaid: Number(fee.amountPaid || 0),
    payMode: fee.payMode || 'Cash',
    remarks: row.remarks || '',
    customFields: row.custom_fields && typeof row.custom_fields === 'object' ? row.custom_fields : {},
    enquirySource: row.enquiry_source || '',
    followUpDate: row.follow_up_date ? String(row.follow_up_date).slice(0, 10) : '',
    formPdfUrl: row.form_pdf_url || '',
    driveFileId: row.drive_file_id || '',
    receiptPdfUrl: fee.receiptPdfUrl || '',
    receiptDriveFileId: fee.receiptDriveFileId || '',
    updatedAt: row.updated_at || row.created_at,
  };
}

export function synthesizeCountersFromRecords(records: AdmissionRecord[]): InstituteCounters {
  let maxAdm = 0;
  let maxEnq = 0;
  const rollByClass: Record<string, number> = {};

  records.forEach((r) => {
    const adm = String(r.admissionNo || '').trim().toUpperCase();
    const numMatch = adm.match(/(\d+)$/);
    if (numMatch && numMatch[1].length <= 7) {
      const seq = parseInt(numMatch[1], 10);
      if (adm.startsWith('ENQ-')) {
        if (seq > maxEnq) maxEnq = seq;
      } else if (r.status === 'Admitted') {
        if (seq > maxAdm) maxAdm = seq;
      }
    }
    if (r.status === 'Admitted' && r.className && r.rollNo) {
      const cKey = r.className.trim().toUpperCase();
      rollByClass[cKey] = Math.max(rollByClass[cKey] || 0, Number(r.rollNo));
    }
  });

  return { lastAdmSeq: maxAdm, lastEnqSeq: maxEnq, rollByClass };
}

function parseAdmissionBootstrapResponse(
  res: any,
  fallbackInstId: string,
  instName: string,
  instCode = 'ETK',
  instAddress = ''
): {
  instituteId: string;
  records: AdmissionRecord[];
  template: AdmissionFormTemplate;
  counters: InstituteCounters;
  tablesReady: boolean;
} {
  const activeId = res.instituteId || fallbackInstId;
  const resolvedCode = res.institute?.institute_code || instCode;
  const defTpl = getDefaultTemplate(res.institute?.institute_name || instName, resolvedCode, instAddress);
  const dbTpl = res.template;
  const template: AdmissionFormTemplate = dbTpl
    ? {
        layoutVariant: dbTpl.layout_variant || defTpl.layoutVariant,
        branding: { ...defTpl.branding, ...(dbTpl.branding || {}) },
        fieldsConfig:
          Array.isArray(dbTpl.fields_config) && dbTpl.fields_config.length > 0
            ? dbTpl.fields_config
            : defTpl.fieldsConfig,
        classCapacities: {
          ...defTpl.classCapacities,
          ...(dbTpl.class_capacities || {}),
        },
      }
    : loadCachedTemplate(activeId, instName, resolvedCode, instAddress);

  saveCachedTemplate(activeId, template);

  const dbAdmissions: AdmissionRecord[] = Array.isArray(res.admissions)
    ? res.admissions.map(mapDbAdmissionRow)
    : [];
  const dbStudents: any[] = Array.isArray(res.students) ? res.students : [];
  const merged = mergeFullSources(activeId, dbStudents, dbAdmissions);
  const synth = synthesizeCountersFromRecords(merged);

  const serverCounters = res.counters || {};
  const rollByClass: Record<string, number> = { ...synth.rollByClass };
  if (serverCounters.rollByClass && typeof serverCounters.rollByClass === 'object') {
    Object.entries(serverCounters.rollByClass).forEach(([k, v]) => {
      const upper = k.trim().toUpperCase();
      rollByClass[upper] = Math.max(rollByClass[upper] || 0, Number(v || 0));
    });
  }

  const counters: InstituteCounters = {
    lastAdmSeq: Math.max(synth.lastAdmSeq, Number(serverCounters.lastAdmSeq || 0)),
    lastEnqSeq: Math.max(synth.lastEnqSeq, Number(serverCounters.lastEnqSeq || 0)),
    rollByClass,
    countersReady: Boolean(serverCounters.countersReady),
  };

  return {
    instituteId: activeId,
    records: merged,
    template,
    counters,
    tablesReady: Boolean(res.tablesReady),
  };
}

export function getCachedAdmissionBootstrap(
  user: any,
  payload: any,
  instName: string,
  instCode = 'ETK',
  instAddress = ''
) {
  const fallbackInstId =
    (user?.institute_id && UUID_REGEX.test(user.institute_id) && user.institute_id) ||
    (user?.instId && UUID_REGEX.test(user.instId) && user.instId) ||
    (payload?.profile?.institute_id && UUID_REGEX.test(payload.profile.institute_id) && payload.profile.institute_id) ||
    user?.code ||
    'default';

  const cached = getCachedServerCall('getAdmissionBootstrap', { instId: fallbackInstId });
  if (cached?.success) {
    return parseAdmissionBootstrapResponse(cached, fallbackInstId, instName, instCode, instAddress);
  }
  return null;
}

export async function fetchAdmissionBootstrap(
  user: any,
  payload: any,
  instName: string,
  instCode = 'ETK',
  instAddress = '',
  force = false
): Promise<{
  instituteId: string;
  records: AdmissionRecord[];
  template: AdmissionFormTemplate;
  counters: InstituteCounters;
  tablesReady: boolean;
}> {
  const fallbackInstId = (await resolveInstituteUuid(user, payload)) || user?.code || 'default';

  try {
    const res = await serverCallCached(
      'getAdmissionBootstrap',
      { instId: fallbackInstId },
      { ttlMs: 12_000, force }
    );
    if (res?.success) {
      return parseAdmissionBootstrapResponse(res, fallbackInstId, instName, instCode, instAddress);
    }
  } catch (err) {
    console.warn('[Admission] Gateway bootstrap unavailable:', err);
  }

  const fallbackRecords = mergeStudentsAndAdmissions(fallbackInstId, []);
  return {
    instituteId: fallbackInstId,
    records: fallbackRecords,
    template: loadCachedTemplate(fallbackInstId, instName, instCode, instAddress),
    counters: synthesizeCountersFromRecords(fallbackRecords),
    tablesReady: false,
  };
}

function mergeFullSources(
  instId: string,
  students: any[],
  dbAdmissions: AdmissionRecord[]
): AdmissionRecord[] {
  const admByAdmNo = new Map<string, AdmissionRecord>();
  const admByStudentId = new Map<string, AdmissionRecord>();
  dbAdmissions.forEach((a) => {
    if (a.admissionNo) admByAdmNo.set(a.admissionNo.toUpperCase(), a);
    if (a.supabaseStudentId) admByStudentId.set(a.supabaseStudentId, a);
  });

  const metaMap = loadAdmissionMetaMap(instId);
  const pipeline = loadPipelineRecords(instId);
  const currentSession = getCurrentAcademicSession();
  const seenAdmNos = new Set<string>();

  const enrolledRecords: AdmissionRecord[] = (students || []).map((s) => {
    const admNo = String(s.admission_no || s.adm_no || s.id || '').trim().toUpperCase();
    if (admNo) seenAdmNos.add(admNo);
    const linkedAdm = admByStudentId.get(s.id) || (admNo ? admByAdmNo.get(admNo) : undefined);
    const meta = metaMap[admNo] || {};

    return {
      id: linkedAdm?.id || s.id || admNo,
      supabaseStudentId: s.id,
      admissionNo: admNo || '-',
      status: 'Admitted',
      studentStatus: String(s.status || 'Active').trim().toLowerCase() === 'inactive' ? 'Inactive' : 'Active',
      className: s.class_name || s.class || linkedAdm?.className || meta.className || '',
      section: linkedAdm?.section || meta.section || 'A',
      rollNo: s.roll_no !== undefined && s.roll_no !== null ? Number(s.roll_no) : null,
      academicSession: linkedAdm?.academicSession || meta.academicSession || currentSession,
      admissionDate:
        linkedAdm?.admissionDate ||
        meta.admissionDate ||
        (s.created_at ? String(s.created_at).slice(0, 10) : getTodayIsoDate()),
      studentName: s.student_name || s.name || linkedAdm?.studentName || meta.studentName || 'Unnamed Student',
      dob: s.dob ? String(s.dob).slice(0, 10) : linkedAdm?.dob || meta.dob || '',
      gender: linkedAdm?.gender || (meta.gender as any) || 'Male',
      category: linkedAdm?.category || meta.category || 'General',
      bloodGroup: linkedAdm?.bloodGroup || meta.bloodGroup || '',
      aadhaar: linkedAdm?.aadhaar || meta.aadhaar || '',
      photoUrl: s.photo_url || linkedAdm?.photoUrl || meta.photoUrl || '',
      fatherName: s.father_name || s.father || linkedAdm?.fatherName || meta.fatherName || '',
      motherName: linkedAdm?.motherName || meta.motherName || '',
      contactNo: s.contact_no ? String(s.contact_no).replace(/\.0$/, '') : linkedAdm?.contactNo || meta.contactNo || '',
      guardianName: linkedAdm?.guardianName || meta.guardianName || s.father_name || '',
      guardianMobile:
        linkedAdm?.guardianMobile ||
        meta.guardianMobile ||
        (s.contact_no ? String(s.contact_no).replace(/\.0$/, '') : ''),
      village: s.village || linkedAdm?.village || meta.village || '-',
      address: linkedAdm?.address || meta.address || s.village || '',
      prevSchool: linkedAdm?.prevSchool || meta.prevSchool || '',
      prevClass: linkedAdm?.prevClass || meta.prevClass || '',
      documents: linkedAdm?.documents?.length ? linkedAdm.documents : Array.isArray(meta.documents) ? meta.documents : [],
      admFee: linkedAdm?.admFee ?? Number(meta.admFee || 0),
      monthFee: linkedAdm?.monthFee ?? Number(meta.monthFee || 0),
      uniformFee: linkedAdm?.uniformFee ?? Number(meta.uniformFee || 0),
      concession: linkedAdm?.concession ?? Number(meta.concession || 0),
      amountPaid: linkedAdm?.amountPaid ?? Number(meta.amountPaid || 0),
      payMode: linkedAdm?.payMode || meta.payMode || 'Cash',
      remarks: linkedAdm?.remarks || meta.remarks || '',
      customFields: linkedAdm?.customFields || meta.customFields || {},
      formPdfUrl: linkedAdm?.formPdfUrl || meta.formPdfUrl || '',
      driveFileId: linkedAdm?.driveFileId || meta.driveFileId || '',
      receiptPdfUrl: linkedAdm?.receiptPdfUrl || meta.receiptPdfUrl || '',
      receiptDriveFileId: linkedAdm?.receiptDriveFileId || meta.receiptDriveFileId || '',
      updatedAt: linkedAdm?.updatedAt || meta.updatedAt || s.created_at,
    };
  });

  const nonEnrolledDb = dbAdmissions.filter((a) => {
    const key = a.admissionNo.toUpperCase();
    if (seenAdmNos.has(key)) return false;
    seenAdmNos.add(key);
    return true;
  });

  const localPending = pipeline.filter((p) => {
    const key = String(p.admissionNo || '').trim().toUpperCase();
    if (seenAdmNos.has(key)) return false;
    return true;
  });

  return [...localPending, ...nonEnrolledDb, ...enrolledRecords].sort((a, b) => {
    const ca = normalizeClassOrderIndex(a.className);
    const cb = normalizeClassOrderIndex(b.className);
    if (ca !== cb) return ca - cb;
    return (a.rollNo ?? 99999) - (b.rollNo ?? 99999);
  });
}

export async function fetchAdmissionStudents(instituteId: string): Promise<any[]> {
  if (!instituteId) return [];
  const res = await serverCall('getStudentsList', { instId: instituteId });
  if (!res?.success) {
    throw new Error(res?.message || 'Failed to fetch students from gateway.');
  }
  return Array.isArray(res.students) ? res.students : [];
}

export async function saveAdmissionRecordRemote(
  instituteId: string,
  record: AdmissionRecord
): Promise<{
  success: boolean;
  allocatedAdmissionNo?: string;
  allocatedRollNo?: number | null;
  counters?: InstituteCounters;
  student?: any;
  admission?: any;
  error?: string;
}> {
  try {
    const res = await serverCall('saveAdmissionRecord', { instId: instituteId, record });
    if (res?.success) {
      const finalAdmNo = res.allocatedAdmissionNo || record.admissionNo;
      const finalRollNo = res.allocatedRollNo !== undefined ? res.allocatedRollNo : record.rollNo;
      const syncedRecord: AdmissionRecord = {
        ...record,
        admissionNo: finalAdmNo,
        rollNo: finalRollNo,
        supabaseStudentId: res.student?.id || record.supabaseStudentId,
      };
      saveAdmissionMetaRecord(instituteId, syncedRecord);
      if (record.status === 'Admitted') {
        const nextPipe = loadPipelineRecords(instituteId).filter(
          (p) =>
            p.id !== record.id &&
            p.admissionNo !== record.admissionNo &&
            p.admissionNo !== record.previousAdmissionNo &&
            p.admissionNo !== finalAdmNo
        );
        savePipelineRecords(instituteId, nextPipe);
      }
      return {
        success: true,
        allocatedAdmissionNo: finalAdmNo,
        allocatedRollNo: finalRollNo,
        counters: res.counters,
        student: res.student,
        admission: res.admission,
      };
    }
    return { success: false, error: res?.message || 'Save failed' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error while saving admission record.' };
  }
}

export async function saveAdmissionTemplateRemote(
  instituteId: string,
  template: AdmissionFormTemplate
): Promise<{ success: boolean; error?: string }> {
  saveCachedTemplate(instituteId, template);
  try {
    const res = await serverCall('saveAdmissionTemplate', {
      instId: instituteId,
      layoutVariant: template.layoutVariant,
      branding: template.branding,
      fieldsConfig: template.fieldsConfig,
      classCapacities: template.classCapacities,
    });
    if (res?.success) return { success: true };
    return { success: false, error: res?.message || 'Failed to save template to Supabase.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error saving template.' };
  }
}

export async function archiveAdmissionPdfToDriveRemote(
  instituteId: string,
  record: AdmissionRecord,
  pdfDoc: jsPDF,
  docType: 'admission_form' | 'receipt' = 'admission_form'
): Promise<{ success: boolean; formPdfUrl?: string; driveFileId?: string; error?: string }> {
  try {
    const dataUri = pdfDoc.output('datauristring');
    const fileBase64 = dataUri.split(',')[1] || '';
    if (!fileBase64) {
      return { success: false, error: 'Failed to generate PDF payload for Drive archival.' };
    }
    if (fileBase64.length > 4_100_000) {
      const mb = (fileBase64.length / (1024 * 1024)).toFixed(2);
      return {
        success: false,
        error: `PDF base64 payload (${mb} MB) exceeds 4.5 MB gateway limit. Re-upload compressed logo/photo images and retry.`,
      };
    }
    const safeAdm = String(record.admissionNo || 'ADM').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeName = String(record.studentName || 'Student').replace(/[^a-zA-Z0-9_-]/g, '_');
    const defaultName =
      docType === 'receipt'
        ? `RCP_${safeAdm}_${safeName}_Receipt.pdf`
        : `${safeAdm}_${safeName}_Admission_Form.pdf`;

    const res = await serverCall('archiveAdmissionPdfToDrive', {
      instId: instituteId,
      docType,
      admissionNo: record.admissionNo,
      studentName: record.studentName,
      academicSession: record.academicSession || getCurrentAcademicSession(),
      fileName: defaultName,
      fileBase64,
      existingDriveFileId: docType === 'receipt' ? (record.receiptDriveFileId || null) : (record.driveFileId || null),
    });

    if (res?.success && res.formPdfUrl) {
      saveAdmissionMetaRecord(instituteId, {
        ...record,
        ...(docType === 'receipt'
          ? { receiptPdfUrl: res.formPdfUrl, receiptDriveFileId: res.driveFileId || record.receiptDriveFileId }
          : { formPdfUrl: res.formPdfUrl, driveFileId: res.driveFileId || record.driveFileId }),
      });
      return { success: true, formPdfUrl: res.formPdfUrl, driveFileId: res.driveFileId };
    }
    return { success: false, error: res?.message || 'Google Drive upload failed.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Google Drive connection error.' };
  }
}

export async function upsertStudentRecord(
  instituteId: string,
  record: AdmissionRecord
): Promise<{ success: boolean; student?: any; error?: string }> {
  const res = await saveAdmissionRecordRemote(instituteId, record);
  return { success: res.success, student: res.student, error: res.error };
}

export async function updateStudentClassInDb(
  _instituteId: string,
  studentId: string,
  nextClass: string,
  admissionNo?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await serverCall('promoteAdmissionStudent', { studentId, admissionNo, nextClass });
    if (res?.success) return { success: true };
    return { success: false, error: res?.message || 'Class update failed.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error updating class.' };
  }
}

export async function bulkPromoteClassInDb(
  _instituteId: string,
  fromClass: string,
  toClass: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const res = await serverCall('bulkPromoteStudents', { fromClass, toClass });
    if (res?.success) return { success: true, count: res.count };
    return { success: false, error: res?.message || 'Bulk promotion failed.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error during bulk promotion.' };
  }
}

export async function toggleStudentStatusInDb(
  _instituteId: string,
  studentId: string,
  nextStatus: 'Active' | 'Inactive'
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await serverCall('toggleAdmissionStudentStatus', { studentId, nextStatus });
    if (res?.success) return { success: true };
    return { success: false, error: res?.message || 'Status toggle failed.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error updating status.' };
  }
}

export async function deleteStudentInDb(
  _instituteId: string,
  studentId?: string,
  admissionNo?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await serverCall('deleteAdmissionRecord', { studentId, admissionNo });
    if (res?.success) return { success: true };
    return { success: false, error: res?.message || 'Delete failed.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error deleting record.' };
  }
}

async function compressStudentPhoto(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const maxW = 600;
        const maxH = 800;
        let w = img.width;
        let h = img.height;
        if (w > h) {
          if (w > maxW) {
            h *= maxW / w;
            w = maxW;
          }
        } else {
          if (h > maxH) {
            w *= maxH / h;
            h = maxH;
          }
        }
        canvas.width = Math.max(1, Math.round(w));
        canvas.height = Math.max(1, Math.round(h));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);
            if (blob) resolve(blob);
            else reject(new Error('Failed to encode photo'));
          },
          'image/jpeg',
          0.85
        );
      } catch (e) {
        URL.revokeObjectURL(objectUrl);
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Invalid image file'));
    };
    img.src = objectUrl;
  });
}

export async function uploadStudentPhotoBlobToStorage(
  instituteId: string,
  admNo: string,
  blob: Blob
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const fileBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const raw = String(reader.result || '');
        resolve(raw.includes(',') ? raw.split(',')[1] : raw);
      };
      reader.onerror = () => reject(new Error('Failed to encode photo.'));
      reader.readAsDataURL(blob);
    });

    const res = await serverCall('uploadStudentPhoto', {
      instId: instituteId,
      admNo,
      fileBase64,
      mimeType: blob.type || 'image/jpeg',
    });

    if (!res?.success || !res?.url) {
      return { success: false, error: res?.message || 'Photo upload failed' };
    }
    return { success: true, url: String(res.url) };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Photo upload failed' };
  }
}

export async function uploadStudentPhotoToStorage(
  instituteId: string,
  admNo: string,
  file: File
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const blob = await compressStudentPhoto(file);
    return await uploadStudentPhotoBlobToStorage(instituteId, admNo, blob);
  } catch (err: any) {
    return { success: false, error: err?.message || 'Photo upload failed' };
  }
}

export function mergeStudentsAndAdmissions(instId: string, students: any[]): AdmissionRecord[] {
  return mergeFullSources(instId, students, []);
}

export function computeLiveAdmissionPreviewNo(
  status: AdmissionStatus,
  currentAdmNo: string,
  counters: InstituteCounters,
  template: AdmissionFormTemplate,
  existingRecords: AdmissionRecord[],
  instCode: string,
  isExistingAdmitted = false
): string {
  const cleanCurrent = String(currentAdmNo || '').trim().toUpperCase();
  if (isExistingAdmitted && cleanCurrent && !cleanCurrent.startsWith('ENQ-') && cleanCurrent !== 'AUTO') {
    return cleanCurrent;
  }

  const synth = synthesizeCountersFromRecords(existingRecords);
  if (status !== 'Admitted') {
    if (cleanCurrent && cleanCurrent.startsWith('ENQ-')) return cleanCurrent;
    const nextEnq = Math.max(counters?.lastEnqSeq || 0, synth.lastEnqSeq) + 1;
    return `ENQ-${String(nextEnq).padStart(5, '0')}`;
  }

  const prefix = (template.branding.admissionPrefix || derivePrefixFromCode(instCode)).toUpperCase();
  const pad = Math.max(1, Math.min(8, Number(template.branding.admissionPadding || 5)));
  const nextSeq = Math.max(counters?.lastAdmSeq || 0, synth.lastAdmSeq) + 1;
  return `${prefix}${String(nextSeq).padStart(pad, '0')}`;
}

export function computeLiveRollPreview(
  status: AdmissionStatus,
  className: string,
  currentRollNo: number | null,
  counters: InstituteCounters,
  existingRecords: AdmissionRecord[],
  isExistingAdmittedInSameClass = false
): number | null {
  if (status !== 'Admitted') return null;
  if (isExistingAdmittedInSameClass && currentRollNo) return currentRollNo;
  if (!className) return null;

  const classKey = className.trim().toUpperCase();
  const synth = synthesizeCountersFromRecords(existingRecords);
  const maxFromDbCounter = Number(counters?.rollByClass?.[classKey] || 0);
  const maxFromSynth = Number(synth.rollByClass?.[classKey] || 0);
  return Math.max(maxFromDbCounter, maxFromSynth) + 1;
}

export function generateNextAdmissionNo(
  instCode: string,
  existingRecords: AdmissionRecord[],
  counters?: InstituteCounters,
  template?: AdmissionFormTemplate
): string {
  const prefix = (template?.branding?.admissionPrefix || derivePrefixFromCode(instCode)).toUpperCase();
  const pad = Math.max(1, Math.min(8, Number(template?.branding?.admissionPadding || 5)));
  const synth = synthesizeCountersFromRecords(existingRecords);
  const nextSeq = Math.max(counters?.lastAdmSeq || 0, synth.lastAdmSeq) + 1;
  return `${prefix}${String(nextSeq).padStart(pad, '0')}`;
}

export function suggestNextRollForClass(
  className: string,
  existingRecords: AdmissionRecord[],
  counters?: InstituteCounters
): number {
  const classKey = String(className || '').trim().toUpperCase();
  const synth = synthesizeCountersFromRecords(existingRecords);
  const fromCnt = Number(counters?.rollByClass?.[classKey] || 0);
  const fromRecords = Number(synth.rollByClass?.[classKey] || 0);
  return Math.max(fromCnt, fromRecords) + 1;
}

const SHORT_MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function formatDdMmmYyyy(val?: string): string {
  if (!val) return '';
  const trimmed = String(val).trim();
  const m = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const year = m[1];
    const monthIdx = parseInt(m[2], 10) - 1;
    const day = m[3];
    const mName = SHORT_MONTHS[monthIdx] || m[2];
    return `${day}-${mName}-${year}`;
  }
  return trimmed.toUpperCase();
}

export function getKeystoneNumberedFields(
  rec: AdmissionRecord,
  template: AdmissionFormTemplate
): Array<{ key: string; label: string; value: string; boldValue: boolean }> {
  const excludedInList = new Set(['admissionNo', 'admissionDate']);
  const fields = (template.fieldsConfig || DEFAULT_FIELDS_CONFIG).filter(
    (f) => f.visible && !excludedInList.has(f.key)
  );

  return fields.map((f) => {
    let raw = '';
    if (f.isCustom) {
      raw = String(rec.customFields?.[f.key] || '');
    } else if (f.key === 'dob' || f.key === 'admissionDate') {
      raw = formatDdMmmYyyy((rec as any)[f.key]);
    } else if (f.key === 'address') {
      raw = String(rec.address || (rec.village && rec.village !== '-' ? rec.village : '') || '');
    } else if (f.key === 'admFee' || f.key === 'monthFee' || f.key === 'uniformFee') {
      const n = Number((rec as any)[f.key] || 0);
      raw = n > 0 ? String(n) : '';
    } else if (f.key === 'rollNo') {
      raw = rec.rollNo !== null && rec.rollNo !== undefined ? String(rec.rollNo) : '';
    } else {
      const val = (rec as any)[f.key];
      raw = val !== null && val !== undefined && val !== '-' ? String(val) : '';
    }

    const displayVal = raw.trim()
      ? ['email'].includes(f.key)
        ? raw.trim()
        : raw.trim().toUpperCase()
      : '';

    return {
      key: f.key,
      label: f.label,
      value: displayVal,
      boldValue: true,
    };
  });
}

// =========================================================================
// Sub-50ms Schema-Driven Vector PDF Engine
// =========================================================================
export function computeFeeTotals(rec: Partial<AdmissionRecord>) {
  const gross = Number(rec.admFee || 0) + Number(rec.monthFee || 0) + Number(rec.uniformFee || 0);
  const concession = Math.min(gross, Math.max(0, Number(rec.concession || 0)));
  const net = Math.max(0, gross - concession);
  const paid = Math.max(0, Number(rec.amountPaid || 0));
  const balance = Math.max(0, net - paid);
  return { gross, concession, net, paid, balance };
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = String(hex || '#008FD5').replace('#', '');
  if (clean.length !== 6) return [0, 143, 213];
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return [0, 143, 213];
  return [r, g, b];
}

function getRecordFieldValue(rec: AdmissionRecord, field: TemplateFieldConfig): string {
  if (field.isCustom) {
    return String(rec.customFields?.[field.key] || '-');
  }
  if (field.key === 'dob' || field.key === 'admissionDate') {
    return formatDdMmmYyyy((rec as any)[field.key]) || '-';
  }
  if (field.key === 'address') {
    return String(rec.address || rec.village || '-');
  }
  const val = (rec as any)[field.key];
  if (val === null || val === undefined || val === '') return '-';
  return String(val);
}

function drawKeystoneFormPage(
  doc: jsPDF,
  rec: AdmissionRecord,
  template: AdmissionFormTemplate,
  instituteInfo: { name: string; code: string; address?: string; email?: string; logoUrl?: string },
  cachedLogoAsset?: CachedImageAsset | null,
  cachedPhotoAsset?: CachedImageAsset | null,
  cachedSigAsset?: CachedImageAsset | null
) {
  const [ar, ag, ab] = hexToRgb(template.branding.accentColor || '#008FD5');

  // Optional Subtle Watermark
  if (template.branding.watermarkText) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(44);
    doc.setTextColor(242, 246, 250);
    doc.text(template.branding.watermarkText.toUpperCase(), 115, 470, { angle: 35 });
  }

  // Outer Full-Page Colored Frame Border
  doc.setDrawColor(ar, ag, ab);
  doc.setLineWidth(2);
  doc.rect(34, 42, 527, 756);

  // Header Logo (Top Left — natural aspect ratio preserved, never squeezed)
  const logoAsset: CachedImageAsset | string = cachedLogoAsset || ETK_LOGO_BASE64;
  addImageFit(doc, logoAsset, 44, 50, 62, 62, 'center');

  // True center of the 527pt bordered frame (34..561 -> 297.5)
  const frameCenterX = 298;

  // Bold School Name (centered on frame, nudged right only if too wide to clear logo on x=112)
  const instTitle = (template.branding.headerTitle || instituteInfo.name || 'ED-TRIM KEY INSTITUTE').toUpperCase();
  doc.setFont('helvetica', 'bold');
  const titleFontSize = instTitle.length > 32 ? 17 : instTitle.length > 26 ? 19 : 21;
  doc.setFontSize(titleFontSize);
  const titleW = doc.getTextWidth(instTitle);
  const headerCenterX = frameCenterX - titleW / 2 < 114 ? 328 : frameCenterX;
  doc.setTextColor(ar, ag, ab);
  doc.text(instTitle, headerCenterX, 71, { align: 'center', maxWidth: 424 });

  // Dark Pill Address Banner (Aligned cleanly on same headerCenterX axis, tightly hugging text)
  const addrBanner = (template.branding.addressBanner || instituteInfo.address || `INSTITUTE CODE: ${instituteInfo.code || 'ETK'}`).toUpperCase();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  const measuredAddrW = doc.getTextWidth(addrBanner);
  const pillW = Math.min(416, Math.max(120, measuredAddrW + 24));
  doc.setFillColor(15, 18, 22);
  doc.roundedRect(headerCenterX - pillW / 2, 79, pillW, 16, 4, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text(addrBanner, headerCenterX, 89.8, { align: 'center', maxWidth: 400 });

  // Contact Line (Aligned on exact same headerCenterX axis)
  const contactText = template.branding.contactLine || (instituteInfo.email ? `CONTACT : ${instituteInfo.email}` : '');
  if (contactText) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(contactText.toUpperCase(), headerCenterX, 110, { align: 'center', maxWidth: 420 });
  }

  // Centered Outlined ADMISSION FORM Pill (Aligned on exact same headerCenterX axis)
  const badgeText = (template.branding.subHeader || 'ADMISSION FORM').toUpperCase();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  const badgeW = Math.min(260, Math.max(132, doc.getTextWidth(badgeText) + 36));
  doc.setDrawColor(ar, ag, ab);
  doc.setLineWidth(1.2);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(headerCenterX - badgeW / 2, 119, badgeW, 21, 5, 5, 'FD');
  doc.setTextColor(15, 23, 42);
  doc.text(badgeText, headerCenterX, 133, { align: 'center' });

  // Meta Row: Admission No (left) & Admission Date (right)
  doc.setFont('times', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  const admLabel = rec.status === 'Admitted' ? 'Admission No' : 'Application Ref';
  doc.text(`${admLabel} : `, 74, 165);
  doc.setFont('times', 'bold');
  doc.text(`${rec.admissionNo || 'PENDING'}`, 144, 165);
  if (rec.status === 'Admitted' && rec.rollNo) {
    doc.setFont('times', 'normal');
    doc.text(`(Roll: ${rec.rollNo})`, 220, 165);
  }

  doc.setFont('times', 'normal');
  doc.text('Admission Date: ', 365, 165);
  doc.setFont('times', 'bold');
  doc.text(formatDdMmmYyyy(rec.admissionDate) || '-', 442, 165);

  // Horizontal Divider
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(1);
  doc.line(34, 173, 561, 173);

  // Left Column: Numbered Candidate Particulars & Fee Breakdown
  const items = getKeystoneNumberedFields(rec, template);
  const lineStep = items.length > 14 ? 17.5 : 21;
  let y = 191;

  items.slice(0, 16).forEach((item, idx) => {
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    const numPrefix = `${idx + 1}. `;
    doc.text(numPrefix, 58, y);
    const labelStr = `${item.label}: `;
    doc.text(labelStr, 74, y);
    const labelW = doc.getTextWidth(labelStr);
    if (item.value) {
      doc.setFont('times', 'bold');
      doc.text(item.value.slice(0, 42), 74 + labelW + 2, y, { maxWidth: Math.max(90, 260 - labelW) });
    }
    y += lineStep;
  });

  // Total Amount Row below numbered list
  const { gross } = computeFeeTotals(rec);
  y = Math.max(y + 10, 468);
  doc.setFont('times', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${(template.branding.totalLabel || 'TOTAL AMOUNT').toUpperCase()}: ${gross > 0 ? gross : ''}`, 58, Math.min(y, 560));

  // Right Column: Photo Frame ({{PHOTO}})
  const photoX = 450;
  const photoY = 183;
  const photoW = 98;
  const photoH = 114;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.8);
  doc.setFillColor(255, 255, 255);
  doc.rect(photoX, photoY, photoW, photoH, 'FD');

  if (cachedPhotoAsset) {
    addImageFit(doc, cachedPhotoAsset, photoX + 2, photoY + 2, photoW - 4, photoH - 4, 'center');
  } else {
    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('{{PHOTO}}', photoX + photoW / 2, photoY + photoH / 2 + 4, { align: 'center' });
  }

  // Right Column Widget Slot (below Photo)
  const rightWidget = template.branding.rightWidget || 'calling_grid';
  const rwX = 334;
  const rwY = 310;
  const rwW = 214;
  if (rightWidget === 'calling_grid') {
    const rowCount = 12;
    const rowH = 17.5;
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.8);
    doc.rect(rwX, rwY, rwW, rowH * (rowCount + 1));
    doc.line(rwX + rwW / 2, rwY, rwX + rwW / 2, rwY + rowH * (rowCount + 1));
    doc.setFont('times', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Calling Date', rwX + 6, rwY + 12.5);
    doc.text('Expected Date', rwX + rwW / 2 + 6, rwY + 12.5);
    for (let r = 1; r <= rowCount; r++) {
      doc.line(rwX, rwY + r * rowH, rwX + rwW, rwY + r * rowH);
    }
  } else if (rightWidget === 'fee_summary') {
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.8);
    doc.rect(rwX, rwY, rwW, 118);
    doc.setFillColor(241, 245, 249);
    doc.rect(rwX, rwY, rwW, 20, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('FEE STRUCTURE SCHEDULE', rwX + rwW / 2, rwY + 13, { align: 'center' });
    const feeRows = [
      ['Admission Fee', `Rs. ${Number(rec.admFee || 0)}`],
      ['Monthly Fee', `Rs. ${Number(rec.monthFee || 0)}`],
      ['Uniform / Kit', `Rs. ${Number(rec.uniformFee || 0)}`],
      ['Standard Total', `Rs. ${gross}`],
    ];
    feeRows.forEach((pair, idx) => {
      const fy = rwY + 38 + idx * 18;
      doc.setFont('helvetica', idx === 3 ? 'bold' : 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(pair[0], rwX + 8, fy);
      doc.text(pair[1], rwX + rwW - 8, fy, { align: 'right' });
    });
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Concession/Balance issued on Receipt PDF', rwX + rwW / 2, rwY + 111, { align: 'center' });
  } else if (rightWidget === 'admission_test_score') {
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.8);
    doc.rect(rwX, rwY, rwW, 152);
    doc.setFillColor(241, 245, 249);
    doc.rect(rwX, rwY, rwW, 20, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('ENTRANCE / SCHOLARSHIP EVAL', rwX + rwW / 2, rwY + 13, { align: 'center' });
    const evalRows = [
      'Test / Scholarship Roll:',
      'Marks / Percentile:',
      'Batch / Stream Allotted:',
      'Medium / Board:',
      'Counselor Approval:',
    ];
    evalRows.forEach((lbl, idx) => {
      const ey = rwY + 36 + idx * 23;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(lbl, rwX + 8, ey);
      doc.setDrawColor(203, 213, 225);
      doc.line(rwX + 8, ey + 6, rwX + rwW - 8, ey + 6);
    });
  } else if (rightWidget === 'office_checklist') {
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.8);
    doc.rect(rwX, rwY, rwW, 170);
    doc.setFillColor(241, 245, 249);
    doc.rect(rwX, rwY, rwW, 20, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('OFFICE VERIFICATION CHECKLIST', rwX + rwW / 2, rwY + 13, { align: 'center' });
    ADMISSION_DOCUMENTS.slice(0, 6).forEach((d, idx) => {
      const cy = rwY + 34 + idx * 21;
      const checked = rec.documents.includes(d);
      doc.rect(rwX + 10, cy - 8, 9, 9);
      if (checked) {
        doc.line(rwX + 11.5, cy - 3.5, rwX + 13.8, cy - 1);
        doc.line(rwX + 13.8, cy - 1, rwX + 17.5, cy - 6.5);
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(d, rwX + 26, cy);
    });
  } else if (rightWidget === 'office_remarks') {
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.8);
    doc.rect(rwX, rwY, rwW, 170);
    doc.setFillColor(241, 245, 249);
    doc.rect(rwX, rwY, rwW, 20, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('OFFICE REMARKS / STAMP', rwX + rwW / 2, rwY + 13, { align: 'center' });
    for (let l = 1; l <= 5; l++) {
      doc.setDrawColor(203, 213, 225);
      doc.line(rwX + 10, rwY + 34 + l * 22, rwX + rwW - 10, rwY + 34 + l * 22);
    }
    if (rec.remarks) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      const rLines = doc.splitTextToSize(rec.remarks, rwW - 20);
      doc.text(rLines.slice(0, 4), rwX + 10, rwY + 48);
    }
  }

  // Bottom Full-Width Widget Strip (Balanced vertical position between content and declaration)
  const bottomWidget = template.branding.bottomWidget || 'month_grid_3x12';
  const bwX = 43;
  const bwY = 594;
  const bwW = 509;

  if (bottomWidget === 'month_grid_3x12') {
    const colW = bwW / 12;
    const rowH = 15;
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.8);
    doc.rect(bwX, bwY, bwW, rowH * 3);
    for (let c = 1; c < 12; c++) {
      doc.line(bwX + c * colW, bwY, bwX + c * colW, bwY + rowH * 3);
    }
    for (let r = 1; r < 3; r++) {
      doc.line(bwX, bwY + r * rowH, bwX + bwW, bwY + r * rowH);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    for (let r = 0; r < 3; r++) {
      SHORT_MONTHS.forEach((m, c) => {
        doc.text(m, bwX + c * colW + colW / 2, bwY + r * rowH + 10.5, { align: 'center' });
      });
    }
  } else if (bottomWidget === 'transport_hostel_strip') {
    const cols = ['TRANSPORT / BUS ROUTE', 'HOSTEL / DAY SCHOLAR', 'EMERGENCY CONTACT', 'MEDICAL / ALLERGIES'];
    const cW = bwW / 4;
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.8);
    doc.rect(bwX, bwY, bwW, 44);
    doc.setFillColor(248, 250, 252);
    doc.rect(bwX, bwY, bwW, 16, 'FD');
    cols.forEach((title, idx) => {
      if (idx > 0) doc.line(bwX + idx * cW, bwY, bwX + idx * cW, bwY + 44);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(15, 23, 42);
      doc.text(title, bwX + idx * cW + cW / 2, bwY + 11, { align: 'center' });
    });
  } else if (bottomWidget === 'coaching_batch_strip') {
    const cols = ['TARGET EXAM / STREAM', 'BATCH TIMING & MEDIUM', 'STUDY MODULE / BOOKS', 'ID CARD & BIOMETRIC'];
    const cW = bwW / 4;
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.8);
    doc.rect(bwX, bwY, bwW, 44);
    doc.setFillColor(248, 250, 252);
    doc.rect(bwX, bwY, bwW, 16, 'FD');
    cols.forEach((title, idx) => {
      if (idx > 0) doc.line(bwX + idx * cW, bwY, bwX + idx * cW, bwY + 44);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(15, 23, 42);
      doc.text(title, bwX + idx * cW + cW / 2, bwY + 11, { align: 'center' });
      if (idx >= 2) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text('[ ] Issued    [ ] Pending', bwX + idx * cW + cW / 2, bwY + 33, { align: 'center' });
      }
    });
  } else if (bottomWidget === 'installment_strip') {
    const quarters = ['QUARTER 1 (APR-JUN)', 'QUARTER 2 (JUL-SEP)', 'QUARTER 3 (OCT-DEC)', 'QUARTER 4 (JAN-MAR)'];
    const qW = bwW / 4;
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.8);
    doc.rect(bwX, bwY, bwW, 42);
    doc.line(bwX, bwY + 16, bwX + bwW, bwY + 16);
    quarters.forEach((q, idx) => {
      if (idx > 0) doc.line(bwX + idx * qW, bwY, bwX + idx * qW, bwY + 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text(q, bwX + idx * qW + qW / 2, bwY + 11, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text('Paid / Receipt No:', bwX + idx * qW + 6, bwY + 32);
      doc.setTextColor(15, 23, 42);
    });
  } else if (bottomWidget === 'docs_strip') {
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.8);
    doc.rect(bwX, bwY, bwW, 40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('DOCUMENTS SUBMITTED:', bwX + 10, bwY + 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(rec.documents.length > 0 ? rec.documents.join('  •  ') : 'None marked', bwX + 10, bwY + 29);
  }

  // Footer Declaration (Balanced spacing below bottom strip & above signature row)
  if (template.branding.declarationText) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    const declLines = doc.splitTextToSize(template.branding.declarationText, 410);
    doc.text(declLines, 298, 676, { align: 'center' });
  }

  // Director Signature Image & Bottom Signature Lineup (Proportionally balanced inside bottom frame y=798)
  const dirCenterX = 480;
  if (cachedSigAsset) {
    addImageFit(doc, cachedSigAsset, dirCenterX - 54, 718, 108, 32, 'center');
  }

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("Parent's Signature", 56, 766);
  doc.text(template.branding.signatureLabel || 'Signature of Director', dirCenterX, 766, { align: 'center' });
}

function drawAdmissionFormPage(
  doc: jsPDF,
  rec: AdmissionRecord,
  template: AdmissionFormTemplate,
  instituteInfo: { name: string; code: string; address?: string; email?: string; logoUrl?: string },
  cachedLogoAsset?: CachedImageAsset | null,
  cachedPhotoAsset?: CachedImageAsset | null,
  cachedSigAsset?: CachedImageAsset | null
) {
  const variant = template.layoutVariant || 'keystone';
  if (variant === 'keystone') {
    drawKeystoneFormPage(doc, rec, template, instituteInfo, cachedLogoAsset, cachedPhotoAsset, cachedSigAsset);
    return;
  }

  const [ar, ag, ab] = hexToRgb(template.branding.accentColor || '#008FD5');
  const isCompact = variant === 'compact';
  const isClassic = variant === 'classic';

  // Optional Subtle Watermark
  if (template.branding.watermarkText) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(46);
    doc.setTextColor(240, 244, 248);
    doc.text(template.branding.watermarkText.toUpperCase(), 110, 460, { angle: 35 });
  }

  // 1. Header
  const headerH = isCompact ? 76 : 96;
  if (isClassic) {
    doc.setDrawColor(ar, ag, ab);
    doc.setLineWidth(1.5);
    doc.rect(28, 22, 539, 797);
    doc.setFillColor(248, 250, 252);
    doc.rect(30, 24, 535, headerH - 10, 'F');
  } else {
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 595, headerH, 'F');
  }

  const logoAsset: CachedImageAsset | string = cachedLogoAsset || ETK_LOGO_BASE64;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(38, isClassic ? 30 : 18, 56, 56, 6, 6, 'F');
  addImageFit(doc, logoAsset, 41, isClassic ? 33 : 21, 50, 50, 'center');

  const titleX = 108;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isCompact ? 15 : 17);
  doc.setTextColor(isClassic ? 15 : ar, isClassic ? 23 : ag, isClassic ? 42 : ab);
  doc.text((template.branding.headerTitle || instituteInfo.name || 'ED-TRIM KEY INSTITUTE').toUpperCase(), titleX, isClassic ? 48 : 38);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(isClassic ? 71 : 203, isClassic ? 85 : 213, isClassic ? 105 : 225);
  doc.text(
    template.branding.addressBanner || instituteInfo.address || `Institute Code: ${instituteInfo.code || 'ETK'}`,
    titleX,
    isClassic ? 62 : 53
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(isClassic ? ar : 255, isClassic ? ag : 255, isClassic ? ab : 255);
  doc.text((template.branding.subHeader || 'OFFICIAL ADMISSION FORM & FEE RECEIPT').toUpperCase(), titleX, isClassic ? 78 : 71);

  // Student Passport Photo Box (Top Right)
  const photoX = 488;
  const photoY = isClassic ? 28 : 14;
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(photoX, photoY, 62, 72, 4, 4, 'FD');
  if (cachedPhotoAsset) {
    addImageFit(doc, cachedPhotoAsset, photoX + 2, photoY + 2, 58, 68, 'center');
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('PHOTO', photoX + 18, photoY + 40);
  }

  // 2. Dynamic Visible Fields (2-column layout driven by template.fieldsConfig)
  const visibleFields = (template.fieldsConfig || DEFAULT_FIELDS_CONFIG).filter((f) => f.visible);
  let y = headerH + (isClassic ? 16 : 18);

  doc.setFillColor(ar, ag, ab);
  doc.rect(38, y, 519, 18, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`ADM NO: ${rec.admissionNo || 'PENDING'}`, 46, y + 12);
  doc.text(`STATUS: ${String(rec.status || 'ADMITTED').toUpperCase()}`, 430, y + 12);
  y += 26;

  const colW = 252;
  const rowH = isCompact ? 24 : 28;
  for (let i = 0; i < visibleFields.length; i += 2) {
    if (y > 560) break;
    const left = visibleFields[i];
    const right = visibleFields[i + 1];

    doc.setFillColor(i % 4 === 0 ? 248 : 255, i % 4 === 0 ? 250 : 255, i % 4 === 0 ? 252 : 255);
    doc.setDrawColor(226, 232, 240);
    doc.rect(38, y, 519, rowH, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(left.label.toUpperCase(), 46, y + 9);
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(getRecordFieldValue(rec, left).slice(0, 38), 46, y + 20);

    if (right) {
      doc.line(38 + colW + 8, y, 38 + colW + 8, y + rowH);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(right.label.toUpperCase(), 38 + colW + 16, y + 9);
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(getRecordFieldValue(rec, right).slice(0, 38), 38 + colW + 16, y + 20);
    }

    y += rowH;
  }

  y += 10;

  // 3. Documents Strip
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(38, y, 519, 34, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('SUBMITTED DOCUMENTS:', 46, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(rec.documents.length > 0 ? rec.documents.join('  •  ') : 'None marked', 46, y + 25);
  y += 44;

  // 4. Fee Table
  const { gross, concession, net, paid, balance } = computeFeeTotals(rec);
  doc.setFillColor(15, 23, 42);
  doc.rect(38, y, 519, 18, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('FEE SUMMARY', 46, y + 12);
  doc.text('GROSS', 230, y + 12);
  doc.text('CONCESSION', 310, y + 12);
  doc.text('NET', 395, y + 12);
  doc.text('PAID', 455, y + 12);
  doc.text('BALANCE', 508, y + 12);
  y += 18;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(38, y, 519, 24, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Adm: Rs.${rec.admFee} | Mon: Rs.${rec.monthFee} | Kit: Rs.${rec.uniformFee}`, 46, y + 15);
  doc.text(`Rs.${gross}`, 230, y + 15);
  doc.text(`Rs.${concession}`, 310, y + 15);
  doc.text(`Rs.${net}`, 395, y + 15);
  doc.setTextColor(16, 150, 90);
  doc.text(`Rs.${paid}`, 455, y + 15);
  doc.setTextColor(balance > 0 ? 220 : 16, balance > 0 ? 38 : 150, balance > 0 ? 38 : 90);
  doc.text(`Rs.${balance}`, 508, y + 15);
  y += 34;

  // 5. Declaration & Signatures
  if (template.branding.declarationText) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const lines = doc.splitTextToSize(`Declaration: ${template.branding.declarationText}`, 515);
    doc.text(lines, 38, Math.min(y, 700));
  }

  const sigY = 755;
  if (cachedSigAsset) {
    addImageFit(doc, cachedSigAsset, 415, sigY - 34, 96, 30, 'center');
  }
  doc.setDrawColor(148, 163, 184);
  doc.line(46, sigY, 195, sigY);
  doc.line(385, sigY, 545, sigY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Parent / Guardian Signature', 68, sigY + 13);
  doc.text(template.branding.signatureLabel || 'Principal / Authorized Signatory', 395, sigY + 13);

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `${template.branding.footerNote || 'Generated via Ed-Trim Key'}  |  Ref: ${rec.admissionNo}  |  ${new Date().toLocaleString('en-IN')}`,
    38,
    795
  );
}

export function generateDynamicAdmissionFormPdf(
  rec: AdmissionRecord,
  template: AdmissionFormTemplate,
  instituteInfo: { name: string; code: string; address?: string; email?: string; logoUrl?: string }
): { doc: jsPDF; durationMs: number } {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4', compress: true });
  const cachedLogo = getCachedImageAsset(instituteInfo.logoUrl);
  const cachedPhoto = getCachedImageAsset(rec.photoUrl);
  const cachedSig = getCachedImageAsset(template.branding.signatureUrl);

  drawAdmissionFormPage(doc, rec, template, instituteInfo, cachedLogo, cachedPhoto, cachedSig);

  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return { doc, durationMs: Math.max(1, Math.round(t1 - t0)) };
}

export function generateBulkAdmissionFormsPdf(
  records: AdmissionRecord[],
  template: AdmissionFormTemplate,
  instituteInfo: { name: string; code: string; address?: string; email?: string; logoUrl?: string }
): { doc: jsPDF; durationMs: number } {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4', compress: true });
  const cachedLogo = getCachedImageAsset(instituteInfo.logoUrl);
  const cachedSig = getCachedImageAsset(template.branding.signatureUrl);

  records.forEach((rec, index) => {
    if (index > 0) doc.addPage();
    const cachedPhoto = getCachedImageAsset(rec.photoUrl);
    drawAdmissionFormPage(doc, rec, template, instituteInfo, cachedLogo, cachedPhoto, cachedSig);
  });

  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return { doc, durationMs: Math.max(1, Math.round(t1 - t0)) };
}

export function generateAdmissionPaymentReceiptPdf(
  rec: AdmissionRecord,
  template: AdmissionFormTemplate,
  instituteInfo: { name: string; code: string; address?: string; email?: string; logoUrl?: string }
): { doc: jsPDF; durationMs: number } {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4', compress: true });
  const [ar, ag, ab] = hexToRgb(template.branding.accentColor || '#008FD5');
  const cachedLogo = getCachedImageAsset(instituteInfo.logoUrl);
  const cachedSig = getCachedImageAsset(template.branding.signatureUrl);
  const { gross, concession, net, paid, balance } = computeFeeTotals(rec);

  // Outer Frame
  doc.setDrawColor(ar, ag, ab);
  doc.setLineWidth(1.8);
  doc.roundedRect(36, 44, 523, 520, 6, 6);

  // Proportional School Crest
  addImageFit(doc, cachedLogo || ETK_LOGO_BASE64, 48, 54, 58, 56, 'center');

  const frameCenterX = 298;
  const instTitle = (template.branding.headerTitle || instituteInfo.name || 'ED-TRIM KEY INSTITUTE').toUpperCase();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(instTitle.length > 30 ? 16 : 19);
  const titleW = doc.getTextWidth(instTitle);
  const centerX = frameCenterX - titleW / 2 < 114 ? 326 : frameCenterX;
  doc.setTextColor(ar, ag, ab);
  doc.text(instTitle, centerX, 72, { align: 'center', maxWidth: 400 });

  // Tightly Fitted Address Pill
  const addrText = (template.branding.addressBanner || instituteInfo.address || `INSTITUTE CODE: ${instituteInfo.code || 'ETK'}`).toUpperCase();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  const addrW = Math.min(400, Math.max(120, doc.getTextWidth(addrText) + 24));
  doc.setFillColor(15, 18, 22);
  doc.roundedRect(centerX - addrW / 2, 79, addrW, 15, 4, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text(addrText, centerX, 89.5, { align: 'center', maxWidth: 390 });

  const contactText = template.branding.contactLine || (instituteInfo.email ? `CONTACT : ${instituteInfo.email}` : '');
  if (contactText) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(contactText.toUpperCase(), centerX, 108, { align: 'center', maxWidth: 400 });
  }

  // Title Badge (Aligned on same axis)
  const badgeText = 'ADMISSION FEE PAYMENT RECEIPT';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  const bw = doc.getTextWidth(badgeText) + 34;
  doc.setDrawColor(ar, ag, ab);
  doc.setFillColor(240, 249, 255);
  doc.roundedRect(centerX - bw / 2, 118, bw, 20, 5, 5, 'FD');
  doc.setTextColor(15, 23, 42);
  doc.text(badgeText, centerX, 131.5, { align: 'center' });

  // Meta Strip
  doc.setDrawColor(203, 213, 225);
  doc.line(36, 148, 559, 148);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`Receipt No: RCP-${rec.admissionNo || 'TEMP'}`, 52, 165);
  doc.text(`Admission No: ${rec.admissionNo || 'PENDING'}`, 245, 165);
  doc.text(`Date: ${formatDdMmmYyyy(rec.admissionDate) || '-'}`, 448, 165);

  // Student Details Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(48, 178, 499, 64, 4, 4, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Student Name:', 60, 196);
  doc.text("Father's Name:", 60, 214);
  doc.text('Contact No:', 60, 232);

  doc.text('Class / Roll No:', 320, 196);
  doc.text('Academic Session:', 320, 214);
  doc.text('Payment Mode:', 320, 232);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(String(rec.studentName || '-').toUpperCase(), 132, 196);
  doc.text(String(rec.fatherName || '-').toUpperCase(), 132, 214);
  doc.text(String(rec.contactNo || '-'), 132, 232);

  doc.text(`${rec.className || '-'} ${rec.rollNo ? `(Roll #${rec.rollNo})` : ''}`, 405, 196);
  doc.text(rec.academicSession || '-', 405, 214);
  doc.text(String(rec.payMode || 'Cash').toUpperCase(), 405, 232);

  // Fee Breakdown Table
  let y = 258;
  doc.setFillColor(15, 23, 42);
  doc.rect(48, y, 499, 22, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('FEE PARTICULAR', 60, y + 14);
  doc.text('AMOUNT (INR)', 535, y + 14, { align: 'right' });
  y += 22;

  const ledgerRows: Array<{ label: string; amount: string; bold?: boolean; color?: [number, number, number] }> = [
    { label: 'Admission Fee', amount: `Rs. ${Number(rec.admFee || 0).toLocaleString('en-IN')}` },
    { label: 'Current Month Tuition Fee', amount: `Rs. ${Number(rec.monthFee || 0).toLocaleString('en-IN')}` },
    { label: 'Uniform / Book Kit Charge', amount: `Rs. ${Number(rec.uniformFee || 0).toLocaleString('en-IN')}` },
    { label: 'Gross Fee Total', amount: `Rs. ${gross.toLocaleString('en-IN')}`, bold: true },
    { label: 'Less: Concession / Scholarship', amount: `- Rs. ${concession.toLocaleString('en-IN')}`, color: [217, 119, 6] },
    { label: 'Net Payable Fee', amount: `Rs. ${net.toLocaleString('en-IN')}`, bold: true },
    { label: `Amount Paid (${rec.payMode || 'Cash'})`, amount: `Rs. ${paid.toLocaleString('en-IN')}`, bold: true, color: [21, 128, 61] },
    {
      label: 'Balance Due',
      amount: balance > 0 ? `Rs. ${balance.toLocaleString('en-IN')}` : 'Rs. 0 (NIL)',
      bold: true,
      color: balance > 0 ? [220, 38, 38] : [21, 128, 61],
    },
  ];

  ledgerRows.forEach((row, idx) => {
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(48, y, 499, 22, 'FD');
    doc.setFont('helvetica', row.bold ? 'bold' : 'normal');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(row.label, 60, y + 14.5);
    if (row.color) doc.setTextColor(row.color[0], row.color[1], row.color[2]);
    doc.text(row.amount, 535, y + 14.5, { align: 'right' });
    y += 22;
  });

  if (rec.remarks) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Note: ${rec.remarks.slice(0, 95)}`, 48, y + 18);
  }

  // Signatures
  const sigY = 516;
  if (cachedSig) {
    addImageFit(doc, cachedSig, 430, sigY - 34, 104, 30, 'center');
  }
  doc.setDrawColor(148, 163, 184);
  doc.line(54, sigY, 194, sigY);
  doc.line(402, sigY, 542, sigY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Depositor / Parent Signature', 70, sigY + 14);
  doc.text('Authorized Receiver / Cashier', 415, sigY + 14);

  // Footer
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Generated via Ed-Trim Key  •  RCP-${rec.admissionNo || 'ADM'}  •  ${new Date().toLocaleString('en-IN')}`,
    298,
    555,
    { align: 'center' }
  );

  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return { doc, durationMs: Math.max(1, Math.round(t1 - t0)) };
}

export function generateAdmissionSlipPdf(
  rec: AdmissionRecord,
  instituteInfo: { name: string; code: string; address?: string; email?: string; logoUrl?: string },
  template?: AdmissionFormTemplate
): jsPDF {
  const tpl = template || getDefaultTemplate(instituteInfo.name);
  return generateDynamicAdmissionFormPdf(rec, tpl, instituteInfo).doc;
}

export function generateRosterPdf(
  records: AdmissionRecord[],
  instituteInfo: { name: string; code: string },
  filterLabel = 'All Classes'
): jsPDF {
  const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4', compress: true });
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 595, 76, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(38, 195, 234);
  doc.text((instituteInfo.name || 'ED-TRIM KEY').toUpperCase(), 40, 34);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(226, 232, 240);
  doc.text(`Student Admission Roster (${filterLabel}) • Total Records: ${records.length}`, 40, 54);

  let y = 98;
  const drawTableHeader = (topY: number) => {
    doc.setFillColor(38, 195, 234);
    doc.rect(35, topY, 525, 20, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text('ADM NO', 42, topY + 13);
    doc.text('STUDENT NAME', 115, topY + 13);
    doc.text('FATHER NAME', 235, topY + 13);
    doc.text('CLASS / ROLL', 350, topY + 13);
    doc.text('CONTACT', 430, topY + 13);
    doc.text('STATUS', 505, topY + 13);
  };

  drawTableHeader(y);
  y += 22;

  records.forEach((r, idx) => {
    if (y > 780) {
      doc.addPage();
      y = 40;
      drawTableHeader(y);
      y += 22;
    }
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(35, y - 2, 525, 18, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(String(r.admissionNo || '-').slice(0, 14), 42, y + 10);
    doc.text(String(r.studentName || '-').slice(0, 22), 115, y + 10);
    doc.text(String(r.fatherName || '-').slice(0, 20), 235, y + 10);
    doc.text(`${r.className || '-'} / ${r.rollNo ?? '-'}`, 350, y + 10);
    doc.text(String(r.contactNo || '-').slice(0, 13), 430, y + 10);
    doc.text(String(r.status || '-'), 505, y + 10);
    y += 18;
  });

  return doc;
}

export function exportAdmissionsToCsv(records: AdmissionRecord[], instCode = 'ETK'): void {
  const headers = [
    'Admission No',
    'Status',
    'Student Name',
    'Father Name',
    'Mother Name',
    'Class',
    'Section',
    'Roll No',
    'Session',
    'Admission Date',
    'DOB',
    'Gender',
    'Contact No',
    'Village',
    'Net Fee',
    'Paid',
    'Balance',
    'Drive PDF URL',
  ];

  const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;

  const rows = records.map((r) => {
    const { net, paid, balance } = computeFeeTotals(r);
    return [
      r.admissionNo,
      r.status,
      r.studentName,
      r.fatherName,
      r.motherName,
      r.className,
      r.section,
      r.rollNo ?? '',
      r.academicSession,
      r.admissionDate,
      r.dob,
      r.gender,
      r.contactNo,
      r.village,
      net,
      paid,
      balance,
      r.formPdfUrl || '',
    ]
      .map(escapeCsv)
      .join(',');
  });

  const csv = [headers.map(escapeCsv).join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${instCode || 'ETK'}_Admissions_${getTodayIsoDate()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

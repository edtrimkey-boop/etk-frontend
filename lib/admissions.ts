'use client';

import { jsPDF } from 'jspdf';
import { supabase } from './supabase';
import { serverCall } from './api-client';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './pricing';
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
export type RightWidgetChoice = 'calling_grid' | 'fee_summary' | 'office_checklist' | 'office_remarks' | 'none';
export type BottomWidgetChoice = 'month_grid_3x12' | 'installment_strip' | 'docs_strip' | 'none';

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

  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  };

  const instCode = user?.code || user?.instId || payload?.profile?.code || payload?.code;
  const instEmail = user?.email || payload?.profile?.email;

  if (instCode && instCode !== 'all') {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/institutes?institute_code=eq.${encodeURIComponent(instCode)}&select=id&limit=1`,
        { headers }
      );
      if (res.ok) {
        const rows = await res.json();
        if (rows?.[0]?.id) return rows[0].id;
      }
    } catch {}
  }

  if (instEmail) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/institutes?admin_email=eq.${encodeURIComponent(instEmail)}&select=id&limit=1`,
        { headers }
      );
      if (res.ok) {
        const rows = await res.json();
        if (rows?.[0]?.id) return rows[0].id;
      }
    } catch {}
  }

  return null;
}

// =========================================================================
// Asset Pre-Caching Engine (Guarantees <50ms PDF Generation)
// =========================================================================
const imageDataUrlCache = new Map<string, string>();

export async function preloadImageAsDataUrl(url?: string): Promise<string | null> {
  if (!url) return null;
  if (imageDataUrlCache.has(url)) return imageDataUrlCache.get(url)!;
  if (url.startsWith('data:image/')) {
    imageDataUrlCache.set(url, url);
    return url;
  }

  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
    if (dataUrl) imageDataUrlCache.set(url, dataUrl);
    return dataUrl;
  } catch {
    return null;
  }
}

export function getCachedImageDataUrl(url?: string): string | null {
  if (!url) return null;
  if (url.startsWith('data:image/')) return url;
  return imageDataUrlCache.get(url) || null;
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

export async function fetchAdmissionBootstrap(
  user: any,
  payload: any,
  instName: string,
  instCode = 'ETK',
  instAddress = ''
): Promise<{
  instituteId: string;
  records: AdmissionRecord[];
  template: AdmissionFormTemplate;
  counters: InstituteCounters;
  tablesReady: boolean;
}> {
  const fallbackInstId = (await resolveInstituteUuid(user, payload)) || user?.code || 'default';

  try {
    const res = await serverCall('getAdmissionBootstrap', { instId: fallbackInstId });
    if (res?.success) {
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
  } catch (err) {
    console.warn('[Admission] Gateway bootstrap fallback to direct Supabase:', err);
  }

  // Fallback directly to Supabase `students` table
  let dbStudents: any[] = [];
  if (UUID_REGEX.test(fallbackInstId)) {
    try {
      dbStudents = await fetchAdmissionStudents(fallbackInstId);
    } catch {}
  }

  const fallbackRecords = mergeStudentsAndAdmissions(fallbackInstId, dbStudents);
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
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('institute_id', instituteId)
    .order('class_name', { ascending: true })
    .order('roll_no', { ascending: true });

  if (error) throw new Error(error.message || 'Failed to fetch students from Supabase.');
  return data || [];
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
    // Fallback to direct Supabase students upsert if offline from gateway
    saveAdmissionMetaRecord(instituteId, record);
    if (record.status === 'Admitted' && UUID_REGEX.test(instituteId)) {
      return upsertStudentRecord(instituteId, record);
    }
    const pipeline = loadPipelineRecords(instituteId);
    const idx = pipeline.findIndex((p) => p.id === record.id);
    if (idx >= 0) pipeline[idx] = record;
    else pipeline.unshift(record);
    savePipelineRecords(instituteId, pipeline);
    return { success: true, allocatedAdmissionNo: record.admissionNo, allocatedRollNo: record.rollNo };
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
  pdfDoc: jsPDF
): Promise<{ success: boolean; formPdfUrl?: string; driveFileId?: string; error?: string }> {
  try {
    const dataUri = pdfDoc.output('datauristring');
    const fileBase64 = dataUri.split(',')[1] || '';
    const safeAdm = String(record.admissionNo || 'ADM').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeName = String(record.studentName || 'Student').replace(/[^a-zA-Z0-9_-]/g, '_');

    const res = await serverCall('archiveAdmissionPdfToDrive', {
      instId: instituteId,
      admissionNo: record.admissionNo,
      studentName: record.studentName,
      academicSession: record.academicSession || getCurrentAcademicSession(),
      fileName: `${safeAdm}_${safeName}_Admission_Form.pdf`,
      fileBase64,
      existingDriveFileId: record.driveFileId || null,
    });

    if (res?.success && res.formPdfUrl) {
      saveAdmissionMetaRecord(instituteId, {
        ...record,
        formPdfUrl: res.formPdfUrl,
        driveFileId: res.driveFileId || record.driveFileId,
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
  if (!instituteId) return { success: false, error: 'Institute ID is missing.' };

  const rowPayload: Record<string, any> = {
    institute_id: instituteId,
    admission_no: record.admissionNo.trim().toUpperCase(),
    class_name: record.className,
    roll_no:
      record.rollNo !== null && record.rollNo !== undefined && !Number.isNaN(Number(record.rollNo))
        ? Number(record.rollNo)
        : null,
    student_name: record.studentName.trim(),
    father_name: record.fatherName.trim(),
    village: record.village.trim() || '-',
    contact_no: record.contactNo.trim(),
    dob: record.dob ? record.dob : null,
    status: record.studentStatus || 'Active',
    photo_url: record.photoUrl || null,
  };

  try {
    if (record.supabaseStudentId) {
      const { data, error } = await supabase
        .from('students')
        .update(rowPayload)
        .eq('id', record.supabaseStudentId)
        .eq('institute_id', instituteId)
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      return { success: true, student: data };
    }

    const { data: existing } = await supabase
      .from('students')
      .select('id')
      .eq('institute_id', instituteId)
      .eq('admission_no', rowPayload.admission_no)
      .maybeSingle();

    if (existing?.id) {
      const { data, error } = await supabase
        .from('students')
        .update(rowPayload)
        .eq('id', existing.id)
        .eq('institute_id', instituteId)
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      return { success: true, student: data };
    }

    const { data, error } = await supabase.from('students').insert([rowPayload]).select().single();
    if (error) return { success: false, error: error.message };
    return { success: true, student: data };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Database write failed.' };
  }
}

export async function updateStudentClassInDb(
  instituteId: string,
  studentId: string,
  nextClass: string,
  admissionNo?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await serverCall('promoteAdmissionStudent', { studentId, admissionNo, nextClass });
    if (res?.success) return { success: true };
    return { success: false, error: res?.message };
  } catch {
    const { error } = await supabase
      .from('students')
      .update({ class_name: nextClass })
      .eq('id', studentId)
      .eq('institute_id', instituteId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  }
}

export async function bulkPromoteClassInDb(
  instituteId: string,
  fromClass: string,
  toClass: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const res = await serverCall('bulkPromoteStudents', { fromClass, toClass });
    if (res?.success) return { success: true, count: res.count };
    return { success: false, error: res?.message };
  } catch {
    const { data, error } = await supabase
      .from('students')
      .update({ class_name: toClass })
      .eq('institute_id', instituteId)
      .eq('class_name', fromClass)
      .eq('status', 'Active')
      .select('id');
    if (error) return { success: false, error: error.message };
    return { success: true, count: (data || []).length };
  }
}

export async function toggleStudentStatusInDb(
  instituteId: string,
  studentId: string,
  nextStatus: 'Active' | 'Inactive'
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await serverCall('toggleAdmissionStudentStatus', { studentId, nextStatus });
    if (res?.success) return { success: true };
    return { success: false, error: res?.message };
  } catch {
    const { error } = await supabase
      .from('students')
      .update({ status: nextStatus })
      .eq('id', studentId)
      .eq('institute_id', instituteId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  }
}

export async function deleteStudentInDb(
  instituteId: string,
  studentId?: string,
  admissionNo?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await serverCall('deleteAdmissionRecord', { studentId, admissionNo });
    if (res?.success) return { success: true };
    return { success: false, error: res?.message };
  } catch {
    if (!studentId) return { success: true };
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', studentId)
      .eq('institute_id', instituteId);
    if (error) return { success: false, error: error.message };
    return { success: true };
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

export async function uploadStudentPhotoToStorage(
  instituteId: string,
  admNo: string,
  file: File
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const blob = await compressStudentPhoto(file);
    const cleanAdm = (admNo || 'student').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `student_${instituteId}_${cleanAdm}_${Date.now()}.jpg`;

    const buckets = ['photo', 'profile_pics'];
    let lastError = 'Upload failed';

    for (const bucket of buckets) {
      const { error } = await supabase.storage
        .from(bucket)
        .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });
      if (!error) {
        const { data: pub } = supabase.storage.from(bucket).getPublicUrl(fileName);
        if (pub?.publicUrl) {
          return { success: true, url: pub.publicUrl };
        }
      } else {
        lastError = error.message;
      }
    }

    return { success: false, error: lastError };
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
  cachedLogoDataUrl?: string | null,
  cachedPhotoDataUrl?: string | null,
  cachedSigDataUrl?: string | null
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

  // Header Logo (Top Left)
  const logoSource = cachedLogoDataUrl || ETK_LOGO_BASE64;
  try {
    doc.addImage(logoSource, 'PNG', 44, 52, 62, 62);
  } catch {}

  // Bold School Name
  const instTitle = (template.branding.headerTitle || instituteInfo.name || 'ED-TRIM KEY INSTITUTE').toUpperCase();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(instTitle.length > 30 ? 18 : 22);
  doc.setTextColor(ar, ag, ab);
  doc.text(instTitle, 324, 72, { align: 'center', maxWidth: 420 });

  // Dark Pill Address Banner
  const addrBanner = (template.branding.addressBanner || instituteInfo.address || `INSTITUTE CODE: ${instituteInfo.code || 'ETK'}`).toUpperCase();
  doc.setFillColor(15, 18, 22);
  doc.roundedRect(120, 80, 412, 16, 4, 4, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text(addrBanner, 326, 91, { align: 'center', maxWidth: 400 });

  // Contact Line
  const contactText = template.branding.contactLine || (instituteInfo.email ? `CONTACT : ${instituteInfo.email}` : '');
  if (contactText) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(contactText.toUpperCase(), 310, 113, { align: 'center', maxWidth: 440 });
  }

  // Centered Outlined ADMISSION FORM Pill
  const badgeText = (template.branding.subHeader || 'ADMISSION FORM').toUpperCase();
  doc.setDrawColor(ar, ag, ab);
  doc.setLineWidth(1.2);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(226, 121, 144, 21, 5, 5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(badgeText, 298, 135, { align: 'center' });

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

  if (cachedPhotoDataUrl) {
    try {
      doc.addImage(cachedPhotoDataUrl, 'JPEG', photoX + 2, photoY + 2, photoW - 4, photoH - 4);
    } catch {}
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
    const { concession, net, paid, balance } = computeFeeTotals(rec);
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.8);
    doc.rect(rwX, rwY, rwW, 130);
    doc.setFillColor(241, 245, 249);
    doc.rect(rwX, rwY, rwW, 20, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('FEE & PAYMENT RECEIPT', rwX + rwW / 2, rwY + 13, { align: 'center' });
    const feeRows = [
      ['Gross Total', `Rs. ${gross}`],
      ['Concession', `Rs. ${concession}`],
      ['Net Payable', `Rs. ${net}`],
      ['Paid (' + (rec.payMode || 'Cash') + ')', `Rs. ${paid}`],
      ['Balance Due', `Rs. ${balance}`],
    ];
    feeRows.forEach((pair, idx) => {
      const fy = rwY + 38 + idx * 18;
      doc.setFont('helvetica', idx >= 3 ? 'bold' : 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(pair[0], rwX + 8, fy);
      doc.text(pair[1], rwX + rwW - 8, fy, { align: 'right' });
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

  // Bottom Full-Width Widget Strip
  const bottomWidget = template.branding.bottomWidget || 'month_grid_3x12';
  const bwX = 43;
  const bwY = 582;
  const bwW = 509;

  if (bottomWidget === 'month_grid_3x12') {
    const colW = bwW / 12;
    const rowH = 14;
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
        doc.text(m, bwX + c * colW + colW / 2, bwY + r * rowH + 10, { align: 'center' });
      });
    }
  } else if (bottomWidget === 'installment_strip') {
    const quarters = ['QUARTER 1 (APR-JUN)', 'QUARTER 2 (JUL-SEP)', 'QUARTER 3 (OCT-DEC)', 'QUARTER 4 (JAN-MAR)'];
    const qW = bwW / 4;
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.8);
    doc.rect(bwX, bwY, bwW, 38);
    doc.line(bwX, bwY + 16, bwX + bwW, bwY + 16);
    quarters.forEach((q, idx) => {
      if (idx > 0) doc.line(bwX + idx * qW, bwY, bwX + idx * qW, bwY + 38);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text(q, bwX + idx * qW + qW / 2, bwY + 11, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text('Paid / Receipt No:', bwX + idx * qW + 6, bwY + 30);
      doc.setTextColor(15, 23, 42);
    });
  } else if (bottomWidget === 'docs_strip') {
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.8);
    doc.rect(bwX, bwY, bwW, 36);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('DOCUMENTS SUBMITTED:', bwX + 10, bwY + 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(rec.documents.length > 0 ? rec.documents.join('  •  ') : 'None marked', bwX + 10, bwY + 27);
  }

  // Footer Declaration
  if (template.branding.declarationText) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    const declLines = doc.splitTextToSize(template.branding.declarationText, 380);
    doc.text(declLines, 298, 682, { align: 'center' });
  }

  // Director Signature Image (if uploaded/cached)
  if (cachedSigDataUrl) {
    try {
      doc.addImage(cachedSigDataUrl, 'PNG', 432, 718, 92, 30);
    } catch {}
  }

  // Bottom Signatures
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("Parent's Signature", 55, 760);
  doc.text(template.branding.signatureLabel || 'Signature of Director', 432, 760);
}

function drawAdmissionFormPage(
  doc: jsPDF,
  rec: AdmissionRecord,
  template: AdmissionFormTemplate,
  instituteInfo: { name: string; code: string; address?: string; email?: string; logoUrl?: string },
  cachedLogoDataUrl?: string | null,
  cachedPhotoDataUrl?: string | null,
  cachedSigDataUrl?: string | null
) {
  const variant = template.layoutVariant || 'keystone';
  if (variant === 'keystone') {
    drawKeystoneFormPage(doc, rec, template, instituteInfo, cachedLogoDataUrl, cachedPhotoDataUrl, cachedSigDataUrl);
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

  const logoSource = cachedLogoDataUrl || ETK_LOGO_BASE64;
  try {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(38, isClassic ? 30 : 18, 56, 56, 6, 6, 'F');
    doc.addImage(logoSource, 'PNG', 41, isClassic ? 33 : 21, 50, 50);
  } catch {}

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
  if (cachedPhotoDataUrl) {
    try {
      doc.addImage(cachedPhotoDataUrl, 'JPEG', photoX + 2, photoY + 2, 58, 68);
    } catch {}
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
  if (cachedSigDataUrl) {
    try {
      doc.addImage(cachedSigDataUrl, 'PNG', 415, sigY - 34, 90, 28);
    } catch {}
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
  const doc = new jsPDF('p', 'pt', 'a4');
  const cachedLogo = getCachedImageDataUrl(instituteInfo.logoUrl);
  const cachedPhoto = getCachedImageDataUrl(rec.photoUrl);
  const cachedSig = getCachedImageDataUrl(template.branding.signatureUrl);

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
  const doc = new jsPDF('p', 'pt', 'a4');
  const cachedLogo = getCachedImageDataUrl(instituteInfo.logoUrl);
  const cachedSig = getCachedImageDataUrl(template.branding.signatureUrl);

  records.forEach((rec, index) => {
    if (index > 0) doc.addPage();
    const cachedPhoto = getCachedImageDataUrl(rec.photoUrl);
    drawAdmissionFormPage(doc, rec, template, instituteInfo, cachedLogo, cachedPhoto, cachedSig);
  });

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
  const doc = new jsPDF('p', 'pt', 'a4');
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

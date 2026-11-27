'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import { OpticalButton } from '@/components/ui/OpticalGlass';
import AccessDenied from '@/components/shared/AccessDenied';
import IOSSpinner from '@/components/ui/IOSSpinner';
import { normalizeRole, getPermissions } from '@/lib/rbac';
import {
  ADMISSION_CLASSES,
  ADMISSION_DOCUMENTS,
  AdmissionFormTemplate,
  AdmissionRecord,
  AdmissionStatus,
  ClassCapacityMap,
  InstituteCounters,
  archiveAdmissionPdfToDriveRemote,
  bulkPromoteClassInDb,
  computeFeeTotals,
  deleteStudentInDb,
  exportAdmissionsToCsv,
  fetchAdmissionBootstrap,
  generateAdmissionPaymentReceiptPdf,
  generateBulkAdmissionFormsPdf,
  generateDynamicAdmissionFormPdf,
  generateRosterPdf,
  getCurrentAcademicSession,
  getDefaultTemplate,
  getNextClassName,
  getPrevClassName,
  loadPipelineRecords,
  preloadImageAsDataUrl,
  saveAdmissionRecordRemote,
  saveAdmissionTemplateRemote,
  saveClassCapacities,
  savePipelineRecords,
  toggleStudentStatusInDb,
  updateStudentClassInDb,
} from '@/lib/admissions';
import {
  AdmissionFormModal,
  AdmissionSlipModal,
  BulkPromoteModal,
  ClassCapacityModal,
  QuickEnquiryModal,
} from '@/components/admission/AdmissionModals';
import { AdmissionTemplateModal } from '@/components/admission/AdmissionTemplateModal';

type SubTab = 'pipeline' | 'roster' | 'seats' | 'fees';

function highlightMatch(text: string | number | null | undefined, query: string) {
  if (text === null || text === undefined || text === '') return '-';
  const str = String(text);
  const q = query.trim();
  if (!q) return str;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = str.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark key={i} className="highlight-match">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

export default function AdmissionPortalPage() {
  const { user, payload, showToast, showAlert, showConfirm } = useDashboard();
  const role = normalizeRole(user?.role);
  const permissions = getPermissions(user?.role);
  const canManage = permissions.canManageStudents || role === 'super_admin';

  const instCode = user?.code || user?.instId || payload?.profile?.code || 'ETK';
  const instInfo = useMemo(
    () => ({
      name: user?.institute || payload?.profile?.institute || 'Ed-Trim Key Institute',
      code: instCode,
      address: user?.instDetails?.address || '',
      email: user?.instDetails?.adminEmail || user?.email || '',
      logoUrl: user?.logo || user?.instDetails?.logoUrl || payload?.profile?.logo || '',
    }),
    [user, payload, instCode]
  );

  const [instId, setInstId] = useState<string>('');
  const [records, setRecords] = useState<AdmissionRecord[]>([]);
  const [template, setTemplate] = useState<AdmissionFormTemplate>(() =>
    getDefaultTemplate(instInfo.name, instInfo.code, instInfo.address)
  );
  const [counters, setCounters] = useState<InstituteCounters>({
    lastAdmSeq: 0,
    lastEnqSeq: 0,
    rollByClass: {},
  });
  const [tablesReady, setTablesReady] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);

  const [subTab, setSubTab] = useState<SubTab>('pipeline');
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sessionFilter, setSessionFilter] = useState('all');
  const [displayLimit, setDisplayLimit] = useState<number>(30);

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AdmissionRecord | null>(null);
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [slipRecord, setSlipRecord] = useState<AdmissionRecord | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [capacityOpen, setCapacityOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);

  // Pre-cache institute logo & signature in memory so PDF generation is <50ms with 0 network calls
  useEffect(() => {
    if (instInfo.logoUrl) {
      preloadImageAsDataUrl(instInfo.logoUrl).catch(() => {});
    }
    if (template.branding.signatureUrl) {
      preloadImageAsDataUrl(template.branding.signatureUrl).catch(() => {});
    }
  }, [instInfo.logoUrl, template.branding.signatureUrl]);

  // Open ?new=1 automatically if routed from Students Database
  useEffect(() => {
    if (typeof window !== 'undefined' && canManage) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('new') === '1') {
        setEditingRecord(null);
        setFormOpen(true);
      }
    }
  }, [canManage]);

  const loadAll = useCallback(
    async (forceSpinner = false) => {
      if (role === 'operator') return;
      if (forceSpinner) setSyncing(true);
      else setLoading(true);

      try {
        const boot = await fetchAdmissionBootstrap(user, payload, instInfo.name, instCode, instInfo.address);
        setInstId(boot.instituteId);
        setRecords(boot.records);
        setTemplate(boot.template);
        setCounters(boot.counters);
        setTablesReady(boot.tablesReady);
      } finally {
        setLoading(false);
        setSyncing(false);
      }
    },
    [user, payload, role, instInfo.name, instCode, instInfo.address]
  );

  useEffect(() => {
    if (user || payload) {
      loadAll(false);
    }
  }, [user, payload, loadAll]);

  useEffect(() => {
    setDisplayLimit(30);
  }, [subTab, search, classFilter, statusFilter, sessionFilter]);

  const sessions = useMemo(() => {
    const set = new Set<string>([getCurrentAcademicSession()]);
    records.forEach((r) => {
      if (r.academicSession) set.add(r.academicSession);
    });
    return Array.from(set).sort().reverse();
  }, [records]);

  const kpis = useMemo(() => {
    const currentSess = getCurrentAcademicSession();
    const enrolled = records.filter((r) => r.status === 'Admitted').length;
    const sessionCount = records.filter((r) => r.status === 'Admitted' && r.academicSession === currentSess).length;
    const pending = records.filter((r) => ['Enquiry', 'Applied', 'Verified'].includes(r.status)).length;
    let totalCollected = 0;
    let totalBalance = 0;
    records.forEach((r) => {
      const { paid, balance } = computeFeeTotals(r);
      totalCollected += paid;
      totalBalance += balance;
    });
    return { enrolled, sessionCount, pending, totalCollected, totalBalance, currentSess };
  }, [records]);

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    const classTarget = classFilter.trim().toLowerCase();
    return records.filter((r) => {
      if (subTab === 'roster' && r.status !== 'Admitted') return false;
      if (classFilter !== 'all' && String(r.className || '').trim().toLowerCase() !== classTarget) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (sessionFilter !== 'all' && r.academicSession !== sessionFilter) return false;

      if (!q) return true;
      const haystack = [
        r.admissionNo,
        r.studentName,
        r.fatherName,
        r.motherName,
        r.contactNo,
        r.village,
        r.className,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [records, subTab, classFilter, statusFilter, sessionFilter, search]);

  const visibleRecords = useMemo(() => filteredRecords.slice(0, displayLimit), [filteredRecords, displayLimit]);
  const hasMore = displayLimit < filteredRecords.length;

  const capacities: ClassCapacityMap = template.classCapacities || {};

  const seatMatrix = useMemo(() => {
    return ADMISSION_CLASSES.map((cls) => {
      const clsLower = cls.toLowerCase();
      const enrolled = records.filter(
        (r) =>
          r.status === 'Admitted' &&
          String(r.className || '').trim().toLowerCase() === clsLower &&
          r.studentStatus !== 'Inactive'
      ).length;
      const pending = records.filter(
        (r) =>
          ['Enquiry', 'Applied', 'Verified'].includes(r.status) &&
          String(r.className || '').trim().toLowerCase() === clsLower
      ).length;
      const capacity = capacities[cls] || 40;
      const available = Math.max(0, capacity - enrolled);
      const pct = Math.min(100, Math.round((enrolled / Math.max(1, capacity)) * 100));
      return { cls, enrolled, pending, capacity, available, pct };
    });
  }, [records, capacities]);

  if (role === 'operator') {
    return <AccessDenied requiredRole="Institute Admin or Teacher" moduleName="Admission System" />;
  }

  // =========================================================================
  // Millisecond PDF Generation + Automatic Google Drive Archival
  // (Path: Trim Key System / 4_Institutes / {Institute} / Documents / Admission Forms)
  // =========================================================================
  const ensureRecordAssetsCached = async (rec: AdmissionRecord) => {
    await Promise.allSettled([
      instInfo.logoUrl ? preloadImageAsDataUrl(instInfo.logoUrl) : Promise.resolve(null),
      template.branding.signatureUrl ? preloadImageAsDataUrl(template.branding.signatureUrl) : Promise.resolve(null),
      rec.photoUrl ? preloadImageAsDataUrl(rec.photoUrl) : Promise.resolve(null),
    ]);
  };

  const handleGenerateAndArchive = async (
    rec: AdmissionRecord,
    silentArchive = false,
    docType: 'admission_form' | 'receipt' = 'admission_form'
  ): Promise<number> => {
    await ensureRecordAssetsCached(rec);
    const { doc, durationMs } =
      docType === 'receipt'
        ? generateAdmissionPaymentReceiptPdf(rec, template, instInfo)
        : generateDynamicAdmissionFormPdf(rec, template, instInfo);

    if (!silentArchive) {
      showToast(`PDF rendered in ${durationMs}ms. Auto-archiving to Drive Documents...`, 'info');
    }

    const driveRes = await archiveAdmissionPdfToDriveRemote(instId || 'default', rec, doc, docType);
    if (driveRes.success && driveRes.formPdfUrl) {
      setRecords((prev) =>
        prev.map((item) =>
          item.admissionNo === rec.admissionNo
            ? {
                ...item,
                ...(docType === 'receipt'
                  ? { receiptPdfUrl: driveRes.formPdfUrl, receiptDriveFileId: driveRes.driveFileId }
                  : { formPdfUrl: driveRes.formPdfUrl, driveFileId: driveRes.driveFileId }),
              }
            : item
        )
      );
      setSlipRecord((prev) =>
        prev && prev.admissionNo === rec.admissionNo
          ? {
              ...prev,
              ...(docType === 'receipt'
                ? { receiptPdfUrl: driveRes.formPdfUrl, receiptDriveFileId: driveRes.driveFileId }
                : { formPdfUrl: driveRes.formPdfUrl, driveFileId: driveRes.driveFileId }),
            }
          : prev
      );
      showToast(
        docType === 'receipt'
          ? 'Payment Receipt archived to Documents / Payment Receipts!'
          : 'Admission Form auto-saved to Documents / Admission Forms!',
        'success'
      );
    } else if (!silentArchive) {
      showToast(driveRes.error || 'Drive upload skipped (check Drive env vars on backend).', 'warning');
    }
    return durationMs;
  };

  const handleQuickRowFormPdf = async (rec: AdmissionRecord) => {
    await ensureRecordAssetsCached(rec);
    const { doc, durationMs } = generateDynamicAdmissionFormPdf(rec, template, instInfo);
    doc.save(`Admission_Form_${rec.admissionNo || 'Student'}.pdf`);
    showToast(`Admission Form PDF (${durationMs}ms).`, 'success');
    if (rec.status === 'Admitted' && !rec.formPdfUrl) {
      handleGenerateAndArchive(rec, true, 'admission_form').catch(() => {});
    }
  };

  const handleQuickRowReceiptPdf = async (rec: AdmissionRecord) => {
    await ensureRecordAssetsCached(rec);
    const { doc, durationMs } = generateAdmissionPaymentReceiptPdf(rec, template, instInfo);
    doc.save(`Payment_Receipt_${rec.admissionNo || 'Student'}.pdf`);
    showToast(`Payment Receipt PDF (${durationMs}ms).`, 'success');
    if (rec.status === 'Admitted') {
      handleGenerateAndArchive(rec, true, 'receipt').catch(() => {});
    }
  };

  const handlePrintBlankForm = async () => {
    await ensureRecordAssetsCached({} as AdmissionRecord);
    const blankSample: AdmissionRecord = {
      id: 'blank-form',
      admissionNo: '',
      status: 'Admitted',
      studentStatus: 'Active',
      className: '',
      section: '',
      rollNo: null,
      academicSession: getCurrentAcademicSession(),
      admissionDate: '',
      studentName: '',
      dob: '',
      gender: 'Male',
      category: '',
      bloodGroup: '',
      aadhaar: '',
      photoUrl: '',
      fatherName: '',
      motherName: '',
      contactNo: '',
      guardianName: '',
      guardianMobile: '',
      village: '',
      address: '',
      prevSchool: '',
      prevClass: '',
      documents: [],
      admFee: 0,
      monthFee: 0,
      uniformFee: 0,
      concession: 0,
      amountPaid: 0,
      payMode: 'Cash',
      remarks: '',
      customFields: {},
    };
    const { doc } = generateDynamicAdmissionFormPdf(blankSample, template, instInfo);
    window.open(doc.output('bloburl'), '_blank');
  };

  // =========================================================================
  // CRUD Handlers
  // =========================================================================
  const handleSaveAdmission = async (rec: AdmissionRecord) => {
    if (!canManage) return;
    const activeId = instId || 'default';

    const res = await saveAdmissionRecordRemote(activeId, rec);
    if (!res.success) {
      showAlert(`Failed to save record: ${res.error}`, 'Database Error');
      return;
    }

    if (res.counters) {
      setCounters(res.counters);
    }

    const allocatedAdm = res.allocatedAdmissionNo || rec.admissionNo;
    const allocatedRoll = res.allocatedRollNo !== undefined ? res.allocatedRollNo : rec.rollNo;
    const savedRec: AdmissionRecord = {
      ...rec,
      admissionNo: allocatedAdm,
      rollNo: allocatedRoll,
      supabaseStudentId: res.student?.id || rec.supabaseStudentId,
    };

    if (savedRec.status === 'Admitted') {
      showToast(
        `${savedRec.studentName} enrolled (${savedRec.admissionNo}${savedRec.rollNo ? ` • Roll ${savedRec.rollNo}` : ''}). Archiving to Google Drive...`,
        'success'
      );
    } else {
      showToast(`Saved ${savedRec.studentName} as ${savedRec.status} (${savedRec.admissionNo}).`, 'success');
    }

    setFormOpen(false);
    setEditingRecord(null);
    await loadAll(true);

    // Automatically upload PDFs to respective Drive folders after fresh table reload so links stay synced in UI
    if (savedRec.status === 'Admitted') {
      handleGenerateAndArchive(savedRec, true, 'admission_form').catch(() => {});
      if (savedRec.amountPaid > 0 || savedRec.admFee > 0) {
        handleGenerateAndArchive(savedRec, true, 'receipt').catch(() => {});
      }
    }
  };

  const handleEnrollPending = (rec: AdmissionRecord) => {
    if (!canManage) return;
    showConfirm(`Enroll ${rec.studentName} (${rec.className || 'Unassigned'}) into Students Database? Permanent Admission No & Class Roll No will be assigned automatically.`, async () => {
      await handleSaveAdmission({
        ...rec,
        previousAdmissionNo: rec.admissionNo,
        admissionNo: rec.admissionNo.startsWith('ENQ-') ? 'AUTO' : rec.admissionNo,
        autoAssignAdmNo: rec.admissionNo.startsWith('ENQ-'),
        autoAssignRollNo: !rec.rollNo,
        admissionPrefix: template.branding.admissionPrefix,
        admissionPadding: template.branding.admissionPadding,
        status: 'Admitted',
        studentStatus: 'Active',
        admissionDate: rec.admissionDate || new Date().toISOString().slice(0, 10),
      });
    });
  };

  const handleDeleteRecord = (rec: AdmissionRecord) => {
    if (!canManage) return;
    showConfirm(`Permanently remove ${rec.studentName} (${rec.admissionNo})? This cannot be undone.`, async () => {
      const activeId = instId || 'default';
      const res = await deleteStudentInDb(activeId, rec.supabaseStudentId, rec.admissionNo);
      if (!res.success) {
        showAlert(res.error || 'Failed to delete student from Supabase.', 'Delete Failed');
        return;
      }
      const nextPipeline = loadPipelineRecords(activeId).filter((p) => p.id !== rec.id && p.admissionNo !== rec.admissionNo);
      savePipelineRecords(activeId, nextPipeline);
      setFormOpen(false);
      setSlipRecord(null);
      showToast(`Removed ${rec.studentName}.`, 'warning');
      await loadAll(true);
    });
  };

  const handlePromoteSingle = (rec: AdmissionRecord) => {
    if (!canManage || !rec.supabaseStudentId) return;
    const nextCls = getNextClassName(rec.className);
    if (!nextCls) {
      showAlert(`${rec.studentName} is already in the highest class (${rec.className}).`, 'Promotion Notice');
      return;
    }
    showConfirm(`Promote ${rec.studentName} from ${rec.className} to ${nextCls}?`, async () => {
      const res = await updateStudentClassInDb(instId, rec.supabaseStudentId!, nextCls, rec.admissionNo);
      if (!res.success) {
        showAlert(res.error || 'Failed to promote student.', 'Database Error');
        return;
      }
      setSlipRecord(null);
      showToast(`${rec.studentName} promoted to ${nextCls}.`, 'success');
      await loadAll(true);
    });
  };

  const handleDemoteSingle = (rec: AdmissionRecord) => {
    if (!canManage || !rec.supabaseStudentId) return;
    const prevCls = getPrevClassName(rec.className);
    if (!prevCls) {
      showAlert(`${rec.studentName} is already in the entry class (${rec.className}).`, 'Class Notice');
      return;
    }
    showConfirm(`Demote ${rec.studentName} from ${rec.className} to ${prevCls}?`, async () => {
      const res = await updateStudentClassInDb(instId, rec.supabaseStudentId!, prevCls, rec.admissionNo);
      if (!res.success) {
        showAlert(res.error || 'Failed to demote student.', 'Database Error');
        return;
      }
      setSlipRecord(null);
      showToast(`${rec.studentName} moved to ${prevCls}.`, 'info');
      await loadAll(true);
    });
  };

  const handleBulkPromote = async (fromClass: string, toClass: string) => {
    if (!canManage || !instId) return;
    const res = await bulkPromoteClassInDb(instId, fromClass, toClass);
    if (!res.success) {
      showAlert(res.error || 'Bulk promotion failed.', 'Database Error');
      return;
    }
    setBulkOpen(false);
    showToast(`Promoted ${res.count || 0} active students from ${fromClass} to ${toClass}.`, 'success');
    await loadAll(true);
  };

  const handleToggleActiveStatus = async (rec: AdmissionRecord) => {
    if (!canManage || !rec.supabaseStudentId) return;
    const nextStatus = rec.studentStatus === 'Inactive' ? 'Active' : 'Inactive';
    const res = await toggleStudentStatusInDb(instId, rec.supabaseStudentId, nextStatus);
    if (!res.success) {
      showAlert(res.error || 'Status update failed.', 'Error');
      return;
    }
    showToast(`${rec.studentName} marked ${nextStatus}.`, 'success');
    await loadAll(true);
  };

  const handleSaveTemplate = async (nextTpl: AdmissionFormTemplate) => {
    setTemplate(nextTpl);
    const res = await saveAdmissionTemplateRemote(instId || 'default', nextTpl);
    if (res.success) {
      showToast('Institute admission template saved to Supabase.', 'success');
    } else {
      showToast(res.error || 'Saved locally (run SQL migration for cloud template sync).', 'warning');
    }
  };

  const handleSaveCapacities = async (nextCap: ClassCapacityMap) => {
    const nextTpl = { ...template, classCapacities: nextCap };
    setTemplate(nextTpl);
    saveClassCapacities(instId || 'default', nextCap);
    const res = await saveAdmissionTemplateRemote(instId || 'default', nextTpl);
    if (res.success) showToast('Class seat capacities saved.', 'success');
    else showToast('Capacities updated locally.', 'info');
  };

  const handleExportRosterPdf = () => {
    const label = classFilter === 'all' ? 'All Classes' : classFilter;
    const doc = generateRosterPdf(filteredRecords, instInfo, label);
    doc.save(`${instCode}_Admission_Roster_${label.replace(/\s+/g, '_')}.pdf`);
    showToast('Roster PDF exported.', 'success');
  };

  const handleExportBulkFormsPdf = () => {
    if (filteredRecords.length === 0) {
      showToast('No records to export.', 'warning');
      return;
    }
    const batch = filteredRecords.slice(0, 150);
    const { doc, durationMs } = generateBulkAdmissionFormsPdf(batch, template, instInfo);
    doc.save(`${instCode}_Admission_Forms_${batch.length}.pdf`);
    showToast(`Generated ${batch.length} admission forms in ${durationMs}ms.`, 'success');
  };

  const statusBadgeClass = (st: AdmissionStatus) => {
    if (st === 'Admitted') return 'bg-success';
    if (st === 'Verified') return 'bg-info';
    if (st === 'Applied') return 'bg-purple';
    if (st === 'Enquiry') return 'bg-warning';
    return 'bg-danger';
  };

  return (
    <div id="view-admission" className="page-view active" style={{ display: 'block' }}>
      {/* Optional Setup Banner if new Supabase tables aren't migrated yet */}
      {!loading && !tablesReady && (
        <div
          style={{
            marginBottom: '20px',
            padding: '12px 18px',
            borderRadius: '14px',
            background: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.35)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)' }}>
            Supabase `students` is live. Run `etk-backend/database/admission_module_migration.sql` in Supabase SQL Editor to enable cloud `admissions` &amp; custom `institute_form_templates` sync.
          </div>
          <span className="badge bg-warning">Migration Pending</span>
        </div>
      )}

      {/* Top KPI Strip */}
      <div className="grid-kpis">
        <div className="kpi-card b-brand">
          <h4>Enrolled Students</h4>
          <h2>{kpis.enrolled}</h2>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>Synced with Students DB</p>
        </div>
        <div className="kpi-card b-success">
          <h4>Session Admissions</h4>
          <h2>{kpis.sessionCount}</h2>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>Session {kpis.currentSess}</p>
        </div>
        <div className="kpi-card b-accent">
          <h4>Pending Pipeline</h4>
          <h2>{kpis.pending}</h2>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>Enquiries &amp; Applications</p>
        </div>
        <div className="kpi-card b-info">
          <h4>Admission Fee Collected</h4>
          <h2>₹{kpis.totalCollected.toLocaleString('en-IN')}</h2>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
            Balance Due: ₹{kpis.totalBalance.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Modern Quick Actions Command Bar */}
      <div className="panel" style={{ marginBottom: '20px', padding: '18px 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, letterSpacing: '-0.3px', color: 'var(--text)' }}>
              Admission Command Center
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 600 }}>
              Auto-syncs finalized forms to <span style={{ color: 'var(--brand)' }}>Documents / Admission Forms</span> on Drive with atomic monotonic numbering.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <OpticalButton type="button" variant="outline" onClick={handleExportBulkFormsPdf} style={{ padding: '8px 14px', fontSize: '12px' }}>
              Bulk Forms PDF
            </OpticalButton>
            <OpticalButton type="button" variant="outline" onClick={handleExportRosterPdf} style={{ padding: '8px 14px', fontSize: '12px' }}>
              Roster PDF
            </OpticalButton>
            <OpticalButton
              type="button"
              variant="outline"
              onClick={() => {
                exportAdmissionsToCsv(filteredRecords, instCode);
                showToast('CSV exported.', 'success');
              }}
              style={{ padding: '8px 14px', fontSize: '12px' }}
            >
              Export CSV
            </OpticalButton>
            <OpticalButton type="button" variant="secondary" onClick={() => loadAll(true)} disabled={syncing} style={{ padding: '8px 14px', fontSize: '12px' }}>
              {syncing ? <IOSSpinner size={14} color="currentColor" /> : null}
              {syncing ? 'Syncing...' : 'Refresh'}
            </OpticalButton>
          </div>
        </div>

        {canManage && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))',
              gap: '12px',
            }}
          >
            <OpticalButton
              type="button"
              variant="primary"
              onClick={() => {
                setEditingRecord(null);
                setFormOpen(true);
              }}
              style={{
                minHeight: '56px',
                justifyContent: 'flex-start',
                padding: '12px 16px',
                borderRadius: '14px',
                fontSize: '13.5px',
                fontWeight: 800,
                gap: '12px',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" x2="19" y1="8" y2="14" />
                <line x1="22" x2="16" y1="11" y2="11" />
              </svg>
              <span>New Admission</span>
            </OpticalButton>

            <OpticalButton
              type="button"
              variant="warning"
              onClick={() => setEnquiryOpen(true)}
              style={{
                minHeight: '56px',
                justifyContent: 'flex-start',
                padding: '12px 16px',
                borderRadius: '14px',
                fontSize: '13.5px',
                fontWeight: 800,
                gap: '12px',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>Quick Enquiry</span>
            </OpticalButton>

            <OpticalButton
              type="button"
              variant="outline"
              onClick={() => setTemplateOpen(true)}
              style={{
                minHeight: '56px',
                justifyContent: 'flex-start',
                padding: '12px 16px',
                borderRadius: '14px',
                fontSize: '13.5px',
                fontWeight: 800,
                gap: '12px',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
              <span>Customize Form</span>
            </OpticalButton>

            <OpticalButton
              type="button"
              variant="purple"
              onClick={() => setBulkOpen(true)}
              style={{
                minHeight: '56px',
                justifyContent: 'flex-start',
                padding: '12px 16px',
                borderRadius: '14px',
                fontSize: '13.5px',
                fontWeight: 800,
                gap: '12px',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                <path d="m18 15-6-6-6 6" />
              </svg>
              <span>Bulk Promote</span>
            </OpticalButton>

            <OpticalButton
              type="button"
              variant="secondary"
              onClick={handlePrintBlankForm}
              style={{
                minHeight: '56px',
                justifyContent: 'flex-start',
                padding: '12px 16px',
                borderRadius: '14px',
                fontSize: '13.5px',
                fontWeight: 800,
                gap: '12px',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect width="12" height="8" x="6" y="14" />
              </svg>
              <span>Blank Paper Form</span>
            </OpticalButton>
          </div>
        )}
      </div>

      {/* Main Directory & Pipeline Panel */}
      <div className="panel">
        {/* Apple Segmented Sub-Tabs */}
        <div className="etk-segmented-nav-wrap" style={{ marginTop: 0 }}>
          <div className="etk-segmented-nav">
            <button
              type="button"
              className={`etk-segmented-pill ${subTab === 'pipeline' ? 'active' : ''}`}
              onClick={() => setSubTab('pipeline')}
            >
              Applications &amp; Pipeline ({records.length})
            </button>
            <button
              type="button"
              className={`etk-segmented-pill ${subTab === 'roster' ? 'active' : ''}`}
              onClick={() => setSubTab('roster')}
            >
              Master Student Roster ({kpis.enrolled})
            </button>
            <button
              type="button"
              className={`etk-segmented-pill ${subTab === 'seats' ? 'active' : ''}`}
              onClick={() => setSubTab('seats')}
            >
              Class Seat Matrix
            </button>
            <button
              type="button"
              className={`etk-segmented-pill ${subTab === 'fees' ? 'active' : ''}`}
              onClick={() => setSubTab('fees')}
            >
              Fee &amp; Docs Tracker
            </button>
          </div>
        </div>

        {/* Seat Matrix Sub-View */}
        {subTab === 'seats' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                Live active student counts from Supabase compared against configured class seat limits.
              </span>
              {canManage && (
                <OpticalButton type="button" variant="outline" onClick={() => setCapacityOpen(true)}>
                  Configure Seat Capacities
                </OpticalButton>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '16px' }}>
              {seatMatrix.map((item) => {
                const barColor = item.pct >= 90 ? 'var(--danger)' : item.pct >= 70 ? 'var(--accent)' : 'var(--success)';
                return (
                  <div
                    key={item.cls}
                    style={{
                      background: 'rgba(255,255,255,0.025)',
                      border: '1px solid var(--border)',
                      borderRadius: '16px',
                      padding: '18px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <b style={{ fontSize: '15px', color: 'var(--text)' }}>{item.cls}</b>
                      <span className="badge bg-info">{item.pct}% Full</span>
                    </div>
                    <div style={{ width: '100%', height: '7px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden', margin: '12px 0' }}>
                      <div style={{ width: `${item.pct}%`, height: '100%', background: barColor, borderRadius: '999px', transition: 'width 0.3s ease' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 700 }}>
                      <span>Enrolled: <b style={{ color: 'var(--text)' }}>{item.enrolled}/{item.capacity}</b></span>
                      <span>Open: <b style={{ color: 'var(--success)' }}>{item.available}</b></span>
                    </div>
                    {item.pending > 0 && (
                      <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--accent)', fontWeight: 700 }}>
                        +{item.pending} in pipeline
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '20px',
                flexWrap: 'wrap',
                alignItems: 'center',
                background: 'rgba(0,0,0,0.2)',
                padding: '15px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
              }}
            >
              <div className="search-wrapper" style={{ maxWidth: '300px', marginBottom: 0 }}>
                <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search Adm No, Name, Father, Phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <select className="filter-select" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
                <option value="all">All Classes</option>
                {ADMISSION_CLASSES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {subTab !== 'roster' && (
                <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">All Stages</option>
                  <option value="Enquiry">Enquiry</option>
                  <option value="Applied">Applied</option>
                  <option value="Verified">Verified</option>
                  <option value="Admitted">Admitted</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              )}

              <select className="filter-select" value={sessionFilter} onChange={(e) => setSessionFilter(e.target.value)}>
                <option value="all">All Sessions</option>
                {sessions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                Showing <b style={{ color: 'var(--text)' }}>{visibleRecords.length}</b> of{' '}
                <b style={{ color: 'var(--text)' }}>{filteredRecords.length}</b> records
              </span>
            </div>

            <div className="tk-table-wrapper">
              <table className="tk-sleek-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Adm / App No</th>
                    <th>Student &amp; Parent</th>
                    <th>Class &amp; Session</th>
                    <th>Contact &amp; Village</th>
                    <th>{subTab === 'fees' ? 'Fee Breakdown' : 'Fee & Docs'}</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        <div className="spinner-sm" style={{ margin: '0 auto 10px auto' }} />
                        Loading admission records...
                      </td>
                    </tr>
                  ) : filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '50px 20px' }}>
                        <div style={{ color: 'var(--text)', fontSize: '14px', fontWeight: 700 }}>
                          No admission records match your filters.
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
                          Click &quot;New Admission&quot; or &quot;Quick Enquiry&quot; to register a student.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    visibleRecords.map((rec) => {
                      const { net, paid, balance } = computeFeeTotals(rec);
                      return (
                        <tr key={rec.id}>
                          <td data-label="Adm / App No">
                            <span
                              className="flat-pill"
                              style={{
                                background: 'rgba(255,255,255,0.05)',
                                color: 'var(--brand)',
                                border: '1px solid var(--border)',
                                fontFamily: 'monospace',
                                fontWeight: 800,
                              }}
                            >
                              {highlightMatch(rec.admissionNo, search)}
                            </span>
                          </td>

                          <td data-label="Student & Parent">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div
                                style={{
                                  width: '34px',
                                  height: '34px',
                                  borderRadius: '50%',
                                  background: 'rgba(38,195,234,0.14)',
                                  border: '1px solid rgba(38,195,234,0.35)',
                                  color: 'var(--brand)',
                                  fontWeight: 800,
                                  fontSize: '12px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  overflow: 'hidden',
                                  flexShrink: 0,
                                }}
                              >
                                {rec.photoUrl ? (
                                  <img src={rec.photoUrl} alt={rec.studentName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  (rec.studentName || 'S').charAt(0).toUpperCase()
                                )}
                              </div>
                              <div>
                                <b style={{ color: 'var(--text)', fontSize: '13px' }}>
                                  {highlightMatch(rec.studentName, search)}
                                </b>
                                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  F: {highlightMatch(rec.fatherName, search)}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td data-label="Class & Session">
                            <div>
                              <b style={{ color: 'var(--text)', fontSize: '12.5px' }}>
                                {rec.className || '-'} {rec.section ? `(${rec.section})` : ''}
                              </b>
                              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                Roll: {rec.rollNo ?? '-'} • {rec.academicSession}
                              </div>
                            </div>
                          </td>

                          <td data-label="Contact & Village">
                            <div>
                              <span style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 600 }}>
                                {highlightMatch(rec.contactNo, search)}
                              </span>
                              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {highlightMatch(rec.village, search)}
                              </div>
                            </div>
                          </td>

                          <td data-label="Fee & Docs">
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 800, color: balance > 0 ? 'var(--accent)' : 'var(--success)' }}>
                                Paid ₹{paid.toLocaleString('en-IN')} / ₹{net.toLocaleString('en-IN')}
                              </div>
                              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {rec.documents.length}/{ADMISSION_DOCUMENTS.length} Docs
                                {balance > 0 ? ` • Due ₹${balance.toLocaleString('en-IN')}` : ''}
                              </div>
                            </div>
                          </td>

                          <td data-label="Status">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                              <span className={`badge ${statusBadgeClass(rec.status)}`}>{rec.status}</span>
                              {rec.formPdfUrl && (
                                <a href={rec.formPdfUrl} target="_blank" rel="noreferrer" className="badge bg-info" style={{ textDecoration: 'none' }}>
                                  Drive Form ↗
                                </a>
                              )}
                              {rec.receiptPdfUrl && (
                                <a href={rec.receiptPdfUrl} target="_blank" rel="noreferrer" className="badge bg-purple" style={{ textDecoration: 'none' }}>
                                  Drive Receipt ↗
                                </a>
                              )}
                              {rec.status === 'Admitted' && rec.studentStatus === 'Inactive' && (
                                <span className="badge bg-danger">Inactive</span>
                              )}
                            </div>
                          </td>

                          <td data-label="Actions" style={{ textAlign: 'right' }}>
                            <div className="mobile-action-row" style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                              <OpticalButton
                                type="button"
                                variant="success"
                                onClick={() => handleQuickRowFormPdf(rec)}
                                style={{ padding: '6px 10px', fontSize: '11px' }}
                              >
                                Form PDF
                              </OpticalButton>

                              <OpticalButton
                                type="button"
                                variant="purple"
                                onClick={() => handleQuickRowReceiptPdf(rec)}
                                style={{ padding: '6px 10px', fontSize: '11px' }}
                              >
                                Receipt
                              </OpticalButton>

                              <OpticalButton
                                type="button"
                                variant="outline"
                                onClick={() => setSlipRecord(rec)}
                                style={{ padding: '6px 10px', fontSize: '11px' }}
                              >
                                View
                              </OpticalButton>

                              {canManage && rec.status !== 'Admitted' && rec.status !== 'Cancelled' && (
                                <OpticalButton
                                  type="button"
                                  variant="success"
                                  onClick={() => handleEnrollPending(rec)}
                                  style={{ padding: '6px 12px', fontSize: '11px' }}
                                >
                                  Enroll
                                </OpticalButton>
                              )}

                              {canManage && (
                                <OpticalButton
                                  type="button"
                                  variant="secondary"
                                  onClick={() => {
                                    setEditingRecord(rec);
                                    setFormOpen(true);
                                  }}
                                  style={{ padding: '6px 12px', fontSize: '11px' }}
                                >
                                  Edit
                                </OpticalButton>
                              )}

                              {canManage && rec.supabaseStudentId && subTab === 'roster' && (
                                <OpticalButton
                                  type="button"
                                  variant={rec.studentStatus === 'Inactive' ? 'success' : 'danger'}
                                  onClick={() => handleToggleActiveStatus(rec)}
                                  style={{ padding: '6px 12px', fontSize: '11px' }}
                                >
                                  {rec.studentStatus === 'Inactive' ? 'Activate' : 'Deactivate'}
                                </OpticalButton>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="tk-table-capacity-bar" style={{ marginTop: '20px' }}>
              <div className="tk-capacity-badge">
                Showing <b style={{ color: 'var(--text)' }}>{visibleRecords.length}</b> of{' '}
                <b style={{ color: 'var(--text)' }}>{filteredRecords.length}</b> records
              </div>
              {hasMore && (
                <button
                  type="button"
                  className="tk-load-more-btn liquid-glass"
                  onClick={() => setDisplayLimit((prev) => prev + 30)}
                  style={{
                    padding: '10px 24px',
                    fontSize: '12px',
                    fontWeight: 800,
                    color: 'var(--brand)',
                    borderColor: 'var(--brand)',
                    cursor: 'pointer',
                  }}
                >
                  Load More... (+30)
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <AdmissionFormModal
        open={formOpen}
        initialRecord={editingRecord}
        template={template}
        instituteInfo={instInfo}
        counters={counters}
        instId={instId}
        instCode={instCode}
        existingRecords={records}
        onClose={() => {
          setFormOpen(false);
          setEditingRecord(null);
        }}
        onSave={handleSaveAdmission}
        onDelete={handleDeleteRecord}
      />

      <QuickEnquiryModal
        open={enquiryOpen}
        onClose={() => setEnquiryOpen(false)}
        onSave={async (rec) => {
          await handleSaveAdmission(rec);
          setEnquiryOpen(false);
        }}
      />

      <AdmissionSlipModal
        record={slipRecord}
        template={template}
        instituteInfo={instInfo}
        canManage={canManage}
        onClose={() => setSlipRecord(null)}
        onEdit={(rec) => {
          setSlipRecord(null);
          setEditingRecord(rec);
          setFormOpen(true);
        }}
        onPromote={handlePromoteSingle}
        onDemote={handleDemoteSingle}
        onGenerateAndArchive={handleGenerateAndArchive}
      />

      <AdmissionTemplateModal
        open={templateOpen}
        template={template}
        instituteInfo={instInfo}
        onClose={() => setTemplateOpen(false)}
        onSave={handleSaveTemplate}
      />

      <BulkPromoteModal open={bulkOpen} onClose={() => setBulkOpen(false)} onPromoteClass={handleBulkPromote} />

      <ClassCapacityModal
        open={capacityOpen}
        capacities={capacities}
        onClose={() => setCapacityOpen(false)}
        onSave={handleSaveCapacities}
      />
    </div>
  );
}

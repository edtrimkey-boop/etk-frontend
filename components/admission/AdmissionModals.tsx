'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { OpticalButton } from '@/components/ui/OpticalGlass';
import IOSSpinner from '@/components/ui/IOSSpinner';
import {
  ADMISSION_CLASSES,
  ADMISSION_DOCUMENTS,
  AdmissionFormTemplate,
  AdmissionRecord,
  AdmissionStatus,
  ClassCapacityMap,
  InstituteCounters,
  computeFeeTotals,
  computeLiveAdmissionPreviewNo,
  computeLiveRollPreview,
  generateAdmissionPaymentReceiptPdf,
  generateDynamicAdmissionFormPdf,
  getCurrentAcademicSession,
  getNextClassName,
  getPrevClassName,
  getTodayIsoDate,
  preloadImageAsDataUrl,
  uploadStudentPhotoToStorage,
} from '@/lib/admissions';
import { AdmissionFormLivePreview } from '@/components/admission/AdmissionFormLivePreview';

function CloseIconBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="close-minimal" onClick={onClick} aria-label="Close" title="Close">
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  );
}

// ============================================================================
// 1. NEW / EDIT ADMISSION FORM MODAL (Split-Screen + Live Monotonic Preview)
// ============================================================================
interface AdmissionFormModalProps {
  open: boolean;
  initialRecord: AdmissionRecord | null;
  template: AdmissionFormTemplate;
  instituteInfo: { name: string; code: string; address?: string; email?: string; logoUrl?: string };
  counters: InstituteCounters;
  instId: string;
  instCode: string;
  existingRecords: AdmissionRecord[];
  onClose: () => void;
  onSave: (record: AdmissionRecord) => Promise<void>;
  onDelete?: (record: AdmissionRecord) => void;
}

export function AdmissionFormModal({
  open,
  initialRecord,
  template,
  instituteInfo,
  counters,
  instId,
  instCode,
  existingRecords,
  onClose,
  onSave,
  onDelete,
}: AdmissionFormModalProps) {
  const [form, setForm] = useState<AdmissionRecord>(() => createBlankRecord());
  const [autoAdmNo, setAutoAdmNo] = useState<boolean>(true);
  const [autoRollNo, setAutoRollNo] = useState<boolean>(true);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [mobilePane, setMobilePane] = useState<'form' | 'preview'>('form');
  const [isMobile, setIsMobile] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 960px)');
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (!open) return;
    setPhotoFile(null);
    setMobilePane('form');
    if (initialRecord) {
      const alreadyEnrolled =
        Boolean(initialRecord.supabaseStudentId) ||
        (initialRecord.status === 'Admitted' &&
          Boolean(initialRecord.admissionNo) &&
          !initialRecord.admissionNo.startsWith('ENQ-'));
      setForm({
        ...initialRecord,
        previousAdmissionNo: initialRecord.admissionNo,
        customFields: { ...(initialRecord.customFields || {}) },
      });
      setAutoAdmNo(!alreadyEnrolled);
      setAutoRollNo(!alreadyEnrolled || !initialRecord.rollNo);
      setPhotoPreview(initialRecord.photoUrl || '');
    } else {
      setForm(createBlankRecord());
      setAutoAdmNo(true);
      setAutoRollNo(true);
      setPhotoPreview('');
    }
  }, [open, initialRecord]);

  const isExistingAdmitted = Boolean(
    initialRecord &&
      (initialRecord.supabaseStudentId ||
        (initialRecord.status === 'Admitted' &&
          initialRecord.admissionNo &&
          !initialRecord.admissionNo.startsWith('ENQ-')))
  );

  const liveAdmNoPreview = useMemo(() => {
    if (!autoAdmNo && form.admissionNo && form.admissionNo !== 'AUTO') {
      return form.admissionNo.trim().toUpperCase();
    }
    return computeLiveAdmissionPreviewNo(
      form.status,
      form.admissionNo,
      counters,
      template,
      existingRecords,
      instCode,
      isExistingAdmitted
    );
  }, [autoAdmNo, form.admissionNo, form.status, counters, template, existingRecords, instCode, isExistingAdmitted]);

  const sameClassAsOriginal = Boolean(
    isExistingAdmitted && initialRecord?.className && initialRecord.className === form.className
  );

  const liveRollPreview = useMemo(() => {
    if (form.status !== 'Admitted') return null;
    if (!autoRollNo && form.rollNo) return form.rollNo;
    return computeLiveRollPreview(
      form.status,
      form.className,
      form.rollNo,
      counters,
      existingRecords,
      sameClassAsOriginal
    );
  }, [form.status, form.className, form.rollNo, autoRollNo, counters, existingRecords, sameClassAsOriginal]);

  const livePreviewRecord: AdmissionRecord = useMemo(
    () => ({
      ...form,
      admissionNo: liveAdmNoPreview,
      rollNo: liveRollPreview,
      photoUrl: photoPreview || form.photoUrl,
    }),
    [form, liveAdmNoPreview, liveRollPreview, photoPreview]
  );

  const duplicateCandidate = useMemo(() => {
    const cleanPhone = String(form.contactNo || '').replace(/\D/g, '').slice(-10);
    const cleanName = String(form.studentName || '').trim().toLowerCase();
    if (!cleanPhone && cleanName.length < 3) return null;
    return (
      existingRecords.find((r) => {
        if (initialRecord && (r.id === initialRecord.id || r.admissionNo === initialRecord.admissionNo)) return false;
        const rPhone = String(r.contactNo || '').replace(/\D/g, '').slice(-10);
        const rName = String(r.studentName || '').trim().toLowerCase();
        if (cleanPhone.length === 10 && rPhone === cleanPhone && (!cleanName || rName === cleanName)) return true;
        return false;
      }) || null
    );
  }, [form.contactNo, form.studentName, existingRecords, initialRecord]);

  if (!open) return null;

  const { gross, net, paid, balance } = computeFeeTotals(form);
  const customFieldConfigs = (template.fieldsConfig || []).filter((f) => f.isCustom && f.visible);

  const getFieldLabel = (key: string, fallback: string) => {
    const found = template.fieldsConfig?.find((f) => f.key === key);
    return found?.label || fallback;
  };

  const isFieldVisible = (key: string) => {
    const found = template.fieldsConfig?.find((f) => f.key === key);
    return found ? found.visible : true;
  };

  const handleClassChange = (cls: string) => {
    setForm((prev) => ({ ...prev, className: cls }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') setPhotoPreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const toggleDoc = (docName: string) => {
    setForm((prev) => ({
      ...prev,
      documents: prev.documents.includes(docName)
        ? prev.documents.filter((d) => d !== docName)
        : [...prev.documents, docName],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const targetAdmNo = autoAdmNo ? liveAdmNoPreview : form.admissionNo.trim().toUpperCase();
      let finalPhotoUrl = form.photoUrl;
      if (photoFile && instId) {
        const up = await uploadStudentPhotoToStorage(instId, targetAdmNo, photoFile);
        if (up.success && up.url) {
          finalPhotoUrl = up.url;
          preloadImageAsDataUrl(up.url).catch(() => {});
        }
      }
      await onSave({
        ...form,
        admissionNo: autoAdmNo ? 'AUTO' : targetAdmNo,
        rollNo: form.status === 'Admitted' ? (autoRollNo ? null : form.rollNo) : null,
        autoAssignAdmNo: autoAdmNo,
        autoAssignRollNo: form.status === 'Admitted' ? autoRollNo : false,
        previousAdmissionNo: initialRecord?.admissionNo || form.previousAdmissionNo,
        admissionPrefix: template.branding.admissionPrefix,
        admissionPadding: template.branding.admissionPadding,
        photoUrl: finalPhotoUrl,
        guardianName: form.guardianName || form.fatherName,
        guardianMobile: form.guardianMobile || form.contactNo,
        updatedAt: new Date().toISOString(),
      });
    } finally {
      setSaving(false);
    }
  };

  const sectionCardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.025)',
    border: '1px solid var(--border)',
    borderRadius: '14px',
    padding: '14px',
    marginBottom: '14px',
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.9px',
    color: 'var(--brand)',
    marginBottom: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  return (
    <div className="glass-overlay active" onClick={onClose} style={{ zIndex: 99999 }}>
      <div
        className="glass-box"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '1260px', width: '96%', position: 'relative' }}
      >
        <div className="premium-sticky-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
          <h2 style={{ color: 'var(--brand)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
            {initialRecord ? 'Edit Admission Record' : 'New Student Admission'}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isMobile && (
              <div className="etk-segmented-nav" style={{ margin: 0 }}>
                <button
                  type="button"
                  className={`etk-segmented-pill ${mobilePane === 'form' ? 'active' : ''}`}
                  onClick={() => setMobilePane('form')}
                  style={{ padding: '5px 12px', fontSize: '11px' }}
                >
                  Entry Form
                </button>
                <button
                  type="button"
                  className={`etk-segmented-pill ${mobilePane === 'preview' ? 'active' : ''}`}
                  onClick={() => setMobilePane('preview')}
                  style={{ padding: '5px 12px', fontSize: '11px' }}
                >
                  Live Preview
                </button>
              </div>
            )}
            <CloseIconBtn onClick={onClose} />
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div
            className="modal-scroll-body"
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 480px',
              gap: '18px',
              alignItems: 'start',
            }}
          >
            {/* LEFT PANE: FORM INPUTS */}
            <div style={{ display: isMobile && mobilePane === 'preview' ? 'none' : 'block' }}>
              {duplicateCandidate && (
                <div
                  style={{
                    marginBottom: '12px',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid rgba(245, 158, 11, 0.45)',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--accent)',
                  }}
                >
                  Duplicate Check: <b>{duplicateCandidate.studentName}</b> ({duplicateCandidate.admissionNo} • {duplicateCandidate.status}) already uses mobile {duplicateCandidate.contactNo}.
                </div>
              )}
              {/* 1. Academic & Enrollment */}
              <div style={sectionCardStyle}>
                <div style={sectionTitleStyle}>Academic &amp; Enrollment Details</div>
                <div className="grid-2" style={{ marginBottom: '12px' }}>
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label className="label-text" style={{ marginBottom: 0 }}>
                        {form.status === 'Admitted' ? 'Admission No' : 'Temporary App Ref'}
                      </label>
                      {!isExistingAdmitted && form.status === 'Admitted' && (
                        <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--brand)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={autoAdmNo}
                            onChange={(e) => setAutoAdmNo(e.target.checked)}
                          />
                          Auto-Increment
                        </label>
                      )}
                    </div>
                    {autoAdmNo || form.status !== 'Admitted' ? (
                      <div
                        style={{
                          padding: '10px 12px',
                          borderRadius: '10px',
                          background: 'rgba(38,195,234,0.08)',
                          border: '1px solid rgba(38,195,234,0.28)',
                          fontSize: '12.5px',
                          fontWeight: 800,
                          color: 'var(--brand)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span style={{ fontFamily: 'monospace' }}>{liveAdmNoPreview}</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {form.status === 'Admitted' ? 'Monotonic on Save' : 'Perm. No on Admitted'}
                        </span>
                      </div>
                    ) : (
                      <input
                        type="text"
                        required
                        value={form.admissionNo}
                        onChange={(e) => setForm({ ...form, admissionNo: e.target.value.toUpperCase() })}
                        placeholder="e.g. KPS-00175"
                      />
                    )}
                  </div>
                  <div className="form-group">
                    <label className="label-text">
                      Admission Stage <span className="req">*</span>
                    </label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value as AdmissionStatus })}
                    >
                      <option value="Admitted">Admitted (Assigns Adm No &amp; Class Roll No)</option>
                      <option value="Verified">Verified (Ready for Enrollment)</option>
                      <option value="Applied">Applied (Form Submitted)</option>
                      <option value="Enquiry">Enquiry (Lead)</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="grid-2" style={{ marginBottom: '12px' }}>
                  <div className="form-group">
                    <label className="label-text">
                      {getFieldLabel('className', 'Class')} <span className="req">*</span>
                    </label>
                    <select required value={form.className} onChange={(e) => handleClassChange(e.target.value)}>
                      <option value="" disabled>
                        Select Class...
                      </option>
                      {ADMISSION_CLASSES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="label-text">Academic Session <span className="req">*</span></label>
                    <input
                      type="text"
                      required
                      value={form.academicSession}
                      onChange={(e) => setForm({ ...form, academicSession: e.target.value })}
                      placeholder="2026-2027"
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label className="label-text" style={{ marginBottom: 0 }}>Section &amp; Roll Number</label>
                      {form.status === 'Admitted' && (
                        <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--brand)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={autoRollNo}
                            onChange={(e) => setAutoRollNo(e.target.checked)}
                          />
                          Auto Roll
                        </label>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <select value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} style={{ marginBottom: 0 }}>
                        <option value="A">Section A</option>
                        <option value="B">Section B</option>
                        <option value="C">Section C</option>
                        <option value="D">Section D</option>
                      </select>
                      {form.status !== 'Admitted' ? (
                        <div
                          style={{
                            padding: '9px 10px',
                            borderRadius: '10px',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid var(--border)',
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                            fontWeight: 700,
                          }}
                        >
                          On Admitted
                        </div>
                      ) : autoRollNo ? (
                        <div
                          style={{
                            padding: '9px 10px',
                            borderRadius: '10px',
                            background: 'rgba(46,204,113,0.08)',
                            border: '1px solid rgba(46,204,113,0.3)',
                            fontSize: '12px',
                            color: 'var(--success)',
                            fontWeight: 800,
                          }}
                        >
                          {liveRollPreview ? `Auto: #${liveRollPreview}` : 'Select Class'}
                        </div>
                      ) : (
                        <input
                          type="number"
                          min={1}
                          placeholder="Roll No"
                          value={form.rollNo ?? ''}
                          onChange={(e) => setForm({ ...form, rollNo: e.target.value ? Number(e.target.value) : null })}
                          style={{ marginBottom: 0 }}
                        />
                      )}
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="label-text">Admission Date <span className="req">*</span></label>
                    <input
                      type="date"
                      required
                      value={form.admissionDate}
                      onChange={(e) => setForm({ ...form, admissionDate: e.target.value })}
                      style={{ marginBottom: 0 }}
                    />
                  </div>
                </div>
              </div>

            {/* 2. Student Profile */}
            <div style={sectionCardStyle}>
              <div style={sectionTitleStyle}>Student Personal Profile</div>
              <div className="grid-2" style={{ marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="label-text">
                    {getFieldLabel('studentName', 'Student Full Name')} <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.studentName}
                    onChange={(e) => setForm({ ...form, studentName: e.target.value })}
                    placeholder="Full Name"
                  />
                </div>
                {isFieldVisible('dob') && (
                  <div className="form-group">
                    <label className="label-text">{getFieldLabel('dob', 'Date of Birth')}</label>
                    <input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
                {isFieldVisible('gender') && (
                  <div className="form-group">
                    <label className="label-text">{getFieldLabel('gender', 'Gender')}</label>
                    <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as any })}>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                )}
                {isFieldVisible('category') && (
                  <div className="form-group">
                    <label className="label-text">{getFieldLabel('category', 'Category')}</label>
                    <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                      <option value="General">General</option>
                      <option value="OBC">OBC</option>
                      <option value="SC">SC</option>
                      <option value="ST">ST</option>
                      <option value="EWS">EWS</option>
                    </select>
                  </div>
                )}
                {isFieldVisible('bloodGroup') && (
                  <div className="form-group">
                    <label className="label-text">{getFieldLabel('bloodGroup', 'Blood Group')}</label>
                    <select value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}>
                      <option value="">Unknown</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="grid-2">
                {isFieldVisible('aadhaar') && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="label-text">{getFieldLabel('aadhaar', 'Aadhaar / APAAR ID')}</label>
                    <input
                      type="text"
                      value={form.aadhaar}
                      onChange={(e) => setForm({ ...form, aadhaar: e.target.value })}
                      placeholder="12-digit Aadhaar or APAAR"
                      style={{ marginBottom: 0 }}
                    />
                  </div>
                )}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="label-text">Passport Photo (Optional)</label>
                  <label
                    className="upload-box"
                    style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: 0 }}
                  >
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Student"
                        style={{ width: '34px', height: '34px', borderRadius: '8px', objectFit: 'cover' }}
                      />
                    ) : null}
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {photoFile ? photoFile.name : photoPreview ? 'Change Student Photo' : 'Click to upload photo (JPG/PNG)'}
                    </span>
                    <input type="file" accept="image/png, image/jpeg, image/jpg" style={{ display: 'none' }} onChange={handlePhotoChange} />
                  </label>
                </div>
              </div>
            </div>

            {/* 3. Family & Address */}
            <div style={sectionCardStyle}>
              <div style={sectionTitleStyle}>Family, Guardian &amp; Address</div>
              <div className="grid-2" style={{ marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="label-text">
                    {getFieldLabel('fatherName', "Father's Name")} <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.fatherName}
                    onChange={(e) => setForm({ ...form, fatherName: e.target.value })}
                    placeholder="Father's Full Name"
                  />
                </div>
                {isFieldVisible('motherName') && (
                  <div className="form-group">
                    <label className="label-text">{getFieldLabel('motherName', "Mother's Name")}</label>
                    <input
                      type="text"
                      value={form.motherName}
                      onChange={(e) => setForm({ ...form, motherName: e.target.value })}
                      placeholder="Mother's Full Name"
                    />
                  </div>
                )}
              </div>

              <div className="grid-2" style={{ marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="label-text">
                    {getFieldLabel('contactNo', 'Primary Contact No')} <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.contactNo}
                    onChange={(e) => setForm({ ...form, contactNo: e.target.value })}
                    placeholder="10-digit mobile number"
                  />
                </div>
                {(isFieldVisible('guardianName') || isFieldVisible('guardianMobile')) && (
                  <div className="form-group">
                    <label className="label-text">Guardian Name &amp; Mobile</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <input
                        type="text"
                        value={form.guardianName}
                        onChange={(e) => setForm({ ...form, guardianName: e.target.value })}
                        placeholder="Guardian Name"
                      />
                      <input
                        type="text"
                        value={form.guardianMobile}
                        onChange={(e) => setForm({ ...form, guardianMobile: e.target.value })}
                        placeholder="Guardian Mobile"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid-2">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="label-text">
                    {getFieldLabel('village', 'Village / City')} <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.village}
                    onChange={(e) => setForm({ ...form, village: e.target.value })}
                    placeholder="Village or City"
                    style={{ marginBottom: 0 }}
                  />
                </div>
                {isFieldVisible('address') && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="label-text">{getFieldLabel('address', 'Full Street Address')}</label>
                    <input
                      type="text"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      placeholder="Colony, Landmark, Pin Code"
                      style={{ marginBottom: 0 }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 3b. Institute-Defined Custom Fields */}
            {customFieldConfigs.length > 0 && (
              <div style={sectionCardStyle}>
                <div style={sectionTitleStyle}>Institute Custom Fields</div>
                <div className="grid-2">
                  {customFieldConfigs.map((cf) => (
                    <div key={cf.key} className="form-group">
                      <label className="label-text">
                        {cf.label} {cf.required && <span className="req">*</span>}
                      </label>
                      {cf.type === 'select' && Array.isArray(cf.options) && cf.options.length > 0 ? (
                        <select
                          required={cf.required}
                          value={form.customFields?.[cf.key] || ''}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              customFields: { ...(form.customFields || {}), [cf.key]: e.target.value },
                            })
                          }
                        >
                          <option value="">Select...</option>
                          {cf.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={cf.type || 'text'}
                          required={cf.required}
                          value={form.customFields?.[cf.key] || ''}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              customFields: { ...(form.customFields || {}), [cf.key]: e.target.value },
                            })
                          }
                          placeholder={`Enter ${cf.label}`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Previous School & Document Checklist */}
            <div style={sectionCardStyle}>
              <div style={sectionTitleStyle}>Previous Academics &amp; Documents</div>
              {(isFieldVisible('prevSchool') || isFieldVisible('prevClass')) && (
                <div className="grid-2" style={{ marginBottom: '12px' }}>
                  {isFieldVisible('prevSchool') && (
                    <div className="form-group">
                      <label className="label-text">{getFieldLabel('prevSchool', 'Previous School Attended')}</label>
                      <input
                        type="text"
                        value={form.prevSchool}
                        onChange={(e) => setForm({ ...form, prevSchool: e.target.value })}
                        placeholder="Optional"
                      />
                    </div>
                  )}
                  {isFieldVisible('prevClass') && (
                    <div className="form-group">
                      <label className="label-text">{getFieldLabel('prevClass', 'Last Class Passed')}</label>
                      <input
                        type="text"
                        value={form.prevClass}
                        onChange={(e) => setForm({ ...form, prevClass: e.target.value })}
                        placeholder="e.g. Class 4"
                      />
                    </div>
                  )}
                </div>
              )}
              <label className="label-text">Submitted Documents Checklist</label>
              <div className="checkbox-grid">
                {ADMISSION_DOCUMENTS.map((docName) => (
                  <label key={docName} className="cb-pill">
                    <input
                      type="checkbox"
                      checked={form.documents.includes(docName)}
                      onChange={() => toggleDoc(docName)}
                    />
                    {docName}
                  </label>
                ))}
              </div>
            </div>

            {/* 5. Fee Breakdown */}
            <div style={{ ...sectionCardStyle, marginBottom: 0 }}>
              <div style={sectionTitleStyle}>Admission Fee &amp; Payment Breakdown</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="label-text">Admission Fee (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.admFee}
                    onChange={(e) => setForm({ ...form, admFee: Number(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label className="label-text">Monthly Fee (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.monthFee}
                    onChange={(e) => setForm({ ...form, monthFee: Number(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label className="label-text">Uniform / Kit (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.uniformFee}
                    onChange={(e) => setForm({ ...form, uniformFee: Number(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label className="label-text">Concession (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.concession}
                    onChange={(e) => setForm({ ...form, concession: Number(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label className="label-text">Paid Now (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.amountPaid}
                    onChange={(e) => setForm({ ...form, amountPaid: Number(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label className="label-text">Payment Mode</label>
                  <select value={form.payMode} onChange={(e) => setForm({ ...form, payMode: e.target.value })}>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI / QR</option>
                    <option value="Online">Online / Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '10px',
                  background: 'rgba(38,195,234,0.06)',
                  border: '1px dashed rgba(38,195,234,0.35)',
                  borderRadius: '12px',
                  padding: '12px',
                  marginBottom: '12px',
                }}
              >
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Gross</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text)' }}>₹{gross.toLocaleString('en-IN')}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Net Payable</div>
                  <div style={{ fontSize: '15px', fontWeight: 900, color: 'var(--brand)' }}>₹{net.toLocaleString('en-IN')}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Paid</div>
                  <div style={{ fontSize: '15px', fontWeight: 900, color: 'var(--success)' }}>₹{paid.toLocaleString('en-IN')}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Balance</div>
                  <div style={{ fontSize: '15px', fontWeight: 900, color: balance > 0 ? 'var(--accent)' : 'var(--success)' }}>
                    ₹{balance.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="label-text">Office Remarks</label>
                <input
                  type="text"
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  placeholder="Scholarship reference, transport note, etc."
                  style={{ marginBottom: 0 }}
                />
              </div>
            </div>
            </div>

            {/* RIGHT PANE: LIVE FILLED FORM PREVIEW */}
            <div
              style={{
                display: isMobile && mobilePane === 'form' ? 'none' : 'block',
                position: 'sticky',
                top: 0,
                background: 'rgba(0,0,0,0.22)',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                padding: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="badge bg-success">LIVE FILLED PREVIEW</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Matches 1-Page Print PDF
                  </span>
                </div>
                <span className={`badge ${form.status === 'Admitted' ? 'bg-success' : 'bg-warning'}`}>
                  {form.status === 'Admitted'
                    ? `${liveAdmNoPreview}${liveRollPreview ? ` • Roll ${liveRollPreview}` : ''}`
                    : `${liveAdmNoPreview} (Pending)`}
                </span>
              </div>

              <AdmissionFormLivePreview
                record={livePreviewRecord}
                template={template}
                instituteInfo={instituteInfo}
                photoPreviewUrl={photoPreview}
                admNoPreviewHint={liveAdmNoPreview}
                rollNoPreviewHint={
                  form.status === 'Admitted'
                    ? liveRollPreview
                      ? `Roll: ${liveRollPreview}`
                      : 'Roll: Auto on Save'
                    : 'Roll: Assigned on Admitted'
                }
              />
            </div>
          </div>

          <div className="modal-action-dock" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <OpticalButton type="button" variant="outline" onClick={onClose}>
              Cancel
            </OpticalButton>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {initialRecord && onDelete && (
                <OpticalButton type="button" variant="danger" onClick={() => onDelete(initialRecord)}>
                  Remove
                </OpticalButton>
              )}
              <OpticalButton type="submit" variant="success" disabled={saving}>
                {saving ? <IOSSpinner size={15} color="#05080F" /> : null}
                {saving ? 'Saving...' : form.status === 'Admitted' ? 'Save & Enroll Student' : 'Save Application'}
              </OpticalButton>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function createBlankRecord(): AdmissionRecord {
  return {
    id: `adm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    admissionNo: 'AUTO',
    autoAssignAdmNo: true,
    autoAssignRollNo: true,
    status: 'Admitted',
    studentStatus: 'Active',
    className: '',
    section: 'A',
    rollNo: null,
    academicSession: getCurrentAcademicSession(),
    admissionDate: getTodayIsoDate(),
    studentName: '',
    dob: '',
    gender: 'Male',
    category: 'General',
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
}

// ============================================================================
// 2. QUICK ENQUIRY MODAL
// ============================================================================
interface QuickEnquiryModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (record: AdmissionRecord) => Promise<void>;
}

export function QuickEnquiryModal({ open, onClose, onSave }: QuickEnquiryModalProps) {
  const [studentName, setStudentName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [className, setClassName] = useState('');
  const [village, setVillage] = useState('');
  const [source, setSource] = useState('Walk-in');
  const [followUpDate, setFollowUpDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const blank = createBlankRecord();
      await onSave({
        ...blank,
        admissionNo: 'AUTO',
        autoAssignAdmNo: false,
        autoAssignRollNo: false,
        rollNo: null,
        status: 'Enquiry',
        studentName: studentName.trim(),
        fatherName: fatherName.trim(),
        contactNo: contactNo.trim(),
        className,
        village: village.trim() || '-',
        enquirySource: source,
        followUpDate,
        remarks: notes.trim(),
      });
      setStudentName('');
      setFatherName('');
      setContactNo('');
      setClassName('');
      setVillage('');
      setFollowUpDate('');
      setNotes('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-overlay active" onClick={onClose} style={{ zIndex: 99999 }}>
      <div className="glass-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px', width: '92%' }}>
        <div className="premium-sticky-header">
          <h2 style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Quick Admission Enquiry
          </h2>
          <CloseIconBtn onClick={onClose} />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-scroll-body">
            <div className="form-group">
              <label className="label-text">
                Student Name <span className="req">*</span>
              </label>
              <input type="text" required value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="e.g. Ananya Sharma" />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="label-text">
                  Father / Guardian <span className="req">*</span>
                </label>
                <input type="text" required value={fatherName} onChange={(e) => setFatherName(e.target.value)} placeholder="Father's Name" />
              </div>
              <div className="form-group">
                <label className="label-text">
                  Contact No <span className="req">*</span>
                </label>
                <input type="text" required value={contactNo} onChange={(e) => setContactNo(e.target.value)} placeholder="10-digit mobile" />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="label-text">
                  Target Class <span className="req">*</span>
                </label>
                <select required value={className} onChange={(e) => setClassName(e.target.value)}>
                  <option value="" disabled>
                    Select Class...
                  </option>
                  {ADMISSION_CLASSES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="label-text">Enquiry Source</label>
                <select value={source} onChange={(e) => setSource(e.target.value)}>
                  <option value="Walk-in">Walk-in</option>
                  <option value="Phone Call">Phone Call</option>
                  <option value="Referral">Parent Referral</option>
                  <option value="Website / Social">Website / Social</option>
                </select>
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="label-text">Village / Locality</label>
                <input type="text" value={village} onChange={(e) => setVillage(e.target.value)} placeholder="Village / Area" />
              </div>
              <div className="form-group">
                <label className="label-text">Follow-up Date</label>
                <input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label-text">Notes</label>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Fee discussed, transport needed, etc." style={{ marginBottom: 0 }} />
            </div>
          </div>
          <div className="modal-action-dock">
            <OpticalButton type="button" variant="outline" onClick={onClose}>
              Cancel
            </OpticalButton>
            <OpticalButton type="submit" variant="warning" disabled={saving}>
              {saving ? 'Saving...' : 'Save Enquiry'}
            </OpticalButton>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// 3. ADMISSION SLIP & FULL MASTER PROFILE MODAL (Sub-50ms PDF + 5TB Drive)
// ============================================================================
interface AdmissionSlipModalProps {
  record: AdmissionRecord | null;
  template: AdmissionFormTemplate;
  instituteInfo: { name: string; code: string; address?: string; email?: string; logoUrl?: string };
  canManage: boolean;
  onClose: () => void;
  onEdit: (rec: AdmissionRecord) => void;
  onPromote: (rec: AdmissionRecord) => void;
  onDemote: (rec: AdmissionRecord) => void;
  onGenerateAndArchive?: (rec: AdmissionRecord, silentArchive?: boolean, docType?: 'admission_form' | 'receipt') => Promise<number>;
}

export function AdmissionSlipModal({
  record,
  template,
  instituteInfo,
  canManage,
  onClose,
  onEdit,
  onPromote,
  onDemote,
  onGenerateAndArchive,
}: AdmissionSlipModalProps) {
  const [archiving, setArchiving] = useState(false);
  const [lastRenderMs, setLastRenderMs] = useState<number | null>(null);

  useEffect(() => {
    if (record?.photoUrl) {
      preloadImageAsDataUrl(record.photoUrl).catch(() => {});
    }
    if (template.branding.signatureUrl) {
      preloadImageAsDataUrl(template.branding.signatureUrl).catch(() => {});
    }
    setLastRenderMs(null);
  }, [record, template.branding.signatureUrl]);

  if (!record) return null;

  const { net, paid, balance } = computeFeeTotals(record);
  const nextCls = getNextClassName(record.className);
  const prevCls = getPrevClassName(record.className);
  const customEntries = Object.entries(record.customFields || {}).filter(([, v]) => v);

  const handleDownloadPdf = async () => {
    const { doc, durationMs } = generateDynamicAdmissionFormPdf(record, template, instituteInfo);
    setLastRenderMs(durationMs);
    doc.save(`Admission_Form_${record.admissionNo || 'Student'}.pdf`);
    if (onGenerateAndArchive && !record.formPdfUrl) {
      onGenerateAndArchive(record, true, 'admission_form').catch(() => {});
    }
  };

  const handleDownloadReceiptPdf = async () => {
    const { doc, durationMs } = generateAdmissionPaymentReceiptPdf(record, template, instituteInfo);
    setLastRenderMs(durationMs);
    doc.save(`Payment_Receipt_${record.admissionNo || 'Student'}.pdf`);
    if (onGenerateAndArchive) {
      onGenerateAndArchive(record, true, 'receipt').catch(() => {});
    }
  };

  const handleRetryDriveSync = async () => {
    if (!onGenerateAndArchive) return;
    setArchiving(true);
    try {
      const ms = await onGenerateAndArchive(record, false, 'admission_form');
      setLastRenderMs(ms);
    } finally {
      setArchiving(false);
    }
  };

  const handlePrint = () => {
    const { doc, durationMs } = generateDynamicAdmissionFormPdf(record, template, instituteInfo);
    setLastRenderMs(durationMs);
    const blobUrl = doc.output('bloburl');
    window.open(blobUrl, '_blank');
  };

  const infoBoxStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '12px 14px',
  };

  return (
    <div className="glass-overlay active" onClick={onClose} style={{ zIndex: 100000 }}>
      <div className="glass-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '780px', width: '95%' }}>
        <div className="premium-sticky-header">
          <h2 style={{ color: 'var(--brand)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
            Student Master Profile &amp; Admission Form
          </h2>
          <CloseIconBtn onClick={onClose} />
        </div>

        <div className="modal-scroll-body">
          {/* Student Header Card */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              flexWrap: 'wrap',
              padding: '16px',
              borderRadius: '14px',
              background: 'rgba(38,195,234,0.07)',
              border: '1px solid rgba(38,195,234,0.28)',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                width: '62px',
                height: '72px',
                borderRadius: '12px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(38,195,234,0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                fontWeight: 900,
                fontSize: '22px',
                color: 'var(--brand)',
                flexShrink: 0,
              }}
            >
              {record.photoUrl ? (
                <img src={record.photoUrl} alt={record.studentName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                (record.studentName || 'S').charAt(0).toUpperCase()
              )}
            </div>
            <div style={{ flex: 1, minWidth: '180px' }}>
              <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text)' }}>{record.studentName}</div>
              <div style={{ fontSize: '12px', color: 'var(--brand)', fontWeight: 800, marginTop: '3px' }}>
                {record.admissionNo} • {record.className || '-'} ({record.section || 'A'}) • Roll {record.rollNo ?? '-'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px', fontWeight: 600 }}>
                Session: {record.academicSession} • Adm Date: {record.admissionDate || '-'}
                {lastRenderMs !== null ? ` • Rendered in ${lastRenderMs}ms` : ''}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
              <span className={`badge ${record.status === 'Admitted' ? 'bg-success' : record.status === 'Cancelled' ? 'bg-danger' : 'bg-warning'}`}>
                {record.status}
              </span>
              {record.formPdfUrl ? (
                <a
                  href={record.formPdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="badge bg-info"
                  style={{ textDecoration: 'none' }}
                >
                  Auto-Saved Drive Form ↗
                </a>
              ) : null}
              {record.receiptPdfUrl ? (
                <a
                  href={record.receiptPdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="badge bg-purple"
                  style={{ textDecoration: 'none' }}
                >
                  Drive Receipt ↗
                </a>
              ) : null}
            </div>
          </div>

          {/* 3-Column Master Detail Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            <div style={infoBoxStyle}>
              <div className="label-text">Father&apos;s Name</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginTop: '3px' }}>{record.fatherName || '-'}</div>
            </div>
            <div style={infoBoxStyle}>
              <div className="label-text">Mother&apos;s Name</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginTop: '3px' }}>{record.motherName || '-'}</div>
            </div>
            <div style={infoBoxStyle}>
              <div className="label-text">Primary Contact</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginTop: '3px' }}>{record.contactNo || '-'}</div>
            </div>
            <div style={infoBoxStyle}>
              <div className="label-text">Date of Birth &amp; Gender</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginTop: '3px' }}>
                {record.dob || '-'} ({record.gender || '-'})
              </div>
            </div>
            <div style={infoBoxStyle}>
              <div className="label-text">Aadhaar / Category</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginTop: '3px' }}>
                {record.aadhaar || '-'} • {record.category || 'General'}
              </div>
            </div>
            <div style={infoBoxStyle}>
              <div className="label-text">Village &amp; Address</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginTop: '3px' }}>
                {record.village || '-'}
                {record.address ? `, ${record.address}` : ''}
              </div>
            </div>
            <div style={infoBoxStyle}>
              <div className="label-text">Guardian</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginTop: '3px' }}>
                {record.guardianName || '-'} ({record.guardianMobile || '-'})
              </div>
            </div>
            <div style={infoBoxStyle}>
              <div className="label-text">Previous School</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginTop: '3px' }}>
                {record.prevSchool || 'Fresh Admission'}
              </div>
            </div>
            <div style={infoBoxStyle}>
              <div className="label-text">Documents Verified</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand)', marginTop: '3px' }}>
                {record.documents.length > 0 ? record.documents.join(', ') : 'None marked'}
              </div>
            </div>
            {customEntries.map(([k, v]) => {
              const cfg = template.fieldsConfig?.find((f) => f.key === k);
              return (
                <div key={k} style={infoBoxStyle}>
                  <div className="label-text">{cfg?.label || k}</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginTop: '3px' }}>{v}</div>
                </div>
              );
            })}
          </div>

          {/* Fee Strip */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '12px',
              padding: '14px',
              borderRadius: '12px',
              background: 'rgba(46,204,113,0.06)',
              border: '1px solid rgba(46,204,113,0.22)',
            }}
          >
            <div>
              <div className="label-text">Adm / Mon / Kit</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                ₹{record.admFee} / ₹{record.monthFee} / ₹{record.uniformFee}
              </div>
            </div>
            <div>
              <div className="label-text">Net Payable</div>
              <div style={{ fontSize: '15px', fontWeight: 900, color: 'var(--brand)' }}>₹{net.toLocaleString('en-IN')}</div>
            </div>
            <div>
              <div className="label-text">Paid ({record.payMode})</div>
              <div style={{ fontSize: '15px', fontWeight: 900, color: 'var(--success)' }}>₹{paid.toLocaleString('en-IN')}</div>
            </div>
            <div>
              <div className="label-text">Balance Due</div>
              <div style={{ fontSize: '15px', fontWeight: 900, color: balance > 0 ? 'var(--accent)' : 'var(--success)' }}>
                ₹{balance.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>

        <div className="modal-action-dock" style={{ flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {canManage && record.supabaseStudentId && prevCls && (
              <OpticalButton type="button" variant="warning" onClick={() => onDemote(record)} style={{ padding: '8px 14px', fontSize: '12px' }}>
                Demote ({prevCls})
              </OpticalButton>
            )}
            {canManage && record.supabaseStudentId && nextCls && (
              <OpticalButton type="button" variant="purple" onClick={() => onPromote(record)} style={{ padding: '8px 14px', fontSize: '12px' }}>
                Promote ({nextCls})
              </OpticalButton>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {canManage && (
              <OpticalButton type="button" variant="outline" onClick={() => onEdit(record)}>
                Edit
              </OpticalButton>
            )}
            {onGenerateAndArchive && !record.formPdfUrl && record.status === 'Admitted' && (
              <OpticalButton type="button" variant="outline" onClick={handleRetryDriveSync} disabled={archiving}>
                {archiving ? <IOSSpinner size={14} color="currentColor" /> : null}
                {archiving ? 'Archiving...' : 'Retry Auto-Drive'}
              </OpticalButton>
            )}
            <OpticalButton type="button" variant="purple" onClick={handleDownloadReceiptPdf}>
              Payment Receipt PDF
            </OpticalButton>
            <OpticalButton type="button" variant="secondary" onClick={handlePrint}>
              Print Form
            </OpticalButton>
            <OpticalButton type="button" variant="success" onClick={handleDownloadPdf}>
              Admission Form PDF
            </OpticalButton>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 4. BULK PROMOTE CLASS MODAL
// ============================================================================
interface BulkPromoteModalProps {
  open: boolean;
  onClose: () => void;
  onPromoteClass: (fromClass: string, toClass: string) => Promise<void>;
}

export function BulkPromoteModal({ open, onClose, onPromoteClass }: BulkPromoteModalProps) {
  const [selectedClass, setSelectedClass] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const targetNext = selectedClass ? getNextClassName(selectedClass) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !targetNext) return;
    setBusy(true);
    try {
      await onPromoteClass(selectedClass, targetNext);
      setSelectedClass('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass-overlay active" onClick={onClose} style={{ zIndex: 99999 }}>
      <div className="glass-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px', width: '92%' }}>
        <div className="premium-sticky-header">
          <h2 style={{ color: 'var(--accent)', margin: 0 }}>Bulk Promote Class</h2>
          <CloseIconBtn onClick={onClose} />
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-scroll-body">
            <p style={{ color: 'var(--text-muted)', fontSize: '12.5px', lineHeight: 1.5, marginBottom: '16px', fontWeight: 600 }}>
              Promote all active enrolled students from a class directly to the next academic class level in Supabase.
            </p>
            <div className="form-group">
              <label className="label-text">
                Select Source Class <span className="req">*</span>
              </label>
              <select required value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                <option value="" disabled>
                  Choose class to promote...
                </option>
                {ADMISSION_CLASSES.slice(0, -1).map((c) => (
                  <option key={c} value={c}>
                    {c} → {getNextClassName(c)}
                  </option>
                ))}
              </select>
            </div>
            {targetNext && (
              <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', fontSize: '12px', fontWeight: 700, color: 'var(--accent)' }}>
                All active students in {selectedClass} will be promoted to {targetNext}.
              </div>
            )}
          </div>
          <div className="modal-action-dock">
            <OpticalButton type="button" variant="outline" onClick={onClose}>
              Cancel
            </OpticalButton>
            <OpticalButton type="submit" variant="warning" disabled={!targetNext || busy}>
              {busy ? 'Promoting...' : 'Promote All'}
            </OpticalButton>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// 5. CLASS SEAT CAPACITY MODAL
// ============================================================================
interface ClassCapacityModalProps {
  open: boolean;
  capacities: ClassCapacityMap;
  onClose: () => void;
  onSave: (nextMap: ClassCapacityMap) => void;
}

export function ClassCapacityModal({ open, capacities, onClose, onSave }: ClassCapacityModalProps) {
  const [draft, setDraft] = useState<ClassCapacityMap>(capacities);

  useEffect(() => {
    if (open) setDraft({ ...capacities });
  }, [open, capacities]);

  if (!open) return null;

  return (
    <div className="glass-overlay active" onClick={onClose} style={{ zIndex: 99999 }}>
      <div className="glass-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px', width: '94%' }}>
        <div className="premium-sticky-header">
          <h2 style={{ color: 'var(--brand)', margin: 0 }}>Configure Class Seat Capacities</h2>
          <CloseIconBtn onClick={onClose} />
        </div>
        <div className="modal-scroll-body">
          <div className="grid-2">
            {ADMISSION_CLASSES.map((cls) => (
              <div key={cls} className="form-group">
                <label className="label-text">{cls}</label>
                <input
                  type="number"
                  min={1}
                  value={draft[cls] ?? 40}
                  onChange={(e) => setDraft({ ...draft, [cls]: Math.max(1, Number(e.target.value) || 1) })}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="modal-action-dock">
          <OpticalButton type="button" variant="outline" onClick={onClose}>
            Cancel
          </OpticalButton>
          <OpticalButton
            type="button"
            variant="primary"
            onClick={() => {
              onSave(draft);
              onClose();
            }}
          >
            Save Capacities
          </OpticalButton>
        </div>
      </div>
    </div>
  );
}

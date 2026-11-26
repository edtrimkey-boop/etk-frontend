'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { OpticalButton } from '@/components/ui/OpticalGlass';
import IOSSpinner from '@/components/ui/IOSSpinner';
import {
  AdmissionFormTemplate,
  AdmissionRecord,
  BottomWidgetChoice,
  FormLayoutVariant,
  RightWidgetChoice,
  TemplateFieldConfig,
  generateDynamicAdmissionFormPdf,
  getCurrentAcademicSession,
  getTodayIsoDate,
  preloadImageAsDataUrl,
} from '@/lib/admissions';
import { AdmissionFormLivePreview } from '@/components/admission/AdmissionFormLivePreview';

interface AdmissionTemplateModalProps {
  open: boolean;
  template: AdmissionFormTemplate;
  instituteInfo: { name: string; code: string; address?: string; email?: string; logoUrl?: string };
  onClose: () => void;
  onSave: (nextTemplate: AdmissionFormTemplate) => Promise<void>;
}

export function AdmissionTemplateModal({
  open,
  template,
  instituteInfo,
  onClose,
  onSave,
}: AdmissionTemplateModalProps) {
  const [draft, setDraft] = useState<AdmissionFormTemplate>(template);
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<'text' | 'number' | 'date' | 'select'>('text');
  const [newOptions, setNewOptions] = useState('');
  const [mobilePane, setMobilePane] = useState<'editor' | 'preview'>('editor');
  const [isMobile, setIsMobile] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 920px)');
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (open) {
      setDraft(JSON.parse(JSON.stringify(template)));
      setMobilePane('editor');
    }
  }, [open, template]);

  const sampleRecord: AdmissionRecord = useMemo(() => {
    const prefix = (draft.branding.admissionPrefix || 'KPS-').toUpperCase();
    const pad = Math.max(1, Math.min(8, Number(draft.branding.admissionPadding || 5)));
    const admNo = `${prefix}${String(175).padStart(pad, '0')}`;
    return {
      id: 'preview-sample',
      admissionNo: admNo,
      status: 'Admitted',
      studentStatus: 'Active',
      className: 'PRE-NURSERY',
      section: 'A',
      rollNo: 1,
      academicSession: getCurrentAcademicSession(),
      admissionDate: getTodayIsoDate(),
      studentName: 'RAHUL KUMAR',
      dob: '2011-01-13',
      gender: 'Male',
      category: 'General',
      bloodGroup: 'O+',
      aadhaar: '',
      photoUrl: '',
      fatherName: 'SUBHODEEP KUMAR',
      motherName: '',
      contactNo: '9876543210',
      guardianName: '',
      guardianMobile: '9876543210',
      village: 'RAJMAHAL',
      address: 'FULWARIYA CHOWK, MAIN ROAD, RAJMAHAL',
      prevSchool: '',
      prevClass: '',
      documents: ['Birth Certificate', 'Aadhar / ID Proof'],
      admFee: 2000,
      monthFee: 500,
      uniformFee: 2000,
      concession: 0,
      amountPaid: 4500,
      payMode: 'Cash',
      remarks: '',
      customFields: {},
    };
  }, [draft.branding.admissionPrefix, draft.branding.admissionPadding]);

  if (!open) return null;

  const updateBranding = (patch: Partial<AdmissionFormTemplate['branding']>) => {
    setDraft((prev) => ({
      ...prev,
      branding: { ...prev.branding, ...patch },
    }));
  };

  const updateField = (idx: number, patch: Partial<TemplateFieldConfig>) => {
    setDraft((prev) => {
      const next = [...prev.fieldsConfig];
      next[idx] = { ...next[idx], ...patch };
      return { ...prev, fieldsConfig: next };
    });
  };

  const moveField = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= draft.fieldsConfig.length) return;
    setDraft((prev) => {
      const next = [...prev.fieldsConfig];
      const temp = next[idx];
      next[idx] = next[target];
      next[target] = temp;
      return { ...prev, fieldsConfig: next };
    });
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = typeof ev.target?.result === 'string' ? ev.target.result : '';
      if (dataUrl) {
        updateBranding({ signatureUrl: dataUrl });
        preloadImageAsDataUrl(dataUrl).catch(() => {});
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddCustomField = () => {
    const cleanLabel = newLabel.trim();
    if (!cleanLabel) return;
    const key =
      'cf_' +
      cleanLabel
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');

    if (draft.fieldsConfig.some((f) => f.key === key)) return;

    const opts =
      newType === 'select'
        ? newOptions
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

    setDraft((prev) => ({
      ...prev,
      fieldsConfig: [
        ...prev.fieldsConfig,
        {
          key,
          label: cleanLabel,
          section: 'custom',
          visible: true,
          required: false,
          isCustom: true,
          type: newType,
          options: opts,
        },
      ],
    }));

    setNewLabel('');
    setNewOptions('');
    setNewType('text');
  };

  const handleRemoveCustomField = (key: string) => {
    setDraft((prev) => ({
      ...prev,
      fieldsConfig: prev.fieldsConfig.filter((f) => f.key !== key),
    }));
  };

  const handleTestPdf = () => {
    if (draft.branding.signatureUrl) {
      preloadImageAsDataUrl(draft.branding.signatureUrl).catch(() => {});
    }
    const { doc } = generateDynamicAdmissionFormPdf(sampleRecord, draft, instituteInfo);
    const url = doc.output('bloburl');
    window.open(url, '_blank');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(draft);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.025)',
    border: '1px solid var(--border)',
    borderRadius: '14px',
    padding: '14px',
    marginBottom: '14px',
  };

  const cardTitleStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 800,
    color: 'var(--brand)',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    marginBottom: '10px',
  };

  return (
    <div className="glass-overlay active" onClick={onClose} style={{ zIndex: 99999 }}>
      <div
        className="glass-box"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '1240px', width: '96%' }}
      >
        <div className="premium-sticky-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
          <h2 style={{ color: 'var(--brand)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            Customize Admission Form &amp; Live A4 Layout
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isMobile && (
              <div className="etk-segmented-nav" style={{ margin: 0 }}>
                <button
                  type="button"
                  className={`etk-segmented-pill ${mobilePane === 'editor' ? 'active' : ''}`}
                  onClick={() => setMobilePane('editor')}
                  style={{ padding: '5px 12px', fontSize: '11px' }}
                >
                  Controls
                </button>
                <button
                  type="button"
                  className={`etk-segmented-pill ${mobilePane === 'preview' ? 'active' : ''}`}
                  onClick={() => setMobilePane('preview')}
                  style={{ padding: '5px 12px', fontSize: '11px' }}
                >
                  Live A4 Preview
                </button>
              </div>
            )}
            <button type="button" className="close-minimal" onClick={onClose} aria-label="Close" title="Close">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
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
            {/* LEFT PANE: TEMPLATE CONTROLS */}
            <div style={{ display: isMobile && mobilePane === 'preview' ? 'none' : 'block' }}>
              {/* 1. Layout & Auto-Numbering */}
              <div style={cardStyle}>
                <div style={cardTitleStyle}>1. Page Style &amp; Monotonic Admission Numbering</div>
                <div className="grid-2" style={{ marginBottom: '10px' }}>
                  <div className="form-group">
                    <label className="label-text">PDF Layout Variant</label>
                    <select
                      value={draft.layoutVariant}
                      onChange={(e) => setDraft({ ...draft, layoutVariant: e.target.value as FormLayoutVariant })}
                    >
                      <option value="keystone">School 1-Page Bordered (Recommended)</option>
                      <option value="modern">Modern Dark Header</option>
                      <option value="classic">Classic Academic Bordered</option>
                      <option value="compact">Compact High-Density A4</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="label-text">Frame Accent Color</label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="color"
                        value={draft.branding.accentColor || '#008FD5'}
                        onChange={(e) => updateBranding({ accentColor: e.target.value })}
                        style={{ width: '44px', height: '38px', padding: '2px', marginBottom: 0, cursor: 'pointer' }}
                      />
                      <input
                        type="text"
                        value={draft.branding.accentColor}
                        onChange={(e) => updateBranding({ accentColor: e.target.value })}
                        style={{ marginBottom: 0 }}
                        placeholder="#008FD5"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid-2" style={{ marginBottom: 0 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="label-text">Admission No Prefix</label>
                    <input
                      type="text"
                      value={draft.branding.admissionPrefix || ''}
                      onChange={(e) => updateBranding({ admissionPrefix: e.target.value.toUpperCase() })}
                      placeholder="e.g. KPS-"
                      style={{ marginBottom: 0 }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="label-text">Zero-Padding Digits</label>
                    <select
                      value={draft.branding.admissionPadding || 5}
                      onChange={(e) => updateBranding({ admissionPadding: Number(e.target.value) })}
                      style={{ marginBottom: 0 }}
                    >
                      <option value={3}>3 Digits (001)</option>
                      <option value={4}>4 Digits (0001)</option>
                      <option value={5}>5 Digits (00175)</option>
                      <option value={6}>6 Digits (000175)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 2. Header & Signature */}
              <div style={cardStyle}>
                <div style={cardTitleStyle}>2. Institute Header, Declaration &amp; Signature</div>
                <div className="grid-2" style={{ marginBottom: '10px' }}>
                  <div className="form-group">
                    <label className="label-text">School / Institute Title</label>
                    <input
                      type="text"
                      value={draft.branding.headerTitle}
                      onChange={(e) => updateBranding({ headerTitle: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="label-text">Form Badge Title</label>
                    <input
                      type="text"
                      value={draft.branding.subHeader}
                      onChange={(e) => updateBranding({ subHeader: e.target.value })}
                      placeholder="ADMISSION FORM"
                    />
                  </div>
                </div>

                <div className="grid-2" style={{ marginBottom: '10px' }}>
                  <div className="form-group">
                    <label className="label-text">Address Pill Banner</label>
                    <input
                      type="text"
                      value={draft.branding.addressBanner || ''}
                      onChange={(e) => updateBranding({ addressBanner: e.target.value })}
                      placeholder="Village / Area, District, PIN"
                    />
                  </div>
                  <div className="form-group">
                    <label className="label-text">Header Contact Line</label>
                    <input
                      type="text"
                      value={draft.branding.contactLine || ''}
                      onChange={(e) => updateBranding({ contactLine: e.target.value })}
                      placeholder="CONTACT : 7004668204, 8235577756"
                    />
                  </div>
                </div>

                <div className="grid-2" style={{ marginBottom: '10px' }}>
                  <div className="form-group">
                    <label className="label-text">Director Signature Label</label>
                    <input
                      type="text"
                      value={draft.branding.signatureLabel}
                      onChange={(e) => updateBranding({ signatureLabel: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="label-text">Total Label</label>
                    <input
                      type="text"
                      value={draft.branding.totalLabel || 'TOTAL AMOUNT'}
                      onChange={(e) => updateBranding({ totalLabel: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid-2" style={{ marginBottom: '10px' }}>
                  <div className="form-group">
                    <label className="label-text">Director Signature PNG (Optional)</label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <label className="upload-box" style={{ padding: '7px 12px', cursor: 'pointer', flex: 1, marginBottom: 0, fontSize: '11.5px' }}>
                        {draft.branding.signatureUrl ? 'Change Signature Image' : 'Upload Signature PNG/JPG'}
                        <input type="file" accept="image/png, image/jpeg" style={{ display: 'none' }} onChange={handleSignatureUpload} />
                      </label>
                      {draft.branding.signatureUrl ? (
                        <OpticalButton
                          type="button"
                          variant="danger"
                          onClick={() => updateBranding({ signatureUrl: '' })}
                          style={{ padding: '7px 10px', fontSize: '11px' }}
                        >
                          Clear
                        </OpticalButton>
                      ) : null}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="label-text">Watermark Text (Optional)</label>
                    <input
                      type="text"
                      value={draft.branding.watermarkText}
                      onChange={(e) => updateBranding({ watermarkText: e.target.value })}
                      placeholder="e.g. OFFICE COPY"
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="label-text">Parent Declaration Text</label>
                  <input
                    type="text"
                    value={draft.branding.declarationText}
                    onChange={(e) => updateBranding({ declarationText: e.target.value })}
                    style={{ marginBottom: 0 }}
                  />
                </div>
              </div>

              {/* 3. Swappable Form Widgets (Right & Bottom Slots) */}
              <div style={cardStyle}>
                <div style={cardTitleStyle}>3. Optional Form Blocks (Swappable Per Institute)</div>
                <div className="grid-2" style={{ marginBottom: 0 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="label-text">Right Column Block (Below Photo)</label>
                    <select
                      value={draft.branding.rightWidget || 'calling_grid'}
                      onChange={(e) => updateBranding({ rightWidget: e.target.value as RightWidgetChoice })}
                      style={{ marginBottom: 0 }}
                    >
                      <option value="calling_grid">Calling Date / Expected Date (12 rows)</option>
                      <option value="fee_summary">Fee &amp; Payment Receipt Summary</option>
                      <option value="office_checklist">Office Document Checklist</option>
                      <option value="office_remarks">Office Remarks / Verification Box</option>
                      <option value="none">None (Hide Right Block)</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="label-text">Bottom Strip (Above Declaration)</label>
                    <select
                      value={draft.branding.bottomWidget || 'month_grid_3x12'}
                      onChange={(e) => updateBranding({ bottomWidget: e.target.value as BottomWidgetChoice })}
                      style={{ marginBottom: 0 }}
                    >
                      <option value="month_grid_3x12">12-Month Grid (JAN–DEC × 3 rows)</option>
                      <option value="installment_strip">Quarterly Fee Installment Strip</option>
                      <option value="docs_strip">Documents Submitted Strip</option>
                      <option value="none">None (Hide Bottom Strip)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 4. Add Custom Field */}
              <div style={{ background: 'rgba(38,195,234,0.05)', border: '1px dashed rgba(38,195,234,0.35)', borderRadius: '14px', padding: '14px', marginBottom: '14px' }}>
                <div style={cardTitleStyle}>4. Add Custom Field (Zero DB Migration)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Label (e.g. Bus Route, House, SRN)"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    style={{ marginBottom: 0 }}
                  />
                  <select value={newType} onChange={(e) => setNewType(e.target.value as any)} style={{ marginBottom: 0 }}>
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                    <option value="select">Dropdown</option>
                  </select>
                  <OpticalButton type="button" variant="primary" onClick={handleAddCustomField}>
                    + Add
                  </OpticalButton>
                </div>
                {newType === 'select' && (
                  <input
                    type="text"
                    placeholder="Comma-separated options (e.g. Route A, Route B, Self)"
                    value={newOptions}
                    onChange={(e) => setNewOptions(e.target.value)}
                    style={{ marginTop: '8px', marginBottom: 0 }}
                  />
                )}
              </div>

              {/* 5. Field Order, Visibility & Label Mapping */}
              <div style={{ ...cardStyle, marginBottom: 0 }}>
                <div style={cardTitleStyle}>
                  5. Form Fields &amp; Order ({draft.fieldsConfig.filter((f) => f.visible).length} Active)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                  {draft.fieldsConfig.map((field, idx) => (
                    <div
                      key={field.key}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'auto 1fr auto auto auto',
                        gap: '8px',
                        alignItems: 'center',
                        padding: '6px 10px',
                        borderRadius: '10px',
                        background: 'rgba(0,0,0,0.2)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <label className="cb-pill" style={{ padding: '4px 8px', fontSize: '11px' }}>
                        <input
                          type="checkbox"
                          checked={field.visible}
                          onChange={(e) => updateField(idx, { visible: e.target.checked })}
                        />
                        Show
                      </label>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateField(idx, { label: e.target.value })}
                        style={{ marginBottom: 0, padding: '6px 10px', fontSize: '12px' }}
                      />
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => moveField(idx, -1)}
                          disabled={idx === 0}
                          style={{
                            padding: '4px 7px',
                            borderRadius: '6px',
                            border: '1px solid var(--border)',
                            background: 'rgba(255,255,255,0.05)',
                            color: 'var(--text)',
                            cursor: idx === 0 ? 'not-allowed' : 'pointer',
                            opacity: idx === 0 ? 0.35 : 1,
                            fontSize: '11px',
                          }}
                          title="Move Up"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveField(idx, 1)}
                          disabled={idx === draft.fieldsConfig.length - 1}
                          style={{
                            padding: '4px 7px',
                            borderRadius: '6px',
                            border: '1px solid var(--border)',
                            background: 'rgba(255,255,255,0.05)',
                            color: 'var(--text)',
                            cursor: idx === draft.fieldsConfig.length - 1 ? 'not-allowed' : 'pointer',
                            opacity: idx === draft.fieldsConfig.length - 1 ? 0.35 : 1,
                            fontSize: '11px',
                          }}
                          title="Move Down"
                        >
                          ↓
                        </button>
                      </div>
                      <span className={`badge ${field.isCustom ? 'bg-purple' : 'bg-info'}`} style={{ fontSize: '10px' }}>
                        {field.isCustom ? 'Custom' : field.section}
                      </span>
                      {field.isCustom ? (
                        <OpticalButton
                          type="button"
                          variant="danger"
                          onClick={() => handleRemoveCustomField(field.key)}
                          style={{ padding: '4px 8px', fontSize: '10px' }}
                        >
                          Del
                        </OpticalButton>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT PANE: INSTANT 1-PAGE LIVE A4 PREVIEW */}
            <div
              style={{
                display: isMobile && mobilePane === 'editor' ? 'none' : 'block',
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
                  <span className="badge bg-success">LIVE A4 PREVIEW</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Updates as you edit • 1-Page Vector PDF
                  </span>
                </div>
                <OpticalButton type="button" variant="outline" onClick={handleTestPdf} style={{ padding: '5px 12px', fontSize: '11px' }}>
                  Open Test PDF ↗
                </OpticalButton>
              </div>

              <AdmissionFormLivePreview
                record={sampleRecord}
                template={draft}
                instituteInfo={instituteInfo}
                admNoPreviewHint={`${sampleRecord.admissionNo} (Sample)`}
              />
            </div>
          </div>

          <div className="modal-action-dock">
            <OpticalButton type="button" variant="outline" onClick={onClose}>
              Cancel
            </OpticalButton>
            <OpticalButton type="submit" variant="success" disabled={saving}>
              {saving ? <IOSSpinner size={14} color="#05080F" /> : null}
              {saving ? 'Saving Template...' : 'Save Institute Template'}
            </OpticalButton>
          </div>
        </form>
      </div>
    </div>
  );
}

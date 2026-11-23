// components/modals/DocSubmitModal.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import { serverCall } from '@/lib/api-client';
import IOSSpinner from '@/components/ui/IOSSpinner';
import { OpticalButton } from '@/components/ui/OpticalGlass';
import { playSound } from '@/lib/sound';

const DOC_TYPES = ['Report Card', 'Admit Card', 'ID Card', 'Certificate'];

const CLASSES = [
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
];

const EXAM_NAMES = [
  'Objective (MCQ)',
  '1st Term Exam',
  '2nd Term Exam',
  '3rd Term Exam',
  'Annual Term Exam',
  'Half Year Exam',
  'Annual Year Exam',
  'Subjective',
  'Combined (MCQ + Subj)',
];

export default function DocSubmitModal() {
  const {
    activeModal,
    closeModal,
    user,
    showAlert,
    refreshData,
    showUploadProgress,
    updateUploadProgress,
    showUploadSuccess,
    showUploadError,
  } = useDashboard();
  const isOpen = activeModal === 'docSubmit';

  const pdfInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Form Fields
  const [docType, setDocType] = useState('Report Card');
  const [docDate, setDocDate] = useState('');
  const [className, setClassName] = useState('');
  const [examName, setExamName] = useState('Annual Term Exam');
  const [numStudents, setNumStudents] = useState('45');

  const currentYear = new Date().getFullYear();
  const sessionStr = `${currentYear}-${currentYear + 1}`;

  // File Uploads
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  // Draft State
  const [draftTimestamp, setDraftTimestamp] = useState<string | null>(null);

  const isDateRequired = docType === 'Report Card' || docType === 'Admit Card';

  // Load draft on modal open
  useEffect(() => {
    if (isOpen) {
      const draftStr = localStorage.getItem('tk_doc_draft');
      if (draftStr) {
        try {
          const draft = JSON.parse(draftStr);
          if (draft.type) setDocType(draft.type);
          if (draft.className) setClassName(draft.className);
          if (draft.examName) setExamName(draft.examName);
          if (draft.numStudents) setNumStudents(draft.numStudents);
          if (draft.docDate) setDocDate(draft.docDate);
          if (draft.timestamp) setDraftTimestamp(draft.timestamp);
        } catch (e) {}
      } else {
        setDraftTimestamp(null);
      }
    }
  }, [isOpen]);

  const triggerSaveDraft = (overrides = {}) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const draft = {
      type: docType,
      className,
      examName,
      numStudents,
      docDate,
      timestamp,
      ...overrides,
    };
    try {
      localStorage.setItem('tk_doc_draft', JSON.stringify(draft));
      setDraftTimestamp(timestamp);
    } catch (e) {}
  };

  const clearDocForm = () => {
    setDocType('Report Card');
    setDocDate('');
    setClassName('');
    setExamName('Annual Term Exam');
    setNumStudents('45');
    setPdfFile(null);
    setImageFiles([]);
    setDraftTimestamp(null);
    localStorage.removeItem('tk_doc_draft');
  };

  if (!isOpen) return null;

  // File Handlers
  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (file.size > 15 * 1024 * 1024) {
      playSound('warning');
      showAlert('PDF exceeds 15MB limit. Please compress it before uploading.', 'File Too Large');
      e.target.value = '';
      return;
    }
    setImageFiles([]);
    setPdfFile(file);
    e.target.value = '';
  };

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setPdfFile(null);
    const validImages: File[] = [];
    for (let i = 0; i < e.target.files.length; i++) {
      const file = e.target.files[i];
      if (file.type.startsWith('image/')) {
        validImages.push(file);
      }
    }
    setImageFiles((prev) => [...prev, ...validImages]);
    e.target.value = '';
  };

  const removeImage = (idx: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result as string;
        resolve(res.includes(',') ? res.split(',')[1] : res);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!docType) {
      playSound('warning');
      showAlert('Please select the document work type.', 'Required Field');
      return;
    }
    if (!className) {
      playSound('warning');
      showAlert('Please select the class for this document job.', 'Required Field');
      return;
    }
    if (isDateRequired && !docDate) {
      playSound('warning');
      showAlert(`Please enter the Announcement Date for ${docType}.`, 'Required Field');
      return;
    }

    if (!pdfFile && imageFiles.length === 0) {
      playSound('warning');
      showAlert('Please upload the student data or exam roster (PDF or photos).', 'Missing File');
      return;
    }

    setUploading(true);
    showUploadProgress('PREPARING PIPELINE...');

    try {
      updateUploadProgress(25, 'Reading file buffer...', 'PREPARING PIPELINE...');
      let fileBase64 = '';
      let fileName = '';
      let mimeType = 'application/pdf';

      if (pdfFile) {
        fileBase64 = await fileToBase64(pdfFile);
        fileName = pdfFile.name;
        mimeType = pdfFile.type || 'application/pdf';
      } else if (imageFiles.length > 0) {
        fileBase64 = await fileToBase64(imageFiles[0]);
        fileName = `Roster_${docType}_${className}_${Date.now()}.jpg`;
        mimeType = imageFiles[0].type || 'image/jpeg';
      }

      updateUploadProgress(65, '1.20 MB/s | 0:03 left', 'UPLOADING TO PIPELINE...');

      const payload = {
        jobType: docType,
        userId: user?.id || '',
        instId: user?.instId || user?.code || '',
        className,
        testType: examName,
        numStudents: parseInt(numStudents, 10) || 1,
        session: sessionStr,
        announcementDate: docDate,
        deadline: docDate || new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
        fileBase64,
        fileName,
        mimeType,
        imageCount: imageFiles.length,
      };

      updateUploadProgress(92, 'Securing link...', 'ENCRYPTING & FINALIZING...');

      const res = await serverCall('submitDocumentJob', payload);

      if (res && res.success) {
        clearDocForm();
        showUploadSuccess(res.jobId || 'DOC-' + Date.now().toString().slice(-6));
      } else {
        showUploadError(res?.message || 'Failed to submit document job.', () => handleSubmit(e));
      }
    } catch (err: any) {
      showUploadError(err.message || 'Error uploading file and submitting document.', () => handleSubmit(e));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="glass-overlay active" onClick={closeModal} style={{ zIndex: 99999 }}>
      <div
        className="glass-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '800px',
          width: '95%',
          padding: '40px',
          textAlign: 'left',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        {/* Sticky Header */}
        <div className="premium-sticky-header">
          <h2 style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <path d="M12 11h4" />
              <path d="M12 16h4" />
              <path d="M8 11h.01" />
              <path d="M8 16h.01" />
            </svg>
            Submit Document Job
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {draftTimestamp && (
              <span id="docDraftUI" style={{ fontSize: '10px', color: 'var(--accent)', fontWeight: 700 }}>
                Drafted at {draftTimestamp}
              </span>
            )}
            {draftTimestamp && (
              <button
                type="button"
                id="docFreshBtn"
                className="liquid-glass btn-xs btn-success"
                onClick={clearDocForm}
              >
                Start Fresh
              </button>
            )}
            <button
              type="button"
              className="close-minimal"
              onClick={closeModal}
              style={{ position: 'relative', top: 0, right: 0 }}
            >
              ✖
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form id="nativeDocForm" onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
          <div className="grid-2" style={{ marginBottom: '15px' }}>
            <div className="form-group">
              <label className="label-text">
                Work Type <span className="req">*</span>
              </label>
              <select
                id="docType"
                className="form-input"
                required
                value={docType}
                onChange={(e) => {
                  setDocType(e.target.value);
                  triggerSaveDraft({ type: e.target.value });
                }}
              >
                {DOC_TYPES.map((dt) => (
                  <option key={dt} value={dt}>
                    {dt}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="label-text">
                Announcement Date {isDateRequired && <span className="req">*</span>}
              </label>
              <input
                type="date"
                id="docDate"
                className="form-input"
                required={isDateRequired}
                value={docDate}
                onChange={(e) => {
                  setDocDate(e.target.value);
                  triggerSaveDraft({ docDate: e.target.value });
                }}
              />
            </div>
          </div>

          <div className="grid-2" style={{ marginBottom: '15px' }}>
            <div className="form-group">
              <label className="label-text">
                Class Name <span className="req">*</span>
              </label>
              <select
                id="docClass"
                className="form-input"
                required
                value={className}
                onChange={(e) => {
                  setClassName(e.target.value);
                  triggerSaveDraft({ className: e.target.value });
                }}
              >
                <option value="" disabled>
                  Select Class...
                </option>
                {CLASSES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="label-text">
                Exam Name <span className="req">*</span>
              </label>
              <select
                id="docExamName"
                className="form-input"
                required
                value={examName}
                onChange={(e) => {
                  setExamName(e.target.value);
                  triggerSaveDraft({ examName: e.target.value });
                }}
              >
                {EXAM_NAMES.map((en) => (
                  <option key={en} value={en}>
                    {en}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid-2" style={{ marginBottom: '15px' }}>
            <div className="form-group">
              <label className="label-text">
                Session <span className="req">*</span>
              </label>
              <input type="text" id="docSession" className="form-input" value={sessionStr} readOnly />
            </div>

            <div className="form-group">
              <label className="label-text">
                Number of Students <span className="req">*</span>
              </label>
              <input
                type="number"
                id="docNumStudents"
                className="form-input"
                required
                placeholder="e.g. 45"
                value={numStudents}
                onChange={(e) => {
                  setNumStudents(e.target.value);
                  triggerSaveDraft({ numStudents: e.target.value });
                }}
              />
            </div>
          </div>

          {/* Upload Student Data Section */}
          <div className="form-group" style={{ marginBottom: '25px' }}>
            <label className="label-text">
              Upload Student Data <span className="req">*</span>
            </label>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>
              For admit card: Upload schedule including subjects.{' '}
              <span style={{ color: 'var(--brand)', cursor: 'pointer' }}>[Template]</span>
              <br />
              For Report Card: Upload data sheet of student marks with admission number.{' '}
              <span style={{ color: 'var(--brand)', cursor: 'pointer' }}>[Template]</span>
            </p>

            <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
              <OpticalButton
                type="button"
                variant="outline"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                onClick={() => pdfInputRef.current?.click()}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  style={{ verticalAlign: 'text-bottom' }}
                >
                  <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
                  <path d="M14 2v5a1 1 0 0 0 1 1h5" />
                  <path d="M12 12v6" />
                  <path d="m15 15-3-3-3 3" />
                </svg>
                PDF
              </OpticalButton>

              <OpticalButton
                type="button"
                variant="primary"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                onClick={() => imageInputRef.current?.click()}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ verticalAlign: 'text-bottom' }}
                >
                  <path d="M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
                Camera
              </OpticalButton>
            </div>

            <input
              type="file"
              ref={pdfInputRef}
              accept="application/pdf"
              style={{ display: 'none' }}
              onChange={handlePdfChange}
            />
            <input
              type="file"
              ref={imageInputRef}
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleImagesChange}
            />

            {/* Doc Upload Preview Zone */}
            <div
              id="docUploadPreviewZone"
              style={{
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap',
                background: 'rgba(0,0,0,0.2)',
                padding: '12px',
                borderRadius: '8px',
                minHeight: '50px',
                border: '1px solid var(--border)',
              }}
            >
              {!pdfFile && imageFiles.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: 'auto', padding: '10px' }}>
                  No files selected.
                </p>
              )}

              {pdfFile && (
                <div
                  style={{
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid var(--border)',
                    color: 'white',
                    padding: '12px',
                    borderRadius: '10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    width: '100%',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        background: 'var(--danger)',
                        color: 'white',
                        fontSize: '10px',
                        fontWeight: 900,
                        padding: '6px',
                        borderRadius: '6px',
                      }}
                    >
                      PDF
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
                      <span style={{ fontSize: '12px', fontWeight: 800 }}>{pdfFile.name}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {(pdfFile.size / 1048576).toFixed(2)} MB
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="liquid-glass btn-sm btn-outline"
                      onClick={() => {
                        const url = URL.createObjectURL(pdfFile);
                        window.open(url, '_blank');
                      }}
                      style={{ padding: '6px 14px', fontSize: '10px', fontWeight: 800 }}
                    >
                      VIEW
                    </button>
                    <button
                      type="button"
                      className="liquid-glass btn-sm btn-danger"
                      onClick={() => setPdfFile(null)}
                      style={{ padding: '6px 14px', fontSize: '10px', fontWeight: 800 }}
                    >
                      REMOVE
                    </button>
                  </div>
                </div>
              )}

              {imageFiles.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', width: '100%' }}>
                    {imageFiles.map((file, idx) => {
                      const url = URL.createObjectURL(file);
                      return (
                        <div
                          key={idx}
                          style={{
                            position: 'relative',
                            width: '70px',
                            height: '70px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            border: '1px solid rgba(255,255,255,0.1)',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                          }}
                        >
                          <img
                            src={url}
                            alt={`Preview ${idx}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                            onClick={() => window.open(url, '_blank')}
                          />
                          <button
                            type="button"
                            className="liquid-glass glass-circle-btn"
                            onClick={() => removeImage(idx)}
                            style={{
                              position: 'absolute',
                              top: '4px',
                              right: '4px',
                              width: '22px',
                              height: '22px',
                              minWidth: '22px',
                              minHeight: '22px',
                              background: 'rgba(239,68,68,0.85)',
                              color: '#fff',
                              border: '1px solid rgba(255,255,255,0.4)',
                              fontSize: '10px',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          >
                            ✖
                          </button>
                          {idx === 0 && (
                            <div
                              style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                background: 'var(--brand)',
                                color: '#05080F',
                                fontSize: '9px',
                                textAlign: 'center',
                                fontWeight: 800,
                                padding: '2px 0',
                              }}
                            >
                              COVER
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--brand)', fontWeight: 700 }}>
                    {imageFiles.length} photo(s) selected. Merging into PDF pipeline upon submission.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons (Floating Sticky Dock) */}
          <div className="modal-action-dock">
            <OpticalButton
              type="button"
              variant="danger"
              onClick={clearDocForm}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 21H8a2 2 0 0 1-1.42-.587l-3.994-3.999a2 2 0 0 1 0-2.828l10-10a2 2 0 0 1 2.829 0l5.999 6a2 2 0 0 1 0 2.828L12.834 21" />
                <path d="m5.082 11.09 8.828 8.828" />
              </svg>
              Clear
            </OpticalButton>

            <OpticalButton
              type="submit"
              id="submitDocBtn"
              variant="warning"
              disabled={uploading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                minWidth: '110px',
                justifyContent: 'center',
              }}
            >
              {uploading ? (
                <IOSSpinner size={18} color="#fff" />
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11.35 22H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.706.706l3.588 3.588A2.4 2.4 0 0 1 20 8v5.35" />
                    <path d="M14 2v5a1 1 0 0 0 1 1h5" />
                    <path d="M14 19h6" />
                    <path d="M17 16v6" />
                  </svg>
                  <span>Save</span>
                </>
              )}
            </OpticalButton>
          </div>
        </form>
      </div>
    </div>
  );
}

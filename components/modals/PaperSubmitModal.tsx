// components/modals/PaperSubmitModal.tsx
'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import { serverCall } from '@/lib/api-client';
import IOSSpinner from '@/components/ui/IOSSpinner';
import { OpticalButton } from '@/components/ui/OpticalGlass';
import { playSound } from '@/lib/sound';

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

const TEST_TYPES = [
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

const DEFAULT_SUBJECTS = [
  'Mathematics',
  'Science',
  'English',
  'Hindi',
  'Social Science',
  'Physics',
  'Chemistry',
  'Biology',
  'Computer Science',
  'Urdu',
  'Sanskrit',
  'General Knowledge',
  'Environmental Studies',
];

export default function PaperSubmitModal() {
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
  const isOpen = activeModal === 'paperSubmit';

  const pdfInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Form fields
  const [subject, setSubject] = useState('');
  const [className, setClassName] = useState('');
  const [testNumber, setTestNumber] = useState('Test 01');
  const [testType, setTestType] = useState('Objective (MCQ)');
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
  const [duration, setDuration] = useState('1.5 Hours');
  const [numQuestionsSelect, setNumQuestionsSelect] = useState('20');
  const [numQuestionsOther, setNumQuestionsOther] = useState('');
  const [fullMarks, setFullMarks] = useState('50');
  const [passMarks, setPassMarks] = useState('17');

  // File state (single PDF or multiple photos)
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  // Draft state
  const [draftTimestamp, setDraftTimestamp] = useState<string | null>(null);

  // Available subjects for current user
  const subjectsList = useMemo(() => {
    let list: string[] = [];
    if (user?.subjects) {
      if (Array.isArray(user.subjects)) list = user.subjects;
      else if (typeof user.subjects === 'string') {
        list = user.subjects.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    }
    const combined = Array.from(new Set([...list, ...DEFAULT_SUBJECTS]));
    return combined;
  }, [user]);

  // Load draft on modal open
  useEffect(() => {
    if (isOpen) {
      const draftStr = localStorage.getItem('tk_paper_draft');
      if (draftStr) {
        try {
          const draft = JSON.parse(draftStr);
          if (draft.subject) setSubject(draft.subject);
          if (draft.className) setClassName(draft.className);
          if (draft.testNumber) setTestNumber(draft.testNumber);
          if (draft.testType) setTestType(draft.testType);
          if (draft.testDate) setTestDate(draft.testDate);
          if (draft.duration) setDuration(draft.duration);
          if (draft.numQuestionsSelect) setNumQuestionsSelect(draft.numQuestionsSelect);
          if (draft.numQuestionsOther) setNumQuestionsOther(draft.numQuestionsOther);
          if (draft.fullMarks) setFullMarks(draft.fullMarks);
          if (draft.passMarks) setPassMarks(draft.passMarks);
          if (draft.timestamp) setDraftTimestamp(draft.timestamp);
        } catch (e) {}
      } else {
        setDraftTimestamp(null);
        if (!subject && subjectsList.length > 0) {
          setSubject(subjectsList[0]);
        }
      }
    }
  }, [isOpen, subjectsList]);

  // Save draft helper
  const triggerSaveDraft = (overrides = {}) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const draft = {
      subject,
      className,
      testNumber,
      testType,
      testDate,
      duration,
      numQuestionsSelect,
      numQuestionsOther,
      fullMarks,
      passMarks,
      timestamp,
      ...overrides,
    };
    try {
      localStorage.setItem('tk_paper_draft', JSON.stringify(draft));
      setDraftTimestamp(timestamp);
    } catch (e) {}
  };

  const clearPaperForm = () => {
    setSubject(subjectsList[0] || '');
    setClassName('');
    setTestNumber('Test 01');
    setTestType('Objective (MCQ)');
    setTestDate(new Date().toISOString().split('T')[0]);
    setDuration('1.5 Hours');
    setNumQuestionsSelect('20');
    setNumQuestionsOther('');
    setFullMarks('50');
    setPassMarks('17');
    setPdfFile(null);
    setImageFiles([]);
    setDraftTimestamp(null);
    localStorage.removeItem('tk_paper_draft');
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

  // Convert File to base64
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

    if (!subject) {
      playSound('warning');
      showAlert('Please select or specify a subject.', 'Required Field');
      return;
    }
    if (!className) {
      playSound('warning');
      showAlert('Please select a class for the question paper.', 'Required Field');
      return;
    }

    if (!pdfFile && imageFiles.length === 0) {
      playSound('warning');
      showAlert('Please attach the question paper file (either a PDF or camera photos).', 'Missing File');
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
        fileName = `Paper_${className}_${subject}_${Date.now()}.jpg`;
        mimeType = imageFiles[0].type || 'image/jpeg';
      }

      updateUploadProgress(65, '1.45 MB/s | 0:02 left', 'UPLOADING TO PIPELINE...');

      const finalQuestions = numQuestionsSelect === 'Other' ? numQuestionsOther : numQuestionsSelect;

      const payload = {
        jobType: 'Paper',
        userId: user?.id || '',
        instCode: user?.instId || user?.code || '',
        className,
        subject,
        testType,
        testNo: testNumber,
        numQuestions: finalQuestions,
        fullMarks,
        passMarks,
        duration,
        testDate,
        teacherName: user?.name || '',
        fileBase64,
        fileName,
        mimeType,
        imageCount: imageFiles.length,
      };

      updateUploadProgress(92, 'Securing link...', 'ENCRYPTING & FINALIZING...');

      const res = await serverCall('submitPaperJob', payload);

      if (res && res.success) {
        clearPaperForm();
        showUploadSuccess(res.jobId || 'PPR-' + Date.now().toString().slice(-6));
      } else {
        showUploadError(res?.message || 'Failed to submit paper job.', () => handleSubmit(e));
      }
    } catch (err: any) {
      showUploadError(err.message || 'Error uploading file and submitting paper.', () => handleSubmit(e));
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
          <h2 style={{ color: 'var(--brand)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            Submit Question Paper
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {draftTimestamp && (
              <span id="paperDraftUI" style={{ fontSize: '10px', color: 'var(--accent)', fontWeight: 700 }}>
                Drafted at {draftTimestamp}
              </span>
            )}
            {draftTimestamp && (
              <button
                type="button"
                id="paperFreshBtn"
                className="liquid-glass btn-xs btn-success"
                onClick={clearPaperForm}
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
        <form id="nativePaperForm" onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
          <div className="grid-2" style={{ marginBottom: '15px' }}>
            <div className="form-group">
              <label className="label-text">
                Subject <span className="req">*</span>
              </label>
              <select
                id="formSubject"
                className="form-input"
                required
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  triggerSaveDraft({ subject: e.target.value });
                }}
              >
                <option value="" disabled>
                  Select Subject...
                </option>
                {subjectsList.map((subj) => (
                  <option key={subj} value={subj}>
                    {subj}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="label-text">
                Class <span className="req">*</span>
              </label>
              <select
                id="formClass"
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
          </div>

          <div className="grid-2" style={{ marginBottom: '15px' }}>
            <div className="form-group">
              <label className="label-text">
                Test Number <span className="req">*</span>
              </label>
              <input
                type="text"
                id="formTestNumber"
                className="form-input"
                required
                placeholder="e.g. Test 01"
                value={testNumber}
                onChange={(e) => {
                  setTestNumber(e.target.value);
                  triggerSaveDraft({ testNumber: e.target.value });
                }}
              />
            </div>

            <div className="form-group">
              <label className="label-text">
                Test Type <span className="req">*</span>
              </label>
              <select
                id="formTestType"
                className="form-input"
                required
                value={testType}
                onChange={(e) => {
                  setTestType(e.target.value);
                  triggerSaveDraft({ testType: e.target.value });
                }}
              >
                {TEST_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid-2" style={{ marginBottom: '15px' }}>
            <div className="form-group">
              <label className="label-text">
                Test Date <span className="req">*</span>
              </label>
              <input
                type="date"
                id="formTestDate"
                className="form-input"
                required
                value={testDate}
                onChange={(e) => {
                  setTestDate(e.target.value);
                  triggerSaveDraft({ testDate: e.target.value });
                }}
              />
            </div>

            <div className="form-group">
              <label className="label-text">
                Duration <span className="req">*</span>
              </label>
              <input
                type="text"
                id="formDuration"
                className="form-input"
                required
                placeholder="e.g. 1.5 Hours"
                value={duration}
                onChange={(e) => {
                  setDuration(e.target.value);
                  triggerSaveDraft({ duration: e.target.value });
                }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '15px' }}>
            <label className="label-text">
              How many questions <span className="req">*</span>
            </label>
            <select
              id="formNumQuestionsSelect"
              className="form-input"
              required
              value={numQuestionsSelect}
              onChange={(e) => {
                setNumQuestionsSelect(e.target.value);
                triggerSaveDraft({ numQuestionsSelect: e.target.value });
              }}
            >
              <option value="" disabled>
                Select quantity...
              </option>
              <option value="10">10</option>
              <option value="15">15</option>
              <option value="20">20</option>
              <option value="25">25</option>
              <option value="30">30</option>
              <option value="Other">Other:</option>
            </select>
            {numQuestionsSelect === 'Other' && (
              <input
                type="number"
                id="formNumQuestionsOther"
                className="form-input"
                placeholder="Enter custom number of questions"
                style={{ marginTop: '8px' }}
                required
                value={numQuestionsOther}
                onChange={(e) => {
                  setNumQuestionsOther(e.target.value);
                  triggerSaveDraft({ numQuestionsOther: e.target.value });
                }}
              />
            )}
          </div>

          <div className="grid-2" style={{ marginBottom: '15px' }}>
            <div className="form-group">
              <label className="label-text">
                Full Marks <span className="req">*</span>
              </label>
              <input
                type="number"
                id="formFullMarks"
                className="form-input"
                required
                placeholder="e.g. 100"
                value={fullMarks}
                onChange={(e) => {
                  setFullMarks(e.target.value);
                  triggerSaveDraft({ fullMarks: e.target.value });
                }}
              />
            </div>

            <div className="form-group">
              <label className="label-text">
                Pass Marks <span className="req">*</span>
              </label>
              <input
                type="number"
                id="formPassMarks"
                className="form-input"
                required
                placeholder="e.g. 33"
                value={passMarks}
                onChange={(e) => {
                  setPassMarks(e.target.value);
                  triggerSaveDraft({ passMarks: e.target.value });
                }}
              />
            </div>
          </div>

          {/* Upload Question Paper Zone */}
          <div className="form-group" style={{ marginBottom: '25px' }}>
            <label className="label-text">
              Upload Question Paper <span className="req">*</span>
            </label>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 600 }}>
              You can upload a single PDF or snap multiple photos.
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

            {/* Upload Preview Zone */}
            <div
              id="uploadPreviewZone"
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

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
            <OpticalButton
              type="button"
              variant="danger"
              onClick={clearPaperForm}
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
              id="submitFormBtn"
              variant="primary"
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
                <IOSSpinner size={18} color="#05080F" />
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

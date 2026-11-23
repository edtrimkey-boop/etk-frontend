'use client';

import React, { useState } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import { serverCall } from '@/lib/api-client';
import { OpticalButton } from '@/components/ui/OpticalGlass';
import IOSSpinner from '@/components/ui/IOSSpinner';

const SUBJECT_OPTIONS = [
  'Hindi', 'English', 'Mathematics', 'Science',
  'Social Science', 'Computer', 'Writing', 'Drawing',
  'Physics', 'Chemistry', 'Biology', 'Sanskrit'
];

export default function TeacherRegModal() {
  const { activeModal, closeModal, user, showAlert, refreshData } = useDashboard();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [assignedClass, setAssignedClass] = useState('Class 1');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(['Mathematics']);
  const [loading, setLoading] = useState(false);

  if (activeModal !== 'teacherReg') return null;

  const toggleSubject = (subj: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subj) ? prev.filter((s) => s !== subj) : [...prev, subj]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) {
      showAlert('Please enter teacher name and valid email address.', 'Validation Error');
      return;
    }

    setLoading(true);

    try {
      const subjectStr = Array.isArray(selectedSubjects)
        ? selectedSubjects.join(', ')
        : String(selectedSubjects || '');

      const payload = {
        instId: user?.instId || user?.code || '',
        institute_id: user?.instId || '',
        name,
        email,
        phone,
        assignedClass,
        subjects: subjectStr,
        subject_handles: selectedSubjects,
      };

      const res = await serverCall('submitTeacherRegistration', payload);

      if (res.success) {
        closeModal();
        setEmail('');
        setName('');
        setPhone('');
        showAlert(`Teacher ${name} registered successfully! Credentials have been sent to ${email}.`, 'Success');
        refreshData(true);
      } else {
        showAlert(res.message || 'Failed to register teacher.', 'Registration Error');
      }
    } catch (err: any) {
      showAlert(err.message || 'Error submitting teacher registration.', 'Network Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="glass-overlay active"
      onClick={closeModal}
      style={{ zIndex: 99999 }}
    >
      <div
        className="glass-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '800px',
          width: '90%',
          padding: '40px',
          textAlign: 'left',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        <div className="premium-sticky-header">
          <h2 style={{ color: 'var(--brand)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M2 21a8 8 0 0 1 13.292-6" />
              <circle cx="10" cy="8" r="5" />
              <path d="M19 16v6" />
              <path d="M22 19h-6" />
            </svg>
            Register Teacher
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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

        <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
          <div className="grid-2" style={{ marginBottom: '15px' }}>
            <div className="form-group">
              <label className="label-text">Institute Name</label>
              <input
                type="text"
                className="form-input"
                value={user?.institute || 'Ed-Trim Key Command'}
                readOnly
                style={{ opacity: 0.7 }}
              />
            </div>
            <div className="form-group">
              <label className="label-text">Institute Code</label>
              <input
                type="text"
                className="form-input"
                value={user?.code || 'KPS'}
                readOnly
                style={{ opacity: 0.7 }}
              />
            </div>
          </div>

          <div className="grid-2" style={{ marginBottom: '15px' }}>
            <div className="form-group">
              <label className="label-text">Email Address (Login ID) <span className="req">*</span></label>
              <input
                type="email"
                className="form-input"
                placeholder="teacher@school.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="label-text">Teacher Name <span className="req">*</span></label>
              <input
                type="text"
                className="form-input"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid-2" style={{ marginBottom: '15px' }}>
            <div className="form-group">
              <label className="label-text">Contact No. <span className="req">*</span></label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="label-text">Assigned Class <span className="req">*</span></label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Class 5"
                value={assignedClass}
                onChange={(e) => setAssignedClass(e.target.value)}
                required
              />
            </div>
          </div>

          <div
            className="form-group"
            style={{
              marginBottom: '20px',
              background: 'rgba(0,0,0,0.2)',
              padding: '15px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
            }}
          >
            <label className="label-text" style={{ color: 'var(--brand)', marginBottom: '10px', display: 'block' }}>
              Subject Handles <span className="req">*</span>
            </label>
            <div className="checkbox-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
              {SUBJECT_OPTIONS.map((sub) => {
                const checked = selectedSubjects.includes(sub);
                return (
                  <label
                    key={sub}
                    className="cb-pill"
                    style={{
                      cursor: 'pointer',
                      background: checked ? 'rgba(0,251,166,0.15)' : 'rgba(255,255,255,0.05)',
                      border: checked ? '1px solid var(--brand)' : '1px solid var(--border)',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSubject(sub)}
                    />
                    {sub}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="modal-action-dock" style={{ justifyContent: 'center' }}>
            <OpticalButton
              type="submit"
              disabled={loading}
              variant="primary"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '44px',
              }}
            >
              {loading ? <IOSSpinner size={18} color="#05080F" /> : 'Add Teacher to Directory'}
            </OpticalButton>
          </div>
        </form>
      </div>
    </div>
  );
}

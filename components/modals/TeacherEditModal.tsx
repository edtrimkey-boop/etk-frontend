'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import { serverCall } from '@/lib/api-client';
import { OpticalButton } from '@/components/ui/OpticalGlass';
import IOSSpinner from '@/components/ui/IOSSpinner';

const SUBJECT_OPTIONS = [
  'Hindi', 'English', 'Mathematics', 'Science',
  'Social Science', 'Computer', 'Writing', 'Drawing',
  'Physics', 'Chemistry', 'Biology', 'Sanskrit'
];

export default function TeacherEditModal() {
  const { activeModal, modalData, closeModal, showAlert, refreshData } = useDashboard();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [assignedClass, setAssignedClass] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (modalData) {
      setName(modalData.full_name || modalData.name || '');
      setPhone(modalData.phone_number || modalData.phone || '');
      const prof = modalData.teacher_profiles?.[0] || modalData.teacher_profiles || {};
      setAssignedClass(prof.assigned_class || modalData.assigned_class || modalData.assignedClass || '');

      let subs: string[] = [];
      const rawSubjects = prof.subject_handles || modalData.subject_handles || modalData.subjects || prof.subjects;
      if (Array.isArray(rawSubjects)) {
        subs = rawSubjects.map((s: any) => String(s).trim()).filter(Boolean);
      } else if (typeof rawSubjects === 'string') {
        subs = rawSubjects.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
      setSelectedSubjects(subs);
    }
  }, [modalData]);

  if (activeModal !== 'teacherEdit') return null;

  const toggleSubject = (sub: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 🛡️ CRITICAL FIX: Convert subjects array to comma-separated string
      // The backend updateTeacherDetails handler calls payload.subjects.split(','),
      // so subjects MUST be a string!
      const subjectStr = Array.isArray(selectedSubjects)
        ? selectedSubjects.join(', ')
        : String(selectedSubjects || '');

      const teacherIdentifier = modalData?.id || modalData?.userId || modalData?.teacherId;

      const payload = {
        userId: teacherIdentifier,
        teacherId: teacherIdentifier,
        name,
        phone,
        status: modalData?.status || 'Active',
        assignedClass,
        subjects: subjectStr,
        subject_handles: selectedSubjects,
      };

      const res = await serverCall('updateTeacherDetails', payload);

      if (res && res.success !== false) {
        closeModal();
        showAlert('Teacher details updated successfully!', 'Success');
        refreshData(true);
      } else {
        showAlert(res?.message || 'Failed to update teacher.', 'Error');
      }
    } catch (err: any) {
      showAlert(err.message || 'Error updating teacher.', 'Network Error');
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
          maxWidth: '650px',
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
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            Edit Teacher Profile
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
              <label className="label-text">Teacher Name</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="label-text">Contact No.</label>
              <input
                type="text"
                className="form-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '15px' }}>
            <label className="label-text">Assigned Class</label>
            <input
              type="text"
              className="form-input"
              value={assignedClass}
              onChange={(e) => setAssignedClass(e.target.value)}
              placeholder="e.g. Class 10"
            />
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
              Subject Handles
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

          <OpticalButton
            type="submit"
            disabled={loading}
            variant="primary"
            style={{
              width: '100%',
              marginTop: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '44px',
            }}
          >
            {loading ? <IOSSpinner size={18} color="#05080F" /> : 'Update Teacher'}
          </OpticalButton>
        </form>
      </div>
    </div>
  );
}

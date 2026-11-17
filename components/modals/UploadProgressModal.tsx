// components/modals/UploadProgressModal.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import { OpticalButton } from '@/components/ui/OpticalGlass';

export default function UploadProgressModal() {
  const { uploadProgress, closeUploadProgress, closeModal, refreshData } = useDashboard();
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isSuccess = uploadProgress.state === 'success';
  const isError = uploadProgress.state === 'error';
  const isUploading = uploadProgress.state === 'uploading';

  // 5-second auto-close on success
  useEffect(() => {
    if (isSuccess && uploadProgress.open) {
      autoCloseTimerRef.current = setTimeout(() => {
        handleAcknowledge();
      }, 5000);
    }
    return () => {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
    };
  }, [isSuccess, uploadProgress.open]);

  if (!uploadProgress.open) return null;

  const handleCancel = () => {
    if (uploadProgress.onCancel) uploadProgress.onCancel();
    closeUploadProgress();
  };

  const handleAcknowledge = () => {
    if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    closeUploadProgress();
    closeModal(); // Closes paperSubmit or docSubmit modal
    refreshData(true);
  };

  const percent = uploadProgress.percent;
  const strokeOffset = 164 - (164 * (percent / 100));

  return (
    <div
      id="uploadProgressModal"
      className="glass-overlay active"
      style={{
        zIndex: 100001,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 8, 15, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      <div
        className="glass-box"
        style={{
          textAlign: 'center',
          maxWidth: '420px',
          width: '90%',
          padding: '40px',
          position: 'relative',
        }}
      >
        {/* Cancel Button */}
        {!isSuccess && (
          <button
            type="button"
            className="close-minimal"
            onClick={handleCancel}
            style={{ zIndex: 10, position: 'absolute', top: '15px', right: '15px' }}
          >
            ✖
          </button>
        )}

        {/* Uploading or Error State */}
        {!isSuccess && (
          <div id="uploadingState">
            <svg className="premium-cloud-icon" viewBox="0 0 60 60">
              <circle className="pc-ring-bg" cx="30" cy="30" r="26" />
              <circle
                id="cloudProgressRing"
                className="pc-track"
                cx="30"
                cy="30"
                r="26"
                style={{
                  strokeDashoffset: strokeOffset,
                  stroke: isError ? 'var(--danger)' : 'var(--brand)',
                }}
              />
              <path
                className="pc-cloud"
                d="M21,37 c-4.4,0 -8,-3.6 -8,-8 c0,-3.8 2.7,-7.1 6.3,-7.8 c1.5,-4.7 5.9,-8.2 11.2,-8.2 c5.3,0 9.7,3.5 11.2,8.2 c3.6,0.7 6.3,4 6.3,7.8 c0,4.4 -3.6,8 -8,8 l-19,0 z"
              />
              <path className="pc-arrow" d="M30 39 v-14 m-5 5 l5 -5 l5 5" />
            </svg>

            <h3
              id="upProgText"
              style={{
                color: isError ? 'var(--danger)' : 'var(--brand)',
                letterSpacing: '1.5px',
                fontSize: '13px',
                marginBottom: '20px',
                fontWeight: 800,
                textTransform: 'uppercase',
              }}
            >
              {uploadProgress.text}
            </h3>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '10px',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              <span id="upProgPercent" style={{ color: 'white', fontFamily: 'monospace', fontSize: '13px' }}>
                {percent}%
              </span>
              <span id="upProgStats" style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                {uploadProgress.stats}
              </span>
            </div>

            <div
              style={{
                width: '100%',
                height: '6px',
                background: 'rgba(0,0,0,0.5)',
                borderRadius: '3px',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div
                id="upProgFill"
                style={{
                  width: `${percent}%`,
                  height: '100%',
                  background: isError
                    ? 'var(--danger)'
                    : percent >= 100
                    ? 'var(--success)'
                    : 'var(--brand)',
                  transition: 'width 0.25s linear, background 0.3s ease',
                }}
              />
            </div>

            {isError && uploadProgress.onRetry && (
              <div id="upRetryZone" style={{ marginTop: '25px' }}>
                <OpticalButton
                  type="button"
                  id="upRetryBtn"
                  variant="danger"
                  style={{ width: '100%' }}
                  onClick={uploadProgress.onRetry}
                >
                  ↻ Retry Upload
                </OpticalButton>
              </div>
            )}
          </div>
        )}

        {/* Success State */}
        {isSuccess && (
          <div
            id="uploadSuccessState"
            style={{
              animation: 'fadeIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
            }}
          >
            <div style={{ marginBottom: '20px' }}>
              <svg
                className="anim-icon"
                stroke="var(--success)"
                viewBox="0 0 52 52"
                style={{
                  margin: '0 auto',
                  filter: 'drop-shadow(0 0 12px rgba(46, 204, 113, 0.5))',
                }}
              >
                <circle className="anim-circle" cx="26" cy="26" r="25" />
                <path className="anim-check" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
              </svg>
            </div>

            <h3 style={{ color: 'var(--success)', marginBottom: '25px', fontWeight: 800, letterSpacing: '1.5px' }}>
              SECURELY TRANSMITTED
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
              <div
                style={{
                  background: 'rgba(38, 195, 234, 0.05)',
                  border: '1px solid var(--brand)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                  borderRadius: '12px',
                  padding: '12px 20px',
                  fontSize: '12px',
                  color: 'white',
                  display: 'flex',
                  gap: '10px',
                  width: '100%',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ color: 'var(--brand)', fontWeight: 700 }}>Job ID:</span>
                <span id="succJobId" style={{ fontFamily: 'monospace', fontWeight: 900, letterSpacing: '1px' }}>
                  {uploadProgress.jobId || 'Auto'}
                </span>
              </div>

              <div
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '12px 20px',
                  fontSize: '12px',
                  color: 'white',
                  display: 'flex',
                  gap: '10px',
                  width: '100%',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Timestamp:</span>
                <span id="succTime" style={{ fontWeight: 800 }}>
                  {uploadProgress.timestamp}
                </span>
              </div>

              <OpticalButton
                type="button"
                variant="primary"
                onClick={handleAcknowledge}
                style={{ width: '100%', marginTop: '15px', padding: '14px' }}
              >
                Acknowledge &amp; Close
              </OpticalButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

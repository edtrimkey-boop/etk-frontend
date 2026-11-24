// components/modals/UploadProgressModal.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import { OpticalButton } from '@/components/ui/OpticalGlass';

export default function UploadProgressModal() {
  const { uploadProgress, closeUploadProgress, closeModal, refreshData } = useDashboard();
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(5);

  const isSuccess = uploadProgress.state === 'success';
  const isError = uploadProgress.state === 'error';

  // 5-second auto-close countdown on success
  useEffect(() => {
    if (isSuccess && uploadProgress.open) {
      setSecondsLeft(5);
      const interval = setInterval(() => {
        setSecondsLeft((prev) => (prev > 1 ? prev - 1 : 1));
      }, 1000);

      autoCloseTimerRef.current = setTimeout(() => {
        handleAcknowledge();
      }, 5000);

      return () => {
        clearInterval(interval);
        if (autoCloseTimerRef.current) {
          clearTimeout(autoCloseTimerRef.current);
        }
      };
    }
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
      className="glass-overlay active hud-overlay"
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
      <div className="glass-box progress-hud-card">
        {/* Cancel Button (During Uploading or Error) */}
        {!isSuccess && (
          <button
            type="button"
            className="hud-close-btn"
            onClick={handleCancel}
            aria-label="Cancel"
            title="Cancel"
          >
            <svg
              width="12"
              height="12"
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
        )}

        {/* Uploading or Error State */}
        {!isSuccess && (
          <div
            id="uploadingState"
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div className="hud-icon-wrap">
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
            </div>

            <h3
              id="upProgText"
              className="hud-title"
              style={{
                color: isError ? 'var(--danger)' : 'var(--brand)',
                marginBottom: '18px',
              }}
            >
              {uploadProgress.text}
            </h3>

            <div className="hud-progress-meta">
              <span id="upProgPercent" className="hud-progress-percent">
                {percent}%
              </span>
              <span id="upProgStats" className="hud-progress-stats">
                {uploadProgress.stats}
              </span>
            </div>

            <div className="hud-progress-track">
              <div
                id="upProgFill"
                className="hud-progress-fill"
                style={{
                  width: `${percent}%`,
                  background: isError
                    ? 'var(--danger)'
                    : percent >= 100
                    ? 'var(--success)'
                    : 'linear-gradient(90deg, #26c3ea 0%, #38bdf8 100%)',
                }}
              />
            </div>

            {isError && uploadProgress.onRetry && (
              <div id="upRetryZone" style={{ marginTop: '22px', width: '100%' }}>
                <OpticalButton
                  type="button"
                  id="upRetryBtn"
                  variant="danger"
                  style={{ width: '100%', minHeight: '44px', fontWeight: 800, borderRadius: '14px' }}
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
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              animation: 'fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
          >
            <div className="hud-icon-wrap hud-success-glow">
              <svg
                className="anim-icon"
                stroke="var(--success)"
                viewBox="0 0 52 52"
              >
                <circle className="anim-circle" cx="26" cy="26" r="25" />
                <path className="anim-check" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
              </svg>
            </div>

            <h3 className="hud-title hud-title-success">
              SECURELY TRANSMITTED
            </h3>

            <p className="hud-subtitle">
              Your file has been verified and securely submitted.
            </p>

            <div className="hud-receipt-card">
              <div className="hud-receipt-row">
                <span className="hud-receipt-label">Job ID</span>
                <span id="succJobId" className="hud-receipt-value hud-receipt-code">
                  {uploadProgress.jobId || 'Auto'}
                </span>
              </div>
              <div className="hud-receipt-divider" />
              <div className="hud-receipt-row">
                <span className="hud-receipt-label">Timestamp</span>
                <span id="succTime" className="hud-receipt-value">
                  {uploadProgress.timestamp}
                </span>
              </div>
            </div>

            <OpticalButton
              type="button"
              variant="primary"
              onClick={handleAcknowledge}
              style={{
                width: '100%',
                minHeight: '44px',
                fontWeight: 800,
                fontSize: '14px',
                borderRadius: '14px',
              }}
            >
              Acknowledge &amp; Close
            </OpticalButton>

            <div className="hud-autoclose-hint">
              Auto-closing in {secondsLeft}s
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

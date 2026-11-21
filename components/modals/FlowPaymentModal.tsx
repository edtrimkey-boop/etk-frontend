'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDashboard } from '@/lib/dashboard-context';

export interface FlowPaymentModalData {
  checkoutUrl: string;
  paymentNumber: string;
  amount: number | string;
  serviceType?: string;
  quantity?: number;
}

export default function FlowPaymentModal() {
  const { activeModal, modalData, closeModal, refreshData, showAlert } = useDashboard();
  const isOpen = activeModal === 'flowPayment';

  const data: FlowPaymentModalData = (isOpen && modalData) ? modalData : {
    checkoutUrl: '',
    paymentNumber: '',
    amount: 0,
    serviceType: 'Service Top-up',
    quantity: 1,
  };

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [iframeSrc, setIframeSrc] = useState<string>('about:blank');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize or reset iframe when modal opens
  useEffect(() => {
    if (isOpen && data.checkoutUrl) {
      setIsLoading(true);
      setIframeSrc(data.checkoutUrl);

      // Auto-reveal safety timeout: dissolves loader after 1.2s to guarantee smooth entry (matching index.html)
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = setTimeout(() => {
        setIsLoading(false);
      }, 1200);
    } else {
      setIframeSrc('about:blank');
      setIsLoading(true);
    }

    return () => {
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    };
  }, [isOpen, data.checkoutUrl]);

  // Listen to postMessage from Trim Key Flow or Payment Gateway
  useEffect(() => {
    if (!isOpen) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const msg = event.data;
        if (!msg) return;

        if (
          msg === 'FLOW_PAYMENT_SUCCESS' ||
          msg.type === 'FLOW_PAYMENT_SUCCESS' ||
          msg.status === 'SUCCESS' ||
          msg.action === 'PAYMENT_COMPLETE'
        ) {
          handleVerifyPayment();
        }
      } catch {
        // Ignore cross-origin non-serializable messages
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isOpen]);

  const handleIframeLoaded = useCallback(() => {
    if (iframeSrc && iframeSrc !== 'about:blank') {
      setIsLoading(false);
    }
  }, [iframeSrc]);

  const handleReload = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!data.checkoutUrl) return;
    setIsLoading(true);
    if (iframeRef.current) {
      iframeRef.current.src = data.checkoutUrl;
    }
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    loadTimeoutRef.current = setTimeout(() => {
      setIsLoading(false);
    }, 1200);
  };

  const handleEmergencyPopout = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (data.checkoutUrl && data.checkoutUrl !== 'about:blank') {
      window.open(data.checkoutUrl, '_blank');
    }
  };

  // Exactly matching verifyPayment() in index.html line 5660
  const handleVerifyPayment = () => {
    closeModal();
    const iframe = iframeRef.current;
    if (iframe) {
      setTimeout(() => {
        iframe.src = 'about:blank';
      }, 300);
    }
    showAlert('Payment submitted for verification. Checking status with Trim Key Flow...', 'Verifying Payment');
    setTimeout(() => {
      refreshData(true);
    }, 2000);
  };

  const handleClose = () => {
    handleVerifyPayment();
  };

  if (!isOpen) return null;

  const formattedAmount = Number(data.amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div
      id="paymentModal"
      className="glass-overlay active"
      onClick={handleClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        opacity: 1,
        transition: 'opacity 0.3s ease',
      }}
    >
      <div
        className="glass-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '490px',
          width: '94%',
          height: '720px',
          maxHeight: 'calc(100vh - 40px)',
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '22px',
          border: '1px solid rgba(0, 251, 166, 0.35)',
          boxShadow: '0 25px 65px rgba(0, 0, 0, 0.85), inset 0 1px 1px rgba(255, 255, 255, 0.2)',
          background: 'rgba(11, 17, 30, 0.96)',
          transform: 'scale(1)',
          transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          margin: 'auto',
        }}
      >
        {/* Trim Key Flow Top Header — Exactly matching index.html lines 2051-2093 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            background: 'var(--card, #0f172a)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'rgba(46, 204, 113, 0.15)',
                border: '1px solid rgba(0, 251, 166, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                flexShrink: 0,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00fba6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <div>
              <div style={{ color: '#ffffff', fontSize: '13px', fontWeight: 800, letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Trim Key <span style={{ color: '#00fba6' }}>Flow</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', fontWeight: 600 }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#00fba6', display: 'inline-block' }} /> 256-Bit SSL Encrypted Checkout
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Open Popout Tab */}
            <button
              type="button"
              className="sara-action-btn"
              onClick={handleEmergencyPopout}
              title="Open in Dedicated Tab"
              aria-label="Open in Dedicated Tab"
              style={{
                width: '36px',
                height: '36px',
                minWidth: '36px',
                minHeight: '36px',
                padding: 0,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </button>

            {/* Reload Iframe */}
            <button
              type="button"
              className="sara-action-btn sara-reload-btn"
              onClick={handleReload}
              title="Reload Checkout Session"
              aria-label="Reload Checkout Session"
              style={{
                width: '36px',
                height: '36px',
                minWidth: '36px',
                minHeight: '36px',
                padding: 0,
                borderRadius: '50%',
                background: 'rgba(38, 195, 234, 0.12)',
                border: '1px solid rgba(38, 195, 234, 0.4)',
                color: '#26C3EA',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
              </svg>
            </button>

            {/* Close Modal */}
            <button
              type="button"
              className="sara-action-btn sara-close-btn"
              onClick={handleClose}
              title="Close Checkout"
              aria-label="Close Checkout"
              style={{
                width: '36px',
                height: '36px',
                minWidth: '36px',
                minHeight: '36px',
                padding: 0,
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#EF4444',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body with Flow Iframe & Connection Loader — Exactly matching index.html lines 2095-2110 */}
        <div style={{ position: 'relative', flex: 1, width: '100%', height: '100%', background: '#060B12', display: 'flex', flexDirection: 'column' }}>
          {isLoading && (
            <div
              id="flowIframeLoader"
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '14px',
                background: '#060B12',
                zIndex: 2,
                transition: 'opacity 0.3s ease',
              }}
            >
              <div
                className="sara-spinner"
                style={{
                  width: '34px',
                  height: '34px',
                  border: '3px solid rgba(0, 251, 166, 0.2)',
                  borderTopColor: '#00fba6',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <div className="sara-loader-text" style={{ color: '#94A3B8', fontSize: '13px', fontWeight: 600 }}>
                Connecting to Trim Key Flow...
              </div>
              <div id="flowLoaderAmount" style={{ fontSize: '20px', fontWeight: 800, color: '#00fba6', fontFamily: 'monospace' }}>
                ₹{formattedAmount}
              </div>
            </div>
          )}

          <iframe
            ref={iframeRef}
            id="flowCheckoutIframe"
            src={iframeSrc}
            title="Trim Key Flow Checkout"
            allow="payment; clipboard-write; clipboard-read; microphone; camera"
            onLoad={handleIframeLoaded}
            style={{ width: '100%', flex: 1, border: 'none', background: 'transparent', display: 'block' }}
          />
        </div>
      </div>
    </div>
  );
}

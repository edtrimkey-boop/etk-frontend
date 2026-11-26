'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import { serverCall } from '@/lib/api-client';

export interface FlowPaymentModalData {
  checkoutUrl: string;
  paymentNumber: string;
  amount: number | string;
  serviceType?: string;
  quantity?: number;
}

export default function FlowPaymentModal() {
  const {
    activeModal,
    modalData,
    closeModal,
    refreshData,
    showAlert,
    showToast,
    openModal,
    playNotificationSound,
    user,
  } = useDashboard();
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
  const isSettlingRef = useRef<boolean>(false);

  // Initialize or reset iframe when modal opens
  useEffect(() => {
    if (isOpen && data.checkoutUrl) {
      isSettlingRef.current = false;
      setIsLoading(true);
      setIframeSrc(data.checkoutUrl);

      // Auto-reveal safety timeout: dissolves loader after 1.2s to guarantee smooth entry
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = setTimeout(() => {
        setIsLoading(false);
      }, 1200);
    } else {
      isSettlingRef.current = false;
      setIframeSrc('about:blank');
      setIsLoading(true);
    }

    return () => {
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    };
  }, [isOpen, data.checkoutUrl]);

  // Verified settlement handler (Server strictly checks Trim Key Flow status === 'SUCCESS')
  const handleReconcilePayment = useCallback(async (eventData?: any) => {
    if (isSettlingRef.current) return;
    const pNum = eventData?.paymentNumber || eventData?.flow_payment_number || data.paymentNumber;
    if (!pNum || String(pNum).startsWith('TKF-PAY-DEV-')) {
      showAlert('Payment verification requires a valid live Trim Key Flow transaction.', 'Verification Failed');
      return;
    }

    isSettlingRef.current = true;
    const provPayId = eventData?.provider_payment_id || eventData?.razorpay_payment_id || '';
    const provOrdId = eventData?.provider_order_id || eventData?.razorpay_order_id || '';

    try {
      // 1. Server verifies payment status with Trim Key Flow API before crediting quota
      const res = await serverCall('confirmFlowPayment', {
        paymentNumber: pNum,
        instCode: user?.code,
        serviceType: data.serviceType,
        amount: data.amount,
        quantity: data.quantity || 1,
        providerPaymentId: provPayId,
        providerOrderId: provOrdId,
      });

      if (!res || !res.success || res.verified !== true) {
        isSettlingRef.current = false;
        showAlert(res?.message || 'Payment could not be verified as captured with Trim Key Flow.', 'Payment Not Captured');
        return;
      }

      // Broadcast verified settlement so BillingPage refreshes ledger and KPIs from DB
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('tk_payment_settled', {
            detail: {
              verified: true,
              serviceType: res.serviceType || data.serviceType,
              quantity: res.quantity || data.quantity,
              amount: res.amount || data.amount,
              paymentNumber: pNum,
              ledgerRef: res.ledgerRef,
              updatedQuotas: res.updatedQuotas,
            },
          })
        );
      }

      closeModal();
      if (iframeRef.current) {
        setTimeout(() => {
          if (iframeRef.current) iframeRef.current.src = 'about:blank';
        }, 300);
      }

      playNotificationSound('success');
      showAlert('Payment Confirmed! Your subscription and quotas have been updated via Trim Key Flow.', 'Payment Settled');

      // 2. Refresh dashboard quotas & transaction ledger
      await refreshData(true);

      // 3. Immediately display the Official Receipt Modal with verified details
      const ledId = res.ledgerRef || `LED-${pNum}`;
      const finalAmt = Number(res.amount || data.amount || 0);
      const finalQty = Number(res.quantity || data.quantity || 1);
      openModal('billingReceipt', {
        ledId,
        date: new Date().toISOString(),
        service: res.serviceType || data.serviceType || 'Recharge',
        amount: finalAmt,
        quantity: finalQty,
        unitPrice: finalQty > 0 ? finalAmt / finalQty : finalAmt,
        paymentNumber: pNum,
        gatewayPaymentId: res.providerPaymentId || provPayId || 'verified_flow_payment',
        paymentGateway: 'Trim Key Flow',
        paymentMethod: 'ONLINE',
        customerName: user?.name || user?.full_name || 'Institute Admin',
        customerEmail: user?.email || '',
        customerPhone: user?.phone || '',
        instName: user?.institute || '',
        instCode: user?.code || '',
        status: 'PAID',
      });
    } catch (err: any) {
      isSettlingRef.current = false;
      console.warn('Reconciliation note:', err);
      showAlert(err?.message || 'Could not confirm payment status with server.', 'Verification Error');
    }
  }, [data, user, closeModal, playNotificationSound, showAlert, refreshData, openModal]);

  // Listen to postMessage from Trim Key Flow or Payment Gateway
  useEffect(() => {
    if (!isOpen) return;

    const handleMessage = async (event: MessageEvent) => {
      try {
        const msg = event.data;
        if (!msg) return;

        // Instant handshake: Trim Key Flow page loaded and ready
        if (msg.type === 'TK_FLOW_READY') {
          setIsLoading(false);
        }

        // Confirmation of payment from Trim Key Flow
        if (
          msg === 'FLOW_PAYMENT_SUCCESS' ||
          msg.type === 'FLOW_PAYMENT_SUCCESS' ||
          msg.type === 'TK_FLOW_PAYMENT_SUCCESS' ||
          msg.status === 'SUCCESS' ||
          msg.event === 'payment.success' ||
          msg.action === 'PAYMENT_COMPLETE'
        ) {
          await handleReconcilePayment(msg);
        }

        // Modal close request from Trim Key Flow
        if (msg.type === 'TK_FLOW_CLOSE_MODAL') {
          handleClose();
        }
      } catch (err) {
        console.warn('PostMessage error:', err);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isOpen, handleReconcilePayment]);

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

  // Close handler: strictly verifies with server; ZERO increment unless Trim Key Flow confirms SUCCESS
  const handleClose = async () => {
    const pNum = data.paymentNumber;
    const svcType = data.serviceType || 'Recharge';
    const qty = Number(data.quantity || 1);
    const amt = Number(data.amount || 0);

    closeModal();
    if (iframeRef.current) {
      setTimeout(() => {
        if (iframeRef.current) iframeRef.current.src = 'about:blank';
      }, 300);
    }

    if (isSettlingRef.current) return;

    if (pNum && !String(pNum).startsWith('TKF-PAY-DEV-') && amt > 0) {
      try {
        const res = await serverCall('confirmFlowPayment', {
          paymentNumber: pNum,
          instCode: user?.code,
          serviceType: svcType,
          amount: amt,
          quantity: qty,
        });

        if (res && res.success && res.verified === true) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('tk_payment_settled', {
                detail: {
                  verified: true,
                  serviceType: res.serviceType || svcType,
                  quantity: res.quantity || qty,
                  amount: res.amount || amt,
                  paymentNumber: pNum,
                  ledgerRef: res.ledgerRef,
                  updatedQuotas: res.updatedQuotas,
                },
              })
            );
          }
          playNotificationSound('success');
          showToast('Verified payment captured & quota updated!', 'success');
          await refreshData(true);
          return;
        }
      } catch (e) {
        console.warn('Close verification check:', e);
      }
    }

    showToast('Checkout closed. No payment was captured.', 'info');
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

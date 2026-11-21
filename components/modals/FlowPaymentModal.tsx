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

      // Auto-reveal safety timeout: dissolves loader after 1.4s to guarantee smooth entry
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = setTimeout(() => {
        setIsLoading(false);
      }, 1400);
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

        // Check for common payment success signals
        if (
          msg === 'FLOW_PAYMENT_SUCCESS' ||
          msg.type === 'FLOW_PAYMENT_SUCCESS' ||
          msg.status === 'SUCCESS' ||
          msg.action === 'PAYMENT_COMPLETE'
        ) {
          handleVerifySettlement(true);
        }
      } catch {
        // Ignore unparseable post messages from other extensions
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

  const handleReload = () => {
    if (!data.checkoutUrl) return;
    setIsLoading(true);
    if (iframeRef.current) {
      iframeRef.current.src = data.checkoutUrl;
    }
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    loadTimeoutRef.current = setTimeout(() => {
      setIsLoading(false);
    }, 1400);
  };

  const handleEmergencyPopout = () => {
    if (data.checkoutUrl && data.checkoutUrl !== 'about:blank') {
      window.open(data.checkoutUrl, '_blank');
    }
  };

  const handleVerifySettlement = (auto = false) => {
    closeModal();
    showAlert(
      'Payment submitted for verification. Checking status with Trim Key Flow and syncing your quota...',
      'Verifying Settlement'
    );
    // Refresh dashboard payload and ledger
    setTimeout(() => {
      refreshData(true);
    }, 1800);
  };

  const handleClose = () => {
    closeModal();
    // Refresh ledger in background in case payment was finished
    refreshData(true);
  };

  if (!isOpen) return null;

  const formattedAmount = Number(data.amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      style={{ isolation: 'isolate' }}
    >
      <div
        className="relative w-full max-w-[500px] h-[740px] max-h-[94vh] flex flex-col rounded-3xl overflow-hidden border border-emerald-500/35 shadow-[0_25px_80px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.15)] bg-[#0B111E]/95 backdrop-blur-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="flow-payment-title"
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 bg-white/[0.03] border-b border-white/10 shrink-0 select-none">
          <div className="flex items-center gap-3 min-w-0">
            {/* Emerald Shield Badge */}
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center shadow-lg shadow-emerald-500/10 shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <div>
              <div id="flow-payment-title" className="text-white text-sm font-extrabold tracking-wide flex items-center gap-1.5">
                Trim Key <span className="text-emerald-400">Flow</span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                256-Bit SSL Encrypted Checkout
              </div>
            </div>
          </div>

          {/* Header Controls */}
          <div className="flex items-center gap-2">
            {/* Amount Pill */}
            <div className="hidden xs:flex items-center px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
              ₹{formattedAmount}
            </div>

            {/* Reload Iframe Button */}
            <button
              type="button"
              onClick={handleReload}
              title="Reload Checkout Session"
              aria-label="Reload Checkout Session"
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 text-slate-300 hover:text-white flex items-center justify-center transition-all border border-white/10"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
              </svg>
            </button>

            {/* Emergency Popout Button */}
            <button
              type="button"
              onClick={handleEmergencyPopout}
              title="Open in Dedicated Tab"
              aria-label="Open in Dedicated Tab"
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 text-slate-300 hover:text-white flex items-center justify-center transition-all border border-white/10"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={handleClose}
              title="Close Checkout"
              aria-label="Close Checkout"
              className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 active:scale-95 text-red-400 flex items-center justify-center transition-all border border-red-500/30"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Iframe Body Container */}
        <div className="relative flex-1 w-full h-full bg-[#060B12] flex flex-col overflow-hidden">
          {/* Connecting Loader Overlay */}
          {isLoading && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[#060B12] transition-opacity duration-300">
              <div className="w-10 h-10 rounded-full border-3 border-emerald-500/30 border-t-emerald-400 animate-spin" />
              <div className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                Connecting to Trim Key Flow...
              </div>
              <div className="text-xl font-black text-emerald-400 font-mono tracking-tight">
                ₹{formattedAmount}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                {data.serviceType} {data.quantity ? `• ${data.quantity} units` : ''}
              </div>
            </div>
          )}

          {/* Flow Checkout Iframe */}
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            title="Trim Key Flow Checkout"
            allow="payment; clipboard-write; clipboard-read; microphone; camera"
            onLoad={handleIframeLoaded}
            className="w-full flex-1 border-0 bg-transparent block"
          />
        </div>

        {/* Footer Verification Bar */}
        <div className="px-4 sm:px-5 py-3 bg-[#0B111E] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0 select-none">
          <div className="text-[11px] text-slate-400 text-center sm:text-left">
            Complete UPI or Card payment in the window above.
          </div>
          <button
            type="button"
            onClick={() => handleVerifySettlement(false)}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-slate-950 font-extrabold text-xs tracking-wider uppercase transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            I Have Paid • Verify & Settle
          </button>
        </div>
      </div>
    </div>
  );
}

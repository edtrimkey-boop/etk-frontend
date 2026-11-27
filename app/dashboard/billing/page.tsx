'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import { serverCall, serverCallCached, getCachedServerCall } from '@/lib/api-client';
import { OpticalButton, OpticalSurface } from '@/components/ui/OpticalGlass';
import { GlassSwitch } from '@/components/liquid-glass-demo/GlassSwitch';
import { generateReceiptPdf, printReceipt, preloadReceiptLogo } from '@/components/modals/BillingReceiptModal';

import {
  PricingTier,
  FALLBACK_PRICING_MASTER,
  fetchLivePricingMaster,
  getCachedPricingMaster,
  calculateServicePrice,
  CalculationResult,
  fetchInstituteQuotas,
} from '@/lib/pricing';
import AccessDenied from '@/components/shared/AccessDenied';
import { normalizeRole } from '@/lib/rbac';

export default function BillingPage() {
  const { user, payload, loading, refreshData, openModal, showAlert, showConfirm, showLoader, hideLoader, opticalGlassEnabled } = useDashboard();
  const role = normalizeRole(user?.role);

  // Strict Privacy Route Guard: Institute Admin Only
  if (role !== 'admin') {
    return <AccessDenied requiredRole="Institute Administrator" moduleName="Institute Billing & Subscriptions" />;
  }

  // ── 1. Institute Subscription & Quota Stats ─────────────────────────────
  const instDetails = user?.instDetails || payload?.instDetails || payload?.data?.instDetails || {};
  const toggles = payload?.toggles || user?.toggles || {};

  const [quotas, setQuotas] = useState({
    papersTotal: 50,
    papersLeft: 0,
    rcTotal: 11,
    rcLeft: 4,
    acTotal: 26,
    acLeft: 9,
    smsTotal: 5000,
    smsRemaining: 0,
    plan: 'Annual',
    startDate: '2026-03-03',
    renewal: '2027-08-15',
    purchaseValue: '4,000',
  });

  // 1. Sync from user?.instDetails or payload?.instDetails when available
  useEffect(() => {
    if (instDetails && Object.keys(instDetails).length > 0) {
      setQuotas((prev) => ({
        ...prev,
        papersTotal: Number(instDetails.papersTotal ?? prev.papersTotal),
        papersLeft: Number(instDetails.papersLeft ?? prev.papersLeft),
        rcTotal: Number(instDetails.rcTotal ?? prev.rcTotal),
        rcLeft: Number(instDetails.rcLeft ?? prev.rcLeft),
        acTotal: Number(instDetails.acTotal ?? prev.acTotal),
        acLeft: Number(instDetails.acLeft ?? prev.acLeft),
        smsTotal: Number(instDetails.smsTotal ?? prev.smsTotal),
        smsRemaining: Number(instDetails.smsRemaining ?? prev.smsRemaining),
        plan: instDetails.plan || prev.plan,
        startDate: instDetails.startDate || prev.startDate,
        renewal: instDetails.renewal || prev.renewal,
        purchaseValue: instDetails.purchaseValue ? String(instDetails.purchaseValue) : prev.purchaseValue,
      }));
    }
  }, [instDetails]);

  // 2. Sync from Supabase institutes table (only when user?.code is known)
  const syncSupabaseQuotas = useCallback(async () => {
    if (!user?.code) return;
    try {
      const q = await fetchInstituteQuotas(user.code);
      if (q) {
        setQuotas((prev) => ({
          ...prev,
          papersTotal: Number(q.papers_total ?? prev.papersTotal),
          papersLeft: Number(q.papers_left ?? prev.papersLeft),
          rcTotal: Number(q.rc_total ?? prev.rcTotal),
          rcLeft: Number(q.rc_left ?? prev.rcLeft),
          acTotal: Number(q.ac_total ?? prev.acTotal),
          acLeft: Number(q.ac_left ?? prev.acLeft),
          smsTotal: Number(q.sms_total ?? prev.smsTotal),
          smsRemaining: Number(q.sms_remaining ?? prev.smsRemaining),
          plan: q.plan_type || prev.plan,
        }));
      }
    } catch (e) {
      console.warn('[Billing] Supabase quota sync notice:', e);
    }
  }, [user?.code]);

  useEffect(() => {
    syncSupabaseQuotas();
  }, [syncSupabaseQuotas]);

  // ── 2. Pricing Master & Live Calculator State ───────────────────────────
  const [pricingMaster, setPricingMaster] = useState<PricingTier[]>(() => getCachedPricingMaster());
  const [pricingSource, setPricingSource] = useState<'gateway' | 'fallback'>('gateway');
  const [isSyncingPricing, setIsSyncingPricing] = useState<boolean>(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>('Live');

  const [serviceSelect, setServiceSelect] = useState<string>('MCQ Paper');
  const [customUnitToggle, setCustomUnitToggle] = useState<boolean>(false);
  const [paperUnitInput, setPaperUnitInput] = useState<number>(25);
  const [singleAppSelect, setSingleAppSelect] = useState<string>('Admission System');
  const [rechargeQuantity, setRechargeQuantity] = useState<number>(25);

  // Real-time synchronization via Backend Gateway
  const refreshLivePricing = useCallback(async (showToast = false) => {
    setIsSyncingPricing(true);
    try {
      const res = await fetchLivePricingMaster();
      if (res.data && res.data.length > 0) {
        setPricingMaster(res.data);
        setPricingSource(res.source);
        const timeStr = new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        setLastSyncedTime(timeStr);
        if (showToast) {
          showAlert(
            `Pricing rules updated live from ${res.source === 'gateway' ? 'Ed-Trim Key Server' : res.source} at ${timeStr}.`,
            'Live Pricing Synced'
          );
        }
      }
    } catch (err: any) {
      console.warn('[Pricing] Live sync error:', err);
    } finally {
      setIsSyncingPricing(false);
    }
  }, [showAlert]);

  useEffect(() => {
    refreshLivePricing(false);
    const onFocus = () => refreshLivePricing(false);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshLivePricing]);

  // Calculate pricing breakdown using verified pure rule engine
  const pricingDetails: CalculationResult = useMemo(() => {
    return calculateServicePrice({
      serviceSelect,
      rechargeQuantity,
      customUnitToggle,
      paperUnitInput,
      singleAppSelect,
      pricingMaster,
    });
  }, [serviceSelect, rechargeQuantity, customUnitToggle, paperUnitInput, singleAppSelect, pricingMaster]);

  // ── 3. App Modules Access Toggles ───────────────────────────────────────
  const [appAtt, setAppAtt] = useState<boolean>(toggles.attendance === 'YES');
  const [appAdm, setAppAdm] = useState<boolean>(toggles.admission === 'YES' || toggles.admission === true);
  const [appFee, setAppFee] = useState<boolean>(toggles.fee === 'YES' || toggles.fee === true);

  const reqAppAtt = toggles.attendance !== 'YES' && toggles.attendance !== 'Deactivated';
  const reqAppAdm = toggles.admission !== 'YES' && toggles.admission !== 'Deactivated' && toggles.admission !== false;
  const reqAppFee = toggles.fee !== 'YES' && toggles.fee !== 'Deactivated' && toggles.fee !== false;

  useEffect(() => {
    setAppAtt(toggles.attendance === 'YES');
    setAppAdm(toggles.admission === 'YES' || toggles.admission === true);
    setAppFee(toggles.fee === 'YES' || toggles.fee === true);
  }, [toggles]);

  const handleToggleApp = async (appType: 'attendance' | 'admission' | 'fee', currentState: boolean, requiresSub: boolean) => {
    if (requiresSub) {
      showAlert('This module requires an active App Subscription. Select "App Subscriptions" in the recharge panel to activate.', 'Subscription Required');
      setServiceSelect('App Subscriptions');
      if (appType === 'attendance') setSingleAppSelect('Attendance');
      if (appType === 'admission') setSingleAppSelect('Admission');
      if (appType === 'fee') setSingleAppSelect('Fee Collection');
      return;
    }

    const nextState = !currentState;
    const stateStr = nextState ? 'YES' : 'Deactivated';

    showLoader('UPDATING MODULE ACCESS...');
    try {
      const res = await serverCall('toggleInstituteApp', {
        instCode: user?.code || 'KPS',
        appType,
        stateStr,
      });

      if (res && res.success) {
        if (appType === 'attendance') setAppAtt(nextState);
        if (appType === 'admission') setAppAdm(nextState);
        if (appType === 'fee') setAppFee(nextState);
        showAlert(`Module successfully ${nextState ? 'Activated' : 'Deactivated'}!`, 'Success');
        refreshData(true);
      } else {
        showAlert(res?.message || 'Failed to update module state.', 'Error');
      }
    } catch (err: any) {
      showAlert(err.message || 'Network error updating module.', 'Error');
    } finally {
      hideLoader();
    }
  };

  // ── 4. Checkout / Pay Now Execution (In-App Pop-in Modal, No External Tabs) ───
  const handlePayNow = async () => {
    if (pricingDetails.finalAmount <= 0) {
      showAlert('Please enter a valid quantity to initiate top-up.', 'Warning');
      return;
    }

    const orderQty = serviceSelect === 'App Subscriptions' ? 1 : rechargeQuantity;
    const formattedAmt = pricingDetails.finalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 });

    showConfirm(
      `Confirm recharge of ${serviceSelect} (${orderQty} ${pricingDetails.unitMeasure}) for ₹${formattedAmt}?`,
      async () => {
        showLoader('GENERATING FLOW PAYMENT LINK...');
        try {
          const phone = String(user?.phone || user?.phone_number || '').replace(/\D/g, '');
          const validPhone = /^[6-9]\d{9}$/.test(phone) ? phone : undefined;

          const res = await serverCall('createPaymentLink', {
            instCode: user?.code,
            type: serviceSelect,
            amount: pricingDetails.finalAmount,
            email: user?.email,
            name: user?.name || user?.full_name || 'Institute Admin',
            phone: validPhone,
            quantity: orderQty,
          });

          if (res && res.success) {
            const paymentNumber = res.refId || res.payment_number || res.paymentNumber || `TRX-${Date.now()}`;
            const checkoutUrl = res.checkout_url || res.checkoutUrl || `https://flow.trimkey.in/checkout/${paymentNumber}`;

            // 🎯 Open In-App Pop-in Checkout Modal (Zero External Tabs)
            openModal('flowPayment', {
              checkoutUrl,
              paymentNumber,
              amount: res.amount || pricingDetails.finalAmount,
              serviceType: serviceSelect,
              quantity: orderQty,
            });
          } else {
            showAlert(res?.message || 'Could not initiate checkout link.', 'Error');
          }
        } catch (err: any) {
          showAlert(err.message || 'Payment initiation error.', 'Error');
        } finally {
          hideLoader();
        }
      }
    );
  };

  // ── 5. Activity Ledger & Receipts Table ─────────────────────────────────
  const rawBilling = payload?.data?.myBilling || payload?.myBilling || [];
  const [dbLedger, setDbLedger] = useState<any[]>(() => {
    const cached = getCachedServerCall('getBillingSnapshot', {});
    return Array.isArray(cached?.ledger) ? cached.ledger : [];
  });
  const [isReconciling, setIsReconciling] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<'All' | 'Recharge' | 'Usage'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Fetch real-time billing records via authenticated backend gateway
  const loadLiveLedger = useCallback(async () => {
    try {
      const res = await serverCallCached('getBillingSnapshot', {}, { ttlMs: 10_000 });
      if (res?.success && Array.isArray(res.ledger)) {
        setDbLedger(res.ledger);
      }
    } catch (e) {
      console.warn('[Ledger] Live ledger fetch notice:', e);
    }
  }, []);

  useEffect(() => {
    loadLiveLedger();

    const onPaymentSettled = (e: any) => {
      const d = e.detail;
      // Only update quotas if server returned verified settlement payload
      if (d?.verified === true && d?.updatedQuotas) {
        setQuotas((prev) => ({
          ...prev,
          papersTotal: Number(d.updatedQuotas.papers_total ?? prev.papersTotal),
          papersLeft: Number(d.updatedQuotas.papers_left ?? prev.papersLeft),
          rcTotal: Number(d.updatedQuotas.rc_total ?? prev.rcTotal),
          rcLeft: Number(d.updatedQuotas.rc_left ?? prev.rcLeft),
          acTotal: Number(d.updatedQuotas.ac_total ?? prev.acTotal),
          acLeft: Number(d.updatedQuotas.ac_left ?? prev.acLeft),
          smsTotal: Number(d.updatedQuotas.sms_total ?? prev.smsTotal),
          smsRemaining: Number(d.updatedQuotas.sms_remaining ?? prev.smsRemaining),
        }));
      }
      loadLiveLedger();
      syncSupabaseQuotas();
    };

    window.addEventListener('tk_payment_settled', onPaymentSettled);
    return () => window.removeEventListener('tk_payment_settled', onPaymentSettled);
  }, [loadLiveLedger, syncSupabaseQuotas]);

  // Merge live Supabase ledger records with payload ledger records (deduplicated)
  const combinedBilling = useMemo(() => {
    const list: any[] = [];
    const seenIds = new Set<string>();

    // 1. Live database rows from Supabase
    dbLedger.forEach((row) => {
      const idKey = row.ledger_ref || row.id;
      if (idKey && !seenIds.has(idKey)) {
        seenIds.add(idKey);
        const amt = Number(row.amount || 0);
        const qty = Number(row.metadata?.quantity || 1);
        list.push({
          ledId: row.ledger_ref || row.id,
          date: row.created_at,
          type: row.direction === 'CREDIT' || amt > 0 ? 'Recharge' : (row.transaction_type || 'Usage'),
          service: row.service_type || 'Top-up Service',
          amount: amt,
          quantity: qty,
          unitPrice: qty > 0 ? amt / qty : amt,
          status: row.status === 'POSTED' ? 'PAID' : (row.status || 'PAID'),
          gatewayPaymentId: row.gateway_payment_id || row.payment_ref,
          paymentNumber: row.payment_ref,
          paymentGateway: row.payment_gateway || 'Trim Key Flow',
          customerName: user?.name || user?.full_name || 'Institute Admin',
          customerEmail: user?.email || '',
          customerPhone: user?.phone || '',
          instName: user?.institute || 'Keystone Public School',
          instCode: user?.code || 'KPS',
        });
      }
    });

    // 2. Add raw payload records from gateway
    if (Array.isArray(rawBilling)) {
      rawBilling.forEach((row) => {
        const idKey = row.ledId || row.id || row.ref;
        if (idKey && !seenIds.has(idKey)) {
          seenIds.add(idKey);
          list.push(row);
        }
      });
    }

    return list;
  }, [dbLedger, rawBilling, user]);

  const filteredBilling = useMemo(() => {
    let list = [...combinedBilling];

    // Filter by type
    if (filterType === 'Recharge') {
      list = list.filter((b) => Number(b.amount) > 0 || (b.type && String(b.type).toLowerCase().includes('recharge')));
    } else if (filterType === 'Usage') {
      list = list.filter((b) => !b.amount || Number(b.amount) <= 0 || (b.type && String(b.type).toLowerCase().includes('usage')));
    }

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((b) =>
        (b.ledId && b.ledId.toLowerCase().includes(q)) ||
        (b.service && b.service.toLowerCase().includes(q)) ||
        (b.ref && b.ref.toLowerCase().includes(q))
      );
    }

    return list;
  }, [combinedBilling, filterType, searchQuery]);

  const [displayLimit, setDisplayLimit] = useState<number>(30);

  useEffect(() => {
    setDisplayLimit(30);
  }, [filterType, searchQuery]);

  const visibleBilling = useMemo(() => {
    return filteredBilling.slice(0, displayLimit);
  }, [filteredBilling, displayLimit]);
  const hasMoreBilling = displayLimit < filteredBilling.length;

  // Verified Manual Reconciliation Handler (Strictly queries Flow for captured SUCCESS payments)
  const handleManualReconcile = async () => {
    setIsReconciling(true);
    showLoader('VERIFYING WITH PAYMENT GATEWAY...');
    try {
      const res = await serverCall('reconcileFlowPayments', {
        instCode: user?.code,
      });
      await refreshData(true);
      await loadLiveLedger();
      await syncSupabaseQuotas();
      showAlert(
        res?.message || 'Ledger and quotas synchronized with Trim Key Flow.',
        res?.reconciledCount > 0 ? 'Reconciliation Complete' : 'Sync Complete'
      );
    } catch (err: any) {
      showAlert('Reconciliation notice: ' + err.message, 'Notice');
    } finally {
      hideLoader();
      setIsReconciling(false);
    }
  };

  const openReceiptModal = (record: any) => {
    openModal('billingReceipt', {
      ...record,
      customerName: record.customerName || user?.name || user?.full_name,
      customerEmail: record.customerEmail || user?.email,
      customerPhone: record.customerPhone || user?.phone,
      instName: record.instName || user?.institute,
      instCode: record.instCode || user?.code,
    });
  };

  const downloadReceiptDirect = async (record: any) => {
    try {
      const logo = await preloadReceiptLogo();
      const doc = generateReceiptPdf(record, user, logo || undefined);
      doc.save(`EdTrimKey_Receipt_${record.ledId || 'TRX'}.pdf`);
      showAlert('Official PDF Receipt downloaded successfully!', 'Success');
    } catch (err: any) {
      showAlert('PDF Generation error: ' + err.message, 'Error');
    }
  };

  // Dynamic preset quick quantity increments adapted to current service
  const presetQuantities = useMemo(() => {
    if (serviceSelect.includes('Paper')) return [5, 10, 25, 50, 100];
    if (serviceSelect.includes('Card')) return [50, 100, 250, 500];
    if (serviceSelect.includes('SMS')) return [500, 1000, 2500, 5000];
    return [10, 50, 100, 250];
  }, [serviceSelect]);

  const addPresetQuantity = (qty: number) => {
    setRechargeQuantity((prev) => Math.max(1, prev + qty));
  };

  return (
    <div id="view-inst-billing" className="page-view active" style={{ display: 'block' }}>
      {/* ── 1. Plan & Subscription Summary Banner ─────────────────────── */}
      <div className="panel" style={{ borderLeft: '4px solid var(--brand)', marginBottom: '24px' }}>
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(38,195,234,0.12)',
                border: '1px solid rgba(38,195,234,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand)',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <line x1="2" x2="22" y1="10" y2="10" />
              </svg>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: 'white' }}>Institute Billing &amp; Subscriptions</h3>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>Cryptographically committed immutable billing ledger</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: '999px',
                background: 'rgba(46,204,113,0.15)',
                color: 'var(--success)',
                border: '1px solid rgba(46,204,113,0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)' }} />
              Active Institutional License
            </span>
          </div>
        </div>

        {/* Plan Summary Numbers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginTop: '16px' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>
              Current Plan
            </p>
            <h2 id="billPlanType" style={{ fontSize: '18px', fontWeight: 900, color: 'var(--brand)', margin: 0 }}>
              {quotas.plan}
            </h2>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>
              Start Date
            </p>
            <h2 id="billStartDate" style={{ fontSize: '18px', fontWeight: 900, color: 'white', margin: 0 }}>
              {quotas.startDate}
            </h2>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>
              Renewal Date
            </p>
            <h2 id="billRenewDate" style={{ fontSize: '18px', fontWeight: 900, color: 'white', margin: 0 }}>
              {quotas.renewal}
            </h2>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>
              Purchase Value
            </p>
            <h2 id="billPurchaseValue" style={{ fontSize: '18px', fontWeight: 900, color: '#00F5A0', margin: 0, fontFamily: 'monospace' }}>
              {quotas.purchaseValue.startsWith('₹') ? quotas.purchaseValue : `₹${quotas.purchaseValue}`}
            </h2>
          </div>
        </div>
      </div>

      {/* ── 2. Operational Quota Balance Grid (KPI Cards) ─────────────── */}
      <div className="grid-kpis" style={{ marginBottom: '24px' }}>
        {/* Papers Card */}
        <div className="kpi-card b-brand" style={{ background: 'var(--card)', borderRadius: '16px', padding: '18px 20px', borderLeft: '4px solid var(--brand)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Questions Papers</h4>
            <span style={{ fontSize: '10px', color: 'var(--brand)', fontWeight: 800, background: 'rgba(38,195,234,0.12)', padding: '2px 8px', borderRadius: '999px' }}>
              {quotas.papersTotal > 0 ? `${Math.round((quotas.papersLeft / quotas.papersTotal) * 100)}% left` : '0%'}
            </span>
          </div>
          <h2 id="billPaperTotal" style={{ fontSize: '26px', fontWeight: 900, color: 'white', margin: '8px 0 4px 0' }}>
            {quotas.papersTotal.toLocaleString('en-IN')}
          </h2>
          <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden', margin: '8px 0' }}>
            <div
              style={{
                width: `${quotas.papersTotal > 0 ? Math.min(100, Math.max(0, (quotas.papersLeft / quotas.papersTotal) * 100)) : 0}%`,
                height: '100%',
                background: 'var(--brand)',
                borderRadius: '10px',
              }}
            />
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
            Remaining Quota: <b id="billPaperRemain" style={{ color: 'var(--brand)', fontSize: '12px' }}>{quotas.papersLeft}</b>
          </p>
        </div>

        {/* Report Cards */}
        <div className="kpi-card b-success" style={{ background: 'var(--card)', borderRadius: '16px', padding: '18px 20px', borderLeft: '4px solid var(--success)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Report Cards</h4>
            <span style={{ fontSize: '10px', color: 'var(--success)', fontWeight: 800, background: 'rgba(46,204,113,0.12)', padding: '2px 8px', borderRadius: '999px' }}>
              {quotas.rcTotal > 0 ? `${Math.round((quotas.rcLeft / quotas.rcTotal) * 100)}% left` : '0%'}
            </span>
          </div>
          <h2 id="billRcTotal" style={{ fontSize: '26px', fontWeight: 900, color: 'white', margin: '8px 0 4px 0' }}>
            {quotas.rcTotal.toLocaleString('en-IN')}
          </h2>
          <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden', margin: '8px 0' }}>
            <div
              style={{
                width: `${quotas.rcTotal > 0 ? Math.min(100, Math.max(0, (quotas.rcLeft / quotas.rcTotal) * 100)) : 0}%`,
                height: '100%',
                background: 'var(--success)',
                borderRadius: '10px',
              }}
            />
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
            Remaining Quota: <b id="billRcRemain" style={{ color: 'var(--success)', fontSize: '12px' }}>{quotas.rcLeft}</b>
          </p>
        </div>

        {/* Admit Cards */}
        <div className="kpi-card b-danger" style={{ background: 'var(--card)', borderRadius: '16px', padding: '18px 20px', borderLeft: '4px solid var(--danger)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Admit Cards</h4>
            <span style={{ fontSize: '10px', color: 'var(--danger)', fontWeight: 800, background: 'rgba(239,68,68,0.12)', padding: '2px 8px', borderRadius: '999px' }}>
              {quotas.acTotal > 0 ? `${Math.round((quotas.acLeft / quotas.acTotal) * 100)}% left` : '0%'}
            </span>
          </div>
          <h2 id="billAcTotal" style={{ fontSize: '26px', fontWeight: 900, color: 'white', margin: '8px 0 4px 0' }}>
            {quotas.acTotal.toLocaleString('en-IN')}
          </h2>
          <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden', margin: '8px 0' }}>
            <div
              style={{
                width: `${quotas.acTotal > 0 ? Math.min(100, Math.max(0, (quotas.acLeft / quotas.acTotal) * 100)) : 0}%`,
                height: '100%',
                background: 'var(--danger)',
                borderRadius: '10px',
              }}
            />
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
            Remaining Quota: <b id="billAcRemain" style={{ color: 'var(--danger)', fontSize: '12px' }}>{quotas.acLeft}</b>
          </p>
        </div>

        {/* SMS Credits */}
        <div className="kpi-card b-info" style={{ background: 'var(--card)', borderRadius: '16px', padding: '18px 20px', borderLeft: '4px solid var(--purple)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>SMS Credits</h4>
            <span style={{ fontSize: '10px', color: 'var(--purple)', fontWeight: 800, background: 'rgba(139,92,246,0.12)', padding: '2px 8px', borderRadius: '999px' }}>
              {quotas.smsTotal > 0 ? `${Math.round((quotas.smsRemaining / quotas.smsTotal) * 100)}% left` : '0%'}
            </span>
          </div>
          <h2 id="billSmsTotal" style={{ fontSize: '26px', fontWeight: 900, color: 'white', margin: '8px 0 4px 0' }}>
            {quotas.smsTotal.toLocaleString('en-IN')}
          </h2>
          <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden', margin: '8px 0' }}>
            <div
              style={{
                width: `${quotas.smsTotal > 0 ? Math.min(100, Math.max(0, (quotas.smsRemaining / quotas.smsTotal) * 100)) : 0}%`,
                height: '100%',
                background: 'var(--purple)',
                borderRadius: '10px',
              }}
            />
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
            Remaining Quota: <b id="billSmsRemain" style={{ color: 'var(--purple)', fontSize: '12px' }}>{quotas.smsRemaining}</b>
          </p>
        </div>
      </div>

      {/* ── 3. Two-Column Split (Apps Access & Recharge Calculator) ────── */}
      <div className="grid-2" style={{ marginBottom: '30px' }}>
        {/* Left Column: Connected Web Modules & Apps Access */}
        <div className="panel" style={{ margin: 0 }}>
          <div className="panel-header" style={{ marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900 }}>Connected Web Modules &amp; Apps</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
              Enable or deactivate cloud systems for your faculty, parents, and students.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Smart Attendance Portal */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 16px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--purple)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'white' }}>Smart Attendance Portal</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Biometric, facial &amp; faculty register</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {reqAppAtt && (
                  <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--danger)', background: 'rgba(239,68,68,0.12)', padding: '2px 8px', borderRadius: '4px' }}>
                    Requires Sub
                  </span>
                )}
                {opticalGlassEnabled ? (
                  <GlassSwitch
                    checked={appAtt}
                    onCheckedChange={() => handleToggleApp('attendance', appAtt, reqAppAtt)}
                    disabled={reqAppAtt}
                    ariaLabel="Toggle Smart Attendance Portal"
                  />
                ) : (
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={appAtt}
                      disabled={reqAppAtt}
                      onChange={() => handleToggleApp('attendance', appAtt, reqAppAtt)}
                    />
                    <span className="slider" />
                  </label>
                )}
              </div>
            </div>

            {/* Admission System */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 16px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(38,195,234,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                    <path d="M6 12v5c3 3 9 3 12 0v-5" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'white' }}>Online Admission System</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Digital registration &amp; document desk</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {reqAppAdm && (
                  <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--danger)', background: 'rgba(239,68,68,0.12)', padding: '2px 8px', borderRadius: '4px' }}>
                    Requires Sub
                  </span>
                )}
                {opticalGlassEnabled ? (
                  <GlassSwitch
                    checked={appAdm}
                    onCheckedChange={() => handleToggleApp('admission', appAdm, reqAppAdm)}
                    disabled={reqAppAdm}
                    ariaLabel="Toggle Online Admission System"
                  />
                ) : (
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={appAdm}
                      disabled={reqAppAdm}
                      onChange={() => handleToggleApp('admission', appAdm, reqAppAdm)}
                    />
                    <span className="slider" />
                  </label>
                )}
              </div>
            </div>

            {/* Fee Collection App */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 16px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(46,204,113,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'white' }}>Fee Collection Portal</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Online fees, UPI receipts &amp; dues</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {reqAppFee && (
                  <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--danger)', background: 'rgba(239,68,68,0.12)', padding: '2px 8px', borderRadius: '4px' }}>
                    Requires Sub
                  </span>
                )}
                {opticalGlassEnabled ? (
                  <GlassSwitch
                    checked={appFee}
                    onCheckedChange={() => handleToggleApp('fee', appFee, reqAppFee)}
                    disabled={reqAppFee}
                    ariaLabel="Toggle Fee Collection Portal"
                  />
                ) : (
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={appFee}
                      disabled={reqAppFee}
                      onChange={() => handleToggleApp('fee', appFee, reqAppFee)}
                    />
                    <span className="slider" />
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Recharge Quota & Services Calculator */}
        <div className="panel" style={{ margin: 0, borderTop: '4px solid var(--success)' }}>
          <div className="panel-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900 }}>Recharge Services &amp; Quotas</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                Top up operational units with real-time database pricing &amp; volume discount tiers.
              </p>
            </div>

            {/* Live Database Sync Badge & Reload Button */}
            <button
              type="button"
              onClick={() => refreshLivePricing(true)}
              disabled={isSyncingPricing}
              title="Click to fetch real-time pricing directly from Supabase"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '8px',
                background: pricingSource === 'gateway' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(38, 195, 234, 0.12)',
                border: pricingSource === 'gateway' ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(38, 195, 234, 0.35)',
                color: pricingSource === 'gateway' ? '#10B981' : '#26C3EA',
                fontSize: '11px',
                fontWeight: 700,
                cursor: isSyncingPricing ? 'wait' : 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: isSyncingPricing ? '#F59E0B' : '#10B981',
                  boxShadow: '0 0 6px rgba(16, 185, 129, 0.8)',
                  display: 'inline-block',
                }}
              />
              {isSyncingPricing ? 'Syncing DB...' : `Live DB: ${lastSyncedTime}`}
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  animation: isSyncingPricing ? 'spin 1s linear infinite' : 'none',
                }}
              >
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
              </svg>
            </button>
          </div>

          {/* Service Selector */}
          <div style={{ marginBottom: '14px' }}>
            <label className="label-text" style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800, display: 'block', marginBottom: '6px' }}>
              Select Recharge Service
            </label>
            <select
              id="serviceSelect"
              className="form-input"
              value={serviceSelect}
              onChange={(e) => {
                const val = e.target.value;
                setServiceSelect(val);
                if (val.includes('Paper')) setRechargeQuantity(25);
                else if (val.includes('Card')) setRechargeQuantity(100);
                else if (val.includes('SMS')) setRechargeQuantity(1000);
                else if (val === 'App Subscriptions') setRechargeQuantity(1);
              }}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'var(--card-light)', color: 'white', border: '1px solid var(--border)' }}
            >
              <option value="MCQ Paper">MCQ Paper Top-Up (Tiers: 1-11, 12-23, 24+)</option>
              <option value="Math Paper">Maths Paper Top-Up (Tiers: 1-11, 12-23, 24+)</option>
              <option value="Physics / Numerical Paper">Physics / Numerical Paper (Tiers: 1-11, 12-23, 24+)</option>
              <option value="Report Card">Report Card Generation (₹9/student)</option>
              <option value="Admit Card">Admit Card Generation (₹1/student)</option>
              <option value="SMS Top-up">SMS Credits Top-Up (₹0.35/SMS)</option>
              <option value="App Subscriptions">App Subscriptions &amp; Cloud Modules</option>
            </select>
          </div>

          {/* Paper Custom Questions Option */}
          {serviceSelect.includes('Paper') && (
            <div
              style={{
                background: 'rgba(0,0,0,0.25)',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.06)',
                marginBottom: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand)' }}>Questions per Paper</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {opticalGlassEnabled ? (
                    <GlassSwitch
                      checked={customUnitToggle}
                      onCheckedChange={setCustomUnitToggle}
                      ariaLabel="Custom Questions per Paper (>25)"
                    />
                  ) : (
                    <label className="switch" style={{ transform: 'scale(0.8)' }}>
                      <input
                        type="checkbox"
                        checked={customUnitToggle}
                        onChange={(e) => setCustomUnitToggle(e.target.checked)}
                      />
                      <span className="slider" />
                    </label>
                  )}
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Custom (&gt;25)</span>
                </div>
              </div>

              <input
                type="number"
                min="25"
                max="200"
                value={paperUnitInput}
                disabled={!customUnitToggle}
                onChange={(e) => setPaperUnitInput(Math.max(25, Number(e.target.value) || 25))}
                className="form-input"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: customUnitToggle ? 'var(--card)' : 'rgba(255,255,255,0.05)',
                  color: customUnitToggle ? 'white' : 'var(--text-muted)',
                  border: '1px solid var(--border)',
                  margin: 0,
                }}
              />
            </div>
          )}

          {/* App Subscription Option with Real Database Pricing */}
          {serviceSelect === 'App Subscriptions' && (
            <div
              style={{
                background: 'rgba(0,0,0,0.25)',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.06)',
                marginBottom: '14px',
              }}
            >
              <label className="label-text" style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 800, display: 'block', marginBottom: '6px' }}>
                Select Annual Cloud App / System Module
              </label>
              <select
                className="form-input"
                value={singleAppSelect}
                onChange={(e) => setSingleAppSelect(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'var(--card-light)', color: 'white', border: '1px solid var(--border)', margin: 0 }}
              >
                <option value="Admission System">Online Admission System — ₹2,000.00 / yr (33.3% off base ₹3,000)</option>
                <option value="Attendance System">Smart Attendance Portal — ₹2,000.00 / yr (20.0% off base ₹2,500)</option>
                <option value="Fee Collection">Fee Collection Portal — ₹2,500.00 / yr (37.5% off base ₹4,000)</option>
                <option value="AI Agent">AI Institutional Agent — ₹1,800.00 / yr (40.0% off base ₹3,000)</option>
                <option value="AI Song">Custom AI Anthem / Song — ₹500.00 / song (50.0% off base ₹1,000)</option>
                <option value="Document Branding">Official Document Branding — ₹200.00 / doc (50.0% off base ₹400)</option>
                <option value="Complete Apps Combo">Complete Apps Combo — ₹7,500.00 One-Time (11.8% off base ₹8,500)</option>
              </select>
            </div>
          )}

          {/* Quantity Input with Context-Aware Quick Preset Increment Pills */}
          {serviceSelect !== 'App Subscriptions' && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="label-text" style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800, margin: 0 }}>
                  Quantity ({pricingDetails.unitMeasure})
                </label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {presetQuantities.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => addPresetQuantity(preset)}
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        color: 'var(--brand)',
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '2px 7px',
                        cursor: 'pointer',
                      }}
                    >
                      +{preset}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="number"
                min="1"
                value={rechargeQuantity}
                onChange={(e) => setRechargeQuantity(Math.max(1, Number(e.target.value) || 1))}
                placeholder="Enter required quantity"
                className="form-input"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'var(--card-light)', color: 'white', border: '1px solid var(--border)' }}
              />
            </div>
          )}

          {/* Live Pricing Breakdown Box */}
          <div
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px dashed var(--border)',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '16px',
              fontSize: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Base Rate:</span>
              <strong style={{ color: 'white' }}>₹{pricingDetails.baseRate.toFixed(2)} / {pricingDetails.unitMeasure}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Applied Tier Discount:</span>
              <strong style={{ color: 'var(--success)' }}>
                {pricingDetails.discountPct}% [{pricingDetails.planType} Tier]
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Effective Rate:</span>
              <strong style={{ color: 'var(--brand)' }}>₹{pricingDetails.finalRate.toFixed(2)} / {pricingDetails.unitMeasure}</strong>
            </div>
          </div>

          {/* Total & Pay Now Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>
                Calculated Total
              </span>
              <h2 style={{ color: '#00F5A0', margin: 0, fontSize: '28px', fontWeight: 900, fontFamily: 'monospace' }}>
                ₹{pricingDetails.finalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h2>
            </div>

            <OpticalButton
              type="button"
              variant="success"
              onClick={handlePayNow}
              style={{ padding: '12px 28px', fontSize: '13px' }}
            >
              ⚡ Pay Now &amp; Recharge
            </OpticalButton>
          </div>
        </div>
      </div>

      {/* ── 4. Activity Ledger & Receipts Table ────────────────────────── */}
      <div className="panel">
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(38,195,234,0.12)',
                border: '1px solid rgba(38,195,234,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand)',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900 }}>Activity Ledger &amp; Official Receipts</h3>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>Complete audit trail of top-ups, deductions &amp; subscriptions</p>
            </div>
          </div>

          {/* Filter & Search Controls */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search LED ID or Service..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{
                padding: '8px 12px',
                fontSize: '12px',
                borderRadius: '8px',
                background: 'var(--card-light)',
                border: '1px solid var(--border)',
                color: 'white',
                minWidth: '200px',
              }}
            />

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="filter-select"
              style={{
                padding: '8px 12px',
                fontSize: '12px',
                borderRadius: '8px',
                background: 'var(--card-light)',
                border: '1px solid var(--border)',
                color: 'white',
              }}
            >
              <option value="All">All Transactions ({combinedBilling.length})</option>
              <option value="Recharge">Recharges (+)</option>
              <option value="Usage">Usage Deductions (-)</option>
            </select>

            {/* Reconcile & Refresh Button */}
            <button
              type="button"
              onClick={handleManualReconcile}
              disabled={isReconciling}
              title="Click to reconcile recent payments directly with Trim Key Flow"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                background: 'rgba(0, 245, 160, 0.12)',
                border: '1px solid rgba(0, 245, 160, 0.35)',
                color: '#00F5A0',
                fontSize: '12px',
                fontWeight: 700,
                cursor: isReconciling ? 'wait' : 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ animation: isReconciling ? 'spin 1s linear infinite' : 'none' }}
              >
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
              </svg>
              {isReconciling ? 'Syncing...' : 'Reconcile & Refresh'}
            </button>
          </div>
        </div>

        {/* Data Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '45px 20px' }}>
            <div className="spinner-sm" style={{ margin: '0 auto 12px auto' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>Syncing immutable ledger records...</p>
          </div>
        ) : filteredBilling.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '45px 20px', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0, fontWeight: 600 }}>
              No billing records found matching your filter criteria.
            </p>
          </div>
        ) : (
          <>
            <div className="tk-table-wrapper">
            <table className="tk-sleek-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>LED ID</th>
                  <th>Date &amp; Time</th>
                  <th>Type</th>
                  <th>Service</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'center' }}>Qty</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Official Receipt</th>
                </tr>
              </thead>
              <tbody>
                {visibleBilling.map((row: any, i: number) => {
                  const ledId = row.ledId || row.id || `LED-${1000 + i}`;
                  const isRecharge = Number(row.amount) > 0 || (row.type && String(row.type).toLowerCase().includes('recharge'));
                  const dateObj = row.date ? new Date(row.date) : new Date();
                  const dateStr = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                  const timeStr = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

                  return (
                    <tr
                      key={i}
                      style={{ cursor: 'pointer' }}
                      onClick={() => openReceiptModal(row)}
                    >
                      {/* LED ID */}
                      <td data-label="LED ID">
                        <span
                          className="tk-led-btn"
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '11px',
                            fontWeight: 800,
                            color: 'var(--brand)',
                            background: 'rgba(38,195,234,0.1)',
                            border: '1px solid rgba(38,195,234,0.3)',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          {ledId}
                        </span>
                      </td>

                      {/* Date & Time */}
                      <td data-label="DATE & TIME">
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'white' }}>{dateStr}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{timeStr}</div>
                      </td>

                      {/* Type */}
                      <td data-label="TYPE">
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 800,
                            background: isRecharge ? 'rgba(46,204,113,0.12)' : 'rgba(245,158,11,0.12)',
                            color: isRecharge ? 'var(--success)' : 'var(--accent)',
                            border: `1px solid ${isRecharge ? 'rgba(46,204,113,0.3)' : 'rgba(245,158,11,0.3)'}`,
                            textTransform: 'uppercase',
                          }}
                        >
                          {row.type || (isRecharge ? 'Recharge' : 'Usage')}
                        </span>
                      </td>

                      {/* Service */}
                      <td data-label="SERVICE" style={{ fontWeight: 700, color: 'white' }}>
                        {row.service || 'Operational Quota'}
                      </td>

                      {/* Amount */}
                      <td data-label="AMOUNT" style={{ textAlign: 'right', fontWeight: 900, fontFamily: 'monospace' }}>
                        {isRecharge ? (
                          <span style={{ color: '#00F5A0' }}>+₹{Number(row.amount || 0).toFixed(2)}</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>₹0.00</span>
                        )}
                      </td>

                      {/* Qty */}
                      <td data-label="QTY" style={{ textAlign: 'center', fontWeight: 700, color: 'white' }}>
                        {row.quantity || 1}
                      </td>

                      {/* Status */}
                      <td data-label="STATUS">
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 800,
                            background: 'rgba(46,204,113,0.12)',
                            color: 'var(--success)',
                            border: '1px solid rgba(46,204,113,0.3)',
                          }}
                        >
                          {row.status || 'Settled'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td data-label="RECEIPT" style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => openReceiptModal(row)}
                            title="View official payment receipt & tax invoice"
                            style={{
                              background: 'rgba(38,195,234,0.1)',
                              border: '1px solid rgba(38,195,234,0.3)',
                              borderRadius: '6px',
                              color: 'var(--brand)',
                              padding: '5px 10px',
                              fontSize: '11px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                            View
                          </button>

                          <button
                            type="button"
                            onClick={() => downloadReceiptDirect(row)}
                            title="Download official PDF receipt"
                            style={{
                              background: 'rgba(46,204,113,0.1)',
                              border: '1px solid rgba(46,204,113,0.3)',
                              borderRadius: '6px',
                              color: 'var(--success)',
                              padding: '5px 8px',
                              fontSize: '11px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Load Capacity Bar & Load More Action */}
          <div className="tk-table-capacity-bar">
            <div className="tk-capacity-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <line x1="2" x2="22" y1="10" y2="10" />
              </svg>
              Showing <b style={{ color: 'white' }}>{visibleBilling.length}</b> of <b style={{ color: 'white' }}>{filteredBilling.length}</b> records (Load Capacity: 30 / batch)
            </div>
            {hasMoreBilling && (
              <button
                type="button"
                className="tk-load-more-btn"
                onClick={() => setDisplayLimit((prev) => prev + 30)}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Load More Transactions... (+30)
              </button>
            )}
          </div>
        </>
      )}
      </div>
    </div>
  );
}

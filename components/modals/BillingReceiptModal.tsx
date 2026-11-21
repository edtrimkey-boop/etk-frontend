'use client';

import React from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import { OpticalButton } from '@/components/ui/OpticalGlass';
import { jsPDF } from 'jspdf';

export interface BillingReceiptRecord {
  ledId?: string;
  id?: string;
  date?: string;
  type?: string;
  service?: string;
  amount?: number | string;
  quantity?: number | string;
  unitPrice?: number | string;
  status?: string;
  gatewayPaymentId?: string;
  paymentNumber?: string;
  ref?: string;
  paymentMethod?: string;
  paymentGateway?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  instName?: string;
  instCode?: string;
}

let cachedReceiptLogoDataUrl: string | null = null;

export async function preloadReceiptLogo(): Promise<string | null> {
  if (cachedReceiptLogoDataUrl) return cachedReceiptLogoDataUrl;
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 200;
        canvas.height = img.naturalHeight || 200;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          cachedReceiptLogoDataUrl = canvas.toDataURL('image/png');
          resolve(cachedReceiptLogoDataUrl);
          return;
        }
      } catch (err) {
        console.warn('[Receipt Logo]: Canvas conversion notice', err);
      }
      resolve(null);
    };
    img.onerror = () => {
      const fb = new Image();
      fb.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = fb.naturalWidth || 200;
          canvas.height = fb.naturalHeight || 200;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(fb, 0, 0);
            cachedReceiptLogoDataUrl = canvas.toDataURL('image/png');
            resolve(cachedReceiptLogoDataUrl);
            return;
          }
        } catch {}
        resolve(null);
      };
      fb.onerror = () => resolve(null);
      fb.src = '/etk-logo.png';
    };
    img.src = '/etk-logo.png';
    setTimeout(() => resolve(cachedReceiptLogoDataUrl), 2000);
  });
}

if (typeof window !== 'undefined') {
  preloadReceiptLogo().catch(() => {});
}

export function generateReceiptPdf(rec: BillingReceiptRecord, user: any, logoDataUrl?: string): jsPDF {
  const doc = new jsPDF('p', 'pt', 'a4'); // 595.28 x 841.89 pt
  const ledId = rec.ledId || rec.id || 'LED-TRX';
  const amountVal = Number(rec.amount || 0).toFixed(2);
  const qtyVal = Number(rec.quantity || 1);
  const unitPriceVal = Number(rec.unitPrice || (Number(rec.amount || 0) / qtyVal) || 0).toFixed(2);
  const dateObj = rec.date ? new Date(rec.date) : new Date();
  const dateStr = dateObj.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = dateObj.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();

  // 1. Header Banner (Dark Obsidian)
  doc.setFillColor(15, 23, 42); // #0F172A
  doc.rect(0, 0, 595, 105, 'F');

  // Brand Logo embedding - Exactly matching index.html lines 9612-9627
  const logo = logoDataUrl || cachedReceiptLogoDataUrl;
  if (logo) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(38, 20, 60, 60, 6, 6, 'F');
      doc.addImage(logo, 'PNG', 42, 24, 52, 52);
    } catch (e) {
      console.warn('Logo embed notice:', e);
      doc.setFillColor(38, 195, 234);
      doc.roundedRect(38, 20, 60, 60, 6, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text('ETK', 52, 56);
    }
  } else {
    doc.setFillColor(38, 195, 234);
    doc.roundedRect(38, 20, 60, 60, 6, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text('ETK', 52, 56);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(38, 195, 234); // #26C3EA
  doc.text('ED-TRIM KEY', 112, 44);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // #CBD5E1
  doc.text('TRIMKEY TECHNOLOGIES • CLOUD PAYMENT INFRASTRUCTURE', 112, 60);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text('OFFICIAL PAYMENT RECEIPT & TAX INVOICE', 112, 78);

  // Verified Badge on Right
  doc.setFillColor(6, 78, 59); // Dark green
  doc.roundedRect(380, 26, 175, 26, 4, 4, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 245, 160); // #00F5A0
  doc.text('256-BIT SSL ENCRYPTED', 395, 42);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('SETTLEMENT CONFIRMED', 420, 66);

  // 2. Issuer & Business Information Box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(40, 116, 515, 60, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('ISSUER & BUSINESS INFORMATION', 52, 130);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text('Address: Lalpur, Ranchi, Jharkhand - 834001, India', 52, 144);
  doc.text('Contact: support@ed.trimkey.in | Phone: +91 8235400967', 52, 157);
  doc.text('Website: https://trimkey.in/ed | Payment Flow: https://flow.trimkey.in | UDYAM/MSME: JH-21-0019073', 52, 170);

  // 3. Transaction Summary Box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(40, 186, 515, 62, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('TRANSACTION DETAILS', 52, 200);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);

  doc.text('LED ID:', 52, 216);
  doc.setFont('helvetica', 'bold');
  doc.text(`${ledId}`, 115, 216);

  doc.setFont('helvetica', 'normal');
  doc.text('Payment Ref:', 52, 232);
  doc.text(`${rec.paymentNumber || rec.ref || '-'}`, 115, 232);

  doc.text('Gateway ID:', 320, 216);
  doc.setFont('helvetica', 'bold');
  doc.text(`${rec.gatewayPaymentId || 'pay_online_verified'}`, 385, 216);

  doc.setFont('helvetica', 'normal');
  doc.text('Date & Time:', 320, 232);
  doc.text(`${dateStr} at ${timeStr} (IST)`, 385, 232);

  // 4. Customer & Institute Info Box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(40, 258, 515, 70, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('BILLED TO (CUSTOMER)', 52, 272);
  doc.text('INSTITUTE / CLIENT', 320, 272);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);

  doc.setFont('helvetica', 'bold');
  doc.text(`${(rec.customerName || user?.name || user?.full_name || 'Institute Admin').toUpperCase()}`, 52, 287);
  doc.setFont('helvetica', 'normal');
  doc.text(`Email: ${rec.customerEmail || user?.email || 'admin@trimkey.in'}`, 52, 301);
  doc.text(`Phone: ${rec.customerPhone || user?.phone ? '+91 ' + (rec.customerPhone || user?.phone) : 'N/A'}`, 52, 315);

  doc.setFont('helvetica', 'bold');
  doc.text(`${(rec.instName || user?.institute || 'Keystone Public School').toUpperCase()}`, 320, 287);
  doc.setFont('helvetica', 'normal');
  doc.text(`Institute Code: ${rec.instCode || user?.code || 'KPS'}`, 320, 301);
  doc.text(`Payment Method: ${rec.paymentMethod || 'ONLINE'} (${rec.paymentGateway || 'Trim Key Flow'})`, 320, 315);

  // 5. Itemized Pricing Table
  const tableTop = 338;
  doc.setFillColor(38, 195, 234); // #26C3EA
  doc.rect(40, tableTop, 515, 20, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('SERVICE / ITEM DESCRIPTION', 52, tableTop + 13);
  doc.text('QTY', 310, tableTop + 13);
  doc.text('UNIT PRICE', 390, tableTop + 13);
  doc.text('TOTAL (INR)', 485, tableTop + 13);

  // Table Content Row
  const rowY = tableTop + 34;
  doc.setFillColor(248, 250, 252);
  doc.rect(40, tableTop + 20, 515, 34, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`${rec.service || 'Recharge'} Quota Top-up`, 52, rowY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Cloud educational operations quota credit for ${rec.service || 'operations'}`, 52, rowY + 11);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`${qtyVal}`, 315, rowY + 3);
  doc.text(`Rs. ${unitPriceVal}`, 390, rowY + 3);

  doc.setTextColor(16, 185, 129); // Green
  doc.text(`Rs. ${amountVal}`, 485, rowY + 3);

  // 6. Financial Summary Block
  let sumY = tableTop + 68;
  doc.setDrawColor(226, 232, 240);
  doc.line(40, sumY, 555, sumY);

  sumY += 14;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Subtotal:', 360, sumY);
  doc.text(`Rs. ${amountVal}`, 485, sumY);

  sumY += 13;
  doc.text('Processing Fee:', 360, sumY);
  doc.setTextColor(16, 185, 129);
  doc.text('Waived (Rs. 0.00)', 485, sumY);

  sumY += 13;
  doc.setTextColor(71, 85, 105);
  doc.text('Taxes / GST:', 360, sumY);
  doc.text('Included (Rs. 0.00)', 485, sumY);

  sumY += 8;
  doc.setDrawColor(203, 213, 225);
  doc.line(340, sumY, 555, sumY);

  sumY += 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL ORDER VALUE:', 280, sumY);
  doc.setTextColor(16, 185, 129);
  doc.text(`Rs. ${amountVal}`, 485, sumY);

  // 7. Security Notice & Footer
  const footY = 515;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(40, footY, 515, 50, 4, 4, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('DIGITAL AUDIT TRAIL & SYSTEM COMPLIANCE', 52, footY + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('This receipt was digitally generated by Ed-Trim Key & Trim Key Flow Payment Infrastructure.', 52, footY + 25);
  doc.text('Payment has been cryptographically confirmed and permanently committed to the immutable billing ledger.', 52, footY + 35);
  doc.text('All transactions comply with Reserve Bank of India (RBI) guidelines for online settlements.', 52, footY + 45);

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('EdTrimKey Support: support@ed.trimkey.in | Official Portal: https://ed.trimkey.in', 40, 585);
  doc.text(`Receipt Reference: ${ledId} | Generated on ${new Date().toLocaleString('en-IN')}`, 40, 597);

  return doc;
}

export function printReceipt(rec: BillingReceiptRecord, user: any) {
  let iframe = document.getElementById('receiptPrintIframe') as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'receiptPrintIframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
  }

  const ledId = rec.ledId || rec.id || 'LED-TRX';
  const amountVal = Number(rec.amount || 0).toFixed(2);
  const qtyVal = Number(rec.quantity || 1);
  const unitPriceVal = Number(rec.unitPrice || (Number(rec.amount || 0) / qtyVal) || 0).toFixed(2);
  const dateObj = rec.date ? new Date(rec.date) : new Date();
  const dateStr = dateObj.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = dateObj.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
  const customerName = rec.customerName || user?.name || user?.full_name || 'Institute Admin';
  const customerEmail = rec.customerEmail || user?.email || '';
  const customerPhone = rec.customerPhone || user?.phone || '';
  const instName = rec.instName || user?.institute || 'Keystone Public School';
  const instCode = rec.instCode || user?.code || 'KPS';
  const serviceName = rec.service || 'Subscription';
  const gatewayId = rec.gatewayPaymentId || rec.ref || 'pay_online_verified';

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt - ${ledId}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 20px; font-size: 13px; line-height: 1.5; }
          @media print { body { margin: 0; padding: 15px; } }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
          th, td { padding: 10px 12px; border: 1px solid #e2e8f0; text-align: left; }
          th { background: #f8fafc; font-weight: 700; color: #475569; }
        </style>
      </head>
      <body>
        <div style="border: 1px solid #cbd5e1; border-radius: 12px; padding: 25px;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #0284c7; padding-bottom:15px; margin-bottom:15px;">
            <div>
              <h2 style="color:#0284c7; margin:0; font-size:24px;">ED-TRIM KEY</h2>
              <p style="margin:4px 0 0 0; color:#64748b; font-size:11px;">OFFICIAL PAYMENT RECEIPT &amp; TAX INVOICE</p>
            </div>
            <div style="text-align:right;">
              <span style="font-size:11px; color:#64748b; font-weight:700;">TOTAL PAID</span>
              <h2 style="color:#059669; margin:2px 0 0 0; font-size:26px;">₹${amountVal}</h2>
            </div>
          </div>

          <div style="background:#f8fafc; padding:12px; border-radius:8px; margin-bottom:15px; font-size:11px; line-height:1.6;">
            <strong>Lalpur, Ranchi, Jharkhand - 834001, India</strong><br/>
            Contact: support@ed.trimkey.in | Phone: +91 8235400967 | UDYAM/MSME: JH-21-0019073
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:15px; font-size:12px;">
            <div style="border:1px solid #e2e8f0; padding:12px; border-radius:8px;">
              <strong style="color:#475569; font-size:11px; text-transform:uppercase;">TRANSACTION DETAILS</strong><br/>
              <strong>LED ID:</strong> ${ledId}<br/>
              <strong>Gateway Ref:</strong> ${gatewayId}<br/>
              <strong>Date:</strong> ${dateStr} (${timeStr})
            </div>
            <div style="border:1px solid #e2e8f0; padding:12px; border-radius:8px;">
              <strong style="color:#475569; font-size:11px; text-transform:uppercase;">BILLED TO</strong><br/>
              <strong>Customer:</strong> ${customerName}<br/>
              <strong>Institute:</strong> ${instName} (${instCode})<br/>
              <strong>Email:</strong> ${customerEmail}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Service Description</th>
                <th style="text-align:center;">Qty</th>
                <th style="text-align:right;">Unit Price</th>
                <th style="text-align:right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>${serviceName}</strong> Quota Top-Up</td>
                <td style="text-align:center;">${qtyVal}</td>
                <td style="text-align:right;">₹${unitPriceVal}</td>
                <td style="text-align:right; font-weight:700; color:#059669;">₹${amountVal}</td>
              </tr>
            </tbody>
          </table>

          <div style="text-align:right; margin-top:15px; font-size:12px;">
            <p style="margin:4px 0;">Subtotal: <strong>₹${amountVal}</strong></p>
            <p style="margin:4px 0; color:#059669;">Gateway Fee: <strong>Waived (₹0.00)</strong></p>
            <p style="margin:4px 0;">GST / Taxes: <strong>Included</strong></p>
            <h3 style="margin:10px 0 0 0; color:#059669; font-size:16px;">Total Paid: ₹${amountVal}</h3>
          </div>

          <div style="margin-top:25px; padding-top:12px; border-top:1px dashed #cbd5e1; font-size:10px; color:#94a3b8; text-align:center;">
            This is a computer-generated tax invoice verified by Trim Key Flow Payment Infrastructure. No physical signature required.
          </div>
        </div>
      </body>
    </html>
  `);
  doc.close();
  iframe.contentWindow?.focus();
  setTimeout(() => {
    iframe?.contentWindow?.print();
  }, 250);
}

interface BillingReceiptModalProps {
  receipt?: BillingReceiptRecord | null;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function BillingReceiptModal({
  receipt: propReceipt,
  isOpen: propIsOpen,
  onClose: propOnClose,
}: BillingReceiptModalProps = {}) {
  const { user, activeModal, modalData, closeModal, showAlert } = useDashboard();

  const isContextOpen = activeModal === 'billingReceipt';
  const isOpen = propIsOpen !== undefined ? propIsOpen : isContextOpen;
  const rec: BillingReceiptRecord = propReceipt || modalData || {};

  const handleClose = () => {
    if (propOnClose) propOnClose();
    else closeModal();
  };

  if (!isOpen) return null;

  const ledId = rec.ledId || rec.id || 'LED-TRX';
  const amountVal = Number(rec.amount || 0).toFixed(2);
  const qtyVal = Number(rec.quantity || 1);
  const unitPriceVal = Number(rec.unitPrice || (Number(rec.amount || 0) / qtyVal) || 0).toFixed(2);
  const dateObj = rec.date ? new Date(rec.date) : new Date();
  const dateStr = dateObj.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = dateObj.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();

  const customerName = rec.customerName || user?.name || user?.full_name || 'Institute Admin';
  const customerEmail = rec.customerEmail || user?.email || '';
  const customerPhone = rec.customerPhone || user?.phone || '';
  const instName = rec.instName || user?.institute || 'Keystone Public School';
  const instCode = rec.instCode || user?.code || 'KPS';
  const serviceName = rec.service || 'Subscription';
  const gatewayId = rec.gatewayPaymentId || rec.ref || 'pay_online_verified';
  const logoUrl = '/etk-logo.png';

  React.useEffect(() => {
    preloadReceiptLogo().catch(() => {});
  }, []);

  const handleDownloadPdf = async () => {
    try {
      const logo = await preloadReceiptLogo();
      const doc = generateReceiptPdf(rec, user, logo || undefined);
      doc.save(`EdTrimKey_Receipt_${ledId}.pdf`);
      showAlert('Official PDF Receipt downloaded successfully!', 'Success');
    } catch (err: any) {
      showAlert('PDF Generation error: ' + err.message, 'Error');
    }
  };

  const handleOpenPdf = async () => {
    try {
      const logo = await preloadReceiptLogo();
      const doc = generateReceiptPdf(rec, user, logo || undefined);
      const blobUrl = doc.output('bloburl');
      window.open(blobUrl, '_blank');
    } catch (err: any) {
      showAlert('PDF Preview error: ' + err.message, 'Error');
    }
  };

  const handlePrint = () => {
    printReceipt(rec, user);
  };

  return (
    <div
      className="glass-overlay active"
      style={{
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={handleClose}
    >
      <div
        className="glass-box"
        style={{
          maxWidth: '720px',
          width: '100%',
          maxHeight: '92vh',
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '24px',
          border: '1px solid rgba(38, 195, 234, 0.4)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.9)',
          background: 'rgba(11, 17, 30, 0.98)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 22px',
            background: 'var(--card)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(38, 195, 234, 0.15)',
                border: '1px solid rgba(38, 195, 234, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#26C3EA" strokeWidth="2.2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div>
              <div style={{ color: '#ffffff', fontSize: '15px', fontWeight: 800, letterSpacing: '0.3px' }}>
                Payment Receipt <span style={{ color: '#26C3EA' }}>&amp; Tax Invoice</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#00F5A0' }} />
                Cryptographically Verified • GST Compliant
              </div>
            </div>
          </div>

          <button
            type="button"
            className="close-minimal"
            onClick={handleClose}
            title="Close Receipt"
            aria-label="Close Receipt"
            style={{
              position: 'relative',
              top: 'auto',
              right: 'auto',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
            }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable Receipt Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px', color: '#fff' }}>
          <div
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '22px',
              fontFamily: 'inherit',
            }}
          >
            {/* Header with Logo */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                paddingBottom: '18px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                marginBottom: '18px',
                flexWrap: 'wrap',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '12px',
                    background: '#ffffff',
                    padding: '3px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <img src={logoUrl} alt="Ed-Trim Key Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '-0.5px', color: '#26C3EA' }}>ED-TRIM KEY</span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '2px 7px',
                        borderRadius: '4px',
                        background: 'rgba(38, 195, 234, 0.15)',
                        color: '#26C3EA',
                        border: '1px solid rgba(38, 195, 234, 0.3)',
                      }}
                    >
                      FLOW SETTLED
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '3px', fontWeight: 600 }}>
                    TAX INVOICE &amp; OFFICIAL PAYMENT RECEIPT
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>
                  Total Order Value
                </div>
                <div style={{ fontSize: '26px', fontWeight: 900, color: '#00F5A0', fontFamily: 'monospace', lineHeight: 1.1 }}>
                  ₹{amountVal}
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#00F5A0', fontWeight: 700, marginTop: '4px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  PAID &amp; SETTLED
                </div>
              </div>
            </div>

            {/* Issuer & Business Information */}
            <div
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '12px',
                padding: '14px 16px',
                marginBottom: '18px',
              }}
            >
              <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', fontWeight: 800, letterSpacing: '0.5px', marginBottom: '8px' }}>
                Issuer &amp; Business Information
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.85)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#26C3EA" strokeWidth="2" style={{ flexShrink: 0 }}>
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span><strong>Address:</strong> Lalpur, Ranchi, Jharkhand - 834001, India</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: 'rgba(255,255,255,0.85)', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#26C3EA" strokeWidth="2" style={{ flexShrink: 0 }}>
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    <span><strong>Phone:</strong> +91 8235400967</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#26C3EA" strokeWidth="2" style={{ flexShrink: 0 }}>
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    <span><strong>Email:</strong> support@trimkey.in</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.85)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#26C3EA" strokeWidth="2" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                  <span>
                    <strong>Website:</strong>{' '}
                    <a href="https://trimkey.in/ed" target="_blank" rel="noreferrer" style={{ color: '#26C3EA', textDecoration: 'none', fontWeight: 700 }}>
                      https://trimkey.in/ed
                    </a>{' '}
                    &bull;{' '}
                    <a href="https://flow.trimkey.in" target="_blank" rel="noreferrer" style={{ color: '#00F5A0', textDecoration: 'none', fontWeight: 700 }}>
                      https://flow.trimkey.in
                    </a>
                  </span>
                </div>
              </div>
            </div>

            {/* Meta Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '12px',
                padding: '14px 16px',
                marginBottom: '18px',
              }}
            >
              <div>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>Ledger Reference (LED ID)</div>
                <div style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 800, color: '#26C3EA', marginTop: '2px' }}>{ledId}</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>Date &amp; Time</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#fff', marginTop: '2px', lineHeight: 1.35 }}>
                  <div style={{ fontWeight: 700 }}>{dateStr}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>{timeStr} (IST)</div>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>Gateway Payment ID</div>
                <div style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginTop: '2px' }}>{gatewayId}</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>Payment Route</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginTop: '2px' }}>Trim Key Flow (Razorpay / UPI)</div>
              </div>
            </div>

            {/* Billed To & Institute Info */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '12px 14px' }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 800, letterSpacing: '0.5px', marginBottom: '5px' }}>
                  Billed To (Customer)
                </div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>{customerName}</div>
                {customerEmail && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>{customerEmail}</div>}
                {customerPhone && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>+91 {customerPhone}</div>}
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '12px 14px' }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 800, letterSpacing: '0.5px', marginBottom: '5px' }}>
                  Institute Details
                </div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>{instName}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
                  Institute Code: <strong>{instCode}</strong>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--success)', marginTop: '2px', fontWeight: 700 }}>
                  License Status: Active Verified
                </div>
              </div>
            </div>

            {/* Itemized Order Table */}
            <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '18px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: 'rgba(38, 195, 234, 0.1)', color: '#26C3EA' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 800, textTransform: 'uppercase', fontSize: '10px' }}>Item / Service Description</th>
                    <th style={{ padding: '10px 14px', fontWeight: 800, textTransform: 'uppercase', fontSize: '10px', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '10px 14px', fontWeight: 800, textTransform: 'uppercase', fontSize: '10px', textAlign: 'right' }}>Unit Price</th>
                    <th style={{ padding: '10px 14px', fontWeight: 800, textTransform: 'uppercase', fontSize: '10px', textAlign: 'right' }}>Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 800, color: '#fff', fontSize: '13px' }}>{serviceName} Quota Allocation</div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '3px' }}>
                        Top-up credit committed directly to institute operational ledger.
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: '#fff' }}>{qtyVal}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>₹{unitPriceVal}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#00F5A0', fontSize: '13px' }}>₹{amountVal}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Pricing Totals & Financial Breakdown */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '18px' }}>
              <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '7px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.6)' }}>
                  <span>Subtotal</span>
                  <span style={{ color: '#fff', fontWeight: 600 }}>₹{amountVal}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.6)' }}>
                  <span>Gateway &amp; Processing Fee</span>
                  <span style={{ color: '#00F5A0', fontWeight: 600 }}>Waived (₹0.00)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.6)' }}>
                  <span>Taxes / GST</span>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>Included</span>
                </div>
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '3px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 900, color: '#fff' }}>
                  <span>Total Paid</span>
                  <span style={{ color: '#00F5A0' }}>₹{amountVal}</span>
                </div>
              </div>
            </div>

            {/* Compliance & Notice */}
            <div
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px dashed rgba(255,255,255,0.1)',
                borderRadius: '10px',
                padding: '10px 14px',
                fontSize: '10px',
                color: 'rgba(255,255,255,0.45)',
                lineHeight: 1.5,
                textAlign: 'center',
              }}
            >
              This electronic receipt is computer-generated and verified by Trim Key Flow Payment Infrastructure. No physical signature is required. All digital transactions are permanently committed to the cryptographic ledger.
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            padding: '14px 22px',
            background: 'rgba(15, 23, 42, 0.95)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            justifyContent: 'flex-end',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <OpticalButton
            type="button"
            variant="secondary"
            onClick={handlePrint}
            style={{ padding: '9px 18px', fontSize: '12px' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print
          </OpticalButton>

          <OpticalButton
            type="button"
            variant="outline"
            onClick={handleOpenPdf}
            style={{ padding: '9px 18px', fontSize: '12px' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Open PDF
          </OpticalButton>

          <OpticalButton
            type="button"
            variant="success"
            onClick={handleDownloadPdf}
            style={{ padding: '9px 22px', fontSize: '12px' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download PDF Receipt
          </OpticalButton>
        </div>
      </div>
    </div>
  );
}

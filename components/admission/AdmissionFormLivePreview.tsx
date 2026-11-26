'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  ADMISSION_DOCUMENTS,
  AdmissionFormTemplate,
  AdmissionRecord,
  DEFAULT_FIELDS_CONFIG,
  computeFeeTotals,
  formatDdMmmYyyy,
  getKeystoneNumberedFields,
} from '@/lib/admissions';
import { ETK_LOGO_BASE64 } from '@/lib/logo-base64';

const MONTHS_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

interface AdmissionFormLivePreviewProps {
  record: AdmissionRecord;
  template: AdmissionFormTemplate;
  instituteInfo: { name: string; code: string; address?: string; email?: string; logoUrl?: string };
  photoPreviewUrl?: string;
  admNoPreviewHint?: string;
  rollNoPreviewHint?: string;
}

export function AdmissionFormLivePreview({
  record,
  template,
  instituteInfo,
  photoPreviewUrl,
  admNoPreviewHint,
  rollNoPreviewHint,
}: AdmissionFormLivePreviewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.75);

  useEffect(() => {
    const el = hostRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const update = () => {
      const w = el.clientWidth;
      if (w > 40) {
        setScale(Math.min(1, w / 595));
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const accent = template.branding.accentColor || '#008FD5';
  const variant = template.layoutVariant || 'keystone';
  const logoSrc = instituteInfo.logoUrl || ETK_LOGO_BASE64;
  const photoSrc = photoPreviewUrl || record.photoUrl || '';
  const sigSrc = template.branding.signatureUrl || '';
  const { gross, concession, net, paid, balance } = computeFeeTotals(record);
  const admNoDisplay = admNoPreviewHint || record.admissionNo || 'PENDING';
  const admDateDisplay = formatDdMmmYyyy(record.admissionDate) || '-';
  const numberedItems = getKeystoneNumberedFields(record, template);
  const visibleFields = (template.fieldsConfig || DEFAULT_FIELDS_CONFIG).filter((f) => f.visible);
  const rightWidget = template.branding.rightWidget || 'calling_grid';
  const bottomWidget = template.branding.bottomWidget || 'month_grid_3x12';

  const scaledHeight = Math.round(842 * scale);

  return (
    <div style={{ width: '100%' }}>
      <div
        ref={hostRef}
        style={{
          width: '100%',
          height: `${scaledHeight}px`,
          overflow: 'hidden',
          borderRadius: '10px',
          boxShadow: '0 14px 36px rgba(0, 0, 0, 0.38)',
          background: '#ffffff',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: '595px',
            height: '842px',
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            background: '#ffffff',
            color: '#0f172a',
            position: 'relative',
            overflow: 'hidden',
            fontFamily: '"Helvetica Neue", Arial, sans-serif',
            userSelect: 'none',
          }}
        >
          {/* Watermark */}
          {template.branding.watermarkText ? (
            <div
              style={{
                position: 'absolute',
                top: '48%',
                left: '50%',
                transform: 'translate(-50%, -50%) rotate(-35deg)',
                fontSize: '46px',
                fontWeight: 900,
                color: 'rgba(15, 23, 42, 0.05)',
                letterSpacing: '4px',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                zIndex: 0,
              }}
            >
              {template.branding.watermarkText.toUpperCase()}
            </div>
          ) : null}

          {variant === 'keystone' ? (
            /* ============================================================
               KEYSTONE 1-PAGE BORDERED SCHOOL ADMISSION FORM
               ============================================================ */
            <div
              style={{
                position: 'absolute',
                inset: '26px 26px 26px 26px',
                border: `2.2px solid ${accent}`,
                padding: '12px 18px 14px 18px',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 1,
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div
                  style={{
                    width: '62px',
                    height: '62px',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={logoSrc}
                    alt="Institute Logo"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>
                <div style={{ flex: 1, textAlign: 'center', paddingRight: '10px' }}>
                  <div
                    style={{
                      fontSize: (template.branding.headerTitle || '').length > 28 ? '19px' : '23px',
                      fontWeight: 900,
                      color: accent,
                      letterSpacing: '0.4px',
                      lineHeight: 1.05,
                    }}
                  >
                    {(template.branding.headerTitle || instituteInfo.name || 'ED-TRIM KEY INSTITUTE').toUpperCase()}
                  </div>

                  <div
                    style={{
                      marginTop: '4px',
                      background: '#0f1216',
                      color: '#ffffff',
                      fontSize: '7.5px',
                      fontWeight: 800,
                      padding: '3px 10px',
                      borderRadius: '4px',
                      letterSpacing: '0.35px',
                      display: 'inline-block',
                      maxWidth: '100%',
                    }}
                  >
                    {(
                      template.branding.addressBanner ||
                      instituteInfo.address ||
                      `INSTITUTE CODE: ${instituteInfo.code || 'ETK'}`
                    ).toUpperCase()}
                  </div>

                  {(template.branding.contactLine || instituteInfo.email) && (
                    <div
                      style={{
                        marginTop: '5px',
                        fontSize: '9px',
                        fontWeight: 800,
                        color: '#0f172a',
                        letterSpacing: '0.2px',
                      }}
                    >
                      {(template.branding.contactLine || `CONTACT : ${instituteInfo.email}`).toUpperCase()}
                    </div>
                  )}

                  <div style={{ marginTop: '6px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        border: `1.5px solid ${accent}`,
                        borderRadius: '6px',
                        padding: '3px 22px',
                        fontSize: '11px',
                        fontWeight: 900,
                        color: '#0f172a',
                        letterSpacing: '0.6px',
                      }}
                    >
                      {(template.branding.subHeader || 'ADMISSION FORM').toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sub-header Row: Adm No & Admission Date */}
              <div
                style={{
                  marginTop: '12px',
                  padding: '0 22px 6px 22px',
                  borderBottom: '1.2px solid #0f172a',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontSize: '11px',
                }}
              >
                <div>
                  <span>{record.status === 'Admitted' ? 'Admission No' : 'Application Ref'} : </span>
                  <strong style={{ fontWeight: 700 }}>{admNoDisplay}</strong>
                  {rollNoPreviewHint ? (
                    <span style={{ fontSize: '9.5px', marginLeft: '6px', color: '#475569' }}>({rollNoPreviewHint})</span>
                  ) : record.status === 'Admitted' && record.rollNo ? (
                    <span style={{ fontSize: '9.5px', marginLeft: '6px', color: '#475569' }}>(Roll: {record.rollNo})</span>
                  ) : null}
                </div>
                <div>
                  <span>Admission Date: </span>
                  <strong style={{ fontWeight: 700 }}>{admDateDisplay}</strong>
                </div>
              </div>

              {/* Body Two-Column Section */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '10px', flex: 1 }}>
                {/* Left Numbered List */}
                <div
                  style={{
                    flex: 1,
                    paddingLeft: '14px',
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontSize: numberedItems.length > 14 ? '9.5px' : '10.5px',
                    lineHeight: numberedItems.length > 14 ? 1.55 : 1.78,
                  }}
                >
                  {numberedItems.slice(0, 16).map((item, idx) => (
                    <div key={item.key} style={{ display: 'flex', gap: '4px', alignItems: 'baseline' }}>
                      <span style={{ minWidth: '18px' }}>{idx + 1}.</span>
                      <div>
                        <span>{item.label}: </span>
                        {item.value ? <strong style={{ fontWeight: 700 }}>{item.value}</strong> : null}
                      </div>
                    </div>
                  ))}

                  <div style={{ marginTop: '12px', fontWeight: 700, fontSize: '11px' }}>
                    {(template.branding.totalLabel || 'TOTAL AMOUNT').toUpperCase()}: {gross > 0 ? gross : ''}
                  </div>
                </div>

                {/* Right Column: Photo Box + Optional Widget */}
                <div style={{ width: '214px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <div
                    style={{
                      width: '96px',
                      height: '112px',
                      border: '1px solid #0f172a',
                      background: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'Georgia, "Times New Roman", serif',
                      fontSize: '11px',
                      overflow: 'hidden',
                      marginBottom: '10px',
                    }}
                  >
                    {photoSrc ? (
                      <img src={photoSrc} alt="Student" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      '{{PHOTO}}'
                    )}
                  </div>

                  {/* Right Widget Slot */}
                  {rightWidget === 'calling_grid' && (
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontFamily: 'Georgia, "Times New Roman", serif',
                        fontSize: '9.5px',
                      }}
                    >
                      <thead>
                        <tr>
                          <th style={{ border: '1px solid #0f172a', padding: '3px 5px', textAlign: 'left', width: '50%' }}>
                            Calling Date
                          </th>
                          <th style={{ border: '1px solid #0f172a', padding: '3px 5px', textAlign: 'left', width: '50%' }}>
                            Expected Date
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: 12 }).map((_, i) => (
                          <tr key={i}>
                            <td style={{ border: '1px solid #0f172a', height: '16px' }} />
                            <td style={{ border: '1px solid #0f172a', height: '16px' }} />
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {rightWidget === 'fee_summary' && (
                    <div style={{ width: '100%', border: '1px solid #0f172a', fontSize: '9px' }}>
                      <div style={{ background: '#f1f5f9', borderBottom: '1px solid #0f172a', padding: '4px 6px', fontWeight: 800, textAlign: 'center' }}>
                        FEE &amp; PAYMENT RECEIPT
                      </div>
                      <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Gross Total</span><span>Rs. {gross}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Concession</span><span>Rs. {concession}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}><span>Net Payable</span><span>Rs. {net}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#15803d' }}>
                          <span>Paid ({record.payMode || 'Cash'})</span><span>Rs. {paid}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: balance > 0 ? '#dc2626' : '#15803d', borderTop: '1px dashed #cbd5e1', paddingTop: '3px' }}>
                          <span>Balance Due</span><span>Rs. {balance}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {rightWidget === 'office_checklist' && (
                    <div style={{ width: '100%', border: '1px solid #0f172a', fontSize: '8.5px' }}>
                      <div style={{ background: '#f1f5f9', borderBottom: '1px solid #0f172a', padding: '4px 6px', fontWeight: 800, textAlign: 'center' }}>
                        OFFICE VERIFICATION CHECKLIST
                      </div>
                      <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {ADMISSION_DOCUMENTS.slice(0, 6).map((docName) => {
                          const checked = record.documents.includes(docName);
                          return (
                            <div key={docName} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span
                                style={{
                                  width: '11px',
                                  height: '11px',
                                  border: '1px solid #0f172a',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '8px',
                                  fontWeight: 900,
                                }}
                              >
                                {checked ? '✓' : ''}
                              </span>
                              <span>{docName}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {rightWidget === 'office_remarks' && (
                    <div style={{ width: '100%', border: '1px solid #0f172a', fontSize: '8.5px' }}>
                      <div style={{ background: '#f1f5f9', borderBottom: '1px solid #0f172a', padding: '4px 6px', fontWeight: 800, textAlign: 'center' }}>
                        OFFICE REMARKS / STAMP
                      </div>
                      <div style={{ padding: '8px', minHeight: '130px' }}>
                        {record.remarks ? (
                          <div style={{ fontSize: '8.5px', lineHeight: 1.5 }}>{record.remarks}</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginTop: '10px' }}>
                            {[1, 2, 3, 4].map((l) => (
                              <div key={l} style={{ borderBottom: '1px solid #cbd5e1' }} />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Full-Width Widget */}
              {bottomWidget === 'month_grid_3x12' && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8px', fontWeight: 800, marginTop: '8px' }}>
                  <tbody>
                    {[0, 1, 2].map((r) => (
                      <tr key={r}>
                        {MONTHS_SHORT.map((m) => (
                          <td key={m} style={{ border: '1px solid #0f172a', textAlign: 'center', padding: '2.5px 1px' }}>
                            {m}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {bottomWidget === 'installment_strip' && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '7.5px', marginTop: '8px' }}>
                  <thead>
                    <tr>
                      {['QUARTER 1 (APR-JUN)', 'QUARTER 2 (JUL-SEP)', 'QUARTER 3 (OCT-DEC)', 'QUARTER 4 (JAN-MAR)'].map((q) => (
                        <th key={q} style={{ border: '1px solid #0f172a', padding: '3px 4px', textAlign: 'center' }}>
                          {q}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {[1, 2, 3, 4].map((q) => (
                        <td key={q} style={{ border: '1px solid #0f172a', padding: '5px 6px', color: '#64748b' }}>
                          Paid / Receipt No:
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              )}

              {bottomWidget === 'docs_strip' && (
                <div style={{ border: '1px solid #0f172a', padding: '6px 10px', fontSize: '8px', marginTop: '8px' }}>
                  <strong>DOCUMENTS SUBMITTED: </strong>
                  <span>{record.documents.length > 0 ? record.documents.join('  •  ') : 'None marked'}</span>
                </div>
              )}

              {/* Declaration & Bottom Signatures */}
              <div style={{ marginTop: 'auto', paddingTop: '14px' }}>
                {template.branding.declarationText && (
                  <p
                    style={{
                      textAlign: 'center',
                      fontSize: '8.5px',
                      lineHeight: 1.35,
                      maxWidth: '390px',
                      margin: '0 auto 14px auto',
                      color: '#0f172a',
                    }}
                  >
                    {template.branding.declarationText}
                  </p>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    padding: '0 8px',
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontSize: '10.5px',
                  }}
                >
                  <div>Parent&apos;s Signature</div>
                  <div style={{ textAlign: 'center' }}>
                    {sigSrc ? (
                      <img
                        src={sigSrc}
                        alt="Director Signature"
                        style={{ height: '30px', objectFit: 'contain', display: 'block', margin: '0 auto 2px auto' }}
                      />
                    ) : (
                      <div style={{ height: '24px' }} />
                    )}
                    <div>{template.branding.signatureLabel || 'Signature of Director'}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ============================================================
               MODERN / CLASSIC / COMPACT LIVE PREVIEW
               ============================================================ */
            <div
              style={{
                width: '100%',
                height: '100%',
                border: variant === 'classic' ? `2px solid ${accent}` : 'none',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 1,
              }}
            >
              {/* Header */}
              <div
                style={{
                  background: variant === 'classic' ? '#f8fafc' : '#0f172a',
                  padding: variant === 'compact' ? '12px 24px' : '16px 26px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  borderBottom: variant === 'classic' ? `1.5px solid ${accent}` : 'none',
                }}
              >
                <div
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '6px',
                    background: '#ffffff',
                    padding: '3px',
                    flexShrink: 0,
                  }}
                >
                  <img src={logoSrc} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: variant === 'compact' ? '15px' : '17px',
                      fontWeight: 900,
                      color: variant === 'classic' ? '#0f172a' : accent,
                    }}
                  >
                    {(template.branding.headerTitle || instituteInfo.name || 'ED-TRIM KEY INSTITUTE').toUpperCase()}
                  </div>
                  <div style={{ fontSize: '8.5px', color: variant === 'classic' ? '#475569' : '#cbd5e1', marginTop: '2px' }}>
                    {template.branding.addressBanner || instituteInfo.address || `Institute Code: ${instituteInfo.code || 'ETK'}`}
                  </div>
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      color: variant === 'classic' ? accent : '#ffffff',
                      marginTop: '4px',
                    }}
                  >
                    {(template.branding.subHeader || 'OFFICIAL ADMISSION FORM').toUpperCase()}
                  </div>
                </div>
                <div
                  style={{
                    width: '58px',
                    height: '68px',
                    borderRadius: '5px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '7.5px',
                    fontWeight: 700,
                    color: '#94a3b8',
                    overflow: 'hidden',
                  }}
                >
                  {photoSrc ? (
                    <img src={photoSrc} alt="Student" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    'PHOTO'
                  )}
                </div>
              </div>

              <div style={{ padding: '14px 28px', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div
                  style={{
                    background: accent,
                    color: '#0f172a',
                    padding: '4px 10px',
                    fontSize: '8.5px',
                    fontWeight: 800,
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>ADM NO: {admNoDisplay}</span>
                  <span>STATUS: {String(record.status || 'ADMITTED').toUpperCase()}</span>
                </div>

                {/* 2-Column Dynamic Fields */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  {visibleFields.slice(0, 18).map((f, idx) => {
                    const val = f.isCustom
                      ? record.customFields?.[f.key] || '-'
                      : f.key === 'dob' || f.key === 'admissionDate'
                        ? formatDdMmmYyyy((record as any)[f.key]) || '-'
                        : f.key === 'address'
                          ? record.address || record.village || '-'
                          : (record as any)[f.key] || '-';
                    return (
                      <div
                        key={f.key}
                        style={{
                          padding: variant === 'compact' ? '4px 8px' : '6px 8px',
                          background: Math.floor(idx / 2) % 2 === 0 ? '#f8fafc' : '#ffffff',
                          borderBottom: '1px solid #e2e8f0',
                          borderRight: idx % 2 === 0 ? '1px solid #e2e8f0' : 'none',
                        }}
                      >
                        <div style={{ fontSize: '6.5px', fontWeight: 700, color: '#64748b' }}>
                          {f.label.toUpperCase()}
                        </div>
                        <div style={{ fontSize: '9px', fontWeight: 700, color: '#0f172a', marginTop: '1px' }}>
                          {String(val)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Docs + Fee Strip */}
                <div style={{ border: '1px solid #e2e8f0', background: '#f8fafc', padding: '6px 10px', borderRadius: '4px' }}>
                  <div style={{ fontSize: '7.5px', fontWeight: 700, color: '#475569' }}>SUBMITTED DOCUMENTS:</div>
                  <div style={{ fontSize: '8.5px', marginTop: '2px' }}>
                    {record.documents.length > 0 ? record.documents.join('  •  ') : 'None marked'}
                  </div>
                </div>

                <div style={{ border: '1px solid #e2e8f0' }}>
                  <div style={{ background: '#0f172a', color: '#ffffff', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', padding: '4px 8px', fontSize: '7.5px', fontWeight: 800 }}>
                    <span>FEE SUMMARY</span><span>GROSS</span><span>DISC</span><span>NET</span><span>PAID</span><span>DUE</span>
                  </div>
                  <div style={{ background: '#f8fafc', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', padding: '6px 8px', fontSize: '8.5px', fontWeight: 700 }}>
                    <span>Adm {record.admFee} | Mon {record.monthFee} | Kit {record.uniformFee}</span>
                    <span>Rs.{gross}</span>
                    <span>Rs.{concession}</span>
                    <span>Rs.{net}</span>
                    <span style={{ color: '#16a34a' }}>Rs.{paid}</span>
                    <span style={{ color: balance > 0 ? '#dc2626' : '#16a34a' }}>Rs.{balance}</span>
                  </div>
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
                  {template.branding.declarationText && (
                    <div style={{ fontSize: '7.5px', fontStyle: 'italic', color: '#475569', marginBottom: '22px' }}>
                      Declaration: {template.branding.declarationText}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '8.5px', color: '#475569' }}>
                    <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '4px', width: '150px', textAlign: 'center' }}>
                      Parent / Guardian Signature
                    </div>
                    <div style={{ width: '165px', textAlign: 'center' }}>
                      {sigSrc ? (
                        <img src={sigSrc} alt="Signature" style={{ height: '26px', objectFit: 'contain', margin: '0 auto 2px auto', display: 'block' }} />
                      ) : null}
                      <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '4px' }}>
                        {template.branding.signatureLabel || 'Principal / Authorized Signatory'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useRef, useState } from 'react';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';
import IOSSpinner from '@/components/ui/IOSSpinner';
import { OpticalButton } from '@/components/ui/OpticalGlass';
import ModalPortal from '@/components/ui/ModalPortal';
import { seedCachedAsset, uploadStudentPhotoBlobToStorage } from '@/lib/admissions';

interface PassportPhotoCropModalProps {
  open: boolean;
  imageSrc: string;
  instId: string;
  admissionNo: string;
  onClose: () => void;
  onCropped: (result: { dataUrl: string; publicUrl?: string; blob: Blob }) => void;
}

export function PassportPhotoCropModal({
  open,
  imageSrc,
  instId,
  admissionNo,
  onClose,
  onCropped,
}: PassportPhotoCropModalProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const cropperRef = useRef<Cropper | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!open || !imageSrc || !imgRef.current) return;

    if (cropperRef.current) {
      cropperRef.current.destroy();
      cropperRef.current = null;
    }

    // Standard passport portrait ratio (35mm x 45mm) matching the Admission Form photo box
    const instance = new Cropper(imgRef.current, {
      aspectRatio: 35 / 45,
      viewMode: 1,
      background: false,
      autoCropArea: 0.85,
      responsive: true,
      dragMode: 'move',
      cropBoxMovable: true,
      cropBoxResizable: true,
    });
    cropperRef.current = instance;

    return () => {
      instance.destroy();
      if (cropperRef.current === instance) {
        cropperRef.current = null;
      }
    };
  }, [open, imageSrc]);

  if (!open || !imageSrc) return null;

  const handleClose = () => {
    if (cropperRef.current) {
      cropperRef.current.destroy();
      cropperRef.current = null;
    }
    onClose();
  };

  const handleCropAndAttach = () => {
    if (!cropperRef.current || processing) return;

    const canvas = cropperRef.current.getCroppedCanvas({ width: 420, height: 540 });
    if (!canvas) return;

    setProcessing(true);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          setProcessing(false);
          return;
        }

        let publicUrl = '';
        if (instId) {
          const up = await uploadStudentPhotoBlobToStorage(instId, admissionNo, blob);
          if (up.success && up.url) {
            publicUrl = up.url;
            seedCachedAsset(up.url, dataUrl, 420, 540);
          }
        }
        seedCachedAsset(dataUrl, dataUrl, 420, 540);

        setProcessing(false);
        onCropped({ dataUrl, publicUrl: publicUrl || undefined, blob });
        handleClose();
      },
      'image/jpeg',
      0.9
    );
  };

  return (
    <ModalPortal>
      <div className="glass-overlay active" onClick={handleClose} style={{ zIndex: 100020 }}>
      <div
        className="glass-box"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px', width: '95%', textAlign: 'left', position: 'relative' }}
      >
        <div className="premium-sticky-header">
          <h2 style={{ color: 'var(--brand)', display: 'flex', alignItems: 'center', margin: 0, gap: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            Crop Passport Size Photo (35×45)
          </h2>
          <button type="button" className="close-minimal" onClick={handleClose} aria-label="Close" title="Close">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-scroll-body">
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', marginTop: '4px' }}>
            Drag, zoom, or resize to frame the student&apos;s face inside the passport portrait box.
          </p>

          <div
            style={{
              width: '100%',
              height: 'min(360px, 50vh)',
              background: '#000',
              borderRadius: '12px',
              overflow: 'hidden',
              marginBottom: '12px',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Passport Crop Preview"
              style={{ maxWidth: '100%', display: 'block' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <OpticalButton
              type="button"
              variant="outline"
              onClick={() => cropperRef.current?.zoom(0.1)}
              style={{ padding: '6px 12px', fontSize: '11px' }}
            >
              Zoom +
            </OpticalButton>
            <OpticalButton
              type="button"
              variant="outline"
              onClick={() => cropperRef.current?.zoom(-0.1)}
              style={{ padding: '6px 12px', fontSize: '11px' }}
            >
              Zoom −
            </OpticalButton>
            <OpticalButton
              type="button"
              variant="outline"
              onClick={() => cropperRef.current?.rotate(90)}
              style={{ padding: '6px 12px', fontSize: '11px' }}
            >
              Rotate 90°
            </OpticalButton>
            <OpticalButton
              type="button"
              variant="outline"
              onClick={() => cropperRef.current?.reset()}
              style={{ padding: '6px 12px', fontSize: '11px' }}
            >
              Reset
            </OpticalButton>
          </div>
        </div>

        <div className="modal-action-dock">
          <OpticalButton
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={processing}
            style={{ flex: 1 }}
          >
            Cancel
          </OpticalButton>
          <OpticalButton
            type="button"
            variant="primary"
            onClick={handleCropAndAttach}
            disabled={processing}
            style={{ flex: 1, minHeight: '42px', justifyContent: 'center' }}
          >
            {processing ? <IOSSpinner size={16} color="#05080F" /> : 'Crop & Upload Photo'}
          </OpticalButton>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}

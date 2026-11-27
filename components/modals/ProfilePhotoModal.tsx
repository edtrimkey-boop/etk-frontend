// components/modals/ProfilePhotoModal.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';
import { useDashboard } from '@/lib/dashboard-context';
import { serverCall } from '@/lib/api-client';
import { supabase } from '@/lib/supabase';
import IOSSpinner from '@/components/ui/IOSSpinner';
import { OpticalButton } from '@/components/ui/OpticalGlass';
import { playSound } from '@/lib/sound';

export default function ProfilePhotoModal() {
  const { activeModal, modalData, closeModal, user, updateUserAvatar, showAlert, showLoader, hideLoader, refreshData } =
    useDashboard();
  const isOpen = activeModal === 'adjustProfilePic';
  const mode: 'profile' | 'logo' = modalData?.mode === 'logo' ? 'logo' : 'profile';

  const [imageSrc, setImageSrc] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);
  const cropperRef = useRef<Cropper | null>(null);

  useEffect(() => {
    if (isOpen && modalData?.imageSrc) {
      setImageSrc(modalData.imageSrc);
    } else {
      setImageSrc('');
    }
  }, [isOpen, modalData]);

  // Initialize Cropper.js cleanly (mirrored from index.html cropperOverlay logic)
  useEffect(() => {
    if (!isOpen || !imageSrc || !imgRef.current) return;

    if (cropperRef.current) {
      cropperRef.current.destroy();
      cropperRef.current = null;
    }

    const instance = new Cropper(imgRef.current, {
      aspectRatio: 1,
      viewMode: 1,
      background: false,
      autoCropArea: 0.8,
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
  }, [isOpen, imageSrc]);

  if (!isOpen || !imageSrc) return null;

  const handleClose = () => {
    if (cropperRef.current) {
      cropperRef.current.destroy();
      cropperRef.current = null;
    }
    closeModal();
  };

  const handleCropAndUpload = () => {
    if (!cropperRef.current || uploading) return;

    const canvas = cropperRef.current.getCroppedCanvas({ width: 500, height: 500 });
    if (!canvas) {
      playSound('error');
      showAlert('Could not generate cropped image. Please try selecting another image.', 'Crop Error');
      return;
    }

    const isLogo = mode === 'logo';
    const mimeType = isLogo ? 'image/png' : 'image/jpeg';
    const quality = isLogo ? 0.95 : 0.9;

    setUploading(true);
    showLoader(isLogo ? 'UPLOADING INSTITUTE LOGO...' : 'UPLOADING PROFILE PICTURE...');

    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          hideLoader();
          setUploading(false);
          playSound('error');
          showAlert('Failed to encode image.', 'Upload Error');
          return;
        }

        const safeCode = String(
          (isLogo ? modalData?.instCode || modalData?.instId : user?.code || user?.id) || 'TK'
        ).replace(/[^a-zA-Z0-9_-]/g, '');

        const fileName = isLogo
          ? `logo_${safeCode}_${Date.now()}.png`
          : `profile_${safeCode}_${Date.now()}.jpg`;
        const bucket = isLogo ? 'logo' : 'profile_pics';

        try {
          let finalUrl = '';

          // Primary path: upload cropped 500x500 Blob directly to Supabase Storage bucket
          const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(fileName, blob, { contentType: mimeType, upsert: true });

          if (!uploadError) {
            const { data: pubData } = supabase.storage.from(bucket).getPublicUrl(fileName);
            finalUrl = pubData?.publicUrl || '';
          }

          let res: any;
          if (isLogo) {
            const targetInstId = modalData?.instId || user?.institute_id || user?.instId;
            if (finalUrl) {
              res = await serverCall('updateInstituteLogo', { instId: targetInstId, url: finalUrl });
            } else {
              const dataUrl = canvas.toDataURL(mimeType, quality);
              const fileBase64 = dataUrl.split(',')[1];
              res = await serverCall('updateInstituteLogo', {
                instId: targetInstId,
                instCode: safeCode,
                fileBase64,
                mimeType,
              });
              finalUrl = res?.url || '';
            }
          } else {
            if (finalUrl) {
              res = await serverCall('updateProfilePic', { email: user?.email, url: finalUrl });
            } else {
              const dataUrl = canvas.toDataURL(mimeType, quality);
              const fileBase64 = dataUrl.split(',')[1];
              res = await serverCall('updateProfilePic', {
                email: user?.email,
                fileBase64,
                mimeType,
              });
              finalUrl = res?.url || '';
            }
          }

          hideLoader();
          if (res && res.success) {
            playSound('success');
            if (!isLogo && finalUrl) {
              updateUserAvatar(finalUrl);
            }
            if (typeof modalData?.onComplete === 'function') {
              modalData.onComplete(finalUrl);
            }
            handleClose();
            refreshData(true);
            showAlert(
              isLogo ? 'Institute Logo Updated Successfully!' : 'Profile Picture Updated Successfully!',
              'Success'
            );
          } else {
            playSound('error');
            showAlert('Database Update Failed: ' + (res?.message || 'Unknown error'), 'Error');
          }
        } catch (err: any) {
          hideLoader();
          playSound('error');
          showAlert('Upload Error: ' + (err?.message || 'Network failure'), 'Error');
        } finally {
          setUploading(false);
        }
      },
      mimeType,
      quality
    );
  };

  const titleText =
    modalData?.title || (mode === 'logo' ? 'Adjust Institute Logo (1:1)' : 'Adjust Profile Picture');
  const subtitleText =
    modalData?.subtitle ||
    (mode === 'logo'
      ? 'Drag and resize to fit a crisp 1:1 square emblem for headers & question papers.'
      : 'Drag to position and scale to perfectly fit the 1:1 ratio.');
  const uploadBtnLabel = mode === 'logo' ? 'Upload Logo' : 'Upload Photo';

  return (
    <div className="glass-overlay active" onClick={handleClose} style={{ zIndex: 100000 }}>
      <div
        className="glass-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '500px',
          width: '95%',
          textAlign: 'left',
          position: 'relative',
        }}
      >
        <div className="premium-sticky-header">
          <h2 style={{ color: 'var(--brand)', display: 'flex', alignItems: 'center', margin: 0 }}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              style={{ marginRight: '8px' }}
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            {titleText}
          </h2>
          <button
            type="button"
            className="close-minimal"
            onClick={handleClose}
            aria-label="Close"
            title="Close"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-scroll-body">
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', marginTop: '6px' }}>
            {subtitleText}
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
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
            }}
          >
            <img
              ref={imgRef}
              id="cropperImage"
              src={imageSrc}
              alt="Crop Preview"
              style={{ maxWidth: '100%', display: 'block' }}
            />
          </div>
        </div>

        <div className="modal-action-dock">
          <OpticalButton
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={uploading}
            style={{ flex: 1, padding: '12px' }}
          >
            Cancel
          </OpticalButton>
          <OpticalButton
            type="button"
            variant="primary"
            onClick={handleCropAndUpload}
            disabled={uploading}
            style={{ flex: 1, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '44px' }}
          >
            {uploading ? <IOSSpinner size={18} color="#05080F" /> : uploadBtnLabel}
          </OpticalButton>
        </div>
      </div>
    </div>
  );
}

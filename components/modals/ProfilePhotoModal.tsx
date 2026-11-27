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
      showAlert('Could not generate cropped image. Please try selecting another photo.', 'Crop Error');
      return;
    }

    setUploading(true);
    showLoader('UPLOADING PROFILE PICTURE...');

    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          hideLoader();
          setUploading(false);
          playSound('error');
          showAlert('Failed to encode image.', 'Upload Error');
          return;
        }

        const safeCode = String(user?.code || user?.id || 'TK').replace(/[^a-zA-Z0-9_-]/g, '');
        const fileName = `profile_${safeCode}_${Date.now()}.jpg`;

        try {
          let finalUrl = '';

          // Primary path (mirrored from index.html): upload Blob directly to Supabase Storage `profile_pics`
          const { error: uploadError } = await supabase.storage
            .from('profile_pics')
            .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });

          if (!uploadError) {
            const { data: pubData } = supabase.storage.from('profile_pics').getPublicUrl(fileName);
            finalUrl = pubData?.publicUrl || '';
          }

          let res: any;
          if (finalUrl) {
            res = await serverCall('updateProfilePic', { email: user?.email, url: finalUrl });
          } else {
            // Fallback path via backend admin storage if bucket policy blocks direct anon upload
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            const fileBase64 = dataUrl.split(',')[1];
            res = await serverCall('updateProfilePic', {
              email: user?.email,
              fileBase64,
              mimeType: 'image/jpeg',
            });
            finalUrl = res?.url || '';
          }

          hideLoader();
          if (res && res.success) {
            playSound('success');
            if (finalUrl) updateUserAvatar(finalUrl);
            handleClose();
            refreshData(true);
            showAlert('Profile Picture Updated Successfully!', 'Success');
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
      'image/jpeg',
      0.9
    );
  };

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
            Adjust Profile Picture
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
            Drag to position and scale to perfectly fit the 1:1 ratio.
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
            {uploading ? <IOSSpinner size={18} color="#05080F" /> : 'Upload Photo'}
          </OpticalButton>
        </div>
      </div>
    </div>
  );
}

// components/modals/ProfilePhotoModal.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import { serverCall } from '@/lib/api-client';
import IOSSpinner from '@/components/ui/IOSSpinner';
import { OpticalButton } from '@/components/ui/OpticalGlass';
import { playSound } from '@/lib/sound';

export default function ProfilePhotoModal() {
  const { activeModal, modalData, closeModal, user, updateUserAvatar, showAlert, showLoader, hideLoader } =
    useDashboard();
  const isOpen = activeModal === 'adjustProfilePic';

  const [imageSrc, setImageSrc] = useState<string>('');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [uploading, setUploading] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && modalData?.imageSrc) {
      setImageSrc(modalData.imageSrc);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [isOpen, modalData]);

  if (!isOpen || !imageSrc) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleSaveAndUpload = async () => {
    if (!imgRef.current) return;
    setUploading(true);
    showLoader('UPLOADING PROFILE PICTURE...');

    try {
      // Render to 500x500 canvas
      const canvas = document.createElement('canvas');
      canvas.width = 500;
      canvas.height = 500;
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('Canvas not supported');

      ctx.fillStyle = '#0b111e';
      ctx.fillRect(0, 0, 500, 500);

      // Save canvas state
      ctx.save();
      // Translate to center
      ctx.translate(250, 250);
      ctx.scale(zoom, zoom);
      ctx.translate(pan.x * 2, pan.y * 2);

      const img = imgRef.current;
      const aspect = img.naturalWidth / img.naturalHeight;
      let drawW = 500;
      let drawH = 500;
      if (aspect > 1) {
        drawW = 500 * aspect;
      } else {
        drawH = 500 / aspect;
      }

      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const base64 = dataUrl.split(',')[1];

      const res = await serverCall('updateProfilePic', {
        email: user?.email,
        fileBase64: base64,
        mimeType: 'image/jpeg',
      });

      if (res && res.success) {
        playSound('success');
        const finalUrl = res.url || dataUrl;
        updateUserAvatar(finalUrl);
        closeModal();
        showAlert('Profile Picture Updated Successfully!', 'Success');
      } else {
        playSound('error');
        showAlert(res?.message || 'Database update failed.', 'Error');
      }
    } catch (err: any) {
      playSound('error');
      showAlert('Failed to process image: ' + err.message, 'Upload Error');
    } finally {
      hideLoader();
      setUploading(false);
    }
  };

  return (
    <div className="glass-overlay active" onClick={closeModal} style={{ zIndex: 100000 }}>
      <div
        className="glass-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '500px',
          width: '95%',
          padding: '35px',
          textAlign: 'left',
          maxHeight: '90vh',
          overflowY: 'auto',
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
            onClick={closeModal}
            style={{ position: 'relative', top: 0, right: 0 }}
          >
            ✖
          </button>
        </div>

        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '18px', marginTop: '8px' }}>
          Drag to position and zoom to fit the 1:1 circular profile ratio.
        </p>

        {/* Cropper Viewport */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            width: '260px',
            height: '260px',
            margin: '0 auto 20px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '3px solid var(--brand)',
            boxShadow: '0 0 30px rgba(0,251,166,0.25), inset 0 0 20px rgba(0,0,0,0.8)',
            position: 'relative',
            cursor: isDragging ? 'grabbing' : 'grab',
            background: '#070b13',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none',
          }}
        >
          <img
            ref={imgRef}
            src={imageSrc}
            alt="Adjust Crop"
            draggable={false}
            style={{
              maxWidth: 'none',
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              pointerEvents: 'none',
              objectFit: 'contain',
              height: '100%',
            }}
          />
        </div>

        {/* Zoom Slider */}
        <div style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>ZOOM:</span>
          <input
            type="range"
            min="1"
            max="3"
            step="0.05"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            style={{
              flex: 1,
              accentColor: 'var(--brand)',
              height: '4px',
              borderRadius: '2px',
              cursor: 'pointer',
            }}
          />
          <span style={{ fontSize: '11px', color: 'var(--brand)', fontWeight: 800, width: '35px' }}>
            {zoom.toFixed(1)}x
          </span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <OpticalButton
            type="button"
            variant="outline"
            onClick={closeModal}
            style={{ flex: 1, padding: '12px' }}
          >
            Cancel
          </OpticalButton>
          <OpticalButton
            type="button"
            variant="primary"
            onClick={handleSaveAndUpload}
            disabled={uploading}
            style={{ flex: 1, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            {uploading ? (
              <>
                <IOSSpinner size={16} color="#05080F" />
                <span>Uploading...</span>
              </>
            ) : (
              'Upload Photo'
            )}
          </OpticalButton>
        </div>
      </div>
    </div>
  );
}

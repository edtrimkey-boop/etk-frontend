'use client';

import React, { useState } from 'react';
import { OpticalSurface } from '@/components/ui/OpticalGlass';

export default function SaraWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const toggleSara = (open: boolean) => {
    setIsOpen(open);
  };

  const reloadSara = () => {
    setIsLoading(true);
    const iframe = document.getElementById('sara-chat-iframe') as HTMLIFrameElement;
    if (iframe) {
      iframe.src = iframe.src;
    }
  };

  return (
    <div id="sara-chat-widget">
      {/* Floating Brand Icon Button */}
      <button
        id="sara-chat-btn"
        className={isOpen ? 'hidden' : ''}
        onClick={() => toggleSara(true)}
        aria-label="Open Chat with Sara AI"
        type="button"
        style={{ background: 'transparent', border: 'none', padding: 0 }}
      >
        <OpticalSurface
          radius={999}
          style={{ width: '100%', height: '100%', justifyContent: 'center', padding: '5px' }}
        >
          <div className="sara-chat-icon" style={{ width: '100%', height: '100%' }}>
            <img
              src="https://ypmnsgpohaaavbjdqjye.supabase.co/storage/v1/object/public/logo/1115.gif"
              alt="Sara AI"
              className="sara-logo-img"
              loading="eager"
            />
          </div>
        </OpticalSurface>
        <span className="sara-pulse-dot" title="Sara AI is Online" />
        <div className="sara-tooltip">
          <span>
            Chat with <strong>Sara AI</strong> ✨
          </span>
        </div>
      </button>

      {/* Chat Window Modal */}
      <div
        id="sara-chat-modal"
        className={isOpen ? 'active' : ''}
        role="dialog"
        aria-modal="true"
        aria-label="Sara AI Chat Window"
      >
        <div id="sara-chat-header">
          <div className="sara-header-left">
            <div className="sara-header-icon">
              <img
                src="https://ypmnsgpohaaavbjdqjye.supabase.co/storage/v1/object/public/logo/1115.gif"
                alt="Sara AI"
                className="sara-header-img"
                loading="eager"
              />
            </div>
            <div>
              <div className="sara-header-title">
                Ed-Trim Key / <span>Sara AI</span>
              </div>
              <div className="sara-header-sub">
                <span
                  className="sara-pulse-dot"
                  style={{
                    position: 'static',
                    width: '7px',
                    height: '7px',
                    border: 'none',
                    boxShadow: 'none',
                  }}
                />{' '}
                Active Academic Assistant
              </div>
            </div>
          </div>

          <div className="sara-header-actions">
            <button
              type="button"
              className="sara-action-btn sara-reload-btn"
              onClick={reloadSara}
              title="Reload Sara AI"
              aria-label="Reload Sara AI"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
              </svg>
            </button>
            <button
              type="button"
              className="sara-action-btn sara-close-btn"
              onClick={() => toggleSara(false)}
              title="Close Sara AI"
              aria-label="Close Sara AI"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="sara-body-wrapper">
          {isLoading && (
            <div id="sara-iframe-loader">
              <div className="sara-spinner" />
              <div className="sara-loader-text">Connecting to Sara AI...</div>
            </div>
          )}
          <iframe
            id="sara-chat-iframe"
            src="https://sara.trimkey.in"
            title="Sara AI Chat"
            allow="clipboard-write; clipboard-read; microphone; camera"
            onLoad={() => setIsLoading(false)}
          />
        </div>
      </div>
    </div>
  );
}

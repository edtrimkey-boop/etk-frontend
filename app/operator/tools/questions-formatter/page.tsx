'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function QuestionsFormatterPage() {
  const [inputText, setInputText] = useState('');
  const [fileName, setFileName] = useState('');
  const [previewList, setPreviewList] = useState<any[]>([]);

  function parseMCQs(text: string) {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l);
    const questions: any[] = [];
    let q: any = null;

    const optionPattern = /^[A-Da-d][).]\s*(.+)/;
    const dashOptionPattern = /^[-•]\s*(.+)/;
    const starredQuestion = /^[-*]\s*\*?(.+?)\*?$/;
    const numberedQ = /^(\d+)[).:-]\s*(.+)/;
    const answerLine = /^Answer:\s*/i;

    for (const line of lines) {
      if (answerLine.test(line)) continue;

      if (/^Question\s*\d*[:.]/i.test(line) || numberedQ.test(line)) {
        if (q) questions.push(q);
        q = { question: line.replace(/^Question\s*\d*[:.]\s*/i, '').replace(numberedQ, '$2'), options: [] };
      } else if (starredQuestion.test(line)) {
        if (q) questions.push(q);
        q = { question: line.replace(starredQuestion, '$1'), options: [] };
      } else if (optionPattern.test(line)) {
        const match = line.match(optionPattern);
        if (q && match) q.options.push(match[1].trim());
      } else if (dashOptionPattern.test(line)) {
        const match = line.match(dashOptionPattern);
        if (q && match) q.options.push(match[1].trim());
      } else if (line.toLowerCase() === 'options:') {
        continue;
      } else if (q && q.options.length < 4) {
        q.options.push(line);
      }
    }

    if (q) questions.push(q);
    return questions;
  }

  const handleFormat = () => {
    if (!inputText.trim()) {
      alert('Please enter or paste some MCQs first.');
      return;
    }
    const questions = parseMCQs(inputText);
    setPreviewList(questions);
  };

  const handleDownload = () => {
    alert('DOCX generation endpoint will export this formatted set via backend.');
  };

  return (
    <div style={{ height: '100vh', width: '100vw', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <header className="top-bar">
        <div className="brandRow">
          <Link href="/dashboard" className="liquid-glass glass-circle-btn" style={{ marginRight: '10px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <div className="glass-title-pill brand">
            <span style={{ fontSize: '14px', color: 'var(--text)', fontWeight: 900, textTransform: 'uppercase' }}>
              MCQ Questions Formatter
            </span>
          </div>
        </div>
      </header>

      <div className="app-container" style={{ flex: 1, padding: '30px', maxWidth: '1100px', margin: '0 auto', width: '100%', overflowY: 'auto' }}>
        <div className="panel">
          <div className="panel-header">
            <h3>Input Questions</h3>
            <span style={{ fontSize: '12px', color: 'var(--brand)', fontWeight: 700 }}>
              Parsed: {previewList.length} Questions
            </span>
          </div>

          <textarea
            style={{
              width: '100%',
              height: '240px',
              fontSize: '14px',
              padding: '15px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--card-light)',
              color: 'var(--text)',
              marginBottom: '15px',
              fontFamily: 'monospace',
            }}
            placeholder="Paste your unformatted MCQs here..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />

          <input
            type="text"
            placeholder="File name (optional)"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
          />

          <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
            <button type="button" className="liquid-glass btn-primary" onClick={handleFormat} style={{ flex: 1 }}>
              🧾 Format & Preview
            </button>
            <button type="button" className="liquid-glass btn-secondary" onClick={handleDownload} style={{ flex: 1 }}>
              ⬇️ Export DOCX
            </button>
          </div>
        </div>

        {/* Live Formatted Preview */}
        {previewList.length > 0 && (
          <div className="panel" style={{ marginTop: '25px', borderLeft: '4px solid var(--brand)' }}>
            <div className="panel-header">
              <h3>Formatted Output Preview</h3>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '25px', borderRadius: '12px' }}>
              {previewList.map((item, idx) => (
                <div key={idx} style={{ marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '15px' }}>
                  <p style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text)', margin: '0 0 10px 0' }}>
                    {idx + 1}. {item.question}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                    {item.options.map((opt: string, optIdx: number) => {
                      const labels = ['a)', 'b)', 'c)', 'd)'];
                      return (
                        <div key={optIdx} style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                          <span style={{ color: 'var(--brand)', fontWeight: 700 }}>{labels[optIdx] || '•'}</span> {opt}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

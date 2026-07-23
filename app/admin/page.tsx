'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Submission {
  _id: string;
  email: string;
  question: string;
  status: 'pending' | 'resolved' | 'promoted';
  timestamp: string;
}

interface Note {
  _id: string;
  title: string;
  subtitle?: string;
  slug: { current: string };
  date: string;
  tags?: string[];
  answer: string;
  image?: {
    asset?: {
      _ref?: string;
    };
  };
}

export default function AdminPortal() {
  const router = useRouter();
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'submissions' | 'notes' | 'template'>('submissions');
  
  // Data States
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [templateContent, setTemplateContent] = useState('');
  
  // UI States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Submissions Modal states
  const [promoteId, setPromoteId] = useState<string | null>(null);
  const [promoteTitle, setPromoteTitle] = useState('');
  const [promoteQuestion, setPromoteQuestion] = useState('');

  // ── RICH NOTE EDITOR STATES ──
  const [noteFormOpen, setNoteFormOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteSubtitle, setNoteSubtitle] = useState('');
  const [noteSlug, setNoteSlug] = useState('');
  const [noteDate, setNoteDate] = useState('');
  const [noteTagsList, setNoteTagsList] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [noteAnswer, setNoteAnswer] = useState('');
  const [noteImageFile, setNoteImageFile] = useState<File | null>(null);
  const [saveStatusIndicator, setSaveStatusIndicator] = useState('Saved');
  
  // Custom UX features: Dark mode toggle & Section dropdowns
  const [isDarkMode, setIsDarkMode] = useState(false); // Light by default
  const [showSectionDropdown, setShowSectionDropdown] = useState(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);

  // Template Save state
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, [activeTab]);

  const fetchInitialData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'submissions') {
        const res = await fetch('/api/admin/submissions');
        if (!res.ok) {
          if (res.status === 401) { router.push('/admin/login'); return; }
          throw new Error('Failed to load submissions');
        }
        const data = await res.json();
        setSubmissions(data.submissions || []);
      } else if (activeTab === 'notes') {
        const res = await fetch('/api/admin/notes');
        if (!res.ok) {
          if (res.status === 401) { router.push('/admin/login'); return; }
          throw new Error('Failed to load notes');
        }
        const data = await res.json();
        setNotes(data.notes || []);
      } else if (activeTab === 'template') {
        const res = await fetch('/api/admin/template');
        if (!res.ok) {
          if (res.status === 401) { router.push('/admin/login'); return; }
          throw new Error('Failed to load main page');
        }
        const data = await res.json();
        setTemplateContent(data.content || '');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const handleSubmissionAction = async (id: string, action: string, extra = {}) => {
    setActionLoading(id);
    try {
      const res = await fetch('/api/admin/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, submissionId: id, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Operation failed');
      await fetchInitialData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
      setPromoteId(null);
    }
  };

  const startPromote = (sub: Submission) => {
    setPromoteId(sub._id);
    setPromoteQuestion(sub.question);
    const words = sub.question.split(' ').slice(0, 8).join(' ');
    setPromoteTitle(words.endsWith('?') ? words : words + '...');
  };

  // Editor Actions
  const openNewNoteForm = () => {
    setEditingNoteId(null);
    setNoteTitle('');
    setNoteSubtitle('');
    setNoteSlug('');
    setNoteDate(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
    setNoteTagsList(['General']);
    setNoteAnswer('');
    setNoteImageFile(null);
    setSaveStatusIndicator('Saved');
    setShowSettingsDrawer(false);
    setIsDarkMode(false); // default light background
    setNoteFormOpen(true);
  };

  const openEditNoteForm = (note: Note) => {
    setEditingNoteId(note._id);
    setNoteTitle(note.title);
    setNoteSubtitle(note.subtitle || '');
    setNoteSlug(note.slug?.current || '');
    setNoteDate(note.date || '');
    setNoteTagsList(note.tags || []);
    setNoteAnswer(note.answer || '');
    setNoteImageFile(null);
    setSaveStatusIndicator('Saved');
    setShowSettingsDrawer(false);
    setIsDarkMode(false);
    setNoteFormOpen(true);
  };

  const handleNoteSubmit = async () => {
    setSaveStatusIndicator('Saving...');
    try {
      const formData = new FormData();
      formData.append('action', editingNoteId ? 'edit' : 'create');
      if (editingNoteId) {
        formData.append('noteId', editingNoteId);
      }
      formData.append('title', noteTitle);
      formData.append('subtitle', noteSubtitle);
      formData.append('slug', noteSlug || noteTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
      formData.append('date', noteDate);
      formData.append('tags', noteTagsList.join(','));
      formData.append('answer', noteAnswer);
      if (noteImageFile) {
        formData.append('image', noteImageFile);
      }

      const res = await fetch('/api/admin/notes', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save note');

      setSaveStatusIndicator('Saved');
      setNoteFormOpen(false);
      await fetchInitialData();
    } catch (err: any) {
      alert(err.message);
      setSaveStatusIndicator('Error');
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm('Are you sure you want to delete this community note?')) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('action', 'delete');
      formData.append('noteId', id);

      const res = await fetch('/api/admin/notes', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete note');
      await fetchInitialData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    setSaveStatus('Saving and compiling...');
    try {
      const res = await fetch('/api/admin/template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: templateContent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save main page');
      setSaveStatus('Saved! A background rebuild & Vercel deployment has been triggered.');
    } catch (err: any) {
      setSaveStatus(`Error: ${err.message}`);
    }
  };

  // Helper formatting injectors
  const injectFormat = (tagOpen: string, tagClose: string) => {
    const textarea = document.getElementById('editor-textarea') as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    const replacement = tagOpen + selected + tagClose;
    setNoteAnswer(text.substring(0, start) + replacement + text.substring(end));
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tagOpen.length, start + tagOpen.length + selected.length);
    }, 50);
  };

  // Handle uploading asset and inserting HTML image tag in the middle of text selection
  const handleInlineImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setSaveStatusIndicator('Uploading image...');
    try {
      const formData = new FormData();
      formData.append('action', 'upload_asset');
      formData.append('file', file);
      
      const res = await fetch('/api/admin/notes', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload image');
      
      const imgHtml = `\n<img src="${data.url}" alt="${file.name}" style="width: 100%; max-width: 100%; border-radius: 4px; border: 1px solid var(--rule); margin: 24px 0;" />\n`;
      injectFormat(imgHtml, '');
      setSaveStatusIndicator('Saved');
    } catch (err: any) {
      alert(err.message);
      setSaveStatusIndicator('Error');
    }
  };

  // Predefined structural design components from main page to insert
  const insertComponentSection = (type: string) => {
    let htmlSnippet = '';
    
    if (type === 'clause_card') {
      htmlSnippet = `\n<div style="border: 1px solid #e0e0e0; padding: 20px; margin: 24px 0; border-left: 4px solid #2f5d8a; background-color: #fcfcfb;">\n  <span style="font-family: monospace; font-size: 11px; text-transform: uppercase; color: #2f5d8a; font-weight: 600; letter-spacing: 0.05em;">Clause 3.4.5.1 (BS 8110)</span>\n  <h4 style="margin: 8px 0; font-family: Lora, serif; font-size: 16px; font-weight: 500;">Flexural Shear Reinforcement Capacity</h4>\n  <p style="margin: 0; font-size: 13.5px; line-height: 1.6; color: #444444;">Detailed engineering description of the requirements goes here...</p>\n</div>\n`;
    } else if (type === 'formula_block') {
      htmlSnippet = `\n<div style="text-align: center; margin: 24px 0; padding: 16px; background-color: #f8fafc; border: 1px solid #e5e5e5; font-family: Lora, serif; font-size: 17px;">\n  \\[ v_c = \\frac{0.79 \\left( \\frac{100 A_s}{b_d} \\right)^{1/3} \\left( \\frac{400}{d} \\right)^{1/4}}{\\gamma_m} \\]\n</div>\n`;
    } else if (type === 'ref_table') {
      htmlSnippet = `\n<table style="width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 13px; font-family: monospace;">\n  <thead>\n    <tr style="border-bottom: 2px solid #0f0f0f; text-align: left; background-color: #fcfcfb;">\n      <th style="padding: 8px;">Bar Size (mm)</th>\n      <th style="padding: 8px;">Area (mm²)</th>\n      <th style="padding: 8px;">Spacing Limit (mm)</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr style="border-bottom: 1px solid #e0e0e0;">\n      <td style="padding: 8px;">Y12</td>\n      <td style="padding: 8px;">113</td>\n      <td style="padding: 8px;">300</td>\n    </tr>\n    <tr style="border-bottom: 1px solid #e0e0e0;">\n      <td style="padding: 8px;">Y16</td>\n      <td style="padding: 8px;">201</td>\n      <td style="padding: 8px;">300</td>\n    </tr>\n  </tbody>\n</table>\n`;
    } else if (type === 'callout_box') {
      htmlSnippet = `\n<div style="border-left: 3px solid #2f5d8a; background: #eef3f7; color: #2f5d8a; padding: 16px; margin: 24px 0; font-size: 13.5px; line-height: 1.6;">\n  <strong>Important Limit:</strong> Deflection limits must check actual span-to-effective depth ratios against allowable limits.\n</div>\n`;
    }

    injectFormat(htmlSnippet, '');
    setShowSectionDropdown(false);
  };

  return (
    <div style={{
      padding: '60px 24px 100px 24px',
      maxWidth: '960px',
      margin: '0 auto',
      fontFamily: 'Inter, -apple-system, sans-serif',
      color: '#111111',
      backgroundColor: '#ffffff'
    }}>
      
      {/* Header section */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        borderBottom: '1px solid #e5e5e5',
        paddingBottom: '24px',
        marginBottom: '40px'
      }}>
        <div>
          <h1 style={{
            fontFamily: 'Lora, Georgia, serif',
            fontSize: '32px',
            fontWeight: '400',
            letterSpacing: '-0.02em',
            margin: 0
          }}>Admin Portal</h1>
          <p style={{
            fontSize: '11px',
            color: '#737373',
            marginTop: '6px',
            fontFamily: 'IBM Plex Mono, monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>System Control &amp; Content Management</p>
        </div>
        <button onClick={handleLogout} style={{
          background: 'transparent',
          border: '1px solid #111111',
          color: '#111111',
          padding: '6px 14px',
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: '11px',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          cursor: 'pointer'
        }}>Sign Out</button>
      </div>

      {/* Tabs Switcher */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '1px solid #e5e5e5',
        marginBottom: '40px'
      }}>
        <button
          onClick={() => setActiveTab('submissions')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'submissions' ? '2px solid #2f5d8a' : '2px solid transparent',
            color: activeTab === 'submissions' ? '#2f5d8a' : '#737373',
            padding: '12px 18px',
            fontSize: '11px',
            fontWeight: activeTab === 'submissions' ? '600' : '400',
            cursor: 'pointer',
            fontFamily: 'IBM Plex Mono, monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          Submissions
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'notes' ? '2px solid #2f5d8a' : '2px solid transparent',
            color: activeTab === 'notes' ? '#2f5d8a' : '#737373',
            padding: '12px 18px',
            fontSize: '11px',
            fontWeight: activeTab === 'notes' ? '600' : '400',
            cursor: 'pointer',
            fontFamily: 'IBM Plex Mono, monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          Community Notes
        </button>
        <button
          onClick={() => setActiveTab('template')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'template' ? '2px solid #2f5d8a' : '2px solid transparent',
            color: activeTab === 'template' ? '#2f5d8a' : '#737373',
            padding: '12px 18px',
            fontSize: '11px',
            fontWeight: activeTab === 'template' ? '600' : '400',
            cursor: 'pointer',
            fontFamily: 'IBM Plex Mono, monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          Main Page
        </button>
      </div>

      {error && (
        <div style={{
          borderLeft: '3px solid #2f5d8a',
          background: '#f8fafc',
          color: '#2f5d8a',
          padding: '16px',
          marginBottom: '32px',
          fontSize: '13px',
          fontFamily: 'IBM Plex Mono, monospace'
        }}>
          {error}
        </div>
      )}

      {/* ── TAB 1: SUBMISSIONS ── */}
      {activeTab === 'submissions' && (
        <>
          {loading ? (
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: '#737373' }}>Loading submissions...</p>
          ) : submissions.length === 0 ? (
            <div style={{
              border: '1px dashed #e5e5e5',
              padding: '80px 24px',
              textAlign: 'center',
              color: '#737373'
            }}>
              <h3 style={{ fontFamily: 'Lora, serif', fontSize: '20px', color: '#111111', fontWeight: '400', marginBottom: '8px' }}>No submissions</h3>
              <p style={{ fontSize: '13px' }}>User submissions and questions will appear here.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {submissions.map((sub) => (
                <div key={sub._id} style={{
                  border: '1px solid #e5e5e5',
                  padding: '28px',
                  backgroundColor: '#ffffff'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: '16px'
                  }}>
                    <span style={{
                      fontFamily: 'IBM Plex Mono, monospace',
                      fontSize: '12px',
                      color: '#2f5d8a',
                      fontWeight: 500
                    }}>{sub.email}</span>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <span style={{
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: '9px',
                        textTransform: 'uppercase',
                        padding: '2px 8px',
                        background: sub.status === 'pending' ? '#eef3f7' : '#f5f5f5',
                        color: sub.status === 'pending' ? '#2f5d8a' : '#737373',
                        fontWeight: 600
                      }}>{sub.status}</span>
                      <span style={{
                        fontSize: '11px',
                        color: '#737373',
                        fontFamily: 'IBM Plex Mono, monospace'
                      }}>
                        {new Date(sub.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <p style={{
                    fontSize: '14.5px',
                    color: '#262626',
                    lineHeight: '1.7',
                    margin: '0 0 24px 0'
                  }}>{sub.question}</p>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {sub.status === 'pending' && (
                      <>
                        <button
                          onClick={() => startPromote(sub)}
                          disabled={actionLoading !== null}
                          style={{
                            background: '#111111',
                            color: '#ffffff',
                            border: '1px solid #111111',
                            padding: '6px 14px',
                            fontSize: '11px',
                            fontFamily: 'IBM Plex Mono, monospace',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            cursor: 'pointer'
                          }}
                        >
                          Convert to Note Draft
                        </button>
                        <button
                          onClick={() => handleSubmissionAction(sub._id, 'resolve')}
                          disabled={actionLoading !== null}
                          style={{
                            background: 'transparent',
                            border: '1px solid #e5e5e5',
                            color: '#111111',
                            padding: '6px 14px',
                            fontSize: '11px',
                            fontFamily: 'IBM Plex Mono, monospace',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            cursor: 'pointer'
                          }}
                        >
                          Mark Resolved
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleSubmissionAction(sub._id, 'delete')}
                      disabled={actionLoading !== null}
                      style={{
                        background: 'transparent',
                        border: '1px solid #e5e5e5',
                        color: '#dc2626',
                        padding: '6px 14px',
                        fontSize: '11px',
                        fontFamily: 'IBM Plex Mono, monospace',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        cursor: 'pointer',
                        marginLeft: 'auto'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── TAB 2: COMMUNITY NOTES ── */}
      {activeTab === 'notes' && (
        <>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: '32px'
          }}>
            <h2 style={{
              fontFamily: 'Lora, serif',
              fontSize: '22px',
              fontWeight: '400',
              margin: 0
            }}>Community Notes Directory</h2>
            <button
              onClick={openNewNoteForm}
              style={{
                background: '#2f5d8a',
                color: '#ffffff',
                border: 'none',
                padding: '8px 16px',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor: 'pointer'
              }}
            >
              + Create New Note
            </button>
          </div>

          {loading ? (
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: '#737373' }}>Loading community notes...</p>
          ) : notes.length === 0 ? (
            <div style={{
              border: '1px dashed #e5e5e5',
              padding: '80px 24px',
              textAlign: 'center',
              color: '#737373'
            }}>
              <p style={{ fontSize: '13px' }}>No notes found in Sanity. Create one to begin.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {notes.map((note) => (
                <div key={note._id} style={{
                  border: '1px solid #e5e5e5',
                  padding: '18px 24px',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <h4 style={{
                      margin: 0,
                      fontSize: '15px',
                      fontWeight: '500',
                      fontFamily: 'Lora, serif',
                      letterSpacing: '-0.01em'
                    }}>{note.title}</h4>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '6px' }}>
                      <span style={{ fontSize: '11px', color: '#737373', fontFamily: 'IBM Plex Mono, monospace' }}>/{note.slug?.current}</span>
                      <span style={{ fontSize: '11px', color: '#737373', fontFamily: 'IBM Plex Mono, monospace' }}>{note.date}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => openEditNoteForm(note)}
                      style={{
                        background: 'transparent',
                        border: '1px solid #e5e5e5',
                        color: '#111111',
                        padding: '6px 12px',
                        fontSize: '11px',
                        fontFamily: 'IBM Plex Mono, monospace',
                        textTransform: 'uppercase',
                        cursor: 'pointer'
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note._id)}
                      style={{
                        background: 'transparent',
                        border: '1px solid #e5e5e5',
                        color: '#dc2626',
                        padding: '6px 12px',
                        fontSize: '11px',
                        fontFamily: 'IBM Plex Mono, monospace',
                        textTransform: 'uppercase',
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── TAB 3: TEMPLATE EDITOR ── */}
      {activeTab === 'template' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline'
          }}>
            <h2 style={{
              fontFamily: 'Lora, serif',
              fontSize: '22px',
              fontWeight: '400',
              margin: 0
            }}>Edit Main Page Markup</h2>
            <button
              onClick={handleSaveTemplate}
              style={{
                background: '#2f5d8a',
                color: '#ffffff',
                border: 'none',
                padding: '8px 20px',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor: 'pointer'
              }}
            >
              Save &amp; Recompile
            </button>
          </div>
          <p style={{ fontSize: '13px', color: '#737373', margin: 0, lineHeight: '1.6' }}>
            Directly modifies the base file **index.html.bak**. Saving triggers automatic conversion to Next.js components in the background.
          </p>

          {saveStatus && (
            <div style={{
              borderLeft: '3px solid #2f5d8a',
              background: '#f8fafc',
              color: '#2f5d8a',
              padding: '12px 16px',
              fontSize: '12px',
              fontFamily: 'IBM Plex Mono, monospace'
            }}>
              {saveStatus}
            </div>
          )}

          <textarea
            value={templateContent}
            onChange={(e) => setTemplateContent(e.target.value)}
            rows={24}
            style={{
              width: '100%',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '13px',
              padding: '20px',
              border: '1px solid #e5e5e5',
              backgroundColor: '#fafafa',
              color: '#111111',
              outline: 'none',
              lineHeight: '1.6',
              borderRadius: 0
            }}
          />
        </div>
      )}

      {/* ── CONVERT SUBMISSION TO DRAFT MODAL ── */}
      {promoteId && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            border: '1px solid #111111',
            padding: '32px',
            width: '100%',
            maxWidth: '480px'
          }}>
            <h3 style={{
              fontFamily: 'Lora, serif',
              fontSize: '22px',
              fontWeight: '400',
              marginBottom: '10px'
            }}>Draft Community Note</h3>
            <p style={{
              fontSize: '13px',
              color: '#737373',
              marginBottom: '24px',
              lineHeight: '1.5'
            }}>Provide a brief title for the note article draft.</p>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '10px',
                fontFamily: 'IBM Plex Mono, monospace',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '8px',
                fontWeight: 600
              }}>Article Title</label>
              <input
                type="text"
                value={promoteTitle}
                onChange={(e) => setPromoteTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #e5e5e5',
                  fontSize: '13.5px',
                  outline: 'none',
                  borderRadius: 0
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setPromoteId(null)} style={{
                background: 'transparent',
                border: '1px solid #e5e5e5',
                cursor: 'pointer',
                padding: '8px 16px',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '11px',
                textTransform: 'uppercase'
              }}>Cancel</button>
              <button
                onClick={() => handleSubmissionAction(promoteId, 'promote', { title: promoteTitle, question: promoteQuestion })}
                style={{
                  background: '#2f5d8a',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px 16px',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '11px',
                  textTransform: 'uppercase'
                }}
              >
                Create Note Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PREMIUM WORKSPACE EDITOR WITH TOGGLEABLE LIGHT/DARK BACKGROUNDS & SECTION INJECTOR ── */}
      {noteFormOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: isDarkMode ? '#0a0a0a' : '#fafafa',
          zIndex: 2000,
          display: 'flex',
          flexDirection: 'column',
          color: isDarkMode ? '#e5e5e5' : '#111111',
          fontFamily: 'Inter, -apple-system, sans-serif',
          transition: 'background-color 0.2s ease, color 0.2s ease'
        }}>
          
          {/* Top minimal header toolbar */}
          <div style={{
            height: '56px',
            borderBottom: isDarkMode ? '1px solid #222222' : '1px solid #e5e5e5',
            padding: '0 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: isDarkMode ? '#0a0a0a' : '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            
            {/* Left controls: Close and Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                onClick={() => setNoteFormOpen(false)}
                aria-label="Back to dashboard"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#737373',
                  cursor: 'pointer',
                  fontSize: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px'
                }}
              >
                &larr;
              </button>
              <span style={{
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '11px',
                color: '#737373',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: saveStatusIndicator === 'Saving...' ? '#ff9f0a' : saveStatusIndicator === 'Error' ? '#ff453a' : '#30d158'
                }}></span>
                {saveStatusIndicator}
              </span>
            </div>

            {/* Middle formatting action bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: isDarkMode ? '#161616' : '#f5f5f5',
              padding: '4px 8px',
              borderRadius: '6px',
              border: isDarkMode ? '1px solid #222222' : '1px solid #e0e0e0'
            }}>
              <button type="button" onClick={() => injectFormat('<strong>', '</strong>')} title="Bold" style={{ background: 'transparent', border: 'none', color: isDarkMode ? '#e5e5e5' : '#111111', padding: '6px 10px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>B</button>
              <button type="button" onClick={() => injectFormat('<em>', '</em>')} title="Italic" style={{ background: 'transparent', border: 'none', color: isDarkMode ? '#e5e5e5' : '#111111', padding: '6px 10px', fontSize: '12px', fontStyle: 'italic', cursor: 'pointer' }}>I</button>
              
              <div style={{ width: '1px', height: '16px', backgroundColor: isDarkMode ? '#333333' : '#d5d5d5', margin: '0 6px' }}></div>
              
              <button type="button" onClick={() => injectFormat('<code>', '</code>')} title="Code inline" style={{ background: 'transparent', border: 'none', color: isDarkMode ? '#e5e5e5' : '#111111', padding: '4px 6px', fontSize: '11px', cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace' }}>&lt;&gt;</button>
              
              {/* Insert Inline Image Button */}
              <label style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 8px', cursor: 'pointer' }} title="Insert Image Inline">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: isDarkMode ? '#e5e5e5' : '#111111' }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                <input type="file" accept="image/*" onChange={handleInlineImageUpload} style={{ display: 'none' }} />
              </label>

              {/* Theme Toggle Button */}
              <button
                type="button"
                onClick={() => setIsDarkMode(!isDarkMode)}
                title="Toggle Dark Mode"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: isDarkMode ? '#e5e5e5' : '#111111',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {isDarkMode ? '☀️' : '🌙'}
              </button>
            </div>

            {/* Right primary action controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={() => {
                  const win = window.open();
                  if (win) win.document.write(noteAnswer);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#737373',
                  fontSize: '12px',
                  fontFamily: 'IBM Plex Mono, monospace',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                  padding: '6px 12px'
                }}
              >
                Preview
              </button>
              <button
                type="button"
                onClick={handleNoteSubmit}
                style={{
                  background: '#2f5d8a', // signature blue accent
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '20px',
                  padding: '6px 20px',
                  fontSize: '11px',
                  fontFamily: 'IBM Plex Mono, monospace',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Continue
              </button>
            </div>

          </div>

          {/* Main workspace editing canvas */}
          <div style={{
            flex: 1,
            display: 'flex',
            overflow: 'hidden',
            position: 'relative'
          }}>
            
            {/* Scrollable document paper area */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '60px 40px 120px 40px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <div style={{
                width: '100%',
                maxWidth: '680px',
                display: 'flex',
                flexDirection: 'column'
              }}>
                
                {/* Choose a Section Dropdown Bar */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center',
                  marginBottom: '32px',
                  fontSize: '11px',
                  color: '#737373',
                  fontFamily: 'IBM Plex Mono, monospace',
                  position: 'relative'
                }}>
                  <div
                    onClick={() => setShowSectionDropdown(!showSectionDropdown)}
                    style={{
                      border: isDarkMode ? '1px solid #333333' : '1px solid #e0e0e0',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: isDarkMode ? '#161616' : '#ffffff',
                      userSelect: 'none'
                    }}
                  >
                    <span>Choose a section</span>
                    <span>&darr;</span>
                  </div>

                  {showSectionDropdown && (
                    <div style={{
                      position: 'absolute',
                      top: '36px',
                      left: 0,
                      width: '240px',
                      background: isDarkMode ? '#1c1c1e' : '#ffffff',
                      border: isDarkMode ? '1px solid #2c2c2e' : '1px solid #e0e0e0',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                      zIndex: 2200,
                      padding: '8px 0',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      <button type="button" onClick={() => insertComponentSection('clause_card')} style={{ background: 'transparent', border: 'none', color: isDarkMode ? '#e5e5e5' : '#111111', padding: '10px 16px', textAlign: 'left', cursor: 'pointer', fontSize: '12.5px', fontFamily: 'Inter, sans-serif' }}>BS 8110 Clause Card</button>
                      <button type="button" onClick={() => insertComponentSection('formula_block')} style={{ background: 'transparent', border: 'none', color: isDarkMode ? '#e5e5e5' : '#111111', padding: '10px 16px', textAlign: 'left', cursor: 'pointer', fontSize: '12.5px', fontFamily: 'Inter, sans-serif' }}>Mathematical Formula</button>
                      <button type="button" onClick={() => insertComponentSection('ref_table')} style={{ background: 'transparent', border: 'none', color: isDarkMode ? '#e5e5e5' : '#111111', padding: '10px 16px', textAlign: 'left', cursor: 'pointer', fontSize: '12.5px', fontFamily: 'Inter, sans-serif' }}>Reference Table</button>
                      <button type="button" onClick={() => insertComponentSection('callout_box')} style={{ background: 'transparent', border: 'none', color: isDarkMode ? '#e5e5e5' : '#111111', padding: '10px 16px', textAlign: 'left', cursor: 'pointer', fontSize: '12.5px', fontFamily: 'Inter, sans-serif' }}>Warning / Callout Box</button>
                    </div>
                  )}

                  <div style={{
                    border: isDarkMode ? '1px solid #333333' : '1px solid #e0e0e0',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    color: '#a0a0a0',
                    backgroundColor: isDarkMode ? '#161616' : '#ffffff'
                  }}>
                    Email header / footer
                  </div>
                </div>

                {/* Main Title Input */}
                <input
                  type="text"
                  placeholder="Title"
                  value={noteTitle}
                  onChange={(e) => {
                    setNoteTitle(e.target.value);
                    if (!editingNoteId) {
                      setNoteSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                    }
                  }}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: isDarkMode ? '#ffffff' : '#111111',
                    fontSize: '42px',
                    fontFamily: 'Lora, Georgia, serif',
                    fontWeight: '400',
                    marginBottom: '12px',
                    padding: 0
                  }}
                />

                {/* Subtitle Input */}
                <input
                  type="text"
                  placeholder="Add a subtitle..."
                  value={noteSubtitle}
                  onChange={(e) => setNoteSubtitle(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: isDarkMode ? '#888888' : '#666666',
                    fontSize: '20px',
                    fontFamily: 'Inter, sans-serif',
                    marginBottom: '24px',
                    padding: 0
                  }}
                />

                {/* Interactive Tag Pills section */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '40px',
                  borderBottom: isDarkMode ? '1px solid #222222' : '1px solid #e5e5e5',
                  paddingBottom: '16px'
                }}>
                  {noteTagsList.map((tag, idx) => (
                    <span key={idx} style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: isDarkMode ? '#161616' : '#f0f0f0',
                      border: isDarkMode ? '1px solid #333333' : '1px solid #d5d5d5',
                      color: isDarkMode ? '#cccccc' : '#444444',
                      padding: '4px 10px',
                      borderRadius: '16px',
                      fontSize: '11px',
                      fontFamily: 'IBM Plex Mono, monospace'
                    }}>
                      {tag}
                      <button
                        type="button"
                        onClick={() => setNoteTagsList(noteTagsList.filter(t => t !== tag))}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#dc2626',
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: '10px',
                          fontWeight: 'bold'
                        }}
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                  
                  {showTagInput ? (
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newTagInput.trim() && !noteTagsList.includes(newTagInput.trim())) {
                            setNoteTagsList([...noteTagsList, newTagInput.trim()]);
                          }
                          setNewTagInput('');
                          setShowTagInput(false);
                        }
                      }}
                      onBlur={() => {
                        if (newTagInput.trim() && !noteTagsList.includes(newTagInput.trim())) {
                          setNoteTagsList([...noteTagsList, newTagInput.trim()]);
                        }
                        setNewTagInput('');
                        setShowTagInput(false);
                      }}
                      autoFocus
                      style={{
                        background: 'transparent',
                        border: isDarkMode ? '1px solid #333333' : '1px solid #d5d5d5',
                        outline: 'none',
                        color: isDarkMode ? '#ffffff' : '#111111',
                        fontSize: '11px',
                        fontFamily: 'IBM Plex Mono, monospace',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        width: '80px'
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowTagInput(true)}
                      style={{
                        background: isDarkMode ? '#161616' : '#ffffff',
                        border: isDarkMode ? '1px dashed #444444' : '1px dashed #cccccc',
                        color: '#888888',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '14px',
                        padding: 0
                      }}
                    >
                      +
                    </button>
                  )}
                </div>

                {/* Primary Content Writing area */}
                <textarea
                  id="editor-textarea"
                  placeholder="$tart writing..."
                  value={noteAnswer}
                  onChange={(e) => setNoteAnswer(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: '380px',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: isDarkMode ? '#e5e5e5' : '#222222',
                    fontSize: '16px',
                    fontFamily: 'IBM Plex Mono, monospace',
                    lineHeight: '1.8',
                    resize: 'none',
                    padding: 0
                  }}
                />

              </div>
            </div>

            {/* Bottom floating settings gear */}
            <button
              type="button"
              onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
              style={{
                position: 'absolute',
                bottom: '24px',
                right: '24px',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: isDarkMode ? '#1c1c1e' : '#ffffff',
                border: isDarkMode ? '1px solid #3a3a3c' : '1px solid #e0e0e0',
                color: isDarkMode ? '#ffffff' : '#111111',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                fontSize: '18px',
                zIndex: 2100
              }}
            >
              &#9881;
            </button>

            {/* Settings Right Side Drawer panel */}
            {showSettingsDrawer && (
              <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                width: '320px',
                background: isDarkMode ? '#1c1c1e' : '#ffffff',
                borderLeft: isDarkMode ? '1px solid #2c2c2e' : '1px solid #e0e0e0',
                padding: '24px',
                zIndex: 2050,
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                overflowY: 'auto',
                color: isDarkMode ? '#ffffff' : '#111111'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: isDarkMode ? '1px solid #2c2c2e' : '1px solid #e0e0e0', paddingBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontFamily: 'Lora, serif', fontSize: '16px' }}>Note Settings</h4>
                  <button onClick={() => setShowSettingsDrawer(false)} style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '18px' }}>&times;</button>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', color: '#737373', marginBottom: '8px' }}>URL Slug</label>
                  <input
                    type="text"
                    value={noteSlug}
                    onChange={(e) => setNoteSlug(e.target.value)}
                    style={{ width: '100%', padding: '8px', background: isDarkMode ? '#0a0a0a' : '#fafafa', border: isDarkMode ? '1px solid #3a3a3c' : '1px solid #e0e0e0', color: isDarkMode ? '#ffffff' : '#111111', fontSize: '13px', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', color: '#737373', marginBottom: '8px' }}>Publish Date</label>
                  <input
                    type="text"
                    value={noteDate}
                    onChange={(e) => setNoteDate(e.target.value)}
                    style={{ width: '100%', padding: '8px', background: isDarkMode ? '#0a0a0a' : '#fafafa', border: isDarkMode ? '1px solid #3a3a3c' : '1px solid #e0e0e0', color: isDarkMode ? '#ffffff' : '#111111', fontSize: '13px', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', color: '#737373', marginBottom: '8px' }}>Cover Image File</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setNoteImageFile(e.target.files[0]);
                      }
                    }}
                    style={{ color: isDarkMode ? '#ffffff' : '#111111', fontSize: '12px' }}
                  />
                  {editingNoteId && <p style={{ fontSize: '10px', color: '#737373', marginTop: '6px' }}>Leave empty to retain existing cover image.</p>}
                </div>
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}

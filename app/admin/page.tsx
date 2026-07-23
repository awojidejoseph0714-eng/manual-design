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

  // Notes Form states
  const [noteFormOpen, setNoteFormOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteSlug, setNoteSlug] = useState('');
  const [noteDate, setNoteDate] = useState('');
  const [noteTags, setNoteTags] = useState('');
  const [noteAnswer, setNoteAnswer] = useState('');
  const [noteImageFile, setNoteImageFile] = useState<File | null>(null);

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

  const openNewNoteForm = () => {
    setEditingNoteId(null);
    setNoteTitle('');
    setNoteSlug('');
    setNoteDate(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
    setNoteTags('General');
    setNoteAnswer('');
    setNoteImageFile(null);
    setNoteFormOpen(true);
  };

  const openEditNoteForm = (note: Note) => {
    setEditingNoteId(note._id);
    setNoteTitle(note.title);
    setNoteSlug(note.slug?.current || '');
    setNoteDate(note.date || '');
    setNoteTags(note.tags?.join(', ') || '');
    setNoteAnswer(note.answer || '');
    setNoteImageFile(null);
    setNoteFormOpen(true);
  };

  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('action', editingNoteId ? 'edit' : 'create');
      if (editingNoteId) {
        formData.append('noteId', editingNoteId);
      }
      formData.append('title', noteTitle);
      formData.append('slug', noteSlug);
      formData.append('date', noteDate);
      formData.append('tags', noteTags);
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

      setNoteFormOpen(false);
      await fetchInitialData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
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
          cursor: 'pointer',
          transition: 'all 0.15s ease'
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

      {/* ── TAB 2: COMMUNITY NOTES CMS ── */}
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

      {/* ── MODAL: CONVERT SUBMISSION TO NOTE DRAFT ── */}
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

      {/* ── MODAL: CREATE / EDIT NOTE FORM ── */}
      {noteFormOpen && (
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
            padding: '36px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{
              fontFamily: 'Lora, serif',
              fontSize: '24px',
              fontWeight: '400',
              marginBottom: '24px'
            }}>
              {editingNoteId ? 'Edit Community Note' : 'Create Community Note'}
            </h3>

            <form onSubmit={handleNoteSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '10px',
                    fontFamily: 'IBM Plex Mono, monospace',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '8px',
                    fontWeight: 600
                  }}>Title</label>
                  <input
                    type="text"
                    required
                    value={noteTitle}
                    onChange={(e) => {
                      setNoteTitle(e.target.value);
                      if (!editingNoteId) {
                        setNoteSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                      }
                    }}
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
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '10px',
                    fontFamily: 'IBM Plex Mono, monospace',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '8px',
                    fontWeight: 600
                  }}>Slug</label>
                  <input
                    type="text"
                    required
                    value={noteSlug}
                    onChange={(e) => setNoteSlug(e.target.value)}
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
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '10px',
                    fontFamily: 'IBM Plex Mono, monospace',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '8px',
                    fontWeight: 600
                  }}>Publish Date</label>
                  <input
                    type="text"
                    required
                    value={noteDate}
                    onChange={(e) => setNoteDate(e.target.value)}
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
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '10px',
                    fontFamily: 'IBM Plex Mono, monospace',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '8px',
                    fontWeight: 600
                  }}>Tags (comma separated)</label>
                  <input
                    type="text"
                    value={noteTags}
                    onChange={(e) => setNoteTags(e.target.value)}
                    placeholder="e.g. Slabs, BS8110"
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
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '10px',
                  fontFamily: 'IBM Plex Mono, monospace',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '8px',
                  fontWeight: 600
                }}>Cover Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setNoteImageFile(e.target.files[0]);
                    }
                  }}
                  style={{
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '12px'
                  }}
                />
                {editingNoteId && <p style={{ fontSize: '11px', color: '#737373', margin: '6px 0 0 0' }}>Leave empty to retain existing cover image.</p>}
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '10px',
                  fontFamily: 'IBM Plex Mono, monospace',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '8px',
                  fontWeight: 600
                }}>Explanation / Body (HTML/Text)</label>
                <textarea
                  required
                  rows={8}
                  value={noteAnswer}
                  onChange={(e) => setNoteAnswer(e.target.value)}
                  placeholder="Insert HTML or raw text body content here..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e5e5e5',
                    fontSize: '13.5px',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'IBM Plex Mono, monospace',
                    borderRadius: 0
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setNoteFormOpen(false)} style={{
                  background: 'transparent',
                  border: '1px solid #e5e5e5',
                  cursor: 'pointer',
                  padding: '8px 20px',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '11px',
                  textTransform: 'uppercase'
                }}>Cancel</button>
                <button
                  type="submit"
                  style={{
                    background: '#2f5d8a',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '8px 24px',
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}
                >
                  Save Note
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

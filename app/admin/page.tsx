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
          throw new Error('Failed to load main page template');
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

  // Submission actions
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

  // Notes actions
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

  // Template actions
  const handleSaveTemplate = async () => {
    setSaveStatus('Saving and compiling...');
    try {
      const res = await fetch('/api/admin/template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: templateContent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save template');
      setSaveStatus('Saved! A background rebuild & Vercel deployment has been triggered.');
    } catch (err: any) {
      setSaveStatus(`Error: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: '40px 24px', maxWidth: '1100px', margin: '0 auto', fontFamily: 'Inter, sans-serif', color: '#0f0f0f' }}>
      
      {/* Header section */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #e0e0e0',
        paddingBottom: '20px',
        marginBottom: '30px'
      }}>
        <div>
          <h1 style={{ fontFamily: 'Lora, serif', fontSize: '28px', fontWeight: '400', margin: 0 }}>Community Admin Portal</h1>
          <p style={{ fontSize: '12px', color: '#6b6b6b', marginTop: '4px', fontFamily: 'monospace' }}>Review inquiries &amp; manage all guide content</p>
        </div>
        <button onClick={handleLogout} style={{
          background: '#ffffff',
          border: '1px solid #0f0f0f',
          color: '#0f0f0f',
          padding: '8px 16px',
          fontFamily: 'monospace',
          fontSize: '11px',
          textTransform: 'uppercase',
          cursor: 'pointer',
          borderRadius: '4px'
        }}>Sign Out</button>
      </div>

      {/* Tabs Switcher */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e0e0e0', marginBottom: '30px', paddingBottom: '1px' }}>
        <button
          onClick={() => setActiveTab('submissions')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'submissions' ? '2px solid #0f0f0f' : '2px solid transparent',
            color: activeTab === 'submissions' ? '#0f0f0f' : '#6b6b6b',
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: activeTab === 'submissions' ? '600' : '400',
            cursor: 'pointer',
            fontFamily: 'monospace',
            textTransform: 'uppercase'
          }}
        >
          Submissions
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'notes' ? '2px solid #0f0f0f' : '2px solid transparent',
            color: activeTab === 'notes' ? '#0f0f0f' : '#6b6b6b',
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: activeTab === 'notes' ? '600' : '400',
            cursor: 'pointer',
            fontFamily: 'monospace',
            textTransform: 'uppercase'
          }}
        >
          Community Notes
        </button>
        <button
          onClick={() => setActiveTab('template')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'template' ? '2px solid #0f0f0f' : '2px solid transparent',
            color: activeTab === 'template' ? '#0f0f0f' : '#6b6b6b',
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: activeTab === 'template' ? '600' : '400',
            cursor: 'pointer',
            fontFamily: 'monospace',
            textTransform: 'uppercase'
          }}
        >
          Main Page
        </button>
      </div>

      {error && (
        <div style={{ borderLeft: '3px solid #2f5d8a', background: '#eef3f7', color: '#2f5d8a', padding: '16px', marginBottom: '24px', fontSize: '13.5px' }}>
          {error}
        </div>
      )}

      {/* ── TAB 1: SUBMISSIONS ── */}
      {activeTab === 'submissions' && (
        <>
          {loading ? (
            <p style={{ fontFamily: 'monospace', fontSize: '13px', color: '#6b6b6b' }}>Loading submissions...</p>
          ) : submissions.length === 0 ? (
            <div style={{ border: '1px dashed #e0e0e0', padding: '60px 20px', textAlign: 'center', color: '#6b6b6b', borderRadius: '4px' }}>
              <h3 style={{ fontFamily: 'Lora, serif', fontSize: '18px', color: '#0f0f0f', marginBottom: '8px' }}>No submissions yet</h3>
              <p style={{ fontSize: '13px' }}>User submissions and questions will appear here.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {submissions.map((sub) => (
                <div key={sub._id} style={{
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  padding: '24px',
                  background: '#ffffff'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#2f5d8a', fontWeight: 600 }}>{sub.email}</span>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{
                        fontFamily: 'monospace',
                        fontSize: '9px',
                        textTransform: 'uppercase',
                        padding: '2px 8px',
                        borderRadius: '20px',
                        background: sub.status === 'pending' ? '#eef3f7' : sub.status === 'promoted' ? '#f0f0ee' : '#e0e0e0',
                        color: sub.status === 'pending' ? '#2f5d8a' : '#0f0f0f',
                        fontWeight: 600
                      }}>{sub.status}</span>
                      <span style={{ fontSize: '11px', color: '#6b6b6b', fontFamily: 'monospace' }}>
                        {new Date(sub.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <p style={{ fontSize: '14.5px', color: '#2d2d2d', lineHeight: '1.6', margin: '0 0 20px 0' }}>{sub.question}</p>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {sub.status === 'pending' && (
                      <>
                        <button
                          onClick={() => startPromote(sub)}
                          disabled={actionLoading !== null}
                          style={{
                            background: '#0f0f0f',
                            color: '#ffffff',
                            border: '1px solid #0f0f0f',
                            padding: '6px 12px',
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                            borderRadius: '4px'
                          }}
                        >
                          Convert to Note Draft
                        </button>
                        <button
                          onClick={() => handleSubmissionAction(sub._id, 'resolve')}
                          disabled={actionLoading !== null}
                          style={{
                            background: '#ffffff',
                            border: '1px solid #e0e0e0',
                            color: '#2d2d2d',
                            padding: '6px 12px',
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                            borderRadius: '4px'
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
                        background: '#ffffff',
                        border: '1px solid #e0e0e0',
                        color: '#e05a5a',
                        padding: '6px 12px',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        borderRadius: '4px',
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontFamily: 'Lora, serif', fontSize: '20px', fontWeight: '400', margin: 0 }}>Community Notes Directory</h2>
            <button
              onClick={openNewNoteForm}
              style={{
                background: '#0f0f0f',
                color: '#ffffff',
                border: 'none',
                padding: '8px 16px',
                fontFamily: 'monospace',
                fontSize: '11px',
                textTransform: 'uppercase',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              + Create New Note
            </button>
          </div>

          {loading ? (
            <p style={{ fontFamily: 'monospace', fontSize: '13px', color: '#6b6b6b' }}>Loading community notes...</p>
          ) : notes.length === 0 ? (
            <div style={{ border: '1px dashed #e0e0e0', padding: '60px 20px', textAlign: 'center', color: '#6b6b6b', borderRadius: '4px' }}>
              <p style={{ fontSize: '13px' }}>No notes found in Sanity content lake. Create one to begin.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {notes.map((note) => (
                <div key={note._id} style={{
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  padding: '16px 20px',
                  background: '#ffffff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '500' }}>{note.title}</h4>
                    <span style={{ fontSize: '11px', color: '#6b6b6b', fontFamily: 'monospace', marginRight: '12px' }}>/{note.slug?.current}</span>
                    <span style={{ fontSize: '11px', color: '#6b6b6b', fontFamily: 'monospace' }}>{note.date}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => openEditNoteForm(note)}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e0e0e0',
                        color: '#2d2d2d',
                        padding: '6px 12px',
                        fontSize: '10.5px',
                        fontFamily: 'monospace',
                        textTransform: 'uppercase',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note._id)}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e0e0e0',
                        color: '#e05a5a',
                        padding: '6px 12px',
                        fontSize: '10.5px',
                        fontFamily: 'monospace',
                        textTransform: 'uppercase',
                        borderRadius: '4px',
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontFamily: 'Lora, serif', fontSize: '20px', fontWeight: '400', margin: 0 }}>Edit Main Page Template HTML</h2>
            <button
              onClick={handleSaveTemplate}
              style={{
                background: '#0f0f0f',
                color: '#ffffff',
                border: 'none',
                padding: '8px 20px',
                fontFamily: 'monospace',
                fontSize: '11px',
                textTransform: 'uppercase',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Save &amp; Recompile
            </button>
          </div>
          <p style={{ fontSize: '12.5px', color: '#6b6b6b', margin: 0 }}>
            This text editor modifies **index.html.bak**. Saving will automatically recompile the Next.js page routing structure in the background.
          </p>

          {saveStatus && (
            <div style={{ borderLeft: '3px solid #2f5d8a', background: '#eef3f7', color: '#2f5d8a', padding: '12px 16px', fontSize: '13px' }}>
              {saveStatus}
            </div>
          )}

          <textarea
            value={templateContent}
            onChange={(e) => setTemplateContent(e.target.value)}
            rows={24}
            style={{
              width: '100%',
              fontFamily: 'monospace',
              fontSize: '12.5px',
              padding: '16px',
              border: '1px solid #0f0f0f',
              borderRadius: '4px',
              background: '#fcfcfb',
              outline: 'none',
              lineHeight: '1.5'
            }}
          />
        </div>
      )}

      {/* ── MODAL: CONVERT SUBMISSION TO NOTE DRAFT ── */}
      {promoteId && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(2px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{ background: '#ffffff', border: '1px solid #0f0f0f', borderRadius: '4px', padding: '28px', width: '100%', maxWidth: '480px' }}>
            <h3 style={{ fontFamily: 'Lora, serif', fontSize: '20px', fontWeight: '400', marginBottom: '14px' }}>Draft Community Note Title</h3>
            <p style={{ fontSize: '13px', color: '#6b6b6b', marginBottom: '18px' }}>Provide a clear title for the FAQ article to publish in the notes directory.</p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600 }}>Article Title</label>
              <input
                type="text"
                value={promoteTitle}
                onChange={(e) => setPromoteTitle(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '13.5px', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setPromoteId(null)} style={{ background: 'none', border: '1px solid #e0e0e0', cursor: 'pointer', padding: '6px 12px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '10.5px' }}>Cancel</button>
              <button
                onClick={() => handleSubmissionAction(promoteId, 'promote', { title: promoteTitle, question: promoteQuestion })}
                style={{ background: '#0f0f0f', color: '#ffffff', border: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '10.5px', textTransform: 'uppercase' }}
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
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(2px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            border: '1px solid #0f0f0f',
            borderRadius: '4px',
            padding: '28px',
            width: '100%',
            maxWidth: '650px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ fontFamily: 'Lora, serif', fontSize: '20px', fontWeight: '400', marginBottom: '20px' }}>
              {editingNoteId ? 'Edit Community Note' : 'Create New Community Note'}
            </h3>

            <form onSubmit={handleNoteSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600 }}>Title</label>
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
                    style={{ width: '100%', padding: '10px', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '13.5px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600 }}>Slug</label>
                  <input
                    type="text"
                    required
                    value={noteSlug}
                    onChange={(e) => setNoteSlug(e.target.value)}
                    style={{ width: '100%', padding: '10px', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '13.5px', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600 }}>Publish Date</label>
                  <input
                    type="text"
                    required
                    value={noteDate}
                    onChange={(e) => setNoteDate(e.target.value)}
                    style={{ width: '100%', padding: '10px', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '13.5px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600 }}>Tags (comma separated)</label>
                  <input
                    type="text"
                    value={noteTags}
                    onChange={(e) => setNoteTags(e.target.value)}
                    placeholder="e.g. Slabs, BS8110, Shear"
                    style={{ width: '100%', padding: '10px', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '13.5px', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600 }}>Cover Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setNoteImageFile(e.target.files[0]);
                    }
                  }}
                  style={{ fontSize: '12.5px' }}
                />
                {editingNoteId && <p style={{ fontSize: '11px', color: '#6b6b6b', margin: '4px 0 0 0' }}>Leave empty to keep current cover image.</p>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600 }}>Explanation / Body (HTML/Text)</label>
                <textarea
                  required
                  rows={8}
                  value={noteAnswer}
                  onChange={(e) => setNoteAnswer(e.target.value)}
                  placeholder="Provide the detailed deep-dive answer..."
                  style={{ width: '100%', padding: '12px', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '13.5px', outline: 'none', resize: 'vertical', fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button type="button" onClick={() => setNoteFormOpen(false)} style={{ background: 'none', border: '1px solid #e0e0e0', cursor: 'pointer', padding: '8px 16px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '10.5px' }}>Cancel</button>
                <button
                  type="submit"
                  style={{ background: '#0f0f0f', color: '#ffffff', border: 'none', cursor: 'pointer', padding: '8px 20px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '10.5px', textTransform: 'uppercase' }}
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

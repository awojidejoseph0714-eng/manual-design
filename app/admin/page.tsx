'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
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
}

export default function AdminPortal() {
  const router = useRouter();

  // Tab State
  const [activeTab, setActiveTab] = useState<'submissions' | 'notes' | 'template'>('submissions');

  // Data
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

  // UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Promote modal
  const [promoteId, setPromoteId] = useState<string | null>(null);
  const [promoteTitle, setPromoteTitle] = useState('');
  const [promoteQuestion, setPromoteQuestion] = useState('');

  // ── NOTE EDITOR STATE ──
  const [noteFormOpen, setNoteFormOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteSubtitle, setNoteSubtitle] = useState('');
  const [noteSlug, setNoteSlug] = useState('');
  const [noteDate, setNoteDate] = useState('');
  const [noteTagsList, setNoteTagsList] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [noteImageFile, setNoteImageFile] = useState<File | null>(null);
  const [saveStatusIndicator, setSaveStatusIndicator] = useState('Saved');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showSectionDropdown, setShowSectionDropdown] = useState(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);

  // WYSIWYG contenteditable ref
  const editorRef = useRef<HTMLDivElement>(null);

  // ── MAIN PAGE EDITOR STATE ──
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeReady, setIframeReady] = useState(false);
  const [pageSaveStatus, setPageSaveStatus] = useState('');
  const [pageEditing, setPageEditing] = useState(false);

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
      }
      // Template tab: loaded via iframe
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

  // ─────────────────────────────────────────────────────────────────
  //  SUBMISSIONS
  // ─────────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────
  //  NOTE EDITOR – WYSIWYG
  // ─────────────────────────────────────────────────────────────────
  const openNewNoteForm = () => {
    setEditingNoteId(null);
    setNoteTitle('');
    setNoteSubtitle('');
    setNoteSlug('');
    setNoteDate(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
    setNoteTagsList(['General']);
    setNoteImageFile(null);
    setSaveStatusIndicator('Saved');
    setIsDarkMode(false);
    setNoteFormOpen(true);
    // Clear editor after mount
    setTimeout(() => {
      if (editorRef.current) editorRef.current.innerHTML = '';
    }, 50);
  };

  const openEditNoteForm = (note: Note) => {
    setEditingNoteId(note._id);
    setNoteTitle(note.title);
    setNoteSubtitle(note.subtitle || '');
    setNoteSlug(note.slug?.current || '');
    setNoteDate(note.date || '');
    setNoteTagsList(note.tags || []);
    setNoteImageFile(null);
    setSaveStatusIndicator('Saved');
    setIsDarkMode(false);
    setNoteFormOpen(true);
    setTimeout(() => {
      if (editorRef.current) editorRef.current.innerHTML = note.answer || '';
    }, 50);
  };

  const execFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  // Markdown-to-HTML converter (for paste detection)
  const parseMarkdownToHtml = (markdown: string): string => {
    let html = markdown;
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^# (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.*?)_/g, '<em>$1</em>');
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');
    html = html.replace(/~~(.*?)~~/g, '<del>$1</del>');
    html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');
    html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
    html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
    html = html.replace(/\$\$([\s\S]*?)\$\$/g, '<div class="formula-block">\\[$1\\]</div>');
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');

    // Wrap double-newline blocks in <p> if not already block elements
    const blocks = html.split(/\n\s*\n/);
    return blocks.map(block => {
      const t = block.trim();
      if (!t) return '';
      if (/^<(h[1-6]|div|blockquote|li|ul|ol|table|p)/.test(t)) return t;
      // Group consecutive <li> items
      if (t.startsWith('<li>')) return `<ul>${t}</ul>`;
      return `<p>${t.replace(/\n/g, '<br>')}</p>`;
    }).filter(Boolean).join('\n');
  };

  const handleEditorPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const text = e.clipboardData.getData('text/plain');
    const hasMarkdown = /^#{1,3} |^\*\*|^\* |^- |`|\[.*\]\(/.test(text);
    if (hasMarkdown) {
      e.preventDefault();
      const html = parseMarkdownToHtml(text);
      document.execCommand('insertHTML', false, html);
      setSaveStatusIndicator('Pasted & Formatted');
      setTimeout(() => setSaveStatusIndicator('Saved'), 2000);
    }
    // Otherwise let browser paste as-is (it strips unsafe tags natively)
  };

  const handleNoteSubmit = async () => {
    setSaveStatusIndicator('Saving...');
    try {
      const htmlContent = editorRef.current?.innerHTML || '';
      const formData = new FormData();
      formData.append('action', editingNoteId ? 'edit' : 'create');
      if (editingNoteId) formData.append('noteId', editingNoteId);
      formData.append('title', noteTitle);
      formData.append('subtitle', noteSubtitle);
      formData.append('slug', noteSlug || noteTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
      formData.append('date', noteDate);
      formData.append('tags', noteTagsList.join(','));
      formData.append('answer', htmlContent);
      if (noteImageFile) formData.append('image', noteImageFile);

      const res = await fetch('/api/admin/notes', { method: 'POST', body: formData });
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
    if (!confirm('Delete this community note?')) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('action', 'delete');
      formData.append('noteId', id);
      const res = await fetch('/api/admin/notes', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete note');
      await fetchInitialData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInlineImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setSaveStatusIndicator('Uploading...');
    try {
      const formData = new FormData();
      formData.append('action', 'upload_asset');
      formData.append('file', file);
      const res = await fetch('/api/admin/notes', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      document.execCommand('insertHTML', false, `<img src="${data.url}" alt="${file.name}" style="max-width:100%;border-radius:4px;margin:16px 0;" />`);
      setSaveStatusIndicator('Saved');
    } catch (err: any) {
      alert(err.message);
      setSaveStatusIndicator('Error');
    }
    e.target.value = '';
  };

  const insertSection = (type: string) => {
    let html = '';
    if (type === 'clause_card') {
      html = `<div style="border:1px solid #e0e0e0;padding:20px;margin:24px 0;border-left:4px solid #2f5d8a;background:#fcfcfb"><span style="font-family:monospace;font-size:11px;text-transform:uppercase;color:#2f5d8a;font-weight:600">Clause 3.4.5.1 (BS 8110)</span><h4 style="margin:8px 0;font-family:Lora,serif;font-size:16px">Clause Title</h4><p style="margin:0;font-size:13.5px;line-height:1.6;color:#444">Description...</p></div>`;
    } else if (type === 'formula') {
      html = `<div style="text-align:center;margin:24px 0;padding:16px;background:#f8fafc;border:1px solid #e5e5e5;font-family:Lora,serif;font-size:17px">\\[ A_s = \\frac{M}{0.95 f_y z} \\]</div>`;
    } else if (type === 'table') {
      html = `<table style="width:100%;border-collapse:collapse;margin:24px 0;font-size:13px;font-family:monospace"><thead><tr style="border-bottom:2px solid #0f0f0f;background:#fcfcfb"><th style="padding:8px;text-align:left">Parameter</th><th style="padding:8px;text-align:left">Value</th></tr></thead><tbody><tr style="border-bottom:1px solid #e0e0e0"><td style="padding:8px">—</td><td style="padding:8px">—</td></tr></tbody></table>`;
    } else if (type === 'callout') {
      html = `<div style="border-left:3px solid #2f5d8a;background:#eef3f7;color:#2f5d8a;padding:16px;margin:24px 0;font-size:13.5px;line-height:1.6"><strong>Note:</strong> Important limitation or reminder goes here.</div>`;
    } else if (type === 'heading') {
      html = `<h3 style="font-family:Lora,serif;font-size:20px;font-weight:500;margin:32px 0 12px">Section Heading</h3>`;
    }
    document.execCommand('insertHTML', false, html);
    setShowSectionDropdown(false);
    editorRef.current?.focus();
  };

  // ─────────────────────────────────────────────────────────────────
  //  MAIN PAGE IFRAME EDITOR
  // ─────────────────────────────────────────────────────────────────
  const handleIframeLoad = () => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument) return;
    setIframeReady(true);
  };

  const enablePageEditing = () => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument) return;
    iframe.contentDocument.designMode = 'on';
    setPageEditing(true);
    setPageSaveStatus('Editing enabled — click any text to edit it');
  };

  const handleSavePage = async () => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument) return;
    setPageSaveStatus('Saving...');

    // Capture the edited body HTML
    const bodyHtml = iframe.contentDocument.body.innerHTML;

    try {
      const res = await fetch('/api/admin/template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: bodyHtml }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setPageSaveStatus('✓ Saved to Sanity — changes are live');
      setPageEditing(false);
      iframe.contentDocument.designMode = 'off';
    } catch (err: any) {
      setPageSaveStatus(`Error: ${err.message}`);
    }
  };

  const handleCancelPageEdit = () => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument) return;
    iframe.contentDocument.designMode = 'off';
    setPageEditing(false);
    setPageSaveStatus('');
    // Reload iframe to restore original content
    iframe.src = iframe.src;
  };

  // ─────────────────────────────────────────────────────────────────
  //  SHARED STYLES
  // ─────────────────────────────────────────────────────────────────
  const tabBtn = (id: string) => ({
    background: 'none' as const,
    border: 'none' as const,
    borderBottom: activeTab === id ? '2px solid #2f5d8a' : '2px solid transparent',
    color: activeTab === id ? '#2f5d8a' : '#737373',
    padding: '12px 18px',
    fontSize: '11px',
    fontWeight: activeTab === id ? '600' : '400',
    cursor: 'pointer' as const,
    fontFamily: 'IBM Plex Mono, monospace',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  });

  const monoLabel = {
    display: 'block' as const,
    fontSize: '10px',
    fontFamily: 'IBM Plex Mono, monospace',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    color: '#737373',
    marginBottom: '8px',
    fontWeight: 600,
  };

  return (
    <div style={{ padding: '60px 24px 100px', maxWidth: '960px', margin: '0 auto', fontFamily: 'Inter, -apple-system, sans-serif', color: '#111111', backgroundColor: '#ffffff' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid #e5e5e5', paddingBottom: '24px', marginBottom: '40px' }}>
        <div>
          <h1 style={{ fontFamily: 'Lora, Georgia, serif', fontSize: '32px', fontWeight: '400', letterSpacing: '-0.02em', margin: 0 }}>Admin Portal</h1>
          <p style={{ fontSize: '11px', color: '#737373', marginTop: '6px', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>System Control &amp; Content Management</p>
        </div>
        <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid #111', color: '#111', padding: '6px 14px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer' }}>Sign Out</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e5e5e5', marginBottom: '40px' }}>
        <button onClick={() => setActiveTab('submissions')} style={tabBtn('submissions')}>Submissions</button>
        <button onClick={() => setActiveTab('notes')} style={tabBtn('notes')}>Community Notes</button>
        <button onClick={() => setActiveTab('template')} style={tabBtn('template')}>Main Page</button>
      </div>

      {error && <div style={{ borderLeft: '3px solid #2f5d8a', background: '#f8fafc', color: '#2f5d8a', padding: '16px', marginBottom: '32px', fontSize: '13px', fontFamily: 'IBM Plex Mono, monospace' }}>{error}</div>}

      {/* ── SUBMISSIONS TAB ── */}
      {activeTab === 'submissions' && (
        <>
          {loading ? (
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: '#737373' }}>Loading submissions...</p>
          ) : submissions.length === 0 ? (
            <div style={{ border: '1px dashed #e5e5e5', padding: '80px 24px', textAlign: 'center', color: '#737373' }}>
              <h3 style={{ fontFamily: 'Lora, serif', fontSize: '20px', color: '#111', fontWeight: '400', marginBottom: '8px' }}>No submissions yet</h3>
              <p style={{ fontSize: '13px' }}>User questions will appear here.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {submissions.map(sub => (
                <div key={sub._id} style={{ border: '1px solid #e5e5e5', padding: '28px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: '#2f5d8a', fontWeight: 500 }}>{sub.email}</span>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', textTransform: 'uppercase', padding: '2px 8px', background: sub.status === 'pending' ? '#eef3f7' : '#f5f5f5', color: sub.status === 'pending' ? '#2f5d8a' : '#737373', fontWeight: 600 }}>{sub.status}</span>
                      <span style={{ fontSize: '11px', color: '#737373', fontFamily: 'IBM Plex Mono, monospace' }}>{new Date(sub.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <p style={{ fontSize: '14.5px', color: '#262626', lineHeight: '1.7', margin: '0 0 24px 0' }}>{sub.question}</p>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {sub.status === 'pending' && (
                      <>
                        <button onClick={() => startPromote(sub)} disabled={actionLoading !== null} style={{ background: '#111', color: '#fff', border: '1px solid #111', padding: '6px 14px', fontSize: '11px', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }}>Convert to Note</button>
                        <button onClick={() => handleSubmissionAction(sub._id, 'resolve')} disabled={actionLoading !== null} style={{ background: 'transparent', border: '1px solid #e5e5e5', color: '#111', padding: '6px 14px', fontSize: '11px', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }}>Mark Resolved</button>
                      </>
                    )}
                    <button onClick={() => handleSubmissionAction(sub._id, 'delete')} disabled={actionLoading !== null} style={{ background: 'transparent', border: '1px solid #e5e5e5', color: '#dc2626', padding: '6px 14px', fontSize: '11px', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', marginLeft: 'auto' }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── NOTES TAB ── */}
      {activeTab === 'notes' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '32px' }}>
            <h2 style={{ fontFamily: 'Lora, serif', fontSize: '22px', fontWeight: '400', margin: 0 }}>Community Notes</h2>
            <button onClick={openNewNoteForm} style={{ background: '#2f5d8a', color: '#fff', border: 'none', padding: '8px 16px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }}>+ New Note</button>
          </div>
          {loading ? (
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: '#737373' }}>Loading...</p>
          ) : notes.length === 0 ? (
            <div style={{ border: '1px dashed #e5e5e5', padding: '80px 24px', textAlign: 'center', color: '#737373' }}>
              <p style={{ fontSize: '13px' }}>No notes found in Sanity. Create one to begin.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {notes.map(note => (
                <div key={note._id} style={{ border: '1px solid #e5e5e5', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '500', fontFamily: 'Lora, serif' }}>{note.title}</h4>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '6px' }}>
                      <span style={{ fontSize: '11px', color: '#737373', fontFamily: 'IBM Plex Mono, monospace' }}>/{note.slug?.current}</span>
                      <span style={{ fontSize: '11px', color: '#737373', fontFamily: 'IBM Plex Mono, monospace' }}>{note.date}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => openEditNoteForm(note)} style={{ background: 'transparent', border: '1px solid #e5e5e5', color: '#111', padding: '6px 12px', fontSize: '11px', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => handleDeleteNote(note._id)} style={{ background: 'transparent', border: '1px solid #e5e5e5', color: '#dc2626', padding: '6px 12px', fontSize: '11px', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', cursor: 'pointer' }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── MAIN PAGE EDITOR TAB ── */}
      {activeTab === 'template' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontFamily: 'Lora, serif', fontSize: '22px', fontWeight: '400', margin: '0 0 6px 0' }}>Live Page Editor</h2>
              <p style={{ fontSize: '12px', color: '#737373', margin: 0, lineHeight: '1.5', fontFamily: 'IBM Plex Mono, monospace' }}>
                The main page is rendered below. Click <strong style={{ color: '#111' }}>Enable Editing</strong> then click any text to edit it directly.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
              {!pageEditing ? (
                <button
                  onClick={enablePageEditing}
                  disabled={!iframeReady}
                  style={{ background: '#2f5d8a', color: '#fff', border: 'none', padding: '8px 16px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: iframeReady ? 'pointer' : 'not-allowed', opacity: iframeReady ? 1 : 0.5 }}
                >
                  {iframeReady ? 'Enable Editing' : 'Loading...'}
                </button>
              ) : (
                <>
                  <button onClick={handleCancelPageEdit} style={{ background: 'transparent', border: '1px solid #e5e5e5', color: '#111', padding: '8px 14px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={handleSavePage} style={{ background: '#111', color: '#fff', border: 'none', padding: '8px 16px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }}>Save Changes</button>
                </>
              )}
            </div>
          </div>

          {/* Status bar */}
          {pageSaveStatus && (
            <div style={{ borderLeft: '3px solid #2f5d8a', background: '#f8fafc', color: '#2f5d8a', padding: '10px 16px', fontSize: '12px', fontFamily: 'IBM Plex Mono, monospace' }}>
              {pageSaveStatus}
            </div>
          )}

          {pageEditing && (
            <div style={{ borderLeft: '3px solid #30d158', background: '#f0fdf4', color: '#15803d', padding: '10px 16px', fontSize: '12px', fontFamily: 'IBM Plex Mono, monospace', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#30d158', display: 'inline-block', flexShrink: 0 }}></span>
              Editing mode active — click any text on the page below to edit it
            </div>
          )}

          {/* Iframe preview / editor */}
          <div style={{ border: '1px solid #e5e5e5', borderRadius: '4px', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.05)' }}>
            {/* Browser chrome bar */}
            <div style={{ background: '#f5f5f5', borderBottom: '1px solid #e5e5e5', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f57', display: 'inline-block' }}></span>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#febc2e', display: 'inline-block' }}></span>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#28c840', display: 'inline-block' }}></span>
              </div>
              <div style={{ flex: 1, background: '#fff', border: '1px solid #e0e0e0', borderRadius: '4px', padding: '3px 10px', fontSize: '11px', color: '#737373', fontFamily: 'IBM Plex Mono, monospace' }}>
                manual-design.vercel.app
              </div>
            </div>
            <iframe
              ref={iframeRef}
              src="/"
              onLoad={handleIframeLoad}
              style={{ width: '100%', height: '80vh', border: 'none', display: 'block', outline: pageEditing ? '2px solid #2f5d8a' : 'none' }}
              title="Live Main Page Editor"
            />
          </div>
        </div>
      )}

      {/* ── PROMOTE MODAL ── */}
      {promoteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', border: '1px solid #111', padding: '32px', width: '100%', maxWidth: '480px' }}>
            <h3 style={{ fontFamily: 'Lora, serif', fontSize: '22px', fontWeight: '400', marginBottom: '10px' }}>Draft Community Note</h3>
            <p style={{ fontSize: '13px', color: '#737373', marginBottom: '24px', lineHeight: '1.5' }}>Give this submission a note title.</p>
            <div style={{ marginBottom: '24px' }}>
              <label style={monoLabel}>Article Title</label>
              <input type="text" value={promoteTitle} onChange={e => setPromoteTitle(e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #e5e5e5', fontSize: '13.5px', outline: 'none', borderRadius: 0 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setPromoteId(null)} style={{ background: 'transparent', border: '1px solid #e5e5e5', cursor: 'pointer', padding: '8px 16px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', textTransform: 'uppercase' }}>Cancel</button>
              <button onClick={() => handleSubmissionAction(promoteId, 'promote', { title: promoteTitle, question: promoteQuestion })} style={{ background: '#2f5d8a', color: '#fff', border: 'none', cursor: 'pointer', padding: '8px 16px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', textTransform: 'uppercase' }}>Create Draft</button>
            </div>
          </div>
        </div>
      )}

      {/* ── WYSIWYG NOTE EDITOR FULLSCREEN ── */}
      {noteFormOpen && (
        <div style={{ position: 'fixed', inset: 0, background: isDarkMode ? '#0a0a0a' : '#ffffff', zIndex: 2000, display: 'flex', flexDirection: 'column', color: isDarkMode ? '#e5e5e5' : '#111', fontFamily: 'Inter, sans-serif', transition: 'background 0.2s,color 0.2s' }}>

          {/* Top toolbar */}
          <div style={{ height: '52px', borderBottom: isDarkMode ? '1px solid #222' : '1px solid #e5e5e5', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: isDarkMode ? '#0a0a0a' : '#fff' }}>

            {/* Left */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button onClick={() => setNoteFormOpen(false)} style={{ background: 'transparent', border: 'none', color: '#737373', cursor: 'pointer', fontSize: '20px', padding: '4px' }}>←</button>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: '#737373', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: saveStatusIndicator === 'Saving...' ? '#ff9f0a' : saveStatusIndicator.includes('Error') ? '#ff453a' : '#30d158' }}></span>
                {saveStatusIndicator}
              </span>
            </div>

            {/* Center formatting bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: isDarkMode ? '#161616' : '#f5f5f5', padding: '4px 8px', borderRadius: '6px', border: isDarkMode ? '1px solid #222' : '1px solid #e0e0e0' }}>

              <button onMouseDown={e => { e.preventDefault(); execFormat('bold'); }} title="Bold (Ctrl+B)" style={{ background: 'transparent', border: 'none', color: isDarkMode ? '#e5e5e5' : '#111', padding: '5px 9px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', borderRadius: '3px' }}>B</button>
              <button onMouseDown={e => { e.preventDefault(); execFormat('italic'); }} title="Italic (Ctrl+I)" style={{ background: 'transparent', border: 'none', color: isDarkMode ? '#e5e5e5' : '#111', padding: '5px 9px', fontStyle: 'italic', fontSize: '13px', cursor: 'pointer', borderRadius: '3px' }}>I</button>
              <button onMouseDown={e => { e.preventDefault(); execFormat('underline'); }} title="Underline (Ctrl+U)" style={{ background: 'transparent', border: 'none', color: isDarkMode ? '#e5e5e5' : '#111', padding: '5px 9px', textDecoration: 'underline', fontSize: '13px', cursor: 'pointer', borderRadius: '3px' }}>U</button>
              <button onMouseDown={e => { e.preventDefault(); execFormat('strikeThrough'); }} title="Strikethrough" style={{ background: 'transparent', border: 'none', color: isDarkMode ? '#e5e5e5' : '#111', padding: '5px 9px', textDecoration: 'line-through', fontSize: '12px', cursor: 'pointer', borderRadius: '3px' }}>S</button>

              <div style={{ width: '1px', height: '16px', background: isDarkMode ? '#333' : '#d5d5d5', margin: '0 5px' }}></div>

              <button onMouseDown={e => { e.preventDefault(); execFormat('formatBlock', 'H3'); }} title="Heading" style={{ background: 'transparent', border: 'none', color: isDarkMode ? '#e5e5e5' : '#111', padding: '5px 8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', borderRadius: '3px', fontFamily: 'IBM Plex Mono, monospace' }}>H3</button>
              <button onMouseDown={e => { e.preventDefault(); execFormat('insertUnorderedList'); }} title="Bullet list" style={{ background: 'transparent', border: 'none', color: isDarkMode ? '#e5e5e5' : '#111', padding: '5px 8px', fontSize: '14px', cursor: 'pointer', borderRadius: '3px' }}>≡</button>
              <button onMouseDown={e => { e.preventDefault(); execFormat('formatBlock', 'blockquote'); }} title="Blockquote" style={{ background: 'transparent', border: 'none', color: '#2f5d8a', padding: '5px 8px', fontSize: '14px', cursor: 'pointer', borderRadius: '3px' }}>"</button>

              <div style={{ width: '1px', height: '16px', background: isDarkMode ? '#333' : '#d5d5d5', margin: '0 5px' }}></div>

              {/* Section chooser */}
              <div style={{ position: 'relative' }}>
                <button onMouseDown={e => { e.preventDefault(); setShowSectionDropdown(!showSectionDropdown); }} style={{ background: 'transparent', border: 'none', color: isDarkMode ? '#e5e5e5' : '#111', padding: '5px 9px', fontSize: '11px', cursor: 'pointer', borderRadius: '3px', fontFamily: 'IBM Plex Mono, monospace', whiteSpace: 'nowrap' }}>
                  + Section ▾
                </button>
                {showSectionDropdown && (
                  <div style={{ position: 'absolute', top: '32px', left: 0, background: isDarkMode ? '#1c1c1e' : '#fff', border: isDarkMode ? '1px solid #2c2c2e' : '1px solid #e0e0e0', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 2200, padding: '6px 0', minWidth: '180px' }}>
                    {[['clause_card', 'BS 8110 Clause Card'], ['formula', 'Formula Block'], ['table', 'Reference Table'], ['callout', 'Callout / Warning'], ['heading', 'Section Heading']].map(([type, label]) => (
                      <button key={type} onMouseDown={e => { e.preventDefault(); insertSection(type); }} style={{ display: 'block', width: '100%', background: 'transparent', border: 'none', color: isDarkMode ? '#e5e5e5' : '#111', padding: '9px 16px', textAlign: 'left', cursor: 'pointer', fontSize: '12.5px' }}>{label}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Image upload */}
              <label title="Insert image at cursor" style={{ display: 'inline-flex', alignItems: 'center', padding: '5px 8px', cursor: 'pointer', color: isDarkMode ? '#e5e5e5' : '#111', fontSize: '15px' }}>
                🖼
                <input type="file" accept="image/*" onChange={handleInlineImageUpload} style={{ display: 'none' }} />
              </label>

              <div style={{ width: '1px', height: '16px', background: isDarkMode ? '#333' : '#d5d5d5', margin: '0 5px' }}></div>

              {/* Dark mode toggle */}
              <button onMouseDown={e => { e.preventDefault(); setIsDarkMode(!isDarkMode); }} title="Toggle theme" style={{ background: 'transparent', border: 'none', color: isDarkMode ? '#e5e5e5' : '#111', padding: '5px 8px', fontSize: '14px', cursor: 'pointer' }}>
                {isDarkMode ? '☀️' : '🌙'}
              </button>
            </div>

            {/* Right */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={() => setShowSettingsDrawer(!showSettingsDrawer)} style={{ background: 'transparent', border: 'none', color: '#737373', fontSize: '12px', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }}>Settings</button>
              <button onClick={handleNoteSubmit} style={{ background: '#2f5d8a', color: '#fff', border: 'none', borderRadius: '20px', padding: '6px 20px', fontSize: '11px', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, cursor: 'pointer' }}>Publish</button>
            </div>
          </div>

          {/* Editor canvas + settings drawer */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

            {/* Scrollable canvas */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '60px 40px 120px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '100%', maxWidth: '680px' }}>

                {/* Title */}
                <input type="text" placeholder="Title" value={noteTitle}
                  onChange={e => { setNoteTitle(e.target.value); if (!editingNoteId) setNoteSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')); }}
                  style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: isDarkMode ? '#fff' : '#111', fontSize: '42px', fontFamily: 'Lora, serif', fontWeight: '400', marginBottom: '12px', padding: 0 }}
                />

                {/* Subtitle */}
                <input type="text" placeholder="Add a subtitle..." value={noteSubtitle} onChange={e => setNoteSubtitle(e.target.value)}
                  style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: isDarkMode ? '#888' : '#666', fontSize: '20px', fontFamily: 'Inter, sans-serif', marginBottom: '24px', padding: 0 }}
                />

                {/* Tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginBottom: '40px', borderBottom: isDarkMode ? '1px solid #222' : '1px solid #e5e5e5', paddingBottom: '16px' }}>
                  {noteTagsList.map((tag, idx) => (
                    <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: isDarkMode ? '#161616' : '#f0f0f0', border: isDarkMode ? '1px solid #333' : '1px solid #d5d5d5', color: isDarkMode ? '#ccc' : '#444', padding: '4px 10px', borderRadius: '16px', fontSize: '11px', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {tag}
                      <button onMouseDown={e => { e.preventDefault(); setNoteTagsList(noteTagsList.filter(t => t !== tag)); }} style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 0, fontSize: '10px', fontWeight: 'bold' }}>×</button>
                    </span>
                  ))}
                  {showTagInput ? (
                    <input type="text" value={newTagInput} onChange={e => setNewTagInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (newTagInput.trim() && !noteTagsList.includes(newTagInput.trim())) setNoteTagsList([...noteTagsList, newTagInput.trim()]); setNewTagInput(''); setShowTagInput(false); } }}
                      onBlur={() => { if (newTagInput.trim() && !noteTagsList.includes(newTagInput.trim())) setNoteTagsList([...noteTagsList, newTagInput.trim()]); setNewTagInput(''); setShowTagInput(false); }}
                      autoFocus style={{ background: 'transparent', border: isDarkMode ? '1px solid #333' : '1px solid #d5d5d5', outline: 'none', color: isDarkMode ? '#fff' : '#111', fontSize: '11px', fontFamily: 'IBM Plex Mono, monospace', padding: '2px 8px', borderRadius: '12px', width: '80px' }}
                    />
                  ) : (
                    <button onMouseDown={e => { e.preventDefault(); setShowTagInput(true); }} style={{ background: isDarkMode ? '#161616' : '#fff', border: isDarkMode ? '1px dashed #444' : '1px dashed #ccc', color: '#888', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '14px', padding: 0 }}>+</button>
                  )}
                </div>

                {/* ── CONTENTEDITABLE WYSIWYG EDITOR ── */}
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onPaste={handleEditorPaste}
                  data-placeholder="Start writing..."
                  style={{
                    width: '100%',
                    minHeight: '400px',
                    outline: 'none',
                    color: isDarkMode ? '#e5e5e5' : '#222',
                    fontSize: '16px',
                    fontFamily: 'Inter, sans-serif',
                    lineHeight: '1.8',
                    caretColor: '#2f5d8a',
                  }}
                />

                <style>{`
                  [contenteditable][data-placeholder]:empty:before {
                    content: attr(data-placeholder);
                    color: #aaa;
                    pointer-events: none;
                  }
                  [contenteditable] h3 {
                    font-family: Lora, serif;
                    font-size: 20px;
                    font-weight: 500;
                    margin: 28px 0 10px;
                  }
                  [contenteditable] p {
                    margin: 0 0 14px;
                  }
                  [contenteditable] blockquote {
                    border-left: 3px solid #2f5d8a;
                    background: #eef3f7;
                    color: #2f5d8a;
                    padding: 14px 16px;
                    margin: 20px 0;
                    font-size: 14px;
                  }
                  [contenteditable] code {
                    font-family: 'IBM Plex Mono', monospace;
                    background: #f3f3f3;
                    padding: 2px 6px;
                    font-size: 13px;
                    border-radius: 3px;
                  }
                  [contenteditable] ul {
                    padding-left: 20px;
                    margin: 12px 0;
                  }
                  [contenteditable] ul li {
                    margin-bottom: 6px;
                    line-height: 1.7;
                  }
                  [contenteditable] table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                    font-size: 13px;
                  }
                  [contenteditable] th, [contenteditable] td {
                    padding: 8px 10px;
                    border: 1px solid #e0e0e0;
                    text-align: left;
                  }
                  [contenteditable] th {
                    background: #f5f5f5;
                    font-weight: 600;
                  }
                `}</style>

              </div>
            </div>

            {/* Settings drawer */}
            {showSettingsDrawer && (
              <div style={{ width: '300px', background: isDarkMode ? '#1c1c1e' : '#fff', borderLeft: isDarkMode ? '1px solid #2c2c2e' : '1px solid #e5e5e5', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto', color: isDarkMode ? '#fff' : '#111' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: isDarkMode ? '1px solid #2c2c2e' : '1px solid #e5e5e5', paddingBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontFamily: 'Lora, serif', fontSize: '16px' }}>Note Settings</h4>
                  <button onClick={() => setShowSettingsDrawer(false)} style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '18px' }}>×</button>
                </div>
                <div>
                  <label style={monoLabel}>URL Slug</label>
                  <input type="text" value={noteSlug} onChange={e => setNoteSlug(e.target.value)} style={{ width: '100%', padding: '8px', background: isDarkMode ? '#0a0a0a' : '#fafafa', border: isDarkMode ? '1px solid #3a3a3c' : '1px solid #e0e0e0', color: isDarkMode ? '#fff' : '#111', fontSize: '13px', outline: 'none' }} />
                </div>
                <div>
                  <label style={monoLabel}>Publish Date</label>
                  <input type="text" value={noteDate} onChange={e => setNoteDate(e.target.value)} style={{ width: '100%', padding: '8px', background: isDarkMode ? '#0a0a0a' : '#fafafa', border: isDarkMode ? '1px solid #3a3a3c' : '1px solid #e0e0e0', color: isDarkMode ? '#fff' : '#111', fontSize: '13px', outline: 'none' }} />
                </div>
                <div>
                  <label style={monoLabel}>Cover Image</label>
                  <input type="file" accept="image/*" onChange={e => { if (e.target.files?.[0]) setNoteImageFile(e.target.files[0]); }} style={{ color: isDarkMode ? '#fff' : '#111', fontSize: '12px' }} />
                  {editingNoteId && <p style={{ fontSize: '10px', color: '#737373', marginTop: '6px' }}>Leave empty to keep existing image.</p>}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

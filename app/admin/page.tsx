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

export default function AdminPortal() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Promote Modal states
  const [promoteId, setPromoteId] = useState<string | null>(null);
  const [promoteTitle, setPromoteTitle] = useState('');
  const [promoteQuestion, setPromoteQuestion] = useState('');

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const res = await fetch('/api/admin/submissions');
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/admin/login');
          return;
        }
        throw new Error('Failed to load submissions');
      }
      const data = await res.json();
      setSubmissions(data.submissions || []);
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

  const handleAction = async (id: string, action: string, extra = {}) => {
    setActionLoading(id);
    try {
      const res = await fetch('/api/admin/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, submissionId: id, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Operation failed');
      
      // Refresh list
      await fetchSubmissions();
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
    // Guess a title
    const words = sub.question.split(' ').slice(0, 8).join(' ');
    setPromoteTitle(words.endsWith('?') ? words : words + '...');
  };

  return (
    <div style={{ padding: '40px 24px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #e0e0e0',
        paddingBottom: '20px',
        marginBottom: '40px'
      }}>
        <div>
          <h1 style={{ fontFamily: 'Lora, serif', fontSize: '28px', fontWeight: '400', margin: 0 }}>Community Admin Portal</h1>
          <p style={{ fontSize: '12px', color: '#6b6b6b', marginTop: '4px', fontFamily: 'IBM Plex Mono, monospace' }}>Review inquiries &amp; manage community notes</p>
        </div>
        <button onClick={handleLogout} style={{
          background: '#ffffff',
          border: '1px solid #0f0f0f',
          color: '#0f0f0f',
          padding: '8px 16px',
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: '11px',
          textTransform: 'uppercase',
          cursor: 'pointer',
          borderRadius: '4px'
        }}>Sign Out</button>
      </div>

      {error && (
        <div style={{ borderLeft: '3px solid #2f5d8a', background: '#eef3f7', color: '#2f5d8a', padding: '16px', marginBottom: '24px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: '#6b6b6b' }}>Loading submissions...</p>
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
              background: '#ffffff',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <span style={{
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '11px',
                  color: '#2f5d8a',
                  fontWeight: 600
                }}>{sub.email}</span>
                
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '9px',
                    textTransform: 'uppercase',
                    padding: '2px 8px',
                    borderRadius: '20px',
                    background: sub.status === 'pending' ? '#eef3f7' : sub.status === 'promoted' ? '#f0f0ee' : '#e0e0e0',
                    color: sub.status === 'pending' ? '#2f5d8a' : '#0f0f0f',
                    fontWeight: 600
                  }}>{sub.status}</span>
                  
                  <span style={{ fontSize: '11px', color: '#6b6b6b', fontFamily: 'IBM Plex Mono, monospace' }}>
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
                        fontFamily: 'IBM Plex Mono, monospace',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        borderRadius: '4px'
                      }}
                    >
                      Convert to Note Draft
                    </button>
                    <button
                      onClick={() => handleAction(sub._id, 'resolve')}
                      disabled={actionLoading !== null}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e0e0e0',
                        color: '#2d2d2d',
                        padding: '6px 12px',
                        fontSize: '11px',
                        fontFamily: 'IBM Plex Mono, monospace',
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
                  onClick={() => handleAction(sub._id, 'delete')}
                  disabled={actionLoading !== null}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e0e0e0',
                    color: '#e05a5a',
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontFamily: 'IBM Plex Mono, monospace',
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

      {/* Promotion Title Editor Modal */}
      {promoteId && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(2px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{ background: '#ffffff', border: '1px solid #0f0f0f', borderRadius: '4px', padding: '28px', width: '100%', maxWidth: '480px' }}>
            <h3 style={{ fontFamily: 'Lora, serif', fontSize: '20px', fontWeight: '400', marginBottom: '14px' }}>Draft Community Note Title</h3>
            <p style={{ fontSize: '13px', color: '#6b6b6b', marginBottom: '18px' }}>Provide a clear title for the FAQ article to publish in the notes directory.</p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '10px', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600 }}>Article Title</label>
              <input
                type="text"
                value={promoteTitle}
                onChange={(e) => setPromoteTitle(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '13.5px', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn" onClick={() => setPromoteId(null)} style={{ background: 'none', border: '1px solid #e0e0e0', cursor: 'pointer', padding: '6px 12px', borderRadius: '4px' }}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={() => handleAction(promoteId, 'promote', { title: promoteTitle, question: promoteQuestion })}
                style={{ background: '#0f0f0f', color: '#ffffff', border: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: '4px' }}
              >
                Create Note Draft
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

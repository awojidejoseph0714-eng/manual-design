'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }

      router.push('/admin');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f7f7f5',
      padding: '24px'
    }}>
      <div style={{
        background: '#ffffff',
        border: '1px solid #e0e0e0',
        borderRadius: '4px',
        width: '100%',
        maxWidth: '400px',
        padding: '36px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.04)'
      }}>
        <h1 style={{
          fontFamily: 'Lora, serif',
          fontSize: '24px',
          fontWeight: '400',
          marginBottom: '8px',
          textAlign: 'center'
        }}>Admin Login</h1>
        <p style={{
          fontSize: '13px',
          color: '#6b6b6b',
          textAlign: 'center',
          marginBottom: '28px'
        }}>BS 8110 Guide Gateway Control</p>

        {error && (
          <div style={{
            borderLeft: '3px solid #2f5d8a',
            background: '#eef3f7',
            color: '#2f5d8a',
            padding: '12px',
            fontSize: '13px',
            marginBottom: '20px',
            borderRadius: '0 4px 4px 0'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '18px' }}>
            <label style={{
              display: 'block',
              fontSize: '11px',
              fontFamily: 'IBM Plex Mono, monospace',
              textTransform: 'uppercase',
              marginBottom: '6px',
              fontWeight: 600
            }}>Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '11px',
              fontFamily: 'IBM Plex Mono, monospace',
              textTransform: 'uppercase',
              marginBottom: '6px',
              fontWeight: 600
            }}>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: '#0f0f0f',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              padding: '12px',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              cursor: 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

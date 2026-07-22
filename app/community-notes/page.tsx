'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Fuse from 'fuse.js';
import { sanityClient } from '@/lib/sanity';

interface Article {
  _id?: string;
  title: string;
  slug: { current: string } | string;
  date: string;
  tags: string[];
  answer: string;
}

const defaultFAQs: Article[] = [
  {
    title: "If a wall sits directly on a slab (not on a beam), how does the slab 'see' that load?",
    slug: "wall-load-on-slab",
    date: "July 22, 2026",
    tags: ["Slabs", "Loading"],
    answer: `<p>If a partition wall runs across a slab panel, it cannot be treated as a simple UDL. How it behaves depends on its orientation and weight:</p>
             <ul>
               <li><strong>Lightweight partitions (e.g., stud walls, drywall):</strong> BS 8110 and BS 6399-1 allow these to be represented by a uniform UDL allowance of <strong>1.0 kN/m²</strong> added directly to the slab dead load.</li>
               <li><strong>Heavy masonry walls (e.g., 9-inch sandcrete block walls):</strong> These must be treated as concentrated <strong>line loads</strong>. The bending moments are calculated using yield line methods, or by distributing the wall weight over a tributary strip of slab (often taken as a width of <em>b_w + 2h_slab</em>).</li>
             </ul>`
  },
  {
    title: "Do you always need to check a slab for punching shear, or only flat slabs?",
    slug: "punching-shear-necessity",
    date: "July 22, 2026",
    tags: ["Slabs", "Shear"],
    answer: `<p>Punching shear occurs when a concentrated load or column reaction acts on a relatively thin slab. While it is the primary governing design case for <strong>flat slabs</strong> (which sit directly on columns without beams, Cl. 3.7.7), you must also check it in:</p>
             <ul>
               <li>Standard slabs where a heavy column or point load lands directly on the slab (e.g., a transfer column situation).</li>
               <li>Foundation pad footings (which are effectively inverted slabs loaded by column reactions).</li>
             </ul>
             <p>For standard beam-and-slab layouts, beam supports distribute the load linearly, so only standard beam shear (Cl. 3.5.4) is checked.</p>`
  },
  {
    title: "If two beams intersect at right angles at midspan (not at a column), how do you handle the load transfer?",
    slug: "beam-intersection-midspan",
    date: "July 22, 2026",
    tags: ["Beams", "Loading"],
    answer: `<p>This is a secondary-to-primary beam intersection. The secondary beam transfers its end reaction as a concentrated <strong>point load</strong> onto the primary beam. The primary beam must be designed for this point load at midspan (creating a peak bending moment of <em>PL / 4</em> at that location, rather than UDL's <em>wL² / 8</em>).</p>
             <p><strong>Critical Detail:</strong> You must provide hanger/suspension reinforcement (links) at the intersection to "lift" the reaction from the bottom of the secondary beam into the top of the primary beam to prevent diagonal splitting failure.</p>`
  },
  {
    title: "Does a slab's live load (Q_k) ever get reduced, the way column live load is?",
    slug: "slab-live-load-reduction",
    date: "July 22, 2026",
    tags: ["Slabs", "Loading"],
    answer: `<p>No. Slab panels are designed for the full characteristic imposed load (Q_k) from BS 6399-1 without reductions. This is because a single slab panel can easily be fully loaded by crowds, furniture, or equipment.</p>
             <p>Live load reductions (BS 6399-1 Cl. 6) are statistical reductions applied only to columns, walls, and foundations that support large cumulative areas across multiple floors, as it is highly improbable that all floors will be fully loaded at the same time.</p>`
  },
  {
    title: "If a column is bigger at the bottom of the building than the top, does that count as 'slender' differently at each level?",
    slug: "column-slenderness-variation",
    date: "July 22, 2026",
    tags: ["Columns", "Slenderness"],
    answer: `<p>Yes, slenderness (l_e / h) is a floor-by-floor property, not a global building property. At each floor level, you compute l_e / h about both axes using the column's clear height (l_clear) and section dimension (h or b) at <em>that</em> specific storey.</p>
             <p>A column might be classified as "short" at the ground floor (due to a large cross-section or short floor height) but "slender" at upper storeys where the section is reduced or the floor height is taller.</p>`
  },
  {
    title: "Why does a cantilever need such a conservative span/depth ratio (7, versus 20 for simply supported)?",
    slug: "cantilever-span-depth-ratio",
    date: "July 22, 2026",
    tags: ["Beams", "Slabs", "Deflection"],
    answer: `<p>Cantilevers are highly sensitive to deflection. Unlike a simply supported beam which bends in a symmetric curve supported at both ends, a cantilever has maximum rotation at the free end.</p>
             <p>The deflection of a cantilever under a UDL is <em>wL⁴ / (8EI)</em>, compared to <em>5wL⁴ / (384EI)</em> for simply supported &mdash; which is <strong>9.6 times larger</strong> for the same span and load! To prevent excessive sag and rotation, the span-to-depth ratio is capped at 7.</p>`
  },
  {
    title: "Does the choice of f_cu (concrete grade) change how you calculate loads, or only how you design the section?",
    slug: "concrete-grade-load-effect",
    date: "July 22, 2026",
    tags: ["Materials", "Loading"],
    answer: `<p>Primarily, f_cu governs the design capacity of the cross-section (flexural compression, shear capacity v_c, column axial strength). However, concrete grade does indirectly affect the self-weight loading because higher grades might allow for thinner/smaller members, reducing the dead load (G_k).</p>
             <p>Note: The unit weight of reinforced concrete is typically assumed constant at <strong>24 kN/m³</strong> regardless of the strength grade.</p>`
  },
  {
    title: "If a beam has different reinforcement top and bottom at midspan, does that mean it's doubly reinforced?",
    slug: "beam-reinforcement-doubly-reinforced",
    date: "July 22, 2026",
    tags: ["Beams"],
    answer: `<p>No. A beam is only "doubly reinforced" if compression steel is <em>actively</em> required to carry the bending moment because the applied moment factor exceeds the singly reinforced limit (K > K' where K' = 0.156).</p>
             <p>Almost all beams have top steel at midspan for other reasons (e.g., hanger bars to support shear links, or anchorage continuity). If this top steel is not needed to resist compression block stress, the beam is designed as singly reinforced.</p>`
  },
  {
    title: "Do you need to check deflection separately for a slab if you've already checked it for the beam supporting it?",
    slug: "slab-vs-beam-deflection",
    date: "July 22, 2026",
    tags: ["Slabs", "Beams", "Deflection"],
    answer: `<p>Yes. Slabs and beams deflect relative to different boundaries. The beam deflections are relative to the columns, while slab deflections are relative to the beams. The total deflection seen by partitions on the slab is the cumulative sum of both.</p>
             <p>Therefore, you must satisfy the basic span/d ratios for the slab separately from the beam.</p>`
  }
];

export default function CommunityNotes() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  // Submission Form State
  const [email, setEmail] = useState('');
  const [question, setQuestion] = useState('');
  const [honeypot, setHoneypot] = useState(''); // website hidden honeypot
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitMessage, setSubmitMessage] = useState({ text: '', isError: false });

  // 1. Fetch community notes from Sanity or fallback
  useEffect(() => {
    async function loadNotes() {
      try {
        const query = '*[_type == "communityNote"] | order(date desc)';
        const fetched = await sanityClient.fetch(query);
        if (fetched && fetched.length > 0) {
          setArticles(fetched);
        } else {
          setArticles(defaultFAQs);
        }
      } catch (err) {
        console.warn('Failed to load notes from Sanity, using seed FAQs:', err);
        setArticles(defaultFAQs);
      }
    }
    loadNotes();
  }, []);

  // 2. Extract unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    articles.forEach(art => art.tags?.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [articles]);

  // 3. Search and Highlight logic with Fuse.js
  const searchResults = useMemo(() => {
    let list = articles;

    // Filter by tag first
    if (selectedTag) {
      list = list.filter(art => art.tags?.includes(selectedTag));
    }

    if (!searchQuery.trim()) {
      return list;
    }

    // Fuzzy search
    const fuse = new Fuse(list, {
      keys: ['title', 'answer', 'tags'],
      threshold: 0.35,
      includeMatches: true,
    });

    const results = fuse.search(searchQuery);

    // Apply keyword highlights to results
    return results.map(({ item, matches }) => {
      let title = item.title;
      let answer = item.answer;

      matches?.forEach(match => {
        if (match.key === 'title') {
          title = applyHighlight(item.title, match.indices);
        } else if (match.key === 'answer') {
          answer = applyHighlight(item.answer, match.indices);
        }
      });

      return {
        ...item,
        title,
        answer,
      };
    });
  }, [articles, searchQuery, selectedTag]);

  // Helper to apply HTML mark tags to matched search ranges
  function applyHighlight(text: string, indices: readonly [number, number][]) {
    let result = '';
    let lastIndex = 0;
    
    // Sort indices just in case
    const sortedIndices = [...indices].sort((a, b) => a[0] - b[0]);

    for (const [start, end] of sortedIndices) {
      result += text.slice(lastIndex, start);
      result += `<mark>${text.slice(start, end + 1)}</mark>`;
      lastIndex = end + 1;
    }
    result += text.slice(lastIndex);
    return result;
  }

  // 4. Form Submit handler
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitMessage({ text: '', isError: false });
    setSubmitLoading(true);

    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, question, website: honeypot }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit question');
      }

      setSubmitMessage({ text: 'Thank you! Your question has been submitted. We will reply to your email shortly.', isError: false });
      setEmail('');
      setQuestion('');
    } catch (err: any) {
      setSubmitMessage({ text: err.message, isError: true });
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="notes-container" style={{ padding: '60px 0 100px 0', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header */}
      <header style={{ borderBottom: '1px solid var(--rule)', paddingBottom: '30px', marginBottom: '40px' }}>
        <Link href="/" className="back-btn" style={{ textDecoration: 'none', color: 'var(--mid-gray)', fontSize: '11px', fontFamily: 'var(--mono)', letterSpacing: '0.1em', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '24px' }}>
          &larr; Back to Manual Design Guide
        </Link>
        <h1 style={{ fontFamily: 'Lora, serif', fontWeight: '400', fontSize: '32px', color: 'var(--black)', marginBottom: '8px' }}>Community Notes</h1>
        <p style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--mid-gray)', letterSpacing: '0.04em' }}>
          Browse shared knowledge, clarifications, and textbooks guidance
        </p>
      </header>

      {/* Ask / Issue Submission Form */}
      <div style={{
        background: 'var(--light-bg)',
        border: '1px solid var(--rule)',
        borderRadius: 'var(--radius)',
        padding: '24px',
        marginBottom: '40px'
      }}>
        <h3 style={{ fontFamily: 'Lora, serif', fontSize: '18px', fontWeight: '400', color: 'var(--black)', marginBottom: '8px' }}>Have a Confusing Question or Issue?</h3>
        <p style={{ fontSize: '13.5px', color: 'var(--mid-gray)', marginBottom: '18px', lineHeight: '1.5' }}>
          Drop your email and describe the issue or question. We will review it, answer you directly in your email, and post a notes article in the directory.
        </p>

        {submitMessage.text && (
          <div style={{
            borderLeft: `3px solid ${submitMessage.isError ? '#e05a5a' : 'var(--accent)'}`,
            background: submitMessage.isError ? '#fdf2f2' : 'var(--accent-bg)',
            color: submitMessage.isError ? '#e05a5a' : 'var(--accent)',
            padding: '12px',
            fontSize: '13px',
            marginBottom: '20px',
            borderRadius: '0 var(--radius) var(--radius) 0'
          }}>
            {submitMessage.text}
          </div>
        )}

        <form onSubmit={handleFormSubmit}>
          {/* Honeypot field (hidden from users) */}
          <div style={{ display: 'none' }}>
            <label htmlFor="website">Leave this blank</label>
            <input type="text" id="website" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <input
                type="email"
                required
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid var(--rule)',
                  borderRadius: 'var(--radius)',
                  fontFamily: 'var(--sans)',
                  fontSize: '13.5px',
                  outline: 'none',
                  background: 'var(--white)'
                }}
              />
            </div>

            <div>
              <textarea
                required
                rows={3}
                placeholder="Describe your design confusion or raise an issue..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid var(--rule)',
                  borderRadius: 'var(--radius)',
                  fontFamily: 'var(--sans)',
                  fontSize: '13.5px',
                  outline: 'none',
                  background: 'var(--white)',
                  resize: 'vertical'
                }}
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={submitLoading}
                style={{
                  background: 'var(--black)',
                  color: 'var(--white)',
                  border: 'none',
                  borderRadius: 'var(--radius)',
                  padding: '10px 20px',
                  fontFamily: 'var(--mono)',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                  opacity: submitLoading ? 0.7 : 1
                }}
              >
                {submitLoading ? 'Submitting...' : 'Submit Inquiry'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Search and Tag Controls */}
      <div style={{ marginBottom: '30px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search community notes by keyword, code clause, or topic..."
          style={{
            width: '100%',
            padding: '12px 16px',
            fontSize: '14.5px',
            border: '1px solid var(--rule)',
            borderRadius: 'var(--radius)',
            fontFamily: 'var(--sans)',
            background: 'var(--light-bg)',
            color: 'var(--black)',
            outline: 'none'
          }}
        />

        <div className="tag-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <button
            onClick={() => setSelectedTag('')}
            className={`tag-pill ${!selectedTag ? 'active' : ''}`}
          >
            All Topics
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`tag-pill ${selectedTag === tag ? 'active' : ''}`}
            >
              #{tag.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Notes Directory Cards */}
      <main className="journal-list" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {searchResults.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--mid-gray)' }}>
            <h3 style={{ fontFamily: 'Lora, serif', fontSize: '20px', fontWeight: '400', color: 'var(--black)', marginBottom: '8px' }}>
              No notes found
            </h3>
            <p style={{ fontSize: '13.5px' }}>Try adjustments to your keywords or clear your tag filters.</p>
          </div>
        ) : (
          searchResults.map((art, idx) => {
            const slugVal = typeof art.slug === 'string' ? art.slug : art.slug?.current || `note-${idx}`;
            return (
              <article key={idx} className="journal-card">
                <div className="card-meta">
                  <span>{art.date}</span>
                  <div className="card-tags">
                    {art.tags?.map(t => (
                      <span key={t} className="card-tag">#{t.toLowerCase()}</span>
                    ))}
                  </div>
                </div>
                
                <h2 style={{ fontSize: '20px', fontWeight: '500', marginBottom: '12px' }}>
                  <Link
                    href={`/community-notes/${slugVal}`}
                    style={{ textDecoration: 'none', color: 'var(--black)' }}
                    dangerouslySetInnerHTML={{ __html: art.title }}
                  />
                </h2>
                
                <div
                  className="card-answer"
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontSize: '14.5px',
                    color: 'var(--dark-gray)',
                    marginBottom: '14px'
                  }}
                  dangerouslySetInnerHTML={{ __html: art.answer }}
                />

                <Link
                  href={`/community-notes/${slugVal}`}
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '11px',
                    color: 'var(--accent)',
                    textTransform: 'uppercase',
                    textDecoration: 'none',
                    fontWeight: 600
                  }}
                >
                  Read Note Article &rarr;
                </Link>
              </article>
            );
          })
        )}
      </main>

    </div>
  );
}

'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Fuse from 'fuse.js';
import { sanityClient, urlFor } from '@/lib/sanity';

interface Article {
  _id?: string;
  title: string;
  slug: { current: string } | string;
  date: string;
  tags: string[];
  answer: string;
  image?: {
    asset?: {
      _ref?: string;
    };
  };
}

interface DiscussionReply {
  id: string;
  author: string;
  date: string;
  content: string;
  likes: number;
  dislikes: number;
}

interface DiscussionTopic {
  id: string;
  topic: string;
  content: string;
  author: string;
  date: string;
  likes: number;
  dislikes: number;
  replies: DiscussionReply[];
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

const seedDiscussions: DiscussionTopic[] = [
  {
    id: "disc-1",
    topic: "Part 3 · Beams & Shear",
    content: "When designing high-strength transfer beams (C50/60 and above), why does BS 8110 cap maximum concrete shear resistance v_c at 0.8 √f_cu instead of scaling linearly with higher strength grades?\n\nIn ultra-high-strength mixtures, diagonal shear cracks shear straight through the aggregate particles rather than around them, resulting in a remarkably smooth crack face with almost zero friction or aggregate interlock resistance.",
    author: "David M.",
    date: "4 hours ago",
    likes: 24,
    dislikes: 1,
    replies: [
      {
        id: "rep-101",
        author: "Joseph A.",
        date: "3 hours ago",
        content: "Spot on with the aggregate interlock physics. To prevent sudden, brittle diagonal shear explosions without warning, BS 8110 deliberately caps the shear stress contribution of the concrete matrix at 0.8√f_cu (max 5.0 N/mm²), ensuring structural ductility is governed by yielding of vertical shear links rather than brittle matrix shear.",
        likes: 19,
        dislikes: 0
      },
      {
        id: "rep-102",
        author: "Samuel K.",
        date: "2 hours ago",
        content: "Also worth mentioning that even in Eurocode 2 (BS EN 1992-1-1), a similar brittleness reduction factor is enforced for strength classes above C50/60 via the factor ν = 0.6 × (1 - f_ck / 250). Never attempt to rely on concrete tension alone in high-shear transfer zones—always detail robust closed links!",
        likes: 7,
        dislikes: 0
      }
    ]
  },
  {
    id: "disc-2",
    topic: "Part 1 · Flat Slabs & Punching Shear",
    content: "In a G+3 flat slab commercial office with no edge perimeter beams, corner columns take significant moment transfer due to unbalanced gravity loading. When checking punching shear around the corner perimeter, should we adjust the effective shear force V_eff by modeling edge torsional stiffness or directly applying magnification factors?",
    author: "Emmanuel B.",
    date: "1 day ago",
    likes: 15,
    dislikes: 0,
    replies: [
      {
        id: "rep-201",
        author: "Olukorede A.",
        date: "20 hours ago",
        content: "For corner columns without spandrel beams, BS 8110 Cl. 3.7.6.3 directs that the applied punching shear force should be multiplied by the magnification factor V_eff = 1.25 V_t to account for unbalanced eccentricity, rather than attempting complex FE torsional stiffness modeling of the edge concrete strip. Make sure your reinforcement detailing extends U-bar hairpins along the free slab edges!",
        likes: 12,
        dislikes: 0
      }
    ]
  },
  {
    id: "disc-3",
    topic: "Part 0 · Fundamentals & Redistribution",
    content: "When taking advantage of 30% downward moment redistribution over internal supports to relieve congestion of top steel in continuous beam supports, we correspondingly increase midspan bottom steel. What critical checks on neutral axis depth ratio (x/d) must be verified to prevent premature crushing before plastic rotation can take place?",
    author: "Taiwo E.",
    date: "2 days ago",
    likes: 19,
    dislikes: 1,
    replies: [
      {
        id: "rep-301",
        author: "Chinedu O.",
        date: "1 day ago",
        content: "Redistribution requires sufficient rotational ductility at the support plastic hinge so that the support angle can rotate without crushing the compressed bottom face of the beam concrete. Under Cl. 3.4.4.4, you must restrict the neutral axis depth ratio using x/d ≤ (β_b - 0.4) / 0.5. For a maximum 30% reduction (β_b = 0.70), this limits your maximum allowed neutral axis depth to x/d ≤ 0.60!",
        likes: 16,
        dislikes: 0
      },
      {
        id: "rep-302",
        author: "David M.",
        date: "1 day ago",
        content: "Also, remember the detailing rule in Cl. 3.12.10.3: when you redistribute support moments downward, the point of contraflexure moves further out into the span. You must extend your top curtailment reinforcement bars an additional distance equal to at least the effective depth (d) beyond the recalculated zero-moment point.",
        likes: 8,
        dislikes: 0
      }
    ]
  },
  {
    id: "disc-4",
    topic: "Part 1 · Slabs & Detailing",
    content: "In typical G+1 residential floor slab panels where L_x = 2.8m and slab thickness h = 150mm, the L/d ratio is barely 18 (vs allowable 26). If the panel is designed as simply supported between brick walls, can we completely eliminate top reinforcement mesh at the support boundaries to economize on site bar fixing?",
    author: "Grace F.",
    date: "3 days ago",
    likes: 11,
    dislikes: 0,
    replies: [
      {
        id: "rep-401",
        author: "Joseph A.",
        date: "2 days ago",
        content: "No, never completely eliminate top reinforcement at support perimeters even in nominally 'simply supported' residential slabs! In physical reality, masonry walls and beam supports always exert partial rotational restraint (clamping effect) due to dead weight and monolithic casting. Without at least nominal top steel over supports (typically 0.13% of concrete area, e.g. Y8 or Y10 @ 250mm c/c extending 0.15 L_x into the span), wide unsightly tension cracks will form along the perimeter ceiling and flooring finishes.",
        likes: 14,
        dislikes: 0
      }
    ]
  },
  {
    id: "disc-5",
    topic: "Part 1 · Slab Loading & Walls",
    content: "When calculating the line load of an internal 230mm sandcrete block wall of height 3.0m running parallel across a two-way slab span, if there is a standard 0.9m x 2.1m doorway opening in the middle of the wall, do we simply deduct the doorway area percentage (e.g. multiplied by 0.85 opening factor), or does the lintel transfer concentrated reaction point loads to either side of the doorway?",
    author: "Babatunde R.",
    date: "4 days ago",
    likes: 9,
    dislikes: 0,
    replies: [
      {
        id: "rep-501",
        author: "Olukorede A.",
        date: "3 days ago",
        content: "For general preliminary slab shear and flexure take-down, applying a uniform net reduction factor (typically 0.85 for domestic doors, or calculating net solid wall surface area) is widely accepted standard practice (Reynolds & Steedman). However, if the opening is wide (e.g., a double folding arch > 1.8m wide), the masonry lintel above the opening will concentrate significant point loads at the door jamb bearings. In such cases, check local slab bending right under the door bearings!",
        likes: 9,
        dislikes: 0
      }
    ]
  },
  {
    id: "disc-6",
    topic: "Part 5 · Slender Columns",
    content: "In a double-height commercial entrance lobby, our rectangular concrete column is 300mm x 600mm with a clear height of 5.2m. When applying minimal design moments, do we check e_min against 0.05 multiplied by the overall column height, or 0.05 multiplied by the cross-sectional depth in the direction of bending?",
    author: "Kelvin N.",
    date: "5 days ago",
    likes: 14,
    dislikes: 1,
    replies: []
  }
];

const availableTopics = [
  "Part 0 · Fundamentals & Redistribution",
  "Part 1 · Solid Slabs",
  "Part 1 · Flat & Ribbed Slabs",
  "Part 1 · Slab Loading & Walls",
  "Part 2 · Stairs",
  "Part 3 · Beams & Shear",
  "Part 3 · Deflection & Cracking",
  "Part 4 · Walls",
  "Part 5 · Slender Columns",
  "Part 6 · Foundations",
  "Part 7 · Building & Robustness",
  "General Design & Practice"
];

export default function CommunityNotes() {
  const [activeTab, setActiveTab] = useState<'notes' | 'discussion'>('notes');
  const [articles, setArticles] = useState<Article[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  const [discussions, setDiscussions] = useState<DiscussionTopic[]>(seedDiscussions);
  const [discSearch, setDiscSearch] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newTopic, setNewTopic] = useState(availableTopics[0]);
  const [newAuthor, setNewAuthor] = useState('');
  const [newContent, setNewContent] = useState('');

  const [replyAuthor, setReplyAuthor] = useState<{ [key: string]: string }>({});
  const [replyContent, setReplyContent] = useState<{ [key: string]: string }>({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [question, setQuestion] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'none' | 'strong' | 'moderate' | null>(null);
  const [suggestedArticle, setSuggestedArticle] = useState<Article | null>(null);

  useEffect(() => {
    async function loadNotes() {
      let fetched: Article[] = [];
      try {
        const res = await fetch('/api/notes', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          fetched = data.notes || [];
        } else {
          const query = '*[_type == "communityNote"] | order(date desc)';
          fetched = (await sanityClient.fetch(query)) || [];
        }
      } catch (err) {
        console.warn('Fallback: Loading seed FAQs only.');
      }
      const sanitySlugs = new Set(fetched.map(note => typeof note.slug === 'string' ? note.slug : note.slug?.current));
      const filteredDefaults = defaultFAQs.filter(df => !sanitySlugs.has(typeof df.slug === 'string' ? df.slug : (df.slug as any)?.current));
      setArticles([...fetched, ...filteredDefaults]);
    }
    loadNotes();
  }, []);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    articles.forEach(art => art.tags?.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [articles]);

  const searchResults = useMemo(() => {
    let list = articles;
    if (selectedTag) list = list.filter(art => art.tags?.includes(selectedTag));
    if (!searchQuery.trim()) return list;
    const fuse = new Fuse(list, { keys: ['title', 'answer', 'tags'], threshold: 0.35, includeMatches: true });
    const results = fuse.search(searchQuery);
    return results.map(({ item, matches }) => {
      let title = item.title;
      let answer = item.answer;
      matches?.forEach(match => {
        if (match.key === 'title') title = applyHighlight(item.title, match.indices);
        else if (match.key === 'answer') answer = applyHighlight(item.answer, match.indices);
      });
      return { ...item, title, answer };
    });
  }, [articles, searchQuery, selectedTag]);

  function applyHighlight(text: string, indices: readonly [number, number][]) {
    let result = '';
    let lastIndex = 0;
    const sortedIndices = [...indices].sort((a, b) => a[0] - b[0]);
    for (const [start, end] of sortedIndices) {
      result += text.slice(lastIndex, start);
      result += `<mark>${text.slice(start, end + 1)}</mark>`;
      lastIndex = end + 1;
    }
    result += text.slice(lastIndex);
    return result;
  }

  const filteredDiscussions = useMemo(() => {
    let list = [...discussions];
    if (selectedTopic) {
      list = list.filter(d => d.topic.toLowerCase().includes(selectedTopic.toLowerCase()));
    }
    if (discSearch.trim()) {
      const qLower = discSearch.toLowerCase();
      list = list.filter(d => 
        d.content.toLowerCase().includes(qLower) || 
        d.author.toLowerCase().includes(qLower) ||
        d.topic.toLowerCase().includes(qLower)
      );
    }
    return list;
  }, [discussions, selectedTopic, discSearch]);

  const handleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDiscussions(prev => prev.map(d => d.id === id ? { ...d, likes: d.likes + 1 } : d));
  };

  const handleDislike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDiscussions(prev => prev.map(d => d.id === id ? { ...d, dislikes: d.dislikes + 1 } : d));
  };

  const handleLikeReply = (topicId: string, replyId: string) => {
    setDiscussions(prev => prev.map(d => {
      if (d.id === topicId) {
        return {
          ...d,
          replies: d.replies.map(r => r.id === replyId ? { ...r, likes: r.likes + 1 } : r)
        };
      }
      return d;
    }));
  };

  const handleDislikeReply = (topicId: string, replyId: string) => {
    setDiscussions(prev => prev.map(d => {
      if (d.id === topicId) {
        return {
          ...d,
          replies: d.replies.map(r => r.id === replyId ? { ...r, dislikes: r.dislikes + 1 } : r)
        };
      }
      return d;
    }));
  };

  const handleCreateDiscussion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    const newDisc: DiscussionTopic = {
      id: `disc-${Date.now()}`,
      topic: newTopic || 'General Design & Practice',
      content: newContent.trim(),
      author: newAuthor.trim() || 'Anonymous Engineer',
      date: 'Just now',
      likes: 1,
      dislikes: 0,
      replies: []
    };
    setDiscussions(prev => [newDisc, ...prev]);
    setIsNewModalOpen(false);
    setNewContent('');
    setNewAuthor('');
  };

  const handlePostReply = (topicId: string, e: React.FormEvent) => {
    e.preventDefault();
    const content = replyContent[topicId]?.trim();
    if (!content) return;
    const author = replyAuthor[topicId]?.trim() || 'Anonymous Engineer';
    const newRep: DiscussionReply = {
      id: `rep-${Date.now()}`,
      author,
      date: 'Just now',
      content,
      likes: 1,
      dislikes: 0
    };
    setDiscussions(prev => prev.map(d => {
      if (d.id === topicId) {
        return { ...d, replies: [...d.replies, newRep] };
      }
      return d;
    }));
    setReplyContent(prev => ({ ...prev, [topicId]: '' }));
    setReplyAuthor(prev => ({ ...prev, [topicId]: '' }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      const fuse = new Fuse(articles, { keys: ['title', 'answer'], includeScore: true, threshold: 0.7 });
      const searchHits = fuse.search(question);
      let type: 'none' | 'strong' | 'moderate' = 'none';
      let suggested: Article | null = null;
      if (searchHits.length > 0) {
        const topHit = searchHits[0];
        const score = topHit.score || 1;
        suggested = topHit.item;
        if (score < 0.4) type = 'strong';
        else if (score < 0.7) type = 'moderate';
      }
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, question, website: honeypot }),
      });
      if (!res.ok) throw new Error('Submission failed');
      setFeedbackType(type);
      setSuggestedArticle(suggested);
      setEmail('');
      setQuestion('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const closeFeedbackModal = () => {
    setIsModalOpen(false);
    setFeedbackType(null);
    setSuggestedArticle(null);
  };

  return (
    <div className="notes-container" style={{ padding: '60px 0 120px 0', fontFamily: 'Inter, sans-serif', maxWidth: '780px', margin: '0 auto', paddingLeft: '24px', paddingRight: '24px' }}>
      <div style={{ paddingBottom: '12px', marginBottom: '8px' }}>
        <Link href="/" className="back-btn" style={{ textDecoration: 'none', color: 'var(--mid-gray)', fontSize: '11px', fontFamily: 'var(--mono)', letterSpacing: '0.1em', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '24px' }}>
          &larr; Back to Manual Design Guide
        </Link>
        <h1 style={{ fontFamily: 'Lora, serif', fontWeight: '400', fontSize: '34px', color: 'var(--black)', marginBottom: '8px' }}>FAQ &amp; Notes</h1>
        <p style={{ fontFamily: 'var(--mono)', fontSize: '11.5px', color: 'var(--mid-gray)', letterSpacing: '0.04em' }}>
          BS 8110 Structural Knowledge Base &middot; Curated FAQ &middot; Peer Discussion
        </p>
      </div>

      <div className="forum-tabs-bar" style={{ display: 'flex', gap: '24px', borderBottom: '1px solid #e0e0e0', marginBottom: '32px' }}>
        <button 
          onClick={() => { setActiveTab('notes'); setExpandedId(null); }} 
          style={{
            background: 'none', border: 'none', padding: '12px 4px', fontFamily: 'Inter, sans-serif', fontSize: '14.5px', fontWeight: activeTab === 'notes' ? 600 : 400, color: activeTab === 'notes' ? '#000000' : '#666666', cursor: 'pointer', borderBottom: activeTab === 'notes' ? '2px solid #000000' : '2px solid transparent', marginBottom: '-1px', transition: 'all 0.15s ease', display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          Notes
        </button>
        <button 
          onClick={() => { setActiveTab('discussion'); setExpandedId(null); }} 
          style={{
            background: 'none', border: 'none', padding: '12px 4px', fontFamily: 'Inter, sans-serif', fontSize: '14.5px', fontWeight: activeTab === 'discussion' ? 600 : 400, color: activeTab === 'discussion' ? '#000000' : '#666666', cursor: 'pointer', borderBottom: activeTab === 'discussion' ? '2px solid #000000' : '2px solid transparent', marginBottom: '-1px', transition: 'all 0.15s ease', display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          Discussion
        </button>
      </div>

      {activeTab === 'notes' && (
        <>
          <div style={{ marginBottom: '36px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes by keyword, clause, or topic..."
              style={{ width: '100%', padding: '11px 15px', fontSize: '14px', border: '1px solid #d8d8d8', borderRadius: '6px', fontFamily: 'Inter, sans-serif', background: '#fafafa', color: '#111111', outline: 'none' }}
            />
            <div className="tag-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              <button onClick={() => setSelectedTag('')} className={`tag-pill ${!selectedTag ? 'active' : ''}`} style={{ fontSize: '11.5px', padding: '4px 10px', borderRadius: '4px' }}>
                All Topics
              </button>
              {allTags.map(tag => (
                <button key={tag} onClick={() => setSelectedTag(tag)} className={`tag-pill ${selectedTag === tag ? 'active' : ''}`} style={{ fontSize: '11.5px', padding: '4px 10px', borderRadius: '4px' }}>
                  #{tag.toLowerCase()}
                </button>
              ))}
            </div>
          </div>
          <main style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {searchResults.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b6b6b' }}>
                <h3 style={{ fontFamily: 'Lora, serif', fontSize: '20px', fontWeight: '400', color: '#111111', marginBottom: '8px' }}>No notes found</h3>
                <p style={{ fontSize: '13.5px' }}>Try adjustments to your keywords or clear your tag filters.</p>
              </div>
            ) : (
              searchResults.map((art, idx) => {
                const slugVal = typeof art.slug === 'string' ? art.slug : art.slug?.current || `note-${idx}`;
                return (
                  <article key={idx} style={{ display: 'flex', gap: '20px', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 24px', border: '1px solid #e8e8e8', borderRadius: '8px', background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: '#6e6e6e', fontFamily: 'var(--mono)', marginBottom: '8px' }}>
                        <span>{art.date}</span>
                        <span>&middot;</span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {art.tags?.map(t => (
                            <span key={t} style={{ color: '#333333', background: '#f0f0f0', padding: '1px 6px', borderRadius: '3px', fontSize: '10.5px' }}>#{t.toLowerCase()}</span>
                          ))}
                        </div>
                      </div>
                      <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '10px', color: '#111111', lineHeight: '1.4' }}>
                        <Link href={`/community-notes/${slugVal}`} style={{ textDecoration: 'none', color: '#111111' }} dangerouslySetInnerHTML={{ __html: art.title }} />
                      </h2>
                      <div style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '14px', color: '#4a4a4a', lineHeight: '1.5', marginBottom: '14px' }} dangerouslySetInnerHTML={{ __html: art.answer }} />
                      <Link href={`/community-notes/${slugVal}`} style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#000000', textDecoration: 'underline', fontWeight: 600 }}>
                        Read Full Note &rarr;
                      </Link>
                    </div>
                    {art.image && (
                      <img src={urlFor(art.image).width(120).height(80).url()} alt={art.title} style={{ width: '120px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e5e5e5', flexShrink: 0, marginTop: '4px' }} />
                    )}
                  </article>
                );
              })
            )}
          </main>
        </>
      )}

      {activeTab === 'discussion' && (
        <main>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ flex: 1, minWidth: '240px' }}>
              <input type="text" value={discSearch} onChange={(e) => setDiscSearch(e.target.value)} placeholder="Search discussion threads by topic, text, or author..." style={{ width: '100%', padding: '10px 14px', fontSize: '13.5px', border: '1px solid #d8d8d8', borderRadius: '6px', background: '#fafafa', color: '#111111', outline: 'none' }} />
            </div>
            <button onClick={() => setIsNewModalOpen(true)} style={{ background: '#000000', color: '#ffffff', border: 'none', padding: '10px 18px', borderRadius: '6px', fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '15px' }}>+</span> New Discussion
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', borderBottom: '1px solid #e8e8e8', paddingBottom: '20px', marginBottom: '24px' }}>
            <button onClick={() => setSelectedTopic('')} style={{ background: !selectedTopic ? '#000000' : '#f0f0f0', color: !selectedTopic ? '#ffffff' : '#333333', border: 'none', padding: '5px 12px', borderRadius: '4px', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>All Topics</button>
            {(["Part 0", "Part 1", "Part 2", "Part 3", "Part 4", "General"] as const).map(t => (
              <button key={t} onClick={() => setSelectedTopic(t)} style={{ background: selectedTopic === t ? '#000000' : '#f0f0f0', color: selectedTopic === t ? '#ffffff' : '#333333', border: 'none', padding: '5px 12px', borderRadius: '4px', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>{t}</button>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredDiscussions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#6e6e6e' }}>
                <p style={{ fontSize: '15px', fontWeight: 500, color: '#111111', marginBottom: '8px' }}>No discussions match your filter</p>
                <p style={{ fontSize: '13.5px' }}>Be the first to start a clean, minimal discussion on this structural topic!</p>
              </div>
            ) : (
              filteredDiscussions.map((d) => {
                const isExpanded = expandedId === d.id;
                return (
                  <div key={d.id} style={{ background: '#ffffff', border: '1px solid #e2e2e2', borderRadius: '8px', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '12.5px', color: '#6e6e6e', fontFamily: 'Inter, sans-serif' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ fontWeight: 600, color: '#111111' }}>{d.author}</span><span>&middot;</span><span>{d.date}</span></div>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11.5px', background: '#f4f4f4', color: '#333333', border: '1px solid #e6e6e6', padding: '3px 9px', borderRadius: '4px', fontWeight: 500 }}>{d.topic}</span>
                    </div>
                    <p style={{ fontSize: '14.5px', lineHeight: '1.6', color: '#1b1b1b', margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'Inter, sans-serif' }}>{d.content}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '2px', paddingTop: '12px', borderTop: '1px solid #f3f3f3', fontSize: '13px', fontFamily: 'Inter, sans-serif', color: '#555555' }}>
                      <button onClick={(e) => handleLike(d.id, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', padding: 0, color: '#555555' }} title="Like">
                        <span style={{ fontSize: '14px', color: d.likes > 20 ? '#000000' : '#555555' }}>♥</span> <strong style={{ fontWeight: 600, color: '#222222' }}>{d.likes}</strong>
                      </button>
                      <button onClick={(e) => handleDislike(d.id, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', padding: 0, color: '#555555' }} title="Dislike">
                        <span>👎</span> {d.dislikes > 0 && <strong style={{ fontWeight: 600, color: '#222222' }}>{d.dislikes}</strong>}
                      </button>
                      <button onClick={() => setExpandedId(isExpanded ? null : d.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: 0, color: isExpanded ? '#000000' : '#555555', fontWeight: isExpanded ? 600 : 400 }}>
                        <span>💬</span> <span>{d.replies.length === 0 ? 'Reply' : `${d.replies.length} ${d.replies.length === 1 ? 'reply' : 'replies'}`}</span>
                      </button>
                    </div>
                    {isExpanded && (
                      <div style={{ marginTop: '6px', paddingTop: '14px', paddingLeft: '16px', borderLeft: '2px solid #e0e0e0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {d.replies.length > 0 ? (
                          d.replies.map(rep => (
                            <div key={rep.id} style={{ display: 'flex', flexDirection: 'column', gap: '5px', paddingBottom: '12px', borderBottom: '1px solid #f7f7f7' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#6e6e6e' }}><strong style={{ color: '#111111', fontWeight: 600 }}>{rep.author}</strong><span>&middot;</span><span>{rep.date}</span></div>
                              <p style={{ fontSize: '13.5px', lineHeight: '1.55', color: '#2b2b2b', margin: '2px 0 4px 0', whiteSpace: 'pre-wrap' }}>{rep.content}</p>
                              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', fontSize: '12px', color: '#6e6e6e' }}>
                                <button onClick={() => handleLikeReply(d.id, rep.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555555', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}><span>♥</span> <strong style={{ color: '#222222', fontWeight: 600 }}>{rep.likes}</strong></button>
                                <button onClick={() => handleDislikeReply(d.id, rep.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555555', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}><span>👎</span> {rep.dislikes > 0 && <strong style={{ color: '#222222', fontWeight: 600 }}>{rep.dislikes}</strong>}</button>
                              </div>
                            </div>
                          ))
                        ) : (<div style={{ fontSize: '13px', color: '#777777', fontStyle: 'italic', marginBottom: '4px' }}>No replies yet.</div>)}
                        <form onSubmit={(e) => handlePostReply(d.id, e)} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px', background: '#f8f8f8', padding: '12px 14px', borderRadius: '6px', border: '1px solid #eeeeee' }}>
                          <input type="text" placeholder="Your Name" value={replyAuthor[d.id] || ''} onChange={(e) => setReplyAuthor(prev => ({ ...prev, [d.id]: e.target.value }))} style={{ width: '100%', padding: '8px 10px', fontSize: '13px', border: '1px solid #dcdcdc', borderRadius: '4px', outline: 'none', background: '#ffffff' }} />
                          <textarea required rows={2} placeholder="Write your reply..." value={replyContent[d.id] || ''} onChange={(e) => setReplyContent(prev => ({ ...prev, [d.id]: e.target.value }))} style={{ width: '100%', padding: '8px 10px', fontSize: '13.5px', border: '1px solid #dcdcdc', borderRadius: '4px', outline: 'none', background: '#ffffff', resize: 'vertical' }} />
                          <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button type="submit" style={{ background: '#000000', color: '#ffffff', border: 'none', padding: '7px 16px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Post Reply</button></div>
                        </form>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </main>
      )}

      {/* Floating Ask Question Button (General FAQ modal) */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="floating-faq-btn"
        aria-label="Ask a question"
        style={{ right: '24px', left: 'auto' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: "-1px" }}><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
        Ask Question
      </button>

      {/* Floating Back to Guide Button (Left) */}
      <Link
        href="/"
        className="floating-faq-btn-left"
        aria-label="Back to guide"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: "-1px" }}><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        Back to Guide
      </Link>

      {/* =========================================================================
          MODAL 1: EDITORIAL INBOX QUESTION (EXISTING MODAL)
          ========================================================================= */}
      {isModalOpen && (
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
            borderRadius: 'var(--radius)',
            padding: '28px',
            width: '100%',
            maxWidth: '500px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
          }}>
            
            {feedbackType === null ? (
              <>
                <h3 style={{ fontFamily: 'Lora, serif', fontSize: '20px', fontWeight: '400', marginBottom: '8px' }}>Ask a Question</h3>
                <p style={{ fontSize: '13px', color: 'var(--mid-gray)', marginBottom: '20px', lineHeight: '1.5' }}>
                  Have a point of structural confusion? Ask here. We will check our notes and send a reply directly to your inbox.
                </p>

                <form onSubmit={handleFormSubmit}>
                  <div style={{ display: 'none' }}>
                    <label htmlFor="website">Leave this blank</label>
                    <input type="text" id="website" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', fontFamily: 'var(--mono)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600 }}>Your Email</label>
                      <input
                        type="email"
                        required
                        placeholder="email@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', fontSize: '13.5px', outline: 'none' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', fontFamily: 'var(--mono)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600 }}>Describe your question</label>
                      <textarea
                        required
                        rows={4}
                        placeholder="What are you confused about in the design? Be specific..."
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', fontSize: '13.5px', outline: 'none', resize: 'vertical' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button type="button" onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: '1px solid var(--rule)', cursor: 'pointer', padding: '8px 16px', borderRadius: 'var(--radius)', fontFamily: 'var(--mono)', fontSize: '11px', textTransform: 'uppercase' }}>Cancel</button>
                    <button
                      type="submit"
                      disabled={submitLoading}
                      style={{
                        background: 'var(--black)',
                        color: 'var(--white)',
                        border: 'none',
                        borderRadius: 'var(--radius)',
                        padding: '8px 20px',
                        fontFamily: 'var(--mono)',
                        fontSize: '11px',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        opacity: submitLoading ? 0.7 : 1
                      }}
                    >
                      {submitLoading ? 'Submitting...' : 'Submit Inquiry'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div style={{ textAlign: 'left' }}>
                <h3 style={{ fontFamily: 'Lora, serif', fontSize: '20px', fontWeight: '400', marginBottom: '14px', color: 'var(--black)' }}>Inquiry Submitted</h3>
                
                {feedbackType === 'strong' && suggestedArticle && (
                  <div style={{ borderLeft: '3px solid var(--accent)', background: 'var(--accent-bg)', padding: '16px', borderRadius: '0 var(--radius) var(--radius) 0', marginBottom: '24px' }}>
                    <p style={{ fontSize: '14px', color: 'var(--black)', marginBottom: '12px', fontWeight: 600 }}>
                      💡 We found an answer to your question in our notes!
                    </p>
                    <p style={{ fontSize: '13.5px', color: 'var(--dark-gray)', marginBottom: '14px' }}>
                      You can read the full article immediately:
                    </p>
                    <Link
                      href={`/community-notes/${typeof suggestedArticle.slug === 'string' ? suggestedArticle.slug : (suggestedArticle.slug as any).current}`}
                      style={{
                        fontSize: '14px',
                        color: 'var(--accent)',
                        textDecoration: 'underline',
                        fontWeight: 600,
                        display: 'inline-block'
                      }}
                      onClick={closeFeedbackModal}
                    >
                      {suggestedArticle.title} &rarr;
                    </Link>
                  </div>
                )}

                {feedbackType === 'moderate' && suggestedArticle && (
                  <div style={{ borderLeft: '3px solid var(--accent)', background: 'var(--accent-bg)', padding: '16px', borderRadius: '0 var(--radius) var(--radius) 0', marginBottom: '24px' }}>
                    <p style={{ fontSize: '14px', color: 'var(--black)', marginBottom: '8px', fontWeight: 600 }}>
                      💡 Here is a note similar to your query:
                    </p>
                    <Link
                      href={`/community-notes/${typeof suggestedArticle.slug === 'string' ? suggestedArticle.slug : (suggestedArticle.slug as any).current}`}
                      style={{
                        fontSize: '13.5px',
                        color: 'var(--accent)',
                        textDecoration: 'underline',
                        fontWeight: 600,
                        display: 'inline-block',
                        marginBottom: '14px'
                      }}
                      onClick={closeFeedbackModal}
                    >
                      {suggestedArticle.title} &rarr;
                    </Link>
                    <p style={{ fontSize: '12.5px', color: '#6b6b6b', margin: 0 }}>
                      If this does not resolve your query, don't worry! We have also logged your question and will send a reply directly to your inbox.
                    </p>
                  </div>
                )}

                {feedbackType === 'none' && (
                  <div style={{ borderLeft: '3px solid #6b6b6b', background: 'var(--light-bg)', padding: '16px', borderRadius: '0 var(--radius) var(--radius) 0', marginBottom: '24px' }}>
                    <p style={{ fontSize: '13.5px', color: 'var(--dark-gray)', margin: 0 }}>
                      Thank you! We've successfully received your question. Our engineering team will review it and reply to your email shortly.
                    </p>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={closeFeedbackModal}
                    style={{
                      background: 'var(--black)',
                      color: 'var(--white)',
                      border: 'none',
                      borderRadius: 'var(--radius)',
                      padding: '8px 20px',
                      fontFamily: 'var(--mono)',
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      cursor: 'pointer'
                    }}
                  >
                    Continue Reading
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

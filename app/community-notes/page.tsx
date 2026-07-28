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

interface ForumAnswer {
  id: string;
  author: string;
  authorRole: string;
  date: string;
  content: string;
  votes: number;
  isAccepted?: boolean;
}

interface ForumQuestion {
  id: string;
  title: string;
  clauseRef?: string;
  content: string;
  author: string;
  authorRole: string;
  date: string;
  tags: string[];
  votes: number;
  views: number;
  answers: ForumAnswer[];
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

const seedForumQuestions: ForumQuestion[] = [
  {
    id: "so-1",
    title: "Why does BS 8110 cap maximum concrete shear resistance v_c at 0.8 √f_cu instead of scaling linearly with higher strength grades?",
    clauseRef: "BS 8110-1:1997, Cl. 3.4.5.2 & Table 3.8",
    content: "When designing high-strength transfer beams (C50/60 and above), Table 3.8 formula uses (f_cu/25)^0.33 with an upper bound limit of f_cu <= 40 N/mm², and Cl. 3.4.5.2 caps maximum shear stress v at 0.8 √f_cu or 5 N/mm². Why doesn't the standard allow higher concrete shear capacity to be credited in ultra-high-strength structural mixtures?",
    author: "Eng_David_MICE",
    authorRole: "Principal Structural Engineer",
    date: "4 hours ago",
    tags: ["Shear", "Beams", "Materials", "BS8110"],
    votes: 24,
    views: 312,
    answers: [
      {
        id: "ans-101",
        author: "Dr_Joseph_Chartered",
        authorRole: "Senior Technical Lead & FIStructE",
        date: "3 hours ago",
        content: "This restriction is rooted in the physical mechanics of aggregate interlock and crack propagation. In standard strength concrete (< C40/50), shear tension cracks propagate *around* the hard coarse aggregate particles, creating a rough intermeshed slip interface that mechanically interlocks across the shear plane.\n\nHowever, in high-strength concrete (f_cu > 50 N/mm²), the hardened mortar matrix is nearly as stiff and strong as the coarse aggregates themselves. When a diagonal shear crack initiates, it shears straight **through** the aggregate particles rather than around them. This results in a remarkably smooth crack face with almost zero friction or aggregate interlock resistance.\n\nTo prevent sudden, brittle diagonal shear explosions without warning, BS 8110 deliberately caps the shear stress contribution of concrete matrix at 0.8√f_cu (max 5.0 N/mm²), ensuring structural ductility is governed by yielding of vertical shear links rather than brittle matrix shear.",
        votes: 19,
        isAccepted: true
      },
      {
        id: "ans-102",
        author: "Structural_Reviewer_UK",
        authorRole: "Senior Checking Engineer",
        date: "2 hours ago",
        content: "Spot on with the aggregate interlock physics. Also worth mentioning that even in Eurocode 2 (BS EN 1992-1-1), a similar brittleness reduction factor is enforced for strength classes above C50/60 via the factor ν = 0.6 × (1 - f_ck / 250). Never attempt to rely on concrete tension alone in high-shear transfer zones—always detail robust closed links!",
        votes: 7
      }
    ]
  },
  {
    id: "so-2",
    title: "Unbalanced corner column moment transfer in flat slab: Should we model torsional stiffness of edge strips under Cl. 3.7.4.2?",
    clauseRef: "BS 8110-1:1997, Cl. 3.7.4.2 & Cl. 3.7.6.3",
    content: "In a G+3 flat slab commercial office with no edge perimeter beams, the corner columns take significant moment transfer due to unbalanced gravity loading. When checking punching shear around the corner perimeter, how do you adjust the effective shear force V_eff if edge torsional stiffness is relatively flexible?",
    author: "BIM_Consultant_9",
    authorRole: "Structural Modeler",
    date: "1 day ago",
    tags: ["Slabs", "Columns", "Flat-Slabs", "Punching-Shear"],
    votes: 15,
    views: 240,
    answers: [
      {
        id: "ans-201",
        author: "Olu_SE_Design",
        authorRole: "Consulting Engineer",
        date: "20 hours ago",
        content: "For corner columns without spandrel beams, BS 8110 Cl. 3.7.6.3 directs that the applied punching shear force should be multiplied by the magnification factor **V_eff = 1.25 V_t** (for corner columns where moment is transferred about both axes simultaneously) to account for unbalanced eccentricity, rather than attempting complex FE torsional stiffness modeling of the edge concrete strip.\n\nMake sure your reinforcement detailing extends U-bar hairpins along the free slab edges and passes at least two bottom bars directly through the column cage core to guarantee structural integrity and prevent brittle drop-out.",
        votes: 12,
        isAccepted: true
      }
    ]
  },
  {
    id: "so-3",
    title: "Redistribution up to 30% (Cl. 3.2.2.1): When reducing support moments downwards in a multi-span continuous beam, how do you adjust reinforcement anchoring in the support node?",
    clauseRef: "BS 8110-1:1997, Cl. 3.2.2.1 & Cl. 3.4.4.4",
    content: "When we take advantage of 30% downward moment redistribution over internal supports to relieve congestion of top steel in continuous beam supports, we correspondingly increase midspan bottom steel. What critical checks on neutral axis depth ratio (x/d) must be verified to prevent premature crushing before plastic rotation can take place?",
    author: "Joseph_SE_Lead",
    authorRole: "Senior Structural Engineer",
    date: "2 days ago",
    tags: ["Beams", "Analysis", "Redistribution", "BS8110"],
    votes: 19,
    views: 410,
    answers: [
      {
        id: "ans-301",
        author: "Concrete_Guru_01",
        authorRole: "Design Methodologist",
        date: "1 day ago",
        content: "Redistribution requires sufficient rotational ductility at the support plastic hinge so that the support angle can rotate without crushing the compressed bottom face of the beam concrete.\n\nUnder Cl. 3.4.4.4, you MUST restrict the neutral axis depth ratio using the formula:\n**x/d ≤ (β_b - 0.4) / 0.5**\nWhere β_b is the ratio of redistributed moment to elastic moment.\n\nFor a maximum 30% reduction (β_b = 0.70), this limits your maximum allowed neutral axis depth to **x/d ≤ 0.60**. If your applied moment causes x/d to exceed this limit, you are strictly prohibited from redistributing 30%, or you must introduce compression steel in the bottom of the support section to elevate ductility!",
        votes: 16,
        isAccepted: true
      },
      {
        id: "ans-302",
        author: "Eng_David_MICE",
        authorRole: "Principal Structural Engineer",
        date: "1 day ago",
        content: "Also, do not forget the detailing rule in Cl. 3.12.10.3: when you redistribute support moments downward, the actual point of contraflexure moves further out into the span! You must extend your top curtailment reinforcement bars an additional distance equal to at least the effective depth (d) beyond the recalculated zero-moment point.",
        votes: 8
      }
    ]
  },
  {
    id: "so-4",
    title: "Can we omit top anti-crack steel entirely in short-span internal residential floor slabs (L_x < 3.0m) if deflection is well within Table 3.9 basic limits?",
    clauseRef: "BS 8110-1:1997, Cl. 3.12.11.2.7",
    content: "In typical G+1 residential floor slab panels where L_x = 2.8m and slab thickness h = 150mm, the L/d ratio is barely 18 (vs allowable 26). If the panel is designed as simply supported between brick walls, can we completely eliminate top reinforcement mesh at the support boundaries to economize on site bar fixing?",
    author: "Site_Engineer_Olu",
    authorRole: "Site Project Manager",
    date: "3 days ago",
    tags: ["Slabs", "Cracking", "Reinforcement", "Detailing"],
    votes: 11,
    views: 188,
    answers: [
      {
        id: "ans-401",
        author: "Dr_Joseph_Chartered",
        authorRole: "Senior Technical Lead & FIStructE",
        date: "2 days ago",
        content: "No, never completely eliminate top reinforcement at support perimeters even in nominally 'simply supported' residential slabs! In physical reality, masonry walls and beam supports always exert partial rotational restraint (clamping effect) due to dead weight and monolithic casting.\n\nWithout at least nominal top steel over supports (typically 0.13% of concrete area, e.g. Y8 or Y10 @ 250mm c/c extending 0.15 L_x into the span), wide unsightly tension cracks will form along the perimeter ceiling and flooring finishes. Cl. 3.12.10.3 requires nominal continuity steel over supports to preserve durability and finish integrity.",
        votes: 14
      }
    ]
  },
  {
    id: "so-5",
    title: "How to properly evaluate equivalent UDL (w_eq) when a doorway opening directly breaks an internal masonry block wall above a floor slab?",
    clauseRef: "BS 6399-1:1996, Cl. 5.2 & Reynolds & Steedman",
    content: "When calculating the line load of an internal 230mm sandcrete block wall of height 3.0m running parallel across a two-way slab span, if there is a standard 0.9m x 2.1m timber doorway opening in the middle of the wall, do we simply deduct the window/door area percentage (e.g. multiplied by 0.85 opening factor), or does the lintel transfer concentrated reaction point loads to either side of the doorway?",
    author: "Design_Consultant_9",
    authorRole: "Structural Analyst",
    date: "4 days ago",
    tags: ["Loading", "Slabs", "Beams", "BS6399"],
    votes: 8,
    views: 156,
    answers: [
      {
        id: "ans-501",
        author: "Olu_SE_Design",
        authorRole: "Consulting Engineer",
        date: "3 days ago",
        content: "For general preliminary slab shear and flexure take-down, applying a uniform net reduction factor (typically 0.85 for domestic doors, or calculating net solid wall surface area) is widely accepted standard practice (Reynolds & Steedman engineering guidelines).\n\nHowever, if the opening is wide (e.g., a double folding arch > 1.8m wide), the masonry lintel above the opening will concentrate significant point loads at the door jamb bearings. In such cases, check local slab bending and punching shear right under the door jamb bearings, or position a concealed rib reinforcement band inside the slab depth to bridge the reaction.",
        votes: 9,
        isAccepted: true
      }
    ]
  },
  {
    id: "so-6",
    title: "Difference between Cl. 3.8.2.4 nominal column eccentricity (h/20) and minimum structural eccentricity (20mm) in tall columns (>4.5m clear height)?",
    clauseRef: "BS 8110-1:1997, Cl. 3.8.2.4",
    content: "In a double-height commercial entrance lobby, our rectangular concrete column is 300mm x 600mm with a clear height of 5.2m. When applying Cl. 3.8.2.4 minimum design moment, do we check e_min against 0.05 multiplied by the overall column height, or 0.05 multiplied by the cross-sectional depth in the direction of bending?",
    author: "Civil_Tech_UK",
    authorRole: "Graduate Engineer",
    date: "5 days ago",
    tags: ["Columns", "Slenderness", "BS8110"],
    votes: 14,
    views: 121,
    answers: []
  }
];

export default function CommunityNotes() {
  // Navigation Tab State
  const [activeTab, setActiveTab] = useState<'notes' | 'forum'>('notes');

  // Curated Notes States
  const [articles, setArticles] = useState<Article[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  // Stack Overflow Forum States & Filtering
  const [forumQuestions, setForumQuestions] = useState<ForumQuestion[]>(seedForumQuestions);
  const [forumSearch, setForumSearch] = useState('');
  const [selectedForumTag, setSelectedForumTag] = useState('');
  const [forumSort, setForumSort] = useState<'voted' | 'newest' | 'unanswered' | 'solved'>('voted');
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  
  // New Forum Question Modal & Forms
  const [isForumModalOpen, setIsForumModalOpen] = useState(false);
  const [forumTitle, setForumTitle] = useState('');
  const [forumClause, setForumClause] = useState('');
  const [forumContent, setForumContent] = useState('');
  const [forumAuthor, setForumAuthor] = useState('');
  const [forumTagsInput, setForumTagsInput] = useState('');

  // Reply / Answer State
  const [answerAuthor, setAnswerAuthor] = useState('');
  const [answerContent, setAnswerContent] = useState('');

  // Inbox Question Modal States (Editorial FAQ inquiry)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [question, setQuestion] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'none' | 'strong' | 'moderate' | null>(null);
  const [suggestedArticle, setSuggestedArticle] = useState<Article | null>(null);

  // 1. Fetch community notes from Sanity server endpoint and merge with default FAQs
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
        console.warn('Failed server fetch, trying fallback client fetch:', err);
        try {
          const query = '*[_type == "communityNote"] | order(date desc)';
          fetched = (await sanityClient.fetch(query)) || [];
        } catch (clientErr) {
          console.warn('Failed to load notes from Sanity, using seed FAQs only:', clientErr);
        }
      }

      // Merge live Sanity notes with default seed FAQs (avoiding duplicates by slug)
      const sanitySlugs = new Set(fetched.map(note => typeof note.slug === 'string' ? note.slug : note.slug?.current));
      const filteredDefaults = defaultFAQs.filter(df => !sanitySlugs.has(typeof df.slug === 'string' ? df.slug : (df.slug as any)?.current));
      
      setArticles([...fetched, ...filteredDefaults]);
    }
    loadNotes();
  }, []);

  // 2. Extract unique tags for editorial notes
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    articles.forEach(art => art.tags?.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [articles]);

  // 3. Search and Highlight logic for editorial notes with Fuse.js
  const searchResults = useMemo(() => {
    let list = articles;

    if (selectedTag) {
      list = list.filter(art => art.tags?.includes(selectedTag));
    }

    if (!searchQuery.trim()) {
      return list;
    }

    const fuse = new Fuse(list, {
      keys: ['title', 'answer', 'tags'],
      threshold: 0.35,
      includeMatches: true,
    });

    const results = fuse.search(searchQuery);

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

  // 4. Extract unique forum tags
  const forumTags = useMemo(() => {
    const tagsSet = new Set<string>();
    forumQuestions.forEach(q => q.tags.forEach(t => tagsSet.add(t)));
    return Array.from(tagsSet).sort();
  }, [forumQuestions]);

  // 5. Filter & Sort Forum Questions
  const filteredForumQuestions = useMemo(() => {
    let list = [...forumQuestions];
    if (selectedForumTag) {
      list = list.filter(q => q.tags.map(t => t.toLowerCase()).includes(selectedForumTag.toLowerCase()));
    }
    if (forumSearch.trim()) {
      const qLower = forumSearch.toLowerCase();
      list = list.filter(q => 
        q.title.toLowerCase().includes(qLower) || 
        q.content.toLowerCase().includes(qLower) ||
        (q.clauseRef && q.clauseRef.toLowerCase().includes(qLower)) ||
        q.tags.some(t => t.toLowerCase().includes(qLower))
      );
    }
    if (forumSort === 'voted') {
      list.sort((a, b) => b.votes - a.votes);
    } else if (forumSort === 'newest') {
      list.sort((a, b) => (a.id < b.id ? 1 : -1));
    } else if (forumSort === 'unanswered') {
      list = list.filter(q => q.answers.length === 0);
    } else if (forumSort === 'solved') {
      list = list.filter(q => q.answers.some(a => a.isAccepted));
    }
    return list;
  }, [forumQuestions, selectedForumTag, forumSearch, forumSort]);

  // Current expanded question
  const activeForumQuestion = useMemo(() => {
    return forumQuestions.find(q => q.id === expandedQuestionId) || null;
  }, [forumQuestions, expandedQuestionId]);

  // Vote handlers
  const handleVoteQuestion = (id: string, delta: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setForumQuestions(prev => prev.map(q => {
      if (q.id === id) {
        return { ...q, votes: q.votes + delta };
      }
      return q;
    }));
  };

  const handleVoteAnswer = (qId: string, aId: string, delta: number) => {
    setForumQuestions(prev => prev.map(q => {
      if (q.id === qId) {
        return {
          ...q,
          answers: q.answers.map(a => a.id === aId ? { ...a, votes: a.votes + delta } : a)
        };
      }
      return q;
    }));
  };

  // Submit new forum question
  const handleCreateForumQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forumTitle.trim() || !forumContent.trim()) return;
    const tagsArr = forumTagsInput.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean);
    if (tagsArr.length === 0) tagsArr.push('BS8110', 'Design');

    const newQ: ForumQuestion = {
      id: `so-${Date.now()}`,
      title: forumTitle.trim(),
      clauseRef: forumClause.trim() || 'BS 8110-1:1997 General Notice',
      content: forumContent.trim(),
      author: forumAuthor.trim() || 'Community_Engineer',
      authorRole: 'Structural Engineer',
      date: 'Just now',
      tags: tagsArr,
      votes: 1,
      views: 1,
      answers: []
    };

    setForumQuestions(prev => [newQ, ...prev]);
    setIsForumModalOpen(false);
    setForumTitle('');
    setForumClause('');
    setForumContent('');
    setForumAuthor('');
    setForumTagsInput('');

    // Also notify /api/questions so backend logs the community contribution
    try {
      await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'forum_user@manualdesign.org', question: `[FORUM Q&A: ${newQ.title}] ${newQ.content}` }),
      });
    } catch (err) {
      console.log('Backend sync offline, stored in live UI state.');
    }
  };

  // Submit Answer Handler
  const handlePostAnswer = (qId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!answerContent.trim()) return;
    const newAns: ForumAnswer = {
      id: `ans-${Date.now()}`,
      author: answerAuthor.trim() || 'Structural_Contributor',
      authorRole: 'Community Practitioner',
      date: 'Just now',
      content: answerContent.trim(),
      votes: 1
    };

    setForumQuestions(prev => prev.map(q => {
      if (q.id === qId) {
        return {
          ...q,
          answers: [...q.answers, newAns]
        };
      }
      return q;
    }));
    setAnswerContent('');
    setAnswerAuthor('');
  };

  // Form Submit for Editorial Inbox Question
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);

    try {
      const fuse = new Fuse(articles, {
        keys: ['title', 'answer'],
        includeScore: true,
        threshold: 0.7,
      });

      const searchHits = fuse.search(question);
      let type: 'none' | 'strong' | 'moderate' = 'none';
      let suggested: Article | null = null;

      if (searchHits.length > 0) {
        const topHit = searchHits[0];
        const score = topHit.score || 1;
        suggested = topHit.item;

        if (score < 0.4) {
          type = 'strong';
        } else if (score < 0.7) {
          type = 'moderate';
        }
      }

      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, question, website: honeypot }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit question');
      }

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
    <div className="notes-container" style={{ padding: '60px 0 120px 0', fontFamily: 'Inter, sans-serif', maxWidth: '880px', margin: '0 auto', paddingLeft: '24px', paddingRight: '24px' }}>
      
      {/* Header */}
      <div style={{ paddingBottom: '20px', marginBottom: '16px' }}>
        <Link href="/" className="back-btn" style={{ textDecoration: 'none', color: 'var(--mid-gray)', fontSize: '11px', fontFamily: 'var(--mono)', letterSpacing: '0.1em', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '24px' }}>
          &larr; Back to Manual Design Guide
        </Link>
        <h1 style={{ fontFamily: 'Lora, serif', fontWeight: '400', fontSize: '34px', color: 'var(--black)', marginBottom: '8px' }}>Community Notes &amp; Q&amp;A Forum</h1>
        <p style={{ fontFamily: 'var(--mono)', fontSize: '11.5px', color: 'var(--mid-gray)', letterSpacing: '0.04em' }}>
          BS 8110 Structural Knowledge Base &middot; Curated Articles &middot; Community Discussions
        </p>
      </div>

      {/* Interactive Two-Tab Switcher */}
      <div className="forum-tabs-bar">
        <button 
          onClick={() => { setActiveTab('notes'); setExpandedQuestionId(null); }} 
          className={`forum-tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
          Editorial Notes &amp; FAQs
        </button>
        <button 
          onClick={() => { setActiveTab('forum'); setExpandedQuestionId(null); }} 
          className={`forum-tab-btn ${activeTab === 'forum' ? 'active' : ''}`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          Stack Overflow Q&amp;A Forum
        </button>
      </div>

      {/* =========================================================================
          TAB 1: EDITORIAL NOTES & CURATED FAQS
          ========================================================================= */}
      {activeTab === 'notes' && (
        <>
          {/* Search and Tag Controls */}
          <div style={{ marginBottom: '36px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search editorial community notes by keyword, code clause, or topic..."
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
          <main className="journal-list" style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
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
                  <article key={idx} className="journal-card" style={{ display: 'flex', gap: '24px', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
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
                    </div>

                    {art.image && (
                      <img
                        src={urlFor(art.image).width(120).height(80).url()}
                        alt={art.title}
                        style={{
                          width: '120px',
                          height: '80px',
                          objectFit: 'cover',
                          borderRadius: 'var(--radius)',
                          border: '1px solid var(--rule)',
                          flexShrink: 0,
                          marginTop: '4px'
                        }}
                      />
                    )}
                  </article>
                );
              })
            )}
          </main>
        </>
      )}

      {/* =========================================================================
          TAB 2: STACK OVERFLOW STRUCTURAL Q&A FORUM
          ========================================================================= */}
      {activeTab === 'forum' && (
        <main>
          {/* VIEW A: QUESTION DIRECTORY AND FILTERS */}
          {!expandedQuestionId && (
            <div>
              {/* Forum Controls Header */}
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <div style={{ flex: 1, minWidth: '260px' }}>
                  <input
                    type="text"
                    value={forumSearch}
                    onChange={(e) => setForumSearch(e.target.value)}
                    placeholder="Search Q&A discussions by title, clause, or tags..."
                    style={{
                      width: '100%',
                      padding: '11px 16px',
                      fontSize: '14px',
                      border: '1px solid var(--rule)',
                      borderRadius: 'var(--radius)',
                      background: 'var(--light-bg)',
                      color: 'var(--black)',
                      outline: 'none'
                    }}
                  />
                </div>
                <button
                  onClick={() => setIsForumModalOpen(true)}
                  style={{
                    background: 'var(--accent)',
                    color: 'var(--white)',
                    border: 'none',
                    padding: '11px 20px',
                    borderRadius: 'var(--radius)',
                    fontFamily: 'var(--mono)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(47,93,138,0.25)',
                    transition: 'opacity 0.15s'
                  }}
                >
                  <span style={{ fontSize: '15px' }}>+</span> Ask Structural Question
                </button>
              </div>

              {/* Tag Filter and Sort Tabs Row */}
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--rule)', paddingBottom: '20px', marginBottom: '24px' }}>
                <div className="tag-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  <button
                    onClick={() => setSelectedForumTag('')}
                    className={`tag-pill ${!selectedForumTag ? 'active' : ''}`}
                    style={{ fontSize: '11.5px', padding: '4px 10px' }}
                  >
                    All Tags
                  </button>
                  {forumTags.map(t => (
                    <button
                      key={t}
                      onClick={() => setSelectedForumTag(t)}
                      className={`tag-pill ${selectedForumTag === t ? 'active' : ''}`}
                      style={{ fontSize: '11.5px', padding: '4px 10px' }}
                    >
                      #{t.toLowerCase()}
                    </button>
                  ))}
                </div>

                {/* Sort selector pills */}
                <div style={{ display: 'flex', gap: '4px', background: 'var(--light-bg)', padding: '4px', borderRadius: 'var(--radius)', border: '1px solid var(--rule)' }}>
                  {(['voted', 'newest', 'solved', 'unanswered'] as const).map(sortType => (
                    <button
                      key={sortType}
                      onClick={() => setForumSort(sortType)}
                      style={{
                        background: forumSort === sortType ? 'var(--white)' : 'transparent',
                        color: forumSort === sortType ? 'var(--accent)' : 'var(--dark-gray)',
                        border: 'none',
                        padding: '5px 12px',
                        borderRadius: '4px',
                        fontFamily: 'var(--mono)',
                        fontSize: '11px',
                        fontWeight: forumSort === sortType ? 600 : 400,
                        cursor: 'pointer',
                        boxShadow: forumSort === sortType ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        textTransform: 'capitalize'
                      }}
                    >
                      {sortType === 'voted' ? '🔥 Most Voted' : sortType === 'solved' ? '✔ Solved' : sortType}
                    </button>
                  ))}
                </div>
              </div>

              {/* Forum Question Cards List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {filteredForumQuestions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--mid-gray)' }}>
                    <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--black)', marginBottom: '8px' }}>No questions match your filter constraints</p>
                    <p style={{ fontSize: '13.5px' }}>Be the first engineer to start a discussion on this structural topic!</p>
                  </div>
                ) : (
                  filteredForumQuestions.map((q) => {
                    const hasAccepted = q.answers.some(a => a.isAccepted);
                    const ansCount = q.answers.length;
                    
                    return (
                      <div key={q.id} className="so-card" onClick={() => setExpandedQuestionId(q.id)}>
                        
                        {/* Left Stats Sidebar */}
                        <div className="so-stats">
                          <div className="so-stat-item" style={{ flexDirection: 'row', gap: '6px', alignItems: 'center', color: q.votes > 15 ? 'var(--accent)' : 'var(--dark-gray)' }}>
                            <span className="so-stat-num">{q.votes}</span> votes
                          </div>

                          <div className={`so-answers-box ${hasAccepted ? 'accepted' : ansCount > 0 ? 'answered' : ''}`}>
                            {hasAccepted ? `✔ ${ansCount} ${ansCount === 1 ? 'answer' : 'answers'}` : `${ansCount} ${ansCount === 1 ? 'answer' : 'answers'}`}
                          </div>

                          <div className="so-stat-item" style={{ fontSize: '11px' }}>
                            {q.views} views
                          </div>
                        </div>

                        {/* Right Main Question Content */}
                        <div className="so-content">
                          <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: '#6b6b6b', marginBottom: '4px' }}>
                            <span style={{ background: 'var(--accent-bg)', color: 'var(--accent)', padding: '2px 6px', borderRadius: '3px', fontWeight: 600 }}>{q.clauseRef}</span>
                          </div>
                          
                          <h2 className="so-title">{q.title}</h2>
                          
                          <p className="so-excerpt">{q.content}</p>

                          <div className="so-footer">
                            <div className="so-tags-row">
                              {q.tags.map(t => (
                                <span key={t} className="so-tag-pill">#{t.toLowerCase()}</span>
                              ))}
                            </div>

                            <div className="so-author">
                              <span className="so-avatar">{q.author.charAt(0).toUpperCase()}</span>
                              <span><strong>{q.author}</strong> ({q.authorRole}) &middot; {q.date}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* VIEW B: EXPANDED INLINE DISCUSSION THREAD & ANSWERS */}
          {activeForumQuestion && (
            <div style={{ animation: 'fadeIn 0.2s ease-in-out' }}>
              <button
                onClick={() => setExpandedQuestionId(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent)',
                  fontFamily: 'var(--mono)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '24px',
                  padding: 0
                }}
              >
                &larr; Return to All Forum Discussions
              </button>

              {/* Full Question Details Header */}
              <div style={{ borderBottom: '1px solid var(--rule)', paddingBottom: '24px', marginBottom: '28px' }}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                  
                  {/* Voting column */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <button 
                      onClick={(e) => handleVoteQuestion(activeForumQuestion.id, 1, e)}
                      className="so-vote-btn" 
                      title="Upvote discussion (this standard inquiry is clear and useful)"
                    >
                      ▲
                    </button>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--black)', margin: '4px 0' }}>{activeForumQuestion.votes}</span>
                    <button 
                      onClick={(e) => handleVoteQuestion(activeForumQuestion.id, -1, e)}
                      className="so-vote-btn"
                      title="Downvote discussion"
                    >
                      ▼
                    </button>
                  </div>

                  {/* Main question body */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: '12px', marginBottom: '8px' }}>
                      <span style={{ background: 'var(--accent-bg)', color: 'var(--accent)', padding: '3px 8px', borderRadius: '4px', fontWeight: 600, border: '1px solid #c8e0f4' }}>{activeForumQuestion.clauseRef}</span>
                    </div>

                    <h1 style={{ fontFamily: 'Lora, serif', fontSize: '26px', fontWeight: '400', color: 'var(--black)', marginBottom: '16px', lineHeight: '1.35' }}>
                      {activeForumQuestion.title}
                    </h1>

                    <div style={{ fontSize: '15.5px', color: 'var(--dark-gray)', lineHeight: '1.7', whiteSpace: 'pre-wrap', background: 'var(--light-bg)', padding: '20px', borderRadius: 'var(--radius)', border: '1px solid var(--rule)', marginBottom: '20px' }}>
                      {activeForumQuestion.content}
                    </div>

                    <div className="so-footer">
                      <div className="so-tags-row">
                        {activeForumQuestion.tags.map(t => (
                          <span key={t} className="so-tag-pill">#{t.toLowerCase()}</span>
                        ))}
                      </div>

                      <div className="so-author" style={{ background: '#f3f6f9', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--rule)' }}>
                        <span className="so-avatar" style={{ width: '24px', height: '24px', fontSize: '11px' }}>{activeForumQuestion.author.charAt(0)}</span>
                        <div>
                          <div style={{ color: 'var(--black)', fontWeight: 600 }}>{activeForumQuestion.author}</div>
                          <div style={{ fontSize: '10.5px' }}>{activeForumQuestion.authorRole} &middot; Asked {activeForumQuestion.date}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Answers Section */}
              <h2 style={{ fontFamily: 'Lora, serif', fontSize: '22px', fontWeight: '400', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                {activeForumQuestion.answers.length} {activeForumQuestion.answers.length === 1 ? 'Engineering Answer' : 'Engineering Answers'}
              </h2>

              {activeForumQuestion.answers.length === 0 ? (
                <div style={{ padding: '30px', background: 'var(--light-bg)', borderRadius: 'var(--radius)', textAlign: 'center', color: 'var(--mid-gray)', marginBottom: '36px', border: '1px dashed var(--rule)' }}>
                  <p style={{ fontSize: '14.5px', marginBottom: '4px', fontWeight: 500, color: 'var(--black)' }}>There are no accepted engineering answers for this discussion yet.</p>
                  <p style={{ fontSize: '13px' }}>Share your structural code expertise and submit a solution below!</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '40px' }}>
                  {/* Sort answers putting accepted answer first, then highest votes */}
                  {[...activeForumQuestion.answers]
                    .sort((a, b) => (b.isAccepted ? 1 : 0) - (a.isAccepted ? 1 : 0) || b.votes - a.votes)
                    .map((ans) => (
                      <div 
                        key={ans.id} 
                        style={{
                          display: 'flex',
                          gap: '20px',
                          padding: '24px',
                          borderRadius: 'var(--radius)',
                          border: ans.isAccepted ? '2px solid #16a34a' : '1px solid var(--rule)',
                          background: ans.isAccepted ? 'rgba(22, 163, 74, 0.02)' : 'var(--white)',
                          boxShadow: ans.isAccepted ? '0 4px 16px rgba(22, 163, 74, 0.08)' : '0 2px 6px rgba(0,0,0,0.03)'
                        }}
                      >
                        {/* Answer voting column */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                          <button 
                            onClick={() => handleVoteAnswer(activeForumQuestion.id, ans.id, 1)}
                            className="so-vote-btn"
                          >
                            ▲
                          </button>
                          <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--black)', margin: '2px 0' }}>{ans.votes}</span>
                          <button 
                            onClick={() => handleVoteAnswer(activeForumQuestion.id, ans.id, -1)}
                            className="so-vote-btn"
                          >
                            ▼
                          </button>
                          {ans.isAccepted && (
                            <div style={{ color: '#16a34a', marginTop: '8px', fontSize: '24px', fontWeight: 800 }} title="Verified & Accepted Engineering Solution">
                              ✔
                            </div>
                          )}
                        </div>

                        {/* Answer body */}
                        <div style={{ flex: 1 }}>
                          {ans.isAccepted && (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#16a34a', color: 'var(--white)', padding: '3px 10px', borderRadius: '20px', fontFamily: 'var(--mono)', fontSize: '11px', fontWeight: 600, marginBottom: '12px' }}>
                              ✔ VERIFIED STRUCTURAL SOLUTION
                            </div>
                          )}
                          
                          <div style={{ fontSize: '15px', color: 'var(--dark-gray)', lineHeight: '1.7', whiteSpace: 'pre-wrap', marginBottom: '16px' }}>
                            {ans.content}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <div className="so-author" style={{ background: 'var(--light-bg)', padding: '6px 12px', borderRadius: '6px' }}>
                              <span className="so-avatar" style={{ background: ans.isAccepted ? '#16a34a' : 'var(--accent)' }}>{ans.author.charAt(0)}</span>
                              <div>
                                <div style={{ color: 'var(--black)', fontWeight: 600 }}>{ans.author}</div>
                                <div style={{ fontSize: '10.5px' }}>{ans.authorRole} &middot; Replied {ans.date}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Post Your Answer Box */}
              <div style={{ background: 'var(--light-bg)', padding: '28px', borderRadius: 'var(--radius)', border: '1px solid var(--rule)' }}>
                <h3 style={{ fontFamily: 'Lora, serif', fontSize: '20px', fontWeight: '400', color: 'var(--black)', marginBottom: '8px' }}>
                  Your Engineering Solution
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--mid-gray)', marginBottom: '20px' }}>
                  Contribute your BS 8110 engineering knowledge to answer this structural inquiry. Be explicit with calculations and clause citations.
                </p>

                <form onSubmit={(e) => handlePostAnswer(activeForumQuestion.id, e)}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--mono)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600 }}>Your Name &amp; Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Eng. Awojide Joseph (MICE, Consulting Structural Lead)"
                        value={answerAuthor}
                        onChange={(e) => setAnswerAuthor(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', fontSize: '14px', outline: 'none', background: 'var(--white)' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--mono)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600 }}>Detailed Solution / Clause Guidance</label>
                      <textarea
                        required
                        rows={6}
                        placeholder="Provide clear calculations, code limits, or structural recommendations..."
                        value={answerContent}
                        onChange={(e) => setAnswerContent(e.target.value)}
                        style={{ width: '100%', padding: '12px 14px', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', fontSize: '14px', outline: 'none', resize: 'vertical', background: 'var(--white)' }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    style={{
                      background: 'var(--accent)',
                      color: 'var(--white)',
                      border: 'none',
                      borderRadius: 'var(--radius)',
                      padding: '12px 24px',
                      fontFamily: 'var(--mono)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(47,93,138,0.2)'
                    }}
                  >
                    Post Structural Solution &rarr;
                  </button>
                </form>
              </div>
            </div>
          )}
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

      {/* =========================================================================
          MODAL 2: STACK OVERFLOW FORUM QUESTION SUBMISSION MODAL
          ========================================================================= */}
      {isForumModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            border: '1px solid #0f0f0f',
            borderRadius: 'var(--radius)',
            padding: '32px',
            width: '100%',
            maxWidth: '600px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ fontFamily: 'Lora, serif', fontSize: '24px', fontWeight: '400', marginBottom: '6px' }}>Ask a Structural Question</h3>
            <p style={{ fontSize: '13px', color: 'var(--mid-gray)', marginBottom: '24px', lineHeight: '1.5' }}>
              Publish an engineering question to the public Q&amp;A exchange. Include relevant BS 8110 or BS 6399 clauses so peers can verify your design parameters.
            </p>

            <form onSubmit={handleCreateForumQuestion}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--mono)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600 }}>Question Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. How to evaluate punching shear enhancement near column openings under Cl. 3.7.7.4?"
                    value={forumTitle}
                    onChange={(e) => setForumTitle(e.target.value)}
                    style={{ width: '100%', padding: '11px 14px', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', fontSize: '14.5px', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--mono)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600 }}>Standard Clause Ref</label>
                    <input
                      type="text"
                      placeholder="e.g. BS 8110-1 Cl. 3.7.7.4"
                      value={forumClause}
                      onChange={(e) => setForumClause(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', fontSize: '13.5px', outline: 'none' }}
                    />
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--mono)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600 }}>Your Name / Alias</label>
                    <input
                      type="text"
                      placeholder="e.g. Eng_Joseph (Chartered)"
                      value={forumAuthor}
                      onChange={(e) => setForumAuthor(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', fontSize: '13.5px', outline: 'none' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--mono)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600 }}>Tags (comma-separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. Slabs, Punching-Shear, BS8110, Flat-Slabs"
                    value={forumTagsInput}
                    onChange={(e) => setForumTagsInput(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', fontSize: '13.5px', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--mono)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600 }}>Detailed Engineering Explanation</label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Describe your design parameters, applied loading, concrete strength class, or structural confusion in detail..."
                    value={forumContent}
                    onChange={(e) => setForumContent(e.target.value)}
                    style={{ width: '100%', padding: '12px 14px', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', fontSize: '14px', outline: 'none', resize: 'vertical' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setIsForumModalOpen(false)} style={{ background: 'none', border: '1px solid var(--rule)', cursor: 'pointer', padding: '10px 18px', borderRadius: 'var(--radius)', fontFamily: 'var(--mono)', fontSize: '11.5px', fontWeight: 600 }}>Cancel</button>
                <button
                  type="submit"
                  style={{
                    background: 'var(--accent)',
                    color: 'var(--white)',
                    border: 'none',
                    borderRadius: 'var(--radius)',
                    padding: '10px 24px',
                    fontFamily: 'var(--mono)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(47,93,138,0.3)'
                  }}
                >
                  Publish Discussion to Exchange
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

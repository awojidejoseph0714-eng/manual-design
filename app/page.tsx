'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Fuse from 'fuse.js';
import { sanityClient } from '@/lib/sanity';

const defaultFAQs = [
  { title: "If a wall sits directly on a slab (not on a beam), how does the slab 'see' that load?", slug: "wall-load-on-slab" },
  { title: "Do you always need to check a slab for punching shear, or only flat slabs?", slug: "punching-shear-necessity" },
  { title: "If two beams intersect at right angles at midspan (not at a column), how do you handle the load transfer?", slug: "beam-intersection-midspan" },
  { title: "Does a slab's live load (Q_k) ever get reduced, the way column live load is?", slug: "slab-live-load-reduction" },
  { title: "If a column is bigger at the bottom of the building than the top, does that count as 'slender' differently at each level?", slug: "column-slenderness-variation" },
  { title: "Why does a cantilever need such a conservative span/depth ratio (7, versus 20 for simply supported)?", slug: "cantilever-span-depth-ratio" },
  { title: "Does the choice of f_cu (concrete grade) change how you calculate loads, or only how you design the section?", slug: "concrete-grade-load-effect" },
  { title: "If a beam has different reinforcement top and bottom at midspan, does that mean it's doubly reinforced?", slug: "beam-reinforcement-doubly-reinforced" },
  { title: "Do you need to check deflection separately for a slab if you've already checked it for the beam supporting it?", slug: "slab-vs-beam-deflection" }
];

export default function Home() {
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [question, setQuestion] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [articles, setArticles] = useState<any[]>([]);

  // Feedback states
  const [feedbackType, setFeedbackType] = useState<'none' | 'strong' | 'moderate' | null>(null);
  const [suggestedArticle, setSuggestedArticle] = useState<any | null>(null);

  // Main page HTML from Sanity (editable via admin)
  const [pageHtml, setPageHtml] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      // Load community notes for FAQ list
      try {
        const query = '*[_type == "communityNote"] | order(date desc)';
        const fetched = await sanityClient.fetch(query);
        if (fetched && fetched.length > 0) {
          setArticles(fetched);
        } else {
          setArticles(defaultFAQs);
        }
      } catch (err) {
        setArticles(defaultFAQs);
      }

      // Load editable main page HTML from Sanity
      try {
        const pageDoc = await sanityClient.fetch(
          `*[_type == "pageContent" && key == "mainPage"][0]{ htmlBody }`
        );
        if (pageDoc && pageDoc.htmlBody) {
          setPageHtml(pageDoc.htmlBody);
        }
      } catch (err) {
        // Fall through to hardcoded HTML below
      }
    }
    loadData();
  }, []);

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
      let suggested: any = null;

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

  useEffect(() => {
    // ── Mobile Responsive Sidebar Actions ──
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const toggleBtn = document.getElementById('menuToggle');

    function openSidebar() {
      sidebar?.classList.add('open');
      overlay?.classList.add('open');
    }

    function closeSidebar() {
      sidebar?.classList.remove('open');
      overlay?.classList.remove('open');
    }

    toggleBtn?.addEventListener('click', openSidebar);
    overlay?.addEventListener('click', closeSidebar);

    // Close on link click for mobile
    const links = document.querySelectorAll('.sidebar-link');
    links.forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 960) {
          closeSidebar();
        }
      });
    });

    // ── Active sidebar link highlighting on scroll ──
    const sections = document.querySelectorAll('section[id]');
    const sidebarLinks = document.querySelectorAll('.sidebar-link');

    function updateActiveLink() {
      let currentId = '';
      const offset = 90;
      sections.forEach(sec => {
        const top = sec.getBoundingClientRect().top;
        if (top <= offset) {
          currentId = sec.id;
        }
      });

      sidebarLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
          const id = href.slice(1);
          if (id === currentId) {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        }
      });
    }

    window.addEventListener('scroll', updateActiveLink, { passive: true });
    updateActiveLink();

    // Trigger MathJax typeset if already loaded on navigation
    // @ts-ignore
    if (window.MathJax && window.MathJax.typeset) {
      // @ts-ignore
      window.MathJax.typeset();
    }

    return () => {
      toggleBtn?.removeEventListener('click', openSidebar);
      overlay?.removeEventListener('click', closeSidebar);
      window.removeEventListener('scroll', updateActiveLink);
    };
  }, []);

  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: pageHtml !== null ? pageHtml : `


<a href="#main-content" class="skip-link">Skip to content</a>
<div class="sidebar-overlay" id="sidebarOverlay" onclick="closeSidebar()"></div>
<button class="mobile-menu-toggle" id="menuToggle" aria-label="Open navigation" onclick="toggleSidebar()">&#9776;</button>

<div class="app-layout">

  <!-- ============================= SIDEBAR ============================= -->
  <aside class="sidebar" id="sidebar" role="navigation" aria-label="Guide navigation">
    <div class="sidebar-header">
      <div class="sidebar-logo">BS 8110 &middot; 1997</div>
      <div class="sidebar-title">Manual Design Guide</div>
    </div>
    <nav class="sidebar-nav">
      <div class="sidebar-section-label">Part 0 &mdash; Fundamentals</div>
      <a class="sidebar-link" href="#f0"><span class="link-num">0.0</span>Design Objectives (ULS, SLS)</a>
      <a class="sidebar-link" href="#f1"><span class="link-num">0.1</span>Materials &amp; Safety Factors</a>
      <a class="sidebar-link" href="#f2"><span class="link-num">0.2</span>Load Types &amp; Combinations</a>
      <a class="sidebar-link" href="#f3"><span class="link-num">0.3</span>Universal Flexure Method</a>
      <a class="sidebar-link" href="#f4"><span class="link-num">0.4</span>The Overall Load Path</a>

      <div class="sidebar-section-label">Part 1 &mdash; Slabs</div>
      <a class="sidebar-link" href="#s1"><span class="link-num">S1</span>Slab Types</a>
      <a class="sidebar-link" href="#s2"><span class="link-num">S2</span>Loading</a>
      <a class="sidebar-link" href="#s3"><span class="link-num">S3</span>Trial Depth</a>
      <a class="sidebar-link" href="#s4"><span class="link-num">S4</span>One-Way Slabs</a>
      <a class="sidebar-link" href="#s5"><span class="link-num">S5</span>Two-Way Simply Supported</a>
      <a class="sidebar-link" href="#s6"><span class="link-num">S6</span>Two-Way Restrained</a>
      <a class="sidebar-link" href="#s7"><span class="link-num">S7</span>Flat Slabs</a>
      <a class="sidebar-link" href="#s8"><span class="link-num">S8</span>Ribbed / Waffle</a>
      <a class="sidebar-link" href="#s9"><span class="link-num">S9</span>Cantilever Slabs</a>
      <a class="sidebar-link" href="#s10"><span class="link-num">S10</span>Flexure, Shear &amp; Deflection</a>
      <a class="sidebar-link" href="#s11"><span class="link-num">S11</span>Detailing</a>

      <div class="sidebar-section-label">Part 2 &mdash; Beams</div>
      <a class="sidebar-link" href="#b1"><span class="link-num">B1</span>Classification</a>
      <a class="sidebar-link" href="#b2"><span class="link-num">B2</span>Loading</a>
      <a class="sidebar-link" href="#b3"><span class="link-num">B3</span>Effective Span &amp; Depth</a>
      <a class="sidebar-link" href="#b4"><span class="link-num">B4</span>Analysis Method</a>
      <a class="sidebar-link" href="#b5"><span class="link-num">B5</span>Moments &amp; Shear</a>
      <a class="sidebar-link" href="#b6"><span class="link-num">B6</span>Flexural Design</a>
      <a class="sidebar-link" href="#b7"><span class="link-num">B7</span>Shear Design</a>
      <a class="sidebar-link" href="#b8"><span class="link-num">B8</span>Deflection</a>
      <a class="sidebar-link" href="#b9"><span class="link-num">B9</span>Cracking</a>
      <a class="sidebar-link" href="#b10"><span class="link-num">B10</span>Detailing</a>

      <div class="sidebar-section-label">Part 3 &mdash; Columns</div>
      <a class="sidebar-link" href="#c1"><span class="link-num">C1</span>Classification</a>
      <a class="sidebar-link" href="#c2"><span class="link-num">C2</span>Loading</a>
      <a class="sidebar-link" href="#c3"><span class="link-num">C3</span>Slenderness</a>
      <a class="sidebar-link" href="#c4"><span class="link-num">C4</span>Design Moments</a>
      <a class="sidebar-link" href="#c5"><span class="link-num">C5</span>Axial + Uniaxial</a>
      <a class="sidebar-link" href="#c6"><span class="link-num">C6</span>Biaxial Bending</a>
      <a class="sidebar-link" href="#c7"><span class="link-num">C7</span>Shear</a>
      <a class="sidebar-link" href="#c8"><span class="link-num">C8</span>Design Charts</a>
      <a class="sidebar-link" href="#c9"><span class="link-num">C9</span>Detailing</a>

      <div class="sidebar-section-label">Part 4 &mdash; Building</div>
      <a class="sidebar-link" href="#building"><span class="link-num">W1</span>Whole-Building Guide</a>
      <a class="sidebar-link" href="#worked-example"><span class="link-num">W2</span>G+1 Worked Example</a>
      <a class="sidebar-link" href="#quickref"><span class="link-num">W3</span>Quick Reference</a>
      <a class="sidebar-link" href="#glossary"><span class="link-num">W4</span>Glossary of Symbols</a>

      <div class="sidebar-section-label">Extras</div>
      <a class="sidebar-link" href="journal.html" style="font-weight: 600; color: var(--accent);"><span class="link-num">&rarr;</span>FAQ Journal</a>
    </nav>
  </aside>

  <!-- ============================= MAIN ============================= -->
  <div class="main-content" id="main-content">

    <header id="top">
      <div class="header-inner">
        <div class="header-label">Structural Concrete &mdash; Complete Manual Design Guide</div>
        <h1>Designing Slabs, Beams &amp; Columns<br><em>by Hand, under BS 8110</em></h1>
        <p class="header-sub">BS 8110-1:1997 &middot; One combined, step-by-step reference from load take-down to detailing &middot; <a href="journal.html" style="color: var(--accent); text-decoration: underline; font-weight: 600;">Browse FAQ Journal &rarr;</a></p>
      </div>
    </header>

    <!-- TOC -->
    <div class="toc-block">
      <h2 class="toc-heading">How This Guide Works</h2>
      <p class="toc-intro">Structures are designed top-down but built bottom-up. Load starts at the roof, works its way through <strong>slabs</strong>, into <strong>beams</strong>, down through <strong>columns</strong>, and finally into the foundations. This guide follows that exact order &mdash; read it in sequence the first time, then use it as a lookup reference afterward.</p>
      <div class="toc-note"><strong>New to manual design?</strong> Read Part 0 (Fundamentals) first &mdash; it explains the shared vocabulary (characteristic vs design load, partial safety factors, K and lever-arm method) used identically in every part that follows.</div>
      <div class="toc-grid">
        <div class="toc-card">
          <h3>Part 0 &mdash; Fundamentals</h3>
          <ol>
            <li><a href="#f0">Design Objectives (ULS, SLS)</a></li>
            <li><a href="#f1">Materials &amp; Partial Safety Factors</a></li>
            <li><a href="#f2">Load Types &amp; Combinations</a></li>
            <li><a href="#f3">The Universal Flexure Method</a></li>
            <li><a href="#f4">The Overall Load Path</a></li>
          </ol>
        </div>
        <div class="toc-card">
          <h3>Part 1 &mdash; Slabs</h3>
          <ol>
            <li><a href="#s1">Slab Types</a></li>
            <li><a href="#s2">Loading</a></li>
            <li><a href="#s3">Trial Depth</a></li>
            <li><a href="#s4">One-Way Slabs</a></li>
            <li><a href="#s5">Two-Way Simply Supported</a></li>
            <li><a href="#s6">Two-Way Restrained</a></li>
            <li><a href="#s7">Flat Slabs</a></li>
            <li><a href="#s8">Ribbed / Waffle Slabs</a></li>
            <li><a href="#s9">Cantilever Slabs</a></li>
            <li><a href="#s10">Flexure, Shear &amp; Deflection</a></li>
            <li><a href="#s11">Detailing</a></li>
          </ol>
        </div>
        <div class="toc-card">
          <h3>Part 2 &mdash; Beams</h3>
          <ol>
            <li><a href="#b1">Classification</a></li>
            <li><a href="#b2">Loading</a></li>
            <li><a href="#b3">Effective Span &amp; Depth</a></li>
            <li><a href="#b4">Analysis Method</a></li>
            <li><a href="#b5">Moments &amp; Shear</a></li>
            <li><a href="#b6">Flexural Design</a></li>
            <li><a href="#b7">Shear Design</a></li>
            <li><a href="#b8">Deflection</a></li>
            <li><a href="#b9">Cracking</a></li>
            <li><a href="#b10">Detailing</a></li>
          </ol>
        </div>
        <div class="toc-card lighter">
          <h3>Part 3 &mdash; Columns</h3>
          <ol>
            <li><a href="#c1">Classification</a></li>
            <li><a href="#c2">Loading</a></li>
            <li><a href="#c3">Slenderness</a></li>
            <li><a href="#c4">Design Moments</a></li>
            <li><a href="#c5">Axial + Uniaxial</a></li>
            <li><a href="#c6">Biaxial Bending</a></li>
            <li><a href="#c7">Shear</a></li>
            <li><a href="#c8">Design Charts</a></li>
            <li><a href="#c9">Detailing</a></li>
          </ol>
        </div>
        <div class="toc-card lighter">
          <h3>Part 4 &mdash; Building</h3>
          <ol>
            <li><a href="#building">Whole-Building Guidelines</a></li>
            <li><a href="#worked-example">G+1 Worked Example</a></li>
            <li><a href="#quickref">Combined Quick Reference</a></li>
            <li><a href="#glossary">Glossary of Symbols</a></li>
          </ol>
        </div>
      </div>
    </div>

    <!-- ===================== PART 0 ===================== -->
    <div class="part-bar p0">
      <div class="part-bar-inner">
        <span class="part-label">Part 0</span>
        <h2>Fundamentals &mdash; Read This First</h2>
      </div>
    </div>

    <div class="content-wrap" style="padding-top:24px;">

      <section id="f0">
        <div class="section-header">
          <span class="step-num">0.0</span>
          <h2>Objectives of Structural Design (ULS, SLS &amp; Durability)</h2>
        </div>
        <p>Structural design is the systematic engineering process of sizing members and specifying reinforcement to ensure a building safely transfers loads to the ground without excessive deformation, cracking, or deterioration over its design life.</p>
        
        <h3>1 &mdash; Ultimate Limit State (ULS)</h3>
        <p>ULS is concerned with safety and structural collapse. The structure must be capable of carrying the design ultimate loads without failure. This includes checks for bending (flexure), shear, axial compression, torsion, and overall sliding/overturning stability.</p>

        <h3>2 &mdash; Serviceability Limit State (SLS)</h3>
        <p>SLS is concerned with the appearance, comfort, and usability of the structure under service (working) loads. In concrete, the primary checks are:<br>
        &bull; <strong>Deflection:</strong> Slabs and beams must not sag excessively (visual alarm, damage to partitions). Controlled via span-to-depth limits.<br>
        &bull; <strong>Cracking:</strong> Cracks must be limited to prevent water ingress and steel corrosion. Controlled via maximum bar spacing limits.</p>

        <h3>3 &mdash; Durability &amp; Fire Protection <span class="cl">Table 3.3 / Table 3.4</span></h3>
        <p>Concrete acts as a protective shield for steel. Cover is chosen based on exposure class (mild, moderate, severe) and required fire resistance (typically 1 to 2 hours). Minimum cover ranges from 20mm (mild internal exposure) up to 40mm+ (severe external/coastal exposure).</p>
        <div class="backtotop"><a href="#top">&uarr; back to top</a></div>
      </section>

      <section id="f1">
        <div class="section-header">
          <span class="step-num">0.1</span>
          <h2>Materials and Partial Safety Factors</h2>
        </div>
        <p>Every calculation in this guide uses <strong>limit state design</strong>: real (characteristic) loads and material strengths are each factored to a "worst realistic case" before being combined, so the structure has a built-in margin against the things you can't predict exactly.</p>
        <h3>Material Partial Safety Factors <span class="cl">Table 2.2</span></h3>
        <div class="table-wrap"><table>
          <tr><th>Material / Effect</th><th>&gamma;<sub>m</sub> (Post-Amd 3, 2005)</th><th>&gamma;<sub>m</sub> (Pre-Amd 3, Original)</th></tr>
          <tr><td>Concrete in flexure or axial load</td><td>1.5</td><td>1.5</td></tr>
          <tr><td>Reinforcement (all types)</td><td>1.05</td><td>1.15</td></tr>
          <tr><td>Concrete in shear (design v<sub>c</sub>)</td><td>1.25</td><td>1.25</td></tr>
        </table></div>
        <h3>Common Material Grades</h3>
        <div class="formula">f<sub>cu</sub> = characteristic concrete cube strength &mdash; typically 25, 30, 35, 40 N/mm&sup2; for RC frames
f<sub>y</sub>  = characteristic steel yield strength &mdash; 460 N/mm&sup2; (high yield), 250 N/mm&sup2; (mild steel)
E<sub>c</sub>  &asymp; 20 to 30 kN/mm&sup2; depending on f<sub>cu</sub> (for deflection/stiffness calcs)</div>
        <div class="card"><p><strong>Design strength</strong> is characteristic strength &divide; &gamma;<sub>m</sub>. For reinforcement, BS 8110-1:1997 Amendment 3 changed &gamma;<sub>m</sub> from 1.15 to 1.05. This gives:<br>
        &bull; <strong>Post-Amendment 3 (Current):</strong> Design steel stress = 1/1.05 &times; f<sub>y</sub> &asymp; <strong>0.95f<sub>y</sub></strong><br>
        &bull; <strong>Pre-Amendment 3 (Older/Textbook):</strong> Design steel stress = 1/1.15 &times; f<sub>y</sub> &asymp; <strong>0.87f<sub>y</sub></strong> (still widely taught in many universities)</p></div>
        <div class="backtotop"><a href="#top">&uarr; back to top</a></div>
      </section>

      <section id="f2">
        <div class="section-header">
          <span class="step-num">0.2</span>
          <h2>Load Types and Combinations</h2>
        </div>
        <div class="table-wrap"><table>
          <tr><th>Symbol</th><th>Meaning</th></tr>
          <tr><td>G<sub>k</sub></td><td>Characteristic dead load &mdash; self-weight of the structure and everything permanently attached (finishes, services, fixed partitions)</td></tr>
          <tr><td>Q<sub>k</sub></td><td>Characteristic imposed (live) load &mdash; people, furniture, movable partitions, stored goods; from <span class="cl">BS 6399-1</span></td></tr>
          <tr><td>W<sub>k</sub></td><td>Characteristic wind load &mdash; from <span class="cl">BS 6399-2</span> (or CP3 Ch V historically)</td></tr>
        </table></div>
        <h3>Standard Load Combinations <span class="cl">Table 2.1</span></h3>
        <div class="formula">Dead + Imposed:           1.4G<sub>k</sub> + 1.6Q<sub>k</sub>
Dead + Wind:              1.0G<sub>k</sub> + 1.4W<sub>k</sub>  (or 1.4G<sub>k</sub> + 1.4W<sub>k</sub>, check both)
Dead + Imposed + Wind:    1.2G<sub>k</sub> + 1.2Q<sub>k</sub> + 1.2W<sub>k</sub>
Minimum dead (uplift / stability / pattern): 1.0G<sub>k</sub></div>
        <p>This guide's slab, beam, and column sections deal mainly with the gravity case (1.4G<sub>k</sub>+1.6Q<sub>k</sub>) since that governs the great majority of members; wind/lateral combinations are flagged specifically wherever they matter.</p>
        <div class="warn">Always check the minimum-load case (1.0G<sub>k</sub> only, no live load) on adjacent spans too &mdash; for continuous members this "unloaded span" case, paired with a fully loaded neighbouring span, often produces the true maximum hogging moment at a support.</div>
        <div class="backtotop"><a href="#top">&uarr; back to top</a></div>
      </section>

      <section id="f3">
        <div class="section-header">
          <span class="step-num">0.3</span>
          <h2>The Universal Flexure Method (K and Lever Arm)</h2>
        </div>
        <p>Slabs, beams, and columns (in bending) are all ultimately designed for flexure the same way. Learn this once; it is reused in every part of this guide.</p>
        <div class="flow">
          <div class="flow-item"><strong>1 &mdash; Compute K</strong>K = M / (bd&sup2;f<sub>cu</sub>) &mdash; a non-dimensional measure of how hard the section is being worked.</div>
          <div class="flow-item"><strong>2 &mdash; Compare to K'</strong>K' = 0.156 (singly reinforced limit, no redistribution). If K &le; K', section works with tension steel alone. If K &gt; K', compression steel is needed too.</div>
          <div class="flow-item"><strong>3 &mdash; Find lever arm z</strong>z = d[0.5 + &radic;(0.25 &minus; K/0.9)], capped at 0.95d.</div>
          <div class="flow-item"><strong>4 &mdash; Solve for steel</strong>A<sub>s</sub> = M / (0.95f<sub>y</sub>z) &mdash; or M / (0.87f<sub>y</sub>z) for pre-amendment.</div>
          <div class="flow-item"><strong>5 &mdash; Check limits</strong>Compare A<sub>s</sub> against the minimum and maximum steel percentages for that member type.</div>
        </div>
        <div class="card blue"><p>For slabs, b = 1000mm (design a 1-metre-wide strip). For beams, b = actual beam width (or effective flange width for T/L sections). For columns, the same stress-block logic underlies the design charts in Part 3, just combined with axial load N.</p></div>
        <div class="backtotop"><a href="#top">&uarr; back to top</a></div>
      </section>

      <section id="f4">
        <div class="section-header">
          <span class="step-num">0.4</span>
          <h2>The Overall Load Path</h2>
        </div>
        <div class="formula">Roof / Floor Finishes  &rarr;  SLAB  &rarr;  BEAM (if present)  &rarr;  COLUMN / WALL  &rarr;  FOUNDATION  &rarr;  Ground</div>
        <p>Every load starts as a pressure (kN/m&sup2;) on a slab. The slab converts that into a line load (kN/m) on the beams or a point reaction on columns (flat slabs). Beams convert their loads into point reactions on columns. Columns accumulate every floor above them into a single growing axial force that ends up at the foundation.</p>
        <div class="card"><p><strong>Design sequence for a real building:</strong> (1) sketch the load path floor by floor, (2) design the roof slab, (3) design the beams the roof slab lands on, (4) repeat downward floor by floor, (5) accumulate column loads all the way to foundation level, (6) design the foundations last.</p></div>
        <div class="backtotop"><a href="#top">&uarr; back to top</a></div>
      </section>

    </div>

    <!-- ===================== PART 1 — SLABS ===================== -->
    <div class="part-bar p1">
      <div class="part-bar-inner"><span class="part-label">Part 1</span><h2>Slabs &mdash; All Types</h2></div>
    </div>
    <nav class="section-nav" aria-label="Slabs sections">
      <div class="section-nav-inner">
        <a href="#s1">S1 &middot; Types</a>
        <a href="#s2">S2 &middot; Loading</a>
        <a href="#s3">S3 &middot; Depth</a>
        <a href="#s4">S4 &middot; One-Way</a>
        <a href="#s5">S5 &middot; 2-Way Simple</a>
        <a href="#s6">S6 &middot; 2-Way Restrained</a>
        <a href="#s7">S7 &middot; Flat</a>
        <a href="#s8">S8 &middot; Ribbed</a>
        <a href="#s9">S9 &middot; Cantilever</a>
        <a href="#s10">S10 &middot; Design</a>
        <a href="#s11">S11 &middot; Detailing</a>
      </div>
    </nav>

    <div class="content-wrap">

      <section id="s1">
        <div class="section-header"><span class="step-num">STEP S1</span><h2>Identify the Slab Type</h2></div>
        <p>Slab analysis branches early. Identify the type first; everything downstream (coefficients, formulas, detailing) follows from this choice.</p>
        <div class="type-card">
          <div class="meta">TYPE 1 &mdash; Cl. 3.5.2</div>
          <h3>One-Way Spanning Solid Slab</h3>
          <p>Supported on two opposite sides only, or l<sub>y</sub>/l<sub>x</sub> &gt; 2.0 on four sides.</p>
        </div>
        <div class="type-card">
          <div class="meta">TYPE 2 &mdash; Cl. 3.5.3.3</div>
          <h3>Two-Way Spanning Slab, Simply Supported (Corners Free to Lift)</h3>
          <p>Rectangular panel, l<sub>y</sub>/l<sub>x</sub> &le; 2.0, supported on four sides with no corner restraint.</p>
        </div>
        <div class="type-card">
          <div class="meta">TYPE 3 &mdash; Cl. 3.5.3.4 / 3.5.3.5</div>
          <h3>Two-Way Spanning Slab, Restrained (Corners Held Down)</h3>
          <p>Cast monolithically with edge beams/adjacent panels so corners are restrained &mdash; torsion reinforcement provided at corners. The most common floor slab type in framed buildings.</p>
        </div>
        <div class="type-card">
          <div class="meta">TYPE 4 &mdash; Cl. 3.7</div>
          <h3>Flat Slab (Supported Directly on Columns)</h3>
          <p>No beams &mdash; slab bears directly on columns, with or without drop panels or column heads. Punching shear is a governing case.</p>
        </div>
        <div class="type-card">
          <div class="meta">TYPE 5 &mdash; Cl. 3.6</div>
          <h3>Ribbed / Waffle Slab</h3>
          <p>Closely spaced ribs (one-way) or ribs in both directions (waffle) with a thin top flange &mdash; reduces self-weight on longer spans.</p>
        </div>
        <div class="type-card">
          <div class="meta">TYPE 6 &mdash; Cl. 3.4.6</div>
          <h3>Cantilever Slab</h3>
          <p>Projects beyond its support with a free edge &mdash; balconies, canopies. Deflection and top-steel anchorage govern.</p>
        </div>
        <div class="card"><p><strong>Slab Load Distribution Schematics:</strong></p>
        
        <h4>One-Way Slab Load Path (UDL to Beams)</h4>
        

        <h4>Two-Way Slab Load Path (Trapezoidal &amp; Triangular)</h4>
        
        </div>
        <div class="backtotop"><a href="#top">&uarr; back to top</a></div>
      </section>

      <section id="s2">
        <div class="section-header"><span class="step-num">STEP S2</span><h2>Determine the Loading</h2></div>
        <h3>2.1 &mdash; List Every Load Source (per m&sup2; of slab)</h3>
        <div class="table-wrap"><table>
          <tr><th>Source</th><th>How to Calculate</th><th>Load Type</th></tr>
          <tr><td>Self-weight of slab</td><td>&gamma;<sub>c</sub> &times; h (&gamma;<sub>c</sub> &asymp; 24 kN/m&sup3;, h in m)</td><td>Dead (Gk)</td></tr>
          <tr><td>Screed / finishes</td><td>&gamma;<sub>screed</sub> &times; thickness (50mm screed &asymp; 1.1 kN/m&sup2;)</td><td>Dead (Gk)</td></tr>
          <tr><td>Ceiling / services</td><td>Nominal 0.25&ndash;0.5 kN/m&sup2;</td><td>Dead (Gk)</td></tr>
          <tr><td>Lightweight movable partitions</td><td>UDL allowance per <span class="cl">BS 6399-1 Cl. 5.2</span>, typically 1.0 kN/m&sup2;</td><td>Dead (Gk)</td></tr>
          <tr><td>Imposed / live load</td><td><span class="cl">BS 6399-1 Table 1</span> (office 2.5, residential 1.5 kN/m&sup2;)</td><td>Live (Qk)</td></tr>
        </table></div>
        <div class="formula">n = 1.4G<sub>k</sub> + 1.6Q<sub>k</sub>   (ultimate design load per m&sup2;)
n<sub>min</sub> = 1.0G<sub>k</sub>   (minimum load case &mdash; pattern loading)</div>
        <h3>2.2 &mdash; Worked Example</h3>
        <div class="table-wrap"><table>
          <tr><th>Item</th><th>Value</th></tr>
          <tr><td>Slab self-weight, 175mm: 24 &times; 0.175</td><td>4.2 kN/m&sup2;</td></tr>
          <tr><td>Screed + finishes</td><td>1.2 kN/m&sup2;</td></tr>
          <tr><td>Ceiling/services allowance</td><td>0.3 kN/m&sup2;</td></tr>
          <tr><td>Partition allowance</td><td>1.0 kN/m&sup2;</td></tr>
          <tr><td><strong>Total G<sub>k</sub></strong></td><td><strong>6.7 kN/m&sup2;</strong></td></tr>
          <tr><td><strong>Q<sub>k</sub> (office)</strong></td><td><strong>2.5 kN/m&sup2;</strong></td></tr>
          <tr><td><strong>Ultimate n = 1.4(6.7) + 1.6(2.5)</strong></td><td><strong>13.4 kN/m&sup2;</strong></td></tr>
        </table></div>
        <div class="warn">Common mistake: applying the wrong imposed load category everywhere without checking individual panels for plant rooms, storage, or corridor loading (which are higher per BS 6399-1 Table 1).</div>
        <div class="backtotop"><a href="#top">&uarr; back to top</a></div>
      </section>

      <section id="s3">
        <div class="section-header"><span class="step-num">STEP S3</span><h2>Trial Thickness and Effective Depth</h2></div>
        <h3>Preliminary Sizing — Basic Span/Overall Depth Ratios <span class="cl">Cl. 3.4.6 / Table 3.9</span></h3>
        <div class="table-wrap"><table>
          <tr><th>Slab Type</th><th>Typical span/depth (overall h)</th><th>Basic span/eff. depth</th></tr>
          <tr><td>One-way, simply supported</td><td>span / 25 to span / 28</td><td>20</td></tr>
          <tr><td>One-way, continuous</td><td>span / 30 to span / 32</td><td>26</td></tr>
          <tr><td>Two-way, restrained (short span)</td><td>span / 34 to span / 38</td><td>26</td></tr>
          <tr><td>Flat slab, no drops</td><td>span / 28 to span / 32</td><td>24</td></tr>
          <tr><td>Flat slab, with drop panels</td><td>span / 32 to span / 36</td><td>26</td></tr>
          <tr><td>Ribbed / waffle slab</td><td>span / 22 to span / 26</td><td>20–26 (as one-way)</td></tr>
          <tr><td>Cantilever slab</td><td>span / 8 to span / 10</td><td>7</td></tr>
        </table></div>
        <p>These give a starting depth only &mdash; final depth must satisfy the deflection check (Step S10). d = h &minus; cover &minus; half bar diameter.</p>
        
        <div class="card"><p><strong>Rule of Thumb for Slab Sizing (Oyenuga &amp; Arya):</strong><br>
        For fast scheme design of standard building floor slabs, the following overall thicknesses (h) are commonly specified:<br>
        &bull; <strong>h = 125mm:</strong> Short span panels (&lt;3.0m), e.g., balconies, toilets, corridors.<br>
        &bull; <strong>h = 150mm:</strong> Standard residential/office slab panels (3.0m to 4.5m) &mdash; <em>the most widely used standard thickness in practice.</em><br>
        &bull; <strong>h = 175mm to 200mm:</strong> Large span panels (4.5m to 6.0m) or panels carrying heavy masonry partition walls.</p></div>
        
        <h3>Minimum Cover <span class="cl">Table 3.3</span></h3>
        <p>Typically 20&ndash;25mm internal/mild exposure, checked against fire resistance in <span class="cl">Table 3.4 / Fig 3.2</span>.</p>
        <div class="backtotop"><a href="#top">&uarr; back to top</a></div>
      </section>

      <section id="s4">
        <div class="section-header"><span class="step-num">STEP S4</span><h2>One-Way Spanning Slabs</h2></div>
        <h3>Simply Supported &mdash; UDL</h3>
        <div class="formula">M<sub>max</sub> (midspan, per m width) = n &times; l&sup2; / 8
V<sub>max</sub> (at support, per m width) = n &times; l / 2</div>
        <h3>Continuous One-Way Slab &mdash; Coefficients <span class="cl">Table 3.12</span></h3>
        <div class="formula">Conditions: spans approx. equal, loads substantially UDL, Q<sub>k</sub> &le; G<sub>k</sub>, &ge;3 spans
M = coefficient &times; n &times; l&sup2;
V = coefficient &times; n &times; l</div>
        <div class="card blue"><p>Design each metre-wide strip as a beam of unit width &mdash; flexural/shear design follows the same method as Part 2, Steps B6&ndash;B7, per metre run instead of per beam width.</p></div>
        <div class="backtotop"><a href="#top">&uarr; back to top</a></div>
      </section>

      <section id="s5">
        <div class="section-header"><span class="step-num">STEP S5</span><h2>Two-Way Spanning Slabs &mdash; Simply Supported (Corners Free)</h2></div>
        <div class="formula">M<sub>sx</sub> = &alpha;<sub>sx</sub> &times; n &times; l<sub>x</sub>&sup2;   (short-span midspan)
M<sub>sy</sub> = &alpha;<sub>sy</sub> &times; n &times; l<sub>x</sub>&sup2;   (long-span midspan)
  &alpha;<sub>sx</sub>, &alpha;<sub>sy</sub> from Table 3.13, function of l<sub>y</sub>/l<sub>x</sub></div>
        <div class="warn">No corner (torsion) steel provided in this case &mdash; corners will lift/crack if not genuinely free of restraint. Only appropriate where corners rest freely (e.g. on masonry walls), not where cast monolithically with beams.</div>
        <div class="backtotop"><a href="#top">&uarr; back to top</a></div>
      </section>

      <section id="s6">
        <div class="section-header"><span class="step-num">STEP S6</span><h2>Two-Way Spanning Slabs &mdash; Restrained (Corners Held Down)</h2></div>
        <h3>Panel Classification <span class="cl">Table 3.14</span></h3>
        <p>Classify each panel: interior panel, or one/two/three/four edges discontinuous &mdash; each has its own set of moment coefficients.</p>
        <div class="formula">Midspan (sagging):  M<sub>sx</sub> = &beta;<sub>sx</sub>nl<sub>x</sub>&sup2;,  M<sub>sy</sub> = &beta;<sub>sy</sub>nl<sub>x</sub>&sup2;
Support (hogging):  M<sub>hx</sub> = &beta;<sub>hx</sub>nl<sub>x</sub>&sup2;,  M<sub>hy</sub> = &beta;<sub>hy</sub>nl<sub>x</sub>&sup2;
  (&beta; from Table 3.14 by panel type and l<sub>y</sub>/l<sub>x</sub>)</div>
        <h3>Shear <span class="cl">Table 3.15</span></h3>
        <div class="formula">V<sub>x</sub> = &beta;<sub>vx</sub> &times; n &times; l<sub>x</sub>   (short edge)
V<sub>y</sub> = &beta;<sub>vy</sub> &times; n &times; l<sub>x</sub>   (long edge)</div>
        <h3>Corner (Torsion) Reinforcement <span class="cl">Cl. 3.5.3.5</span></h3>
        <div class="formula">A<sub>s,corner</sub> = (3/4) &times; A<sub>sx</sub> (max short-span steel)
Extend l<sub>x</sub>/5 both directions from corner; both faces at discontinuous corners</div>
        <div class="card"><p><strong>Torsion Steel Detailing (Oyenuga &amp; Arya):</strong><br>
        Torsion steel must be provided in a grid layout in both the top and bottom faces of the slab. At discontinuous corners (e.g. exterior slab corners), this grid must extend <strong>0.2l<sub>x</sub></strong> in both directions and consist of at least <strong>75%</strong> of the area of reinforcement required for the maximum span moment.</p></div>
        <div class="backtotop"><a href="#top">&uarr; back to top</a></div>
      </section>

      <section id="s7">
        <div class="section-header"><span class="step-num">STEP S7</span><h2>Flat Slabs</h2></div>
        <div class="formula">Divide each panel into:
  column strip  (0.5 &times; panel width, centred on column line)
  middle strip  (the remainder)</div>
        <div class="table-wrap"><table>
          <tr><th>Method</th><th>When Used</th></tr>
          <tr><td>Equivalent frame method</td><td>Standard &mdash; analyse each direction as a frame of columns and slab strips</td></tr>
          <tr><td>Simplified coefficients</td><td>Regular grid, &ge;3 spans, UDL, restricted per <span class="cl">Cl. 3.7.2.7</span></td></tr>
          <tr><td>Finite element / grillage</td><td>Irregular grids, large openings, transfer conditions</td></tr>
        </table></div>
        <h3>Punching Shear <span class="cl">Cl. 3.7.7</span></h3>
        <div class="formula">Check on a perimeter at 1.5d from the column face:
v = V<sub>eff</sub> / (u &times; d)
V<sub>eff</sub> = V<sub>t</sub> &times; [1 + 1.5(M<sub>t</sub>/V<sub>t</sub>)(1/x)]
Compare v against v<sub>c</sub> (Table 3.8)</div>
        <div class="warn">Punching shear governs flat slab design far more often than flexure &mdash; always check every column, especially edge/corner columns.</div>
        <h3>Integrity Steel <span class="cl">Cl. 3.7.3</span></h3>
        <p>At least two bottom bars in each direction should pass through each column, continuous or well lapped, for robustness.</p>
        <div class="backtotop"><a href="#top">&uarr; back to top</a></div>
      </section>

      <section id="s8">
        <div class="section-header"><span class="step-num">STEP S8</span><h2>Ribbed and Waffle Slabs</h2></div>
        <div class="table-wrap"><table>
          <tr><th>Element</th><th>Typical Limit</th></tr>
          <tr><td>Rib spacing</td><td>&le; 1.5m centres</td></tr>
          <tr><td>Rib width</td><td>&ge; 125mm typical</td></tr>
          <tr><td>Topping thickness</td><td>&ge; 40mm, often 50&ndash;75mm with light mesh</td></tr>
        </table></div>
        <p>Analyse the slab as a solid slab or series of beams (as Steps S4&ndash;S6), then design each rib as a flanged (T) beam using the topping as the compression flange &mdash; see Part 2, Step B6.</p>
        <div class="formula">b<sub>eff</sub> per rib = b<sub>w</sub> + l<sub>z</sub>/5 each side (&le; rib spacing)</div>
        <div class="backtotop"><a href="#top">&uarr; back to top</a></div>
      </section>

      <section id="s9">
        <div class="section-header"><span class="step-num">STEP S9</span><h2>Cantilever Slabs</h2></div>
        <div class="formula">M<sub>max</sub> (fixed support, hogging, per m) = n &times; l&sup2; / 2
V<sub>max</sub> (at fixed support) = n &times; l</div>
        <div class="formula">Basic span/effective-depth ratio = 7 (most conservative of all slab types)</div>
        <p>Cantilevers are almost always deflection-critical &mdash; check early. Anchor top steel a full anchorage length past the point of contraflexure into the back span.</p>
        <div class="warn">Never assume a cantilever's self-weight alone "counterbalances" the load &mdash; verify the back-span/support has adequate capacity and continuity explicitly.</div>
        <div class="backtotop"><a href="#top">&uarr; back to top</a></div>
      </section>

      <section id="s10">
        <div class="section-header"><span class="step-num">STEP S10</span><h2>Flexural Design, Shear, and Deflection (All Types)</h2></div>
        <div class="formula">K = M / (1000 &times; d&sup2; &times; f<sub>cu</sub>)   (b = 1000mm per metre strip)
z = d[0.5 + &radic;(0.25 &minus; K/0.9)] &le; 0.95d
A<sub>s</sub> = M / (0.95f<sub>y</sub>z) per metre width &mdash; or M / (0.87f<sub>y</sub>z) for pre-amendment</div>
        <div class="table-wrap"><table>
          <tr><th>Condition</th><th>Limit</th><th>Reference</th></tr>
          <tr><td>Minimum steel, each direction (f<sub>y</sub>=460)</td><td>0.13% of gross section</td><td><span class="cl">Table 3.25</span></td></tr>
          <tr><td>Max bar spacing, main steel</td><td>3d or 750mm, lesser (note: designers often use 250-300mm to control cracks)</td><td><span class="cl">Cl. 3.12.11.2.7</span></td></tr>
          <tr><td>Max bar spacing, secondary steel</td><td>3d or 750mm, lesser</td><td><span class="cl">Cl. 3.12.11.2.8</span></td></tr>
        </table></div>
        <div class="formula">Allowable span/d = basic ratio (Table 3.9) &times; mod. factor tension steel (Table 3.10) &times; mod. factor compression steel (Table 3.11)
Check: actual span/d &le; allowable span/d</div>
        <div class="backtotop"><a href="#top">&uarr; back to top</a></div>
      </section>

      <section id="s11">
        <div class="section-header"><span class="step-num">STEP S11</span><h2>Detailing (All Slab Types)</h2></div>
        <ul class="check">
          <li>Simply supported: extend &ge;50% of midspan steel to within 0.1l of each support; rest may stop at 0.15l from support.</li>
          <li>Continuous: extend top steel &ge;0.15l into span at interior supports; stop half at 0.25l.</li>
          <li>Anchorage at simple ends: &ge;50% of midspan steel, anchored &ge;12&phi; past face of support.</li>
          <li>Secondary steel: 0.13% of gross area for one-way slabs (distribution/shrinkage steel).</li>
          <li>Flat slabs: top steel over column heads per column-strip requirements, integrity steel through columns.</li>
          <li>Ribbed slabs: check bar spacing within the rib, provide links in ribs as for a beam where shear requires.</li>
          <li>Cantilevers: never terminate top bars at/before the support &mdash; full anchorage into back span.</li>
        </ul>
        <div class="backtotop"><a href="#top">&uarr; back to top</a></div>
      </section>

    </div>

    <!-- ===================== PART 2 — BEAMS ===================== -->
    <div class="part-bar p2">
      <div class="part-bar-inner"><span class="part-label">Part 2</span><h2>Beams &mdash; All Types</h2></div>
    </div>
    <nav class="section-nav" aria-label="Beams sections">
      <div class="section-nav-inner">
        <a href="#b1">B1 &middot; Classification</a>
        <a href="#b2">B2 &middot; Loading</a>
        <a href="#b3">B3 &middot; Span/Depth</a>
        <a href="#b4">B4 &middot; Analysis</a>
        <a href="#b5">B5 &middot; Moments &amp; Shear</a>
        <a href="#b6">B6 &middot; Flexure</a>
        <a href="#b7">B7 &middot; Shear</a>
        <a href="#b8">B8 &middot; Deflection</a>
        <a href="#b9">B9 &middot; Cracking</a>
        <a href="#b10">B10 &middot; Detailing</a>
      </div>
    </nav>

    <div class="content-wrap">

      <section id="b1">
        <div class="section-header"><span class="step-num">STEP B1</span><h2>Classify the Beam</h2></div>
        <div class="table-wrap"><table>
          <tr><th>Type</th><th>Criterion</th><th>BS 8110 Clause</th></tr>
          <tr><td>Simply supported beam</td><td>Single span, free rotation at both ends</td><td><span class="cl">3.4.1</span></td></tr>
          <tr><td>Continuous beam</td><td>Two or more spans over intermediate supports</td><td><span class="cl">3.4.3, Table 3.5/3.6</span></td></tr>
          <tr><td>Cantilever beam</td><td>Fixed one end, free the other &mdash; hogging throughout</td><td><span class="cl">3.4.6</span></td></tr>
          <tr><td>Rectangular beam</td><td>Solid rectangular section, no flange contribution</td><td><span class="cl">3.4.4.1</span></td></tr>
          <tr><td>Flanged beam (T/L)</td><td>Cast monolithically with slab &mdash; slab acts as compression flange</td><td><span class="cl">3.4.1.5</span></td></tr>
        </table></div>
        <h3>Also Establish</h3>
        <ul class="check">
          <li>Primary (carries slab reactions + secondary beams) or secondary (slab only)?</li>
          <li>Point loads from other beams landing on it, or purely distributed?</li>
          <li>Part of a moment frame (rigid column connection) or simple beam-on-support?</li>
          <li>Openings, cantilevered projections, or section changes along its length?</li>
        </ul>
        <div class="backtotop"><a href="#top">&uarr; back to top</a></div>
      </section>

      <section id="b2">
        <div class="section-header"><span class="step-num">STEP B2</span><h2>Determine the Loading on a Beam</h2></div>
        <div class="table-wrap"><table>
          <tr><th>Source</th><th>How it Loads the Beam</th><th>Load Type</th></tr>
          <tr><td>Self-weight</td><td>w = &gamma;<sub>c</sub> &times; b &times; h</td><td>Dead (Gk)</td></tr>
          <tr><td>Slab reaction (one-way)</td><td>UDL from half the slab span each side of the beam</td><td>Dead + Live</td></tr>
          <tr><td>Slab reaction (two-way)</td><td>Triangular/trapezoidal, via &beta;<sub>vx</sub>, &beta;<sub>vy</sub> <span class="cl">Table 3.15</span></td><td>Dead + Live</td></tr>
          <tr><td>Walls carried directly</td><td>w = &gamma;<sub>wall</sub> &times; thickness &times; height</td><td>Dead (Gk)</td></tr>
          <tr><td>Secondary beam landing on primary</td><td>Point load = secondary beam's reaction at that support</td><td>Dead + Live</td></tr>
          <tr><td>Finishes/services</td><td>UDL per m&sup2; of tributary area, converted to per-metre run</td><td>Dead (Gk)</td></tr>
        </table></div>
        <h3>Tributary Loads from Slabs</h3>
        <div class="formula">One-way slab, beam along short edge: w<sub>beam</sub> = n &times; (l<sub>x</sub>/2)

Two-way restrained slab (Table 3.15):
  V<sub>x</sub> = &beta;<sub>vx</sub> &times; n &times; l<sub>x</sub>  (short edge, triangular)
  V<sub>y</sub> = &beta;<sub>vy</sub> &times; n &times; l<sub>x</sub>  (long edge, trapezoidal)

Equivalent UDL, triangular load:   w<sub>eq</sub> = (1/2) &times; w<sub>max</sub>
Equivalent UDL, trapezoidal load:  w<sub>eq</sub> = w<sub>max</sub> &times; [1 &minus; (1/3)(l<sub>x</sub>/l<sub>y</sub>)&sup2;]
  where w<sub>max</sub> = n &times; l<sub>x</sub> / 2</div>
        <div class="formula">G<sub>k</sub> = self-weight + finishes + walls + slab dead reaction
Q<sub>k</sub> = slab live reaction + any direct imposed load
w<sub>u</sub> = 1.4G<sub>k</sub> + 1.6Q<sub>k</sub>   <span>(Table 2.1)</span></div>
        <h3>Worked Example: Load Take-Down onto a Primary Beam</h3>
        <div class="table-wrap"><table>
          <tr><th>Item</th><th>Calculation</th><th>Value</th></tr>
          <tr><td>Beam self-weight (300&times;500mm)</td><td>24 &times; 0.3 &times; 0.5</td><td>3.6 kN/m</td></tr>
          <tr><td>Slab dead reaction (l<sub>x</sub>=4m, Gk=4.5 kN/m&sup2;)</td><td>4.5 &times; (4/2)</td><td>9.0 kN/m</td></tr>
          <tr><td>Slab live reaction (Qk=2.5 kN/m&sup2;)</td><td>2.5 &times; (4/2)</td><td>5.0 kN/m</td></tr>
          <tr><td>Block wall (150mm, 2.8m, &gamma;=19, less openings)</td><td>19&times;0.15&times;2.8&times;0.85</td><td>6.8 kN/m</td></tr>
          <tr><td><strong>Total G<sub>k</sub></strong></td><td>3.6+9.0+6.8</td><td><strong>19.4 kN/m</strong></td></tr>
          <tr><td><strong>Total Q<sub>k</sub></strong></td><td>&mdash;</td><td><strong>5.0 kN/m</strong></td></tr>
          <tr><td><strong>Ultimate w<sub>u</sub></strong></td><td>1.4(19.4)+1.6(5.0)</td><td><strong>35.2 kN/m</strong></td></tr>
        </table></div>
        <details class="card" style="cursor: pointer; margin: 18px 0;">
          <summary style="font-weight: 600; font-size: 14px; outline: none; padding-bottom: 4px;">
            🔍 Visualizing Combined Loading: UDL vs. Discrete Point Loads
          </summary>
          <div style="margin-top: 12px; font-size: 13.5px; line-height: 1.6;">
            <p>In structural design, loads must be modeled as they physically act. If a load is distributed along the entire length (like self-weight or wall loads), it is a <strong>Uniformly Distributed Load (UDL)</strong>. If a concentrated load acts at a specific point (like a secondary beam reaction or a column on a transfer beam), it must be modeled as a <strong>discrete point load</strong>.</p>
            
            <p>⚠️ <strong>Critical Warning:</strong> Smearing a point load into a UDL (e.g. dividing the point load by span and adding it to the UDL) is incorrect. It significantly underestimates the bending moment at mid-span and changes the shear force diagram shape.</p>

            <h4>Beam Loading Elevation Schematic</h4>
            
            
            <h4>Bending Moment comparison:</h4>
            <ul>
              <li><strong>Point Load at Midspan (P):</strong> Max Moment \\(M = \\frac{P L}{4}\\)</li>
              <li><strong>Equivalent Smeared UDL (w = P/L):</strong> Max Moment \\(M = \\frac{w L^2}{8} = \\frac{P L}{8}\\) (Underestimates bending by <strong>50%!</strong>)</li>
            </ul>
          </div>
        </details>
        <h3>Common Mistakes</h3>
        <ul class="check">
          <li>Double-counting slab load on both beam and column directly.</li>
          <li>Using gross wall height instead of clear height between slab soffit and beam/floor below.</li>
          <li>Forgetting the partition allowance (typically 1.0 kN/m&sup2;).</li>
          <li>Applying live load reduction where it doesn't belong (that's a column-level effect, see Part 3).</li>
          <li>Ignoring construction-stage loading (wet concrete + formwork on a propped beam below).</li>
        </ul>
        <div class="backtotop"><a href="#top">&uarr; back to top</a></div>
      </section>

      <section id="b3">
        <div class="section-header"><span class="step-num">STEP B3</span><h2>Effective Span and Trial Depth</h2></div>
        <div class="formula">Simply supported: l<sub>eff</sub> = min(clear span + d, centre-to-centre of supports)
Continuous:       l<sub>eff</sub> = centre-to-centre of supports
Cantilever:       l<sub>eff</sub> = length to face of support + d/2</div>
        <div class="table-wrap"><table>
          <tr><th>Beam Type</th><th>Typical span/depth (overall h)</th><th>Basic span/d limit <span class="cl">Table 3.9</span></th></tr>
          <tr><td>Simply supported</td><td>span / 12 to span / 15</td><td>20</td></tr>
          <tr><td>Continuous</td><td>span / 15 to span / 18</td><td>26</td></tr>
          <tr><td>Cantilever</td><td>span / 6 to span / 8</td><td>7</td></tr>
        </table></div>
        <p>Confirm final depth against the deflection check in Step B8. d = h &minus; cover &minus; link diameter &minus; half main bar diameter.</p>
        <div class="card"><p><strong>Rule of Thumb for Beam Sizing (Chanakya Arya):</strong><br>
        &bull; <strong>Overall Depth (h):</strong> Choose a starting depth of <strong>span / 12</strong> (simply supported) or <strong>span / 15</strong> (continuous) to ensure deflection is easily satisfied.<br>
        &bull; <strong>Web Width (b<sub>w</sub>):</strong> Typically select b<sub>w</sub> between <strong>0.3h and 0.5h</strong>. In local practice (Oyenuga's manual), widths are standard at <strong>225mm</strong> (to sit flush with 9-inch sandcrete block walling) or <strong>300mm</strong>.</p></div>
        <div class="backtotop"><a href="#top">&uarr; back to top</a></div>
      </section>

      <section id="b4">
        <div class="section-header"><span class="step-num">STEP B4</span><h2>Select the Analysis Method</h2></div>
        <div class="table-wrap"><table>
          <tr><th>Method</th><th>When to Use</th><th>Clause</th></tr>
          <tr><td>Simply supported formula</td><td>Single span, standard UDL/point loads</td><td>Basic statics</td></tr>
          <tr><td>Moment/shear coefficients</td><td>Approx. equal spans (&plusmn;15%), UDL dominant, &ge;3 spans</td><td><span class="cl">Table 3.5/3.6</span></td></tr>
          <tr><td>Moment distribution (manual)</td><td>Unequal spans, mixed loading</td><td><span class="cl">3.4.3</span></td></tr>
          <tr><td>Computer frame/grillage</td><td>Beams part of a rigid frame with columns, complex loads</td><td><span class="cl">3.2.1</span></td></tr>
        </table></div>
        <div class="card"><p><strong>Conditions for Table 3.5/3.6 coefficients:</strong> spans approximately equal, loads substantially UDL, Q<sub>k</sub> &le; G<sub>k</sub>. Otherwise, run a proper elastic/moment-distribution analysis with pattern loading.</p></div>
        <div class="backtotop"><a href="#top">&uarr; back to top</a></div>
      </section>

      <section id="b5">
        <div class="section-header"><span class="step-num">STEP B5</span><h2>Bending Moments and Shear Forces</h2></div>
        <div class="formula">Simply supported, UDL:          M<sub>max</sub> = w<sub>u</sub>l&sup2;/8,   V<sub>max</sub> = w<sub>u</sub>l/2
Simply supported, point at mid: M<sub>max</sub> = Pl/4,      V<sub>max</sub> = P/2
Cantilever, UDL:                M<sub>max</sub> = w<sub>u</sub>l&sup2;/2,   V<sub>max</sub> = w<sub>u</sub>l</div>
        <div class="warn">Pattern loading (beams not qualifying for coefficients): run full load on all spans, and alternate spans loaded with 1.4G<sub>k</sub>+1.6Q<sub>k</sub> while others carry 1.0G<sub>k</sub>, to capture true maximum span and support moments.</div>
        <h3>Redistribution <span class="cl">Cl. 3.2.2</span></h3>
        <p>Elastic moments may be redistributed up to 30% (x/d &le; 0.6 after redistribution), provided equilibrium is maintained and envelopes adjusted accordingly.</p>
        <div class="backtotop"><a href="#top">&uarr; back to top</a></div>
      </section>

      <section id="b6">
        <div class="section-header"><span class="step-num">STEP B6</span><h2>Flexural (Bending) Design</h2></div>
        <div class="formula">K = M / (bd&sup2;f<sub>cu</sub>);  K' = 0.156
If K &le; K': z = d[0.5 + &radic;(0.25 &minus; K/0.9)] &le; 0.95d
A<sub>s</sub> = M / (0.95f<sub>y</sub>z) &mdash; or M / (0.87f<sub>y</sub>z) for pre-amendment</div>
        <h3>Doubly Reinforced Section (K &gt; K')</h3>
        <div class="formula">A<sub>s</sub>' = (K&minus;K')f<sub>cu</sub>bd&sup2; / [0.95f<sub>y</sub>(d&minus;d')]   (or 0.87f<sub>y</sub> for pre-amendment)
A<sub>s</sub>  = K'f<sub>cu</sub>bd&sup2; / (0.95f<sub>y</sub>z') + A<sub>s</sub>'   (z' = 0.775d; or 0.87f<sub>y</sub> for pre-amendment)</div>
        <h3>Flanged (T/L) Beams <span class="cl">Cl. 3.4.1.5</span></h3>
        <div class="formula">b<sub>eff</sub> (T-beam) = b<sub>w</sub> + l<sub>z</sub>/5   (or actual flange width, whichever is less; note: this is l<sub>z</sub>/10 on each side of the web)
b<sub>eff</sub> (L-beam) = b<sub>w</sub> + l<sub>z</sub>/10  (or actual flange width, whichever is less; note: this is l<sub>z</sub>/10 on one side of the web)
  l<sub>z</sub> &asymp; 0.7 &times; effective span for a continuous beam</div>
        <div class="table-wrap"><table>
          <tr><th>Condition</th><th>Limit (f<sub>y</sub> = 460)</th><th>Reference</th></tr>
          <tr><td>Min tension steel, rectangular</td><td>0.13% of b &times; h</td><td><span class="cl">Table 3.25</span></td></tr>
          <tr><td>Min tension steel, flanged (web in tension)</td><td>b<sub>w</sub>/b &lt; 0.4: 0.18% of b<sub>w</sub>&times;h<br>b<sub>w</sub>/b &ge; 0.4: 0.13% of b<sub>w</sub>&times;h</td><td><span class="cl">Table 3.25</span></td></tr>
          <tr><td>Min tension steel, flanged (flange in tension)</td><td>T-beam: 0.26% of b<sub>w</sub>&times;h<br>L-beam: 0.20% of b<sub>w</sub>&times;h</td><td><span class="cl">Table 3.25</span></td></tr>
          <tr><td>Max tension or compression steel</td><td>4% of gross area each (tension &amp; compression)</td><td><span class="cl">Cl. 3.12.6.1</span></td></tr>
        </table></div>
        <div class="backtotop"><a href="#top">&uarr; back to top</a></div>
      </section>

      <section id="b7">
        <div class="section-header"><span class="step-num">STEP B7</span><h2>Shear Design</h2></div>
        <div class="formula">v = V / (b<sub>v</sub>d) &le; 0.8&radic;f<sub>cu</sub> or 5 N/mm&sup2; (lesser)
v<sub>c</sub> = 0.79[100A<sub>s</sub>/(b<sub>v</sub>d)]&sup1;&sol;&sup3;(400/d)&frac14;/&gamma;<sub>m</sub> &times; (f<sub>cu</sub>/25)&sup1;&sol;&sup3;</div>
        <div class="table-wrap"><table>
          <tr><th>Condition</th><th>Provision</th></tr>
          <tr><td>v &lt; 0.5v<sub>c</sub></td><td>Nominal links only</td></tr>
          <tr><td>0.5v<sub>c</sub> &le; v &lt; (v<sub>c</sub>+0.4)</td><td>Min links: A<sub>sv</sub>/s<sub>v</sub> = 0.4b<sub>v</sub>/(0.95f<sub>yv</sub>)  [or 0.87 for pre-amendment]</td></tr>
          <tr><td>v &ge; (v<sub>c</sub>+0.4)</td><td>Design links: A<sub>sv</sub>/s<sub>v</sub> = b<sub>v</sub>(v&minus;v<sub>c</sub>)/(0.95f<sub>yv</sub>)  [or 0.87 for pre-amendment]</td></tr>
          <tr><td>v &gt; 0.8&radic;f<sub>cu</sub> or 5N/mm&sup2;</td><td>Section too small &mdash; increase b or d</td></tr>
        </table></div>
        <div class="formula">Max link spacing s<sub>v</sub> &le; 0.75d;  max lateral leg spacing &le; d</div>
        <div class="card"><p><strong>Practical Detailing of Shear Links (Oyenuga Manual):</strong><br>
        &bull; <strong>Link Diameter:</strong> Use high-yield steel links of at least <strong>8mm diameter</strong> (10mm if beam width &gt;300mm or load is heavy).<br>
        &bull; <strong>Practical Spacing:</strong> Spacings are rounded to clean structural multiples &mdash; e.g., 100mm, 150mm, 200mm, 250mm, or 300mm.<br>
        &bull; <strong>Link Zoning:</strong> Since shear is maximum at support faces and drops rapidly toward midspan, design links are concentrated near the supports (up to 1.5d to 2.0d from the face) and transitioned to nominal/minimum links at 250-300mm spacing for the remainder of the span.</p></div>
        <div class="card blue"><p><strong>Critical section:</strong> checked at distance d from the face of the support.</p></div>
        <div class="backtotop"><a href="#top">&uarr; back to top</a></div>
      </section>

      <section id="b8">
        <div class="section-header"><span class="step-num">STEP B8</span><h2>Deflection Check</h2></div>
        <div class="table-wrap"><table>
          <tr><th>Support Condition</th><th>Basic span/d</th><th>Reference</th></tr>
          <tr><td>Cantilever</td><td>7</td><td><span class="cl">Table 3.9</span></td></tr>
          <tr><td>Simply supported</td><td>20</td><td><span class="cl">Table 3.9</span></td></tr>
          <tr><td>Continuous</td><td>26</td><td><span class="cl">Table 3.9</span></td></tr>
        </table></div>
        <div class="formula">Allowable span/d = basic ratio &times; mod. factor (tension, Table 3.10) &times; mod. factor (compression, Table 3.11)
Check: actual span/d &le; allowable span/d</div>
        <p>Flanged beams with b<sub>w</sub>/b &lt; 0.3: apply the additional reduction factor <span class="cl">Cl. 3.4.6.4</span>. Spans &gt;10m: apply the correction factor 10/span.</p>
        <div class="backtotop"><a href="#top">&uarr; back to top</a></div>
      </section>

      <section id="b9">
        <div class="section-header"><span class="step-num">STEP B9</span><h2>Cracking / Crack Control</h2></div>
        <div class="formula">Clear bar spacing &le; 47000/f<sub>s</sub> (mm), &le; 300mm   <span class="cl">Cl. 3.12.11.2.3 / Table 3.28</span>
  f<sub>s</sub> = service stress in tension steel (N/mm&sup2;) = (2/3)f<sub>y</sub> &times; (A<sub>s,req</sub>/A<sub>s,prov</sub>) &times; (1/&beta;<sub>b</sub>)
  (simplified: max clear spacing 155&ndash;300mm depending on redistribution &mdash; <span class="cl">Table 3.28</span>)</div>
        <p>Side face bars required where overall depth &gt;750mm: spacing &le;250mm, &ge;0.1% of side face area (b &times; 2 &times; (h&minus;x)/3 zone) per side <span class="cl">Cl. 3.12.11.2.6</span>.</p>
        <div class="backtotop"><a href="#top">&uarr; back to top</a></div>
      </section>

      <section id="b10">
        <div class="section-header"><span class="step-num">STEP B10</span><h2>Detailing and Curtailment</h2></div>
        <ul class="check">
          <li>Simply supported: extend &ge;50% of bottom steel to within 0.1l of each support end; bend the rest up or stop at 0.15l from the support face with a 12&phi; anchorage.</li>
          <li>Continuous &mdash; midspan steel: stop 50% at 0.15l from each support face; rest continues to within 0.1l of the far support.</li>
          <li>Continuous &mdash; support steel (hogging): extend &ge;0.15l into the span on each side; lap with midspan steel where needed.</li>
          <li>Cantilever: all top steel must extend a full anchorage length into the back span or supporting member &mdash; do not stop at the root face.</li>
          <li>Link spacing: &le;0.75d throughout; increase near supports where shear is high and reduce toward midspan where shear drops.</li>
          <li>Minimum 2 top bars + 2 bottom bars throughout regardless of moment (for handling and concrete placement).</li>
          <li>Bar spacing limits: main bars not closer than h<sub>agg</sub>+5mm; not more than the cracking spacing from Step B9.</li>
        </ul>
        <div class="backtotop"><a href="#top">&uarr; back to top</a></div>
      </section>

    </div>

    <!-- ===================== PART 3 — COLUMNS ===================== -->
    <div class="part-bar p3">
      <div class="part-bar-inner"><span class="part-label">Part 3</span><h2>Columns &mdash; All Types</h2></div>
    </div>
    <nav class="section-nav" aria-label="Columns sections">
      <div class="section-nav-inner">
        <a href="#c1">C1 &middot; Classification</a>
        <a href="#c2">C2 &middot; Loading</a>
        <a href="#c3">C3 &middot; Slenderness</a>
        <a href="#c4">C4 &middot; Design Moments</a>
        <a href="#c5">C5 &middot; Axial + Uniaxial</a>
        <a href="#c6">C6 &middot; Biaxial Bending</a>
        <a href="#c7">C7 &middot; Shear</a>
        <a href="#c8">C8 &middot; Design Charts</a>
        <a href="#c9">C9 &middot; Detailing</a>
      </div>
    </nav>

    <div class="content-wrap">

      <section id="c1">
        <div class="section-header"><span class="step-num">STEP C1</span><h2>Classify the Column</h2></div>
        <div class="table-wrap"><table>
          <tr><th>Classification</th><th>Criterion</th><th>BS 8110</th></tr>
          <tr><td>Short column (braced)</td><td>l<sub>e</sub>/b &le; 15 <em>and</em> l<sub>e</sub>/h &le; 15</td><td><span class="cl">Cl. 3.8.1.3</span></td></tr>
          <tr><td>Short column (unbraced)</td><td>l<sub>e</sub>/b &le; 10 <em>and</em> l<sub>e</sub>/h &le; 10</td><td><span class="cl">Cl. 3.8.1.3</span></td></tr>
          <tr><td>Slender column</td><td>Exceeds the short-column limits above &mdash; additional moment M<sub>add</sub> required</td><td><span class="cl">Cl. 3.8.3</span></td></tr>
          <tr><td>Braced column</td><td>Lateral load carried by shear walls/cores, not by this column</td><td><span class="cl">Cl. 3.8.1.5</span></td></tr>
          <tr><td>Unbraced column</td><td>Column itself contributes to lateral stability &mdash; sway frame</td><td><span class="cl">Cl. 3.8.1.5</span></td></tr>
        </table></div>
        <div class="backtotop"><a href="#top">&uarr; back to top</a></div>
      </section>

      <section id="c2">
        <div class="section-header"><span class="step-num">STEP C2</span><h2>Determine Loading on the Column</h2></div>
        <p>Columns accumulate load from every floor above. The load at any level is the sum of reactions from all beams framing in from that floor, plus the self-weight of the column length at that storey, plus the column load already accumulated from the floors above.</p>
        <div class="formula">N<sub>floor</sub> = &Sigma;(beam reactions framing in at that level) + column self-weight for storey
N<sub>total</sub> = &Sigma; N<sub>floor</sub> for all floors above (cumulative)</div>
        <div class="formula">Column self-weight: N<sub>sw</sub> = 24 &times; b &times; h &times; storey-height  (kN, b and h in m)</div>
        <h3>Live Load Reduction <span class="cl">BS 6399-1 Cl. 6.2</span></h3>
        <p>For columns supporting more than one floor, the imposed (live) load may be reduced by a percentage that increases with the number of floors, because statistically not all floors are simultaneously fully loaded. Check the table in BS 6399-1 Cl. 6.2 for the applicable reduction factor.</p>
        <div class="card"><p><strong>Minimum eccentricity:</strong> BS 8110 requires that at minimum, a column is designed for an eccentricity of 0.05h or 20mm (whichever is the <strong>lesser</strong>) even if the analysis gives a smaller moment &mdash; giving a minimum design moment M<sub>min</sub> = N &times; e<sub>min</sub> <span class="cl">Cl. 3.8.2.4</span>.</p></div>
        <div class="backtotop"><a href="#top">&uarr; back to top</a></div>
      </section>

      <section id="c3">
        <div class="section-header"><span class="step-num">STEP C3</span><h2>Slenderness and Effective Length</h2></div>
        <div class="formula">l<sub>e</sub> = &beta; &times; l<sub>clear</sub>   (effective length)
  &beta; factors for braced columns (Table 3.19):
    Both ends Condition 1 (fully fixed/rigid joints) &rarr; &beta; = 0.75
    One end Condition 1, other Condition 2 &rarr; &beta; = 0.80
    Both ends Condition 2 (semi-rigid/nominal joints) &rarr; &beta; = 0.85
    Both ends Condition 3 (pinned/simple joints) &rarr; &beta; = 1.00
  &beta; factors for unbraced columns (Table 3.20): range from 1.2 to 2.2+ (cantilever = 2.20)</div>
        <div class="formula">Slenderness ratio: l<sub>e</sub>/h (about the minor axis typically governs)
Short (braced):   l<sub>e</sub>/h &le; 15
Short (unbraced): l<sub>e</sub>/h &le; 10</div>
        <h4>Visualizing Column Effective Length (l<sub>e</sub> = &beta; &times; l<sub>clear</sub>)</h4>
        
        <div class="backtotop"><a href="#top">&uarr; back to top</a></div>
      </section>

      <section id="c4">
        <div class="section-header"><span class="step-num">STEP C4</span><h2>Design Moments</h2></div>
        <h3>Short Columns</h3>
        <p>Use the moments directly from the analysis (beam reactions &times; eccentricity, frame analysis, or minimum eccentricity &mdash; whichever is greater).</p>
        <h3>Slender Columns &mdash; Additional Moment <span class="cl">Cl. 3.8.3</span></h3>
        <div class="formula">M<sub>add</sub> = N &times; a<sub>u</sub>
a<sub>u</sub>  = &beta;<sub>a</sub> &times; K &times; h
  &beta;<sub>a</sub> = (1/2000) &times; (l<sub>e</sub>/h)&sup2;
  K = deflection reduction factor = (N<sub>uz</sub> - N) / (N<sub>uz</sub> - N<sub>bal</sub>) &le; 1.0
Design moment: M<sub>i</sub> = M<sub>2</sub> + M<sub>add</sub> (at mid-height critical point, braced slender columns)</div>
        <div class="backtotop"><a href="#top">&uarr; back to top</a></div>
      </section>

      <section id="c5">
        <div class="section-header"><span class="step-num">STEP C5</span><h2>Axial Load + Uniaxial Bending (Simplified &amp; Chart Methods)</h2></div>
        
        <h3>1 &mdash; Simplified Symmetrical Design (No charts needed) <span class="cl">Cl. 3.8.4.3 &amp; 3.8.4.4</span></h3>
        <p>In standard multi-storey building frames, columns are often braced and carry approximately symmetrical loads. BS 8110 (and Oyenuga's manual) provides two highly useful simplified hand equations to design these columns directly without interaction charts:</p>
        
        <div class="card"><p><strong>Case A: Symmetrical Beam Layout (Spans differ by &le;15%) <span class="cl">Cl. 3.8.4.3</span></strong><br>
        If the column supports beams of approximately equal spans, carrying uniform loads, design for axial load alone using:<br>
        <span style="font-family:var(--mono); font-size:13.5px; display:block; margin-top:8px;">N = 0.35f<sub>cu</sub>A<sub>c</sub> + 0.67f<sub>y</sub>A<sub>sc</sub></span></p></div>
        
        <div class="card"><p><strong>Case B: Nominal Eccentricity / Unequal Spans <span class="cl">Cl. 3.8.4.4</span></strong><br>
        If the column carries nominal moments (e.g. slight beam asymmetry or single floor reactions), use the reduced concrete factor to account for eccentricity:<br>
        <span style="font-family:var(--mono); font-size:13.5px; display:block; margin-top:8px;">N = 0.30f<sub>cu</sub>A<sub>c</sub> + 0.67f<sub>y</sub>A<sub>sc</sub></span></p></div>
        
        <p>Where:<br>
        &bull; <strong>A<sub>c</sub>:</strong> net concrete area = A<sub>g</sub> - A<sub>sc</sub> (mm&sup2;)<br>
        &bull; <strong>A<sub>sc</sub>:</strong> total area of longitudinal steel (mm&sup2;)<br>
        &bull; <strong>N:</strong> design ultimate axial load (N)</p>
        
        <h3>2 &mdash; General Bending / Chart Method</h3>
        <p>If the column is subjected to significant bending moments (Case A/B limits exceeded), design for combined axial load and uniaxial bending using the design charts. Enter the chart (Part 3c, Fig 3.12&ndash;3.21) with:</p>
        <div class="formula">N / (bh&middot;f<sub>cu</sub>)   (normalised axial load)
M / (bh&sup2;&middot;f<sub>cu</sub>)  (normalised moment)
&rarr; read off  100A<sub>sc</sub> / (bh)  (required steel percentage)</div>
        <div class="card"><p><strong>Minimum steel:</strong> 0.4% of gross section <span class="cl">Table 3.25</span>. <strong>Maximum steel:</strong> 6% of gross section for vertically cast columns, 8% for horizontally cast columns (or 10% at laps in both cases), per <span class="cl">Cl. 3.12.6.2</span>.</p></div>
        <div class="backtotop"><a href="#top">&uarr; back to top</a></div>
      </section>

      <section id="c6">
        <div class="section-header"><span class="step-num">STEP C6</span><h2>Biaxial Bending</h2></div>
        <p>Where moments exist in both axes simultaneously, use the BS 8110 equivalent uniaxial moment approach <span class="cl">Cl. 3.8.4.5</span>:</p>
        <div class="formula">If M<sub>x</sub>/h' &ge; M<sub>y</sub>/b':
  Design for M<sub>x</sub>' = M<sub>x</sub> + &beta;(h'/b')M<sub>y</sub>  (about x-x axis only)
If M<sub>x</sub>/h' &lt; M<sub>y</sub>/b':
  Design for M<sub>y</sub>' = M<sub>y</sub> + &beta;(b'/h')M<sub>x</sub>  (about y-y axis only)

&beta; from Table 3.22 &mdash; function of N/(bhf<sub>cu</sub>), ranges 1.00 down to 0.30
h' and b' = effective depth to the compression reinforcement in each direction</div>
        <div class="backtotop"><a href="#top">&uarr; back to top</a></div>
      </section>

      <section id="c7">
        <div class="section-header"><span class="step-num">STEP C7</span><h2>Shear in Columns</h2></div>
        <p>Columns rarely require shear reinforcement for gravity loads alone &mdash; shear usually governs only in unbraced/sway frames under wind or seismic loading. Check using the same method as beams (Step B7).</p>
        <div class="formula">v = H / (b<sub>v</sub>d) &mdash; where H is the storey shear at that level
Compare against v<sub>c</sub> from Table 3.8 (enhanced by axial compression)</div>
        <div class="backtotop"><a href="#top">&uarr; back to top</a></div>
      </section>

      <section id="c8">
        <div class="section-header"><span class="step-num">STEP C8</span><h2>Using the Design Charts</h2></div>
        <p>BS 8110 Part 3 provides interaction charts for rectangular and circular sections with symmetric reinforcement. To use them:</p>
        <div class="flow">
          <div class="flow-item"><strong>Step 1</strong>Calculate N/(bh&middot;f<sub>cu</sub>) and M/(bh&sup2;&middot;f<sub>cu</sub>)</div>
          <div class="flow-item"><strong>Step 2</strong>Select the chart matching d'/h (ratio of cover to compression steel, to total depth)</div>
          <div class="flow-item"><strong>Step 3</strong>Plot the point (N-axis, M-axis) on the chart</div>
          <div class="flow-item"><strong>Step 4</strong>Read across to the nearest steel-percentage curve &mdash; round up to a practical bar arrangement</div>
          <div class="flow-item"><strong>Step 5</strong>Verify that the chosen bar arrangement satisfies the minimum and maximum steel limits, and check link requirements</div>
        </div>
        <div class="card blue"><p>If the point plots below the lowest curve (0.4%), minimum steel governs. If it plots outside the chart boundary, the section is too small &mdash; increase b or h and repeat.</p></div>
        <div class="backtotop"><a href="#top">&uarr; back to top</a></div>
      </section>

      <section id="c9">
        <div class="section-header"><span class="step-num">STEP C9</span><h2>Detailing &mdash; Columns</h2></div>
        <ul class="check">
          <li>Minimum 4 bars (rectangular sections), 6 bars (circular) &mdash; one bar per corner minimum. <span class="cl">Cl. 3.12.5.3</span></li>
          <li>Main bar diameter &ge; 12mm; link diameter &ge; 6mm or &frac14; &times; main bar diameter (whichever is greater). <span class="cl">Cl. 3.12.7.1</span></li>
          <li>Link spacing &le; 12 &times; smallest compression bar diameter, &le; the lesser column dimension, and &le; 300mm. <span class="cl">Cl. 3.12.7.1</span></li>
          <li>At laps: reduce link spacing to &le; 0.6 &times; normal spacing, with min. 3 sets of links in the lap zone. <span class="cl">Cl. 3.12.8.13</span></li>
          <li>Where column dimensions change, provide adequate lapping and starter-bar length to maintain load path continuity.</li>
          <li>At beam-column junctions: provide horizontal links (confinement) within the joint zone per Cl. 3.12.8.1.</li>
          <li>Kicker: provide a concrete kicker &ge; 75mm above the slab/foundation &mdash; steel starter bars must extend adequately past the kicker for the column above.</li>
        </ul>
        <div class="backtotop"><a href="#top">&uarr; back to top</a></div>
      </section>

    </div>

    <!-- ===================== PART 4 ===================== -->
    <div class="part-bar p4">
      <div class="part-bar-inner"><span class="part-label">Part 4</span><h2>Whole-Building Guidance &amp; Quick Reference</h2></div>
    </div>

    <div class="content-wrap">

      <section id="building">
        <div class="section-header"><span class="step-num">STEP W1</span><h2>Guidelines for Designing a Full Structure</h2></div>

        <div class="building-card">
          <h3>Phase 1 &mdash; Establish the Structural System</h3>
          <ul>
            <li>Choose the structural form: beam-and-slab, flat slab, or combination.</li>
            <li>Identify bracing: shear walls, cores, or moment frames for lateral stability.</li>
            <li>Establish grid: typical bay sizes 5&ndash;9m for beams, 4&ndash;7m for flat slabs.</li>
            <li>Choose materials: f<sub>cu</sub>, f<sub>y</sub>, cover class <span class="cl">(Table 3.3/3.4)</span>.</li>
          </ul>
        </div>

        <div class="building-card">
          <h3>Phase 2 &mdash; Load Take-Down Floor by Floor</h3>
          <ul>
            <li>Start at the roof: compute G<sub>k</sub> and Q<sub>k</sub> per m&sup2;, determine n.</li>
            <li>Design the roof slab (Part 1) &rarr; get slab reactions.</li>
            <li>Transfer slab reactions onto roof-level beams (Part 2).</li>
            <li>Beam reactions &rarr; column at roof level (Part 3, first floor contribution).</li>
            <li>Repeat for every floor, accumulating column loads downward.</li>
            <li>Apply BS 6399-1 live-load reduction to column loads at lower levels.</li>
          </ul>
        </div>

        <div class="building-card">
          <h3>Phase 3 &mdash; Member Design Order</h3>
          <ul>
            <li>Slabs (all floors, roof first) &rarr; check deflection, detail bars.</li>
            <li>Secondary beams &rarr; primary beams (bottom to top of the load path within each floor).</li>
            <li>Columns: start from top floor and work down, accumulating N.</li>
            <li>Foundations: design last when all column loads at base are known.</li>
            <li>Shear walls / cores: design for wind + gravity, check overturning and sliding.</li>
          </ul>
        </div>

        <div class="building-card">
          <h3>Phase 4 &mdash; Robustness and Tying</h3>
          <ul>
            <li>Provide horizontal ties (peripheral and internal) per <span class="cl">Cl. 3.12.3</span>.</li>
            <li>Provide vertical ties in columns/walls per <span class="cl">Cl. 3.12.3.5</span>.</li>
            <li>Ensure flat slabs have integrity steel through column heads.</li>
            <li>Check that the structure can survive notional removal of any one element without disproportionate collapse.</li>
          </ul>
        </div>

        <div class="card blue"><p><strong>Sanity check at every level:</strong> sum all column loads at that floor level &mdash; it should equal the total factored gravity load on all slabs above (minus the small self-weight of columns themselves). If there's a large discrepancy, trace back to find double-counting or missed load paths.</p></div>
        <div class="backtotop"><a href="#top">&uarr; back to top</a></div>
      </section>

      <section id="worked-example">
        <div class="section-header"><span class="step-num">STEP W2</span><h2>Worked Example &mdash; 1-Storey (G+1) Building Design</h2></div>
        <p>This worked example demonstrates the complete structural load-tracking and member sizing process for a single storey (Ground + 1) residential frame structure according to BS 8110-1:1997. We follow the load path down from the First Floor slab, through the perimeter beams, down the columns, and into the foundation footing.</p>

        <h3>1 &mdash; Structural Framing Layout Plan</h3>
        <p>The framing layout consists of a standard grid bay measuring 4.0m &times; 5.0m. Column lines are placed at grid intersections, with edge beams framing the perimeter and supporting the two-way concrete floor slab.</p>

        

        <h3>2 &mdash; Slab Panel S1 Design (Two-Way Restrained)</h3>
        <p>We design Slab Panel S1 (\\(L_x = 4.0\\)m, \\(L_y = 5.0\\)m) as a two-way restrained panel since it is cast monolithically with supporting beams on all four sides, and \\(L_y / L_x = 5.0 / 4.0 = 1.25 \\le 2.0\\).</p>
        
        <ul class="check">
          <li><strong>Trial Thickness (h):</strong> Choose \\(150\\)mm (\\(L_x / 26 = 4000/26 = 153\\)mm, so \\(150\\)mm is close and typical).</li>
          <li><strong>Effective Depth (d):</strong> \\(d = 150 - 20\\text{mm cover} - 5\\text{mm (half of 10mm bar)} = 125\\)mm.</li>
          <li><strong>Concrete Strength:</strong> \\(f_{cu} = 25\\) N/mm&sup2;, <strong>Steel Strength:</strong> \\(f_y = 460\\) N/mm&sup2;.</li>
        </ul>

        <h4>Load Take-Down (ULS per m&sup2;)</h4>
        <div class="table-wrap"><table>
          <tr><th>Load Source</th><th>Calculation</th><th>Characteristic Load</th></tr>
          <tr><td>Slab Self-Weight</td><td>\\(24\\text{ kN/m}^3 \\times 0.15\\text{m}\\)</td><td>3.6 kN/m&sup2; (G<sub>k</sub>)</td></tr>
          <tr><td>Screed &amp; Finishes</td><td>Nominal allowance</td><td>1.2 kN/m&sup2; (G<sub>k</sub>)</td></tr>
          <tr><td>Ceiling &amp; Services</td><td>Nominal allowance</td><td>0.3 kN/m&sup2; (G<sub>k</sub>)</td></tr>
          <tr><td>Partition Allowance</td><td>UDL per code</td><td>1.0 kN/m&sup2; (G<sub>k</sub>)</td></tr>
          <tr><td><strong>Total Dead Load (G<sub>k</sub>)</strong></td><td>\\(\\sum\\) above</td><td><strong>6.1 kN/m&sup2;</strong></td></tr>
          <tr><td><strong>Imposed Live Load (Q<sub>k</sub>)</strong></td><td>Residential occupancy</td><td><strong>1.5 kN/m&sup2;</strong></td></tr>
        </table></div>
        
        <div class="formula">Design load (ULS): n = 1.4G<sub>k</sub> + 1.6Q<sub>k</sub> = 1.4(6.1) + 1.6(1.5) = 10.94 kN/m&sup2;</div>

        <h4>Bending Moments &amp; Flexural Steel</h4>
        <p>Using Table 3.14 coefficients for a typical interior panel (\\(L_y/L_x = 1.25\\)):</p>
        <ul>
          <li>Short-span mid-span moment coefficient \\(\\beta_{sx} = 0.038 \\implies M_{sx} = \\beta_{sx} n L_x^2 = 0.038 \\times 10.94 \\times 4.0^2 = 6.65\\) kNm/m.</li>
          <li>Short-span support (hogging) moment coefficient \\(\\beta_{hx} = 0.050 \\implies M_{hx} = \\beta_{hx} n L_x^2 = 0.050 \\times 10.94 \\times 4.0^2 = 8.75\\) kNm/m.</li>
        </ul>
        <p>For the critical support moment \\(M_{hx} = 8.75\\) kNm/m:</p>
        <div class="formula">K = M / (bd&sup2;f<sub>cu</sub>) = 8.75 &times; 10⁶ / (1000 &times; 125&sup2; &times; 25) = 0.0224 &le; 0.156 (Singly reinforced)
z = d[0.5 + &radic;(0.25 - K/0.9)] = 0.97d &rarr; Cap at 0.95d = 118.75mm
A<sub>s</sub> = M / (0.95f<sub>y</sub>z) = 8.75 &times; 10⁶ / (0.95 &times; 460 &times; 118.75) = 168.5 mm&sup2;/m</div>
        <p>Check minimum area of steel: \\(0.13\\% \\times b \\times h = 0.0013 \\times 1000 \\times 150 = 195\\) mm&sup2;/m. Min steel governs. Provide **Y10 @ 250mm spacing** (\\(314\\) mm&sup2;/m) to comfortably satisfy minimum steel and control cracking.</p>

        <h3>3 &mdash; Beam B1 Design (Long Edge Beam, L = 5.0m)</h3>
        <p>Edge Beam B1 carries its own self-weight, the weight of the masonry block wall above, and the load transferred from the floor slab. The slab load distributes as a trapezoidal load along the long edge.</p>

        <ul class="check">
          <li><strong>Dimensions:</strong> \\(225\\)mm web width (\\(b_w\\)), \\(450\\)mm overall depth (\\(h\\)).</li>
          <li><strong>Effective depth (d):</strong> \\(d = 450 - 25\\text{ cover} - 10\\text{ link} - 10\\text{ (half of 20mm bar)} = 405\\)mm.</li>
        </ul>

        <h4>Load Take-Down (ULS per m run)</h4>
        <p>Tributary load from Slab Panel S1 is converted to an equivalent UDL for bending moment calculation:</p>
        <div class="formula">Equivalent UDL fraction: [1 - (1/3)(L_x/L_y)&sup2;] = [1 - (1/3)(4/5)&sup2;] = 0.787
Slab dead UDL = G<sub>k</sub> * (L_x/2) * 0.787 = 6.1 * 2.0 * 0.787 = 9.60 kN/m
Slab live UDL = Q<sub>k</sub> * (L_x/2) * 0.787 = 1.5 * 2.0 * 0.787 = 2.36 kN/m</div>

        <div class="table-wrap"><table>
          <tr><th>Load Source</th><th>ULS Factored Calculation</th><th>ULS Factored load</th></tr>
          <tr><td>Beam Self-Weight</td><td>\\(1.4 \\times (24\\text{ kN/m}^3 \\times 0.225\\text{m} \\times 0.45\\text{m})\\)</td><td>3.40 kN/m (Dead)</td></tr>
          <tr><td>Sandcrete Block Wall</td><td>\\(1.4 \\times (18\\text{ kN/m}^3 \\times 0.225\\text{m} \\times 2.7\\text{m wall height})\\)</td><td>15.31 kN/m (Dead)</td></tr>
          <tr><td>Slab Dead Portion</td><td>\\(1.4 \\times 9.60\\text{ kN/m}\\)</td><td>13.44 kN/m (Dead)</td></tr>
          <tr><td>Slab Live Portion</td><td>\\(1.6 \\times 2.36\\text{ kN/m}\\)</td><td>3.78 kN/m (Live)</td></tr>
          <tr><td><strong>Total Factored load (w<sub>u</sub>)</strong></td><td>\\(\\sum\\) above</td><td><strong>35.93 kN/m</strong></td></tr>
        </table></div>

        <h4>Bending Moment, Shear &amp; Reinforcement</h4>
        <div class="formula">Design ultimate moment: M<sub>max</sub> = w<sub>u</sub> L&sup2; / 8 = 35.93 &times; 5.0&sup2; / 8 = 112.28 kNm
Design ultimate shear: V<sub>max</sub> = w<sub>u</sub> L / 2 = 35.93 &times; 5.0 / 2 = 89.83 kN</div>
        <p>Designing tension reinforcement:</p>
        <div class="formula">K = M / (bd&sup2;f<sub>cu</sub>) = 112.28 &times; 10⁶ / (225 &times; 405&sup2; &times; 25) = 0.121 &le; 0.156 (Singly reinforced)
z = d[0.5 + &radic;(0.25 - K/0.9)] = 0.84d = 340.2mm
A<sub>s</sub> = M / (0.95f<sub>y</sub>z) = 112.28 &times; 10⁶ / (0.95 &times; 460 &times; 340.2) = 755.7 mm&sup2;</div>
        <p>Provide **3Y20 bottom bars** (\\(A_{s,prov} = 942\\) mm&sup2;) to carry the midspan tension.</p>

        <h4>Shear Links</h4>
        <div class="formula">Shear stress: v = V / (b<sub>w</sub> d) = 89.83 &times; 10&sup3; / (225 &times; 405) = 0.98 N/mm&sup2; &le; 0.8&radic;f<sub>cu</sub> = 4.0 N/mm&sup2;
100As/(b_w d) = 100 * 942 / (225 * 405) = 1.03
Concrete capacity (Table 3.8): v<sub>c</sub> = 0.63 N/mm&sup2; (Since 0.5v<sub>c</sub> &le; v &lt; v<sub>c</sub>+0.4, minimum links govern)
Link ratio: A<sub>sv</sub>/s<sub>v</sub> = 0.4b<sub>w</sub> / (0.95f<sub>yv</sub>) = 0.4 * 225 / (0.95 * 250) = 0.379 mm&sup2;/mm</div>
        <p>Using 2-legged \\(\\phi 8\\) links (\\(A_{sv} = 100.6\\) mm&sup2;), the maximum spacing \\(s_v = 100.6 / 0.379 = 265\\) mm. Spacing limit \\(\\le 0.75d = 303\\) mm. Provide **Y8 shear links @ 250mm spacing**.</p>

        <h3>4 &mdash; Column C1 Design (Ground Floor Corner Column)</h3>
        <p>Column C1 accumulates loads from both the Roof Level and the First Floor Level.</p>

        <ul class="check">
          <li><strong>Dimensions:</strong> \\(225\\)mm &times; \\(225\\)mm square column (\\(A_g = 50625\\) mm&sup2;).</li>
          <li><strong>Height:</strong> Braced clear height \\(l_{clear} = 2.7\\)m. Effective length \\(l_e = 0.75 \\times 2.7 = 2.025\\)m (\\(l_e/h = 2025/225 = 9.0 \\le 15\\), column is **braced short**).</li>
        </ul>

        <h4>Load Accumulation (ULS axial force at base)</h4>
        <ul>
          <li><strong>Roof Slab Load:</strong> Factored roof load (4.5 dead + 1.5 live) \\(= 1.4(4.5)+1.6(1.5) = 8.7\\) kN/m&sup2;. Tributary area \\(= 2.0\\text{m} \\times 2.5\\text{m} = 5.0\\) m&sup2; \\(\\implies N_{roof} = 8.7 \\times 5.0 = 43.5\\) kN.</li>
          <li><strong>First Floor Slab Load:</strong> Factored slab load \\(= 10.94\\) kN/m&sup2; &times; \\(5.0\\) m&sup2; tributary area \\(\\implies N_{floor} = 54.7\\) kN.</li>
          <li><strong>Perimeter Wall Load:</strong> Cumulative wall load \\(= 1.4 \\times (18\\text{ kN/m}^3 \\times 0.225\\text{m} \\times 2.7\\text{m}) \\times 4.5\\text{m perimeter length} \\times 2\\text{ storeys} = 137.8\\) kN.</li>
          <li><strong>Beam Self-Weights:</strong> Cumulative beam UDLs \\(= 1.4 \\times 2.43\\text{ kN/m} \\times 4.5\\text{m length} \\times 2\\text{ storeys} = 30.6\\) kN.</li>
          <li><strong>Column Self-Weight:</strong> \\(1.4 \\times (24\\text{ kN/m}^3 \\times 0.225\\text{m} \\times 0.225\\text{m} \\times 3.0\\text{m height} \\times 2\\text{ storeys}) = 10.2\\) kN.</li>
        </ul>
        <div class="formula">Total accumulated ULS axial force: N<sub>u</sub> = 43.5 + 54.7 + 137.8 + 30.6 + 10.2 = 276.8 kN</div>

        <h4>Sizing and Longitudinal Reinforcement</h4>
        <p>Because Column C1 is a braced short column carrying beams with approximately equal spans, we design it using the simplified axial design equation without interaction charts:</p>
        <div class="formula">N = 0.35 f<sub>cu</sub> A<sub>c</sub> + 0.67 f<sub>y</sub> A<sub>sc</sub>
276.8 &times; 10&sup3; = 0.35 &times; 25 &times; (50625 - A<sub>sc</sub>) + 0.67 &times; 460 &times; A<sub>sc</sub>
276.8 &times; 10&sup3; = 442969 - 8.75 A<sub>sc</sub> + 308.2 A<sub>sc</sub>
-166169 = 299.45 A<sub>sc</sub> &rarr; A<sub>sc</sub> is negative (Concrete alone carries the load!)</div>
        <p>Since concrete alone can carry the axial load, minimum steel reinforcement governs:</p>
        <div class="formula">A<sub>sc,min</sub> = 0.4% &times; A<sub>g</sub> = 0.004 &times; 50625 = 202.5 mm&sup2;</div>
        <p>Provide **4Y12 longitudinal bars** (\\(A_{sc,prov} = 452\\) mm&sup2;), placing one bar in each corner. For column links, spacing \\(s_v \\le 12 \\times \\phi_{main} = 144\\)mm, cap at 300mm. Provide **Y6 links @ 125mm spacing**.</p>

        <h3>5 &mdash; Foundation Pad Footing F1 Design</h3>
        <p>Sizing the square concrete foundation pad directly below Column C1:</p>
        
        <ul class="check">
          <li><strong>Soil Bearing Capacity:</strong> \\(q_{allow} = 150\\) kN/m&sup2; (Working capacity).</li>
          <li><strong>Service Load at Base:</strong> \\(N_{service} \\approx N_u / 1.45 = 276.8 / 1.45 = 190.9\\) kN. Add \\(10\\%\\) for footing self-weight allowance \\(\\approx 210\\) kN.</li>
        </ul>

        <h4>Footing Sizing &amp; Base Area</h4>
        <div class="formula">Footing Area (A) = N<sub>service</sub> / q<sub>allow</sub> = 210 / 150 = 1.4 m&sup2;
For a square footing, width B = &radic;1.4 &asymp; 1.18m &rarr; Specify a 1.2m &times; 1.2m base (Area = 1.44 m&sup2;)</div>
        <p>Specify a footing thickness of **350mm** with bottom mesh reinforcement Y10 @ 200mm spacing in both directions to safely resist bending and local punching shear.</p>
        
        <div class="backtotop"><a href="#top">&uarr; back to top</a></div>
      </section>

      <section id="quickref">
        <div class="section-header"><span class="step-num">STEP W3</span><h2>Combined Quick Reference</h2></div>
        <p><strong>Note on Partial Safety Factors (&gamma;<sub>m</sub>):</strong> BS 8110-1:1997 Amendment 3 changed the reinforcement partial safety factor from 1.15 to 1.05. Consequently, steel area calculations moved from using 0.87f<sub>y</sub> (i.e., f<sub>y</sub>/1.15) to 0.95f<sub>y</sub> (i.e., f<sub>y</sub>/1.05). Ensure calculations match the version of the code applied.</p>
 
        <h3>Loads</h3>
        <div class="table-wrap"><table>
          <tr><th>Symbol</th><th>Definition</th><th>Typical Range</th></tr>
          <tr><td>G<sub>k</sub></td><td>Characteristic dead load</td><td>&mdash;</td></tr>
          <tr><td>Q<sub>k</sub></td><td>Characteristic imposed load</td><td>1.5&ndash;5.0 kN/m&sup2; (floors)</td></tr>
          <tr><td>n</td><td>Ultimate UDL = 1.4G<sub>k</sub>+1.6Q<sub>k</sub></td><td>&mdash;</td></tr>
          <tr><td>&gamma;<sub>c</sub></td><td>Unit weight of reinforced concrete</td><td>24 kN/m&sup3;</td></tr>
        </table></div>
 
        <h3>Flexure</h3>
        <div class="table-wrap"><table>
          <tr><th>Step</th><th>Formula</th><th>Note</th></tr>
          <tr><td>K factor</td><td>M/(bd&sup2;f<sub>cu</sub>)</td><td>&le; 0.156 singly reinforced</td></tr>
          <tr><td>Lever arm z</td><td>d[0.5+&radic;(0.25&minus;K/0.9)]</td><td>&le; 0.95d</td></tr>
          <tr><td>Steel area</td><td>M/(0.95f<sub>y</sub>z)</td><td>Check min/max (0.87 for pre-amendment)</td></tr>
        </table></div>
 
        <h3>Shear</h3>
        <div class="table-wrap"><table>
          <tr><th>Step</th><th>Formula</th><th>Note</th></tr>
          <tr><td>Applied shear stress</td><td>v = V/(b<sub>v</sub>d)</td><td>&le; 0.8&radic;f<sub>cu</sub> or 5N/mm&sup2;</td></tr>
          <tr><td>Concrete capacity</td><td>v<sub>c</sub> from Table 3.8</td><td>Depends on steel %</td></tr>
          <tr><td>Link ratio needed</td><td>A<sub>sv</sub>/s<sub>v</sub> = b<sub>v</sub>(v&minus;v<sub>c</sub>)/(0.95f<sub>yv</sub>)</td><td>If v &ge; v<sub>c</sub>+0.4 (0.87 for pre-amendment)</td></tr>
          <tr><td>Max link spacing</td><td>0.75d</td><td>&mdash;</td></tr>
        </table></div>
 
        <h3>Deflection (span/d method)</h3>
        <div class="table-wrap"><table>
          <tr><th>Support Condition</th><th>Basic span/d</th><th>Multiplied by&hellip;</th></tr>
          <tr><td>Cantilever</td><td>7</td><td rowspan="3" style="vertical-align:middle">Modification factors from Tables 3.10 &amp; 3.11</td></tr>
          <tr><td>Simply supported</td><td>20</td></tr>
          <tr><td>Continuous</td><td>26</td></tr>
        </table></div>
 
        <h3>Columns (Key limits)</h3>
        <div class="table-wrap"><table>
          <tr><th>Item</th><th>Limit</th></tr>
          <tr><td>Short/slender boundary (braced)</td><td>l<sub>e</sub>/h = 15 <em>and</em> l<sub>e</sub>/b = 15</td></tr>
          <tr><td>Min eccentricity</td><td>0.05h or 20mm (lesser)</td></tr>
          <tr><td>Min steel</td><td>0.4% of gross section</td></tr>
          <tr><td>Max steel</td><td>6% (8% if horizontally cast, 10% at laps)</td></tr>
          <tr><td>Max link spacing</td><td>12&phi;<sub>smallest compression bar</sub> or lesser column dim., &le;300mm</td></tr>
        </table></div>
        <div class="backtotop"><a href="#top">&uarr; back to top</a></div>
      </section>
 
      <section id="glossary">
        <div class="section-header"><span class="step-num">STEP W4</span><h2>Glossary of Symbols</h2></div>
        <dl class="glossary">
          <dt>A<sub>s</sub></dt><dd>Area of tension reinforcement (mm&sup2;)</dd>
          <dt>A<sub>s</sub>'</dt><dd>Area of compression reinforcement (mm&sup2;)</dd>
          <dt>A<sub>sc</sub></dt><dd>Total area of steel in a column (mm&sup2;)</dd>
          <dt>A<sub>sv</sub></dt><dd>Area of shear link legs in a cross-section (mm&sup2;)</dd>
          <dt>b</dt><dd>Width of section (mm); for slabs b = 1000mm per metre strip</dd>
          <dt>b<sub>v</sub></dt><dd>Breadth of section for shear &mdash; same as b except for flanged beams</dd>
          <dt>b<sub>w</sub></dt><dd>Web width of flanged beam (mm)</dd>
          <dt>d</dt><dd>Effective depth to centroid of tension steel (mm)</dd>
          <dt>d'</dt><dd>Effective depth to centroid of compression steel (mm)</dd>
          <dt>f<sub>cu</sub></dt><dd>Characteristic cube compressive strength of concrete (N/mm&sup2;)</dd>
          <dt>f<sub>y</sub></dt><dd>Characteristic yield strength of main steel (N/mm&sup2;) &mdash; typically 460</dd>
          <dt>f<sub>yv</sub></dt><dd>Characteristic yield strength of link steel (N/mm&sup2;)</dd>
          <dt>G<sub>k</sub></dt><dd>Characteristic dead load (kN or kN/m or kN/m&sup2;)</dd>
          <dt>h</dt><dd>Overall depth of section (mm)</dd>
          <dt>K</dt><dd>Non-dimensional moment factor = M/(bd&sup2;f<sub>cu</sub>)</dd>
          <dt>K'</dt><dd>Maximum K for singly reinforced section = 0.156 (no redistribution)</dd>
          <dt>l</dt><dd>Span length (m or mm &mdash; be consistent)</dd>
          <dt>l<sub>e</sub></dt><dd>Effective length of a column (mm)</dd>
          <dt>l<sub>x</sub></dt><dd>Short span of a two-way slab panel (m)</dd>
          <dt>l<sub>y</sub></dt><dd>Long span of a two-way slab panel (m)</dd>
          <dt>M</dt><dd>Design bending moment (kNm)</dd>
          <dt>M<sub>add</sub></dt><dd>Additional moment due to column slenderness (kNm)</dd>
          <dt>n</dt><dd>Ultimate design load per unit area on slab = 1.4G<sub>k</sub>+1.6Q<sub>k</sub> (kN/m&sup2;)</dd>
          <dt>N</dt><dd>Design axial force in a column (kN)</dd>
          <dt>Q<sub>k</sub></dt><dd>Characteristic imposed (live) load (kN or kN/m or kN/m&sup2;)</dd>
          <dt>s<sub>v</sub></dt><dd>Spacing of links/stirrups along the member axis (mm)</dd>
          <dt>v</dt><dd>Applied shear stress = V/(b<sub>v</sub>d) (N/mm&sup2;)</dd>
          <dt>v<sub>c</sub></dt><dd>Design concrete shear capacity (N/mm&sup2;), from Table 3.8</dd>
          <dt>V</dt><dd>Design shear force (kN)</dd>
          <dt>w<sub>u</sub></dt><dd>Ultimate UDL on a beam = 1.4G<sub>k</sub>+1.6Q<sub>k</sub> (kN/m)</dd>
          <dt>x</dt><dd>Neutral axis depth (mm)</dd>
          <dt>z</dt><dd>Lever arm between tension and compression forces (mm)</dd>
          <dt>&gamma;<sub>m</sub></dt><dd>Partial safety factor for material</dd>
          <dt>&phi;</dt><dd>Bar diameter (mm)</dd>
        </dl>
        <div class="backtotop"><a href="#top">&uarr; back to top</a></div>
      </section>

    </div>

    <footer>
      BS 8110-1:1997 &middot; Manual Design Guide &middot; For educational reference only &middot; Always verify against the current standard
    </footer>

  </div><!-- /main-content -->
</div><!-- /app-layout -->


<a href="journal.html" class="floating-faq-btn" aria-label="Open FAQ Journal">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: -1px;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
  FAQ Journal
</a>

      ` }} />

      {/* Floating Ask Question Button (Left) */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="floating-faq-btn-left"
        aria-label="Ask a question"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style={{ marginTop: "-1px" }}><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
        Ask Question
      </button>

      {/* Modal Overlay & Card */}
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
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            color: '#0f0f0f',
            fontFamily: 'Inter, sans-serif'
          }}>
            
            {/* ── STEP 1: Input Form ── */}
            {feedbackType === null ? (
              <>
                <h3 style={{ fontFamily: 'Lora, serif', fontSize: '20px', fontWeight: '400', marginBottom: '8px' }}>Ask a Question</h3>
                <p style={{ fontSize: '13px', color: '#6b6b6b', marginBottom: '20px', lineHeight: '1.5' }}>
                  Have a point of structural confusion? Ask here. We will check our notes and send a reply directly to your inbox.
                </p>

                <form onSubmit={handleFormSubmit}>
                  {/* Honeypot field */}
                  <div style={{ display: 'none' }}>
                    <label htmlFor="website-home">Leave blank</label>
                    <input type="text" id="website-home" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600 }}>Your Email</label>
                      <input
                        type="email"
                        required
                        placeholder="email@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #e0e0e0', borderRadius: 'var(--radius)', fontSize: '13.5px', outline: 'none', background: '#ffffff' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600 }}>Describe your question</label>
                      <textarea
                        required
                        rows={4}
                        placeholder="What are you confused about in the design? Be specific..."
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #e0e0e0', borderRadius: 'var(--radius)', fontSize: '13.5px', outline: 'none', resize: 'vertical', background: '#ffffff' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button type="button" onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: '1px solid #e0e0e0', cursor: 'pointer', padding: '8px 16px', borderRadius: 'var(--radius)', fontFamily: 'monospace', fontSize: '11px', textTransform: 'uppercase' }}>Cancel</button>
                    <button
                      type="submit"
                      disabled={submitLoading}
                      style={{
                        background: '#0f0f0f',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 'var(--radius)',
                        padding: '8px 20px',
                        fontFamily: 'monospace',
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
              /* ── STEP 2: Intelligent Feedback ── */
              <div style={{ textAlign: 'left' }}>
                <h3 style={{ fontFamily: 'Lora, serif', fontSize: '20px', fontWeight: '400', marginBottom: '14px', color: '#0f0f0f' }}>Inquiry Submitted</h3>
                
                {feedbackType === 'strong' && suggestedArticle && (
                  <div style={{ borderLeft: '3px solid #2f5d8a', background: '#eef3f7', padding: '16px', borderRadius: '0 var(--radius) var(--radius) 0', marginBottom: '24px' }}>
                    <p style={{ fontSize: '14px', color: '#0f0f0f', marginBottom: '12px', fontWeight: 600 }}>
                      💡 We found an answer to your question in our notes!
                    </p>
                    <p style={{ fontSize: '13.5px', color: '#2d2d2d', marginBottom: '14px' }}>
                      You can read the full article immediately:
                    </p>
                    <Link
                      href={`/community-notes/${suggestedArticle.slug.current || suggestedArticle.slug}`}
                      style={{
                        fontSize: '14px',
                        color: '#2f5d8a',
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
                  <div style={{ borderLeft: '3px solid #2f5d8a', background: '#eef3f7', padding: '16px', borderRadius: '0 var(--radius) var(--radius) 0', marginBottom: '24px' }}>
                    <p style={{ fontSize: '14px', color: '#0f0f0f', marginBottom: '8px', fontWeight: 600 }}>
                      💡 Here is a note similar to your query:
                    </p>
                    <Link
                      href={`/community-notes/${suggestedArticle.slug.current || suggestedArticle.slug}`}
                      style={{
                        fontSize: '13.5px',
                        color: '#2f5d8a',
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
                  <div style={{ borderLeft: '3px solid #6b6b6b', background: '#f7f7f5', padding: '16px', borderRadius: '0 var(--radius) var(--radius) 0', marginBottom: '24px' }}>
                    <p style={{ fontSize: '13.5px', color: '#2d2d2d', margin: 0 }}>
                      Thank you! We've successfully received your question. Our engineering team will review it and reply to your email shortly.
                    </p>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={closeFeedbackModal}
                    style={{
                      background: '#0f0f0f',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 'var(--radius)',
                      padding: '8px 20px',
                      fontFamily: 'monospace',
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
    </>
  );
}

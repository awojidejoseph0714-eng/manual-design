'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { sanityClient, urlFor } from '@/lib/sanity';

interface Article {
  title: string;
  date: string;
  tags: string[];
  answer: string;
  image?: {
    asset?: {
      _ref?: string;
    };
  };
}

const defaultFAQs: Record<string, Article> = {
  "wall-load-on-slab": {
    title: "If a wall sits directly on a slab (not on a beam), how does the slab 'see' that load?",
    date: "July 22, 2026",
    tags: ["Slabs", "Loading"],
    answer: `<p>When a partition wall is placed directly on a concrete floor slab rather than resting on a structural support beam, the slab experiences a highly localized load concentration. Structurally, we must evaluate this differently depending on the wall's material weight and physical orientation:</p>
             <h3>1. Light vs. Heavy Partition Walls</h3>
             <p>If the wall is a lightweight demountable partition (such as timber studding, gypsum drywall, or hollow metal framing), BS 8110-1:1997 and BS 6399-1 allow for a simplified load smearing approach. A minimum uniform dead load (UDL) allowance of <strong>1.0 kN/m²</strong> is added globally to the floor panel design. This is a common design office shortcut that covers arbitrary partition layouts.</p>
             <p>However, if the partition is a heavy masonry wall (e.g., 9-inch or 6-inch hollow sandcrete blocks, common in loadbearing and panel walls), it is incorrect to smear the load. A typical sandcrete block wall can weigh between 3.0 kN/m and 5.0 kN per linear meter of wall height. This must be treated as a concentrated <strong>line load</strong>.</p>
             <h3>2. Structural Load Dispersion &amp; Bending Moments</h3>
             <p>In one-way slab systems, if a heavy wall runs parallel to the span direction, it does not distribute its load across the entire slab width. Instead, we assume the load is carried by a localized <strong>tributary strip width (b_w)</strong>. BS 8110 assumes a load dispersion angle of 45° through the thickness of the slab. Thus, the effective width of slab carrying the line load is calculated as:</p>
             <div class="formula">b_eff = w_wall + 2 &times; h_slab</div>
             <p>Where <em>w_wall</em> is the width of the wall base and <em>h_slab</em> is the slab depth. All design moments in this strip must be calculated using line-load formulas. For two-way slabs, line loads are best designed using Yield Line theory (Hillerborg's strip method) or by mapping the wall load directly as a line force in a finite element slab design, checking the reinforcement locally to prevent cracking along the wall track.</p>`
  },
  "punching-shear-necessity": {
    title: "Do you always need to check a slab for punching shear, or only flat slabs?",
    date: "July 22, 2026",
    tags: ["Slabs", "Shear"],
    answer: `<p>A common misconception in reinforced concrete design is that punching shear checks are exclusive to <strong>flat slabs</strong>. In reality, punching shear is a failure mechanism that occurs whenever a concentrated load acts on a relatively thin, wide slab element, leading to a diagonal tension failure where the support punches through the slab.</p>
             <h3>1. Slabs supported by Beams vs. Columns</h3>
             <p>In a standard beam-and-slab layout (where the slab is supported continuously on all four edges by concrete beams), punching shear is typically not a concern. The slab transfers its loads to the beams via line support actions. The beams are deep enough to resist shear forces, and we check the slab only for standard <strong>beam shear (Cl. 3.5.4)</strong> at a distance <em>d</em> from the beam face.</p>
             <p>However, you <strong>must</strong> check punching shear in the following cases:</p>
             <ul>
               <li><strong>Flat Slabs (Cl. 3.7.7):</strong> Since there are no beams, columns support the slab directly. Punching shear is the primary failure mode and must be checked at the column face and at progressive shear perimeters (1.5d from the face of the column).</li>
               <li><strong>Slabs with concentrated point loads:</strong> If a secondary transfer column lands directly on a standard slab, or if there is heavy localized machinery or plant load on a slab panel.</li>
               <li><strong>Foundation Pad Footings &amp; Rafts:</strong> A pad footing is structurally an inverted slab loaded by a concentrated column reaction. Punching shear governs the thickness of almost all pad foundations and must be verified to prevent catastrophic soil-piercing failure.</li>
             </ul>
             <h3>2. Designing the Shear Perimeter</h3>
             <p>BS 8110 dictates that the design punching shear stress <em>v</em> is calculated at a nominal perimeter <strong>1.5d</strong> from the face of the column or loaded area. The shear stress must not exceed the concrete shear capacity <em>v_c</em>. If it does, we must increase the slab thickness or provide shear reinforcement (links or shear ladders).</p>`
  },
  "beam-intersection-midspan": {
    title: "If two beams intersect at right angles at midspan (not at a column), how do you handle the load transfer?",
    date: "July 22, 2026",
    tags: ["Beams", "Loading"],
    answer: `<p>When two structural concrete beams intersect at right angles without a column support at the junction, they form a primary-to-secondary beam connection. Managing the load path and reinforcement detailing at this intersection is critical to prevent shear failure and diagonal cracking.</p>
             <h3>1. Identifying the Primary and Secondary Members</h3>
             <p>First, we must define which beam is the support (primary) and which is supported (secondary). The primary beam spans between columns, while the secondary beam spans between the primary beam and another support. The end reaction of the secondary beam acts as a discrete <strong>point load (P)</strong> at the midspan of the primary beam.</p>
             <p>The primary beam must be designed for this point load at midspan, which produces a peak bending moment of <em>PL / 4</em>. This peak moment is twice as large as the moment produced if the same load were smeared into a UDL (which would be <em>PL / 8</em>), demonstrating why smearing point loads is dangerous.</p>
             <h3>2. detaling Suspension Linkage (Hanger Bars)</h3>
             <p>Because the secondary beam frames into the side of the primary beam, its bottom tension steel is at the same level as the primary beam's bottom steel. The shear force from the secondary beam cannot simply push down on the bottom of the primary beam, as this would cause the concrete cover to peel off and the beams to split apart.</p>
             <p>To transfer the load, we must provide <strong>suspension reinforcement (hanger links)</strong>. These are closely spaced vertical shear links in both beams at the intersection. They act as tension hangers that "lift" the reaction from the bottom of the secondary beam up to the compression zone (top) of the primary beam, allowing the load to be carried safely to the column supports.</p>`
  },
  "slab-live-load-reduction": {
    title: "Does a slab's live load (Q_k) ever get reduced, the way column live load is?",
    date: "July 22, 2026",
    tags: ["Slabs", "Loading"],
    answer: `<p>In structural load take-down, live load reductions are a powerful tool used to optimize member sizing. However, these reductions have strict limits and cannot be applied to individual slab panels.</p>
             <h3>1. Why Slab Live Loads are Fixed</h3>
             <p>Slab panels carry live loads directly from human occupancy, storage, and furniture. A single slab panel has a relatively small surface area (usually 15 to 40 square meters). It is highly probable that a single room or office panel can be fully loaded at some point (e.g., during a party, office relocation, or archiving).</p>
             <p>Therefore, BS 8110 and BS 6399-1 state that the characteristic live load <em>Q_k</em> on any individual slab panel must be taken at 100% of its design value (e.g., 1.5 kN/m² for domestic, 2.5 kN/m² for offices) without any reduction.</p>
             <h3>2. Column and Foundation Live Load Reductions</h3>
             <p>As we move down the load path, columns and foundations support cumulative floor areas across multiple storeys. The probability that every square meter of every floor is simultaneously loaded to its maximum limit is statistically near zero.</p>
             <p>BS 6399-1 Cl. 6 allows live load reductions based on either the number of storeys supported (e.g., 10% reduction for supporting 2 floors, up to 50% reduction for supporting 10 or more floors) or the total area supported. These reductions apply only to columns, loadbearing walls, and foundations, allowing for significantly more economic foundation design.</p>`
  },
  "column-slenderness-variation": {
    title: "If a column is bigger at the bottom of the building than the top, does that count as 'slender' differently at each level?",
    date: "July 22, 2026",
    tags: ["Columns", "Slenderness"],
    answer: `<p>Slenderness in concrete columns is a local structural property verified for each individual storey level. It is not calculated as a global average for the entire column line. Therefore, a column line that changes cross-section as it descends through a building will have different slenderness classifications at each floor.</p>
             <h3>1. Calculating Slenderness Ratio</h3>
             <p>The slenderness of a column is defined by the ratio of its effective height (l_e) to its cross-sectional dimension (h or b) about a given axis. For braced columns under BS 8110, the classification is:</p>
             <div class="formula">Slenderness Ratio = l_e / h</div>
             <ul>
               <li>If <em>l_e / h &le; 15</em>: The column is classified as <strong>Short</strong>. Slenderness moments are negligible.</li>
               <li>If <em>l_e / h &gt; 15</em>: The column is classified as <strong>Slender</strong>. Additional slenderness bending moments must be calculated to resist buckling.</li>
             </ul>
             <h3>2. Storey-by-Storey Slenderness Check</h3>
             <p>Because columns carry cumulative axial loads, columns at lower storeys (like the Ground or Basement levels) are often designed with larger cross-sections (e.g., 300x300mm) compared to top levels (e.g., 230x230mm). At the same time, the clear height <em>l_clear</em> is often larger at the Ground Floor (for receptions or shops) than at standard upper residential levels.</p>
             <p>Therefore, a column might be classified as "Short" at the Ground level (because the large 300mm depth offsets the clear height) but classified as "Slender" at the First Floor if the cross-section is reduced to 230mm, even though the floor height is slightly shorter. The column must be designed with additional slenderness moments at the First Floor, but not at the Ground Floor.</p>`
  },
  "cantilever-span-depth-ratio": {
    title: "Why does a cantilever need such a conservative span/depth ratio (7, versus 20 for simply supported)?",
    date: "July 22, 2026",
    tags: ["Beams", "Slabs", "Deflection"],
    answer: `<p>Deflection is the governing limit state for cantilevers. Unlike simply supported members which are supported at both ends, a cantilever has only a single fixed support, leaving the free end completely unrestrained.</p>
             <h3>1. The Mathematics of Cantilever Deflection</h3>
             <p>To understand the difference, let's compare the elastic deflection formulas for a simply supported beam versus a cantilever of the same span length (L) under a uniform load (w):</p>
             <ul>
               <li><strong>Simply Supported Beam Deflection:</strong> \\[\\delta_{ss} = \\frac{5 w L^4}{384 EI}\\]</li>
               <li><strong>Cantilever Beam Deflection:</strong> \\[\\delta_{cant} = \\frac{w L^4}{8 EI}\\]</li>
             </ul>
             <p>Dividing the cantilever deflection by the simply supported deflection reveals: \\[\\frac{\\delta_{cant}}{\\delta_{ss}} = \\frac{1/8}{5/384} = \\frac{48}{5} = 9.6\\]</p>
             <p>For the exact same span length, cross-section, and loading, a cantilever will deflect <strong>9.6 times more</strong> than a simply supported beam! Additionally, any rotation at the fixed support translates directly into linear deflection at the free tip.</p>
             <h3>2. Span-to-Depth Ratio Limits</h3>
             <p>To control this deflection, BS 8110 imposes strict span-to-effective-depth (L/d) limits:</p>
             <ul>
               <li>Simply Supported Member limit: <strong>20</strong></li>
               <li>Cantilever Member limit: <strong>7</strong></li>
             </ul>
             <p>This means a cantilever beam with a 2-meter span needs an effective depth of at least <em>2000 / 7 &asymp; 285mm</em>, whereas a simply supported beam of the same length would only need 100mm. This conservatism is crucial to prevent structural sagging and cracking in masonry walls sitting on cantilevers.</p>`
  },
  "concrete-grade-load-effect": {
    title: "Does the choice of f_cu (concrete grade) change how you calculate loads, or only how you design the section?",
    date: "July 22, 2026",
    tags: ["Materials", "Loading"],
    answer: `<p>In structural design, the concrete compressive strength grade (f_cu) is a material property. It primarily affects the mechanical resistance of the members, but it also has indirect effects on the overall loading calculations.</p>
             <h3>1. Direct Mechanical Design Effects</h3>
             <p>The concrete grade <em>f_cu</em> directly dictates the ultimate strength capacity of the member sections:</p>
             <ul>
               <li>It determines the depth of the concrete compression block in flexure.</li>
               <li>It governs the ultimate concrete shear stress capacity (v_c) per Cl. 3.4.5.4.</li>
               <li>It determines the axial capacity of columns: \\[N = 0.4 f_{cu} A_c + 0.8 f_y A_{sc}\\]</li>
             </ul>
             <h3>2. Indirect Loading Effects</h3>
             <p>While the weight of concrete is assumed constant at <strong>24 kN/m³</strong> (or 25 kN/m³ for fully reinforced concrete) regardless of whether it is Grade 20, 25, or 35, the choice of <em>f_cu</em> indirectly changes the dead load calculations:</p>
             <ul>
               <li><strong>Member Sizing:</strong> Using a higher concrete grade (e.g., Grade 30 instead of Grade 20) increases the shear and flexural capacity of the members. This allows the designer to specify thinner slabs and smaller beam/column sizes, directly reducing the dead load (self-weight) of the structure.</li>
               <li><strong>Deflection:</strong> Higher concrete grades have a higher elastic modulus (E_c), which increases member stiffness and reduces deflection, allowing for shallower sections.</li>
             </ul>`
  },
  "beam-reinforcement-doubly-reinforced": {
    title: "If a beam has different reinforcement top and bottom at midspan, does that mean it's doubly reinforced?",
    date: "July 22, 2026",
    tags: ["Beams"],
    answer: `<p>No. A beam is not classified as "doubly reinforced" simply because it contains steel bars in both the top and bottom faces. Structurally, a beam is only doubly reinforced if compression steel is <strong>actively required</strong> to resist the bending moment.</p>
             <h3>1. Singly vs. Doubly Reinforced Concepts</h3>
             <p>In singly reinforced design, we assume that the concrete compression block alone is sufficient to resist all compressive stresses, and the bottom steel (A_s) resists all tensile stresses. The maximum moment a singly reinforced section can carry is capped by the limit:</p>
             <div class="formula">K' = 0.156</div>
             <p>If the design moment factor <em>K = M / (b d² f_cu)</em> is less than or equal to 0.156, the concrete carries the compression block safely. We design it as singly reinforced.</p>
             <p>If <em>K &gt; 0.156</em>, the concrete will crush under compression before the steel yields. Rather than increasing the beam size (which may be restricted by architectural headroom), we introduce top compression reinforcement (A_s') to assist the concrete in carrying compression. Only in this case is the beam designed as doubly reinforced.</p>
             <h3>2. Why Singly Reinforced Beams Have Top Steel</h3>
             <p>Almost all singly reinforced beams in practice contain top reinforcement bars at midspan for non-structural or auxiliary reasons:</p>
             <ul>
               <li><strong>Hanger Bars:</strong> Small diameter bars (typically 2T12 or 2T16) are placed in the top corners of the beam simply to anchor and support the vertical shear links (stirrups).</li>
               <li><strong>Shrinkage Control:</strong> Top reinforcement controls thermal cracking as the concrete cures.</li>
             </ul>
             <p>Although these bars are physically present in the compression zone, they are ignored in the flexural capacity calculations, and the beam remains designed as singly reinforced.</p>`
  },
  "slab-vs-beam-deflection": {
    title: "Do you need to check deflection separately for a slab if you've already checked it for the beam supporting it?",
    date: "July 22, 2026",
    tags: ["Slabs", "Beams", "Deflection"],
    answer: `<p>Yes, slab deflection and beam deflection are separate checks, and satisfying one does not guarantee that the other complies. This is because slabs and beams deflect relative to different boundaries and have different span configurations.</p>
             <h3>1. Cumulative Deflection Effects</h3>
             <p>Slab panels sit on beams, and beams sit on columns. When a load is applied:</p>
             <ul>
               <li>The supporting beam deflections occur relative to the column grid lines.</li>
               <li>The slab panel deflections occur relative to the supporting beams.</li>
             </ul>
             <p>The total, absolute deflection seen by a partition wall or floor finish placed on the slab is the cumulative sum of both the beam's deflection and the slab's local deflection. If either exceeds the allowable limit, cracking and serviceability failure will occur.</p>
             <h3>2. Span-to-Depth Ratio Requirements</h3>
             <p>BS 8110 regulates deflection using the span-to-effective-depth (L/d) ratio check. Because a slab's span length is typically shorter than the beam's span, but the slab's depth (d) is much thinner, the slab's local L/d ratio must be verified independently. We must satisfy:</p>
             <div class="formula">Actual L/d &le; Allowable L/d</div>
             <p>For the slab, we use the slab's short span length and slab depth. For the beam, we use the beam's span length and beam depth. Both must pass independently to ensure serviceability.</p>`
  }
};

export default function ArticleDetail({ params }: { params: { slug: string } }) {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadArticle() {
      try {
        let fetched: Article | null = null;
        try {
          const res = await fetch(`/api/notes?slug=${encodeURIComponent(params.slug)}`, { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            fetched = data.note || null;
          }
        } catch (serverErr) {
          console.warn('Server fetch failed, falling back to client fetch:', serverErr);
        }

        if (!fetched) {
          const query = `*[_type == "communityNote" && slug.current == $slug][0]`;
          fetched = await sanityClient.fetch(query, { slug: params.slug }).catch(() => null);
        }

        if (fetched) {
          setArticle(fetched);
        } else {
          setArticle(defaultFAQs[params.slug] || null);
        }
      } catch (err) {
        console.warn('Failed to load note from Sanity, using default fallback:', err);
        setArticle(defaultFAQs[params.slug] || null);
      } finally {
        setLoading(false);
      }
    }
    loadArticle();
  }, [params.slug]);

  if (loading) {
    return (
      <div style={{ padding: '60px 24px', maxWidth: '760px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
        <p style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--mid-gray)' }}>Loading note article...</p>
      </div>
    );
  }

  if (!article) {
    return (
      <div style={{ padding: '60px 24px', maxWidth: '760px', margin: '0 auto', fontFamily: 'Inter, sans-serif', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'Lora, serif', fontSize: '28px', fontWeight: '400', marginBottom: '14px' }}>Note Article Not Found</h1>
        <p style={{ fontSize: '14px', color: 'var(--mid-gray)', marginBottom: '24px' }}>The note slug you requested does not exist or has been removed.</p>
        <Link href="/community-notes" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>Back to Community Notes</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '60px 0 100px 0', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '0 24px' }}>
        
        {/* Back Link */}
        <Link href="/community-notes" style={{ textDecoration: 'none', color: 'var(--mid-gray)', fontSize: '11px', fontFamily: 'var(--mono)', letterSpacing: '0.1em', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '32px' }}>
          &larr; Back to Community Notes
        </Link>

        {/* Metadata */}
        <div className="card-meta" style={{ marginBottom: '16px' }}>
          <span style={{ fontSize: '11px', color: 'var(--mid-gray)', fontFamily: 'var(--mono)' }}>{article.date}</span>
          <div className="card-tags" style={{ display: 'inline-flex', gap: '6px', marginLeft: '12px' }}>
            {article.tags?.map(t => (
              <span key={t} className="card-tag" style={{ color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: '11px' }}>#{t.toLowerCase()}</span>
            ))}
          </div>
        </div>

        {/* Title */}
        {article.image && (
          <img
            src={urlFor(article.image).url()}
            alt={article.title}
            style={{
              width: '100%',
              maxHeight: '340px',
              objectFit: 'cover',
              borderRadius: 'var(--radius)',
              marginBottom: '28px',
              border: '1px solid var(--rule)'
            }}
          />
        )}

        <h1 style={{
          fontFamily: 'Lora, serif',
          fontWeight: '400',
          fontSize: '34px',
          lineHeight: '1.25',
          color: 'var(--black)',
          marginBottom: '36px'
        }}>{article.title}</h1>

        {/* Body content */}
        <div
          className="card-answer"
          style={{
            fontSize: '15.5px',
            color: 'var(--dark-gray)',
            lineHeight: '1.8'
          }}
          dangerouslySetInnerHTML={{ __html: article.answer }}
        />

        {/* Callout box at bottom */}
        <div style={{
          borderTop: '1px solid var(--rule)',
          marginTop: '60px',
          paddingTop: '30px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '13px', color: 'var(--mid-gray)' }}>BS 8110 Manual Design Reference</span>
          <Link href="/community-notes" style={{ color: 'var(--accent)', textDecoration: 'underline', fontSize: '13px', fontWeight: 600 }}>Explore more notes &rarr;</Link>
        </div>

      </div>
    </div>
  );
}

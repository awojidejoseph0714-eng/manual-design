const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, 'app', 'page.tsx');
if (!fs.existsSync(pagePath)) {
  console.error('app/page.tsx not found!');
  process.exit(1);
}

let pageContent = fs.readFileSync(pagePath, 'utf8');

// 1. Define the Interactive Flexural Section Calculator JSX Component Code
const calculatorComponentCode = `
  // ── Interactive Flexural Section Calculator State ──
  const [calcM, setCalcM] = useState(120); // kNm
  const [calcb, setCalcb] = useState(250); // mm
  const [calcd, setCalcd] = useState(400); // mm
  const [calcfcu, setCalcfcu] = useState(25); // N/mm2
  const [calcfy, setCalcfy] = useState(500); // N/mm2

  const calcResults = useMemo(() => {
    // K = M * 10^6 / (b * d^2 * fcu)
    const K = (calcM * 1e6) / (calcb * Math.pow(calcd, 2) * calcfcu);
    const Kprime = 0.156;
    
    // z = d * (0.5 + Math.sqrt(0.25 - K/0.9)) capped at 0.95d
    let z = calcd * 0.95;
    let x = 0.5 * calcd; // neutral axis x = (d - z)/0.45
    let statusText = 'Singly Reinforced';
    let isDoubly = false;
    let AsPrime = 0;

    if (K <= Kprime) {
      const term = 0.25 - K / 0.9;
      if (term >= 0) {
        z = calcd * (0.5 + Math.sqrt(term));
        if (z > 0.95 * calcd) z = 0.95 * calcd;
        x = (calcd - z) / 0.45;
      }
    } else {
      isDoubly = true;
      statusText = 'Doubly Reinforced (Compression Steel Required)';
      // Singly limit z'
      z = calcd * (0.5 + Math.sqrt(0.25 - Kprime / 0.9));
      x = (calcd - z) / 0.45;
      // As' = (K - K') * fcu * b * d^2 / (0.95 * fy * (d - d')) where d' is nominal cover (e.g. 35mm)
      const dPrime = 35;
      AsPrime = ((K - Kprime) * calcfcu * calcb * Math.pow(calcd, 2)) / (0.95 * calcfy * (calcd - dPrime));
    }

    const As = (calcM * 1e6) / (0.95 * calcfy * z) + (isDoubly ? AsPrime : 0);

    return {
      K: K.toFixed(3),
      z: z.toFixed(0),
      x: x.toFixed(0),
      isDoubly,
      statusText,
      As: As.toFixed(0),
      AsPrime: AsPrime.toFixed(0)
    };
  }, [calcM, calcb, calcd, calcfcu, calcfy]);
`;

// 2. We inject the calculator states into the Home component.
// We look for "const [articles, setArticles] = useState<any[]>([]);" and append the states.
const stateTarget = 'const [articles, setArticles] = useState<any[]>([]);';
if (pageContent.includes(stateTarget)) {
  pageContent = pageContent.replace(stateTarget, stateTarget + '\n' + calculatorComponentCode);
} else {
  console.error('Could not find state injection target!');
}

// 3. Define the Interactive Calculator JSX markup to place inside Section 0.3
const calculatorUI = `
        {/* Interactive Flexural Section Calculator & Canvas Visualizer */}
        <div style={{
          background: 'var(--light-bg)',
          border: '1px solid var(--rule)',
          borderRadius: 'var(--radius)',
          padding: '24px',
          margin: '28px 0',
          fontFamily: 'Inter, sans-serif'
        }}>
          <h3 style={{ fontFamily: 'Lora, serif', fontSize: '18px', fontWeight: '400', color: 'var(--black)', marginBottom: '6px' }}>Interactive Flexural Design Visualizer</h3>
          <p style={{ fontSize: '12.5px', color: 'var(--mid-gray)', marginBottom: '20px' }}>
            Slide the parameters to see the stress-block neutral axis depth (x), lever arm (z), and reinforcement changes in real time.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            
            {/* Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'var(--mono)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  <span>Moment (M):</span> <strong>{calcM} kNm</strong>
                </label>
                <input type="range" min="20" max="300" value={calcM} onChange={(e) => setCalcM(Number(e.target.value))} style={{ width: '100%' }} />
              </div>

              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'var(--mono)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  <span>Width (b):</span> <strong>{calcb} mm</strong>
                </label>
                <input type="range" min="150" max="500" value={calcb} onChange={(e) => setCalcb(Number(e.target.value))} style={{ width: '100%' }} />
              </div>

              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'var(--mono)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  <span>Effective Depth (d):</span> <strong>{calcd} mm</strong>
                </label>
                <input type="range" min="200" max="700" value={calcd} onChange={(e) => setCalcd(Number(e.target.value))} style={{ width: '100%' }} />
              </div>

              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'var(--mono)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  <span>Concrete f_cu:</span> <strong>{calcfcu} N/mm²</strong>
                </label>
                <input type="range" min="20" max="50" value={calcfcu} onChange={(e) => setCalcfcu(Number(e.target.value))} style={{ width: '100%' }} />
              </div>
            </div>

            {/* Calculations & Visualization */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderLeft: '1px solid var(--rule)', paddingLeft: '24px' }}>
              <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                <div>Status: <span className="cl" style={{ background: calcResults.isDoubly ? '#8a5a2f' : 'var(--accent)' }}>{calcResults.statusText}</span></div>
                <div style={{ marginTop: '8px' }}>Factor <strong>K</strong> = {calcResults.K} {Number(calcResults.K) > 0.156 ? '> 0.156 (Doubly)' : '≤ 0.156 (Singly)'}</div>
                <div>Lever arm <strong>z</strong> = {calcResults.z} mm</div>
                <div>Neutral axis <strong>x</strong> = {calcResults.x} mm</div>
                <div style={{ marginTop: '8px', fontSize: '14px', fontWeight: 'bold' }}>
                  Req. Tension Area (As): <span style={{ color: 'var(--accent)' }}>{calcResults.As} mm²</span>
                </div>
                {calcResults.isDoubly && (
                  <div style={{ fontSize: '13.5px', color: '#8a5a2f', fontWeight: '600' }}>
                    Req. Compression Area (As'): {calcResults.AsPrime} mm²
                  </div>
                )}
              </div>

              {/* Dynamic SVG Visualizer of Beam Section */}
              <svg width="100%" height="90" viewBox="0 0 200 90" style={{ background: '#ffffff', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', marginTop: '12px' }}>
                {/* Concrete Block */}
                <rect x="60" y="5" width="80" height="80" fill="var(--light-bg)" stroke="var(--black)" strokeWidth="1.5" />
                {/* Compression Block Shading (top to x) */}
                <rect x="60" y="5" width="80" height={Math.max(4, Math.min(80, (Number(calcResults.x) / calcd) * 80))} fill="rgba(47, 93, 138, 0.1)" />
                {/* Neutral Axis line */}
                <line x1="55" y1={5 + (Number(calcResults.x) / calcd) * 80} x2="145" y2={5 + (Number(calcResults.x) / calcd) * 80} stroke="var(--accent)" strokeWidth="1.2" strokeDasharray="3 2" />
                <text x="150" y={8 + (Number(calcResults.x) / calcd) * 80} fontFamily="monospace" fontSize="7" fill="var(--accent)">N.A.</text>

                {/* Tension Steel (bottom bars) */}
                <circle cx="75" cy="75" r="4" fill="var(--black)" />
                <circle cx="100" cy="75" r="4" fill="var(--black)" />
                <circle cx="125" cy="75" r="4" fill="var(--black)" />
                
                {/* Compression Steel (top bars if doubly) */}
                {calcResults.isDoubly && (
                  <>
                    <circle cx="75" cy="15" r="3.5" fill="#8a5a2f" />
                    <circle cx="125" cy="15" r="3.5" fill="#8a5a2f" />
                  </>
                )}
              </svg>
            </div>

          </div>
        </div>
`;

// Inject Calculator UI inside Section f3 (line 442 target: `<div class="card blue"><p>For slabs, b = 1000mm`)
const sectionF3Target = '<div class="card blue"><p>For slabs, b = 1000mm';
if (pageContent.includes(sectionF3Target)) {
  pageContent = pageContent.replace(sectionF3Target, calculatorUI + '\n' + sectionF3Target);
} else {
  console.error('Could not find Section f3 target!');
}

// 4. Swap Mermaid blocks with SVGs
// Mermaid 1: One-Way Load Path
const m1_target = `<div class="mermaid">
        graph TD
            Slab[One-Way Slab panel: L_y/L_x > 2] -->|50% load| Beam1[Beam A: UDL load = n * L_x / 2]
            Slab -->|50% load| Beam2[Beam B: UDL load = n * L_x / 2]
        </div>`;
const m1_replacement = `
        <svg viewBox="0 0 400 160" style={{ background:'#f7f7f5', border:'1px solid #e0e0e0', borderRadius:'4px', maxWidth:'100%', height:'auto', margin:'12px 0' }}>
          <rect x="50" y="20" width="300" height="120" fill="none" stroke="#0f0f0f" strokeWidth="2" strokeDasharray="4 2" />
          <line x1="50" y1="20" x2="350" y2="20" stroke="#2f5d8a" strokeWidth="6" />
          <line x1="50" y1="140" x2="350" y2="140" stroke="#2f5d8a" strokeWidth="6" />
          <line x1="50" y1="80" x2="350" y2="80" stroke="#6b6b6b" strokeWidth="1" strokeDasharray="8 4" />
          <path d="M120,70 L120,30 M120,30 L115,35 M120,30 L125,35" stroke="#6b6b6b" strokeWidth="1.5" fill="none" />
          <path d="M120,90 L120,130 M120,130 L115,125 M120,130 L125,125" stroke="#6b6b6b" strokeWidth="1.5" fill="none" />
          <path d="M280,70 L280,30 M280,30 L275,35 M280,30 L285,35" stroke="#6b6b6b" strokeWidth="1.5" fill="none" />
          <path d="M280,90 L280,130 M280,130 L275,125 M280,130 L285,125" stroke="#6b6b6b" strokeWidth="1.5" fill="none" />
          <text x="200" y="75" fontFamily="monospace" fontSize="10" textAnchor="middle" fill="#0f0f0f">ONE-WAY SLAB (Ly/Lx &gt; 2)</text>
          <text x="200" y="15" fontFamily="monospace" fontSize="9" textAnchor="middle" fill="#2f5d8a">BEAM A (Carries 50% load)</text>
          <text x="200" y="155" fontFamily="monospace" fontSize="9" textAnchor="middle" fill="#2f5d8a">BEAM B (Carries 50% load)</text>
        </svg>
`;

// Mermaid 2: Two-Way Load Path
const m2_target = `<div class="mermaid">
        graph TD
            Slab2[Two-Way Slab panel: L_y/L_x <= 2] -->|Short Edges| Tri[Triangular load on Short Beams]
            Slab2 -->|Long Edges| Trap[Trapezoidal load on Long Beams]
            Tri -->|V_x| ShortBeam[V_x = beta_vx * n * L_x]
            Trap -->|V_y| LongBeam[V_y = beta_vy * n * L_x]
        </div>`;
const m2_replacement = `
        <svg viewBox="0 0 400 220" style={{ background:'#f7f7f5', border:'1px solid #e0e0e0', borderRadius:'4px', maxWidth:'100%', height:'auto', margin:'12px 0' }}>
          <rect x="60" y="30" width="280" height="160" fill="none" stroke="#0f0f0f" strokeWidth="2" />
          <line x1="60" y1="30" x2="140" y2="110" stroke="#6b6b6b" strokeWidth="1.5" strokeDasharray="4 2" />
          <line x1="60" y1="190" x2="140" y2="110" stroke="#6b6b6b" strokeWidth="1.5" strokeDasharray="4 2" />
          <line x1="340" y1="30" x2="260" y2="110" stroke="#6b6b6b" strokeWidth="1.5" strokeDasharray="4 2" />
          <line x1="340" y1="190" x2="260" y2="110" stroke="#6b6b6b" strokeWidth="1.5" strokeDasharray="4 2" />
          <line x1="140" y1="110" x2="260" y2="110" stroke="#6b6b6b" strokeWidth="1.5" strokeDasharray="4 2" />
          
          <polygon points="60,30 140,110 60,190" fill="rgba(138,90,47,0.08)" />
          <polygon points="340,30 260,110 340,190" fill="rgba(138,90,47,0.08)" />
          <polygon points="60,30 340,30 260,110 140,110" fill="rgba(47,93,138,0.08)" />
          <polygon points="60,190 340,190 260,110 140,110" fill="rgba(47,93,138,0.08)" />
          
          <text x="200" y="70" fontFamily="monospace" fontSize="9" textAnchor="middle" fill="#2f5d8a">Trapezoidal load on Long Beams</text>
          <text x="100" y="115" fontFamily="monospace" fontSize="9" textAnchor="middle" fill="#8a5a2f" transform="rotate(-90 100 115)">Triangular load</text>
          <text x="300" y="115" fontFamily="monospace" fontSize="9" textAnchor="middle" fill="#8a5a2f" transform="rotate(90 300 115)">Triangular load</text>
          <text x="200" y="160" fontFamily="monospace" fontSize="9" textAnchor="middle" fill="#2f5d8a">Trapezoidal load on Long Beams</text>
          <text x="200" y="210" fontFamily="monospace" fontSize="9" textAnchor="middle" fill="#0f0f0f">TWO-WAY SLAB (Ly/Lx &le; 2)</text>
        </svg>
`;

// Mermaid 3: Beam Loading Elevation
const m3_target = `<div class="mermaid">
            graph TD
                subgraph Loading Diagram on Beam Span
                    Col[Transfer Column Load: P_col] -->|Point Load| BeamCenter((Beam midspan))
                    SecBeam[Secondary Beam Reaction: P_beam] -->|Point Load| BeamQuarter((Beam span/4))
                    UDL[Uniformly Distributed Load: w_u = selfweight + walls + slab] -->|Distributed load| BeamSpan[Full length of Beam]
                end
            </div>`;
const m3_replacement = `
            <svg viewBox="0 0 500 180" style={{ background:'#f7f7f5', border:'1px solid #e0e0e0', borderRadius:'4px', maxWidth:'100%', height:'auto', margin:'12px 0' }}>
              <polygon points="40,130 30,145 50,145" fill="#0f0f0f" />
              <polygon points="460,130 450,145 470,145" fill="#0f0f0f" />
              <rect x="40" y="110" width="420" height="20" fill="#ffffff" stroke="#0f0f0f" strokeWidth="2" />
              
              <path d="M45,85 L45,108 M45,108 L42,103 M45,108 L48,103" stroke="#6b6b6b" strokeWidth="1" fill="none" />
              <path d="M100,85 L100,108 M100,108 L97,103 M100,108 L103,103" stroke="#6b6b6b" strokeWidth="1" fill="none" />
              <path d="M160,85 L160,108 M160,108 L157,103 M160,108 L163,103" stroke="#6b6b6b" strokeWidth="1" fill="none" />
              <path d="M220,85 L220,108 M220,108 L217,103 M220,108 L223,103" stroke="#6b6b6b" strokeWidth="1" fill="none" />
              <path d="M280,85 L280,108 M280,108 L277,103 M280,108 L283,103" stroke="#6b6b6b" strokeWidth="1" fill="none" />
              <path d="M340,85 L340,108 M340,108 L337,103 M340,108 L343,103" stroke="#6b6b6b" strokeWidth="1" fill="none" />
              <path d="M400,85 L400,108 M400,108 L397,103 M400,108 L403,103" stroke="#6b6b6b" strokeWidth="1" fill="none" />
              <path d="M455,85 L455,108 M455,108 L452,103 M455,108 L458,103" stroke="#6b6b6b" strokeWidth="1" fill="none" />
              <line x1="45" y1="85" x2="455" y2="85" stroke="#6b6b6b" strokeWidth="1" strokeDasharray="2 2" />
              <text x="250" y="80" fontFamily="monospace" fontSize="9" textAnchor="middle" fill="#6b6b6b">UDL (wu)</text>
              
              <path d="M250,30 L250,100 M250,100 L245,92 M250,100 L255,92" stroke="#8a5a2f" strokeWidth="2.5" fill="none" />
              <text x="250" y="25" fontFamily="monospace" fontSize="9.5" textAnchor="middle" fill="#8a5a2f" fontWeight="bold">Col Load (P_col)</text>
              <path d="M145,50 L145,100 M145,100 L141,94 M145,100 L149,94" stroke="#2f5d8a" strokeWidth="2" fill="none" />
              <text x="145" y="45" fontFamily="monospace" fontSize="8.5" textAnchor="middle" fill="#2f5d8a">Beam Load (P_beam)</text>
              
              <line x1="40" y1="160" x2="460" y2="160" stroke="#0f0f0f" strokeWidth="1" />
              <line x1="40" y1="155" x2="40" y2="165" stroke="#0f0f0f" strokeWidth="1" />
              <line x1="460" y1="155" x2="460" y2="165" stroke="#0f0f0f" strokeWidth="1" />
              <text x="250" y="172" fontFamily="monospace" fontSize="9.5" textAnchor="middle" fill="#0f0f0f">Span L</text>
            </svg>
`;

// Mermaid 4: Column Effective Length
const m4_target = `<div class="mermaid">
        graph TD
            subgraph Column Buckling Profiles
                Cond1[Both Ends Fixed: beta = 0.75] -->|Buckles in middle 75%| Profile1[l_e = 0.75 * l_clear]
                Cond2[Both Ends Pinned: beta = 1.00] -->|Buckles over full length| Profile2[l_e = 1.00 * l_clear]
                Cond3[Cantilever: beta = 2.20] -->|Sway buckling| Profile3[l_e = 2.20 * l_clear]
            end
        </div>`;
const m4_replacement = `
        <svg viewBox="0 0 500 220" style={{ background:'#f7f7f5', border:'1px solid #e0e0e0', borderRadius:'4px', maxWidth:'100%', height:'auto', margin:'12px 0' }}>
          <g transform="translate(30, 0)">
            <rect x="40" y="20" width="30" height="5" fill="#0f0f0f" />
            <rect x="40" y="180" width="30" height="5" fill="#0f0f0f" />
            <line x1="55" y1="20" x2="55" y2="180" stroke="#e0e0e0" strokeWidth="2" strokeDasharray="2 2" />
            <path d="M55,20 C55,40 40,80 40,100 C40,120 55,160 55,180" fill="none" stroke="#2f5d8a" strokeDasharray="4 2" strokeWidth="2" />
            <text x="55" y="200" fontFamily="monospace" fontSize="8.5" textAnchor="middle" fill="#2f5d8a">Fixed-Fixed (le = 0.75 L)</text>
          </g>
          <g transform="translate(180, 0)">
            <polygon points="55,20 48,10 62,10" fill="#0f0f0f" />
            <polygon points="55,180 48,190 62,190" fill="#0f0f0f" />
            <line x1="55" y1="20" x2="55" y2="180" stroke="#e0e0e0" strokeWidth="2" strokeDasharray="2 2" />
            <path d="M55,20 Q30,100 55,180" fill="none" stroke="#8a5a2f" strokeWidth="2" />
            <text x="55" y="200" fontFamily="monospace" fontSize="8.5" textAnchor="middle" fill="#8a5a2f">Pinned-Pinned (le = 1.0 L)</text>
          </g>
          <g transform="translate(330, 0)">
            <rect x="40" y="180" width="30" height="5" fill="#0f0f0f" />
            <line x1="55" y1="20" x2="55" y2="180" stroke="#e0e0e0" strokeWidth="2" strokeDasharray="2 2" />
            <path d="M15,20 Q15,80 55,180" fill="none" stroke="#0f0f0f" strokeWidth="2" strokeDasharray="4 2" />
            <text x="55" y="200" fontFamily="monospace" fontSize="8.5" textAnchor="middle" fill="#0f0f0f">Cantilever (le = 2.2 L)</text>
          </g>
        </svg>
`;

// Mermaid 5: Worked Example plan
const m5_target = `<div class="mermaid">
        flowchart TD
            %% Nodes for column positions
            A1((Col A1)) ===|Beam B1: 5.0m| A2((Col A2))
            A1 ===|Beam B2: 4.0m| B1((Col B1))
            A2 ===|Beam B2: 4.0m| B2((Col B2))
            B1 ===|Beam B1: 5.0m| B2((Col B2))
            
            style A1 fill:#000,stroke:#000,color:#fff;
            style A2 fill:#000,stroke:#000,color:#fff;
            style B1 fill:#000,stroke:#000,color:#fff;
            style B2 fill:#000,stroke:#000,color:#fff;
            
            subgraph Slab Panel S1
                dir[Lx = 4.0m, Ly = 5.0m]
            end
        </div>`;
const m5_replacement = `
        <svg viewBox="0 0 420 280" style={{ background:'#f7f7f5', border:'1px solid #e0e0e0', borderRadius:'4px', maxWidth:'100%', height:'auto', margin:'12px 0' }}>
          <line x1="60" y1="20" x2="60" y2="250" stroke="#6b6b6b" strokeWidth="0.75" strokeDasharray="8 4" />
          <line x1="360" y1="20" x2="360" y2="250" stroke="#6b6b6b" strokeWidth="0.75" strokeDasharray="8 4" />
          <line x1="20" y1="60" x2="400" y2="60" stroke="#6b6b6b" strokeWidth="0.75" strokeDasharray="8 4" />
          <line x1="20" y1="220" x2="400" y2="220" stroke="#6b6b6b" strokeWidth="0.75" strokeDasharray="8 4" />
          <text x="15" y="63" fontFamily="monospace" fontSize="9" fill="#6b6b6b">Grid 1</text>
          <text x="15" y="223" fontFamily="monospace" fontSize="9" fill="#6b6b6b">Grid 2</text>
          <text x="57" y="15" fontFamily="monospace" fontSize="9" fill="#6b6b6b">Grid A</text>
          <text x="357" y="15" fontFamily="monospace" fontSize="9" fill="#6b6b6b">Grid B</text>

          <rect x="60" y="55" width="300" height="10" fill="#ffffff" stroke="#0f0f0f" strokeWidth="1.5" />
          <rect x="60" y="215" width="300" height="10" fill="#ffffff" stroke="#0f0f0f" strokeWidth="1.5" />
          <rect x="55" y="60" width="10" height="160" fill="#ffffff" stroke="#0f0f0f" strokeWidth="1.5" />
          <rect x="355" y="60" width="10" height="160" fill="#ffffff" stroke="#0f0f0f" strokeWidth="1.5" />

          <rect x="50" y="50" width="20" height="20" fill="#0f0f0f" stroke="#0f0f0f" />
          <text x="45" y="45" fontFamily="monospace" fontSize="9" fill="#0f0f0f">Col A1</text>
          <rect x="350" y="50" width="20" height="20" fill="#0f0f0f" stroke="#0f0f0f" />
          <text x="355" y="45" fontFamily="monospace" fontSize="9" fill="#0f0f0f">Col B1</text>
          <rect x="50" y="210" width="20" height="20" fill="#0f0f0f" stroke="#0f0f0f" />
          <text x="45" y="243" fontFamily="monospace" fontSize="9" fill="#0f0f0f">Col A2</text>
          <rect x="350" y="210" width="20" height="20" fill="#0f0f0f" stroke="#0f0f0f" />
          <text x="355" y="243" fontFamily="monospace" fontSize="9" fill="#0f0f0f">Col B2</text>

          <text x="210" y="145" fontFamily="monospace" fontSize="12" fontWeight="bold" textAnchor="middle" fill="#2f5d8a">SLAB PANEL S1</text>
          <text x="210" y="165" fontFamily="monospace" fontSize="10" textAnchor="middle" fill="#6b6b6b">Ly = 5.0m | Lx = 4.0m</text>
          <text x="210" y="180" fontFamily="monospace" fontSize="9.5" textAnchor="middle" fill="#6b6b6b">(Ly/Lx = 1.25 &le; 2 &rarr; Two-Way)</text>
        </svg>
`;

// Helper to escape regex special characters
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Perform replacements
if (pageContent.includes(m1_target)) {
  pageContent = pageContent.replace(m1_target, m1_replacement);
  console.log('Replaced Mermaid 1 with One-Way Load Path SVG.');
} else {
  console.error('Could not find Mermaid 1 target!');
}

if (pageContent.includes(m2_target)) {
  pageContent = pageContent.replace(m2_target, m2_replacement);
  console.log('Replaced Mermaid 2 with Two-Way Load Path SVG.');
} else {
  console.error('Could not find Mermaid 2 target!');
}

if (pageContent.includes(m3_target)) {
  pageContent = pageContent.replace(m3_target, m3_replacement);
  console.log('Replaced Mermaid 3 with Beam Loading Elevation SVG.');
} else {
  console.error('Could not find Mermaid 3 target!');
}

if (pageContent.includes(m4_target)) {
  pageContent = pageContent.replace(m4_target, m4_replacement);
  console.log('Replaced Mermaid 4 with Column Effective Length SVG.');
} else {
  console.error('Could not find Mermaid 4 target!');
}

if (pageContent.includes(m5_target)) {
  pageContent = pageContent.replace(m5_target, m5_replacement);
  console.log('Replaced Mermaid 5 with Structural Framing Layout SVG.');
} else {
  console.error('Could not find Mermaid 5 target!');
}

// Write the final content back to app/page.tsx
fs.writeFileSync(pagePath, pageContent, 'utf8');
console.log('Successfully completed injecting interactive visualizers and replacing Mermaid with premium SVGs!');

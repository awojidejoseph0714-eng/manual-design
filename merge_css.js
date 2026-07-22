const fs = require('fs');
const path = require('path');

const userCssPath = path.join(__dirname, 'user_css.css');
if (!fs.existsSync(userCssPath)) {
  console.error('user_css.css not found!');
  process.exit(1);
}

let cssContent = fs.readFileSync(userCssPath, 'utf8');

// Ensure Tailwind imports are at the very top of globals.css
const tailwindImports = `@tailwind base;
@tailwind components;
@tailwind utilities;

`;

// FAQ / Community Notes styles to append
const communityNotesStyles = `
/* =====================================
   COMMUNITY NOTES JOURNAL SPECIFIC
   ===================================== */
.floating-faq-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: var(--white);
  color: var(--black);
  border: 1px solid var(--black);
  border-radius: var(--radius);
  padding: 10px 18px;
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 600;
  text-decoration: none;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 999;
  transition: all 0.2s ease;
}
.floating-faq-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-bg);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(47,93,138,0.12);
}
@media (max-width: 700px) {
  .floating-faq-btn {
    bottom: 16px;
    right: 16px;
    padding: 8px 14px;
    font-size: 10px;
  }
}
.notes-container {
  max-width: 760px;
  margin: 0 auto;
  padding: 0 24px;
}
.tag-pill {
  font-family: var(--mono);
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 20px;
  background: var(--light-bg);
  border: 1px solid var(--rule);
  cursor: pointer;
  color: var(--dark-gray);
  transition: all 0.15s;
}
.tag-pill:hover {
  border-color: var(--black);
}
.tag-pill.active {
  background: var(--accent);
  color: var(--white);
  border-color: var(--accent);
}
.journal-card {
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  padding: 24px;
  background: var(--white);
  transition: border-color 0.15s, box-shadow 0.15s;
}
.journal-card:hover {
  border-color: var(--accent-dim);
  box-shadow: 0 4px 12px rgba(47,93,138,0.06);
}
.card-meta {
  font-family: var(--mono);
  font-size: 10.5px;
  color: var(--mid-gray);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.card-tags {
  display: flex;
  gap: 6px;
}
.card-tag {
  color: var(--accent);
}
.journal-card h2 {
  font-family: var(--serif);
  font-weight: 400;
  font-size: 19px;
  margin-bottom: 12px;
  line-height: 1.35;
}
.card-answer {
  font-size: 14.5px;
  color: var(--dark-gray);
  line-height: 1.7;
}
mark {
  background: var(--accent-bg);
  color: var(--accent);
  padding: 0 2px;
  border-radius: 2px;
}
`;

const mergedCss = tailwindImports + cssContent + communityNotesStyles;
fs.writeFileSync(path.join(__dirname, 'app', 'globals.css'), mergedCss, 'utf8');
console.log('Successfully merged user_css.css into app/globals.css!');

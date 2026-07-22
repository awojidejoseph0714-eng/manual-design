const fs = require('fs');

const indexHtml = fs.readFileSync('index.html', 'utf8');
const userHtml = fs.readFileSync('user_code.html', 'utf8');

// 1. Extract style block from user_code.html
const startStyle = userHtml.indexOf('<style>');
const endStyle = userHtml.indexOf('</style>');
if (startStyle === -1 || endStyle === -1) {
  console.error("Could not find style block in user_code.html");
  process.exit(1);
}
const userStyle = userHtml.substring(startStyle, endStyle + 8); // includes </style>

// Replace style block in index.html
const startStyleIndex = indexHtml.indexOf('<style>');
const endStyleIndex = indexHtml.indexOf('</style>');
if (startStyleIndex === -1 || endStyleIndex === -1) {
  console.error("Could not find style block in index.html");
  process.exit(1);
}

let updatedHtml = indexHtml.substring(0, startStyleIndex) + userStyle + indexHtml.substring(endStyleIndex + 8);

// 2. Add classes p0, p1, p2, p3, p4 to part-bar divs in order
let partCount = 0;
updatedHtml = updatedHtml.replace(/<div class="part-bar">/g, (match) => {
  const replacement = `<div class="part-bar p${partCount}">`;
  partCount++;
  return replacement;
});

fs.writeFileSync('index.html', updatedHtml, 'utf8');
console.log(`Updated index.html successfully with ${partCount} part-bars!`);

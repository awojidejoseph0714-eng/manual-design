const fs = require('fs');

const fileA = 'index.html';
const fileB = 'user_code.html';

const linesA = fs.readFileSync(fileA, 'utf8').split('\n');
const linesB = fs.readFileSync(fileB, 'utf8').split('\n');

console.log(`File A (current index.html) lines: ${linesA.length}`);
console.log(`File B (user_code.html) lines: ${linesB.length}`);

// Compare lines 128 to 500
const start = 128;
const limit = Math.min(linesA.length, linesB.length, 500);
let diffs = 0;
for (let i = start; i < limit; i++) {
  const cleanA = linesA[i].trim();
  const cleanB = linesB[i].trim();
  if (cleanA !== cleanB) {
    diffs++;
    console.log(`Diff at line ${i + 1}:`);
    console.log(`  Current: ${linesA[i]}`);
    console.log(`  User:    ${linesB[i]}`);
    if (diffs > 40) {
      console.log('Too many diffs, stopping...');
      break;
    }
  }
}

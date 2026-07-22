const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\user\\.gemini\\antigravity\\brain\\a0c69107-cba9-4fe6-aad7-9f47fdd70b72\\.system_generated\\logs\\transcript_full.jsonl';
const outPath = 'c:\\Users\\user\\Documents\\Codes\\Manual Design\\user_code.html';

try {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  
  let foundLine = null;
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    try {
      const data = JSON.parse(lines[i]);
      if (data.source === 'USER_EXPLICIT' && data.type === 'USER_INPUT') {
        const text = data.content || '';
        if (text.includes('i wrote a new code with adjustments')) {
          foundLine = text;
          console.log(`Found match at line index ${i}`);
          break;
        }
      }
    } catch (e) {
      // skip invalid lines
    }
  }

  if (foundLine) {
    let startIdx = foundLine.indexOf('<!DOCTYPE html>');
    if (startIdx === -1) {
      startIdx = foundLine.indexOf('<!doctype html>');
    }
    let htmlContent = startIdx !== -1 ? foundLine.substring(startIdx) : foundLine;
    
    // Write out the result
    fs.writeFileSync(outPath, htmlContent, 'utf8');
    console.log('Extraction completed successfully!');
  } else {
    console.log('Could not find the user message with adjustments in the logs.');
  }
} catch (err) {
  console.error('Error during extraction:', err);
}

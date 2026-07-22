const fs = require('fs');

function extractStyle(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const startIdx = content.indexOf('<style>');
  const endIdx = content.indexOf('</style>');
  if (startIdx !== -1 && endIdx !== -1) {
    return content.substring(startIdx + 7, endIdx);
  }
  return '';
}

fs.writeFileSync('index_css.css', extractStyle('index.html'), 'utf8');
fs.writeFileSync('user_css.css', extractStyle('user_code.html'), 'utf8');
console.log('CSS extracted successfully!');

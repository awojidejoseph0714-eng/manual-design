const fs = require('fs');
const path = require('path');

const lockPath = path.join(__dirname, '.git', 'index.lock');
if (fs.existsSync(lockPath)) {
  fs.unlinkSync(lockPath);
  console.log('Successfully removed stale git lock file.');
} else {
  console.log('No stale lock file found.');
}

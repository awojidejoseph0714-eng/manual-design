const { execSync } = require('child_process');

const cmd = process.argv.slice(2).join(' ');
if (!cmd) {
  console.log('Please provide a command to run.');
  process.exit(1);
}

try {
  const stdout = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
  console.log(stdout);
} catch (error) {
  console.error('Error executing command:');
  console.error(error.stdout || error.message);
  process.exit(1);
}

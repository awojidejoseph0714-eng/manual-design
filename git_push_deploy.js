const { execSync } = require('child_process');

function run(cmd) {
  console.log(`Running: ${cmd}`);
  try {
    const stdout = execSync(cmd, { encoding: 'utf8', stdio: 'inherit' });
    console.log(`Finished: ${cmd}\n`);
  } catch (error) {
    console.error(`Error running ${cmd}:`, error.message);
    process.exit(1);
  }
}

// Staging changes
run('git add .');

// Committing changes
run('git commit -m "Incorporated user styling adjustments for Notion-like B&W and per-part identity color coding"');

// Pushing to GitHub
run('git push origin master');

// Deploying to production on Vercel
run('vercel --prod --yes --scope awojidejoseph0714-8286s-projects');

console.log('Successfully completed all git and deployment tasks!');

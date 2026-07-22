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

// 1. Stage changes
run('git add .');

// 2. Commit changes
run('git commit -m "Migrated to Next.js App Router, integrated Sanity CMS, added Community Notes directory, secure Admin Portal, and spam protections"');

// 3. Push to master on GitHub
run('git push origin master');

// 4. Promote to production on Vercel
run('vercel --prod --yes --scope awojidejoseph0714-8286s-projects');

console.log('Successfully completed all git and Next.js deployment tasks!');

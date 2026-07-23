import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

const templatePath = path.join(process.cwd(), 'index.html.bak');

// GET raw template content
export async function GET(req: NextRequest) {
  try {
    const adminUser = req.headers.get('x-admin-user');
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: 'index.html.bak template file not found' }, { status: 404 });
    }

    const content = fs.readFileSync(templatePath, 'utf8');
    return NextResponse.json({ content });
  } catch (error: any) {
    console.error('Fetch template error:', error);
    return NextResponse.json({ error: 'Failed to read template content' }, { status: 500 });
  }
}

// POST update template and rebuild/deploy
export async function POST(req: NextRequest) {
  try {
    const adminUser = req.headers.get('x-admin-user');
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content } = await req.json();
    if (!content) {
      return NextResponse.json({ error: 'No content provided' }, { status: 400 });
    }

    // 1. Write the new template content to index.html.bak
    fs.writeFileSync(templatePath, content, 'utf8');

    // 2. Trigger converter and builder scripts
    // Running convert_to_next.js first to compile new index.html.bak into app/page.tsx
    exec('node convert_to_next.js', (err, stdout, stderr) => {
      if (err) {
        console.error('Error executing convert_to_next.js:', err);
        return;
      }
      console.log('Converter Output:', stdout);

      // Now trigger the git push & vercel deploy script in the background
      console.log('Triggering git push and Vercel rebuild...');
      exec('node git_push_deploy.js', (deployErr, deployOut) => {
        if (deployErr) {
          console.error('Error executing git_push_deploy.js:', deployErr);
          return;
        }
        console.log('Deploy script output:', deployOut);
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Template saved successfully! Recompiling and triggering Vercel rebuild in the background...'
    });
  } catch (error: any) {
    console.error('Save template error:', error);
    return NextResponse.json({ error: error.message || 'Operation failed' }, { status: 500 });
  }
}

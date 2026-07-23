import { NextRequest, NextResponse } from 'next/server';
import { getSanityWriteClient } from '@/lib/sanity';
import fs from 'fs';
import path from 'path';

const PAGE_CONTENT_KEY = 'mainPage';

// GET – fetch the current main page HTML from Sanity (falls back to index.html.bak)
export async function GET(req: NextRequest) {
  try {
    const adminUser = req.headers.get('x-admin-user');
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = getSanityWriteClient();
    const doc = await client.fetch(
      `*[_type == "pageContent" && key == $key][0]`,
      { key: PAGE_CONTENT_KEY }
    );

    if (doc && doc.htmlBody) {
      return NextResponse.json({ content: doc.htmlBody, source: 'sanity' });
    }

    // Fallback: read from local index.html.bak (for initial seeding)
    const templatePath = path.join(process.cwd(), 'index.html.bak');
    if (fs.existsSync(templatePath)) {
      const content = fs.readFileSync(templatePath, 'utf8');
      return NextResponse.json({ content, source: 'local' });
    }

    return NextResponse.json({ error: 'No page content found' }, { status: 404 });
  } catch (error: any) {
    console.error('Fetch template error:', error);
    return NextResponse.json({ error: error.message || 'Failed to read template content' }, { status: 500 });
  }
}

// POST – save updated main page HTML to Sanity
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

    const client = getSanityWriteClient();

    // Check if document already exists
    const existing = await client.fetch(
      `*[_type == "pageContent" && key == $key][0]._id`,
      { key: PAGE_CONTENT_KEY }
    );

    if (existing) {
      // Update existing document
      await client.patch(existing).set({ htmlBody: content }).commit();
    } else {
      // Create new document
      await client.create({
        _type: 'pageContent',
        key: PAGE_CONTENT_KEY,
        htmlBody: content,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Main page content saved to Sanity. Changes are live immediately.',
    });
  } catch (error: any) {
    console.error('Save template error:', error);
    return NextResponse.json({ error: error.message || 'Operation failed' }, { status: 500 });
  }
}

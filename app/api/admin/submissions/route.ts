import { NextRequest, NextResponse } from 'next/server';
import { getSanityWriteClient } from '@/lib/sanity';

// GET submissions list for authenticated admins
export async function GET(req: NextRequest) {
  try {
    // Middleware verifies JWT, but double check headers for security
    const adminUser = req.headers.get('x-admin-user');
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const writeClient = getSanityWriteClient();
    const query = '*[_type == "userSubmission"] | order(timestamp desc)';
    const submissions = await writeClient.fetch(query);

    return NextResponse.json({ submissions });
  } catch (error: any) {
    console.error('Fetch submissions error:', error);
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
  }
}

// POST to update/mutate submissions (promote to note or delete/resolve)
export async function POST(req: NextRequest) {
  try {
    const adminUser = req.headers.get('x-admin-user');
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, submissionId, email, question, title } = await req.json();
    const writeClient = getSanityWriteClient();

    if (action === 'delete') {
      await writeClient.delete(submissionId);
      return NextResponse.json({ success: true, message: 'Submission deleted' });
    }

    if (action === 'promote') {
      // 1. Create a draft communityNote post in Sanity
      // Using slug generated from title
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      await writeClient.create({
        _type: 'communityNote',
        title,
        slug: { _type: 'slug', current: slug },
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        tags: ['General'],
        // Seed answer with user question content
        answer: `<p><strong>Question submitted by community member:</strong></p><p><em>${question}</em></p><p>Draft deep-dive answer goes here. Replace this with 500-2000 words of engineering detail...</p>`,
      });

      // 2. Update submission status to 'promoted'
      await writeClient
        .patch(submissionId)
        .set({ status: 'promoted' })
        .commit();

      return NextResponse.json({ success: true, message: 'Successfully promoted to community note draft!' });
    }

    if (action === 'resolve') {
      await writeClient
        .patch(submissionId)
        .set({ status: 'resolved' })
        .commit();
      return NextResponse.json({ success: true, message: 'Submission resolved' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Submissions mutation error:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}

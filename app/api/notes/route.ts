import { NextRequest, NextResponse } from 'next/server';
import { sanityClient } from '@/lib/sanity';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');

    if (slug) {
      const query = `*[_type == "communityNote" && slug.current == $slug][0]`;
      const note = await sanityClient.fetch(query, { slug });
      return NextResponse.json(
        { note }, 
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
      );
    }

    const query = '*[_type == "communityNote"] | order(date desc)';
    const notes = await sanityClient.fetch(query);

    return NextResponse.json(
      { notes: notes || [] },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
    );
  } catch (error: any) {
    console.error('Server error fetching community notes from Sanity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes from Sanity', notes: [] },
      { status: 500, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
    );
  }
}

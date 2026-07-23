import { NextRequest, NextResponse } from 'next/server';
import { getSanityWriteClient } from '@/lib/sanity';

// GET all community notes
export async function GET(req: NextRequest) {
  try {
    const adminUser = req.headers.get('x-admin-user');
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const writeClient = getSanityWriteClient();
    const query = '*[_type == "communityNote"] | order(date desc)';
    const notes = await writeClient.fetch(query);

    return NextResponse.json({ notes });
  } catch (error: any) {
    console.error('Fetch notes error:', error);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

// POST create/edit/delete community notes
export async function POST(req: NextRequest) {
  try {
    const adminUser = req.headers.get('x-admin-user');
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const action = formData.get('action') as string;
    const writeClient = getSanityWriteClient();

    if (action === 'delete') {
      const noteId = formData.get('noteId') as string;
      if (!noteId) {
        return NextResponse.json({ error: 'Missing noteId' }, { status: 400 });
      }
      await writeClient.delete(noteId);
      return NextResponse.json({ success: true, message: 'Note deleted successfully!' });
    }

    if (action === 'create' || action === 'edit') {
      const title = formData.get('title') as string;
      const slugValue = formData.get('slug') as string;
      const date = formData.get('date') as string;
      const tagsString = formData.get('tags') as string;
      const answer = formData.get('answer') as string;
      const noteId = formData.get('noteId') as string;

      if (!title || !slugValue || !answer) {
        return NextResponse.json({ error: 'Missing title, slug, or answer' }, { status: 400 });
      }

      // Generate slug safely
      const cleanSlug = slugValue
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      // Handle Image Upload if present
      let imageReferenceObj = null;
      const file = formData.get('image');
      
      if (file && file instanceof File && file.size > 0) {
        console.log(`Uploading file ${file.name} to Sanity...`);
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const imageAsset = await writeClient.assets.upload('image', buffer, {
          filename: file.name,
          contentType: file.type,
        });
        imageReferenceObj = {
          _type: 'image',
          asset: {
            _type: 'reference',
            _ref: imageAsset._id,
          },
        };
      }

      const tags = tagsString ? tagsString.split(',').map(t => t.trim()).filter(Boolean) : [];

      const docData: any = {
        _type: 'communityNote',
        title,
        slug: { _type: 'slug', current: cleanSlug },
        date: date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        tags,
        answer,
      };

      if (imageReferenceObj) {
        docData.image = imageReferenceObj;
      }

      if (action === 'create') {
        const result = await writeClient.create(docData);
        return NextResponse.json({ success: true, note: result, message: 'Note created successfully!' });
      } else {
        if (!noteId) {
          return NextResponse.json({ error: 'Missing noteId for edit action' }, { status: 400 });
        }
        
        const patchBuilder = writeClient.patch(noteId).set(docData);
        
        // If image was cleared/not uploaded, but we don't want to overwrite existing image unless a new file was uploaded
        // imageReferenceObj is set only if a new file was uploaded. If the user didn't select a file, we keep the old image.
        const result = await patchBuilder.commit();
        return NextResponse.json({ success: true, note: result, message: 'Note updated successfully!' });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Notes CMS operation error:', error);
    return NextResponse.json({ error: error.message || 'Operation failed' }, { status: 500 });
  }
}

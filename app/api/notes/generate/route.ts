import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { getSanityWriteClient } from '@/lib/sanity';

export async function POST(req: NextRequest) {
  try {
    const { messages, context } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new NextResponse('Invalid chat history', { status: 400 });
    }

    // 1. Generate Title and Formatting using AI
    const formattingPrompt = `You are an expert technical editor. 
    Review the following conversation between a user and an AI teacher about structural engineering (BS 8110).
    Your task is to summarize the conversation into a title, a URL slug, and format the conversation into a clear HTML body for a "Community Note".
    
    RULES FOR HTML BODY:
    1. Use <h3> for the user's questions.
    2. Use standard <p>, <ul>, <li>, <strong>, <code>, and blockquotes for the AI's answers.
    3. Do NOT wrap the output in Markdown code blocks (like \`\`\`html). Output raw HTML string.
    4. Keep the content accurate to the conversation.
    5. Include a brief "Context" block at the top if context was provided, formatted as a blockquote.

    RETURN JSON FORMAT EXACTLY AS FOLLOWS (no markdown wrappers):
    {
      "title": "A concise, clear title of the main topic discussed",
      "slug": "a-short-url-friendly-slug",
      "htmlBody": "<div class=\\"note-context\\"><blockquote>...</blockquote></div><h3>Question...</h3><p>Answer...</p>"
    }

    CONVERSATION CONTEXT PROVIDED BY USER:
    ${context || 'None'}

    CONVERSATION HISTORY:
    ${messages.map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')}
    `;

    const result = await generateText({
      model: anthropic('claude-3-5-sonnet-20240620'),
      prompt: formattingPrompt,
      maxTokens: 2500,
      temperature: 0.1,
    });

    let parsedData;
    try {
      // Try to parse the JSON output (stripping any accidental markdown formatting the LLM might have added)
      const rawText = result.text.replace(/```json\n?|\n?```/g, '').trim();
      parsedData = JSON.parse(rawText);
    } catch (parseError) {
      console.error('Failed to parse AI output as JSON:', result.text);
      return new NextResponse('Failed to format note data from AI', { status: 500 });
    }

    // 2. Save to Sanity as a Draft
    const client = getSanityWriteClient();
    
    // Check if the auto-generated tag exists, else just push it
    const newNote = await client.create({
      _type: 'communityNote',
      title: parsedData.title,
      slug: { _type: 'slug', current: parsedData.slug },
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      tags: ['auto-generated', 'AI Teacher'],
      answer: parsedData.htmlBody,
      // Create as draft (Sanity draft documents are prefixed with "drafts.")
      // However, the easiest way to make a draft in Sanity via client.create is to prefix the _id manually
    });

    // Alternatively, to ensure it's a draft in Sanity studio, we prefix the ID:
    const draftId = `drafts.${newNote._id}`;
    
    // We recreate it with the draft ID to ensure it stays in draft state
    await client.createIfNotExists({
      _id: draftId,
      _type: 'communityNote',
      title: parsedData.title,
      slug: { _type: 'slug', current: parsedData.slug },
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      tags: ['auto-generated', 'AI Teacher'],
      answer: parsedData.htmlBody,
    });
    
    // delete the published one we accidentally made first
    await client.delete(newNote._id);

    return NextResponse.json({ success: true, noteId: draftId });

  } catch (error: any) {
    console.error('Generate Note Error:', error);
    return new NextResponse(error.message || 'An error occurred while generating the note', { status: 500 });
  }
}

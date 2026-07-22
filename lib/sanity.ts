import { createClient } from '@sanity/client';

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'your-project-id';
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
const apiVersion = '2021-10-21';

// Read-only client for client-side fetching (uses CDN)
export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
});

// Server-side write client (requires SANITY_API_WRITE_TOKEN in environment)
export function getSanityWriteClient() {
  const token = process.env.SANITY_API_WRITE_TOKEN;
  if (!token) {
    throw new Error('SANITY_API_WRITE_TOKEN is not configured in environment variables.');
  }
  return createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: false, // Don't use CDN for writes
    token,
  });
}

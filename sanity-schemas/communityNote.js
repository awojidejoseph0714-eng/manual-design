export default {
  name: 'communityNote',
  title: 'Community Note',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: Rule => Rule.required(),
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: Rule => Rule.required(),
    },
    {
      name: 'date',
      title: 'Publish Date',
      type: 'string',
      initialValue: () => new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    },
    {
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        layout: 'tags',
      },
    },
    {
      name: 'answer',
      title: 'Answer / Body (HTML/RichText)',
      type: 'text',
      description: 'The full explanation body. You can use standard HTML tags or write raw text.',
      validation: Rule => Rule.required(),
    },
  ],
}

export default {
  name: 'pageContent',
  title: 'Main Page Content',
  type: 'document',
  fields: [
    {
      name: 'key',
      title: 'Key',
      type: 'string',
      description: 'Unique identifier for this content block. Use "mainPage" for the home page.',
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'htmlBody',
      title: 'Page HTML Body',
      type: 'text',
      description: 'The full HTML content of the main page. Edited via the Admin Portal.',
      rows: 30,
    },
  ],
  preview: {
    select: {
      title: 'key',
    },
  },
}

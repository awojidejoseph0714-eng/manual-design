export default {
  name: 'userSubmission',
  title: 'User Submission',
  type: 'document',
  fields: [
    {
      name: 'email',
      title: 'User Email',
      type: 'string',
      readOnly: true,
    },
    {
      name: 'question',
      title: 'Submitted Question',
      type: 'text',
      readOnly: true,
    },
    {
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Pending', value: 'pending' },
          { title: 'Resolved', value: 'resolved' },
          { title: 'Promoted', value: 'promoted' },
        ],
      },
      initialValue: 'pending',
    },
    {
      name: 'timestamp',
      title: 'Submitted At',
      type: 'datetime',
      readOnly: true,
    },
  ],
}

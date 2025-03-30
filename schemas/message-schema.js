/**
 * JSON Schema for validating Synology Chat messages
 * 
 * This schema validates messages that can be sent to Synology Chat using the 
 * sendMessage decorator.
 */

// Action object schema (button)
const actionSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['button'] },
    text: { type: 'string' },
    name: { type: 'string' },
    value: { type: 'string' },
    style: { 
      type: 'string', 
      enum: ['green', 'grey', 'red', 'orange', 'blue', 'teal']
    }
  },
  required: ['type', 'name', 'text', 'value'],
  additionalProperties: false
};

// Attachment object schema
const attachmentSchema = {
  type: 'object',
  properties: {
    callback_id: { type: 'string' },
    text: { type: 'string' },
    actions: {
      type: 'array',
      items: actionSchema
    }
  },
  required: ['text'],
  additionalProperties: false
};

// Main message schema
const messageSchema = {
  oneOf: [
    // Option 1: Simple string message
    { type: 'string' },
    
    // Option 2: Object message with various properties
    {
      type: 'object',
      properties: {
        text: { type: 'string' },
        
        // File attachment
        file_url: { type: 'string', format: 'uri' },
        
        // Targeting specific users (array of user IDs)
        user_ids: { 
          type: 'array',
          items: { type: 'integer' }
        },
        
        // Attachments for interactive elements
        attachments: {
          type: 'array',
          items: attachmentSchema
        },
      },
      required: ['text'],
      additionalProperties: false
    }
  ]
};

export { messageSchema };

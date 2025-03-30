# fastify-synology-chat

[![npm version](https://img.shields.io/npm/v/fastify-synology-chat)](https://www.npmjs.com/package/fastify-synology-chat)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-neostandard-brightgreen.svg)](https://github.com/neomjs/eslint-config-neo)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

A Fastify plugin for easy integration with Synology Chat's webhook functionality.

## Features

- Simple webhook endpoint for receiving Synology Chat messages
- Send messages to Synology Chat channels using a convenient decorator
- Handles both JSON and form-encoded webhook formats 
- Customizable route path
- Support for text messages and file uploads
- Easy message handling through callback function
- Full TypeScript support

## Installation

```bash
npm install fastify-synology-chat
```

## Usage

```javascript
import Fastify from 'fastify'
import synologyChat from 'fastify-synology-chat'

const fastify = Fastify()

// Register the plugin
fastify.register(synologyChat, {
  // Options (all are optional)
  path: '/webhook',      // Default: '/synology-chat'
  webhookUrl: 'https://your-synology-chat-webhook-url',
  onMessage: (payload) => {
    console.log('Received message:', payload.text)
    // Return a response to Synology Chat
    return { text: 'Message received!' }
  }
})

// Send message using the decorator
fastify.get('/send-message', async (request, reply) => {
  const result = await fastify.synologyChat.sendMessage('Hello from Fastify!')
  return { success: true, result }
})

fastify.listen({ port: 3000 })
```

### Plugin Options

| Option       | Type       | Default           | Description                                       |
|--------------|------------|-------------------|---------------------------------------------------|
| `path`       | `string`   | `/synology-chat`  | URL path for the webhook endpoint                 |
| `onMessage`  | `Function` | `() => ({success: true})` | Callback function for handling webhook messages |
| `required`   | `boolean`  | `false`           | Whether the onMessage callback is required        |
| `webhookUrl` | `string`   | `null`            | Synology Chat incoming webhook URL for sending messages |

### Webhook Payload

Synology Chat sends webhooks in two formats which are both supported by this plugin:

#### JSON Format

```typescript
interface SynologyChatPayload {
  text: string;         // The message text
  file_url?: string;    // Optional URL to a file
}
```

#### Form-encoded Format

Synology Chat may also send the webhook as `application/x-www-form-urlencoded` data in two ways:

1. With a `payload` parameter containing a JSON string:
```
payload={"text": "Message text", "file_url": "http://example.com/file.jpg"}
```

2. With direct form parameters:
```
text=Message text&file_url=http://example.com/file.jpg
```

Both formats are automatically handled by the plugin.

### Response Format

The `onMessage` callback can return:

- An object: Will be sent as JSON response
- A string: Will be sent as plain text response
- `undefined` or `null`: Will send a default `{ success: true }` response

## Receiving Messages

### Basic Usage

```javascript
import Fastify from 'fastify'
import synologyChat from 'fastify-synology-chat'

const fastify = Fastify()

fastify.register(synologyChat, {
  onMessage: (payload) => {
    console.log('Received message:', payload.text)
    
    // Process the message
    if (payload.text.includes('hello')) {
      return { text: 'Hello to you too!' }
    }
    
    return { text: 'Message received!' }
  }
})

fastify.listen({ port: 3000 })
```

### Advanced Response

```javascript
fastify.register(synologyChat, {
  onMessage: (payload) => {
    // Return a more complex response
    return {
      text: 'Here are some options:',
      attachments: [
        {
          text: 'Choose an action:',
          actions: [
            {
              type: 'button',
              name: 'approve',
              text: 'Approve',
              value: 'approve_action',
              style: 'green'
            },
            {
              type: 'button',
              name: 'reject',
              text: 'Reject',
              value: 'reject_action',
              style: 'red'
            }
          ]
        }
      ]
    }
  }
})
```

## Sending Messages

The plugin adds a `synologyChat` decorator to your Fastify instance with a `sendMessage` method that allows you to easily send messages to Synology Chat. All messages are validated against a JSON schema to ensure compatibility with Synology Chat's API.

### Basic Sending

```javascript
// Simple text message
// When using a webhook connected to a channel, no user_ids are needed
await fastify.synologyChat.sendMessage({
  text: 'Hello from Fastify!'
})

// Message targeting specific users
await fastify.synologyChat.sendMessage({
  text: 'Hello from Fastify!',
  user_ids: [1, 2, 3]  // Replace with actual user IDs
})

// Message with formatted text
await fastify.synologyChat.sendMessage({
  text: 'Check out this link: <https://example.com|Click here>',
  user_ids: [5]  // Optional, if your webhook isn't connected to a channel
})
```

### Rich Messages with Attachments

```javascript
// Complex message with attachments and buttons
await fastify.synologyChat.sendMessage({
  text: '📊 **Monthly Report**',
  user_ids: [1, 2, 3],  // Optional if your webhook is connected to a channel
  attachments: [
    {
      text: 'Sales have increased by 20% compared to last month.',
      actions: [
        {
          type: 'button',
          name: 'view_report',
          text: 'View Full Report',
          value: 'view_full_report',
          style: 'blue'
        },
        {
          type: 'button',
          name: 'export_data',
          text: 'Export Data',
          value: 'export_report_data',
          style: 'green'
        }
      ]
    }
  ]
})
```

### Message Validation

Messages sent via `synologyChat.sendMessage()` are strictly validated to ensure they match Synology Chat's API requirements. The validation enforces the following rules:

- String messages are directly allowed
- Object messages must have a `text` property
- `user_ids` must be an array of integers
- `file_url` must be a valid URL string
- `attachments` must be an array of attachment objects
- Each attachment must have a `text` property
- Button actions must have `type`, `name`, `text`, and `value` properties
- Button `style` must be one of: 'green', 'grey', 'red', 'orange', 'blue', 'teal'
- No additional properties are allowed in objects (strict schema validation)

If validation fails, an error will be thrown with details about the validation failures.

### Using Custom Webhook URL

You can override the default webhook URL by passing a second parameter to `sendMessage`:

```javascript
// Send to a different Synology Chat webhook
await fastify.synologyChat.sendMessage(
  {
    text: 'This message is sent to a specific channel',
    // Include user_ids if needed
    // user_ids: [1, 2, 3]
  },
  'https://your-custom-webhook-url'
)
```

## Synology Chat Configuration

1. In your Synology Chat, click your profile picture and select "Integration"
2. Choose "Incoming Webhooks" and create a new webhook
3. Configure the webhook to point to your Fastify server URL (e.g., `http://your-server:3000/synology-chat`)
4. Copy the generated webhook URL to use with the `webhookUrl` option or for sending messages

## License

MIT

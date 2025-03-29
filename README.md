# fastify-synology-chat

[![npm version](https://img.shields.io/npm/v/fastify-synology-chat)](https://www.npmjs.com/package/fastify-synology-chat)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-neostandard-brightgreen.svg)](https://github.com/neomjs/eslint-config-neo)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

A Fastify plugin for easy integration with Synology Chat's webhook functionality.

## Features

- Simple webhook endpoint for receiving Synology Chat messages
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
  onMessage: (payload) => {
    console.log('Received message:', payload.text)
    // Return a response to Synology Chat
    return { text: 'Message received!' }
  }
})

fastify.listen({ port: 3000 })
```

### Plugin Options

| Option     | Type       | Default           | Description                                       |
|------------|------------|-------------------|---------------------------------------------------|
| `path`     | `string`   | `/synology-chat`  | URL path for the webhook endpoint                 |
| `onMessage`| `Function` | `() => ({success: true})` | Callback function for handling webhook messages |
| `required` | `boolean`  | `false`           | Whether the onMessage callback is required        |

### Webhook Payload

The payload from Synology Chat follows this structure:

```typescript
interface SynologyChatPayload {
  text: string;         // The message text
  file_url?: string;    // Optional URL to a file
}
```

### Response Format

The `onMessage` callback can return:

- An object: Will be sent as JSON response
- A string: Will be sent as plain text response
- `undefined` or `null`: Will send a default `{ success: true }` response

## Examples

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

## Synology Chat Configuration

1. In your Synology Chat, click your profile picture and select "Integration"
2. Choose "Incoming Webhooks" and create a new webhook
3. Configure the webhook to point to your Fastify server URL (e.g., `http://your-server:3000/synology-chat`)
4. Use the generated webhook URL to send messages to your Fastify application

## License

MIT

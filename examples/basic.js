/**
 * Basic example of fastify-synology-chat plugin
 * 
 * You can test this with curl:
 * curl -X POST http://localhost:3000/webhook -H "Content-Type: application/json" -d '{"text":"Hello from Synology Chat!"}'
 */

import Fastify from 'fastify'
import synologyChat from '../index.js'

const fastify = Fastify({
  logger: true
})

// Register the plugin with custom options
fastify.register(synologyChat, {
  path: '/webhook',
  onMessage: async (payload) => {
    console.log('Received webhook payload:', payload)
    
    // You could process the message here, integrate with other services, etc.
    
    // Return a response to Synology Chat
    return {
      text: `Echo: ${payload.text}`,
      // You can include attachments or other response fields as needed
      attachments: [
        {
          text: 'This is an attachment',
          actions: [
            {
              type: 'button',
              name: 'action_button',
              text: 'Click me',
              value: 'button_click',
              style: 'green'
            }
          ]
        }
      ]
    }
  }
})

// Start the server
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()

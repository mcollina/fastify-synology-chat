/**
 * Example demonstrating how to use the sendMessage decorator
 * 
 * This example shows:
 * - Setting up the plugin with a webhook URL
 * - Sending simple text messages
 * - Sending messages with attachments and buttons
 * - Using the decorator from a route handler
 * 
 * To run this example, replace 'YOUR_WEBHOOK_URL' with your actual Synology Chat webhook URL
 */

import Fastify from 'fastify'
import synologyChat from '../index.js'

const OUTGOING = process.env.SYNOLOGY_OUTGOING

const fastify = Fastify({
  logger: true
})

// Register the plugin with your webhook URL
fastify.register(synologyChat, {
  // The webhook URL for sending messages to Synology Chat
  webhookUrl: 'YOUR_WEBHOOK_URL',
  
  // You can still handle incoming webhooks too
  path: '/incoming-webhook',
  onMessage: (payload) => {
    console.log('Received webhook payload:', payload)
    return { text: 'Webhook received!' }
  }
})

// Add a route to test sending a simple message
fastify.get('/send-simple', async (request, reply) => {
  try {
    // Send a simple text message
    const result = await fastify.synologyChat.sendMessage('Hello from Fastify!', OUTGOING)
    
    return {
      success: true,
      message: 'Message sent successfully',
      result
    }
  } catch (err) {
    request.log.error(err)
    return reply.code(500).send({
      success: false,
      error: err.message
    })
  }
})

// Add a route to test sending a message with attachments and buttons
fastify.get('/send-complex', async (request, reply) => {
  try {
    // Send a complex message with attachments and buttons
    const message = {
      text: '📊 **Monthly Report**',
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
    }
    
    const result = await fastify.synologyChat.sendMessage(message)
    
    return {
      success: true,
      message: 'Complex message sent successfully',
      result
    }
  } catch (err) {
    request.log.error(err)
    return reply.code(500).send({
      success: false,
      error: err.message
    })
  }
})

// Add a route to demonstrate sending to a different webhook URL
fastify.get('/send-custom', async (request, reply) => {
  try {
    // You can specify a different webhook URL per message
    const result = await fastify.synologyChat.sendMessage(
      'This message is sent to a different webhook URL',
      'YOUR_ALTERNATIVE_WEBHOOK_URL'
    )
    
    return {
      success: true,
      message: 'Message sent to custom webhook',
      result
    }
  } catch (err) {
    request.log.error(err)
    return reply.code(500).send({
      success: false,
      error: err.message
    })
  }
})

// Start the server
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' })
    console.log('Server is running on port 3000')
    console.log('Available endpoints:')
    console.log('- GET /send-simple - Send a simple text message')
    console.log('- GET /send-complex - Send a message with attachments and buttons')
    console.log('- GET /send-custom - Send a message to a custom webhook URL')
    console.log('- POST /incoming-webhook - Receive incoming webhook messages from Synology Chat')
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()

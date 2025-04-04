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

// Get webhook URL from environment variable if available
const WEBHOOK_URL = process.env.SYNOLOGY_WEBHOOK_URL || 'YOUR_WEBHOOK_URL'

const fastify = Fastify({
  logger: true
})

// Define schemas for query parameters
const queryStringSchema = {
  schema: {
    querystring: {
      type: 'object',
      properties: {
        user: {
          anyOf: [
            { type: 'string' },
            { type: 'array', items: { type: 'string' } }
          ]
        },
        text: { type: 'string' }
      }
    }
  }
}

const customWebhookSchema = {
  schema: {
    querystring: {
      type: 'object',
      properties: {
        user: {
          anyOf: [
            { type: 'string' },
            { type: 'array', items: { type: 'string' } }
          ]
        },
        text: { type: 'string' },
        webhook: { type: 'string', format: 'uri' }
      }
    }
  }
}

// Register the plugin with your webhook URL
fastify.register(synologyChat, {
  // The webhook URL for sending messages to Synology Chat
  webhookUrl: WEBHOOK_URL,
  
  // You can still handle incoming webhooks too
  path: '/incoming-webhook',
  onMessage: (payload) => {
    console.log('Received webhook payload:', payload)
    
    // Check if this is a button callback
    if (payload.actions && payload.callback_id) {
      const action = payload.actions[0]
      console.log(`Button clicked: ${action.name} with value: ${action.value}`)
      
      // Handle different button actions
      if (payload.callback_id === 'monthly_report') {
        if (action.name === 'view_report') {
          return { text: 'Showing monthly report details...' }
        } else if (action.name === 'export_data') {
          return { text: 'Exporting report data...' }
        }
      }
      
      // Default response for unknown buttons
      return { text: `Button '${action.name}' clicked with value '${action.value}'` }
    }
    
    // Default response for regular messages
    return { text: 'Webhook received!' }
  }
})

// Add a route to test sending a simple message
fastify.get('/send-simple', queryStringSchema, async (request, reply) => {
  try {
    // Get user_ids from query parameters if provided
    // Example: /send-simple?user=1&user=2&user=3
    let userIds;
    try {
      if (request.query.user) {
        if (Array.isArray(request.query.user)) {
          userIds = request.query.user.map(id => parseInt(id, 10));
          console.log(`Processing multiple users: ${JSON.stringify(userIds)}`);
        } else {
          userIds = [parseInt(request.query.user, 10)];
          console.log(`Processing single user: ${userIds[0]}`);
        }
        // Filter out any NaN values
        userIds = userIds.filter(id => !isNaN(id));
        if (userIds.length === 0) {
          console.warn('Warning: All user IDs were invalid numbers');
          userIds = undefined;
        }
      }
    } catch (err) {
      console.error('Error parsing user IDs:', err);
      userIds = undefined;
    }
    
    // Send a simple text message with necessary user_ids or to webhook connected to a channel
    // Try different formats for user IDs based on Synology Chat documentation
    const messagePayload = {
      text: request.query.text || 'Hello from Fastify!'
    };
    
    if (userIds && userIds.length > 0) {
      messagePayload.user_ids = userIds;
    }
    
    const result = await fastify.synologyChat.sendMessage(messagePayload)
    
    return {
      success: true,
      message: 'Message sent successfully',
      to: userIds ? `users: ${JSON.stringify(userIds)}` : 'channel',
      sent: messagePayload,
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
fastify.get('/send-complex', queryStringSchema, async (request, reply) => {
  try {
    // Get user_ids from query parameters if provided
    // Example: /send-complex?user=1&user=2&user=3
    let userIds;
    try {
      if (request.query.user) {
        if (Array.isArray(request.query.user)) {
          userIds = request.query.user.map(id => parseInt(id, 10));
          console.log(`Processing multiple users: ${JSON.stringify(userIds)}`);
        } else {
          userIds = [parseInt(request.query.user, 10)];
          console.log(`Processing single user: ${userIds[0]}`);
        }
        // Filter out any NaN values
        userIds = userIds.filter(id => !isNaN(id));
        if (userIds.length === 0) {
          console.warn('Warning: All user IDs were invalid numbers');
          userIds = undefined;
        }
      }
    } catch (err) {
      console.error('Error parsing user IDs:', err);
      userIds = undefined;
    }
    
    // Send a complex message with attachments and buttons
    const message = {
      text: request.query.text || '📊 **Monthly Report**',
      attachments: [
        {
          text: 'Sales have increased by 20% compared to last month.',
          callback_id: 'monthly_report',  // Adding the required callback_id
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
    
    // Add user_ids if we have any
    if (userIds && userIds.length > 0) {
      message.user_ids = userIds;
      console.log(`Adding user_ids: ${JSON.stringify(userIds)}`);
    }
    
    const result = await fastify.synologyChat.sendMessage(message)
    
    return {
      success: true,
      message: 'Complex message sent successfully',
      to: userIds ? `users: ${JSON.stringify(userIds)}` : 'channel',
      sent: message,
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
fastify.get('/send-custom', customWebhookSchema, async (request, reply) => {
  try {
    // Get user_ids from query parameters if provided
    // Example: /send-custom?user=1&user=2&user=3&webhook=https://your-webhook-url
    let userIds;
    try {
      if (request.query.user) {
        if (Array.isArray(request.query.user)) {
          userIds = request.query.user.map(id => parseInt(id, 10));
          console.log(`Processing multiple users: ${JSON.stringify(userIds)}`);
        } else {
          userIds = [parseInt(request.query.user, 10)];
          console.log(`Processing single user: ${userIds[0]}`);
        }
        // Filter out any NaN values
        userIds = userIds.filter(id => !isNaN(id));
        if (userIds.length === 0) {
          console.warn('Warning: All user IDs were invalid numbers');
          userIds = undefined;
        }
      }
    } catch (err) {
      console.error('Error parsing user IDs:', err);
      userIds = undefined;
    }
    
    // Get custom webhook URL from query parameter if provided
    const webhookUrl = request.query.webhook || process.env.SYNOLOGY_ALT_WEBHOOK_URL || 'YOUR_ALTERNATIVE_WEBHOOK_URL';
    
    // Create the message payload
    const messagePayload = {
      text: request.query.text || 'This message is sent to a different webhook URL',
    };
    
    // Add user_ids if we have any
    if (userIds && userIds.length > 0) {
      messagePayload.user_ids = userIds;
      console.log(`Adding user_ids: ${JSON.stringify(userIds)}`);
    }
    
    // You can specify a different webhook URL per message
    const result = await fastify.synologyChat.sendMessage(
      messagePayload,
      webhookUrl
    )
    
    return {
      success: true,
      message: 'Message sent to custom webhook',
      to: userIds ? `users: ${JSON.stringify(userIds)}` : 'channel',
      sent: messagePayload,
      webhookUrl: webhookUrl === 'YOUR_ALTERNATIVE_WEBHOOK_URL' ? 
        '(placeholder - please provide a real webhook URL)' : 
        webhookUrl.split('?')[0], // Only show the base URL without query parameters for privacy
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
    console.log('\nAvailable endpoints:')
    console.log('- GET /send-simple - Send a simple text message')
    console.log('  Query params: user=[id] (can be multiple), text=[message]')
    console.log('  Example: /send-simple?user=1&user=2&text=Hello%20there!')
    
    console.log('- GET /send-complex - Send a message with attachments and buttons')
    console.log('  Query params: user=[id] (can be multiple), text=[message]')
    console.log('  Example: /send-complex?user=3&text=Important%20update')
    
    console.log('- GET /send-custom - Send a message to a custom webhook URL')
    console.log('  Query params: user=[id], text=[message], webhook=[url]')
    console.log('  Example: /send-custom?webhook=https://your-webhook.url&text=Test')
    
    console.log('- POST /incoming-webhook - Receive incoming webhook messages from Synology Chat')
    
    if (WEBHOOK_URL === 'YOUR_WEBHOOK_URL') {
      console.log('\n⚠️ IMPORTANT: You need to set your actual Synology Chat webhook URL:')
      console.log('  - Edit this file and replace YOUR_WEBHOOK_URL with your actual webhook URL, or')
      console.log('  - Set the SYNOLOGY_WEBHOOK_URL environment variable')
    }
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()

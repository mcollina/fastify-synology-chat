/**
 * Fastify plugin for Synology Chat integration
 * 
 * @module fastify-synology-chat
 */

import fp from 'fastify-plugin'

/**
 * Synology Chat webhook plugin for Fastify
 * 
 * @param {FastifyInstance} fastify - Fastify instance
 * @param {Object} options - Plugin options
 * @param {string} [options.path='/synology-chat'] - URL path for the webhook endpoint
 * @param {Function} [options.onMessage] - Callback function called when a webhook is received
 * @param {boolean} [options.required=false] - Whether onMessage callback is required
 */
async function synologyChat (fastify, options) {
  const {
    path = '/synology-chat',
    onMessage = defaultHandler,
    required = false
  } = options

  // Validate options
  if (required && typeof onMessage === 'function' && onMessage === defaultHandler) {
    throw new Error('onMessage callback is required when required option is true')
  }

  if (typeof onMessage !== 'function') {
    throw new Error('onMessage must be a function')
  }

  // Schema for webhook payload validation
  const webhookSchema = {
    body: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        file_url: { type: 'string' },
        user_ids: { 
          type: 'array',
          items: { type: 'number' }
        },
        attachments: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              callback_id: { type: 'string' },
              text: { type: 'string' },
              actions: {
                type: 'array',
                items: {
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
                  required: ['type', 'name', 'text', 'value']
                }
              }
            },
            required: ['text']
          }
        }
      },
      required: ['text'],
      additionalProperties: true
    }
  }

  // Register the webhook endpoint
  fastify.post(path, { schema: webhookSchema }, async (request, reply) => {
    try {
      // Call the provided handler
      const result = await onMessage(request.body)
      
      // Handle different response types
      if (result === undefined || result === null) {
        return { success: true }
      }
      
      return result
    } catch (err) {
      request.log.error({ err }, 'Error processing Synology Chat webhook')
      return reply.code(500).send({ 
        success: false,
        error: err.message
      })
    }
  })
}

/**
 * Default handler when no onMessage callback is provided
 * 
 * @param {Object} payload - Webhook payload
 * @returns {Object} Success response
 */
function defaultHandler (payload) {
  return { success: true }
}

export default fp(synologyChat, {
  fastify: '>=4.0.0',
  name: 'fastify-synology-chat'
})

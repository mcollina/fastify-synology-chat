/**
 * Advanced example of fastify-synology-chat plugin
 * 
 * Features:
 * - Custom webhook path
 * - Integration with external service
 * - Complex response with attachments
 * 
 * You can test this with curl:
 * curl -X POST http://localhost:3000/custom-webhook -H "Content-Type: application/json" -d '{"text":"status"}'
 */

import Fastify from 'fastify'
import synologyChat from '../index.js'

const fastify = Fastify({
  logger: true
})

// Mock database or external service
const mockSystemStatus = {
  servers: [
    { name: 'Web Server', status: 'online', uptime: '99.9%' },
    { name: 'Database', status: 'online', uptime: '99.7%' },
    { name: 'Cache', status: 'degraded', uptime: '95.3%' }
  ],
  lastUpdated: new Date().toISOString()
}

// Register the plugin with advanced options
fastify.register(synologyChat, {
  path: '/custom-webhook',
  onMessage: async (payload) => {
    console.log('Received webhook payload:', payload)
    
    // Check for specific command
    if (payload.text.toLowerCase().includes('status')) {
      // Generate status report from mock database
      const statusButtons = mockSystemStatus.servers.map(server => {
        const style = server.status === 'online' ? 'green' : server.status === 'degraded' ? 'orange' : 'red'
        
        return {
          type: 'button',
          name: `status_${server.name.toLowerCase().replace(' ', '_')}`,
          text: `${server.name}: ${server.status.toUpperCase()}`,
          value: server.name,
          style
        }
      })
      
      return {
        text: '📊 **System Status Report**',
        attachments: [
          {
            text: `Last updated: ${mockSystemStatus.lastUpdated}`,
            actions: statusButtons
          },
          {
            text: 'Actions',
            actions: [
              {
                type: 'button',
                name: 'refresh',
                text: 'Refresh Status',
                value: 'refresh_status',
                style: 'blue'
              },
              {
                type: 'button',
                name: 'alert',
                text: 'Send Alert',
                value: 'send_alert',
                style: 'red'
              }
            ]
          }
        ]
      }
    }
    
    // Default response
    return {
      text: 'Command not recognized. Try "status" to see system status.'
    }
  }
})

// Start the server
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' })
    console.log('Server is running on port 3000')
    console.log('Try sending a webhook message to /custom-webhook')
    console.log('Example: curl -X POST http://localhost:3000/custom-webhook -H "Content-Type: application/json" -d \'{"text":"status"}\'')
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()

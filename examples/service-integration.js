/**
 * Example showing how to integrate the Synology Chat webhook with a service
 * 
 * This example demonstrates:
 * - Using the webhook as a ChatOps tool
 * - Integrating with a service layer
 * - Parsing commands from chat messages
 * 
 * You can test this with curl:
 * curl -X POST http://localhost:3000/chatops -H "Content-Type: application/json" -d '{"text":"deploy staging app1"}'
 */

import Fastify from 'fastify'
import synologyChat from '../index.js'

const fastify = Fastify({
  logger: true
})

// Mock deployment service
class DeploymentService {
  constructor() {
    this.environments = ['production', 'staging', 'development']
    this.applications = ['app1', 'app2', 'api-service', 'web-frontend']
    this.deployments = []
  }

  async deploy(environment, application) {
    if (!this.environments.includes(environment)) {
      throw new Error(`Invalid environment: ${environment}. Valid options: ${this.environments.join(', ')}`)
    }
    
    if (!this.applications.includes(application)) {
      throw new Error(`Invalid application: ${application}. Valid options: ${this.applications.join(', ')}`)
    }
    
    // Simulate deployment
    const deploymentId = `deploy-${Date.now()}`
    const deployment = {
      id: deploymentId,
      environment,
      application,
      status: 'in_progress',
      startTime: new Date().toISOString(),
      endTime: null
    }
    
    this.deployments.push(deployment)
    
    // Simulate async deployment process
    setTimeout(() => {
      const index = this.deployments.findIndex(d => d.id === deploymentId)
      if (index !== -1) {
        this.deployments[index].status = 'completed'
        this.deployments[index].endTime = new Date().toISOString()
      }
    }, 5000) // Simulate 5 second deployment
    
    return deploymentId
  }
  
  async getDeploymentStatus(deploymentId) {
    const deployment = this.deployments.find(d => d.id === deploymentId)
    if (!deployment) {
      throw new Error(`Deployment not found: ${deploymentId}`)
    }
    return deployment
  }
  
  async listDeployments() {
    return [...this.deployments]
  }
}

// Create service instance
const deploymentService = new DeploymentService()

// Command parser function
function parseCommand(text) {
  const commandPattern = /^deploy\s+(\w+)\s+(\S+)$/i
  const match = text.match(commandPattern)
  
  if (match) {
    return {
      command: 'deploy',
      environment: match[1].toLowerCase(),
      application: match[2].toLowerCase()
    }
  }
  
  if (text.toLowerCase() === 'list deployments') {
    return {
      command: 'list'
    }
  }
  
  return { command: 'unknown' }
}

// Register the plugin with service integration
fastify.register(synologyChat, {
  path: '/chatops',
  onMessage: async (payload) => {
    try {
      const parsedCommand = parseCommand(payload.text)
      
      switch (parsedCommand.command) {
        case 'deploy': {
          const { environment, application } = parsedCommand
          const deploymentId = await deploymentService.deploy(environment, application)
          
          return {
            text: `🚀 Started deployment of ${application} to ${environment}`,
            attachments: [
              {
                text: `Deployment ID: ${deploymentId}`,
                actions: [
                  {
                    type: 'button',
                    name: 'check_status',
                    text: 'Check Status',
                    value: deploymentId,
                    style: 'blue'
                  }
                ]
              }
            ]
          }
        }
        
        case 'list': {
          const deployments = await deploymentService.listDeployments()
          
          if (deployments.length === 0) {
            return {
              text: 'No deployments found.'
            }
          }
          
          const deploymentsList = deployments.map(d => {
            const status = d.status === 'completed' ? '✅' : d.status === 'in_progress' ? '⏳' : '❓'
            return `${status} ${d.application} to ${d.environment} (${d.id})`
          }).join('\n')
          
          return {
            text: '📋 **Deployments List**\n' + deploymentsList
          }
        }
        
        default:
          return {
            text: 'Unknown command. Available commands:\n- `deploy [environment] [application]`\n- `list deployments`',
            attachments: [
              {
                text: 'Available Environments and Applications',
                callback_id: 'deployment_info',
                actions: [
                  {
                    type: 'button',
                    name: 'show_environments',
                    text: 'Show Environments',
                    value: 'environments',
                    style: 'green'
                  },
                  {
                    type: 'button',
                    name: 'show_applications',
                    text: 'Show Applications',
                    value: 'applications',
                    style: 'green'
                  }
                ]
              }
            ]
          }
      }
    } catch (error) {
      return {
        text: `⚠️ Error: ${error.message}`
      }
    }
  }
})

// Start the server
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' })
    console.log('ChatOps server is running on port 3000')
    console.log('Try sending a webhook message to /chatops')
    console.log('Example commands:')
    console.log('- curl -X POST http://localhost:3000/chatops -H "Content-Type: application/json" -d \'{"text":"deploy staging app1"}\'')
    console.log('- curl -X POST http://localhost:3000/chatops -H "Content-Type: application/json" -d \'{"text":"list deployments"}\'')
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()

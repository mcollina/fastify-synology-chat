import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import Fastify from 'fastify'
import synologyChat from '../index.js'

test('handles button callback payloads with callback_id', async (t) => {
  const fastify = Fastify()
  let receivedPayload = null

  fastify.register(synologyChat, {
    onMessage: (payload) => {
      receivedPayload = payload
      return { text: 'Button action received: ' + payload.actions[0].value }
    }
  })

  await fastify.ready()

  // Simulate a button callback payload
  const response = await fastify.inject({
    method: 'POST',
    url: '/synology-chat',
    payload: {
      actions: [
        {
          type: 'button',
          name: 'view_report',
          value: 'view_full_report'
        }
      ],
      callback_id: 'monthly_report',
      token: 'example_token',
      post_id: '123456',
      user: {
        user_id: 42,
        username: 'test_user'
      }
    }
  })

  assert.equal(response.statusCode, 200)
  assert.equal(response.json().text, 'Button action received: view_full_report')
  assert.equal(receivedPayload.callback_id, 'monthly_report')
  assert.equal(receivedPayload.actions[0].name, 'view_report')
  assert.equal(receivedPayload.actions[0].value, 'view_full_report')
})

test('handles URL-encoded button callback payloads', async (t) => {
  const fastify = Fastify()
  let receivedPayload = null

  fastify.register(synologyChat, {
    onMessage: (payload) => {
      receivedPayload = payload
      return { text: 'Button action received: ' + payload.actions[0].value }
    }
  })

  await fastify.ready()

  // Create a form-urlencoded request with a payload parameter containing a button callback
  const formData = new URLSearchParams()
  const callbackPayload = {
    actions: [
      {
        type: 'button',
        name: 'export_data',
        value: 'export_report_data'
      }
    ],
    callback_id: 'monthly_report',
    token: 'example_token',
    post_id: '123456',
    user: {
      user_id: 42,
      username: 'test_user'
    }
  }
  
  formData.append('payload', JSON.stringify(callbackPayload))

  const response = await fastify.inject({
    method: 'POST',
    url: '/synology-chat',
    headers: {
      'content-type': 'application/x-www-form-urlencoded'
    },
    payload: formData.toString()
  })

  assert.equal(response.statusCode, 200)
  assert.equal(response.json().text, 'Button action received: export_report_data')
  assert.equal(receivedPayload.callback_id, 'monthly_report')
  assert.equal(receivedPayload.actions[0].name, 'export_data')
  assert.equal(receivedPayload.actions[0].value, 'export_report_data')
})

test('validates a message with attachments and buttons including callback_id', async (t) => {
  const fastify = Fastify()
  
  // Mock fetch implementation
  global.fetch = async (url, options) => {
    // Check proper format: payload=JSON
    assert.ok(options.body.startsWith('payload='))
    const jsonStr = options.body.substring('payload='.length)
    const payload = JSON.parse(jsonStr)
    
    // Validate the message structure
    assert.equal(payload.text, '📊 Monthly Report')
    assert.equal(Array.isArray(payload.attachments), true)
    assert.equal(payload.attachments.length, 1)
    assert.equal(payload.attachments[0].text, 'Sales have increased by 20% compared to last month.')
    assert.equal(payload.attachments[0].callback_id, 'monthly_report')
    
    // Validate actions
    assert.equal(Array.isArray(payload.attachments[0].actions), true)
    assert.equal(payload.attachments[0].actions.length, 2)
    assert.equal(payload.attachments[0].actions[0].type, 'button')
    assert.equal(payload.attachments[0].actions[0].name, 'view_report')
    assert.equal(payload.attachments[0].actions[0].text, 'View Full Report')
    assert.equal(payload.attachments[0].actions[0].value, 'view_full_report')
    
    return {
      ok: true,
      json: async () => ({ success: true }),
      text: async () => ''
    }
  }
  
  await fastify.register(synologyChat, {
    webhookUrl: 'https://example.com/webhook'
  })
  await fastify.ready()
  
  const complexMessage = {
    text: '📊 Monthly Report',
    attachments: [
      {
        text: 'Sales have increased by 20% compared to last month.',
        callback_id: 'monthly_report',
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
  
  const result = await fastify.synologyChat.sendMessage(complexMessage)
  assert.deepEqual(result, { success: true })
  
  // Restore fetch
  delete global.fetch
})

test('rejects a message with attachments and buttons but missing callback_id', async (t) => {
  const fastify = Fastify()
  await fastify.register(synologyChat, {
    webhookUrl: 'https://example.com/webhook'
  })
  
  // We don't need to mock fetch here since validation will fail before fetch is called
  await fastify.ready()
  
  const invalidMessage = {
    text: '📊 Monthly Report',
    attachments: [
      {
        text: 'Sales have increased by 20% compared to last month.',
        // Missing callback_id
        actions: [
          {
            type: 'button',
            name: 'view_report',
            text: 'View Full Report',
            value: 'view_full_report',
            style: 'blue'
          }
        ]
      }
    ]
  }
  
  try {
    await fastify.synologyChat.sendMessage(invalidMessage)
    // If we get here, the test should fail
    assert.fail('Should have thrown an error but didn\'t')
  } catch (err) {
    // Log inspection is enabled in the updated plugin
    assert.ok(err.message.includes('Invalid message format'))
  }
})

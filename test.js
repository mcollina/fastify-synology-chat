import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import Fastify from 'fastify'
import synologyChat from './index.js'

test('registers the plugin correctly', async (t) => {
  const fastify = Fastify()
  await fastify.register(synologyChat)
  await fastify.ready()
})

test('handles incoming webhook with text', async (t) => {
  const fastify = Fastify()
  let receivedPayload = null

  // Register a handler to capture the payload
  fastify.register(synologyChat, {
    onMessage: (payload) => {
      receivedPayload = payload
      return { success: true }
    }
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'POST',
    url: '/synology-chat',
    payload: {
      text: 'Hello world!'
    }
  })

  assert.equal(response.statusCode, 200)
  assert.equal(response.json().success, true)
  assert.equal(receivedPayload.text, 'Hello world!')
})

test('handles incoming webhook with text and links', async (t) => {
  const fastify = Fastify()
  let receivedPayload = null

  fastify.register(synologyChat, {
    onMessage: (payload) => {
      receivedPayload = payload
      return { success: true }
    }
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'POST',
    url: '/synology-chat',
    payload: {
      text: 'Check this!! <https://www.synology.com|Click here> for details!'
    }
  })

  assert.equal(response.statusCode, 200)
  assert.equal(response.json().success, true)
  assert.equal(receivedPayload.text, 'Check this!! <https://www.synology.com|Click here> for details!')
})

test('handles incoming webhook with file_url', async (t) => {
  const fastify = Fastify()
  let receivedPayload = null

  fastify.register(synologyChat, {
    onMessage: (payload) => {
      receivedPayload = payload
      return { success: true }
    }
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'POST',
    url: '/synology-chat',
    payload: {
      text: 'a fun image',
      file_url: 'http://imgur.com/xxxxx'
    }
  })

  assert.equal(response.statusCode, 200)
  assert.equal(response.json().success, true)
  assert.equal(receivedPayload.text, 'a fun image')
  assert.equal(receivedPayload.file_url, 'http://imgur.com/xxxxx')
})

test('returns 400 on invalid webhook payload', async (t) => {
  const fastify = Fastify()

  fastify.register(synologyChat)

  await fastify.ready()

  const response = await fastify.inject({
    method: 'POST',
    url: '/synology-chat',
    payload: {
      invalid: 'payload'
    }
  })

  assert.equal(response.statusCode, 400)
})

test('uses custom path for webhook endpoint', async (t) => {
  const fastify = Fastify()
  let receivedPayload = null

  fastify.register(synologyChat, {
    path: '/custom-webhook-path',
    onMessage: (payload) => {
      receivedPayload = payload
      return { success: true }
    }
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'POST',
    url: '/custom-webhook-path',
    payload: {
      text: 'Custom path test'
    }
  })

  assert.equal(response.statusCode, 200)
  assert.equal(response.json().success, true)
  assert.equal(receivedPayload.text, 'Custom path test')
})

test('supports different response formats', async (t) => {
  const fastify = Fastify()

  fastify.register(synologyChat, {
    onMessage: () => {
      return 'String response'
    }
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'POST',
    url: '/synology-chat',
    payload: {
      text: 'Testing response format'
    }
  })

  assert.equal(response.statusCode, 200)
  assert.equal(response.payload, 'String response')
})

test('throws error when onMessage is not provided', async (t) => {
  const fastify = Fastify()
  
  try {
    await fastify.register(synologyChat, {
      required: true // This makes onMessage required
    })
    await fastify.ready()
    assert.fail('Should have thrown an error')
  } catch (err) {
    assert.ok(err.message.includes('onMessage'))
  }
})

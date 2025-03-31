import test from 'node:test'
import { strict as assert } from 'node:assert'
import { messageSchema } from '../schemas/message-schema.js'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'

/**
 * Initialize Ajv instance with formats
 * @returns {Function} Message validator function
 */
function createValidator() {
  const ajv = new Ajv({
    allErrors: true,
    removeAdditional: false,
    useDefaults: true,
    coerceTypes: false,
  })
  addFormats(ajv)
  
  return ajv.compile(messageSchema)
}

// Create validator for testing
const validateMessage = createValidator()

test('validates simple string messages', () => {
  const valid = validateMessage('Hello world')
  assert.equal(valid, true)
})

test('validates object messages with text property', () => {
  const valid = validateMessage({ text: 'Hello world' })
  assert.equal(valid, true)
})

test('validates complex messages with attachments', () => {
  const message = {
    text: 'Hello with attachment',
    attachments: [
      {
        text: 'Attachment text',
        callback_id: 'test_callback',  // Add callback_id for actions with buttons
        actions: [
          {
            type: 'button',
            name: 'action_1',
            text: 'Click me',
            value: 'btn_1',
            style: 'green'
          }
        ]
      }
    ]
  }
  
  const valid = validateMessage(message)
  assert.equal(valid, true)
})

test('validates messages with file URLs', () => {
  const message = {
    text: 'Check this image',
    file_url: 'https://example.com/image.jpg'
  }
  
  const valid = validateMessage(message)
  assert.equal(valid, true)
})

test('validates messages with user_ids', () => {
  const message = {
    text: 'Message for specific users',
    user_ids: [1, 2, 3]
  }
  
  const valid = validateMessage(message)
  assert.equal(valid, true)
})

test('rejects messages without required text property', () => {
  const message = {
    attachments: [
      {
        text: 'Attachment text'
      }
    ]
  }
  
  const valid = validateMessage(message)
  assert.equal(valid, false)
  
  // Check that we have a relevant error
  const hasMissingTextError = validateMessage.errors.some(
    error => error.keyword === 'required' && error.params.missingProperty === 'text'
  )
  assert.equal(hasMissingTextError, true)
})

test('rejects messages with invalid button types', () => {
  const message = {
    text: 'Hello with attachment',
    attachments: [
      {
        text: 'Attachment text',
        callback_id: 'test_callback',  // Required for attachments with actions
        actions: [
          {
            type: 'not_a_valid_type', // Invalid type
            name: 'action_1',
            text: 'Click me',
            value: 'btn_1'
          }
        ]
      }
    ]
  }
  
  const valid = validateMessage(message)
  assert.equal(valid, false)
  
  // Verify the error message about invalid enum value
  const hasEnumError = validateMessage.errors.some(
    error => error.keyword === 'enum' && error.instancePath === '/attachments/0/actions/0/type'
  )
  assert.equal(hasEnumError, true)
})

test('rejects messages with invalid button style', () => {
  const message = {
    text: 'Hello with attachment',
    attachments: [
      {
        text: 'Attachment text',
        callback_id: 'test_callback',  // Required for attachments with actions
        actions: [
          {
            type: 'button',
            name: 'action_1',
            text: 'Click me',
            value: 'btn_1',
            style: 'purple' // Invalid style
          }
        ]
      }
    ]
  }
  
  const valid = validateMessage(message)
  assert.equal(valid, false)
  
  // Verify the error message about invalid enum value
  const hasEnumError = validateMessage.errors.some(
    error => error.keyword === 'enum' && error.instancePath === '/attachments/0/actions/0/style'
  )
  assert.equal(hasEnumError, true)
})

test('rejects attachments without required text property', () => {
  const message = {
    text: 'Hello with attachment',
    attachments: [
      {
        // Missing text property
        callback_id: 'test_callback',
        actions: [
          {
            type: 'button',
            name: 'action_1',
            text: 'Click me',
            value: 'btn_1'
          }
        ]
      }
    ]
  }
  
  const valid = validateMessage(message)
  assert.equal(valid, false)
  
  // Check specific error message
  const hasMissingTextError = validateMessage.errors.some(
    error => error.keyword === 'required' && 
            error.params.missingProperty === 'text' && 
            error.instancePath === '/attachments/0'
  )
  assert.equal(hasMissingTextError, true)
})

test('rejects unknown properties in message object', () => {
  const message = {
    text: 'Hello world',
    unknown_property: 'This should be rejected'
  }
  
  const valid = validateMessage(message)
  assert.equal(valid, false)
  
  // Check specific error message about additional properties
  const hasAdditionalPropsError = validateMessage.errors.some(
    error => error.keyword === 'additionalProperties'
  )
  assert.equal(hasAdditionalPropsError, true)
})

test('rejects malformed user_ids (non-integer values)', () => {
  const message = {
    text: 'Message for specific users',
    user_ids: [1, 'not-a-number', 3]
  }
  
  const valid = validateMessage(message)
  assert.equal(valid, false)
  
  // Check specific error message
  const hasTypeError = validateMessage.errors.some(
    error => error.keyword === 'type' && error.instancePath === '/user_ids/1'
  )
  assert.equal(hasTypeError, true)
})

test('rejects attachments with actions but missing callback_id', () => {
  const message = {
    text: 'Hello with attachment',
    attachments: [
      {
        text: 'Attachment text',
        // Missing callback_id
        actions: [
          {
            type: 'button',
            name: 'action_1',
            text: 'Click me',
            value: 'btn_1'
          }
        ]
      }
    ]
  }
  
  const valid = validateMessage(message)
  assert.equal(valid, false)
  
  // Check for the required error for callback_id
  const hasCallbackIdRequiredError = validateMessage.errors.some(
    error => error.keyword === 'required' && 
            error.params.missingProperty === 'callback_id'
  )
  assert.equal(hasCallbackIdRequiredError, true)
})

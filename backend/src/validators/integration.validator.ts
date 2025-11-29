import { body, param } from 'express-validator';
import { EMAIL_PROVIDERS } from '../config/integrations.js';

/**
 * Validation rules for saving email integration
 */
export const saveEmailIntegrationValidation = [
  body('provider')
    .exists()
    .withMessage('Provider is required')
    .trim()
    .notEmpty()
    .withMessage('Provider is required')
    .isIn(Object.keys(EMAIL_PROVIDERS))
    .withMessage(`Provider must be one of: ${Object.keys(EMAIL_PROVIDERS).join(', ')}`),
  body('enabled')
    .optional()
    .isBoolean()
    .withMessage('Enabled must be a boolean'),
  body('credentials')
    .exists()
    .withMessage('Credentials are required')
    .isObject()
    .withMessage('Credentials must be an object'),
  body('credentials.apiKey')
    .exists()
    .withMessage('API key is required')
    .trim()
    .notEmpty()
    .withMessage('API key is required')
    .isLength({ min: 10 })
    .withMessage('API key must be at least 10 characters'),
  body('settings')
    .optional()
    .isObject()
    .withMessage('Settings must be an object'),
  body('settings.fromEmail')
    .optional()
    .trim()
    .isEmail()
    .withMessage('From email must be a valid email address')
    .isLength({ max: 255 })
    .withMessage('From email must not exceed 255 characters'),
  body('settings.fromName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('From name must not exceed 100 characters'),
  body('settings.replyTo')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Reply-to email must be a valid email address')
    .isLength({ max: 255 })
    .withMessage('Reply-to email must not exceed 255 characters'),
];

/**
 * Validation rules for integration type parameter
 */
export const integrationTypeValidation = [
  param('type')
    .exists()
    .withMessage('Integration type is required')
    .trim()
    .notEmpty()
    .withMessage('Integration type is required')
    .isIn(['email', 'payment', 'sms'])
    .withMessage('Integration type must be one of: email, payment, sms'),
];

/**
 * Validation rules for testing integration
 */
export const testIntegrationValidation = [
  ...integrationTypeValidation,
];


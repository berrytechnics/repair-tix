/**
 * Integration configuration types and metadata
 */

export type IntegrationType = 'email' | 'payment' | 'sms';

export type EmailProvider = 'sendgrid' | 'mailgun' | 'resend' | 'aws_ses' | 'brevo' | 'custom_smtp';

export type PaymentProvider = 'square' | 'stripe' | 'paypal';

/**
 * Base integration configuration structure
 */
export interface IntegrationConfig {
  type: IntegrationType;
  provider: string;
  enabled: boolean;
  credentials: Record<string, string>; // Encrypted credentials
  settings?: Record<string, unknown>;
  lastTested?: Date | string;
  lastError?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

/**
 * Email integration configuration
 */
export interface EmailIntegrationConfig extends IntegrationConfig {
  type: 'email';
  provider: EmailProvider;
  settings?: {
    fromEmail: string;
    fromName?: string;
    replyTo?: string;
  };
}

/**
 * Payment integration configuration
 */
export interface PaymentIntegrationConfig extends IntegrationConfig {
  type: 'payment';
  provider: PaymentProvider;
  settings?: {
    testMode?: boolean;
    webhookUrl?: string;
  };
}

/**
 * Provider metadata for UI display
 */
export interface ProviderMetadata {
  id: string;
  displayName: string;
  description: string;
  documentationUrl?: string;
  icon?: string;
}

/**
 * Email provider metadata
 */
export const EMAIL_PROVIDERS: Record<EmailProvider, ProviderMetadata> = {
  sendgrid: {
    id: 'sendgrid',
    displayName: 'SendGrid',
    description: 'SendGrid email service (100 emails/day free tier)',
    documentationUrl: 'https://docs.sendgrid.com/for-developers/sending-email/api-getting-started',
  },
  mailgun: {
    id: 'mailgun',
    displayName: 'Mailgun',
    description: 'Mailgun email service (1,000 emails/month free tier)',
    documentationUrl: 'https://documentation.mailgun.com/en/latest/quickstart-sending.html',
  },
  resend: {
    id: 'resend',
    displayName: 'Resend',
    description: 'Resend email service (3,000 emails/month free tier)',
    documentationUrl: 'https://resend.com/docs',
  },
  aws_ses: {
    id: 'aws_ses',
    displayName: 'AWS SES',
    description: 'Amazon Simple Email Service (62,000 emails/month free tier for first year)',
    documentationUrl: 'https://docs.aws.amazon.com/ses/',
  },
  brevo: {
    id: 'brevo',
    displayName: 'Brevo (formerly Sendinblue)',
    description: 'Brevo email service (300 emails/day free tier)',
    documentationUrl: 'https://developers.brevo.com/',
  },
  custom_smtp: {
    id: 'custom_smtp',
    displayName: 'Custom SMTP',
    description: 'Custom SMTP server configuration',
  },
};

/**
 * Payment provider metadata
 */
export const PAYMENT_PROVIDERS: Record<PaymentProvider, ProviderMetadata> = {
  square: {
    id: 'square',
    displayName: 'Square',
    description: 'Square payment processing (2.6% + $0.10 per transaction)',
    documentationUrl: 'https://developer.squareup.com/docs/payments-overview',
  },
  stripe: {
    id: 'stripe',
    displayName: 'Stripe',
    description: 'Stripe payment processing (2.9% + $0.30 per transaction)',
    documentationUrl: 'https://stripe.com/docs/payments',
  },
  paypal: {
    id: 'paypal',
    displayName: 'PayPal',
    description: 'PayPal payment processing (2.9% + fixed fee per transaction)',
    documentationUrl: 'https://developer.paypal.com/docs/api/overview',
  },
};

/**
 * Get provider metadata
 */
export function getProviderMetadata(type: IntegrationType, provider: string): ProviderMetadata | undefined {
  if (type === 'email') {
    return EMAIL_PROVIDERS[provider as EmailProvider];
  }
  if (type === 'payment') {
    return PAYMENT_PROVIDERS[provider as PaymentProvider];
  }
  return undefined;
}

/**
 * Get all available providers for an integration type
 */
export function getAvailableProviders(type: IntegrationType): ProviderMetadata[] {
  if (type === 'email') {
    return Object.values(EMAIL_PROVIDERS);
  }
  if (type === 'payment') {
    return Object.values(PAYMENT_PROVIDERS);
  }
  return [];
}


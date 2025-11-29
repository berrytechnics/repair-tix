/**
 * Integration configuration types and metadata
 */

export type IntegrationType = 'email' | 'payment' | 'sms';

export type EmailProvider = 'sendgrid' | 'mailgun' | 'resend' | 'aws_ses' | 'brevo' | 'custom_smtp';

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
 * Get provider metadata
 */
export function getProviderMetadata(type: IntegrationType, provider: string): ProviderMetadata | undefined {
  if (type === 'email') {
    return EMAIL_PROVIDERS[provider as EmailProvider];
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
  return [];
}


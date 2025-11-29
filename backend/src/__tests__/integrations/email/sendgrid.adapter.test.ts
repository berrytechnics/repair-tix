import sendGridAdapter from '../../../integrations/email/sendgrid.adapter.js';
import { EmailIntegrationConfig } from '../../../config/integrations.js';

// Mock @sendgrid/mail
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn(),
}));

// Mock fetch for testConnection
global.fetch = jest.fn();

describe('SendGridAdapter', () => {
  const mockConfig: EmailIntegrationConfig = {
    type: 'email',
    provider: 'sendgrid',
    enabled: true,
    credentials: {
      apiKey: 'SG.test123456789',
    },
    settings: {
      fromEmail: 'noreply@test.com',
      fromName: 'Test Company',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('testConnection', () => {
    it('should return success for valid API key', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const result = await sendGridAdapter.testConnection(mockConfig);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.sendgrid.com/v3/user/profile',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockConfig.credentials.apiKey}`,
          }),
        })
      );
    });

    it('should return error for invalid API key (401)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const result = await sendGridAdapter.testConnection(mockConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid API key');
    });

    it('should return error when API key is missing', async () => {
      const configWithoutKey: EmailIntegrationConfig = {
        ...mockConfig,
        credentials: {},
      };

      const result = await sendGridAdapter.testConnection(configWithoutKey);

      expect(result.success).toBe(false);
      expect(result.error).toContain('API key not found');
    });

    it('should handle fetch errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await sendGridAdapter.testConnection(mockConfig);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('sendEmail', () => {
    const mockSgMail = require('@sendgrid/mail');

    it('should send email successfully', async () => {
      mockSgMail.send.mockResolvedValueOnce([{ statusCode: 202 }]);

      const emailData = {
        to: 'customer@example.com',
        subject: 'Test Email',
        text: 'Test email body',
        html: '<p>Test email body</p>',
      };

      await sendGridAdapter.sendEmail(mockConfig, emailData);

      expect(mockSgMail.setApiKey).toHaveBeenCalledWith(mockConfig.credentials.apiKey);
      expect(mockSgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['customer@example.com'],
          from: expect.stringContaining('noreply@test.com'),
          subject: 'Test Email',
          text: 'Test email body',
          html: '<p>Test email body</p>',
        })
      );
    });

    it('should use fromName when provided', async () => {
      mockSgMail.send.mockResolvedValueOnce([{ statusCode: 202 }]);

      const emailData = {
        to: 'customer@example.com',
        subject: 'Test Email',
        text: 'Test',
      };

      await sendGridAdapter.sendEmail(mockConfig, emailData);

      expect(mockSgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'Test Company <noreply@test.com>',
        })
      );
    });

    it('should throw error for missing API key', async () => {
      const configWithoutKey: EmailIntegrationConfig = {
        ...mockConfig,
        credentials: {},
      };

      await expect(
        sendGridAdapter.sendEmail(configWithoutKey, {
          to: 'test@example.com',
          subject: 'Test',
          text: 'Test',
        })
      ).rejects.toThrow('SendGrid API key not found');
    });

    it('should throw error for missing from email', async () => {
      const configWithoutFrom: EmailIntegrationConfig = {
        ...mockConfig,
        settings: {},
      };

      await expect(
        sendGridAdapter.sendEmail(configWithoutFrom, {
          to: 'test@example.com',
          subject: 'Test',
          text: 'Test',
        })
      ).rejects.toThrow('From email address is required');
    });

    it('should handle SendGrid API errors', async () => {
      const error = new Error('Unauthorized');
      error.message = 'Unauthorized';
      mockSgMail.send.mockRejectedValueOnce(error);

      await expect(
        sendGridAdapter.sendEmail(mockConfig, {
          to: 'test@example.com',
          subject: 'Test',
          text: 'Test',
        })
      ).rejects.toThrow('Invalid SendGrid API key');
    });
  });
});


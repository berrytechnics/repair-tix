// src/integrations/email/email.service.ts
import credentialService from '../../services/credential.service.js';
import sendGridAdapter, { EmailData } from './sendgrid.adapter.js';
import { EmailIntegrationConfig } from '../../config/integrations.js';
import logger from '../../config/logger.js';
import { Ticket } from '../../services/ticket.service.js';
import { Customer } from '../../services/customer.service.js';
import { Invoice } from '../../services/invoice.service.js';

/**
 * High-level email service for sending notifications
 * Handles integration configuration and fallback gracefully
 */
export class EmailService {
  /**
   * Check if email integration is configured and enabled
   */
  async isEmailConfigured(companyId: string): Promise<boolean> {
    try {
      const integration = await credentialService.getIntegration(companyId, 'email');
      return integration !== null && integration.enabled === true;
    } catch (error) {
      logger.error('Error checking email configuration:', error);
      return false;
    }
  }

  /**
   * Get email integration config
   */
  private async getEmailConfig(companyId: string): Promise<EmailIntegrationConfig | null> {
    const integration = await credentialService.getIntegration(companyId, 'email');
    if (!integration || integration.type !== 'email') {
      return null;
    }
    return integration as EmailIntegrationConfig;
  }

  /**
   * Send email using configured provider
   */
  private async sendEmailInternal(
    companyId: string,
    emailData: EmailData
  ): Promise<void> {
    const config = await this.getEmailConfig(companyId);
    if (!config) {
      throw new Error('Email integration not configured');
    }

    if (!config.enabled) {
      throw new Error('Email integration is disabled');
    }

    // Route to appropriate adapter based on provider
    if (config.provider === 'sendgrid') {
      await sendGridAdapter.sendEmail(config, emailData);
    } else {
      throw new Error(`Email provider ${config.provider} is not yet supported`);
    }
  }

  /**
   * Send ticket status update email to customer
   */
  async sendTicketStatusEmail(
    companyId: string,
    ticket: Ticket,
    customer: Customer
  ): Promise<void> {
    try {
      if (!(await this.isEmailConfigured(companyId))) {
        logger.debug('Email integration not configured, skipping ticket status email');
        return;
      }

      if (!customer.email) {
        logger.debug(`Customer ${customer.id} has no email address, skipping notification`);
        return;
      }

      const statusDisplayNames: Record<string, string> = {
        new: 'New',
        assigned: 'Assigned',
        in_progress: 'In Progress',
        on_hold: 'On Hold',
        completed: 'Completed',
        cancelled: 'Cancelled',
      };

      const statusDisplay = statusDisplayNames[ticket.status] || ticket.status;

      const subject = `Ticket ${ticket.ticketNumber} Status Update: ${statusDisplay}`;
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Ticket Status Update</h2>
          <p>Hello ${customer.firstName},</p>
          <p>Your repair ticket has been updated:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Ticket Number:</strong> ${ticket.ticketNumber}</p>
            <p><strong>Status:</strong> ${statusDisplay}</p>
            <p><strong>Device:</strong> ${ticket.deviceType}${ticket.deviceBrand ? ` - ${ticket.deviceBrand}` : ''}${ticket.deviceModel ? ` ${ticket.deviceModel}` : ''}</p>
            ${ticket.diagnosticNotes ? `<p><strong>Diagnostic Notes:</strong><br>${ticket.diagnosticNotes.replace(/\n/g, '<br>')}</p>` : ''}
            ${ticket.repairNotes ? `<p><strong>Repair Notes:</strong><br>${ticket.repairNotes.replace(/\n/g, '<br>')}</p>` : ''}
          </div>
          <p>If you have any questions, please contact us.</p>
          <p>Thank you for your business!</p>
        </div>
      `;

      const text = `
Ticket Status Update

Hello ${customer.firstName},

Your repair ticket has been updated:

Ticket Number: ${ticket.ticketNumber}
Status: ${statusDisplay}
Device: ${ticket.deviceType}${ticket.deviceBrand ? ` - ${ticket.deviceBrand}` : ''}${ticket.deviceModel ? ` ${ticket.deviceModel}` : ''}
${ticket.diagnosticNotes ? `\nDiagnostic Notes:\n${ticket.diagnosticNotes}\n` : ''}
${ticket.repairNotes ? `\nRepair Notes:\n${ticket.repairNotes}\n` : ''}

If you have any questions, please contact us.

Thank you for your business!
      `;

      await this.sendEmailInternal(companyId, {
        to: customer.email,
        subject,
        text,
        html,
      });

      logger.info(`Ticket status email sent to ${customer.email} for ticket ${ticket.ticketNumber}`);
    } catch (error) {
      // Don't fail the ticket update if email fails
      logger.error(`Failed to send ticket status email for ticket ${ticket.ticketNumber}:`, error);
    }
  }

  /**
   * Send invoice email to customer
   */
  async sendInvoiceEmail(
    companyId: string,
    invoice: Invoice,
    customer: Customer
  ): Promise<void> {
    try {
      if (!(await this.isEmailConfigured(companyId))) {
        logger.debug('Email integration not configured, skipping invoice email');
        return;
      }

      if (!customer.email) {
        logger.debug(`Customer ${customer.id} has no email address, skipping invoice email`);
        return;
      }

      const subject = `Invoice ${invoice.invoiceNumber} from ${invoice.status === 'paid' ? 'Payment Confirmation' : 'Payment Due'}`;
      
      const statusText = invoice.status === 'paid' 
        ? 'This invoice has been paid. Thank you!' 
        : 'Please review the invoice below and submit payment.';

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Invoice ${invoice.invoiceNumber}</h2>
          <p>Hello ${customer.firstName},</p>
          <p>${statusText}</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
            <p><strong>Status:</strong> ${invoice.status}</p>
            <p><strong>Subtotal:</strong> $${invoice.subtotal.toFixed(2)}</p>
            ${invoice.taxAmount > 0 ? `<p><strong>Tax:</strong> $${invoice.taxAmount.toFixed(2)}</p>` : ''}
            <p><strong>Total Amount:</strong> $${invoice.totalAmount.toFixed(2)}</p>
            ${invoice.dueDate ? `<p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>` : ''}
            ${invoice.paidDate ? `<p><strong>Paid Date:</strong> ${new Date(invoice.paidDate).toLocaleDateString()}</p>` : ''}
            ${invoice.notes ? `<p><strong>Notes:</strong><br>${invoice.notes.replace(/\n/g, '<br>')}</p>` : ''}
          </div>
          <p>If you have any questions about this invoice, please contact us.</p>
          <p>Thank you for your business!</p>
        </div>
      `;

      const text = `
Invoice ${invoice.invoiceNumber}

Hello ${customer.firstName},

${statusText}

Invoice Number: ${invoice.invoiceNumber}
Status: ${invoice.status}
Subtotal: $${invoice.subtotal.toFixed(2)}
${invoice.taxAmount > 0 ? `Tax: $${invoice.taxAmount.toFixed(2)}\n` : ''}
Total Amount: $${invoice.totalAmount.toFixed(2)}
${invoice.dueDate ? `Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}\n` : ''}
${invoice.paidDate ? `Paid Date: ${new Date(invoice.paidDate).toLocaleDateString()}\n` : ''}
${invoice.notes ? `\nNotes:\n${invoice.notes}\n` : ''}

If you have any questions about this invoice, please contact us.

Thank you for your business!
      `;

      await this.sendEmailInternal(companyId, {
        to: customer.email,
        subject,
        text,
        html,
      });

      logger.info(`Invoice email sent to ${customer.email} for invoice ${invoice.invoiceNumber}`);
    } catch (error) {
      // Don't fail the invoice operation if email fails
      logger.error(`Failed to send invoice email for invoice ${invoice.invoiceNumber}:`, error);
    }
  }
}

export default new EmailService();


const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.configured = false;
    this.lastError = null;
    this.init();
  }

  init() {
    try {
      const host = process.env.SMTP_HOST;
      const port = parseInt(process.env.SMTP_PORT || '587', 10);
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;

      if (!host || !user || !pass) {
        this.lastError = 'SMTP_HOST, SMTP_USER, and SMTP_PASS are required';
        console.warn(`Email service disabled: ${this.lastError}`);
        return;
      }

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: process.env.SMTP_SECURE === 'true' || port === 465,
        auth: { user, pass },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000
      });

      this.configured = true;
      this.verifyConnection().catch(() => {});
    } catch (error) {
      this.configured = false;
      this.lastError = error.message;
      console.error('Email service init error:', error.message);
    }
  }

  async verifyConnection() {
    if (!this.transporter) {
      return { ok: false, message: this.lastError || 'Email service is not configured' };
    }

    try {
      await this.transporter.verify();
      this.lastError = null;
      console.log('Email service connected');
      return { ok: true, message: 'Email service connected' };
    } catch (error) {
      console.error(error);
      console.error("Code:", error.code);
      console.error("Command:", error.command);
      console.error("Address:", error.address);
      console.error("Port:", error.port);
    }
  }

  getStatus() {
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    return {
      configured: this.configured,
      host: process.env.SMTP_HOST || null,
      port,
      secure: process.env.SMTP_SECURE === 'true' || port === 465,
      from: process.env.SMTP_FROM || process.env.SMTP_USER || null,
      lastError: this.lastError
    };
  }

  escapeHtml(value = '') {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async send(to, subject, html) {
    if (!this.transporter) {
      const error = this.lastError || 'Email service is not configured';
      console.warn(`Email skipped for ${to}: ${error}`);
      return { sent: false, error };
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"ResolveAI" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to,
        subject,
        html
      });
      return { sent: true, messageId: info.messageId };
    } catch (error) {
      this.lastError = error.message;
      console.error('Email send error:', error.message);
      return { sent: false, error: error.message };
    }
  }

  async sendTicketCreated(email, ticketId, subject) {
    const safeTicketId = this.escapeHtml(ticketId);
    const safeSubject = this.escapeHtml(subject);
    const html = `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 32px;">
        <div style="background: #2563eb; padding: 24px; border-radius: 16px 16px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">ResolveAI</h1>
        </div>
        <div style="background: white; padding: 32px; border-radius: 0 0 16px 16px;">
          <h2 style="color: #1e293b; margin-top: 0;">Ticket Created: ${safeTicketId}</h2>
          <p style="color: #64748b; line-height: 1.6;">Your support ticket <strong>"${safeSubject}"</strong> has been created successfully. Our team will respond shortly.</p>
          <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0; color: #475569;"><strong>Ticket ID:</strong> ${safeTicketId}</p>
          </div>
          <p style="color: #94a3b8; font-size: 14px;">- The ResolveAI Team</p>
        </div>
      </div>`;

    return this.send(email, `Ticket Created: ${ticketId} - ${subject}`, html);
  }

  async sendTicketUpdate(email, ticketId, status, message) {
    const safeTicketId = this.escapeHtml(ticketId);
    const safeStatus = this.escapeHtml(status);
    const safeMessage = this.escapeHtml(message || '');
    const html = `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 32px;">
        <div style="background: #2563eb; padding: 24px; border-radius: 16px 16px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">ResolveAI</h1>
        </div>
        <div style="background: white; padding: 32px; border-radius: 0 0 16px 16px;">
          <h2 style="color: #1e293b; margin-top: 0;">Ticket Update: ${safeTicketId}</h2>
          <p style="color: #64748b;">Status changed to: <strong style="color: #2563eb;">${safeStatus}</strong></p>
          <p style="color: #64748b; line-height: 1.6;">${safeMessage}</p>
          <p style="color: #94a3b8; font-size: 14px;">- The ResolveAI Team</p>
        </div>
      </div>`;

    return this.send(email, `Ticket Update: ${ticketId}`, html);
  }

  async sendInvitation(email, orgName, inviteLink, tempPassword) {
    const safeOrgName = this.escapeHtml(orgName);
    const safeInviteLink = this.escapeHtml(inviteLink);
    const safeTempPassword = this.escapeHtml(tempPassword || '');
    const html = `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 32px;">
        <div style="background: #2563eb; padding: 24px; border-radius: 16px 16px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">ResolveAI</h1>
        </div>
        <div style="background: white; padding: 32px; border-radius: 0 0 16px 16px;">
          <h2 style="color: #1e293b; margin-top: 0;">You're Invited!</h2>
          <p style="color: #64748b; line-height: 1.6;">You've been invited to join <strong>${safeOrgName}</strong> on ResolveAI.</p>
          ${tempPassword ? `<p style="color: #64748b; line-height: 1.6;">Your temporary password is: <strong style="color: #1e293b;">${safeTempPassword}</strong></p>` : ''}
          <a href="${safeInviteLink}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; margin: 16px 0;">Accept Invitation</a>
          <p style="color: #94a3b8; font-size: 14px;">- The ResolveAI Team</p>
        </div>
      </div>`;

    return this.send(email, `Invitation to join ${orgName} on ResolveAI`, html);
  }

  async sendPasswordReset(email, resetLink) {
    const safeResetLink = this.escapeHtml(resetLink);
    const html = `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 32px;">
        <div style="background: #2563eb; padding: 24px; border-radius: 16px 16px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">ResolveAI</h1>
        </div>
        <div style="background: white; padding: 32px; border-radius: 0 0 16px 16px;">
          <h2 style="color: #1e293b; margin-top: 0;">Reset Password</h2>
          <p style="color: #64748b; line-height: 1.6;">Click the button below to reset your password:</p>
          <a href="${safeResetLink}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; margin: 16px 0;">Reset Password</a>
          <p style="color: #94a3b8; font-size: 14px;">If you did not request this, ignore this email.</p>
        </div>
      </div>`;

    return this.send(email, 'Password Reset - ResolveAI', html);
  }

  async sendEscalationNotice(email, orgName, customerName, chatLink) {
    const safeOrgName = this.escapeHtml(orgName);
    const safeCustomerName = this.escapeHtml(customerName);
    const safeChatLink = this.escapeHtml(chatLink);
    const html = `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 32px;">
        <div style="background: #ef4444; padding: 24px; border-radius: 16px 16px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Action Required</h1>
        </div>
        <div style="background: white; padding: 32px; border-radius: 0 0 16px 16px;">
          <h2 style="color: #1e293b; margin-top: 0;">Human Agent Needed!</h2>
          <p style="color: #64748b; line-height: 1.6;">The AI assistant for <strong>${safeOrgName}</strong> has escalated a conversation with <strong>${safeCustomerName}</strong> and requires human intervention.</p>
          <a href="${safeChatLink}" style="display: inline-block; background: #ef4444; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; margin: 16px 0;">Take Over Conversation</a>
          <p style="color: #94a3b8; font-size: 14px;">- The ResolveAI Team</p>
        </div>
      </div>`;

    return this.send(email, `[Action Required] AI Escalated Chat - ${customerName}`, html);
  }
}

module.exports = new EmailService();

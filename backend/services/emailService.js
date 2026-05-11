const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.init();
  }

  init() {
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    } catch (error) {
      console.log('Email service not configured');
    }
  }

  async send(to, subject, html) {
    if (!this.transporter) return;
    try {
      await this.transporter.sendMail({
        from: `"ResolveAI" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to,
        subject,
        html
      });
    } catch (error) {
      console.error('Email send error:', error.message);
    }
  }

  async sendTicketCreated(email, ticketId, subject) {
    const html = `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 32px;">
        <div style="background: linear-gradient(135deg, #2563EB, #7C3AED); padding: 24px; border-radius: 16px 16px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">ResolveAI</h1>
        </div>
        <div style="background: white; padding: 32px; border-radius: 0 0 16px 16px;">
          <h2 style="color: #1e293b; margin-top: 0;">Ticket Created: ${ticketId}</h2>
          <p style="color: #64748b; line-height: 1.6;">Your support ticket <strong>"${subject}"</strong> has been created successfully. Our team will respond shortly.</p>
          <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0; color: #475569;"><strong>Ticket ID:</strong> ${ticketId}</p>
          </div>
          <p style="color: #94a3b8; font-size: 14px;">— The ResolveAI Team</p>
        </div>
      </div>`;
    await this.send(email, `Ticket Created: ${ticketId} - ${subject}`, html);
  }

  async sendTicketUpdate(email, ticketId, status, message) {
    const html = `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 32px;">
        <div style="background: linear-gradient(135deg, #2563EB, #7C3AED); padding: 24px; border-radius: 16px 16px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">ResolveAI</h1>
        </div>
        <div style="background: white; padding: 32px; border-radius: 0 0 16px 16px;">
          <h2 style="color: #1e293b; margin-top: 0;">Ticket Update: ${ticketId}</h2>
          <p style="color: #64748b;">Status changed to: <strong style="color: #2563EB;">${status}</strong></p>
          <p style="color: #64748b; line-height: 1.6;">${message || ''}</p>
          <p style="color: #94a3b8; font-size: 14px;">— The ResolveAI Team</p>
        </div>
      </div>`;
    await this.send(email, `Ticket Update: ${ticketId}`, html);
  }

  async sendInvitation(email, orgName, inviteLink, tempPassword) {
    const html = `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 32px;">
        <div style="background: linear-gradient(135deg, #2563EB, #7C3AED); padding: 24px; border-radius: 16px 16px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">ResolveAI</h1>
        </div>
        <div style="background: white; padding: 32px; border-radius: 0 0 16px 16px;">
          <h2 style="color: #1e293b; margin-top: 0;">You're Invited!</h2>
          <p style="color: #64748b; line-height: 1.6;">You've been invited to join <strong>${orgName}</strong> on ResolveAI.</p>
          ${tempPassword ? `<p style="color: #64748b; line-height: 1.6;">Your temporary password is: <strong style="color: #1e293b;">${tempPassword}</strong></p>` : ''}
          <a href="${inviteLink}" style="display: inline-block; background: #2563EB; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; margin: 16px 0;">Accept Invitation</a>
          <p style="color: #94a3b8; font-size: 14px;">— The ResolveAI Team</p>
        </div>
      </div>`;
    await this.send(email, `Invitation to join ${orgName} on ResolveAI`, html);
  }

  async sendPasswordReset(email, resetLink) {
    const html = `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 32px;">
        <div style="background: linear-gradient(135deg, #2563EB, #7C3AED); padding: 24px; border-radius: 16px 16px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">ResolveAI</h1>
        </div>
        <div style="background: white; padding: 32px; border-radius: 0 0 16px 16px;">
          <h2 style="color: #1e293b; margin-top: 0;">Reset Password</h2>
          <p style="color: #64748b; line-height: 1.6;">Click the button below to reset your password:</p>
          <a href="${resetLink}" style="display: inline-block; background: #2563EB; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; margin: 16px 0;">Reset Password</a>
          <p style="color: #94a3b8; font-size: 14px;">If you didn't request this, ignore this email.</p>
        </div>
      </div>`;
    await this.send(email, 'Password Reset - ResolveAI', html);
  }

  async sendEscalationNotice(email, orgName, customerName, chatLink) {
    const html = `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 32px;">
        <div style="background: linear-gradient(135deg, #EF4444, #F59E0B); padding: 24px; border-radius: 16px 16px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Action Required</h1>
        </div>
        <div style="background: white; padding: 32px; border-radius: 0 0 16px 16px;">
          <h2 style="color: #1e293b; margin-top: 0;">Human Agent Needed!</h2>
          <p style="color: #64748b; line-height: 1.6;">The AI assistant for <strong>${orgName}</strong> has escalated a conversation with <strong>${customerName}</strong> and requires human intervention.</p>
          <a href="${chatLink}" style="display: inline-block; background: #EF4444; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; margin: 16px 0;">Take Over Conversation</a>
          <p style="color: #94a3b8; font-size: 14px;">— The ResolveAI Team</p>
        </div>
      </div>`;
    await this.send(email, `[Action Required] AI Escalated Chat - ${customerName}`, html);
  }
}

module.exports = new EmailService();

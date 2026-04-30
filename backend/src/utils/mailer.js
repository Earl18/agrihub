import nodemailer from 'nodemailer';

let transporterPromise;

function requireMailEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is missing. Add it to .env to enable password reset emails.`);
  }

  return value;
}

async function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = (async () => {
      const host = requireMailEnv('SMTP_HOST');
      const port = Number(process.env.SMTP_PORT || '587');
      const user = requireMailEnv('SMTP_USER');
      const pass = requireMailEnv('SMTP_PASS');

      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });

      await transporter.verify();
      return transporter;
    })();
  }

  return transporterPromise;
}

export async function sendPasswordResetCode({ toEmail, code, name }) {
  const transporter = await getTransporter();
  const from = process.env.SMTP_FROM?.trim() || requireMailEnv('SMTP_USER');
  const appName = 'AgriHub';
  const greetingName = name?.trim() || 'there';

  await transporter.sendMail({
    from,
    to: toEmail,
    subject: `${appName} password reset code`,
    text: `Hello ${greetingName},

We received a request to reset your AgriHub password.

Your verification code is: ${code}

This code expires in 15 minutes. If you did not request a password reset, you can ignore this email.
`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <h2 style="margin-bottom: 8px;">AgriHub password reset</h2>
        <p>Hello ${greetingName},</p>
        <p>We received a request to reset your AgriHub password.</p>
        <p style="margin: 24px 0;">
          <span style="display: inline-block; padding: 12px 18px; border-radius: 12px; background: #16a34a; color: white; font-size: 24px; font-weight: 700; letter-spacing: 4px;">
            ${code}
          </span>
        </p>
        <p>This code expires in 15 minutes.</p>
        <p>If you did not request a password reset, you can ignore this email.</p>
      </div>
    `,
  });
}

export async function sendEmailVerificationCode({ toEmail, code, name }) {
  const transporter = await getTransporter();
  const from = process.env.SMTP_FROM?.trim() || requireMailEnv('SMTP_USER');
  const appName = 'AgriHub';
  const greetingName = name?.trim() || 'there';

  await transporter.sendMail({
    from,
    to: toEmail,
    subject: `${appName} email verification code`,
    text: `Hello ${greetingName},

Welcome to AgriHub.

Your email verification code is: ${code}

This code expires in 15 minutes. If you did not create an account, you can ignore this email.
`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <h2 style="margin-bottom: 8px;">Verify your AgriHub email</h2>
        <p>Hello ${greetingName},</p>
        <p>Welcome to AgriHub. Use this code to verify your email address.</p>
        <p style="margin: 24px 0;">
          <span style="display: inline-block; padding: 12px 18px; border-radius: 12px; background: #16a34a; color: white; font-size: 24px; font-weight: 700; letter-spacing: 4px;">
            ${code}
          </span>
        </p>
        <p>This code expires in 15 minutes.</p>
        <p>If you did not create an account, you can ignore this email.</p>
      </div>
    `,
  });
}

export async function sendEmailChangeVerificationCode({ toEmail, code, name }) {
  const transporter = await getTransporter();
  const from = process.env.SMTP_FROM?.trim() || requireMailEnv('SMTP_USER');
  const appName = 'AgriHub';
  const greetingName = name?.trim() || 'there';

  await transporter.sendMail({
    from,
    to: toEmail,
    subject: `${appName} email change verification code`,
    text: `Hello ${greetingName},

We received a request to change the email address on your AgriHub account.

Your verification code is: ${code}

This code expires in 15 minutes. Your account email will only be updated after this code is confirmed.
`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <h2 style="margin-bottom: 8px;">Confirm your new AgriHub email</h2>
        <p>Hello ${greetingName},</p>
        <p>We received a request to change the email address on your AgriHub account.</p>
        <p style="margin: 24px 0;">
          <span style="display: inline-block; padding: 12px 18px; border-radius: 12px; background: #16a34a; color: white; font-size: 24px; font-weight: 700; letter-spacing: 4px;">
            ${code}
          </span>
        </p>
        <p>This code expires in 15 minutes.</p>
        <p>Your account email will only be updated after this code is confirmed.</p>
      </div>
    `,
  });
}

export async function sendPhoneVerificationCodeEmail({ toEmail, code, name, phone }) {
  const transporter = await getTransporter();
  const from = process.env.SMTP_FROM?.trim() || requireMailEnv('SMTP_USER');
  const appName = 'AgriHub';
  const greetingName = name?.trim() || 'there';
  const formattedPhone = String(phone || '').trim() || 'the phone number on your account';

  await transporter.sendMail({
    from,
    to: toEmail,
    subject: `${appName} phone verification code`,
    text: `Hello ${greetingName},

We received a request to verify the phone number on your AgriHub account.

Phone number: ${formattedPhone}
Verification code: ${code}

This code expires in 15 minutes. If you did not request this change, you can ignore this email.
`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <h2 style="margin-bottom: 8px;">Verify your AgriHub phone number</h2>
        <p>Hello ${greetingName},</p>
        <p>We received a request to verify the phone number on your AgriHub account.</p>
        <p><strong>Phone number:</strong> ${formattedPhone}</p>
        <p style="margin: 24px 0;">
          <span style="display: inline-block; padding: 12px 18px; border-radius: 12px; background: #16a34a; color: white; font-size: 24px; font-weight: 700; letter-spacing: 4px;">
            ${code}
          </span>
        </p>
        <p>This code expires in 15 minutes.</p>
        <p>If you did not request this change, you can ignore this email.</p>
      </div>
    `,
  });
}

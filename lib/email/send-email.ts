import { resend } from "@/lib/email/resend";
import { VerificationEmail } from "@/emails/verification-email";
import { PasswordResetEmail } from "@/emails/password-reset-email";

const FROM_EMAIL =
  process.env.EMAIL_FROM || "DentAssist AI <onboarding@resend.dev>";

interface SendVerificationEmailOptions {
  to: string;
  name?: string;
  verificationUrl: string;
}

export async function sendVerificationEmail({
  to,
  name,
  verificationUrl,
}: SendVerificationEmailOptions) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "Verify your email address - DentAssist AI",
      react: VerificationEmail({ name, verificationUrl }),
    });

    if (error) {
      console.error("❌ Resend failed to send verification email:", error);
      throw new Error(`Email delivery error: ${error.message}`);
    }

    return { success: true, data };
  } catch (err) {
    console.error("❌ Error sending verification email:", err);
    throw err;
  }
}

interface SendPasswordResetEmailOptions {
  to: string;
  name?: string;
  resetUrl: string;
}

export async function sendPasswordResetEmail({
  to,
  name,
  resetUrl,
}: SendPasswordResetEmailOptions) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "Reset your password - DentAssist AI",
      react: PasswordResetEmail({ name, resetUrl }),
    });

    if (error) {
      console.error("❌ Resend failed to send password reset email:", error);
      throw new Error(`Email delivery error: ${error.message}`);
    }

    return { success: true, data };
  } catch (err) {
    console.error("❌ Error sending password reset email:", err);
    throw err;
  }
}

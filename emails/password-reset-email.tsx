import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface PasswordResetEmailProps {
  name?: string;
  resetUrl: string;
}

export const PasswordResetEmail = ({
  name = "there",
  resetUrl,
}: PasswordResetEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Reset your DentAssist AI password</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={headerSection}>
            <div style={logoContainer}>
              <div style={logoMark}>+</div>
              <Text style={logoText}>DentAssist AI</Text>
            </div>
          </Section>

          {/* Card Body */}
          <Section style={card}>
            <Heading style={heading}>Reset your password</Heading>
            <Text style={paragraph}>Hello {name},</Text>
            <Text style={paragraph}>
              We received a request to reset the password for your{" "}
              <strong>DentAssist AI</strong> account. Click the button below to
              choose a new, secure password.
            </Text>

            <Section style={buttonContainer}>
              <Button style={button} href={resetUrl}>
                Reset Password
              </Button>
            </Section>

            <Text style={paragraphMuted}>
              This password reset link is valid for 1 hour. If you didn’t
              request this password reset, please disregard this email or
              contact your clinic administrator if you suspect unauthorized
              activity.
            </Text>

            <Hr style={hr} />

            <Text style={fallbackText}>
              If the button above does not work, copy and paste this URL into
              your browser:
            </Text>
            <Link href={resetUrl} style={link}>
              {resetUrl}
            </Link>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              DentAssist AI — Secure Clinic Management System
            </Text>
            <Text style={footerSubtext}>
              If you did not make this request, your account remains secure.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default PasswordResetEmail;

const main: React.CSSProperties = {
  backgroundColor: "#F8FAFC",
  fontFamily:
    'Manrope, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  padding: "40px 0",
};

const container: React.CSSProperties = {
  maxWidth: "560px",
  margin: "0 auto",
  padding: "0 20px",
};

const headerSection: React.CSSProperties = {
  textAlign: "center",
  marginBottom: "24px",
};

const logoContainer: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
};

const logoMark: React.CSSProperties = {
  display: "inline-block",
  width: "28px",
  height: "28px",
  lineHeight: "28px",
  borderRadius: "6px",
  backgroundColor: "#0F766E",
  color: "#FFFFFF",
  fontSize: "18px",
  fontWeight: "bold",
  textAlign: "center",
};

const logoText: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: "700",
  color: "#0F172A",
  margin: "0",
  letterSpacing: "-0.02em",
};

const card: React.CSSProperties = {
  backgroundColor: "#FFFFFF",
  borderRadius: "12px",
  border: "1px solid #E2E8F0",
  padding: "36px 32px",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
};

const heading: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: "700",
  color: "#0F172A",
  margin: "0 0 20px 0",
  lineHeight: "1.3",
};

const paragraph: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: "24px",
  color: "#334155",
  margin: "0 0 16px 0",
};

const paragraphMuted: React.CSSProperties = {
  fontSize: "13px",
  lineHeight: "20px",
  color: "#64748B",
  margin: "0 0 20px 0",
};

const buttonContainer: React.CSSProperties = {
  textAlign: "center",
  margin: "28px 0",
};

const button: React.CSSProperties = {
  backgroundColor: "#0F766E",
  borderRadius: "8px",
  color: "#FFFFFF",
  fontSize: "15px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center",
  display: "inline-block",
  padding: "12px 28px",
};

const hr: React.CSSProperties = {
  borderColor: "#E2E8F0",
  margin: "24px 0",
};

const fallbackText: React.CSSProperties = {
  fontSize: "12px",
  color: "#64748B",
  margin: "0 0 6px 0",
};

const link: React.CSSProperties = {
  fontSize: "12px",
  color: "#0F766E",
  wordBreak: "break-all",
  textDecoration: "underline",
};

const footer: React.CSSProperties = {
  textAlign: "center",
  marginTop: "24px",
};

const footerText: React.CSSProperties = {
  fontSize: "12px",
  color: "#64748B",
  margin: "0 0 4px 0",
};

const footerSubtext: React.CSSProperties = {
  fontSize: "11px",
  color: "#94A3B8",
  margin: "0",
};

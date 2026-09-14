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

interface VerificationEmailProps {
  name?: string;
  verificationUrl: string;
}

export const VerificationEmail = ({
  name = "there",
  verificationUrl,
}: VerificationEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Verify your email address for DentAssist AI</Preview>
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
            <Heading style={heading}>Verify your email address</Heading>
            <Text style={paragraph}>Hello {name},</Text>
            <Text style={paragraph}>
              Thank you for signing up for <strong>DentAssist AI</strong>. To
              complete your account registration and secure your access to the
              clinic receptionist portal, please verify your email address.
            </Text>

            <Section style={buttonContainer}>
              <Button style={button} href={verificationUrl}>
                Verify Email Address
              </Button>
            </Section>

            <Text style={paragraphMuted}>
              This link is valid for 24 hours. If you did not create a
              DentAssist AI account, you can safely ignore this email.
            </Text>

            <Hr style={hr} />

            <Text style={fallbackText}>
              If the button above does not work, copy and paste this URL into
              your browser:
            </Text>
            <Link href={verificationUrl} style={link}>
              {verificationUrl}
            </Link>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              DentAssist AI — Intelligent Patient & Clinic Communications
            </Text>
            <Text style={footerSubtext}>
              Secure Cloud Infrastructure • HIPAA & Privacy Compliant Design
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default VerificationEmail;

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
  borderRadius: "3px",
  backgroundColor: "#1E40AF",
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
  borderRadius: "4px",
  border: "1px solid #E2E8F0",
  padding: "36px 32px",
  boxShadow: "none",
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
  backgroundColor: "#1E40AF",
  borderRadius: "3px",
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
  color: "#1E40AF",
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

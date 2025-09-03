import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface InviteExistingUserEmailProps {
  inviterName: string;
  inviteeEmail: string;
  inviteCode: string;
  appUrl: string;
}

export const InviteExistingUserEmail = ({
  inviterName,
  inviteCode,
  appUrl,
}: InviteExistingUserEmailProps) => {
  const inviteUrl = `${appUrl}/auth?invite_code=${inviteCode}`;

  return (
    <Html>
      <Head />
      <Preview>Partner with {inviterName} on Better Do It</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Better Do It</Heading>

          <Section style={section}>
            <Heading style={h2}>You&apos;re invited to partner up!</Heading>

            <Text style={text}>Hi there,</Text>

            <Text style={text}>
              <strong>{inviterName}</strong> wants to partner with you on Better
              Do It to get some tasks done together!
            </Text>

            <Text style={text}>
              Better Do It is a collaborative task management app that helps
              partners stay organized and motivated together.
            </Text>

            <Text style={text}>
              Click the button below to accept the invitation and start
              collaborating:
            </Text>

            <Button style={button} href={inviteUrl}>
              Accept Partnership Invitation
            </Button>

            <Text style={text}>
              Or copy and paste this link into your browser:
            </Text>

            <Text style={link}>{inviteUrl}</Text>

            <Text style={text}>This invitation will expire in 30 days.</Text>

            <Text style={text}>
              Best regards,
              <br />
              The Better Do It Team
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default InviteExistingUserEmail;

const main = {
  backgroundColor: "#ffffff",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "20px 0 48px",
  maxWidth: "560px",
};

const h1 = {
  color: "#333",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "40px 0",
  padding: "0",
  textAlign: "center" as const,
};

const h2 = {
  color: "#333",
  fontSize: "20px",
  fontWeight: "bold",
  margin: "24px 0",
  padding: "0",
};

const section = {
  padding: "24px",
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  border: "1px solid #e1e5e9",
};

const text = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "16px 0",
};

const button = {
  backgroundColor: "#0070f3",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px 24px",
  margin: "24px 0",
};

const link = {
  color: "#0070f3",
  fontSize: "14px",
  textDecoration: "underline",
  wordBreak: "break-all" as const,
};

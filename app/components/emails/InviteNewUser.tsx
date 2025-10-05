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

interface InviteNewUserEmailProps {
  inviterName: string;
  inviteeEmail: string;
  inviteCode: string;
  appUrl: string;
}

export const InviteNewUserEmail = ({
  inviterName,
  inviteCode,
  appUrl,
}: InviteNewUserEmailProps) => {
  const signupUrl = `${appUrl}/auth?invite_code=${inviteCode}&signup=true`;

  return (
    <Html>
      <Head />
      <Preview>Join Better Do It and partner with {inviterName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Better Do It</Heading>

          <Section style={section}>
            <Heading style={h2}>
              You&apos;re invited to join Better Do It!
            </Heading>

            <Text style={text}>Hi there,</Text>

            <Text style={text}>
              <strong>{inviterName}</strong> wants to partner with you on Better
              Do It to get some tasks done together!
            </Text>

            <Text style={text}>
              Better Do It is a collaborative task management app that helps
              partners stay organized and motivated together. It&apos;s perfect
              for couples, roommates, or any two people who want to tackle tasks
              as a team.
            </Text>

            <Text style={text}>
              <strong>What you can do with Better Do It:</strong>
            </Text>

            <Text style={text}>
              • Create and organize tasks together
              <br />
              • Track weekly progress and completion rates
              <br />
              • Stay motivated with partner accountability
              <br />• Simple, beautiful interface that works on all devices
            </Text>

            <Text style={text}>
              Click the button below to create your account and start
              collaborating:
            </Text>

            <Button style={button} href={signupUrl}>
              Create Account & Accept Invitation
            </Button>

            <Text style={text}>
              Or copy and paste this link into your browser:
            </Text>

            <Text style={link}>{signupUrl}</Text>

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

export default InviteNewUserEmail;

const main = {
  backgroundColor: "#FFFFFF", // Using clean white background
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "20px 0 48px",
  maxWidth: "560px",
};

const h1 = {
  color: "#000000", // Using pure black for maximum contrast
  fontSize: "24px",
  fontWeight: "bold",
  margin: "40px 0",
  padding: "0",
  textAlign: "center" as const,
};

const h2 = {
  color: "#000000", // Using pure black for maximum contrast
  fontSize: "20px",
  fontWeight: "bold",
  margin: "24px 0",
  padding: "0",
};

const section = {
  padding: "24px",
  backgroundColor: "#FFFFFF", // Pure white for cards
  borderRadius: "8px",
  border: "1px solid #E2E8F0", // Using semantic border color
};

const text = {
  color: "#000000", // Using pure black for maximum contrast
  fontSize: "16px",
  lineHeight: "24px",
  margin: "16px 0",
};

const button = {
  backgroundColor: "#5682B1", // Using steel blue from Color Hunt palette as primary
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
  color: "#5682B1", // Using steel blue for links
  fontSize: "14px",
  textDecoration: "underline",
  wordBreak: "break-all" as const,
};

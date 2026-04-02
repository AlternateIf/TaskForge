import { Body, Container, Head, Heading, Html, Link, Preview, Text } from '@react-email/components';
import * as React from 'react';

export interface InvitationProps {
  inviteLink: string;
}

export function InvitationEmail({ inviteLink }: InvitationProps) {
  return (
    <Html>
      <Head />
      <Preview>Your TaskForge invitation</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>You have been invited to TaskForge</Heading>
          <Text style={text}>
            You can finish account setup and access your assigned organizations using the secure
            invitation link below.
          </Text>
          <Link href={inviteLink} style={button}>
            Accept Invitation
          </Link>
          <Text style={note}>This link expires in 72 hours and can be used once.</Text>
          <Text style={footer}>— The TaskForge Team</Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};
const container = { margin: '0 auto', padding: '40px 20px', maxWidth: '560px' };
const heading = { fontSize: '24px', fontWeight: '600' as const, color: '#1a1a2e' };
const text = { fontSize: '14px', lineHeight: '24px', color: '#484848' };
const button = {
  display: 'inline-block',
  background: '#3b82f6',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: '500' as const,
  margin: '16px 0',
};
const note = { fontSize: '12px', color: '#666' };
const footer = { fontSize: '12px', color: '#999' };

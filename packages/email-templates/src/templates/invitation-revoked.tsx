import { Body, Container, Head, Heading, Html, Preview, Text } from '@react-email/components';
import * as React from 'react';

export type InvitationRevokedProps = Record<string, never>;

export function InvitationRevokedEmail(_props: InvitationRevokedProps) {
  return (
    <Html>
      <Head />
      <Preview>Your TaskForge invitation was revoked</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Invitation Revoked</Heading>
          <Text style={text}>
            Your previous TaskForge invitation link is no longer valid. If you still need access,
            please request a new invitation from your administrator.
          </Text>
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
const footer = { fontSize: '12px', color: '#999' };

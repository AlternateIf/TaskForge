import { Body, Container, Head, Heading, Html, Link, Preview, Text } from '@react-email/components';
import * as React from 'react';

export interface WelcomeProps {
  name: string;
  loginUrl: string;
}

export function WelcomeEmail({ name, loginUrl }: WelcomeProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to TaskForge!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Welcome to TaskForge</Heading>
          <Text style={text}>Hi {name},</Text>
          <Text style={text}>
            Your account has been created. You can start managing your projects and tasks right
            away.
          </Text>
          <Link href={loginUrl} style={button}>
            Get Started
          </Link>
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
const footer = { fontSize: '12px', color: '#999' };

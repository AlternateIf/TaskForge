import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

export interface MentionProps {
  recipientName: string;
  mentionedByName: string;
  taskTitle: string;
  taskUrl: string;
  commentBody: string;
  projectName: string;
}

export function MentionEmail({
  recipientName,
  mentionedByName,
  taskTitle,
  taskUrl,
  commentBody,
  projectName,
}: MentionProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {mentionedByName} mentioned you in {taskTitle}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>You were mentioned</Heading>
          <Text style={text}>Hi {recipientName},</Text>
          <Text style={text}>
            <strong>{mentionedByName}</strong> mentioned you in a comment on{' '}
            <Link href={taskUrl} style={taskLink}>
              {taskTitle}
            </Link>{' '}
            in <strong>{projectName}</strong>:
          </Text>
          <Section style={quoteBox}>
            <Text style={quoteText}>{commentBody}</Text>
          </Section>
          <Text style={footer}>— TaskForge</Text>
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
const taskLink = { color: '#3b82f6', textDecoration: 'none' };
const quoteBox = {
  background: '#ffffff',
  borderLeft: '3px solid #3b82f6',
  padding: '12px 16px',
  margin: '16px 0',
};
const quoteText = { fontSize: '14px', color: '#484848', margin: '0' };
const footer = { fontSize: '12px', color: '#999' };

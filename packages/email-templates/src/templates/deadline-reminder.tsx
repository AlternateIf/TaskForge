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

export interface DeadlineReminderProps {
  recipientName: string;
  taskTitle: string;
  taskUrl: string;
  projectName: string;
  dueDate: string;
}

export function DeadlineReminderEmail({
  recipientName,
  taskTitle,
  taskUrl,
  projectName,
  dueDate,
}: DeadlineReminderProps) {
  return (
    <Html>
      <Head />
      <Preview>Deadline approaching: {taskTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Deadline Approaching</Heading>
          <Text style={text}>Hi {recipientName},</Text>
          <Text style={text}>
            A task in <strong>{projectName}</strong> is due soon:
          </Text>
          <Section style={taskBox}>
            <Link href={taskUrl} style={taskLink}>
              {taskTitle}
            </Link>
            <Text style={dueText}>Due: {dueDate}</Text>
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
const taskBox = {
  background: '#ffffff',
  border: '1px solid #e0e0e0',
  borderRadius: '6px',
  padding: '16px',
  margin: '16px 0',
};
const taskLink = {
  color: '#3b82f6',
  fontSize: '16px',
  fontWeight: '500' as const,
  textDecoration: 'none',
};
const dueText = {
  fontSize: '14px',
  color: '#e11d48',
  fontWeight: '500' as const,
  margin: '8px 0 0',
};
const footer = { fontSize: '12px', color: '#999' };

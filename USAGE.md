# TaskForge Usage Guide

This guide explains how to use TaskForge at a product level.

## Core Concepts

- **Organization**: top-level workspace boundary.
- **Project**: execution container inside an organization.
- **Task**: work item inside a project.
- **Role and permission**: access model controlling visible actions.

## Typical Workflow

1. Create or select an organization.
2. Create projects for delivery streams.
3. Invite members and assign roles.
4. Create tasks and assign owners.
5. Track progress in project task views.
6. Use comments, notifications, and realtime updates for coordination.

## Role-Based Access

TaskForge enforces permission-based actions in both API and UI.

Common examples:
- Organization permissions: org setup, member/role administration.
- Project permissions: project lifecycle operations.
- Task permissions: create/read/update/delete task work.

See full permission matrix in [.ai/permissions.md](.ai/permissions.md).

## Notifications And Realtime

- Notifications surface relevant activity and updates.
- Realtime channels keep task/project views current without manual refresh.

## Search

Use global/project search to find tasks and related entities quickly.

## API And Integrations

- Interactive API docs: `http://localhost:3000/docs`
- Contract conventions: [.ai/api-conventions.md](.ai/api-conventions.md)

## Local Development Usage

For setup and seed/reset workflows, use:
- [.ai/setup.md](.ai/setup.md)

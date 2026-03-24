### Persona: Integration Developer — Omar

#### Background

- **Role**: Senior Developer at a systems integrator building custom workflows connecting client tools
- **Experience**: 9 years building integrations; works daily with REST APIs, webhooks, OAuth app registrations, and iPaaS platforms (Zapier, Make)
- **Tech comfort**: Very high; evaluates APIs by their documentation, consistency, and developer experience

#### Goals

- Build reliable third-party integrations on top of TaskForge's API and webhook system
- Register OAuth apps for clients so their users can authorize securely without sharing credentials
- Subscribe to granular webhook events to trigger external workflows in real time
- Trust that the API is stable, versioned, and won't break his integrations without notice

#### Pain Points

- APIs with inconsistent naming, pagination, or error formats waste days of development time
- Webhook systems that don't support retries, signatures, or delivery logs are unusable in production
- No sandbox or test environment to develop against without affecting real data
- Rate limits that are undocumented or too restrictive for batch operations
- OAuth app registration that requires manual approval or support tickets instead of self-service

#### Usage Scenarios

1. **OAuth app registration**: Registers a new OAuth 2.0 application in the TaskForge developer portal, configures redirect URIs and scopes, and receives client credentials — all self-service.
2. **Webhook integration**: Subscribes to "task.status_changed" and "task.comment_added" events for a specific project. Each webhook delivery includes a signature header for verification and retries on failure with exponential backoff.
3. **Bulk data sync**: Uses paginated API endpoints to sync all tasks and projects from TaskForge into an external data warehouse nightly. Relies on consistent cursor-based pagination and rate limit headers to throttle requests.
4. **Zapier/Make connector**: Builds a connector that lets non-technical users set up automations like "when a task is marked Done in TaskForge, create an invoice in QuickBooks." Depends on clean OAuth flow and well-documented trigger/action schemas.
5. **API versioning**: TaskForge releases API v2 with breaking changes. Omar's v1 integrations continue to work during the deprecation window. He migrates at his own pace using the versioned documentation and changelog.

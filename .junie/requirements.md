### TaskForge — Requirements Document

#### Purpose

TaskForge is a collaborative task and project management application designed to help teams organize, prioritize, and track work efficiently. It aims to provide a streamlined experience for managing tasks across projects, enabling transparency and accountability within teams of all sizes.

---

#### Core Features

- **Task Management**: Create, edit, delete, and assign tasks with titles, descriptions, due dates, priorities, and statuses (e.g., To Do, In Progress, Done).
- **Project Organization**: Group tasks into projects with customizable workflows and labels.
- **User Roles & Permissions**: Support for roles such as Admin, Project Manager, and Team Member with appropriate access controls.
- **Dashboard & Overview**: Personalized dashboard showing assigned tasks, upcoming deadlines, and project progress.
- **Search & Filtering**: Full-text search and filtering by status, priority, assignee, label, and date range.
- **Comments & Activity Log**: Threaded comments on tasks and an activity history for audit and context.
- **Notifications**: In-app and email notifications for task assignments, status changes, mentions, and approaching deadlines.
- **Integrations**: Webhook support and a REST API for third-party integrations.

---

#### Technical Requirements

See **[stack.md](stack.md)** for the full technology stack, libraries, and Docker Compose service definitions.

- **Frontend**: React + TypeScript SPA built with Vite, styled with Tailwind CSS + shadcn/ui.
- **Backend**: Fastify (Node.js + TypeScript) RESTful API with Drizzle ORM.
- **Database**: MariaDB for structured data storage; Redis for caching and sessions.
- **Search**: Meilisearch for full-text search.
- **Messaging**: RabbitMQ for asynchronous job processing.
- **Authentication**: JWT-based auth via @fastify/jwt; OAuth 2.0 and OIDC via openid-client.
- **API Documentation**: Auto-generated OpenAPI/Swagger specification.
- **Containerization**: Docker Compose for local development and deployment.
- **CI/CD**: GitHub Actions for automated testing and deployment.
- **Monitoring**: Prometheus + Grafana + Loki for metrics, dashboards, and log aggregation.

---

#### Non-Functional Requirements

- **Performance**: Page load under 2 seconds; API response time under 300 ms for typical operations.
- **Scalability**: Horizontal scaling support for the API layer; database connection pooling.
- **Security**: Input validation, CSRF/XSS protection, rate limiting, and encrypted data at rest and in transit.
- **Accessibility**: WCAG 2.1 AA compliance for all user-facing interfaces.
- **Reliability**: 99.9% uptime target; automated health checks and graceful error handling.
- **Maintainability**: Consistent code style, comprehensive test coverage (≥ 80%), and clear documentation.

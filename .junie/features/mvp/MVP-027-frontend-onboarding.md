# MVP-027: Frontend — Onboarding & Sample Project

## Description
Guided onboarding flow for new users and organizations, including a welcome wizard, sample project with realistic demo data, and progressive disclosure tooltips to ease first-time users into the application.

## Personas
- **Finn (Onboarding)**: First impression must be smooth and inviting
- **Sarah (PM)**: Wants to see the tool in action immediately
- **Claire (Executive)**: Needs to understand value quickly without deep exploration

## Dependencies
- MVP-022 (app shell, auth)
- MVP-009 (organizations — sample project belongs to an org)
- MVP-011 (projects API — create sample project)
- MVP-012 (tasks API — create sample tasks)

## Scope

### Files to create
```
apps/web/src/
├── routes/
│   └── onboarding/
│       └── index.tsx              # Onboarding wizard page
├── components/
│   ├── onboarding/
│   │   ├── onboarding-wizard.tsx  # Multi-step wizard container
│   │   ├── step-welcome.tsx       # Welcome step: name, role selection
│   │   ├── step-org-setup.tsx     # Org creation or join step
│   │   ├── step-invite-team.tsx   # Invite teammates (skip-able)
│   │   ├── step-sample-project.tsx # Option to create sample project
│   │   ├── step-complete.tsx      # Done! Quick tour prompt
│   │   └── onboarding-progress.tsx # Progress indicator (dots/steps)
│   └── layout/
│       └── tooltip-tour.tsx       # Progressive disclosure tooltip system
├── hooks/
│   └── use-onboarding.ts         # Onboarding state (completed steps, dismissed)
├── api/
│   └── onboarding.ts             # useCompleteOnboarding, useCreateSampleProject
apps/api/src/
├── routes/
│   └── onboarding/
│       └── index.ts              # POST /onboarding/complete, POST /onboarding/sample-project
├── services/
│   └── onboarding.service.ts     # Sample project creation logic
```

### Onboarding wizard flow
```
Step 1: Welcome
┌────────────────────────────────────┐
│  👋 Welcome to TaskForge!          │
│                                    │
│  What's your name?                 │
│  [First name] [Last name]         │
│                                    │
│  What's your role?                 │
│  ○ Project Manager                │
│  ○ Developer                      │
│  ○ Designer                       │
│  ○ Executive                      │
│  ○ Other                          │
│                                    │
│                        [Continue →] │
└────────────────────────────────────┘

Step 2: Organization
┌────────────────────────────────────┐
│  Set up your workspace             │
│                                    │
│  Organization name: [___________]  │
│                                    │
│  Or join an existing org:          │
│  [Enter invite code]              │
│                                    │
│             [← Back]  [Continue →] │
└────────────────────────────────────┘

Step 3: Invite team (skippable)
┌────────────────────────────────────┐
│  Invite your team                  │
│                                    │
│  [email@example.com        ] [+]  │
│  [email2@example.com       ] [×]  │
│                                    │
│  [Skip for now]    [Continue →]   │
└────────────────────────────────────┘

Step 4: Sample project
┌────────────────────────────────────┐
│  Want to see TaskForge in action?  │
│                                    │
│  We'll create a sample project     │
│  with realistic tasks so you can   │
│  explore features right away.      │
│                                    │
│  [Yes, create sample project]     │
│  [No, start with a blank slate]   │
│                                    │
│             [← Back]  [Continue →] │
└────────────────────────────────────┘

Step 5: Complete
┌────────────────────────────────────┐
│  🎉 You're all set!               │
│                                    │
│  Here's what you can do next:      │
│  • Explore the sample project      │
│  • Create your first project       │
│  • Customize your workspace        │
│                                    │
│  [Take a quick tour]              │
│  [Go to dashboard]                │
└────────────────────────────────────┘
```

### Sample project
When user opts in, the API creates:
- **Project**: "Product Launch" with default workflow (To Do, In Progress, In Review, Done)
- **Labels**: Bug, Feature, Design, Documentation, Urgent
- **Tasks** (8-10 realistic tasks across statuses):
  - "Design landing page mockups" (In Progress, priority: high, label: Design)
  - "Write API documentation" (To Do, priority: medium, label: Documentation)
  - "Fix login redirect bug" (To Do, priority: critical, label: Bug)
  - "Implement user onboarding flow" (In Review, priority: high, label: Feature)
  - "Set up CI/CD pipeline" (Done, priority: medium, label: Feature)
  - "Review competitor analysis" (To Do, priority: low)
  - "Update brand guidelines" (In Progress, priority: medium, label: Design)
  - "Plan Q2 sprint" (To Do, priority: high, due date: 3 days from now)
- **Subtasks** on "Design landing page mockups": "Hero section", "Feature grid", "Footer"
- **Checklist** on "Fix login redirect bug": "Reproduce issue", "Write fix", "Add test"
- **Comments** on 2 tasks with realistic text

### Progressive disclosure tooltips
- Tooltip tour triggered on first dashboard visit (or from "Take a quick tour")
- Highlights key UI elements in sequence:
  1. Sidebar navigation
  2. Search bar
  3. Notification bell
  4. Create task button (on project view)
  5. Keyboard shortcuts hint (`?` to see all)
- Each tooltip: highlight element, show description, Next/Skip buttons
- Tour state persisted in localStorage
- Dismissible and re-triggerable from user settings

### Onboarding state
- `use-onboarding.ts` tracks:
  - `hasCompletedWizard`: boolean (stored in user profile via API)
  - `hasSeenTour`: boolean (localStorage)
  - `hasDismissedWelcomeBanner`: boolean (localStorage)
- New users are redirected to `/onboarding` after first login
- Returning users skip directly to dashboard

### API endpoints
| Method | Path | Description |
|---|---|---|
| `POST` | `/onboarding/complete` | Mark wizard as complete, update user profile |
| `POST` | `/onboarding/sample-project` | Create sample project with demo data |

### `POST /onboarding/complete`
**Request body:**
```json
{
  "displayName": "Sarah Chen",
  "role": "project_manager"
}
```

### `POST /onboarding/sample-project`
**Response:**
```json
{
  "data": {
    "projectId": "uuid",
    "projectSlug": "product-launch"
  }
}
```

## Acceptance Criteria
- [ ] New users are redirected to onboarding wizard after first login
- [ ] Wizard has 5 steps with back/forward navigation
- [ ] Progress indicator shows current step
- [ ] Organization creation works from wizard
- [ ] Team invite step sends invitations (or can be skipped)
- [ ] Sample project creates realistic demo data
- [ ] Sample project includes tasks across multiple statuses
- [ ] Completing wizard redirects to dashboard
- [ ] Progressive disclosure tooltips highlight key UI elements
- [ ] Tooltip tour can be skipped and re-triggered
- [ ] Welcome banner shows on dashboard for new users (dismissible)
- [ ] Returning users skip onboarding
- [ ] Responsive layout for wizard on mobile
- [ ] Accessible: keyboard navigable, screen reader friendly
- [ ] Unit tests cover wizard step navigation logic, onboarding state management, and sample project creation service

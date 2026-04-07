### TaskForge — Design Principles

These principles guide all design, architecture, and implementation decisions across TaskForge.

---

#### 1. Clarity Over Cleverness

Favor straightforward, readable solutions over clever abstractions. Code, UI, and APIs should be immediately understandable to any team member without requiring deep context.

---

#### 2. User-Centric by Default

Every feature and interaction should be evaluated through the lens of our personas. Ask: "Does this reduce friction for Sarah managing her projects? Does this help Marcus integrate quickly?" If a feature doesn't clearly serve a user need, it doesn't belong.

---

#### 3. Progressive Disclosure

Present only what's needed at each moment. Dashboards show summaries first; details are available on demand. Forms start simple; advanced options are revealed progressively. This keeps the experience approachable for new users while remaining powerful for experts.

---

#### 4. Convention Over Configuration

Adopt sensible defaults so teams can be productive immediately. Customization should be available but never required. Workflows, labels, and notification preferences should work well out of the box.

---

#### 5. Consistency Everywhere

Maintain uniform patterns across the entire product:
- **UI**: Reusable components, consistent spacing, typography, and color usage.
- **API**: Predictable endpoint naming, response shapes, error formats, and pagination.
- **Code**: Shared linting rules, naming conventions, and architectural patterns across frontend and backend.

---

#### 6. Accessibility as a Baseline

Accessibility (WCAG 2.1 AA) is not an afterthought — it's a requirement from day one. All interactive elements must be keyboard-navigable, screen-reader friendly, and meet contrast standards.

---

#### 7. Performance is a Feature

Speed directly impacts user trust and adoption. Optimize for fast initial loads, responsive interactions, and efficient API calls. Set and enforce performance budgets (page load < 2s, API response < 300ms).

---

#### 8. Secure by Default

Security is built into every layer, not bolted on:
- Validate and sanitize all inputs.
- Enforce least-privilege access at every boundary.
- Encrypt data in transit and at rest.
- Never expose sensitive information in logs, URLs, or error messages.
- **Database access separation**: Only the backend (`apps/api`) may access the database via `@taskforge/db`. The frontend (`apps/web`) must never depend on `@taskforge/db` or hold database credentials — all data flows through the REST API. This is enforced by CI.

---

#### 9. Modular and Composable Architecture

Design components, services, and modules to be independently testable, replaceable, and reusable. Loose coupling between layers enables easier scaling, testing, and future evolution.

---

#### 10. Fail Gracefully

Errors will happen. The system should handle them with clear, actionable feedback to users and detailed, structured logging for developers. Never show raw stack traces or cryptic error codes to end users.

---

#### 11. Ship Incrementally

Prefer small, well-tested increments over large releases. Every change should be deployable on its own, behind feature flags when necessary. This reduces risk and accelerates feedback loops.

---

#### 12. Document Decisions, Not Just Code

Capture the *why* behind significant architectural and design choices. Use ADRs (Architecture Decision Records) or inline documentation for non-obvious trade-offs so future contributors understand the reasoning.

---

#### 13. Privacy First

Collect only the data that is strictly necessary. Default to the most private option — opt-in over opt-out, minimal data retention, and transparent data usage. Comply with GDPR and similar regulations by design, not as a retrofit. Users must always know what data is collected, why, and how to delete it.

---

#### 14. Mobile & Desktop Friendliness

Design for all screen sizes from the start using a responsive, mobile-first approach. Every feature must be fully usable on phones, tablets, and desktops. Touch targets, navigation patterns, and layouts should adapt gracefully — not just shrink.

---

#### 15. KISS — Keep It Simple, Stupid

Choose the simplest solution that solves the problem correctly. Avoid unnecessary layers of abstraction, over-engineered patterns, or speculative complexity. Simple systems are easier to understand, test, debug, and extend.

---

#### 16. YAGNI — You Aren't Gonna Need It

Do not build features, abstractions, or infrastructure "just in case." Implement what is needed now, based on current requirements. Premature generalization adds cost and complexity without delivering value.

---

#### 17. ETC — Easy To Change

Structure code so that future changes are low-cost and low-risk. Prefer loose coupling, clear interfaces, and small modules. When choosing between two approaches of equal merit, pick the one that will be easier to change later.

---

#### 18. DRY — Don't Repeat Yourself

Every piece of knowledge should have a single, authoritative representation in the system. Eliminate duplication in code, configuration, and documentation. When you spot repeated logic, extract it into a shared abstraction — but only when the duplication is genuine, not coincidental.

---

#### 19. Confirm Destructive Actions — Double Opt-In for Delete/Decline

All destructive operations — such as deleting tasks, projects, or comments, declining invitations, or removing team members — must require a double opt-in confirmation before execution. The first action signals intent; a second, explicit confirmation (e.g., a confirmation dialog) commits the operation. This protects users from accidental data loss and irreversible mistakes.

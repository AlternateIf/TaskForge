### Persona: Unit Test Engineer — Tara

#### Background

- **Role**: Test automation engineer specializing in unit and integration test strategy
- **Experience**: 7 years building test suites for Node.js/TypeScript backends; expert in Vitest, Jest, and testing patterns (mocking, fixtures, test isolation)
- **Tech comfort**: High; writes tests as a primary output, reviews PRs specifically for test coverage gaps

#### Goals

- Every service function and utility has unit tests covering happy path, edge cases, and error paths
- Tests are fast, deterministic, and independent — no shared state, no DB dependency for unit tests
- Security-critical code (auth, crypto, validation) has exhaustive boundary tests
- Test coverage is enforced in CI — PRs that reduce coverage below threshold are flagged

#### Pain Points

- Developers write features without tests and say "I'll add them later" — later never comes
- Tests that depend on database or external services are slow and flaky
- Mocking is overused — when the entire function is mocked, the test proves nothing
- No clear distinction between unit tests (fast, isolated) and integration tests (require infra)

#### Usage Scenarios

1. **New feature review**: Reviews the acceptance criteria and identifies which functions need unit tests vs. integration tests. Ensures every exported function has at least one happy-path and one error-path test.
2. **Schema validation testing**: Writes boundary tests for Zod schemas — valid input, each invalid field individually, edge cases (empty strings, max length, special characters).
3. **Auth/crypto testing**: Tests JWT sign/verify round-trips, expired token rejection, signature tampering detection, password hashing verification — all without touching a database.
4. **CI enforcement**: Configures coverage thresholds and ensures the test job blocks merges when tests fail.
5. **Test isolation**: Ensures unit tests never import database clients or make network calls. Service functions that need DB are tested with mocked dependencies or deferred to integration test suites.

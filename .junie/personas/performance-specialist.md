### Persona: Performance Optimization Specialist — Kai
#### Quick Card (Load First)

- **Implementation read depth**: Read this section first. Open the full persona only when this role is directly impacted by the change.
- **Planning read depth**: Use the full persona during persona meetings and sprint planning.
- **Top goals**: Keep page loads under 2 seconds and API responses under 300 ms across all endpoints ; Identify and eliminate performance bottlenecks before they reach production
- **Top pain points**: Performance issues are often discovered only after users complain, not during development ; Lack of visibility into slow queries, memory leaks, and frontend rendering bottlenecks


#### Background

- **Role**: Performance Engineer at a mid-size software company
- **Experience**: 7 years optimizing web applications, databases, and infrastructure for speed and scalability
- **Tech comfort**: High; proficient with profiling tools, APM platforms, load testing frameworks, and database query analysis

#### Goals

- Keep page loads under 2 seconds and API responses under 300 ms across all endpoints
- Identify and eliminate performance bottlenecks before they reach production
- Establish performance budgets, benchmarks, and automated regression detection in CI/CD

#### Pain Points

- Performance issues are often discovered only after users complain, not during development
- Lack of visibility into slow queries, memory leaks, and frontend rendering bottlenecks
- Teams prioritize features over performance, leading to gradual degradation over time

#### Usage Scenarios

1. **Load testing**: Runs stress tests against staging environments and creates tasks for endpoints that exceed response-time thresholds.
2. **Database tuning**: Analyzes slow-query logs, recommends index changes, and verifies improvements with before/after benchmarks.
3. **Frontend profiling**: Uses browser dev tools and Lighthouse to audit bundle sizes, render times, and Core Web Vitals, then files optimization tasks.

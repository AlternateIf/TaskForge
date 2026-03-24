# MVP-029: Monitoring — Prometheus Metrics & Grafana Dashboards

## Description
Application-level metrics collection via prom-client, Prometheus scraping configuration, and pre-provisioned Grafana dashboards for monitoring API performance, worker health, database connections, and real-time system status.

## Personas
- **Marcus (Backend)**: Needs to debug performance issues under load
- **Omar (Integration Developer)**: Wants to see API health and rate limit status
- **Rosa (People Manager)**: Indirectly benefits from system reliability

## Dependencies
- MVP-002 (Docker Compose — Prometheus, Grafana, Loki, Promtail containers)
- MVP-005 (API server foundation)
- MVP-018 (RabbitMQ worker)
- MVP-021 (real-time WebSocket/SSE server)

## Scope

### Files to create
```
apps/api/src/
├── plugins/
│   └── metrics.ts                 # Fastify plugin: prom-client setup + /metrics endpoint
├── utils/
│   └── metrics.ts                 # Metric definitions (histograms, counters, gauges)
docker/
├── prometheus/
│   └── prometheus.yml             # Prometheus scrape config
├── grafana/
│   ├── provisioning/
│   │   ├── datasources/
│   │   │   └── datasources.yml   # Prometheus + Loki datasources
│   │   └── dashboards/
│   │       └── dashboards.yml    # Dashboard provisioning config
│   └── dashboards/
│       ├── api-overview.json      # API overview dashboard
│       ├── worker-health.json     # Worker/queue dashboard
│       └── system-resources.json  # System-level dashboard
├── loki/
│   └── loki-config.yml           # Loki configuration
├── promtail/
│   └── promtail-config.yml       # Promtail log scraping config
```

### Metrics plugin (`plugins/metrics.ts`)
- Registers prom-client default metrics (process CPU, memory, event loop lag, GC)
- Exposes `GET /metrics` endpoint (Prometheus text format)
- `/metrics` endpoint excluded from auth middleware
- `/metrics` endpoint excluded from rate limiting
- Collects per-route metrics via `onResponse` hook

### Metric definitions (`utils/metrics.ts`)

**HTTP request metrics:**
| Metric | Type | Labels | Description |
|---|---|---|---|
| `http_requests_total` | Counter | method, route, status_code | Total HTTP requests |
| `http_request_duration_seconds` | Histogram | method, route, status_code | Request duration (buckets: 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10) |
| `http_request_size_bytes` | Histogram | method, route | Request body size |
| `http_response_size_bytes` | Histogram | method, route | Response body size |
| `http_active_requests` | Gauge | method, route | Currently in-flight requests |

**Authentication metrics:**
| Metric | Type | Labels | Description |
|---|---|---|---|
| `auth_login_total` | Counter | method (password, oauth, mfa), status (success, failure) | Login attempts |
| `auth_token_refresh_total` | Counter | status (success, failure) | Token refresh attempts |

**Database metrics:**
| Metric | Type | Labels | Description |
|---|---|---|---|
| `db_pool_active_connections` | Gauge | | Active database connections |
| `db_pool_idle_connections` | Gauge | | Idle database connections |
| `db_pool_waiting_requests` | Gauge | | Requests waiting for a connection |
| `db_query_duration_seconds` | Histogram | operation (select, insert, update, delete) | Query execution time |

**Worker/queue metrics:**
| Metric | Type | Labels | Description |
|---|---|---|---|
| `worker_jobs_processed_total` | Counter | queue, status (success, failure) | Jobs processed |
| `worker_job_duration_seconds` | Histogram | queue | Job processing time |
| `worker_queue_depth` | Gauge | queue | Messages waiting in queue |
| `worker_dead_letter_total` | Counter | queue | Messages sent to dead-letter queue |

**WebSocket/SSE metrics:**
| Metric | Type | Labels | Description |
|---|---|---|---|
| `ws_connections_active` | Gauge | transport (websocket, sse) | Active connections |
| `ws_connections_total` | Counter | transport | Total connections established |
| `ws_messages_sent_total` | Counter | event_type | Messages sent to clients |
| `ws_messages_received_total` | Counter | event_type | Messages received from clients |

**Search metrics:**
| Metric | Type | Labels | Description |
|---|---|---|---|
| `search_query_duration_seconds` | Histogram | index | Meilisearch query time |
| `search_index_sync_duration_seconds` | Histogram | index | Index sync operation time |

**Rate limiting metrics:**
| Metric | Type | Labels | Description |
|---|---|---|---|
| `rate_limit_hits_total` | Counter | route | Requests that hit the rate limit |

### Prometheus configuration (`prometheus.yml`)
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'taskforge-api'
    static_configs:
      - targets: ['api:3000']
    metrics_path: /metrics

  - job_name: 'taskforge-worker'
    static_configs:
      - targets: ['worker:3001']
    metrics_path: /metrics
```

Worker exposes metrics on a lightweight HTTP server (port 3001) alongside its queue processing.

### Grafana dashboards

**1. API Overview (`api-overview.json`)**
Panels:
- Request rate (req/s) by status code — time series
- Request duration (p50, p95, p99) — time series
- Error rate (4xx, 5xx) — time series
- Top 10 slowest endpoints — table
- Active requests — gauge
- Auth success/failure rate — time series
- Rate limit hits — time series
- Request/response size distribution — heatmap

**2. Worker Health (`worker-health.json`)**
Panels:
- Jobs processed per second by queue — time series
- Job processing duration (p50, p95, p99) — time series
- Queue depth by queue — time series
- Failed jobs rate — time series
- Dead letter queue count — stat panel
- Job success rate — gauge (percentage)

**3. System Resources (`system-resources.json`)**
Panels:
- Process CPU usage — time series
- Process memory (RSS, heap used, heap total) — time series
- Event loop lag — time series
- Active DB connections / pool utilization — time series
- WebSocket/SSE active connections — time series
- Messages sent/received rate — time series
- Search query latency — time series
- GC pause duration — time series

### Loki + Promtail (log aggregation)
- Promtail scrapes container logs via Docker socket
- Labels: container_name, service
- Loki stores and indexes logs
- Grafana "Explore" tab for log querying
- Log panels can be added to dashboards for correlating logs with metrics

### Dashboard provisioning
Dashboards auto-load when Grafana container starts — no manual import needed. Datasources (Prometheus + Loki) are also auto-provisioned.

### Worker metrics server
The worker process (MVP-018) runs a minimal HTTP server on port 3001 that:
- Exposes `GET /metrics` with prom-client registry
- Exposes `GET /health` returning queue connection status
- Pushes queue depth metrics by polling RabbitMQ management API periodically (every 30s)

## Acceptance Criteria
- [ ] API server exposes `/metrics` endpoint in Prometheus format
- [ ] Worker process exposes `/metrics` on port 3001
- [ ] HTTP request metrics are collected (total, duration, size)
- [ ] Authentication metrics track login success/failure
- [ ] Database pool metrics are reported
- [ ] Worker job metrics are collected per queue
- [ ] WebSocket/SSE connection metrics are tracked
- [ ] Search query metrics are collected
- [ ] Rate limit hit metrics are tracked
- [ ] Prometheus scrapes both API and worker targets
- [ ] Grafana starts with pre-provisioned datasources
- [ ] API Overview dashboard loads with all panels
- [ ] Worker Health dashboard loads with all panels
- [ ] System Resources dashboard loads with all panels
- [ ] Loki receives container logs via Promtail
- [ ] Logs are queryable in Grafana Explore
- [ ] All dashboards render correctly with live data
- [ ] `/metrics` endpoint is excluded from auth and rate limiting

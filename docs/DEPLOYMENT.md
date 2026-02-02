# Deployment Guide

This guide covers different deployment options for Yigcore Sentinel in production environments.

## Table of Contents

- [Quick Start](#quick-start)
- [Deployment Options](#deployment-options)
  - [Docker Compose (Recommended)](#docker-compose-recommended)
  - [Docker Container](#docker-container)
  - [npm Global Install](#npm-global-install)
  - [From Source](#from-source)
- [Configuration](#configuration)
- [Production Checklist](#production-checklist)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

The fastest way to deploy Sentinel in production:

```bash
# Clone repository
git clone https://github.com/Henghenggao/yigcore-sentinel.git
cd yigcore-sentinel

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Deploy with Docker Compose
docker compose up -d

# Check status
docker compose logs -f sentinel
```

Access the dashboard at `http://localhost:11435/dashboard/`

---

## Deployment Options

### Docker Compose (Recommended)

**Best for:** Production deployments with OpenClaw or other AI agents

#### 1. Setup Configuration

```bash
# Create .env file
cp .env.example .env
```

Edit `.env`:
```bash
SENTINEL_PORT=11435
DEFAULT_BUDGET=50.0
RATE_LIMIT_CAPACITY=100
LOG_LEVEL=info
```

#### 2. Customize Policy

Edit `policy.json` to match your governance requirements:

```json
{
  "defaultEffect": "allow",
  "rules": [
    {
      "id": "block_production_db_delete",
      "action": "database_delete",
      "effect": "deny",
      "reason": "Production database deletion is prohibited"
    }
  ]
}
```

#### 3. Deploy

```bash
docker compose up -d
```

#### 4. Verify Deployment

```bash
# Check health
curl http://localhost:11435/health

# View logs
docker compose logs -f sentinel

# Check dashboard
open http://localhost:11435/dashboard/
```

#### 5. Integrate with OpenClaw

Update your `docker-compose.yml` to include OpenClaw:

```yaml
services:
  sentinel:
    # ... existing Sentinel config

  openclaw:
    image: your-openclaw-image
    depends_on:
      sentinel:
        condition: service_healthy
    environment:
      - SENTINEL_URL=http://sentinel:11435
```

---

### Docker Container

**Best for:** Kubernetes, cloud container services (ECS, Cloud Run, etc.)

#### 1. Build Image

```bash
docker build -t yigcore-sentinel:0.2.0 .
```

#### 2. Run Container

```bash
docker run -d \
  --name sentinel \
  -p 11435:11435 \
  -e DEFAULT_BUDGET=50.0 \
  -e RATE_LIMIT_CAPACITY=200 \
  -v $(pwd)/policy.json:/app/policy.json:ro \
  --restart unless-stopped \
  yigcore-sentinel:0.2.0
```

#### 3. Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sentinel
spec:
  replicas: 2
  selector:
    matchLabels:
      app: sentinel
  template:
    metadata:
      labels:
        app: sentinel
    spec:
      containers:
      - name: sentinel
        image: yigcore-sentinel:0.2.0
        ports:
        - containerPort: 11435
        env:
        - name: DEFAULT_BUDGET
          value: "50.0"
        - name: LOG_LEVEL
          value: "info"
        volumeMounts:
        - name: policy
          mountPath: /app/policy.json
          subPath: policy.json
        livenessProbe:
          httpGet:
            path: /health
            port: 11435
          initialDelaySeconds: 5
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 11435
          initialDelaySeconds: 3
          periodSeconds: 5
      volumes:
      - name: policy
        configMap:
          name: sentinel-policy
---
apiVersion: v1
kind: Service
metadata:
  name: sentinel
spec:
  selector:
    app: sentinel
  ports:
  - port: 11435
    targetPort: 11435
  type: ClusterIP
```

---

### npm Global Install

**Best for:** Development, VM deployments, systemd services

#### 1. Install Globally

```bash
npm install -g yigcore-sentinel
```

#### 2. Run as Daemon

```bash
# Start in background
yigcore-sentinel start --daemon --budget 50 --port 11435

# Check status
yigcore-sentinel status

# Stop
yigcore-sentinel stop
```

#### 3. Systemd Service (Linux)

Create `/etc/systemd/system/sentinel.service`:

```ini
[Unit]
Description=Yigcore Sentinel Governance Service
After=network.target

[Service]
Type=simple
User=sentinel
WorkingDirectory=/opt/sentinel
ExecStart=/usr/bin/node /usr/lib/node_modules/yigcore-sentinel/dist/server.js
Restart=on-failure
RestartSec=5s

# Environment variables
Environment="PORT=11435"
Environment="DEFAULT_BUDGET=50.0"
Environment="RATE_LIMIT_CAPACITY=100"
Environment="LOG_LEVEL=info"
Environment="POLICY_PATH=/opt/sentinel/policy.json"

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/log/sentinel

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable sentinel
sudo systemctl start sentinel
sudo systemctl status sentinel
```

---

### From Source

**Best for:** Development, custom modifications

#### 1. Clone and Install

```bash
git clone https://github.com/Henghenggao/yigcore-sentinel.git
cd yigcore-sentinel
npm install
```

#### 2. Build

```bash
npm run build
```

#### 3. Run

```bash
# Development mode (with hot-reload)
npm run dev

# Production mode
npm start
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `11435` | HTTP server port |
| `HOST` | `0.0.0.0` | Server host binding |
| `DEFAULT_BUDGET` | `10.0` | Default budget per user ($) |
| `RATE_LIMIT_CAPACITY` | `100` | Max requests per burst |
| `RATE_LIMIT_REFILL_RATE` | `10` | Tokens added per second |
| `POLICY_PATH` | `./policy.json` | Path to policy file |
| `LOG_LEVEL` | `info` | Log level (debug, info, warn, error) |
| `NODE_ENV` | `production` | Node.js environment |

### Policy Configuration

See [POLICY_EXAMPLES.md](./docs/POLICY_EXAMPLES.md) for comprehensive policy examples.

**Basic structure:**

```json
{
  "defaultEffect": "allow",
  "rules": [
    {
      "id": "rule_name",
      "action": "action_pattern",
      "effect": "allow|deny|warn",
      "conditions": {
        "pathPattern": "/path/*",
        "maxCost": 0.1,
        "userPattern": "user_*",
        "timeWindow": "09:00-17:00"
      },
      "reason": "Human-readable explanation"
    }
  ]
}
```

---

## Production Checklist

### Security

- [ ] Run as non-root user (Docker/systemd)
- [ ] Enable HTTPS with reverse proxy (nginx, Caddy)
- [ ] Restrict CORS origins in production
- [ ] Use firewall to limit access to port 11435
- [ ] Rotate API keys regularly
- [ ] Review policy rules for least-privilege access

### Reliability

- [ ] Configure health checks (`/health` endpoint)
- [ ] Set up restart policies (Docker `--restart`, systemd `Restart=on-failure`)
- [ ] Monitor memory usage (limit to 256MB-512MB)
- [ ] Set up log rotation
- [ ] Test failover scenarios

### Observability

- [ ] Forward logs to centralized logging (ELK, Datadog, CloudWatch)
- [ ] Set up alerts for budget exhaustion
- [ ] Monitor audit log volume
- [ ] Track rate limit violations
- [ ] Dashboard access monitoring

### Performance

- [ ] Tune rate limit capacity based on workload
- [ ] Monitor API response times (<50ms target)
- [ ] Scale horizontally if needed (multiple instances with shared state)
- [ ] Use CDN for dashboard static assets

---

## Monitoring

### Health Check

```bash
curl http://localhost:11435/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": 1707000000000,
  "version": "0.2.0",
  "dashboardAvailable": true
}
```

### Metrics to Monitor

1. **Budget Usage**
   ```bash
   curl "http://localhost:11435/governance/stats?userId=agent_123"
   ```

2. **Audit Logs**
   ```bash
   curl "http://localhost:11435/governance/audit?limit=100"
   ```

3. **System Resources**
   ```bash
   docker stats sentinel  # Docker
   systemctl status sentinel  # systemd
   ```

### Alerts to Configure

- Budget > 80% for any user
- Rate limit violations > 10/min
- Health check failures
- Memory usage > 90%
- Audit log errors

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker compose logs sentinel

# Common issues:
# 1. Port already in use
docker compose down
lsof -i :11435  # Find conflicting process

# 2. Invalid policy.json
docker compose exec sentinel cat /app/policy.json
```

### High Memory Usage

```bash
# Monitor memory
docker stats sentinel

# Reduce audit log retention
# Edit server.ts to disable in-memory retention
# or reduce auditLogger buffer size
```

### Dashboard Not Loading

```bash
# Verify dashboard build exists
docker compose exec sentinel ls -la /app/dashboard/dist/

# Check server logs
docker compose logs sentinel | grep dashboard

# Rebuild dashboard
cd dashboard
npm install
npm run build
```

### OpenClaw Connection Issues

```bash
# Test connectivity from OpenClaw container
docker compose exec openclaw curl http://sentinel:11435/health

# Check network
docker network inspect yigcore-sentinel_sentinel-network
```

### Policy Not Applied

```bash
# Verify policy file loaded
curl http://localhost:11435/ | jq

# Reload policy (restart container)
docker compose restart sentinel

# Check policy syntax
cat policy.json | jq .
```

---

## Scaling Considerations

### Horizontal Scaling

For high-traffic deployments:

1. **Stateless Design**: Sentinel is stateless (in-memory only in v0.2.0)
2. **Load Balancer**: Use nginx/HAProxy to distribute requests
3. **Shared State**: v0.3.0+ will support Redis/PostgreSQL for shared budget state
4. **Session Affinity**: Not required (each request is independent)

### Vertical Scaling

Resource recommendations:

| Load | CPU | Memory |
|------|-----|--------|
| Light (<100 req/s) | 0.25 cores | 128MB |
| Medium (100-500 req/s) | 0.5 cores | 256MB |
| Heavy (500-2000 req/s) | 1 core | 512MB |

---

## Next Steps

- Read [API Documentation](./docs/API.md) for integration details
- Explore [Policy Examples](./docs/POLICY_EXAMPLES.md) for advanced governance
- Join [GitHub Discussions](https://github.com/Henghenggao/yigcore-sentinel/discussions) for support

---

**Need help?** Open an issue at https://github.com/Henghenggao/yigcore-sentinel/issues

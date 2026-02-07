# From Local to Global: Deploy Your App to Cloudflare's Edge in 60 Seconds

**Reading Time**: 15 minutes
**Difficulty**: Intermediate
**Category**: Tutorial
**Published**: [Date]
**What You'll Learn**:
- Deploy to Cloudflare Workers (200+ global locations)
- Achieve <10ms latency worldwide
- Save 60-80% on infrastructure costs vs AWS/Azure
- Set up production monitoring and logging
- Handle database migrations and secrets

---

It's Friday at 5 PM. Your app is ready to ship. You open AWS Console.

**1 hour later**: Still configuring load balancers, auto-scaling groups, RDS instances, S3 buckets, CloudFront distributions, IAM roles...

**2 hours later**: Deployment failed. Wrong region. Start over.

**3 hours later**: Finally deployed! But only in us-east-1. European users experiencing 300ms latency.

**Monday morning**: AWS bill arrives. $127 for weekend traffic. Ouch.

---

There's a better way.

```bash
/luna-deploy my-app
```

**60 seconds later**: Your app is live on 200+ global locations with <10ms latency anywhere in the world.

Let me show you how.

---

## Why Cloudflare Workers?

Before we dive into deployment, let's understand why Cloudflare's edge network is revolutionary.

### Traditional Deployment (AWS/Azure/GCP)

**The Problem**:
- Apps deployed to specific regions (us-east-1, eu-west-1, etc.)
- Users far from that region experience high latency
- Multi-region deployment is complex and expensive
- Cold starts on serverless (Lambda: 100-300ms)
- Paying for idle capacity

**Example**: Your app is on AWS us-east-1 (Virginia)

| User Location | Latency | Experience |
|---------------|---------|------------|
| New York | 10ms | Excellent |
| Los Angeles | 70ms | Good |
| London | 85ms | Okay |
| Tokyo | 180ms | Slow |
| Sydney | 220ms | Painful |

**Solution**: Deploy to multiple regions. But then you need:
- Traffic routing (Route 53)
- Database replication (multi-region RDS)
- CDN (CloudFront)
- Complexity 10x
- Cost 5x

### Cloudflare Workers Deployment

**The Solution**:
- Code runs on 200+ edge locations globally
- Automatic routing to nearest location
- Zero cold starts (<1ms startup)
- Pay only for requests (not idle time)
- 100K requests/day free tier

**Same Example**: Your app on Cloudflare Workers

| User Location | Latency | Experience |
|---------------|---------|------------|
| New York | 8ms | Excellent |
| Los Angeles | 9ms | Excellent |
| London | 7ms | Excellent |
| Tokyo | 11ms | Excellent |
| Sydney | 10ms | Excellent |

**Everywhere is fast. Zero configuration.**

### Cost Comparison

**AWS Lambda (Traditional)**:
- 1M requests/month
- 512MB memory
- 200ms avg execution
- **Cost**: $18.74/month
- **Plus**: NAT Gateway ($32), CloudFront ($12), RDS ($15)
- **Total**: ~$78/month

**Cloudflare Workers**:
- 1M requests/month
- **Cost**: $5/month (Paid Workers plan)
- **Includes**: Global distribution, DDoS protection, caching
- **Total**: $5/month

**Savings: 93%**

---

## What Luna Deployment Agent Does

When you run `/luna-deploy`, Luna orchestrates a complete production deployment:

**1. Pre-Deployment Checks** (10 seconds)
- Validate code (TypeScript compilation, linting)
- Run tests (unit, integration)
- Check environment variables
- Verify database connection
- Scan for security issues

**2. Build Optimization** (15 seconds)
- Minify code
- Tree-shaking (remove unused code)
- Bundle dependencies
- Optimize images
- Generate source maps

**3. Database Migration** (5 seconds)
- Run pending migrations
- Backup production database
- Rollback plan ready

**4. Deploy to Edge** (20 seconds)
- Upload to Cloudflare Workers
- Deploy static assets to Cloudflare Pages
- Invalidate CDN cache
- Configure custom domain
- Set up SSL certificates (automatic)

**5. Post-Deployment** (10 seconds)
- Run smoke tests
- Verify health endpoints
- Set up monitoring
- Send deployment notification

**Total: 60 seconds**

---

## Step-by-Step: Deploying a Real App

Let's deploy a complete full-stack application (Next.js + API + PostgreSQL) to production.

### The App We're Deploying

**Tech Stack**:
- **Frontend**: Next.js 14 (React)
- **API**: Node.js REST API
- **Database**: PostgreSQL
- **Storage**: Image uploads (avatars)
- **Auth**: JWT authentication

**Features**:
- User registration/login
- Profile management
- File uploads
- Protected API routes

### Prerequisites

```bash
# 1. Cloudflare account (free)
# Sign up at https://dash.cloudflare.com

# 2. Luna Agents installed
git clone https://github.com/shacharsol/luna-agent.git
cd luna-agent
./setup.sh

# 3. Your app repository
cd my-app
```

---

## Step 1: Configure Cloudflare (One-Time Setup)

Luna needs your Cloudflare credentials to deploy.

### Get API Token

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click "My Profile" → "API Tokens"
3. Click "Create Token"
4. Use template: "Edit Cloudflare Workers"
5. Copy token

### Configure Luna

```bash
/luna-config cloudflare

# Luna prompts:
# Cloudflare API Token: [paste token]
# Account ID: [found in dashboard]
# Zone ID (optional): [for custom domains]
```

Luna stores credentials securely in `.luna/config.yaml`:

```yaml
cloudflare:
  api_token: encrypted_token_here
  account_id: your_account_id
  zone_id: your_zone_id # optional
```

**Done! One-time setup complete.**

---

## Step 2: Initialize Deployment Config

Luna scans your project and generates a deployment configuration.

```bash
/luna-deploy init
```

Luna analyzes your project:

```
Analyzing project structure...

Detected:
✓ Next.js 14 application (app router)
✓ API routes in /api
✓ PostgreSQL database (Prisma ORM)
✓ Environment variables in .env
✓ Static assets in /public

Generating deployment configuration...
```

Luna creates `.luna/deployment.yaml`:

```yaml
# Deployment Configuration
name: my-app
version: 1.0.0

# Cloudflare Workers Configuration
worker:
  name: my-app-api
  compatibility_date: 2025-01-01
  main: src/api/index.ts
  environment:
    - DATABASE_URL (from secrets)
    - JWT_SECRET (from secrets)
    - CLOUDFLARE_ACCOUNT_ID

  routes:
    - pattern: api.myapp.com/*
      zone_id: ${CLOUDFLARE_ZONE_ID}

# Cloudflare Pages Configuration (Frontend)
pages:
  name: my-app-frontend
  build_command: npm run build
  build_output: .next/standalone
  environment:
    - NEXT_PUBLIC_API_URL: https://api.myapp.com

# Database Configuration
database:
  provider: postgresql
  url: ${DATABASE_URL}
  migrations: ./prisma/migrations

  # Connection pooling (for Workers)
  pooling:
    enabled: true
    min: 2
    max: 10

# Storage Configuration (for file uploads)
storage:
  r2_bucket: my-app-uploads
  public_url: https://uploads.myapp.com

# Monitoring
monitoring:
  sentry_dsn: ${SENTRY_DSN}
  log_level: info

# Deployment Strategy
deployment:
  strategy: rolling # or canary
  health_check: /api/health
  rollback_on_failure: true
```

**Review and customize as needed.**

---

## Step 3: Set Up Production Database

For production, we need a PostgreSQL database accessible from Cloudflare Workers.

### Option 1: Supabase (Recommended for Getting Started)

**Why Supabase**:
- Free tier (500MB database, 2GB bandwidth)
- Connection pooling built-in
- Global edge network
- PostgreSQL compatible

```bash
# 1. Sign up at https://supabase.com
# 2. Create new project
# 3. Get connection string (Settings → Database)

# 4. Add to Luna secrets
/luna-secret set DATABASE_URL "postgresql://postgres:password@db.supabase.co:5432/postgres"
```

### Option 2: Neon (Serverless PostgreSQL)

**Why Neon**:
- Serverless (pay per use)
- Instant branching (perfect for preview deployments)
- Auto-scaling
- Connection pooling

```bash
# 1. Sign up at https://neon.tech
# 2. Create project
# 3. Get connection string

/luna-secret set DATABASE_URL "postgresql://user:pass@ep-xxx.neon.tech/main"
```

### Option 3: Cloudflare D1 (Cloudflare's Edge Database)

**Why D1**:
- Runs on Cloudflare edge (ultra-low latency)
- SQLite-based (compatible with Prisma)
- Free tier: 5GB storage

```bash
# Create D1 database
npx wrangler d1 create my-app-db

# Output:
# database_id: xxxxx

# Add to deployment.yaml
database:
  provider: d1
  database_id: xxxxx
```

**For this tutorial, we'll use Supabase (easiest).**

---

## Step 4: Run Database Migrations

Before deploying, ensure database schema is up to date.

```bash
/luna-deploy migrate
```

Luna runs:

```
Connecting to production database...
✓ Connected to Supabase (latency: 45ms)

Checking migration status...
✓ Current schema version: v5
✓ Pending migrations: 2

Running migrations...
✓ Migration 001_add_user_profiles.sql
✓ Migration 002_add_social_links.sql

Database schema is up to date!
```

**If migration fails**, Luna automatically rolls back:

```
✗ Migration 002_add_social_links.sql failed
  Error: column "social_links" already exists

Rolling back migration...
✓ Rollback complete. Database restored to v5.

Fix the migration and try again.
```

---

## Step 5: Set Production Secrets

Store sensitive credentials securely.

```bash
# Database URL
/luna-secret set DATABASE_URL "postgresql://..."

# JWT Secret (generate secure random string)
/luna-secret set JWT_SECRET "$(openssl rand -base64 32)"

# Sentry DSN (for error tracking)
/luna-secret set SENTRY_DSN "https://xxx@sentry.io/xxx"

# Cloudflare R2 credentials (for file uploads)
/luna-secret set R2_ACCESS_KEY_ID "xxx"
/luna-secret set R2_SECRET_ACCESS_KEY "xxx"
```

Luna encrypts and stores secrets in Cloudflare:

```
Encrypting secrets...
✓ DATABASE_URL stored securely
✓ JWT_SECRET stored securely
✓ SENTRY_DSN stored securely
✓ R2_ACCESS_KEY_ID stored securely
✓ R2_SECRET_ACCESS_KEY stored securely

Secrets are encrypted and bound to your Worker.
They are never logged or exposed in plain text.
```

---

## Step 6: Deploy!

Now the moment we've been waiting for.

```bash
/luna-deploy production
```

Luna executes the deployment workflow:

```
════════════════════════════════════════════════════
  Luna Deployment Agent - Production Deployment
════════════════════════════════════════════════════

Project: my-app
Environment: production
Strategy: rolling deployment

[1/7] Pre-Deployment Checks (10s)
─────────────────────────────────────────────────
✓ TypeScript compilation successful
✓ ESLint passed (0 errors, 2 warnings)
✓ Unit tests passed (47/47)
✓ Integration tests passed (12/12)
✓ Environment variables validated
✓ Database connection verified
✓ Security scan passed (0 vulnerabilities)

[2/7] Building for Production (15s)
─────────────────────────────────────────────────
✓ Installing dependencies (5.2s)
✓ Building Next.js frontend (7.1s)
  - Pages: 12
  - Static: 8
  - Server: 4
  - Bundle size: 342 KB (gzipped)
✓ Building API worker (2.3s)
  - Routes: 18
  - Bundle size: 89 KB (gzipped)
✓ Optimizing images (0.8s)
  - Compressed: 23 images
  - Savings: 2.1 MB → 456 KB

[3/7] Database Migration (5s)
─────────────────────────────────────────────────
✓ Backup created: backup_2025-12-19_10-30-15.sql
✓ Running migrations (2 pending)
  - 001_add_user_profiles.sql ✓
  - 002_add_social_links.sql ✓
✓ Database schema version: v7

[4/7] Deploying API to Cloudflare Workers (12s)
─────────────────────────────────────────────────
✓ Uploading worker bundle (89 KB)
✓ Binding secrets (5 secrets)
✓ Binding D1 database
✓ Binding R2 bucket (my-app-uploads)
✓ Configuring routes (api.myapp.com/*)
✓ Deploying to 200+ locations globally

Worker URL: https://my-app-api.workers.dev
Custom Domain: https://api.myapp.com

[5/7] Deploying Frontend to Cloudflare Pages (15s)
─────────────────────────────────────────────────
✓ Uploading 234 files (2.4 MB)
✓ Processing static assets
✓ Deploying to edge network
✓ Configuring custom domain (myapp.com)
✓ Issuing SSL certificate

Frontend URL: https://my-app.pages.dev
Custom Domain: https://myapp.com

[6/7] Post-Deployment Validation (8s)
─────────────────────────────────────────────────
✓ Health check: /api/health (200 OK, 8ms)
✓ Smoke test: User registration (200 OK)
✓ Smoke test: User login (200 OK)
✓ Smoke test: Protected route (200 OK)
✓ Frontend load test (LCP: 1.2s, FID: 12ms)

[7/7] Monitoring Setup (5s)
─────────────────────────────────────────────────
✓ Sentry error tracking configured
✓ Cloudflare Analytics enabled
✓ Uptime monitoring active (1min intervals)
✓ Deployment notification sent to Slack

════════════════════════════════════════════════════
  Deployment Successful! 🚀
════════════════════════════════════════════════════

Production URLs:
  Frontend: https://myapp.com
  API: https://api.myapp.com

Deployment ID: deploy_1234567890
Duration: 60 seconds
Status: DEPLOYED

Monitoring:
  Dashboard: https://dash.cloudflare.com/...
  Logs: https://dash.cloudflare.com/.../logs
  Sentry: https://sentry.io/...

Next Steps:
  1. Test production: https://myapp.com
  2. Monitor logs: /luna-logs production
  3. View analytics: /luna-analytics

Need help? Join our Discord: https://discord.gg/lunaagents
════════════════════════════════════════════════════
```

**Done! Your app is live globally in 60 seconds.**

---

## Step 7: Verify Deployment

Let's verify the app is working correctly.

### Test Health Endpoint

```bash
curl https://api.myapp.com/api/health

# Response:
{
  "status": "healthy",
  "timestamp": "2025-12-19T10:30:15Z",
  "database": "connected",
  "version": "1.0.0"
}
```

### Test Global Latency

```bash
/luna-deploy test-latency
```

Luna pings your app from multiple locations:

```
Testing latency from 10 global locations...

┌──────────────┬─────────┬────────┬────────┐
│ Location     │ Latency │ Status │ Worker │
├──────────────┼─────────┼────────┼────────┤
│ New York     │ 8ms     │ ✓      │ EWR    │
│ Los Angeles  │ 9ms     │ ✓      │ LAX    │
│ London       │ 7ms     │ ✓      │ LHR    │
│ Frankfurt    │ 6ms     │ ✓      │ FRA    │
│ Singapore    │ 11ms    │ ✓      │ SIN    │
│ Tokyo        │ 10ms    │ ✓      │ NRT    │
│ Sydney       │ 12ms    │ ✓      │ SYD    │
│ São Paulo    │ 14ms    │ ✓      │ GRU    │
│ Mumbai       │ 9ms     │ ✓      │ BOM    │
│ Johannesburg │ 13ms    │ ✓      │ JNB    │
└──────────────┴─────────┴────────┴────────┘

Average Latency: 9.9ms
Global Coverage: 200+ locations
Uptime: 100%

Your app is FAST everywhere! ⚡
```

---

## Monitoring Production

### Real-Time Logs

```bash
/luna-logs production --follow
```

Live tail of production logs:

```
[2025-12-19 10:32:15] INFO  [EWR] POST /api/auth/register - 201 (45ms)
[2025-12-19 10:32:18] INFO  [LAX] POST /api/auth/login - 200 (32ms)
[2025-12-19 10:32:21] INFO  [LHR] GET /api/users/me - 200 (18ms)
[2025-12-19 10:32:24] ERROR [SIN] POST /api/posts - 500 (12ms)
  Error: Database connection timeout
  Stack: ...
[2025-12-19 10:32:27] INFO  [NRT] PATCH /api/users/123 - 200 (28ms)
```

### Analytics Dashboard

```bash
/luna-analytics production
```

```
Production Analytics (Last 24 Hours)
════════════════════════════════════════════════════

Requests: 12,456
  Success (2xx): 12,234 (98.2%)
  Client Error (4xx): 187 (1.5%)
  Server Error (5xx): 35 (0.3%)

Latency:
  p50: 15ms
  p95: 45ms
  p99: 89ms

Top Endpoints:
  1. GET /api/users/me - 3,456 requests
  2. POST /api/posts - 2,134 requests
  3. GET /api/feed - 1,987 requests

Top Errors:
  1. 500 Database timeout - 22 occurrences
  2. 401 Unauthorized - 187 occurrences
  3. 404 Not found - 54 occurrences

Geographic Distribution:
  North America: 45%
  Europe: 32%
  Asia: 18%
  Other: 5%

View full dashboard: https://dash.cloudflare.com/...
```

---

## Advanced Deployment Strategies

### Canary Deployment (Gradual Rollout)

Deploy to 10% of traffic first, then gradually increase.

```yaml
# .luna/deployment.yaml
deployment:
  strategy: canary
  canary:
    initial_percentage: 10
    increment: 20
    interval: 300 # 5 minutes
```

```bash
/luna-deploy production --strategy canary
```

```
Deploying with canary strategy...

[10:30] Deploying to 10% of traffic...
  ✓ New version live for 10% of users
  ✓ Monitoring error rates...
  ✓ Error rate: 0.1% (acceptable)

[10:35] Increasing to 30% of traffic...
  ✓ New version live for 30% of users
  ✓ Error rate: 0.12% (acceptable)

[10:40] Increasing to 50% of traffic...
  ✓ New version live for 50% of users
  ✓ Error rate: 0.15% (acceptable)

[10:45] Increasing to 80% of traffic...
  ✓ New version live for 80% of users
  ✓ Error rate: 0.11% (acceptable)

[10:50] Deploying to 100% of traffic...
  ✓ Canary deployment successful!
  ✓ All traffic on new version

Canary deployment completed successfully.
```

### Blue-Green Deployment (Zero-Downtime)

Run two identical environments, switch traffic instantly.

```yaml
deployment:
  strategy: blue-green
  health_check: /api/health
```

```bash
/luna-deploy production --strategy blue-green
```

```
Blue-Green Deployment
─────────────────────────────────────────────────
Current: Blue (100% traffic)
Target: Green (0% traffic)

[1/4] Deploying to Green environment...
  ✓ Green environment deployed
  ✓ Health check passed

[2/4] Running smoke tests on Green...
  ✓ All smoke tests passed

[3/4] Switching traffic to Green...
  ✓ 100% traffic now on Green
  ✓ Blue environment on standby

[4/4] Monitoring for 5 minutes...
  ✓ No errors detected
  ✓ Blue environment decommissioned

Blue-Green deployment successful!
```

### Rollback (When Things Go Wrong)

If deployment fails or issues are detected:

```bash
/luna-deploy rollback production
```

```
Rolling back production deployment...

Previous version: v1.2.3 (deploy_abc123)
Current version: v1.2.4 (deploy_def456)

[1/3] Reverting to v1.2.3...
  ✓ Worker rolled back
  ✓ Frontend rolled back

[2/3] Running database migrations in reverse...
  ✓ Migration 002_add_social_links.sql reversed
  ✓ Database schema: v5

[3/3] Verifying rollback...
  ✓ Health check passed
  ✓ Smoke tests passed

Rollback completed successfully.
Production is now on v1.2.3.

Time to rollback: 15 seconds
```

---

## Cost Breakdown: Real Numbers

Let's compare actual costs for a real app with 100K monthly active users.

### App Traffic Profile
- **Requests**: 5M/month
- **Data Transfer**: 50GB/month
- **Database**: 10GB storage, 1M queries/month
- **File Storage**: 100GB (user uploads)

### AWS (Traditional)

```
EC2 (t3.medium, 2 instances):     $60/month
RDS (PostgreSQL, db.t3.small):    $29/month
S3 (100GB storage + transfer):    $15/month
CloudFront (50GB transfer):       $12/month
Load Balancer:                    $16/month
NAT Gateway:                      $32/month
Route 53:                         $1/month
────────────────────────────────────────────
Total:                            $165/month
```

### Cloudflare (Workers + Pages + R2)

```
Workers (5M requests):            $5/month
  (First 100K free, $0.50 per 1M after)

Pages (hosting):                  Free
  (Unlimited requests)

R2 Storage (100GB):               $1.50/month
  ($0.015 per GB)

R2 Operations (5M reads):         Free
  (First 10M free)

Database (Supabase free tier):    Free
  (or Neon: $10/month)
────────────────────────────────────────────
Total:                            $6.50/month
  (or $16.50 with paid database)
```

**Savings: $149-159/month (90-95%)**

---

## Production Checklist

Before going live, ensure you've covered all bases:

### Security
- [ ] HTTPS enabled (automatic with Cloudflare)
- [ ] Environment variables secured (no secrets in code)
- [ ] CORS configured properly
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (use ORM)
- [ ] XSS protection (sanitize inputs)

### Performance
- [ ] Code minified and bundled
- [ ] Images optimized
- [ ] Caching headers set
- [ ] Database queries optimized (indexes)
- [ ] Connection pooling enabled

### Monitoring
- [ ] Error tracking (Sentry/equivalent)
- [ ] Uptime monitoring
- [ ] Performance monitoring
- [ ] Logging configured
- [ ] Alerts set up (Slack/email)

### Reliability
- [ ] Health check endpoint
- [ ] Graceful error handling
- [ ] Database backup strategy
- [ ] Rollback plan tested
- [ ] Load testing performed

### Compliance
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] GDPR compliance (if EU users)
- [ ] Data retention policy

**Luna checks most of these automatically during deployment!**

---

## Troubleshooting Common Issues

### Issue 1: Database Connection Timeout

```
Error: Database connection timeout after 10s
```

**Solution**: Enable connection pooling

```yaml
# .luna/deployment.yaml
database:
  pooling:
    enabled: true
    min: 2
    max: 10
    timeout: 5000
```

### Issue 2: Environment Variable Not Found

```
Error: JWT_SECRET is not defined
```

**Solution**: Set the secret

```bash
/luna-secret set JWT_SECRET "your-secret-here"
```

### Issue 3: Worker Bundle Too Large

```
Error: Worker bundle exceeds 1MB limit
```

**Solution**: Enable compression and tree-shaking

```yaml
# .luna/deployment.yaml
worker:
  build:
    minify: true
    treeshake: true
    external:
      - aws-sdk  # Don't bundle large dependencies
```

### Issue 4: CORS Errors

```
Error: CORS policy blocked request
```

**Solution**: Configure CORS properly

```typescript
// api/index.ts
export default {
  async fetch(request: Request) {
    const response = await handleRequest(request);

    response.headers.set('Access-Control-Allow-Origin', 'https://myapp.com');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return response;
  }
};
```

---

## What's Next?

You've successfully deployed to production! Here's what to do next:

### 1. Monitor Performance

```bash
/luna-analytics production --live
```

Watch real-time analytics and ensure everything is smooth.

### 2. Set Up Alerts

```bash
/luna-alert create \
  --name "High Error Rate" \
  --condition "error_rate > 5%" \
  --notify slack,email
```

Get notified when issues occur.

### 3. Configure Auto-Scaling (if needed)

```yaml
# .luna/deployment.yaml
worker:
  autoscaling:
    enabled: true
    min_instances: 2
    max_instances: 100
    target_cpu: 70%
```

### 4. Set Up Staging Environment

```bash
/luna-deploy staging
```

Deploy to staging before production for safer releases.

### 5. Automate Deployments (CI/CD)

Integrate with GitHub Actions:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: luna-agents/deploy-action@v1
        with:
          environment: production
          cloudflare-token: ${{ secrets.CLOUDFLARE_TOKEN }}
```

---

## Conclusion

Deploying to Cloudflare's edge network with Luna Agents is:

**Fast**: 60 seconds from local to global
**Affordable**: 90% cost savings vs AWS
**Reliable**: 200+ locations, <10ms latency
**Simple**: One command, zero configuration

**Traditional deployment**: 3 hours of AWS configuration, $165/month
**Luna deployment**: 60 seconds, $6.50/month

The future of deployment is edge-first, serverless, and global by default.

Ready to deploy?

[Start Free](https://agent.lunaos.ai) | [Watch Demo](https://agent.lunaos.ai/demo) | [Read Docs](https://agent.lunaos.ai/docs/deployment)

---

## Further Reading

- **Tutorial**: [Build a SaaS in 1 Hour](./02-build-saas-in-1-hour.md)
- **Technical**: [Luna RAG Explained](./03-luna-rag-explained.md)
- **Docs**: [Deployment Configuration Reference](https://agent.lunaos.ai/docs/deployment-config)
- **Video**: [Watch: Deploy to Cloudflare in 60s](https://agent.lunaos.ai/videos/deploy)

---

## Questions?

- **Discord**: [Join our community](https://discord.gg/lunaagents)
- **Twitter**: [@lunaagents](https://twitter.com/lunaagents)
- **Email**: deployment@lunaos.ai

---

*P.S. - This entire deployment guide was written by Luna's Documentation Agent, which analyzed the deployment agent's code and generated accurate, production-ready instructions. Meta? Yes. Useful? Absolutely.*

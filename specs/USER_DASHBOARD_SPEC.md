# Luna Agents - User Dashboard Specification

**Version**: 1.0
**Last Updated**: December 2025
**Status**: Implementation Ready

---

## Overview

The Luna Agents User Dashboard is the central hub for users to manage their account, monitor usage, access API keys, and view analytics. It's designed to provide transparency, control, and value visualization.

**Goals**:
- Display real-time usage metrics and limits
- Provide easy access to API keys and configuration
- Show subscription status and billing information
- Visualize productivity gains and value delivered
- Enable seamless tier upgrades
- Facilitate team management (Team/Enterprise tiers)

---

## User Stories

### As a Free Tier User:
- I want to see my daily RAG query usage so I know when I'm approaching limits
- I want to view my file indexing status so I can manage my codebase
- I want to upgrade to Pro when I hit limits
- I want to see what premium features I'm missing

### As a Pro Tier User:
- I want to see my unlimited usage stats to validate ROI
- I want to manage my API keys securely
- I want to view productivity metrics (time saved, features shipped)
- I want to access advanced analytics

### As a Team Admin:
- I want to see team member usage across the board
- I want to manage team seats and permissions
- I want to view consolidated billing
- I want team-level analytics

---

## Technical Architecture

### Frontend Stack
- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: React Query + Zustand
- **Charts**: Recharts or Chart.js
- **Auth**: NextAuth.js with JWT

### Backend Stack
- **API**: NestJS REST API + tRPC
- **Database**: PostgreSQL (user data, metrics)
- **Cache**: Redis (real-time usage tracking)
- **Authentication**: JWT tokens + API keys
- **Rate Limiting**: Redis-based

### Infrastructure
- **Hosting**: Cloudflare Pages (frontend)
- **API**: Cloudflare Workers (serverless)
- **Database**: Cloudflare D1 or PostgreSQL on Supabase
- **Storage**: Cloudflare R2 (logs, exports)

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  avatar_url TEXT,

  -- Authentication
  password_hash TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token TEXT,
  reset_password_token TEXT,
  reset_password_expires TIMESTAMP,

  -- Subscription
  tier VARCHAR(50) DEFAULT 'free', -- free, pro, team, enterprise
  subscription_status VARCHAR(50) DEFAULT 'active', -- active, canceled, past_due, trialing
  subscription_id TEXT, -- LemonSqueezy subscription ID
  customer_id TEXT, -- LemonSqueezy customer ID
  subscription_start_date TIMESTAMP,
  subscription_end_date TIMESTAMP,
  trial_ends_at TIMESTAMP,

  -- Settings
  preferences JSONB DEFAULT '{}',
  notification_settings JSONB DEFAULT '{}',

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_customer_id ON users(customer_id);
CREATE INDEX idx_users_tier ON users(tier);
```

### API Keys Table
```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Key Details
  name VARCHAR(255) NOT NULL,
  key_hash TEXT NOT NULL, -- Hashed API key
  key_prefix VARCHAR(20), -- First 8 chars for display (e.g., "luna_sk_12345678...")

  -- Permissions
  scopes JSONB DEFAULT '["read", "write"]', -- ["read", "write", "admin"]
  rate_limit INTEGER DEFAULT 100, -- requests per minute

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
```

### Usage Metrics Table
```sql
CREATE TABLE usage_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Metrics Type
  metric_type VARCHAR(100) NOT NULL, -- rag_query, agent_execution, file_indexed, deployment, etc.
  metric_category VARCHAR(50), -- usage, performance, productivity

  -- Metric Data
  count INTEGER DEFAULT 1,
  duration_ms INTEGER, -- for performance tracking
  success BOOLEAN DEFAULT TRUE,

  -- Context
  agent_name VARCHAR(100), -- which agent was used
  project_id UUID, -- which project (if applicable)
  metadata JSONB DEFAULT '{}', -- additional context

  -- Timestamp
  recorded_at TIMESTAMP DEFAULT NOW(),
  date DATE DEFAULT CURRENT_DATE
);

CREATE INDEX idx_usage_metrics_user_id ON usage_metrics(user_id);
CREATE INDEX idx_usage_metrics_date ON usage_metrics(date);
CREATE INDEX idx_usage_metrics_type ON usage_metrics(metric_type);
CREATE INDEX idx_usage_metrics_user_date ON usage_metrics(user_id, date);
```

### Daily Usage Rollups Table (for performance)
```sql
CREATE TABLE daily_usage_rollups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Usage Counts
  rag_queries INTEGER DEFAULT 0,
  agent_executions INTEGER DEFAULT 0,
  files_indexed INTEGER DEFAULT 0,
  deployments INTEGER DEFAULT 0,

  -- Performance Metrics
  avg_response_time_ms INTEGER,
  success_rate DECIMAL(5,2), -- percentage

  -- Productivity Metrics
  features_shipped INTEGER DEFAULT 0,
  bugs_fixed INTEGER DEFAULT 0,
  time_saved_minutes INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, date)
);

CREATE INDEX idx_daily_rollups_user_date ON daily_usage_rollups(user_id, date);
```

### Teams Table
```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,

  -- Subscription (for Team/Enterprise tiers)
  tier VARCHAR(50) DEFAULT 'team', -- team, enterprise
  subscription_id TEXT,
  max_members INTEGER DEFAULT 5,

  -- Settings
  settings JSONB DEFAULT '{}',

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_teams_slug ON teams(slug);
```

### Team Members Table
```sql
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Role
  role VARCHAR(50) DEFAULT 'member', -- owner, admin, member

  -- Status
  status VARCHAR(50) DEFAULT 'active', -- active, invited, suspended
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMP,
  joined_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(team_id, user_id)
);

CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
```

---

## API Endpoints

### Authentication Endpoints

#### POST /api/auth/register
Register a new user account.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

**Response** (201 Created):
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "tier": "free"
  },
  "token": "jwt_token_here"
}
```

#### POST /api/auth/login
Authenticate and receive JWT token.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response** (200 OK):
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "tier": "pro"
  },
  "token": "jwt_token_here"
}
```

#### POST /api/auth/logout
Invalidate current session.

**Headers**: `Authorization: Bearer {token}`

**Response** (200 OK):
```json
{
  "message": "Logged out successfully"
}
```

---

### User Profile Endpoints

#### GET /api/user/profile
Get current user profile.

**Headers**: `Authorization: Bearer {token}`

**Response** (200 OK):
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "avatar_url": "https://...",
  "tier": "pro",
  "subscription_status": "active",
  "subscription_start_date": "2025-01-01T00:00:00Z",
  "subscription_end_date": "2026-01-01T00:00:00Z",
  "created_at": "2025-01-01T00:00:00Z",
  "last_login_at": "2025-12-17T10:30:00Z"
}
```

#### PATCH /api/user/profile
Update user profile.

**Headers**: `Authorization: Bearer {token}`

**Request Body**:
```json
{
  "name": "Jane Doe",
  "avatar_url": "https://..."
}
```

**Response** (200 OK):
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "Jane Doe",
  "avatar_url": "https://..."
}
```

---

### Usage Metrics Endpoints

#### GET /api/usage/current
Get current billing period usage.

**Headers**: `Authorization: Bearer {token}`

**Query Parameters**:
- `period` (optional): `today`, `week`, `month`, `all` (default: `month`)

**Response** (200 OK):
```json
{
  "period": "month",
  "period_start": "2025-12-01T00:00:00Z",
  "period_end": "2025-12-31T23:59:59Z",
  "tier": "pro",
  "limits": {
    "rag_queries": "unlimited",
    "files_indexed": "unlimited",
    "agent_executions": "unlimited"
  },
  "usage": {
    "rag_queries": 1234,
    "agent_executions": 456,
    "files_indexed": 5678,
    "deployments": 23
  },
  "daily_breakdown": [
    {
      "date": "2025-12-01",
      "rag_queries": 45,
      "agent_executions": 12,
      "files_indexed": 234
    }
  ]
}
```

#### GET /api/usage/history
Get historical usage data.

**Headers**: `Authorization: Bearer {token}`

**Query Parameters**:
- `start_date`: ISO date string
- `end_date`: ISO date string
- `metric_type` (optional): Filter by specific metric

**Response** (200 OK):
```json
{
  "start_date": "2025-11-01",
  "end_date": "2025-12-17",
  "data": [
    {
      "date": "2025-11-01",
      "rag_queries": 89,
      "agent_executions": 23,
      "files_indexed": 456
    }
  ],
  "totals": {
    "rag_queries": 4567,
    "agent_executions": 1234,
    "files_indexed": 23456
  }
}
```

#### GET /api/usage/analytics
Get productivity analytics.

**Headers**: `Authorization: Bearer {token}`

**Response** (200 OK):
```json
{
  "period": "month",
  "productivity": {
    "features_shipped": 12,
    "bugs_fixed": 34,
    "time_saved_hours": 45.5,
    "deployments": 23,
    "code_reviews": 56
  },
  "performance": {
    "avg_response_time_ms": 245,
    "success_rate": 98.5,
    "uptime_percentage": 99.8
  },
  "roi": {
    "cost_per_month": 29,
    "estimated_value": 1200,
    "roi_multiplier": 41.4
  }
}
```

---

### API Keys Endpoints

#### GET /api/keys
List all API keys for current user.

**Headers**: `Authorization: Bearer {token}`

**Response** (200 OK):
```json
{
  "keys": [
    {
      "id": "uuid",
      "name": "Production Key",
      "key_prefix": "luna_sk_12345678",
      "scopes": ["read", "write"],
      "is_active": true,
      "last_used_at": "2025-12-17T10:00:00Z",
      "created_at": "2025-01-01T00:00:00Z",
      "expires_at": null
    }
  ]
}
```

#### POST /api/keys
Create a new API key.

**Headers**: `Authorization: Bearer {token}`

**Request Body**:
```json
{
  "name": "New API Key",
  "scopes": ["read", "write"],
  "expires_in_days": 365
}
```

**Response** (201 Created):
```json
{
  "id": "uuid",
  "name": "New API Key",
  "key": "luna_sk_1234567890abcdef...", // Only returned once!
  "key_prefix": "luna_sk_12345678",
  "scopes": ["read", "write"],
  "expires_at": "2026-12-17T00:00:00Z",
  "created_at": "2025-12-17T10:00:00Z"
}
```

#### DELETE /api/keys/:keyId
Delete/revoke an API key.

**Headers**: `Authorization: Bearer {token}`

**Response** (200 OK):
```json
{
  "message": "API key revoked successfully"
}
```

#### PATCH /api/keys/:keyId
Update API key settings.

**Headers**: `Authorization: Bearer {token}`

**Request Body**:
```json
{
  "name": "Updated Key Name",
  "is_active": false
}
```

**Response** (200 OK):
```json
{
  "id": "uuid",
  "name": "Updated Key Name",
  "is_active": false
}
```

---

### Subscription Management Endpoints

#### GET /api/subscription
Get subscription details.

**Headers**: `Authorization: Bearer {token}`

**Response** (200 OK):
```json
{
  "tier": "pro",
  "status": "active",
  "subscription_id": "lemon_sub_123",
  "customer_id": "lemon_cust_456",
  "current_period_start": "2025-12-01T00:00:00Z",
  "current_period_end": "2026-01-01T00:00:00Z",
  "cancel_at_period_end": false,
  "features": [
    "15+ AI agents",
    "Unlimited RAG queries",
    "Unlimited file indexing",
    "Luna Vision RAG",
    "Priority support"
  ],
  "next_invoice": {
    "amount": 29.00,
    "currency": "USD",
    "date": "2026-01-01T00:00:00Z"
  }
}
```

#### POST /api/subscription/upgrade
Upgrade to a higher tier.

**Headers**: `Authorization: Bearer {token}`

**Request Body**:
```json
{
  "tier": "pro",
  "billing_period": "monthly"
}
```

**Response** (200 OK):
```json
{
  "checkout_url": "https://lunaagents.lemonsqueezy.com/checkout/...",
  "expires_at": "2025-12-17T11:00:00Z"
}
```

#### POST /api/subscription/cancel
Cancel subscription (at period end).

**Headers**: `Authorization: Bearer {token}`

**Response** (200 OK):
```json
{
  "message": "Subscription will be canceled at period end",
  "cancel_at": "2026-01-01T00:00:00Z"
}
```

#### POST /api/subscription/reactivate
Reactivate a canceled subscription.

**Headers**: `Authorization: Bearer {token}`

**Response** (200 OK):
```json
{
  "message": "Subscription reactivated successfully",
  "status": "active"
}
```

---

### Team Management Endpoints (Team/Enterprise only)

#### GET /api/teams
List teams for current user.

**Headers**: `Authorization: Bearer {token}`

**Response** (200 OK):
```json
{
  "teams": [
    {
      "id": "uuid",
      "name": "My Team",
      "slug": "my-team",
      "role": "owner",
      "member_count": 3,
      "tier": "team",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /api/teams
Create a new team.

**Headers**: `Authorization: Bearer {token}`

**Request Body**:
```json
{
  "name": "New Team",
  "slug": "new-team"
}
```

**Response** (201 Created):
```json
{
  "id": "uuid",
  "name": "New Team",
  "slug": "new-team",
  "tier": "team",
  "created_at": "2025-12-17T10:00:00Z"
}
```

#### GET /api/teams/:teamId/members
List team members.

**Headers**: `Authorization: Bearer {token}`

**Response** (200 OK):
```json
{
  "members": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "owner",
      "status": "active",
      "joined_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /api/teams/:teamId/members
Invite a team member.

**Headers**: `Authorization: Bearer {token}`

**Request Body**:
```json
{
  "email": "newmember@example.com",
  "role": "member"
}
```

**Response** (201 Created):
```json
{
  "id": "uuid",
  "email": "newmember@example.com",
  "role": "member",
  "status": "invited",
  "invited_at": "2025-12-17T10:00:00Z"
}
```

#### GET /api/teams/:teamId/usage
Get team-wide usage analytics.

**Headers**: `Authorization: Bearer {token}`

**Response** (200 OK):
```json
{
  "team_id": "uuid",
  "period": "month",
  "total_usage": {
    "rag_queries": 5678,
    "agent_executions": 1234,
    "deployments": 89
  },
  "member_breakdown": [
    {
      "user_id": "uuid",
      "name": "John Doe",
      "rag_queries": 2345,
      "agent_executions": 567
    }
  ]
}
```

---

## Frontend Components

### Page Structure

```
/dashboard
├── /                          # Dashboard home
├── /usage                     # Usage metrics
├── /analytics                 # Productivity analytics
├── /keys                      # API key management
├── /subscription              # Billing & subscription
├── /settings                  # Account settings
└── /team                      # Team management (Team tier only)
    ├── /                      # Team overview
    ├── /members               # Member management
    └── /usage                 # Team analytics
```

### Component Tree

```tsx
// app/dashboard/layout.tsx
<DashboardLayout>
  <Sidebar />
  <MainContent>
    {children}
  </MainContent>
</DashboardLayout>

// Components breakdown:

// Sidebar.tsx
- Logo
- Navigation links
- User profile dropdown
- Upgrade CTA (if Free tier)

// DashboardHome.tsx
- WelcomeSection
- QuickStats (RAG queries, agent runs, deployments)
- UsageChart (7-day trend)
- RecentActivity (last 10 activities)
- UpgradeCTA (if Free tier)

// UsagePage.tsx
- CurrentPeriodSummary
- UsageLimitsCard (with progress bars)
- DailyUsageChart (line chart)
- UsageBreakdownTable (by metric type)

// AnalyticsPage.tsx
- ProductivityMetrics (features shipped, bugs fixed, time saved)
- ROICalculator (cost vs value)
- PerformanceMetrics (response time, success rate)
- MonthlyTrends (charts)

// APIKeysPage.tsx
- CreateKeyButton
- KeysTable (name, prefix, last used, actions)
- KeyCreationModal
- KeyDeletionConfirmation

// SubscriptionPage.tsx
- CurrentPlanCard
- BillingHistory
- UpgradeOptions (comparison table)
- CancelSubscriptionButton

// TeamPage.tsx (Team tier only)
- TeamOverview
- MembersList
- InviteMemberButton
- TeamUsageChart
```

### Key UI Components

#### DashboardHome Component
```tsx
// app/dashboard/page.tsx
import { UsageChart } from '@/components/dashboard/UsageChart';
import { QuickStats } from '@/components/dashboard/QuickStats';
import { RecentActivity } from '@/components/dashboard/RecentActivity';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <QuickStats />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UsageChart />
        <RecentActivity />
      </div>
    </div>
  );
}
```

#### QuickStats Component
```tsx
// components/dashboard/QuickStats.tsx
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';

export function QuickStats() {
  const { data } = useQuery({
    queryKey: ['usage', 'current'],
    queryFn: () => fetch('/api/usage/current').then(r => r.json())
  });

  const stats = [
    {
      label: 'RAG Queries',
      value: data?.usage.rag_queries || 0,
      limit: data?.limits.rag_queries || 'unlimited',
      icon: SearchIcon
    },
    {
      label: 'Agent Runs',
      value: data?.usage.agent_executions || 0,
      limit: data?.limits.agent_executions || 'unlimited',
      icon: CpuIcon
    },
    {
      label: 'Deployments',
      value: data?.usage.deployments || 0,
      icon: RocketIcon
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {stats.map(stat => (
        <Card key={stat.label} className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-3xl font-bold">{stat.value}</p>
              {stat.limit && (
                <p className="text-xs text-muted-foreground mt-1">
                  of {stat.limit}
                </p>
              )}
            </div>
            <stat.icon className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>
      ))}
    </div>
  );
}
```

#### UsageChart Component
```tsx
// components/dashboard/UsageChart.tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';

export function UsageChart() {
  const { data } = useQuery({
    queryKey: ['usage', 'history', '7days'],
    queryFn: () => fetch('/api/usage/history?days=7').then(r => r.json())
  });

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">7-Day Usage Trend</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data?.daily_breakdown || []}>
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="rag_queries" stroke="#6366F1" name="RAG Queries" />
          <Line type="monotone" dataKey="agent_executions" stroke="#06B6D4" name="Agent Runs" />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
```

#### APIKeysTable Component
```tsx
// components/dashboard/APIKeysTable.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Table } from '@/components/ui/table';
import { CreateKeyDialog } from './CreateKeyDialog';

export function APIKeysTable() {
  const queryClient = useQueryClient();
  const { data: keys } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => fetch('/api/keys').then(r => r.json())
  });

  const deleteKey = useMutation({
    mutationFn: (keyId: string) =>
      fetch(`/api/keys/${keyId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    }
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">API Keys</h2>
        <CreateKeyDialog />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Key</TableHead>
            <TableHead>Last Used</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {keys?.keys.map(key => (
            <TableRow key={key.id}>
              <TableCell>{key.name}</TableCell>
              <TableCell>
                <code className="text-sm">{key.key_prefix}...</code>
              </TableCell>
              <TableCell>
                {key.last_used_at
                  ? formatDistanceToNow(new Date(key.last_used_at))
                  : 'Never'}
              </TableCell>
              <TableCell>{format(new Date(key.created_at), 'MMM d, yyyy')}</TableCell>
              <TableCell>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteKey.mutate(key.id)}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

---

## Security Considerations

### Authentication
- JWT tokens with 7-day expiration
- Refresh token rotation
- Secure password hashing (bcrypt, 12 rounds)
- Email verification required
- Rate limiting on auth endpoints (5 attempts per 15 min)

### API Keys
- Keys hashed before storage (SHA-256)
- Only show full key once at creation
- Support key expiration
- Scope-based permissions
- Rate limiting per key
- Audit log for key usage

### Data Protection
- HTTPS only (enforce TLS 1.3+)
- CORS configuration (whitelist domains)
- SQL injection prevention (parameterized queries)
- XSS protection (sanitize inputs, CSP headers)
- CSRF tokens for state-changing operations

### Compliance
- GDPR compliant (data export, deletion)
- SOC 2 Type II (roadmap for Enterprise)
- Data encryption at rest (AES-256)
- Data encryption in transit (TLS 1.3)
- Regular security audits

---

## Analytics & Tracking

### User Behavior Tracking
- Page views (which dashboard pages are most used)
- Feature usage (which agents are most popular)
- Conversion funnels (Free → Pro upgrades)
- Drop-off points (where users churn)

### Performance Monitoring
- API response times
- Error rates by endpoint
- Database query performance
- Cache hit rates

### Business Metrics
- Daily Active Users (DAU)
- Monthly Active Users (MAU)
- Conversion rate (free → paid)
- Churn rate
- Lifetime Value (LTV)
- Customer Acquisition Cost (CAC)

---

## Implementation Checklist

### Phase 1: MVP (Week 1-2)
- [ ] Set up Next.js 14 app with Tailwind CSS
- [ ] Implement authentication (register, login, logout)
- [ ] Create PostgreSQL database with schema
- [ ] Build dashboard home page with quick stats
- [ ] Implement usage metrics API endpoints
- [ ] Create usage metrics display (current period)
- [ ] Build API keys management (CRUD)
- [ ] Set up LemonSqueezy webhook handlers
- [ ] Implement subscription display page
- [ ] Add basic error handling and loading states

### Phase 2: Enhancement (Week 3)
- [ ] Add usage history charts (7-day, 30-day)
- [ ] Build productivity analytics page
- [ ] Implement ROI calculator
- [ ] Add tier comparison and upgrade flow
- [ ] Create email verification flow
- [ ] Implement password reset flow
- [ ] Add user settings page (profile, preferences)
- [ ] Build team management (Team tier)
- [ ] Add team usage analytics
- [ ] Implement notification system

### Phase 3: Polish (Week 4)
- [ ] Optimize API response times (<200ms)
- [ ] Add caching layer (Redis)
- [ ] Implement rate limiting
- [ ] Add comprehensive error messages
- [ ] Create onboarding tour (first-time users)
- [ ] Add data export functionality (GDPR)
- [ ] Implement account deletion flow
- [ ] Security audit and penetration testing
- [ ] Performance testing (load testing)
- [ ] Mobile responsiveness optimization

---

## Success Metrics

### User Engagement
- **Dashboard DAU**: 70%+ of registered users visit dashboard daily
- **Time in Dashboard**: Average 5+ minutes per session
- **Feature Adoption**: 80%+ users create at least one API key

### Conversion
- **Free → Pro**: 10%+ conversion rate within 30 days
- **Upgrade from Dashboard**: 60%+ of upgrades initiated from dashboard

### Satisfaction
- **NPS Score**: 50+ (promoters - detractors)
- **Support Tickets**: <5% of users need dashboard support

### Technical
- **API Response Time**: <200ms p95
- **Uptime**: 99.9%+
- **Error Rate**: <0.1%

---

**Next Steps**:
1. Set up Next.js project structure
2. Implement database migrations
3. Build authentication system
4. Create API endpoints
5. Design and build UI components

**Last Updated**: December 2025

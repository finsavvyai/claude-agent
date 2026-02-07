# Luna Agents - Marketing Website Specification

**Version**: 1.0
**Last Updated**: December 2025
**Status**: Implementation Ready

---

## Overview

The Luna Agents marketing website (agent.lunaos.ai) is the primary acquisition channel for new users. It's designed to communicate value quickly, build trust, and convert visitors into free tier signups.

**Goals**:
- Convert visitors to free signups (5%+ conversion rate)
- Communicate unique value proposition in <10 seconds
- Build trust through social proof and transparency
- SEO-optimized for organic discovery
- Mobile-first, blazing fast (<2s load time)

---

## Site Map

```
/                           # Homepage (hero, features, pricing, CTA)
/features                   # Detailed feature showcase
/pricing                    # Pricing comparison + FAQ
/use-cases                  # Use case examples (indie dev, startup, agency)
/docs                       # Documentation hub
/blog                       # Content marketing hub
/about                      # About Luna, founder story
/contact                    # Contact form + support
/auth/login                 # Login page
/auth/register              # Registration page
/auth/forgot-password       # Password reset
/dashboard/*                # User dashboard (separate app)
```

---

## Page Specifications

### Homepage (/)

**Purpose**: Convert visitors in <30 seconds
**Target Conversion**: 5%+ to free signup
**Key Metrics**: Time on page (avg 45s+), scroll depth (60%+), CTA clicks

#### Sections

**1. Hero Section (Above the Fold)**
- **Headline**: "Your entire dev team, powered by AI"
- **Subheadline**: "Complete development lifecycle automation. From requirements to production. One platform, $29/month."
- **CTA**: "Start Free" (primary) + "Watch Demo" (secondary)
- **Visual**: Animated terminal showing Luna agents in action
- **Social Proof**: "Join 1,000+ developers shipping faster"

```tsx
// Hero section example
<section className="hero">
  <h1 className="text-6xl font-bold">
    Your entire dev team, <span className="gradient">powered by AI</span>
  </h1>
  <p className="text-xl text-muted-foreground max-w-2xl">
    Complete development lifecycle automation. From requirements to production.
    One platform, $29/month.
  </p>
  <div className="flex gap-4 mt-8">
    <Button size="lg">Start Free</Button>
    <Button size="lg" variant="outline">Watch Demo</Button>
  </div>
  <p className="text-sm text-muted-foreground mt-4">
    No credit card required • 10 agents free forever
  </p>
</section>
```

**2. Problem Statement Section**
- **Headline**: "Stop juggling 10 tools. Start building."
- **Visual**: Tool chaos illustration (Copilot, Jira, Vercel, DataDog logos scattered)
- **Stats**:
  - "$100+/month on fragmented tools"
  - "23 minutes lost per context switch"
  - "10+ platforms to manage"
- **CTA**: "See How Luna Solves This"

**3. Complete Lifecycle Section**
- **Headline**: "Complete Development Lifecycle. One Platform."
- **Visual**: Interactive workflow diagram showing 10 agents
- **Features**:
  1. **Requirements** - Auto-analyze codebase, generate specs
  2. **Design** - Technical architecture from requirements
  3. **Planning** - Dependency-ordered task breakdown
  4. **Execution** - Quality code implementation
  5. **Review** - Automated security & quality checks
  6. **Testing** - Comprehensive test suite generation
  7. **Deployment** - One-click Cloudflare deployment
  8. **Docs** - Auto-generated documentation
  9. **Monitoring** - Complete observability setup
  10. **Post-Launch** - Performance analysis & optimization

```tsx
// Lifecycle workflow component
<section className="lifecycle">
  <h2 className="text-4xl font-bold text-center">
    Complete Development Lifecycle. One Platform.
  </h2>
  <div className="workflow-diagram mt-12">
    {agents.map((agent, index) => (
      <WorkflowStep
        key={agent.id}
        number={index + 1}
        title={agent.title}
        description={agent.description}
        icon={agent.icon}
      />
    ))}
  </div>
</section>
```

**4. Luna RAG™ Section**
- **Headline**: "Semantic Code Search. Understands Context, Not Just Syntax."
- **Demo**: Interactive Luna RAG query examples
- **Examples**:
  - "How does authentication work?" → Shows auth flow
  - "What components use the User API?" → Maps dependencies
  - "Show me error handling patterns" → Extracts patterns
- **CTA**: "Try Luna RAG Free"

**5. Cost Comparison Section**
- **Headline**: "One platform. 70% cost savings."
- **Visual**: Side-by-side cost comparison table
  - **Traditional Tools**: Copilot ($10) + Cursor ($20) + Jira ($7) + Vercel ($20) + DataDog ($15) = **$72+/month**
  - **Luna Pro**: **$29/month** (Save $43+/month)
- **Highlight**: "Same team size. 3x output. 1/3 the cost."

**6. Social Proof Section**
- **Headline**: "Trusted by 1,000+ developers worldwide"
- **Testimonials**: 3-4 video testimonials (embedded, auto-play on mute)
- **Logos**: Beta user company logos (if applicable)
- **Stats**:
  - "80% daily active usage"
  - "3x faster shipping"
  - "10+ hours saved per week"

**7. Feature Highlights**
- **Grid Layout**: 3x3 feature cards
- Features:
  1. MCP-Native (works with any IDE)
  2. Cloudflare-Powered (<10ms latency)
  3. 15+ Specialized Agents
  4. Unlimited RAG Queries (Pro)
  5. Vision-Based Testing
  6. Security & Code Review
  7. Team Collaboration (Team tier)
  8. Priority Support (Pro+)
  9. SOC 2 Compliant (Enterprise)

**8. Pricing Tease**
- **Headline**: "Start free. Scale as you grow."
- **Cards**: Free, Pro ($29), Team ($79)
- **CTA**: "See Full Pricing" (link to /pricing)
- **Highlight**: "70% savings vs buying tools separately"

**9. CTA Section (Final)**
- **Headline**: "Ready to ship 3x faster?"
- **Subheadline**: "Join 1,000+ developers building with Luna Agents"
- **CTA**: "Start Free" (large, prominent)
- **Trust Signals**: "No credit card required • Cancel anytime • GDPR compliant"

**10. Footer**
- Product (Features, Pricing, Docs, Roadmap)
- Company (About, Blog, Press Kit, Contact)
- Resources (Docs, GitHub, Discord, Twitter)
- Legal (Privacy, Terms, Security)

---

### Features Page (/features)

**Purpose**: Deep dive into capabilities for interested visitors

#### Sections

**1. Hero**
- **Headline**: "Everything you need to ship software, faster"
- **Subheadline**: "15+ specialized AI agents covering complete development lifecycle"

**2. Core Agents (Detailed)**
For each agent:
- Name and icon
- Description (2-3 sentences)
- Use case example
- Input/Output visualization
- Demo video or GIF

**3. Luna RAG™ Deep Dive**
- Technical explanation (vector embeddings, semantic search)
- Interactive demo
- Comparison vs keyword search
- Performance metrics

**4. MCP Integration**
- What is MCP?
- Compatible platforms (Claude, Cursor, Windsurf, Zed)
- Installation guide preview
- "No vendor lock-in" messaging

**5. Cloudflare Edge**
- Global deployment explanation
- Latency map (visual)
- Cost savings calculator
- Performance guarantees

**6. Security & Compliance**
- HTTPS, encryption at rest/transit
- OWASP Top 10 checks
- GDPR compliance
- SOC 2 roadmap (Enterprise)

---

### Pricing Page (/pricing)

**Purpose**: Clear pricing, remove objections, drive conversions

#### Sections

**1. Hero**
- **Headline**: "Simple, transparent pricing. No hidden fees."
- **Toggle**: Monthly / Annual (20% discount)

**2. Pricing Tiers (Comparison Table)**

| Feature | Free | Pro ($29/mo) | Team ($79/mo) | Enterprise |
|---------|------|--------------|---------------|------------|
| **Agents** | 10 core | 15+ all agents | 15+ all agents | 15+ custom |
| **RAG Queries** | 100/day | Unlimited | Unlimited | Unlimited |
| **Files Indexed** | 1,000 | Unlimited | Unlimited | Unlimited |
| **Luna Vision RAG** | ❌ | ✅ | ✅ | ✅ |
| **Deployment** | Manual | One-click | One-click | Custom |
| **Support** | Community | Priority (24h) | Dedicated Slack | CSM |
| **Team Members** | 1 | 1 | 5 | Unlimited |
| **SSO/SAML** | ❌ | ❌ | ❌ | ✅ |
| **SLA** | - | - | 99.5% | 99.9% |
| **CTA** | Start Free | Upgrade to Pro | Contact Sales | Contact Sales |

**3. Cost Comparison**
- "Luna Pro vs Traditional Tools" side-by-side
- Annual savings calculator: "$43/month × 12 = $516/year saved"

**4. FAQ Section**
- "Can I change plans later?" → Yes, anytime
- "What payment methods?" → Credit card, PayPal (via LemonSqueezy)
- "Do you offer refunds?" → 30-day money-back guarantee
- "Is there a free trial?" → Free tier is forever, no trial needed
- "What happens if I cancel?" → Access until end of billing period
- "Can I get an invoice?" → Yes, automatic invoicing for Pro+

**5. CTA**
- "Start with Free tier, upgrade when you're ready"
- Prominent "Start Free" button

---

### Use Cases Page (/use-cases)

**Purpose**: Show relatable scenarios and outcomes

#### Sections

**1. Indie Developer**
- **Story**: Sarah's journey from $150/month tools to Luna
- **Challenge**: Limited budget, wearing all hats
- **Solution**: Complete lifecycle for $29/month
- **Outcome**: Built SaaS MVP in 2 weeks (vs 2 months)

**2. Startup**
- **Story**: TechFlow Agency shipping 3x faster
- **Challenge**: Need to ship fast, limited team
- **Solution**: Automate repetitive tasks, focus on product
- **Outcome**: 3x client projects with same team size

**3. Agency**
- **Story**: Digital agency delivering consistent quality
- **Challenge**: Multiple client projects, quality consistency
- **Solution**: Repeatable workflows, automated quality checks
- **Outcome**: Higher margins, happier clients

**4. Enterprise** (Future)
- **Story**: Fortune 500 scaling development productivity
- **Challenge**: 100+ developers, compliance requirements
- **Solution**: Team collaboration, security, custom integrations
- **Outcome**: 30% productivity increase, SOC 2 compliant

---

### About Page (/about)

**Purpose**: Build trust, humanize the brand

#### Sections

**1. Founder Story**
- Photo + bio
- "Why I Built Luna Agents" narrative
- Personal journey, motivations
- Vision for the future

**2. Mission**
- "Democratize AI-powered development"
- "Make enterprise-grade capabilities accessible to everyone"

**3. Values**
- Transparency (build in public)
- Developer-first (built by developers, for developers)
- Affordability (no $100+ tool stacks)
- Quality (production-ready, not MVP)

**4. Team** (if applicable)
- Team photos + bios
- "Join Us" section (if hiring)

**5. Timeline**
- Key milestones (beta launch, 1,000 users, etc.)

---

## Technical Stack

### Frontend
- **Framework**: Next.js 14 (App Router, RSC)
- **Styling**: Tailwind CSS + shadcn/ui
- **Animations**: Framer Motion
- **Forms**: React Hook Form + Zod validation
- **Analytics**: Plausible or PostHog (privacy-friendly)

### Hosting & Infrastructure
- **Static Hosting**: Cloudflare Pages
- **CDN**: Cloudflare (global edge)
- **DNS**: Cloudflare
- **SSL**: Cloudflare (automatic)

### Performance Optimizations
- **Image Optimization**: Next.js Image component + Cloudflare Images
- **Code Splitting**: Automatic via Next.js
- **Lazy Loading**: Below-the-fold content
- **Prefetching**: Critical pages
- **Caching**: Aggressive CDN caching (1 hour for static assets)

### SEO
- **Meta Tags**: Dynamic per page (title, description, OG)
- **Structured Data**: JSON-LD for Organization, Product, FAQs
- **Sitemap**: Auto-generated via Next.js
- **Robots.txt**: Allow all except /dashboard/*
- **Core Web Vitals**: LCP <2.5s, FID <100ms, CLS <0.1

---

## Design System

### Color Palette

**Primary Colors**:
- Brand Purple: `#6366F1` (buttons, accents)
- Deep Purple: `#4F46E5` (hover states)
- Dark Purple: `#3730A3` (pressed states)

**Secondary Colors**:
- Cyan: `#06B6D4` (highlights, charts)
- Teal: `#14B8A6` (success states)

**Accent Colors**:
- Orange: `#F97316` (CTAs, urgent actions)
- Green: `#10B981` (success messages)
- Red: `#EF4444` (errors, warnings)

**Neutrals**:
- Background: `#FFFFFF` (light) / `#0F172A` (dark)
- Text: `#1E293B` (light) / `#F1F5F9` (dark)
- Muted: `#64748B`

### Typography

**Font Families**:
- Headers: Inter or Poppins (bold, clean)
- Body: System fonts (-apple-system, BlinkMacSystemFont)
- Code: JetBrains Mono

**Font Sizes**:
- Hero: 4rem (64px)
- H1: 3rem (48px)
- H2: 2.25rem (36px)
- H3: 1.875rem (30px)
- Body: 1rem (16px)
- Small: 0.875rem (14px)

### Spacing
- Base unit: 4px
- Standard spacing: 4px, 8px, 16px, 24px, 32px, 48px, 64px, 96px

### Components

**Buttons**:
- Primary: Purple background, white text, rounded-lg
- Secondary: White background, purple border, purple text
- Outline: Transparent background, white border, white text (dark mode)

**Cards**:
- White background (light) / Dark slate (dark)
- Subtle shadow
- Rounded corners (8px)
- Padding: 24px

**Inputs**:
- Border: 1px solid gray
- Focus: Purple border, purple ring
- Error: Red border, red text

---

## Key Pages Wireframes

### Homepage Wireframe

```
┌─────────────────────────────────────────────────┐
│  NAVBAR: Logo | Features | Pricing | Docs | Login │
├─────────────────────────────────────────────────┤
│                                                 │
│        HERO: Your entire dev team, AI           │
│        CTA: Start Free | Watch Demo             │
│        Social Proof: 1,000+ developers          │
│                                                 │
├─────────────────────────────────────────────────┤
│  PROBLEM: Stop juggling 10 tools               │
│  Visual: Tool chaos illustration                │
├─────────────────────────────────────────────────┤
│  LIFECYCLE: 10-step workflow diagram            │
│  Interactive: Click each step for details       │
├─────────────────────────────────────────────────┤
│  LUNA RAG: Semantic code search demo            │
│  Interactive: Try sample queries                │
├─────────────────────────────────────────────────┤
│  COST COMPARISON: $72+ vs $29/month             │
│  Table: Traditional tools vs Luna               │
├─────────────────────────────────────────────────┤
│  TESTIMONIALS: 3 video testimonials             │
│  Stats: 80% DAU, 3x faster shipping             │
├─────────────────────────────────────────────────┤
│  FEATURES: 3x3 grid of key features             │
├─────────────────────────────────────────────────┤
│  PRICING TEASE: Free | Pro | Team cards         │
│  CTA: See Full Pricing                          │
├─────────────────────────────────────────────────┤
│  FINAL CTA: Ready to ship 3x faster?            │
│  Button: Start Free (large, prominent)          │
├─────────────────────────────────────────────────┤
│  FOOTER: Links, social, legal                   │
└─────────────────────────────────────────────────┘
```

### Pricing Page Wireframe

```
┌─────────────────────────────────────────────────┐
│  NAVBAR: Logo | Features | Pricing | Docs | Login │
├─────────────────────────────────────────────────┤
│                                                 │
│  HERO: Simple, transparent pricing              │
│  Toggle: Monthly / Annual (20% off)             │
│                                                 │
├─────────────────────────────────────────────────┤
│  PRICING TIERS (4 columns)                      │
│                                                 │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐  │
│  │ Free   │ │ Pro    │ │ Team   │ │Enterprise│
│  │ $0/mo  │ │ $29/mo │ │ $79/mo │ │ Custom │  │
│  │        │ │        │ │        │ │        │  │
│  │ 10     │ │ 15+    │ │ 15+    │ │ 15+    │  │
│  │ agents │ │ agents │ │ agents │ │ agents │  │
│  │        │ │        │ │        │ │        │  │
│  │ [Free] │ │[Upgrade]│[Contact]│[Contact] │  │
│  └────────┘ └────────┘ └────────┘ └────────┘  │
│                                                 │
├─────────────────────────────────────────────────┤
│  COST COMPARISON: Luna vs Traditional           │
│  Calculator: Annual savings = $516/year         │
├─────────────────────────────────────────────────┤
│  FAQ: 6-8 common pricing questions              │
│  Accordion: Click to expand                     │
├─────────────────────────────────────────────────┤
│  CTA: Start with Free, upgrade when ready       │
│  Button: Start Free                             │
└─────────────────────────────────────────────────┘
```

---

## Conversion Optimization

### A/B Testing Plan

**Test 1: Hero CTA**
- Variant A: "Start Free"
- Variant B: "Get Started Free"
- Variant C: "Try Luna Free"
- Metric: Click-through rate

**Test 2: Pricing Display**
- Variant A: Show Free tier first
- Variant B: Show Pro tier first (recommended badge)
- Metric: Pro signup rate

**Test 3: Social Proof**
- Variant A: "1,000+ developers"
- Variant B: "Join Sarah, Marcus, and 1,000+ developers"
- Variant C: Video testimonials only
- Metric: Signup conversion rate

**Test 4: Demo Video**
- Variant A: Auto-play (muted) on hero
- Variant B: Click to play
- Variant C: No video, animated terminal only
- Metric: Engagement rate + signup rate

### Exit Intent Popup
- Trigger: Mouse leaves viewport
- Content: "Wait! Start free today. No credit card required."
- CTA: "Start Free" + "Close"
- A/B test: Discount offer vs. free tier highlight

---

## SEO Strategy

### Target Keywords

**Primary Keywords** (homepage):
- AI development tools
- AI coding assistant
- Complete development lifecycle automation
- Development automation platform

**Secondary Keywords** (features page):
- Semantic code search
- AI code review
- Automated deployment
- AI-powered testing

**Long-Tail Keywords** (blog posts):
- "How to automate software development"
- "Best AI tools for indie developers"
- "Complete development lifecycle explained"
- "AI vs traditional development tools"

### On-Page SEO Checklist
- [ ] Title tags (55-60 chars, keyword-rich)
- [ ] Meta descriptions (150-160 chars, compelling)
- [ ] H1 tags (one per page, keyword included)
- [ ] H2-H6 hierarchy (logical structure)
- [ ] Image alt text (descriptive, keyword-rich)
- [ ] Internal linking (3-5 links per page)
- [ ] External linking (credible sources)
- [ ] URL structure (clean, keyword-rich)
- [ ] Mobile-friendly (responsive design)
- [ ] Page speed (<2s load time)
- [ ] Schema markup (Organization, Product, FAQs)

### Technical SEO
- Sitemap.xml (auto-generated)
- Robots.txt (allow crawling except /dashboard/*)
- Canonical tags (avoid duplicate content)
- OpenGraph tags (social sharing)
- Twitter Cards (social sharing)
- Structured data (JSON-LD)

---

## Analytics & Tracking

### Google Analytics 4 (or Plausible)

**Events to Track**:
- Page views (all pages)
- CTA clicks ("Start Free", "Watch Demo")
- Signup initiated
- Signup completed
- Pricing tier viewed
- Upgrade initiated
- Video plays (demo videos)
- External link clicks (GitHub, Discord)
- Exit intent popup shown/dismissed

**Conversion Funnels**:
1. Homepage → Signup → Onboarding
2. Pricing → Signup → Payment
3. Blog → Homepage → Signup

### Heatmaps & Session Recording
- **Tool**: Hotjar or Microsoft Clarity
- **Purpose**: Understand user behavior, identify friction points
- **Metrics**: Click maps, scroll depth, rage clicks

---

## Performance Benchmarks

### Core Web Vitals (Target)
- **LCP (Largest Contentful Paint)**: <2.5s
- **FID (First Input Delay)**: <100ms
- **CLS (Cumulative Layout Shift)**: <0.1

### Lighthouse Scores (Target)
- **Performance**: 95+
- **Accessibility**: 100
- **Best Practices**: 95+
- **SEO**: 100

### Load Times
- **Time to First Byte (TTFB)**: <200ms
- **Full Page Load**: <2s
- **Interactive**: <3s

---

## Implementation Roadmap

### Week 1: Foundation
- [ ] Set up Next.js 14 project
- [ ] Install Tailwind CSS + shadcn/ui
- [ ] Configure Cloudflare Pages deployment
- [ ] Design system implementation (colors, typography, components)
- [ ] Build reusable UI components (Button, Card, Input, etc.)

### Week 2: Core Pages
- [ ] Homepage (all sections)
- [ ] Features page
- [ ] Pricing page
- [ ] About page
- [ ] Contact page

### Week 3: Authentication & Blog
- [ ] Auth pages (login, register, forgot password)
- [ ] Blog structure + first 3 posts
- [ ] Documentation hub (link to external docs)

### Week 4: Optimization & Launch
- [ ] SEO optimization (meta tags, schema, sitemap)
- [ ] Performance optimization (images, code splitting)
- [ ] Analytics setup (GA4, Plausible)
- [ ] A/B testing setup (Vercel, Optimizely)
- [ ] Final QA and launch

---

## Content Requirements

### Copy Needed
- [ ] Homepage hero headline + subheadline
- [ ] All section headlines (10+ sections)
- [ ] Feature descriptions (15+ agents)
- [ ] Pricing tier descriptions
- [ ] FAQ answers (10+ questions)
- [ ] About page founder story
- [ ] Legal pages (Privacy Policy, Terms of Service)

### Visual Assets Needed
- [ ] Logo (SVG, various sizes)
- [ ] Hero animation (terminal demo)
- [ ] Workflow diagram (10-step lifecycle)
- [ ] Cost comparison visual
- [ ] Feature icons (15+ agents)
- [ ] Testimonial videos (3-4 users)
- [ ] Company logos (if applicable)
- [ ] Screenshots (dashboard, RAG, deployment)

### Video Content
- [ ] 60-second hero demo (homepage)
- [ ] 5-minute full workflow (features page)
- [ ] Testimonial compilation (social proof)

---

## Success Metrics

### Traffic Goals
- **Month 1**: 1,000 unique visitors
- **Month 3**: 10,000 unique visitors
- **Month 6**: 50,000 unique visitors

### Conversion Goals
- **Homepage → Signup**: 5%+
- **Pricing → Signup**: 10%+
- **Blog → Signup**: 2%+

### Engagement Goals
- **Avg Time on Site**: 2+ minutes
- **Bounce Rate**: <60%
- **Pages per Session**: 2.5+

### SEO Goals
- **Organic Traffic**: 40%+ of total traffic by Month 6
- **Keyword Rankings**: Top 10 for 5+ primary keywords by Month 6
- **Domain Authority**: 30+ by Month 12

---

**Next Steps**:
1. Finalize copy for all pages
2. Create visual assets (logo, diagrams, videos)
3. Build Next.js site with all components
4. Deploy to Cloudflare Pages
5. Set up analytics and A/B testing

**Last Updated**: December 2025

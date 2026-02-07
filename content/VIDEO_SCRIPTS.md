# Luna Agents - Video Scripts

**Production Guide for Demo Videos**
**Last Updated**: December 2025

---

## Video 1: 60-Second Hero Demo

**Purpose**: Quick product overview for homepage, social media, and Product Hunt
**Target Length**: 60 seconds
**Format**: Screen recording with voiceover
**Tone**: Energetic, confident, aspirational

### Script

**[0:00-0:05] HOOK**
*[Screen: Terminal with blinking cursor]*

**VOICEOVER**:
"What if you could build and deploy a complete feature in under 5 minutes?"

**[0:05-0:10] PROBLEM**
*[Screen: Multiple tabs showing GitHub Copilot, Jira, Vercel, etc. - quickly cycling through]*

**VOICEOVER**:
"Developers juggle 10+ tools costing $100/month. There's a better way."

**[0:10-0:15] SOLUTION INTRO**
*[Screen: Luna Agents logo animation, fade to terminal]*

**VOICEOVER**:
"Meet Luna Agents - your entire dev team, powered by AI."

**[0:15-0:25] DEMO - INSTALLATION**
*[Screen: Terminal showing installation]*
```bash
git clone https://github.com/shacharsol/luna-agent.git
cd luna-agent
./setup.sh
```

**VOICEOVER**:
"Install in seconds. Works with Claude, Cursor, Windsurf, and any MCP-compatible platform."

**[0:25-0:35] DEMO - LUNA RAG**
*[Screen: AI assistant interface]*
*[Type: "/luna-rag How does authentication work?"]*
*[Show: Intelligent search results with relevant code]*

**VOICEOVER**:
"Luna RAG understands your codebase. Ask questions in natural language."

**[0:35-0:45] DEMO - COMPLETE WORKFLOW**
*[Screen: Quick montage of commands]*
```
/luna-requirements user-profile
/luna-design user-profile
/luna-execute user-profile
```
*[Show: Files being created, code being written]*

**VOICEOVER**:
"From requirements to deployment - 15 AI agents automate your entire workflow."

**[0:45-0:50] DEMO - DEPLOYMENT**
*[Screen: Deployment success, live URL]*

**VOICEOVER**:
"Deploy globally with one command. Your app, live in minutes."

**[0:50-0:55] VALUE PROP**
*[Screen: Pricing comparison graphic]*
*[Show: $29/mo vs $100+/mo]*

**VOICEOVER**:
"Complete lifecycle automation for $29/month. 70% savings."

**[0:55-0:60] CTA**
*[Screen: agent.lunaos.ai with "Start Free" button]*

**VOICEOVER**:
"Luna Agents. Your entire dev team, powered by AI. Start free today."

**[End screen: Luna logo + agent.lunaos.ai]*

---

### Production Notes

**Visual Elements**:
- Clean terminal with syntax highlighting
- Smooth transitions between screens
- Fast-paced editing (cut every 2-3 seconds)
- Text overlays for key points ($29/mo, 70% savings)
- Progress indicators during execution

**Audio**:
- Professional voiceover (clear, energetic)
- Background music (subtle, upbeat, tech-y)
- Sound effects (whoosh for transitions, success chime)

**Branding**:
- Luna purple color scheme throughout
- Logo watermark (bottom corner)
- Consistent fonts matching brand

**Export Settings**:
- 1920x1080 (1080p)
- 60fps
- High quality H.264
- Optimized for social media (square version: 1080x1080)

---

## Video 2: 5-Minute Full Workflow Demo

**Purpose**: Detailed walkthrough for homepage, YouTube, documentation
**Target Length**: 5 minutes 30 seconds
**Format**: Screen recording with voiceover + talking head (optional)
**Tone**: Educational, thorough, professional

### Script

**[0:00-0:20] INTRODUCTION**
*[Screen: Talking head or animated intro]*

**VOICEOVER**:
"Hi, I'm [Founder Name], creator of Luna Agents. Today, I'll show you how to build and deploy a complete feature - from requirements to production - using AI-powered agents. This is not just code completion. This is complete lifecycle automation. Let's dive in."

*[Transition to screen recording]*

**[0:20-0:45] SETUP & CONTEXT**
*[Screen: Project folder structure]*

**VOICEOVER**:
"I have a SaaS application here, and I want to add a user profile feature. Instead of spending days planning and coding, I'll use Luna's AI agents to do this in under 30 minutes. Watch how each agent handles a different phase of development."

*[Screen: Terminal ready]*

**[0:45-1:30] STEP 1: REQUIREMENTS ANALYSIS**
*[Screen: Terminal, type command]*
```bash
/luna-requirements
```
*[Prompt appears: "Project or feature scope?"]*
*[Type: "user-profile"]*

**VOICEOVER**:
"First, Luna's Requirements Analyzer agent examines my codebase. It identifies the existing architecture, database structure, and coding patterns. Then it generates comprehensive requirements for the new feature."

*[Screen: Show requirements.md file being created]*
*[Scroll through requirements document - highlight key sections]*

**VOICEOVER**:
"Look at this - business requirements, technical specs, API definitions, security considerations. All automatically generated based on my project context. This would normally take hours of meetings and documentation."

**[1:30-2:15] STEP 2: DESIGN ARCHITECTURE**
*[Screen: Terminal, type command]*
```bash
/luna-design
```
*[Type: "user-profile"]*

**VOICEOVER**:
"Next, the Design Architect agent reads those requirements and creates a complete technical design. It defines the database schema, API endpoints, component structure, and even considers performance implications."

*[Screen: Show design.md file]*
*[Highlight: API specifications, database schema, component tree]*

**VOICEOVER**:
"See how it designed three REST endpoints, created the database migration, and planned the React component hierarchy? It's following the patterns already in my codebase for consistency."

**[2:15-2:40] STEP 3: TASK PLANNING**
*[Screen: Terminal, type command]*
```bash
/luna-plan
```
*[Type: "user-profile"]*

**VOICEOVER**:
"The Task Planner agent breaks this design into actionable tasks, ordered by dependencies. Each task has acceptance criteria and time estimates."

*[Screen: Show implementation-plan.md]*
*[Scroll through tasks with checkboxes]*

**VOICEOVER**:
"10 tasks, clearly sequenced. Database first, then API, then frontend. Each one builds on the previous. This is the roadmap for execution."

**[2:40-4:00] STEP 4: TASK EXECUTION**
*[Screen: Terminal, multiple executions]*

**VOICEOVER**:
"Now for the magic. The Task Executor agent implements each task automatically. Watch as I run this multiple times."

*[First execution]*
```bash
/luna-execute
```
*[Show: "Task 1.1 Complete: Database migration created"]*
*[Quick peek at migration file]*

**VOICEOVER**:
"First task done - database migration with proper indexes and constraints."

*[Second execution - faster paced]*
```bash
/luna-execute
```
*[Show: "Task 1.2 Complete: Profile model with validation"]*

**VOICEOVER**:
"User model created with input validation."

*[Third execution - montage style]*
*[Show: Multiple /luna-execute commands running]*
*[Files being created: API routes, controllers, React components]*

**VOICEOVER**:
"I'm running execute repeatedly until all tasks are done. Luna writes clean, tested code that follows my project's conventions. Look at these API endpoints - proper error handling, input validation, authentication checks. And comprehensive unit tests for everything."

*[Screen: Final status showing all tasks completed]*

**[4:00-4:30] STEP 5: CODE REVIEW**
*[Screen: Terminal]*
```bash
/luna-review
```

**VOICEOVER**:
"Before deployment, let's review. Luna's Code Review agent checks for security vulnerabilities, performance issues, and code quality."

*[Screen: Show code-review-report.md]*
*[Highlight: "Overall Quality: Excellent", "Security: No vulnerabilities", minor suggestions]*

**VOICEOVER**:
"Excellent quality score. No security issues. Just a couple of minor optimization suggestions. This gives me confidence to deploy."

**[4:30-5:00] STEP 6: TESTING & DEPLOYMENT**
*[Screen: Terminal]*
```bash
/luna-test
```
*[Show: Tests running, all passing]*

**VOICEOVER**:
"Luna generated and ran comprehensive tests. 100% pass rate."

*[Screen: Terminal]*
```bash
/luna-deploy
```
*[Show: Deployment progress, success message with live URL]*

**VOICEOVER**:
"And deploy to production - Cloudflare's global edge network. The feature is now live worldwide with millisecond latency."

**[5:00-5:30] CONCLUSION**
*[Screen: Split screen - before/after or talking head]*

**VOICEOVER**:
"In 5 minutes, we went from idea to production-ready feature. Requirements, design, implementation, testing, deployment - all automated by AI agents. This is what development looks like with Luna Agents."

*[Screen: Pricing slide]*

**VOICEOVER**:
"$29 per month. No juggling tools. No context switching. Just ship faster. Try Luna Agents free at agent.lunaos.ai."

*[End screen: Luna logo, website, "Start Free" CTA]*

---

### Production Notes

**B-Roll Footage**:
- Code being written (smooth scrolling)
- Files appearing in directory tree
- Tests passing (green checkmarks)
- Deployment progress bars
- Live website loading

**On-Screen Graphics**:
- Step indicators (1/6, 2/6, etc.)
- Agent name labels ("Requirements Analyzer", "Design Architect", etc.)
- Time saved counter
- Cost comparison ($29 vs $100+)

**Pacing**:
- 0:00-0:45: Slower (setup)
- 0:45-2:40: Medium (explanation)
- 2:40-4:00: Faster (execution montage)
- 4:00-5:00: Medium (review)
- 5:00-5:30: Slower (conclusion)

**Chapters** (for YouTube):
- 0:00 Introduction
- 0:20 Setup & Context
- 0:45 Requirements Analysis
- 1:30 Design Architecture
- 2:15 Task Planning
- 2:40 Task Execution
- 4:00 Code Review
- 4:30 Testing & Deployment
- 5:00 Conclusion

---

## Video 3: Luna RAG Deep Dive (3-4 minutes)

**Purpose**: Technical deep-dive for advanced users, YouTube, conferences
**Target Length**: 3-4 minutes
**Format**: Screen recording with technical voiceover
**Tone**: Technical, detailed, for experienced developers

### Script

**[0:00-0:15] HOOK**

**VOICEOVER**:
"Semantic code search that actually understands your codebase. Not just grep on steroids. True AI-powered code intelligence. Let me show you Luna RAG in action."

**[0:15-0:45] EXAMPLE 1: ARCHITECTURE UNDERSTANDING**

*[Screen: Large codebase, thousands of files]*

**VOICEOVER**:
"Here's a real production codebase - 50,000 lines across 500 files. Traditional search? Useless. Watch Luna RAG."

*[Type: "/luna-rag How does authentication work in this project?"]*

*[Show: RAG processing, then intelligent results]*

**VOICEOVER**:
"Luna RAG doesn't just find files with 'auth' in the name. It understands the authentication flow. It identified the middleware, the token validation, the user session management, and how they all connect. Context-aware intelligence."

**[0:45-1:15] EXAMPLE 2: PATTERN EXTRACTION**

*[Type: "/luna-rag Show me all error handling patterns"]*

*[Show: RAG extracting patterns from entire codebase]*

**VOICEOVER**:
"Look at this - Luna extracted every error handling approach in the codebase, categorized them by type, showed usage examples, and even suggested best practices. This is pattern recognition at work."

**[1:15-1:45] EXAMPLE 3: CROSS-FILE DEPENDENCIES**

*[Type: "/luna-rag What components use the User API?"]*

*[Show: Dependency graph visualization]*

**VOICEOVER**:
"Dependency tracking across the entire application. Luna RAG mapped every component that calls the User API, showing the data flow and relationships. Try doing that with grep."

**[1:45-2:30] HOW IT WORKS**

*[Screen: Architecture diagram]*

**VOICEOVER**:
"Here's what's happening under the hood. Luna RAG indexes your codebase using vector embeddings - not just file names and line numbers. It understands semantic meaning. When you ask a question, it converts that to a vector, searches the embedding space for similar code patterns, and assembles context from multiple files. It's using the same technology as ChatGPT's retrieval, but specialized for code."

*[Show: Vector space visualization (optional)]*

**[2:30-3:00] EXAMPLE 4: REFACTORING ASSISTANCE**

*[Type: "/luna-rag If I want to switch from MongoDB to PostgreSQL, what needs to change?"]*

*[Show: Comprehensive analysis]*

**VOICEOVER**:
"Refactoring analysis. Luna identified every MongoDB query, the schema structure, and provided a migration plan. It even caught indirect dependencies like date formatting that differs between databases."

**[3:00-3:30] PERFORMANCE & PRIVACY**

*[Screen: Metrics dashboard]*

**VOICEOVER**:
"Performance? Blazing fast. Sub-second search across 100,000 files. Privacy? Your code never leaves your machine for the local RAG server. For premium cloud RAG, we use encrypted channels and never store your code."

**[3:30-4:00] CONCLUSION**

**VOICEOVER**:
"Luna RAG. Semantic code search that understands context, not just syntax. Free tier: 100 queries per day. Pro: unlimited. This is how code search should work. Start using it at agent.lunaos.ai."

---

## Video 4: Product Hunt Launch Day Announcement (60-90 seconds)

**Purpose**: Social media announcement, PH page, email blast
**Target Length**: 60-90 seconds
**Format**: Dynamic montage with upbeat music
**Tone**: Exciting, celebratory, call-to-action

### Script

**[0:00-0:10] HOOK**
*[Screen: Countdown timer 3...2...1...LAUNCH!]*
*[Explosion of Luna logo animation]*

**VOICEOVER**:
"Today's the day! Luna Agents is LIVE on Product Hunt!"

**[0:10-0:25] PROBLEM REMINDER**
*[Fast-paced montage of frustrated developers]*
*[Multiple tool tabs, pricing pages adding up]*

**VOICEOVER**:
"Tired of paying $100/month for 10 different tools? Tired of context switching? Tired of manual coding tasks?"

**[0:25-0:45] SOLUTION SHOWCASE**
*[Screen: Luna Agents in action - rapid clips]*
- Installation (2 sec)
- RAG search (3 sec)
- Code generation (3 sec)
- Deployment (2 sec)
- Success celebration (2 sec)

**VOICEOVER**:
"Luna Agents automates your entire development lifecycle. Requirements to deployment. 15 AI agents. One platform. $29/month."

**[0:45-1:00] SOCIAL PROOF**
*[Quick testimonial clips - text overlays]*

**TEXT ON SCREEN**:
"Shipped in 2 weeks, not 2 months" - Sarah Chen
"70% cost savings" - TechFlow Agency
"Game changer" - Marcus Johnson

**[1:00-1:15] CALL TO ACTION**
*[Screen: Product Hunt page]*

**VOICEOVER**:
"We're on Product Hunt RIGHT NOW. Click the link. Try Luna free. Support us with an upvote. Let's democratize AI development together!"

*[End screen: "🚀 We're LIVE on Product Hunt!" + link]*

---

## Video 5: Testimonial Compilation (2-3 minutes)

**Purpose**: Social proof, homepage, email campaigns
**Target Length**: 2-3 minutes
**Format**: Interview clips montage
**Tone**: Authentic, relatable, inspiring

### Structure

**[Introduction - 0:00-0:15]**
*[Screen: "Developers Love Luna Agents"]*
*[Background music: Uplifting, subtle]*

**[Developer 1 - Indie Developer - 0:15-0:45]**
*[Name card: "Sarah Chen, Indie Developer"]*

**SARAH**:
"Before Luna, I was paying $150/month for Copilot, Jira, Vercel, and a bunch of other tools. And I still spent nights and weekends coding. Luna replaced all of them for $29, and I'm shipping 3x faster. I built my entire SaaS MVP in 2 weeks. That would have taken me 2 months before."

**[Developer 2 - Agency Owner - 0:45-1:15]**
*[Name card: "Alex Rivera, TechFlow Agency"]*

**ALEX**:
"We're a small agency with 20 clients. Consistency was our biggest challenge. Now every project follows the same workflow - requirements, design, execution, testing, deployment. Luna handles it all. Our client satisfaction scores went from 7/10 to 9.5/10. And we're taking on more projects with the same team size."

**[Developer 3 - Startup CTO - 1:15-1:45]**
*[Name card: "Jordan Park, Startup CTO"]*

**JORDAN**:
"The semantic code search alone is worth $29. Luna RAG actually understands my codebase. I ask questions in plain English and it finds exactly what I need, with full context. No more grepping through thousands of files. As a CTO, I need to understand our entire system quickly. Luna makes that possible."

**[Developer 4 - Freelancer - 1:45-2:15]**
*[Name card: "Marcus Johnson, Freelance Developer"]*

**MARCUS**:
"I was skeptical. Another AI tool? But Luna is different. It's not just code completion. It's the entire workflow. The code review agent catches security issues I'd miss. The testing agent writes better tests than I would. And deployment to Cloudflare's global network with one command? That's insane. My clients are blown away by how fast I deliver now."

**[Developer 5 - Open Source Maintainer - 2:15-2:45]**
*[Name card: "Priya Sharma, OSS Maintainer"]*

**PRIYA**:
"Luna gives free Pro access for open source projects. That's huge. I use it to review pull requests, generate documentation, and maintain multiple repos. It's like having a team when I'm just one person. Open source developers need tools like this."

**[Conclusion - 2:45-3:00]**
*[Screen: Montage of developers working happily]*

**VOICEOVER**:
"Join thousands of developers shipping faster with Luna Agents. Start free at agent.lunaos.ai."

---

## Production Checklist

### Pre-Production
- [ ] Script finalized and approved
- [ ] Voiceover talent booked (or DIY recording setup)
- [ ] Screen recording software ready (OBS, ScreenFlow, Camtasia)
- [ ] Demo environment prepared (clean codebase, working features)
- [ ] Graphic assets created (logos, text overlays, animations)
- [ ] Music licensed (Epidemic Sound, Artlist, or royalty-free)

### Production
- [ ] Record voiceover (professional mic, quiet room)
- [ ] Record screen capture (60fps, 1080p minimum)
- [ ] Capture B-roll (code typing, file navigation, terminal activity)
- [ ] Film talking head segments (if applicable - good lighting, clean background)
- [ ] Save all raw files with proper naming convention

### Post-Production
- [ ] Edit timeline (cut pauses, add transitions)
- [ ] Add text overlays and graphics
- [ ] Mix voiceover and music (voice clear, music subtle)
- [ ] Color grade for consistency
- [ ] Add sound effects (transitions, success sounds)
- [ ] Create chapters/timestamps
- [ ] Render final export (1080p H.264, optimized for web)
- [ ] Create alternate versions (square for social, vertical for mobile)

### Distribution
- [ ] Upload to YouTube with optimized title, description, tags
- [ ] Create compelling thumbnail
- [ ] Post to Twitter, LinkedIn, Facebook
- [ ] Embed on website
- [ ] Send to email list
- [ ] Share in Discord and communities
- [ ] Submit to relevant subreddits

### Analytics
- [ ] Track views, watch time, engagement
- [ ] Monitor comments and respond
- [ ] A/B test thumbnails and titles
- [ ] Analyze drop-off points
- [ ] Iterate for future videos

---

**Last Updated**: December 2025
**Questions?**: video@lunaos.ai or Discord #content-production

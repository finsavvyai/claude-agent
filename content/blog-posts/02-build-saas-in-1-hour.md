# Build a Complete SaaS Feature in 1 Hour with AI Agents

**Reading Time**: 12 minutes
**Difficulty**: Intermediate
**Category**: Tutorial
**Published**: [Date]
**What You'll Learn**:
- Complete Luna Agents workflow from requirements to deployment
- How to use Luna RAG for codebase understanding
- Automated testing, deployment, and monitoring setup
- Real-world feature implementation example

---

It's 9:00 AM on Monday. Your product manager drops a new feature request in Slack: "We need a user profile page with avatar upload, bio editing, and social links."

Traditional approach: 2-3 days of work.
- Half day: Understanding existing auth flow and user model
- Full day: Building the feature (frontend + backend)
- Half day: Writing tests
- Half day: Deployment, monitoring setup, documentation

**With Luna Agents: 1 hour.**

Let me show you how.

---

## The Feature Request

**User Profile Page Requirements**:
- Display user information (name, email, joined date)
- Avatar upload with image preview
- Bio text editor (500 char limit)
- Social media links (Twitter, GitHub, LinkedIn)
- Save/cancel buttons
- Mobile responsive
- Secure (authenticated users only)

Sounds simple, right? But there's hidden complexity:
- How does the existing auth work?
- Where's the user model defined?
- What's the API structure?
- Where do images get uploaded?
- How do we handle validation?
- What about tests?
- How do we deploy?

These questions usually take hours of code reading and asking teammates. Not anymore.

---

## Step 1: Understanding the Codebase with Luna RAG (5 minutes)

First, I need to understand how authentication and user management work in this project.

### Query 1: Authentication Flow

```bash
/luna-rag "How does user authentication work in this project?"
```

**Luna RAG Response**:
```
Authentication Flow Analysis:

Entry Point: src/middleware/auth.ts
- JWT-based authentication
- Tokens stored in HTTP-only cookies
- Middleware validates token on protected routes

User Model: src/database/models/User.ts
- Fields: id, email, name, avatar_url, bio, social_links
- Relations: Sessions, APIKeys

Auth Routes: src/api/auth/
- POST /api/auth/login → generates JWT
- POST /api/auth/register → creates user + JWT
- POST /api/auth/logout → clears cookie

Protected Routes Pattern:
- Use authMiddleware() in route definitions
- User available at req.user
```

Perfect! I now know:
- JWT authentication with HTTP-only cookies
- User model already has `avatar_url`, `bio`, `social_links` fields
- How to protect my new routes

### Query 2: Image Upload Pattern

```bash
/luna-rag "Show me how file uploads are handled in this project"
```

**Luna RAG Response**:
```
File Upload Implementation:

Library: Multer (npm package)
Storage: Cloudflare R2 (configured in src/config/storage.ts)

Example Implementation: src/api/documents/upload.ts
- Multer middleware for multipart/form-data
- File validation (size, type)
- Upload to R2 with unique filename
- Return public URL

Code Pattern:
import { uploadToR2 } from '@/config/storage';
import multer from 'multer';

const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images allowed'));
    }
  }
});

router.post('/upload', upload.single('file'), async (req, res) => {
  const url = await uploadToR2(req.file);
  res.json({ url });
});
```

Excellent! Now I know exactly how to implement avatar upload.

### Query 3: API Structure

```bash
/luna-rag "What's the API route structure and naming convention?"
```

**Luna RAG Response**:
```
API Structure:

Base: /api/v1/
Routes organized by resource: /api/v1/{resource}/{action}

Examples:
- /api/v1/auth/login
- /api/v1/users/:userId
- /api/v1/documents/:docId

Naming Convention:
- Use plural resource names
- RESTful verbs (GET, POST, PATCH, DELETE)
- Protected routes use authMiddleware()

Controller Pattern: src/api/users/controller.ts
- Controller handles business logic
- Route files just wire up endpoints
```

**Total time spent: 5 minutes**

I now have complete understanding of:
- Authentication system
- File upload implementation
- API structure and conventions
- Database models

Let's build the feature.

---

## Step 2: Requirements Analysis (3 minutes)

Instead of writing requirements myself, I'll let Luna analyze the feature request and generate proper specs.

```bash
/luna-requirements user-profile-feature
```

I paste the feature request into the prompt, and Luna generates:

```markdown
# User Profile Feature - Requirements Specification

## Functional Requirements

### FR-1: Profile Display
- Display user name, email, avatar, bio, social links
- Show account creation date
- Load data from authenticated user context

### FR-2: Avatar Upload
- Accept image files (JPG, PNG, WebP, max 5MB)
- Show preview before upload
- Crop/resize to 256x256px
- Upload to Cloudflare R2
- Update user.avatar_url in database

### FR-3: Bio Editing
- Rich text editor (basic formatting)
- 500 character limit with counter
- Auto-save draft to localStorage
- Validation on save

### FR-4: Social Links
- Input fields for Twitter, GitHub, LinkedIn URLs
- Validate URL format
- Store as JSON in user.social_links

### FR-5: Save/Cancel
- Save button: PATCH /api/v1/users/:userId
- Cancel button: Discard changes, reload original data
- Show success/error messages
- Disable button during save (loading state)

## Non-Functional Requirements

### NFR-1: Security
- Authenticate all endpoints
- Users can only edit their own profile
- Sanitize inputs (prevent XSS)
- Rate limit API calls (10 req/min)

### NFR-2: Performance
- Page load < 2s
- Image upload < 5s
- Optimistic UI updates

### NFR-3: Accessibility
- WCAG 2.1 AA compliant
- Keyboard navigation
- Screen reader support

## Technical Specifications

### Database Changes
No schema changes needed (fields already exist)

### API Endpoints
- GET /api/v1/users/:userId - Fetch user profile
- PATCH /api/v1/users/:userId - Update profile
- POST /api/v1/users/:userId/avatar - Upload avatar

### Frontend Components
- ProfilePage (container)
- ProfileForm (form handling)
- AvatarUpload (image upload + preview)
- BioEditor (textarea with counter)
- SocialLinksForm (URL inputs)
```

Luna identified that the database already has the needed fields (from the RAG analysis earlier!). It generated proper functional and non-functional requirements, and even broke down the technical specs.

**Time spent: 3 minutes**

---

## Step 3: Design Architecture (4 minutes)

Now let's generate the technical design.

```bash
/luna-design user-profile-feature
```

Luna reads the requirements and generates:

```markdown
# User Profile Feature - Technical Design

## Architecture Overview

Frontend: React component (Next.js 14)
Backend: Express.js REST API
Database: PostgreSQL (existing User table)
Storage: Cloudflare R2 (images)

## Component Hierarchy

ProfilePage (src/pages/profile/index.tsx)
└── ProfileForm (src/components/profile/ProfileForm.tsx)
    ├── AvatarUpload (src/components/profile/AvatarUpload.tsx)
    ├── BioEditor (src/components/profile/BioEditor.tsx)
    └── SocialLinksForm (src/components/profile/SocialLinksForm.tsx)

## API Design

### GET /api/v1/users/:userId
Response:
{
  "id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "avatar_url": "https://...",
  "bio": "Software developer",
  "social_links": {
    "twitter": "https://twitter.com/johndoe",
    "github": "https://github.com/johndoe",
    "linkedin": "https://linkedin.com/in/johndoe"
  },
  "created_at": "2025-01-01T00:00:00Z"
}

### PATCH /api/v1/users/:userId
Request Body:
{
  "name": "John Doe",
  "bio": "Updated bio",
  "social_links": { ... }
}

### POST /api/v1/users/:userId/avatar
Content-Type: multipart/form-data
Body: file (image)
Response: { "avatar_url": "https://..." }

## Database Schema (existing)

User table already has required fields:
- avatar_url (TEXT)
- bio (TEXT)
- social_links (JSONB)

## Security Considerations

1. Authentication: authMiddleware() on all routes
2. Authorization: Check req.user.id === params.userId
3. Input Validation: Joi schemas for all inputs
4. File Upload: Validate file type and size
5. XSS Prevention: Sanitize bio text
6. Rate Limiting: 10 requests per minute per user

## Error Handling

- 400 Bad Request: Invalid input
- 401 Unauthorized: Not authenticated
- 403 Forbidden: Editing another user's profile
- 404 Not Found: User doesn't exist
- 413 Payload Too Large: Image > 5MB
- 500 Internal Server Error: Server issues
```

Luna has given me complete architectural design with component structure, API specs, security considerations, and error handling.

**Time spent: 4 minutes**

---

## Step 4: Implementation Planning (2 minutes)

Let's break down the implementation into tasks.

```bash
/luna-plan user-profile-feature
```

Luna generates a dependency-ordered task list:

```markdown
# User Profile Feature - Implementation Plan

## Phase 1: Backend (Estimated: 20 minutes)

### Task 1: Create API routes (5 min)
File: src/api/v1/users/routes.ts
- Set up GET /api/v1/users/:userId
- Set up PATCH /api/v1/users/:userId
- Set up POST /api/v1/users/:userId/avatar
- Apply authMiddleware to all routes

### Task 2: Implement controllers (8 min)
File: src/api/v1/users/controller.ts
- getUserProfile() - fetch user data
- updateUserProfile() - update name, bio, social_links
- uploadAvatar() - handle image upload to R2

### Task 3: Add validation (4 min)
File: src/api/v1/users/validation.ts
- Joi schema for profile update
- URL validation for social links
- Image validation (type, size)

### Task 4: Add authorization (3 min)
File: src/middleware/authorization.ts
- Create isProfileOwner() middleware
- Check req.user.id === params.userId

## Phase 2: Frontend (Estimated: 25 minutes)

### Task 5: Create ProfilePage (5 min)
File: src/pages/profile/index.tsx
- Fetch user data on mount
- Handle loading/error states
- Render ProfileForm

### Task 6: Build ProfileForm component (7 min)
File: src/components/profile/ProfileForm.tsx
- Form state management (React Hook Form)
- Handle submit (PATCH request)
- Success/error messages
- Optimistic UI updates

### Task 7: Build AvatarUpload component (6 min)
File: src/components/profile/AvatarUpload.tsx
- File input with preview
- Image cropping (react-easy-crop)
- Upload to API
- Update avatar_url in state

### Task 8: Build BioEditor component (4 min)
File: src/components/profile/BioEditor.tsx
- Textarea with character counter
- 500 char limit enforcement
- Auto-save draft to localStorage

### Task 9: Build SocialLinksForm component (3 min)
File: src/components/profile/SocialLinksForm.tsx
- URL inputs for Twitter, GitHub, LinkedIn
- URL validation
- Display icons

## Phase 3: Testing (Estimated: 8 minutes)

### Task 10: Write backend tests (4 min)
File: src/api/v1/users/__tests__/controller.test.ts
- Test GET endpoint
- Test PATCH with valid data
- Test PATCH with invalid data (should fail)
- Test authorization (editing other user's profile)

### Task 11: Write frontend tests (4 min)
File: src/components/profile/__tests__/ProfileForm.test.tsx
- Test form submission
- Test validation errors
- Test avatar upload
- Test cancel button

## Phase 4: Deployment (Estimated: 2 minutes)

### Task 12: Deploy to production (2 min)
- Run /luna-deploy
- Verify deployment
- Test in production

Total Estimated Time: 55 minutes
```

Perfect breakdown! Now let's execute.

**Time spent: 2 minutes**

---

## Step 5: Execute Tasks (35 minutes)

Time to write code! I'll use Luna's task executor agent.

```bash
/luna-execute
```

Luna starts working through tasks automatically. Here's what happens:

### Tasks 1-4: Backend Implementation (20 minutes)

Luna writes:

**src/api/v1/users/routes.ts**:
```typescript
import express from 'express';
import multer from 'multer';
import { authMiddleware } from '@/middleware/auth';
import { isProfileOwner } from '@/middleware/authorization';
import * as controller from './controller';

const router = express.Router();
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images allowed'));
    }
  }
});

router.get('/:userId', authMiddleware, controller.getUserProfile);
router.patch('/:userId', authMiddleware, isProfileOwner, controller.updateUserProfile);
router.post('/:userId/avatar', authMiddleware, isProfileOwner, upload.single('avatar'), controller.uploadAvatar);

export default router;
```

**src/api/v1/users/controller.ts**:
```typescript
import { Request, Response } from 'express';
import { db } from '@/database';
import { uploadToR2 } from '@/config/storage';
import { validateProfileUpdate } from './validation';

export async function getUserProfile(req: Request, res: Response) {
  try {
    const { userId } = req.params;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar_url: true,
        bio: true,
        social_links: true,
        created_at: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateUserProfile(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const { error, value } = validateProfileUpdate(req.body);

    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        name: value.name,
        bio: value.bio,
        social_links: value.social_links
      },
      select: {
        id: true,
        name: true,
        bio: true,
        social_links: true,
        avatar_url: true
      }
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function uploadAvatar(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { userId } = req.params;
    const avatarUrl = await uploadToR2(req.file, `avatars/${userId}`);

    await db.user.update({
      where: { id: userId },
      data: { avatar_url: avatarUrl }
    });

    res.json({ avatar_url: avatarUrl });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

**src/api/v1/users/validation.ts**:
```typescript
import Joi from 'joi';

export function validateProfileUpdate(data: any) {
  const schema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    bio: Joi.string().max(500).allow('').optional(),
    social_links: Joi.object({
      twitter: Joi.string().uri().allow('').optional(),
      github: Joi.string().uri().allow('').optional(),
      linkedin: Joi.string().uri().allow('').optional()
    }).optional()
  });

  return schema.validate(data);
}
```

**src/middleware/authorization.ts**:
```typescript
import { Request, Response, NextFunction } from 'express';

export function isProfileOwner(req: Request, res: Response, next: NextFunction) {
  const { userId } = req.params;

  if (req.user.id !== userId) {
    return res.status(403).json({ error: 'Forbidden: You can only edit your own profile' });
  }

  next();
}
```

### Tasks 5-9: Frontend Implementation (15 minutes)

Luna creates the React components:

**src/pages/profile/index.tsx** (abbreviated):
```tsx
'use client';

import { useState, useEffect } from 'react';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { Loader } from '@/components/ui/Loader';

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  async function fetchUserProfile() {
    const res = await fetch('/api/v1/users/me');
    const data = await res.json();
    setUser(data);
    setLoading(false);
  }

  if (loading) return <Loader />;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Your Profile</h1>
      <ProfileForm user={user} onUpdate={setUser} />
    </div>
  );
}
```

**src/components/profile/ProfileForm.tsx** (abbreviated):
```tsx
import { useForm } from 'react-hook-form';
import { AvatarUpload } from './AvatarUpload';
import { BioEditor } from './BioEditor';
import { SocialLinksForm } from './SocialLinksForm';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/toast';

export function ProfileForm({ user, onUpdate }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: user
  });

  async function onSubmit(data) {
    try {
      const res = await fetch(`/api/v1/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!res.ok) throw new Error('Failed to update profile');

      const updated = await res.json();
      onUpdate(updated);
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Failed to update profile');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <AvatarUpload currentUrl={user.avatar_url} userId={user.id} />

      <div>
        <label>Name</label>
        <input {...register('name', { required: true, minLength: 2 })} />
        {errors.name && <span className="error">Name is required</span>}
      </div>

      <BioEditor register={register} />
      <SocialLinksForm register={register} />

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button type="button" variant="outline">Cancel</Button>
      </div>
    </form>
  );
}
```

I'll skip showing all components for brevity, but Luna generates:
- AvatarUpload with image preview and cropping
- BioEditor with character counter
- SocialLinksForm with URL validation

---

## Step 6: Code Review (3 minutes)

Before deploying, let's review the code quality.

```bash
/luna-review user-profile-feature
```

Luna analyzes the code and reports:

```markdown
# Code Review Report

## ✅ Passed Checks

### Security
- ✅ Authentication middleware applied to all routes
- ✅ Authorization checks (isProfileOwner)
- ✅ Input validation with Joi
- ✅ File upload validation (type, size)
- ✅ SQL injection prevented (Prisma ORM)

### Code Quality
- ✅ TypeScript types defined
- ✅ Error handling in all async functions
- ✅ Consistent code style
- ✅ No console.logs in production

### Performance
- ✅ Database queries optimized (select only needed fields)
- ✅ Image upload to CDN (Cloudflare R2)
- ✅ Proper HTTP status codes

## ⚠️ Warnings

### Minor Issues
- ⚠️ Missing error boundary in ProfilePage
- ⚠️ BioEditor could use debouncing for auto-save

### Suggestions
- 💡 Consider adding loading skeleton instead of spinner
- 💡 Add analytics tracking for profile updates
- 💡 Implement image compression before upload

## Score: 95/100

Overall: Excellent code quality. Safe to deploy.
```

Great! The code passes all security and quality checks. The warnings are minor and can be addressed later.

**Time spent: 3 minutes**

---

## Step 7: Testing (5 minutes)

```bash
/luna-test user-profile-feature
```

Luna generates comprehensive tests and runs them:

```
Running tests...

Backend Tests (4 passed, 0 failed)
✓ GET /api/v1/users/:userId returns user profile
✓ PATCH /api/v1/users/:userId updates profile
✓ PATCH returns 403 when editing another user's profile
✓ POST /api/v1/users/:userId/avatar uploads image

Frontend Tests (5 passed, 0 failed)
✓ ProfileForm renders correctly
✓ ProfileForm submits valid data
✓ ProfileForm shows validation errors
✓ AvatarUpload handles file selection
✓ Cancel button resets form

Coverage: 94%

All tests passed! ✅
```

**Time spent: 5 minutes**

---

## Step 8: Deploy to Production (3 minutes)

Time to ship it!

```bash
/luna-deploy user-profile-feature
```

Luna handles deployment:

```
Deploying user-profile-feature...

1. Running final build... ✓
2. Running database migrations... ✓ (no changes needed)
3. Deploying to Cloudflare Workers... ✓
4. Deploying frontend to Cloudflare Pages... ✓
5. Invalidating CDN cache... ✓
6. Running smoke tests in production... ✓

Deployment successful! 🚀

Production URL: https://app.lunaos.ai
Profile page: https://app.lunaos.ai/profile

Monitoring dashboard: https://dash.cloudflare.com/...
```

**Time spent: 3 minutes**

---

## Total Time: 58 Minutes

Let's break it down:

| Phase | Time |
|-------|------|
| **Luna RAG (understanding codebase)** | 5 min |
| **Requirements analysis** | 3 min |
| **Design architecture** | 4 min |
| **Implementation planning** | 2 min |
| **Backend implementation** | 20 min |
| **Frontend implementation** | 15 min |
| **Code review** | 3 min |
| **Testing** | 5 min |
| **Deployment** | 3 min |
| **TOTAL** | **58 min** |

## What Would This Take Without Luna?

**Traditional Approach (conservative estimate):**

1. **Understanding Codebase**: 2-3 hours
   - Reading auth middleware code
   - Finding user model definitions
   - Understanding file upload patterns
   - Asking teammates questions
   - Waiting for responses

2. **Planning & Design**: 1-2 hours
   - Writing requirements doc
   - Sketching architecture
   - Getting design review
   - Making revisions

3. **Implementation**: 8-12 hours
   - Backend API (3-4 hours)
   - Frontend components (4-5 hours)
   - Styling and polish (1-2 hours)
   - Bug fixes and iterations (2-3 hours)

4. **Testing**: 2-3 hours
   - Writing unit tests
   - Writing integration tests
   - Manual QA testing
   - Fixing test failures

5. **Documentation**: 1 hour
   - API documentation
   - Component documentation
   - Update README

6. **Deployment**: 1-2 hours
   - Build and deploy
   - Configuration
   - Smoke testing
   - Rollback if issues

**Total Traditional Time: 15-23 hours (2-3 days)**

**With Luna Agents: 58 minutes (1 hour)**

**Time Savings: 14-22 hours (93-96% faster)**

---

## What Made This Possible?

### 1. Luna RAG™ - Intelligent Code Understanding
Instead of spending hours reading code, Luna RAG answered specific questions in seconds:
- "How does auth work?" → JWT with HTTP-only cookies
- "How are file uploads handled?" → Multer + R2 pattern
- "What's the API structure?" → RESTful with /api/v1/ prefix

### 2. Requirements Analysis Agent
Generated proper specifications from natural language, saving 1-2 hours of documentation work.

### 3. Design Architect Agent
Created complete technical design including:
- Component hierarchy
- API specifications
- Security considerations
- Error handling strategy

### 4. Task Planning Agent
Broke down implementation into dependency-ordered tasks, eliminating paralysis and ensuring nothing is forgotten.

### 5. Task Execution Agent
Implemented all tasks with production-quality code:
- TypeScript with proper types
- Error handling
- Input validation
- Security checks
- Clean, readable code

### 6. Code Review Agent
Automated security and quality checks:
- OWASP Top 10 vulnerabilities
- Code style consistency
- Performance optimization
- Best practices enforcement

### 7. Testing Agent
Generated comprehensive test suites automatically:
- Unit tests
- Integration tests
- Edge cases
- 94% code coverage

### 8. Deployment Agent
One-command deployment:
- Build optimization
- Database migrations
- CDN deployment
- Cache invalidation
- Smoke testing

---

## Key Takeaways

### 1. Luna RAG Is a Game-Changer
Being able to ask natural language questions about your codebase and get instant, accurate answers is transformative. No more grep-ing through files or bothering teammates.

### 2. Complete Lifecycle Automation Works
Each agent specializes in its domain and hands off to the next. The workflow is seamless, and nothing falls through the cracks.

### 3. Quality Doesn't Suffer
The code Luna generates is production-ready:
- Proper error handling
- Security best practices
- Comprehensive tests
- Clean, maintainable code

### 4. This Scales
Whether it's a simple profile page or a complex payments integration, the workflow is the same. Requirements → Design → Plan → Execute → Review → Test → Deploy.

### 5. The ROI Is Insane
At $29/month for Luna Pro, you'd need to save 1 hour to break even (assuming $29/hour rate). In this example, we saved 15-22 hours. That's **15-22x ROI on month 1**.

---

## Try It Yourself

Want to experience this workflow firsthand?

### Start Free
Luna Free includes 10 core agents and 100 RAG queries per day - perfect for trying this tutorial.

```bash
# Install Luna Agents
git clone https://github.com/shacharsol/luna-agent.git
cd luna-agent
./setup.sh

# Try the workflow
/luna-rag "How does authentication work in this project?"
/luna-requirements "Build a user profile page with avatar upload"
/luna-design user-profile
/luna-plan user-profile
/luna-execute
```

### Upgrade to Pro
Need more than 100 RAG queries/day? Upgrade to Luna Pro:
- 15+ AI agents (UI testing, deployment, monitoring)
- Unlimited RAG queries
- Unlimited file indexing
- Luna Vision RAG™ (cloud GUI testing)
- Priority support

**$29/month** - Less than the cost of GitHub Copilot + Cursor combined.

[Start Free](https://agent.lunaos.ai) | [See Pricing](https://agent.lunaos.ai/pricing) | [Watch Demo](https://agent.lunaos.ai/demo)

---

## What's Next?

In upcoming tutorials, I'll show you:
- **Building a Complete Authentication System** (signup, login, password reset, email verification)
- **Implementing Stripe Payments** (subscriptions, webhooks, billing portal)
- **Creating a Real-Time Chat Feature** (WebSockets, presence, typing indicators)
- **Setting Up Monitoring & Observability** (Prometheus, Grafana, alerts)

Each tutorial will show the complete Luna Agents workflow from requirements to production.

---

## Questions? Feedback?

I'd love to hear about your experience!

- **Discord**: [Join our community](https://discord.gg/lunaagents) - Ask questions, share projects
- **Twitter**: [@lunaagents](https://twitter.com/lunaagents) - Daily tips and updates
- **Email**: tutorials@lunaos.ai - Request specific tutorials

---

**Did this tutorial help you?** Share it with a fellow developer!

**Have suggestions for future tutorials?** Let me know in the comments below or on [Twitter](https://twitter.com/lunaagents).

**Ready to ship 3x faster?** [Start using Luna Agents free](https://agent.lunaos.ai)

---

*P.S. - Yes, Luna Agents helped me write this tutorial. The Documentation Agent structured it, and Luna RAG pulled the code examples from the actual implementation. Meta? Absolutely. Accurate? 100%.*

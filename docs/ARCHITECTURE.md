# KaagapA.I System Architecture & Design Document

## 📋 Table of Contents
1. [System Overview](#overview)
2. [Technology Stack](#tech-stack)
3. [Architecture Pattern](#architecture)
4. [Security Model](#security)
5. [Data Flow](#data-flow)
6. [Phase Roadmap](#roadmap)

---

## Overview

**KaagapA.I** is an intelligent barangay management system that combines:
- Professional document management
- AI-powered insights and assistance
- Community engagement tools
- Administrative capabilities

### Core Philosophy
> "Make AI actually help residents - not just a chatbot"

### Three Main User Types
1. **Admins** - Manage residents, approve documents, view analytics
2. **Residents** - Request documents, track status, get AI assistance
3. **System** - AI processing, analytics, automation

---

## Tech Stack

### Frontend
```
React 18
├── React Router (v6) - Client-side routing
├── Tailwind CSS - Responsive UI
├── Lucide React - Icon library
└── Vite - Build tool
```

### Backend
```
Supabase
├── Authentication (Email/Password)
├── PostgreSQL Database
├── Row Level Security (RLS)
├── Real-time Subscriptions
└── Storage (for documents & photos)
```

### AI Layer
```
Google Gemini API
├── Text generation
├── Document analysis
├── Sentiment analysis
└── Recommendations
```

### Deployment
```
Vercel / Netlify (Frontend)
└── Auto-deploys from Git

Supabase Cloud (Backend)
└── Hosted PostgreSQL + Auth
```

---

## Architecture Pattern

### Layered Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                     │
│  (React Components - Login, Dashboard, Profile, etc)     │
└────────────────────────┬─────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────┐
│                    ROUTING LAYER                          │
│  (React Router - Protected Routes, Role-based)           │
└────────────────────────┬─────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────┐
│                    SERVICES LAYER                         │
│  (Business Logic - authService, userService, etc)        │
└────────────────────────┬─────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────┐
│                    DATA ACCESS LAYER                      │
│  (Supabase Client - REST API to database)                │
└────────────────────────┬─────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────┐
│                   DATABASE LAYER                          │
│  (PostgreSQL - Tables, RLS Policies, Functions)          │
└──────────────────────────────────────────────────────────┘
```

### Service Layer Pattern

Each business domain has a dedicated service:

```
authService.js
├── registerUser()
├── loginUser()
├── logoutUser()
└── updateUserProfile()

userService.js
├── getResidentProfile()
├── updateResidentProfile()
├── getResidentStats()
└── getResidentDocumentRequests()

documentRequestService.js
├── fetchDocumentRequests()
├── createDocumentRequest()
├── updateDocumentRequestStatus()
└── fetchDocumentTemplates()

[PHASE 2] residentService.js
[PHASE 3] notificationService.js
[PHASE 4] aiService.js
[PHASE 5] jobPortalService.js
```

---

## Security Model

### Authentication Flow

```
┌──────────────┐
│  User Login  │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────┐
│  Supabase Auth                   │
│  ├─ Verify credentials           │
│  └─ Create session               │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│  User Profile Lookup             │
│  └─ Get role from DB             │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│  Role-based Redirect             │
│  ├─ Admin → /dashboard           │
│  └─ Resident → /resident-dashboard│
└──────────────────────────────────┘
```

### Authorization (RLS Policies)

```sql
-- Residents see own data only
SELECT * FROM document_requests
WHERE resident_id = current_user_resident_id
OR auth.uid() IN (SELECT id FROM user_profiles WHERE role = 'admin')

-- Admins see all data
SELECT * FROM document_requests
WHERE auth.uid() IN (SELECT id FROM user_profiles WHERE role = 'admin')
```

### Data Protection

```
User Profile Access:
┌─────────────────────────────────────────────┐
│ Field          │ Can Read  │ Can Update     │
├─────────────────────────────────────────────┤
│ Email          │ Self/Admin│ Self (via auth)│
│ Phone          │ Self      │ Self           │
│ Profile Photo  │ All       │ Self           │
│ Age, Gender    │ Self/Admin│ Self           │
│ Address        │ Self/Admin│ Self           │
│ Resident Status│ Self/Admin│ Admin only     │
└─────────────────────────────────────────────┘
```

---

## Data Flow

### Registration Flow

```
User Input (name, email, password, profile data)
    │
    ▼
┌─────────────────────────────────────┐
│ Client-side Validation              │
│ ├─ Email format                     │
│ ├─ Password strength                │
│ └─ Required fields                  │
└─────┬───────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│ POST /auth/signup                   │
│ └─ Send credentials                 │
└─────┬───────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│ Supabase Auth                       │
│ ├─ Hash password                    │
│ ├─ Create auth user                 │
│ └─ Return user ID                   │
└─────┬───────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│ Create Resident Record              │
│ └─ INSERT residents table           │
└─────┬───────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│ Create User Profile Record          │
│ ├─ INSERT user_profiles             │
│ ├─ Link to auth user                │
│ └─ Link to resident                 │
└─────┬───────────────────────────────┘
      │
      ▼
User Account Created Successfully
```

### Document Request Flow (Future)

```
Resident Request
    │
    ▼
┌──────────────────────┐
│ Select Document Type │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Fill Request Form    │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Upload Documents     │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ Create Request Record                    │
│ ├─ INSERT document_requests              │
│ ├─ Set status = 'Pending'                │
│ └─ Notify admin                          │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ Admin Review                             │
│ ├─ Check documents                       │
│ ├─ Verify requirements                   │
│ └─ Approve or Request Info               │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ Update Status & Notify Resident          │
│ ├─ UPDATE document_requests              │
│ ├─ Set status = 'Approved'/'Released'    │
│ └─ Send notification                     │
└──────┬───────────────────────────────────┘
       │
       ▼
Resident Picks Up or Downloads Document
```

---

## Database Schema

### User Management
```
┌─────────────────────────────────────────────┐
│ auth.users (Supabase)                       │
├─────────────────────────────────────────────┤
│ id (UUID)           - Primary key           │
│ email (TEXT)        - Unique                │
│ encrypted_password  - Hashed                │
│ email_confirmed_at  - Timestamp             │
│ created_at          - Timestamp             │
└─────────────────────────────────────────────┘
           │ 1:1 relationship
           ▼
┌─────────────────────────────────────────────┐
│ public.user_profiles                        │
├─────────────────────────────────────────────┤
│ id (UUID)           - FK: auth.users        │
│ role (TEXT)         - 'admin'|'resident'    │
│ resident_id (UUID)  - FK: residents         │
│ phone (TEXT)        - Optional              │
│ profile_photo_url   - Optional              │
│ created_at          - Timestamp             │
│ updated_at          - Timestamp             │
└─────────────────────────────────────────────┘
           │ 1:1 relationship (optional)
           ▼
┌─────────────────────────────────────────────┐
│ public.residents                            │
├─────────────────────────────────────────────┤
│ id (UUID)           - Primary key           │
│ full_name (TEXT)    - Required              │
│ age (INT)           - Optional              │
│ gender (TEXT)       - Optional              │
│ purok (TEXT)        - Location within area  │
│ address (TEXT)      - Full address          │
│ status (TEXT)       - 'Active'|'Inactive'   │
│ created_at          - Timestamp             │
│ updated_at          - Timestamp             │
└─────────────────────────────────────────────┘
           │ 1:N relationship
           ▼
┌─────────────────────────────────────────────┐
│ public.document_requests                    │
├─────────────────────────────────────────────┤
│ id (UUID)           - Primary key           │
│ resident_id (UUID)  - FK: residents         │
│ document_type (TEXT)- Reference to template │
│ status (TEXT)       - 'Pending'|'Approved'  │
│ created_at          - Timestamp             │
│ updated_at          - Timestamp             │
└─────────────────────────────────────────────┘
```

---

## Phase Roadmap

### PHASE 1: ✅ COMPLETE
**Duration:** ✅ Done  
**Focus:** Authentication & Dashboard

**Deliverables:**
- Login/Register system
- Role-based dashboards
- Profile management
- Database schema with RLS

**Files:**
- authService.js
- userService.js
- Login.jsx, ResidentDashboard.jsx, ResidentProfile.jsx
- supabase/setup-supabase.sql

---

### PHASE 2: ⏳ NEXT
**Duration:** 2-3 hours  
**Focus:** Resident CRUD & Document Management

**Deliverables:**
- Resident list (admin)
- Request document form
- File upload capability
- Real-time request tracking

**Services to Create:**
- residentManagementService.js
- Enhanced documentRequestService.js
- fileUploadService.js

**Components to Create:**
- ResidentsManagement.jsx (admin)
- ResidentDocuments.jsx (resident)
- DocumentRequestForm.jsx
- FileUploader.jsx

---

### PHASE 3: ⏳ PLANNED
**Duration:** 2-3 hours  
**Focus:** Admin Approval & Notifications

**Deliverables:**
- Admin approval interface
- Status update workflow
- Email/in-app notifications
- Audit logging
- Request history

**Services to Create:**
- notificationService.js
- approvalService.js
- auditService.js

---

### PHASE 4: ⏳ PLANNED - **USER EMPHASIZED THIS**
**Duration:** 3-4 hours  
**Focus:** AI Assistant & Analytics

**Deliverables:**
- **Smart AI** (not chatbot!)
  - Request assistance & guidance
  - Processing predictions
  - Requirement analysis
- Analytics dashboard
- Resident insights
- Automated recommendations

**Services to Create:**
- aiService.js (Gemini integration)
- analyticsService.js
- insightsService.js

**Example AI Features:**
```
"Based on your profile, you need these docs for:
 - Business permit: Clearance, tax cert, ID copy
 - Takes 3 days, costs 200 PHP
 - Hurry, many residents wait 5+ days"
```

---

### PHASE 5: ⏳ PLANNED
**Duration:** 2-3 hours  
**Focus:** Advanced Community Features

**Deliverables:**
- Job portal/livelihood matching
- Announcements system
- Complaints & feedback system
- Community engagement

---

## Performance Considerations

### Database Optimization
```sql
-- Indexes for faster queries
CREATE INDEX idx_residents_status ON residents(status);
CREATE INDEX idx_document_requests_resident_id ON document_requests(resident_id);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
```

### Caching Strategy
```javascript
// Cache user profile during session
const [userProfile, setUserProfile] = useState(null);
// Refresh on auth state change only

// Document templates - cache on first load
const [templates, setTemplates] = useState([]);
useEffect(() => {
  if (!templates.length) fetchTemplates();
}, []);
```

### Query Optimization
```javascript
// Use limit and offset for pagination
const result = await fetchDocumentRequests({
  limit: 20,
  offset: (page - 1) * 20
});

// Only select needed fields
SELECT id, full_name, status FROM residents
```

---

## Scalability Plan

### Current (Single Barangay)
```
├─ 1 Barangay
├─ ~1000 Residents max
├─ Single Supabase instance
└─ ~1GB storage
```

### Future (Multi-Barangay)
```
├─ Multiple barangays
├─ Tenant isolation via RLS
├─ Multi-region support
├─ Load balancing
└─ ~10GB+ storage
```

### Database Growth
```
Year 1:  ~1,000 residents × 5 requests = 5,000 records
Year 2:  ~2,000 residents × 8 requests = 16,000 records
Year 3:  ~5,000 residents × 10 requests = 50,000 records

Index optimization needed at 50k+ records
```

---

## Deployment Strategy

### Development
```
npm run dev
├─ Local Supabase (if using local setup)
└─ Vite dev server on localhost:5173
```

### Staging
```
Deploy to Vercel preview
├─ Auto-deploys on PR
├─ Test in production-like environment
└─ Test with staging Supabase
```

### Production
```
npm run build → Vercel production
├─ Auto-deploys on merge to main
├─ Production Supabase instance
├─ SSL/HTTPS enabled
└─ Database backups daily
```

---

## Monitoring & Logging

### Metrics to Track
```
- User registration rate
- Login success rate
- Document request volume
- Request approval time
- System uptime
- Error rates
- API response times
```

### Logging Strategy
```javascript
// Log important events
console.log('User registered:', userId, role);
console.error('Document request failed:', error);
// Use Supabase analytics dashboard
```

---

## Cost Estimate

### Monthly (Small Scale)
```
Supabase Free Tier: $0
├─ 50k rows
├─ 1GB storage
└─ Good for development

Supabase Paid: ~$25/month
├─ 500k rows
├─ 8GB storage
└─ For 500+ residents
```

### Scalability
```
1,000+ residents → Upgrade to $100+/month tier
```

---

## Success Metrics

### Technical
- ✅ 99.9% system uptime
- ✅ <1s average response time
- ✅ 0 security incidents

### Adoption
- ✅ 80%+ resident registration rate
- ✅ 60%+ document request volume digitized
- ✅ 90%+ approval time reduction

### User Satisfaction
- ✅ 4.5/5 average rating
- ✅ <2% error rate reported
- ✅ 80%+ would recommend

---

## Conclusion

KaagapA.I is designed as a **scalable, secure, AI-powered** barangay management system. The phased approach ensures:

1. **Solid Foundation** (PHASE 1) - Auth & core features
2. **Core Functionality** (PHASE 2) - Document management
3. **User Engagement** (PHASE 3) - Notifications & approval
4. **Intelligence** (PHASE 4) - Smart AI assistance
5. **Community** (PHASE 5) - Engagement features

**Key Differentiator:** AI that ACTUALLY helps residents with smart insights, not just chat.

---

*Document Version: 1.0*  
*Last Updated: May 12, 2026*  
*System: KaagapA.I v1.0*

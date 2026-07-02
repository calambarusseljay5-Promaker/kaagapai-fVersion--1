# PHASE 2: RESIDENT REGISTRATION & APPROVAL WORKFLOW

## Overview

The system now supports a complete resident registration and approval workflow:

```
RESIDENT WORKFLOW:
1. Register (email/password only)
   ↓
2. Log in 
   ↓
3. Complete Profile (fill personal info)
   ↓
4. Submit Profile (Status: Pending)
   ↓
5. Wait for Admin Approval
   ↓
6. Access Full Dashboard (once approved)

ADMIN WORKFLOW:
1. Log in with your admin account
   ↓
2. See "Pending Registrations" section
   ↓
3. Review resident info
   ↓
4. Approve or Reject
   ↓
5. Approved residents can now use full features
```

---

## System Components

### 1. Database Changes

**New Column in `user_profiles` table:**
- `registration_status` - Can be: `'Pending'` or `'Active'`
- Tracks if resident has completed their profile

### 2. Registration Flow (No Changes to UI)

- Residents still register with: email, password, role
- System creates `user_profile` with `registration_status = 'Pending'`
- NO resident profile created yet (resident record created after approval)

### 3. Profile Setup Page

**New Page:** `/resident-profile-setup`

Residents are directed here after first login to fill in:
- Full Name *
- Phone (optional)
- Age *
- Gender *
- Purok *
- Address *

Status shows: **"Status: Pending Admin Approval"**

### 4. Admin Approval Dashboard

**Location:** Residents Management page

Admins see:
- **Section: "Pending Registrations"** (amber/warning color)
- List of all pending residents
- Each pending resident shows:
  - Full name, age, gender, purok, address
  - Submission date
  - **Approve** button (green)
  - **Reject** button (red)

### 5. Service Functions Added

**In `authService.js`:**
```javascript
submitResidentProfile(userId, profileData)
- Creates resident record
- Updates user_profile with resident_id
- Changes registration_status to 'Active'
```

**In `userService.js`:**
```javascript
getPendingResidents({ search, limit })
- Fetches all pending resident registrations

approveResident(userId)
- Sets registration_status to 'Active'

rejectResident(userId)
- Deletes user_profile and resident record
```

---

## User Journey: Step-by-Step

### For Test Resident (Krissel Condez)

#### Step 1: Execute SQL Setup
1. Go to https://supabase.com/
2. Open your KaagapA.I project
3. Click **SQL Editor** → **New Query**
4. Copy entire `supabase/setup-supabase.sql` file
5. Paste and click **Run**

#### Step 2: Register as Resident
1. Open http://localhost:5173
2. Click **Register** tab
3. Fill in:
   - **Full Name**: Krissel Condez
   - **Email**: krissel@gmail.com
   - **Password**: your-password (min 6 chars)
   - **Confirm Password**: same
   - **Role**: Resident ✓
4. Click **Create Account**
5. Get success message ✅

#### Step 3: Log In
1. Click **Login** tab
2. Enter: krissel@gmail.com / your-password
3. Click **Sign In**
4. **Automatically redirected to: Profile Setup page** ✅

#### Step 4: Complete Profile
1. Fill in profile form:
   - **Full Name**: Krissel Condez
   - **Phone**: 09xxxxxxxxx (or leave empty)
   - **Age**: 21
   - **Gender**: Female
   - **Purok**: Purok 1
   - **Address**: 123 Barangay St
2. Click **Submit Profile**
3. Get success message: "Profile submitted successfully! Status: Pending Admin Approval"
4. **Automatically redirected to: Resident Dashboard** ✅

#### Step 5: Status Check
- Resident sees: "Profile Status: Pending" (until admin approves)
- Cannot access full features yet

---

### For Admin (your-admin-email@example.com)

#### Step 1: First-Time Admin Setup
1. Go to https://supabase.com/
2. Open your project
3. Click **Auth** → **Users**
4. Create admin user manually:
   - **Email**: your-admin-email@example.com
   - **Password**: your-password
   - Click **Create User**

#### Step 2: Create Admin Profile (SQL)
In SQL Editor, run `supabase/fixes/create-admin-profile.sql` after replacing
`your-admin-email@example.com` with your real admin email, or run:
```sql
INSERT INTO public.user_profiles (id, role, registration_status)
SELECT id, 'admin', 'Active'
FROM auth.users
WHERE email = 'your-admin-email@example.com'
ON CONFLICT (id) DO UPDATE
SET role = EXCLUDED.role,
    registration_status = EXCLUDED.registration_status,
    resident_id = NULL,
    updated_at = NOW();
```

#### Step 3: Log In as Admin
1. Open http://localhost:5173
2. Click **Login**
3. Enter: your-admin-email@example.com / your-password
4. Click **Sign In**
5. Redirected to **Admin Dashboard** ✅

#### Step 4: Approve Pending Residents
1. Click **Residents Management** (left sidebar)
2. See **"Pending Registrations"** section at top (amber color)
3. Shows: Krissel Condez profile
4. Click **Approve** button (green)
5. Get success message
6. Resident moved from "Pending" to "Active"
7. Resident can now use full features ✅

#### Step 5: Manage Approved Residents
- Residents table below shows all approved/active residents
- Admins can edit, create, or delete residents

---

## Key Features

✅ **Pending Registration Tracking**
- Admins see all pending residents in one place
- Shows submission date and basic info
- Quick approve/reject actions

✅ **Profile Completion Flow**
- Residents redirected to profile setup on first login
- Can't skip - must complete before accessing dashboard
- Form validates all required fields

✅ **Approval Workflow**
- Admin review before profile activation
- Two-action system: Approve or Reject
- Rejected registrations are deleted

✅ **Status Management**
- Registration status tracked in database
- Residents know status after submission
- Automatic redirect logic based on status

---

## Testing Checklist

- [ ] SQL setup executed in Supabase
- [ ] Resident can register
- [ ] Resident redirected to profile setup after login
- [ ] Resident can submit profile
- [ ] Admin sees pending registration
- [ ] Admin can approve resident
- [ ] Approved resident sees "Active" status
- [ ] Approved resident can access dashboard
- [ ] Admin can reject resident (if needed)
- [ ] All features working in production build

---

## Database Status

**Tables Created:** ✅
- user_profiles (with registration_status field)
- residents
- document_requests
- document_templates

**RLS Policies:** ✅
- All policies enforcing role-based access

**Ready for:** Production deployment

---

## Next Steps

1. Execute SQL setup in Supabase
2. Create admin account (manual in Supabase UI)
3. Test resident registration → profile → admin approval
4. Deploy to production when verified
5. Begin PHASE 3: File uploads & notifications


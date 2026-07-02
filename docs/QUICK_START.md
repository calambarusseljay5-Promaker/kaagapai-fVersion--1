# 🚀 PHASE 1 - QUICK START GUIDE

## ⚡ 5-Minute Setup

### Step 1: Update Supabase (2 minutes)

1. Open your Supabase project: https://app.supabase.com
2. Go to **SQL Editor**
3. Click **"New Query"**
4. Open file: `supabase/setup-supabase.sql` in your project
5. Copy **ALL** content
6. Paste into Supabase SQL editor
7. Click **"Execute"**

✅ **Done!** New tables created with RLS policies.

---

### Step 2: Start Development Server (1 minute)

```bash
# In terminal
npm run dev

# Should show:
# ➜  Local:   http://localhost:5173/
```

✅ **Ready!** App running locally

---

### Step 3: Test Admin Account (1 minute)

1. Go to: http://localhost:5173
2. Click **"Register"** tab
3. Select **"Admin"** radio button
4. Fill in:
   - Email: `admin@test.com`
   - Password: `Test@1234`
   - Full Name: `Admin User`
5. Click **"Create Account"**
6. Switch to **"Login"** tab
7. Use same email/password
8. Click **"Sign In"**

🎉 **You should see:** Admin Dashboard

---

### Step 4: Test Resident Account (1 minute)

1. Go to: http://localhost:5173
2. Click **"Register"** tab
3. Keep **"Resident"** selected
4. Fill in ALL fields:
   ```
   Email:     resident@test.com
   Password:  Test@1234
   Full Name: Juan Dela Cruz
   Phone:     09123456789
   Age:       30
   Gender:    Male
   Purok:     Purok 1
   Address:   123 Main Street
   ```
5. Click **"Create Account"**
6. Switch to **"Login"** tab
7. Use same email/password
8. Click **"Sign In"**

🎉 **You should see:** Resident Dashboard with:
   - Stats (0 requests)
   - Quick actions
   - "No document requests yet" message

---

## ✅ Verification Checklist

- [ ] Admin registers successfully
- [ ] Admin logs in → sees `/dashboard`
- [ ] Resident registers with full profile
- [ ] Resident logs in → sees `/resident-dashboard`
- [ ] Resident sees dashboard stats
- [ ] Can view profile page
- [ ] Can edit profile and save
- [ ] Logout button works
- [ ] Login page shows after logout
- [ ] Cannot access admin pages as resident

---

## 🧪 Features to Test

### Admin Features
```
✓ Go to /dashboard         → Admin dashboard
✓ Click logout            → Back to login
✓ Try /resident-dashboard → Redirected to /
✓ Try /residents          → Access granted
```

### Resident Features
```
✓ See dashboard stats     → Should show 0 requests
✓ Click "View Profile"    → Profile loads
✓ Edit profile
✓ Click "Save Changes"    → Updates saved
✓ Click logout            → Back to login
✓ Try /dashboard          → Redirected to /
```

---

## 🐛 Troubleshooting

### ❌ "Email already exists" when registering
**→** That account was already created. Use a different email.

### ❌ "Cannot fetch user profile" error
**→** Run `supabase/setup-supabase.sql` again in Supabase

### ❌ Redirect to login after login
**→** Check that `user_profiles` table has data for your user

### ❌ Profile shows "undefined"
**→** Hard refresh browser (Ctrl+Shift+R)

### ❌ Cannot edit profile
**→** Check browser console for errors (F12)

---

## 📱 What You'll See

### Admin Dashboard
```
┌─────────────────────────────────┐
│ Welcome, Admin User! (Top left) │
├─────────────────────────────────┤
│ [Profile] [Logout] (Top right)  │
├─────────────────────────────────┤
│ Sidebar with menu items         │
│ ├─ Dashboard                    │
│ ├─ Analytics                    │
│ ├─ Residents                    │
│ └─ Documents                    │
└─────────────────────────────────┘
```

### Resident Dashboard
```
┌──────────────────────────────────────┐
│ Welcome, Juan Dela Cruz!             │
│ Manage your documents and services   │
├──────────────────────────────────────┤
│ [Profile] [Logout]                   │
├──────────────────────────────────────┤
│ Statistics Cards:                    │
│ [0 Total] [0 Pending]               │
│ [0 Approved] [0 Released]           │
├──────────────────────────────────────┤
│ Quick Actions:                       │
│ [Request Document] [View Profile]   │
├──────────────────────────────────────┤
│ Your Document Requests               │
│ (No requests yet)                    │
└──────────────────────────────────────┘
```

### Resident Profile
```
┌──────────────────────────────────────┐
│ ← My Profile                         │
├──────────────────────────────────────┤
│ [Profile Circle] Juan Dela Cruz      │
│ Resident ID: xxxxx                   │
├──────────────────────────────────────┤
│ Edit Form:                           │
│ Full Name: Juan Dela Cruz            │
│ Email: resident@test.com (readonly)  │
│ Phone: 09123456789                   │
│ Age: 30                              │
│ Gender: Male                         │
│ Purok: Purok 1                       │
│ Address: 123 Main Street             │
├──────────────────────────────────────┤
│ [Cancel] [Save Changes]              │
├──────────────────────────────────────┤
│ Member Since: May 12, 2026           │
│ Status: Active                       │
└──────────────────────────────────────┘
```

---

## 🔑 Test Credentials

### Admin Test Account
```
Email:    admin@test.com
Password: Test@1234
Role:     Admin
Access:   /dashboard, /analytics, /residents, etc.
```

### Resident Test Account
```
Email:    resident@test.com
Password: Test@1234
Role:     Resident
Name:     Juan Dela Cruz
Access:   /resident-dashboard, /resident-profile
```

---

## 📝 Notes

### Important!
- Each registration creates a new user (no test data)
- Phone field is optional for residents
- Profile updates are saved immediately
- Logout clears all sessions
- Refresh page preserves login (session persists)

### Customize
- Change colors in components (Tailwind classes)
- Modify welcome text in ResidentDashboard.jsx
- Adjust form fields in profile pages
- Update table displays to your needs

---

## 🎯 What Works Now

✅ User Registration (Admin & Resident)  
✅ User Login (with role-based redirects)  
✅ Profile Viewing  
✅ Profile Editing  
✅ Role-Based Access Control  
✅ Dashboard Statistics (placeholders)  
✅ Logout  
✅ Session Management  
✅ Protected Routes  

---

## ⏭️ Next Phase (PHASE 2)

Once you confirm PHASE 1 works:

**We'll build:**
- Document request submission form
- File upload for documents
- Admin approval interface
- Real-time status tracking
- Document templates display

**Estimated time:** 2-3 hours

---

## 💡 Pro Tips

### Hot Reload
- Code changes auto-reload (Vite)
- Try editing text in components and see instant updates

### Debug Console
- Press `F12` to open DevTools
- Check Console tab for errors
- Use Network tab to see API calls

### Database Inspection
- Go to Supabase dashboard
- Click "Database" → "user_profiles"
- See your registered users
- Check user_profiles has your role set correctly

### Test Multiple Users
- Use different email addresses
- Register admin in first browser tab
- Register resident in incognito/private window
- Test both simultaneously

---

## ✨ You've Built

In PHASE 1, you now have:

1. **Production-Ready Auth** - Secure, role-based
2. **Professional UI** - Modern, responsive design
3. **Database Schema** - Proper relationships & security
4. **Admin Dashboard** - Restricted access
5. **Resident Dashboard** - Personal workspace
6. **Profile Management** - Full CRUD
7. **Error Handling** - User-friendly messages
8. **Session Management** - Automatic login persistence

---

## 📞 Questions?

### Common Questions

**Q: Can I change the colors?**  
A: Yes! Edit Tailwind classes in components (bg-blue-600 → bg-purple-600)

**Q: Can I add more fields to profile?**  
A: Yes! Add field to residents table, update form in ResidentProfile.jsx

**Q: How do I reset all users?**  
A: Delete records from Supabase dashboard, re-run `supabase/setup-supabase.sql`

**Q: Can I use email login only?**  
A: Yes, modify authService to use email-only flow

**Q: How do I add a forgot password?**  
A: Use `resetPassword()` function in authService, add ForgotPassword page

---

## 🎉 Success!

If you see:
- ✅ Admin registers & sees dashboard
- ✅ Resident registers & sees resident dashboard
- ✅ Can view and edit profile
- ✅ Logout works

**Then PHASE 1 is COMPLETE!**

---

**Status:** Ready to Test  
**Time to Test:** ~10 minutes  
**Difficulty:** Easy  

**Next:** PHASE 2 (Document Management)

---

*Quick Start Guide v1.0*  
*May 12, 2026*

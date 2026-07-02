# Online Registration and Profile Update Approval Workflows

## Purpose

The **Online Registration** and **Profile Updates** sidebar modules are security and
data-quality controls. They prevent unverified resident information from being written
directly into Resident Management.

## Online Registration

1. A resident submits personal, household, and contact information.
2. The resident attaches a valid ID or proof of residency in JPG, PNG, WebP, or PDF format.
3. The request is saved with `Pending Approval` status.
4. The admin receives a notification linked to **Online Registration**.
5. The admin opens the private proof using a temporary signed URL.
6. The admin approves or rejects the request.
7. Approval creates or links the resident record, activates the portal account, generates
   the username, and uses the household number as the resident password.
8. Rejection saves the reason and does not create or activate an account.

### Control

The proof bucket is private. Public users can upload a proof, but only an authenticated
admin can read it. Approval is disabled in the interface when no proof is attached.

## Profile Updates

1. A logged-in resident edits profile information.
2. The proposed changes are stored in `resident_profile_update_requests`, not in
   `residents`.
3. The request is saved with `Pending Approval` status.
4. The admin receives a notification linked to **Profile Updates**.
5. The admin compares the resident's current information with the requested changes.
6. Approval updates the same existing resident row and optional username.
7. Rejection saves the reason and leaves Resident Management unchanged.

### Control

The approval RPC updates by `resident_id` and never inserts a duplicate resident for a
profile edit. Only admin accounts can view, approve, or reject pending requests.

## Defense Summary

- **Problem addressed:** unverified registrations and unauthorized resident data changes.
- **Solution:** a two-stage resident submission and admin approval process.
- **Input:** resident details, requested changes, and registration proof.
- **Process:** pending queue, admin notification, review, approve or reject, audit entry.
- **Output:** verified account/record changes only after approval.
- **Security:** role checks, row-level security, private proof storage, signed preview links,
  rejection reasons, and audit logs.

## Required SQL

Run these files in the Supabase SQL Editor in order:

1. `supabase/Database/add-resident-account-activation.sql`
2. `supabase/Database/add-online-resident-registration.sql`
3. `supabase/Database/add-online-registration-proof-review.sql`
4. `supabase/Database/add-resident-profile-update-approval.sql`

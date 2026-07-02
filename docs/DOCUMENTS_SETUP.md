# Document Management Setup Guide

## Overview
This guide helps you set up the document management system with Supabase integration.

## Prerequisites
- Supabase account and project
- Environment variables configured (see `.env.example`)

## Setup Steps

### 1. Configure Supabase Credentials
Create a `.env` file in the root directory with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_GEMINI_API_KEY=your-gemini-api-key-here
```

### 2. Run Database Setup
Execute the SQL setup script in your Supabase SQL editor:

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Click "New Query"
4. Copy the contents of `supabase/setup-supabase.sql`
5. Execute the query

This will create the following tables:
- `residents` - Stores resident information
- `document_templates` - Document type templates
- `document_requests` - Document request tracking

To replace old sample document templates in an existing Supabase project, run:
`supabase/fixes/replace-document-templates-with-real.sql`

### 3. Enable RLS (Row Level Security)
The setup script includes RLS policies for basic public access. For production, customize these policies in the Supabase Dashboard under:
- Authentication > Policies

### 4. Verify Connection
The application will automatically:
- Connect to Supabase using the credentials in `.env`
- Load document requests from the `document_requests` table
- Display resident names from the joined `residents` table

## API Documentation

### Fetch Document Requests
```javascript
import { fetchDocumentRequests } from "@/services/documentRequestService";

const result = await fetchDocumentRequests({
  status: "Pending",        // Filter by status
  search: "Juan",           // Search resident or document type
  limit: 50                 // Limit results
});

// Returns: { data: [...], count: number }
```

### Create Document Request
```javascript
import { createDocumentRequest } from "@/services/documentRequestService";

const request = await createDocumentRequest({
  resident_id: "uuid",
  document_type: "Barangay Clearance"
});
```

### Update Document Request Status
```javascript
import { updateDocumentRequestStatus } from "@/services/documentRequestService";

const updated = await updateDocumentRequestStatus(requestId, "Approved");
```

### Delete Document Request
```javascript
import { deleteDocumentRequest } from "@/services/documentRequestService";

await deleteDocumentRequest(requestId);
```

### Fetch Document Templates
```javascript
import { fetchDocumentTemplates } from "@/services/documentRequestService";

const templates = await fetchDocumentTemplates();
```

## Troubleshooting

### Missing Environment Variables
- Error: "Missing Supabase environment variables"
- Solution: Ensure `.env` file exists with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

### Failed to Load Requests
- Check browser console for specific error messages
- Verify RLS policies are enabled in Supabase dashboard
- Ensure database tables exist by running `supabase/setup-supabase.sql`

### No Residents Displayed
- Verify `residents` table has data
- Check that resident IDs in `document_requests` match existing residents
- Review join syntax in `documentRequestService.js`

## Database Schema

### residents table
```sql
- id: UUID (Primary Key)
- full_name: TEXT
- age: INTEGER
- gender: TEXT
- purok: TEXT
- address: TEXT
- status: TEXT (Active/Inactive/Archived/Pending)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### document_requests table
```sql
- id: UUID (Primary Key)
- resident_id: UUID (Foreign Key → residents.id)
- document_type: TEXT
- status: TEXT (Pending/Approved/Released)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### document_templates table
```sql
- id: UUID (Primary Key)
- template_name: TEXT
- document_type: TEXT
- description: TEXT
- requirements: TEXT
- processing_time: TEXT
- fee: TEXT
- template_file_path: TEXT
- created_at: TIMESTAMP
```

## Features Implemented

✅ Fetch document requests with resident information  
✅ Filter by status (Pending, Approved, Released)  
✅ Search by resident name or document type  
✅ Create new document requests  
✅ Update request status  
✅ Delete requests  
✅ Row Level Security (RLS) policies  
✅ Real-time error handling  
✅ Proper data joining and filtering  

## Next Steps

- Add user authentication (modify RLS policies)
- Implement real-time updates using Supabase subscriptions
- Add file uploads for document supporting files
- Create document approval workflows
- Add email notifications for request status changes

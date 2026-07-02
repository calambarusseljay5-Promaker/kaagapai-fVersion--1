# TODO - Documents Request Management (Supabase wiring)

- [x] Inspect current Documents page and DocumentRequestsPanel component.
- [x] Create `src/services/documentRequestService.js` to fetch/update/create `document_requests` from Supabase.
- [x] Wire `src/pages/Documents.jsx` to render `DocumentRequestsPanel`.
- [x] Update `src/components/DocumentRequestsPanel.jsx` to load requests via Supabase (instead of dummy data).
- [x] Fix eslint issues (`React` unused imports).
- [ ] Ensure Supabase table exists: `public.document_requests` (with columns matching the service code).
- [ ] Verify Supabase row shape for the join: the join alias `residents` must be available in the select.
- [ ] Test the `/documents` page to confirm records display without schema-cache/table-not-found errors.


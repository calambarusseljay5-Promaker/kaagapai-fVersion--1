# KaagapAI System Design & Safety Rules

## 1. Safety Rules (CRITICAL)
- **NO Backend Changes**: Never modify backend logic, API routes, Supabase database tables, RLS policies, schemas, storage buckets, or authentication triggers.
- **NO Business Logic Alterations**: Keep all state handlers, calculations, data transformations, and features 100% operational.
- **NO Broken Functionality**: Always verify code syntax, component props, and imports before finishing a phase.

## 2. Global Design System Rules
- **Color Palette**:
  - Primary Dark Green: `#14532D` (`bg-[#14532D]`, `text-[#14532D]`, `hover:bg-[#0f3e21]`)
  - Accent Gold: `#C8A14A` / `#FFCC19`
  - Secondary White: `bg-white`, `border-slate-200`, `text-slate-700`
  - Danger Red: `bg-rose-600`
  - Warning Gold: `bg-[#C8A14A]`
- **Workspace Layout**:
  - Use single unified workspace containers (`.gov-workspace-panel`) instead of stacking multiple disconnected white cards.
  - Page layout: Compact Header (Title + Subtitle) -> Unified Workspace Panel (Toolbar -> Separator -> Main Data Area -> Pagination).
- **Glassmorphism Usage**:
  - Keep data tables, inputs, and primary content on crisp, opaque white backgrounds for high readability.
  - Apply strong glassmorphism backdrop blur (`bg-slate-950/60 backdrop-blur-md` or `bg-white/95 backdrop-blur-xl`) ONLY to modal dialogs, profile dropdowns, notification popups, AI Assistant, and confirmation dialogs.
- **Modal Dialog Standard**:
  - All Add, Edit, View, Delete, Generate, Profile, Settings, and Confirmation dialogs MUST use the single reusable modal component (`FloatingModal.jsx` or `ConfirmationModal.jsx`).
  - Modals must be centered, backdrop blurred, keyboard ESC accessible, with sticky headers and footers.
- **Navigation & Profile Dropdown**:
  - Settings is located exclusively inside the top-right Admin Profile dropdown (My Account, Account Security, System Settings, Sign Out).
  - Sidebar contains only the 10 main management modules.

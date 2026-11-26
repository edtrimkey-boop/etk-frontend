# Ed-Trim Key — Next.js Frontend (`etk-frontend`)

**Enterprise Institutional ERP, Academic Operations & Multi-Tenant Admission System** built with **Next.js 15 (App Router)**, **React 19**, **Supabase**, **jsPDF**, and **Vercel Backend Gateway** integration.

---

## Architecture Overview

```text
Next.js 15 Client (/app)
 ├── Sub-50ms Client-Side Vector PDF Engine (jsPDF + Pre-cached Assets)
 ├── Live WYSIWYG A4 Form Preview & Per-Institute Template Customizer
 ├── Auth & Role-Based Access Control (Super Admin / Admin / Teacher / Operator)
 └── Next.js Rewrite (/api/gateway) ──► Backend Serverless Gateway (backend.git)
                                           ├── Supabase PostgreSQL + Atomic RPCs
                                           └── 5TB Google Drive Archival (OAuth2)
```

---

## Core Modules & App Routes

| Route | Module | Primary Role(s) |
| :--- | :--- | :--- |
| `/dashboard` | Institute Overview & KPIs | All Authenticated Roles |
| `/admission` | **Multi-Tenant Admission Command Center** | Super Admin, Admin, Teacher |
| `/dashboard/students` | Active Students Registry | Admin, Teacher |
| `/dashboard/teachers` | Teachers Directory & Approval | Admin, Super Admin |
| `/attendance` | Daily Student Attendance | Admin, Teacher |
| `/fees` | Fee Collection & Student Ledger | Admin |
| `/dashboard/papers` | Question Paper Publishing | Admin, Teacher |
| `/dashboard/documents` | Academic Documents & Requests | Admin, Teacher |
| `/dashboard/broadcast` | In-App & Web Push Broadcasts (FCM) | Admin, Super Admin |
| `/dashboard/billing` | Institute Subscriptions & Receipts (Trim Key Flow) | Admin |
| `/dashboard/admin/*` | Global Billing, Institutes & Operators Console | Super Admin |
| `/operator/*` | Operator Workspace, Formatting Tools & Earnings | Operator |

---

## Key Features of the Admission System (`/admission`)

- **Multi-Tenant Isolated Templates (`institute_form_templates`):** Each institute configures its own PDF layout (`keystone`, `modern`, `classic`, `compact`), accent color, address banner pill, contact line, parent declaration, Director signature PNG, Admission No prefix/padding, and zero-migration custom fields (`custom_fields` JSONB).
- **Swappable Form Blocks:** Configure the right-column block (`calling_grid`, `fee_summary`, `office_checklist`, `office_remarks`, or `none`) and bottom strip (`month_grid_3x12`, `installment_strip`, `docs_strip`, or `none`).
- **Status-Gated Forever-Monotonic Numbering:** `Enquiry` / `Applied` / `Verified` records hold temporary `ENQ-xxxxx` refs and `roll_no = null`. Only upon reaching `Admitted` does PostgreSQL atomically allocate the next permanent Admission No and enrolled-class Roll No via `FOR UPDATE` row locks—never reusing deleted student numbers.
- **Instant Live A4 Preview & Sub-50ms PDF Engine:** Split-screen A4 live preview updates on keystrokes in both `Customize Form` and `New / Edit Admission`, while `jsPDF` renders 1-page vector PDFs locally in milliseconds and archives them silently into Google Drive (`/{Institute}/Admissions/{Session}/`).

See **[docs/ADMISSION_SYSTEM.md](docs/ADMISSION_SYSTEM.md)** for full technical documentation.

---

## Local Development & Build

### Prerequisites
- Node.js 18+
- `.env.local` with:
  ```env
  NEXT_PUBLIC_API_URL=/api/gateway
  NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
  ```

### Commands
```bash
npm install
npm run dev          # Start local Next.js dev server
npx tsc --noEmit     # TypeScript verification
npx next build       # Production build without version bump
```

> **Note:** `npm run build` executes `scripts/bump-version.js` as a `prebuild` hook, updating `package.json` and `lib/version.ts` from git history. Use `npx next build` for verification builds without mutating version files.

---

## Key Frontend Files for Admissions

```text
etk-frontend/
├── app/admission/
│   ├── layout.tsx                              # Dashboard shell + Navigation chrome
│   └── page.tsx                                # Pipeline, Master Roster, Seat Matrix, Fee Tracker
├── components/admission/
│   ├── AdmissionFormLivePreview.tsx            # Scaled 595x842 WYSIWYG Live A4 Sheet Preview
│   ├── AdmissionModals.tsx                     # Admission Entry/Edit (Split-Screen), Quick Enquiry, Slip, Promote & Capacities
│   └── AdmissionTemplateModal.tsx              # Per-Institute Form & Widget Customizer + Live A4 Preview
├── lib/
│   └── admissions.ts                           # Counter previews, Gateway/Supabase sync, Drive archival & jsPDF engine
└── docs/
    └── ADMISSION_SYSTEM.md                     # Detailed architecture & schema guide
```

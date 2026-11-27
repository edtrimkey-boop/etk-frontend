# Multi-Tenant Admission System Architecture

Ed-Trim Key's Admission System combines **Supabase PostgreSQL** (ACID state & monotonic sequences), a **client-side vector `jsPDF` engine** (millisecond 1-page A4 rendering + instant live A4 preview), and **Google Drive** (5 TB permanent institutional PDF archival).

---

## 1. End-to-End Flow

```text
Staff opens /admission
  ├─► Bootstraps from Backend Gateway (`getAdmissionBootstrap`)
  │     ├── public.institutes (identity & logo URL)
  │     ├── public.institute_form_templates (per-tenant layout, branding & fields)
  │     ├── public.students & public.admissions (pipeline + enrolled roster)
  │     └── public.institute_admission_counters & institute_class_roll_counters
  │
  ├─► Pre-caches Logo, Director Signature PNG & Student Photos in memory
  │     (Zero network waits during PDF generation)
  │
  ├─► Staff fills New/Edit Admission (Split-screen with Live A4 Preview)
  │     ├── Non-Admitted (Enquiry / Applied / Verified) -> ENQ-xxxxx, Roll = null
  │     └── Admitted -> Atomic Postgres RPC allocates Admission No & Class Roll No
  │
  └─► Instant Vector PDF (<50ms) + Automatic Background Drive Archival
        ├── Admission Form PDF (`generateDynamicAdmissionFormPdf`) ->
        │     /{4_Institutes Root}/{Institute Name}/Documents/Admission Forms/{AdmNo}_{Name}_Admission_Form.pdf
        └── Separate Payment Receipt PDF (`generateAdmissionPaymentReceiptPdf`) ->
              /{4_Institutes Root}/{Institute Name}/Documents/Payment Receipts/RCP_{AdmNo}_{Name}_Receipt.pdf
              and writes links + fees back to `public.admissions` & `public.institute_billing`.
```

---

## 2. Database Schema & Monotonic Counters (`Supabase`)

Migration script: `database/admission_module_migration.sql` (in backend repo).

### Tables
- **`public.institute_form_templates`**: One row per `(institute_id, module)` storing `layout_variant` (`keystone` | `modern` | `classic` | `compact`), `branding` (`jsonb`), `fields_config` (`jsonb`), and `class_capacities` (`jsonb`).
- **`public.admissions`**: Stores full multi-stage applications (`Enquiry`, `Applied`, `Verified`, `Admitted`, `Cancelled`), `student_id` link to `public.students(id)`, fee breakup, `custom_fields` (`jsonb`), and Drive PDF metadata (`form_pdf_url`, `drive_file_id`). Existing `public.institute_billing.admission_id` links directly to `public.admissions(id)`.
- **`public.institute_admission_counters`**: Tracks `last_adm_seq` and `last_enq_seq` per `institute_id`.
- **`public.institute_class_roll_counters`**: Tracks `last_roll_no` per `(institute_id, class_key)`.

### Status-Gated Forever-Monotonic Allocation
1. Numbers are never reused when a student is deleted or cancelled—counters only move forward (`GREATEST(cur_seq, existing_max) + 1`).
2. Enquiries (`status !== 'Admitted'`) only allocate temporary `ENQ-00001` refs via `allocate_next_enquiry_no(p_institute_id)` and leave `roll_no = NULL`.
3. Only when status saves as `Admitted` do `allocate_next_admission_no(p_institute_id, p_prefix, p_padding)` and `allocate_next_class_roll(p_institute_id, p_class_name)` execute under `SELECT ... FOR UPDATE` locks so concurrent operators never collide.

---

## 3. PDF Engine & Configurable 1-Page Bordered Layout

### Supported Layout Variants (`layoutVariant`)
- **`keystone`** *(Default)*: Single-page A4 colored-border frame matching traditional Indian school admission forms: header crest, bold school title, dark rounded address pill, contact line, `ADMISSION FORM` pill, `Admission No` & `Admission Date` row, numbered particulars + `TOTAL AMOUNT`, `{{PHOTO}}` box, configurable right & bottom blocks, parent declaration, and Director signature image.
- **`modern`**: Full-bleed dark slate header (`#0F172A`) with accent bar, 2-column table, documents strip, and summary fee table.
- **`classic`**: Full-page bordered academic certificate look.
- **`compact`**: High-density A4 grid fitting maximum custom fields on a single page.

### Swappable Template Widgets (`branding`)
- **Right Column Block (`rightWidget`, below `{{PHOTO}}`):**
  - `calling_grid`: 12-row `Calling Date | Expected Date` tracking table
  - `fee_summary`: Gross, Concession, Net Payable, Paid, Balance Due summary box
  - `office_checklist`: Verified document checkboxes
  - `office_remarks`: Ruled office remarks / stamp box
  - `none`: Hidden
- **Bottom Full-Width Strip (`bottomWidget`, above Declaration):**
  - `month_grid_3x12`: `JAN`–`DEC` × 3 rows fee/attendance grid
  - `installment_strip`: Quarter 1–4 receipt strip
  - `docs_strip`: Submitted documents summary strip
  - `none`: Hidden

---

## 4. Storage Separation (CORS Safety)
- **Student Passport Photos & Institute Logos/Signatures** remain in **Supabase Storage** (`photo` / `profile_pics` buckets) so browser `fetch` + `jsPDF.addImage()` run locally with proper CORS support in `<50ms`.
- **Finalized Admission Form PDFs** archive into the institutional **5 TB Google Drive** via OAuth2 (`DRIVE_ROOT_FOLDER_ID`) with permanent `webViewLink` references saved in Supabase `admissions.form_pdf_url`.

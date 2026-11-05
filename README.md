# Anubhav

> **"Every expert's experience, saved forever."**

An institutional memory and smart knowledge retrieval web application engineered for modern manufacturing plants. Anubhav captures shop-floor tricks, unusual machine behavior, and edge-case fixes from experienced senior operators. The plant organization administrator reviews, audits, and approves these submissions. Approved knowledge becomes instantly searchable by freshers and technicians through a zero-hallucination AI assistant powered by Google Gemini and Supabase.

---

## 🏭 Core Premise & Architecture

* **Role-Based Workspaces**:
  * **Employee Role** (White + Emerald Green Theme): Focuses on shop-floor productivity. Operators land on a personalized Home page with an auto-sliding approved entries carousel, query the Ask AI assistant with bilingual speech & voice replies (English & Tamil), document procedures in an advanced word processor with canvas photo editing and multi-file uploads, inspect Plant Machines, and browse the verified personnel directory.
  * **Industry Admin Role** (White + Ruby Red Theme): Provides governance over the plant's institutional memory. Administrators manage entries in a compact approval queue, execute bulk actions, create employees with custom or auto-generated passwords, issue password changes, manage machinery with multi-image photo galleries, manage the official Industry Profile, and consult the Admin Help Desk.
* **Grounded AI Assistant**:
  * Powered by Google's official `@google/genai` SDK with full-text search retrieval.
  * Adheres to strict factory grounding: factual queries are answered **ONLY** from approved plant records, citing the exact record title, author, and machine.
  * Handles general conversational greetings and assistant identity questions courteously.
  * Answers in the exact language spoken or typed by the user (supporting English and native Tamil script with high-fidelity speech synthesis).
  * Unmatched questions trigger an explicit `"No record found. This question has been logged for an expert."` notification and are logged for administrative audit.

---

## 🛠️ Tech Stack

* **Frontend & Framework**: Next.js 15 (App Router), TypeScript, Tailwind CSS
* **Design & Typography**: Dynamic CSS variable themes (Emerald Green for Employees, Ruby Red for Admins), Next/Font (`Outfit` + `Inter`), `lucide-react` icons
* **Rich Text Processing**: TipTap Editor (H1-H3, lists, blockquotes, code blocks, font size selector, multi-file attachments, inline canvas photo editor with crop/rotate/flip/annotation tools, floating draggable/resizable images)
* **HTML Sanitization**: `sanitize-html` with custom whitelist for styling and floating image coordinates
* **Database & Storage**: Supabase (PostgreSQL with Row Level Security + Storage Bucket `anubhav-media`) with signed upload URL creation for direct browser-to-storage uploads up to 10 MB
* **Security & Auth**: `bcryptjs` for password hashing, `jose` for signed `httpOnly` JWT session cookies, server-side role validation, and in-memory rate limiting
* **AI & Voice Engine**: Google Gemini via official `@google/genai` SDK (Model configurable via `GEMINI_MODEL`, audio understanding for speech-to-text, and Web Speech API / Gemini text-to-speech)

---

## 🚀 Getting Started Locally

### 1. Prerequisites
* **Node.js** v18+ (tested on Node v20 & v24)
* **npm** or **pnpm**
* A free [Supabase](https://supabase.com) project
* A [Google Gemini API Key](https://aistudio.google.com/)

### 2. Clone and Install Dependencies
```bash
git clone https://github.com/your-username/anubhav.git
cd anubhav
npm install
```

### 3. Setup Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here
SESSION_SECRET=a-very-long-random-secret-string-at-least-32-chars
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODEL=gemini-2.5-flash
```

---

## 🗄️ Setting Up Supabase & Database Schema

1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard) and create a new project.
2. Open the **SQL Editor** from the left navigation panel.
3. Open `supabase/schema.sql` from this repository, copy its entire contents, paste it into the SQL editor, and click **Run**.
4. **Important**: Open `supabase/migrations/002_changes.sql`, paste it into the Supabase SQL editor, and click **Run**.
   * This migration idempotently adds `thumbnail_url` and `attachments` to `entries`, `is_senior` and `status` to `employees`, `status`, `department`, and `gallery` to `machines`, and industry profile metadata to `organizations`.
   * Row Level Security (RLS) remains enabled on all tables with **no public policies** (ensures client-side anon keys cannot read or tamper with data).
   * Storage bucket `anubhav-media` is configured with public read access.

---

## 🌱 Seeding Demo Data

The repository includes a comprehensive, idempotent seed script (`scripts/seed.ts`).

Run the seed command:
```bash
npm run seed
```

This seeds:
1. **Organization**: `Aurobindo Manufacturing` (Password: `aurobindo47`)
2. **Lead Senior Employee**: `Mukesh Siva` (User ID: `2511377`, Password: `mukesh_siva`)
3. **5 Additional Realistic Employees**:
   * `Rajesh Sharma` (Master Machinist, 24 yrs exp - Verified Senior)
   * `Anand Kulkarni` (Boiler Specialist, 21 yrs exp - Verified Senior)
   * `Sunita Mehra` (Automation Engineer, 15 yrs exp - Verified Senior)
   * `Praveen Nair` (Junior Technician / Fresher, 1 yr exp)
   * `Vikram Joshi` (Maintenance Associate / Fresher, 2 yrs exp)
4. **6 Factory Machines**:
   * Lathe #3
   * Hydraulic Press #2
   * Conveyor Belt A
   * CNC Mill #1
   * Air Compressor #1
   * Industrial Boiler #1
5. **18 Realistic Shopfloor Entries**: 10 approved, 6 pending, 2 rejected, with 3 safety-critical entries.

---

## 💻 Running the Application

Start the local development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

* Use the **Employee** tab to sign in as **Mukesh** (`2511377` / `mukesh_siva`).
* Use the **Industry** tab to sign in as **Aurobindo Manufacturing** (`aurobindo47`).

---

## 📋 Comprehensive Phases Overview

### Phase 1: Login Page and Shared Shell
* Left panel of login page polished with subtle industrial gradients, animated background detail, refined typography, and title/quote preservation. Demo credentials box removed.
* Fixed/sticky sidebar navigation for both roles (compact icon bar expanding smoothly on hover, with main content scrolling independently).
* Page heading tagline pills removed application-wide.
* Top-bar profile dropdown updated to "EMPLOYEE" and "INDUSTRY" roles.

### Phase 2: Employee Home Page
* New landing page `/app/home` displaying factory name and industry name from organization records.
* Auto-sliding recent approved entries carousel (advances every 4 seconds, pauses on hover, supports drag/swipe gestures, dot pagination, and view entry modal linking).
* Quick-action workspace tiles for Grounded AI, Entries, and Machines.

### Phase 3: Ask AI & Bilingual Voice Integration
* Removed starter chip questions and policy disclaimers while preserving zero-hallucination backend grounding.
* Graceful error handling for Gemini API downtime with separate `"No record found"` messaging for knowledge misses.
* Conversational greetings & identity questions answered politely as Anubhav assistant.
* Audio recording via `MediaRecorder` sent to `/api/voice/transcribe` with Gemini audio understanding for accurate transcription and language detection (English vs. Tamil).
* Bilingual question-answering with matched language output (Tamil answers generated in Tamil script).
* Speaker audio playback via `/api/voice/speak` and browser speech synthesis (`ta-IN` and `en-IN`).

### Phase 4: Entries & Advanced Word Processor
* Database support for `entries.thumbnail_url` and `entries.attachments` (JSONB).
* Renamed "Record Info" to "Entries" everywhere; `/app/entries` lists employee's own entries with left thumbnails, search, and status filtering.
* "Create new entry" button opens the rich editor modal.
* TipTap enhancements: removed HR and link buttons; added font size dropdown (12px to 32px).
* Bilingual voice dictation in editor (`en-IN` / `ta-IN`) with live recording state.
* Multi-file attachment manager supporting up to 10 MB files via direct signed upload URLs.
* Canvas-based Photo Editor: crop, 90° rotation, horizontal/vertical flip, brightness/contrast adjustments, draw/text annotations, and direct upload to storage.
* Context menu on images with edit, replace, inline/free floating toggle, and drag/resize controls.

### Phase 5: Employees & Machines Directory
* Simplified employee cards to large centered profile image, name, designation, department, and Verified badge for seniors (`is_senior` or 10+ years experience).
* Sort (A-Z, Z-A, Department, Designation) and filter (Department, Designation, Senior only) with search.
* Employee profile page with phone/email contact links and approved entries list.
* Renamed "Library" to "Machines" application-wide; cards display image, category, and status badge (`active`, `inactive`, `under_maintenance`, `retired`).
* Multi-attribute sorting and filtering for machines matching employee departments.

### Phase 6: Employee Profile
* Removed password change UI from employee profile to prevent unauthorized changes on shared terminals.
* Clean solid/soft gradient cover banner replacing tiled background.
* Enlarged profile picture with employee name prominently adjacent.
* Recent approved entries list displayed below personnel details.
* Preserved inline pencil editing for employee personal contact info.

### Phase 7: Industry Admin Console
* Manage Employees: added sort/filter (A-Z, department, designation, senior, status), password creation field with min 8 chars and "Generate" button, "Change password" modal for existing employees, and "is senior / verified" toggle.
* Manage Entries: tightened pending entry card layout, eliminated large empty gaps, added thumbnail display, compact action buttons, and preserved bulk approve/reject actions.
* Manage Machines: added multi-image machine photo gallery support (`machines.gallery`).
* Admin Help Page (`/app/admin/help`): comprehensive guides for entry approvals, bulk operations, personnel management, machine galleries, industry profile, and unanswered questions handling with an FAQ accordion.
* Industry Profile (`/app/admin/profile`): view and edit logo, industry name, read-only organization code, phone, email, industry type, description, administrator name, and physical address.

### Phase 8: Polish & Security Audit
* Full TypeScript compilation verification with zero errors (`tsc --noEmit`).
* Strict session checks on every API route: unauthorized requests return 401/403.
* Direct Supabase signed upload URLs enforce whitelist: `pdf, docx, xlsx, pptx, txt, png, jpg, webp` up to 10 MB per file.
* Idempotent migration script (`002_changes.sql`) and seed script (`scripts/seed.ts`).

---

## 🔒 Security Best Practices Implemented

* **Service-Role Isolation**: Supabase database and storage are accessed strictly server-side through route handlers and `lib/db.ts`. The service role key is never bundled in client code.
* **RLS Protection**: All tables have Row Level Security enabled with no public access policies.
* **Signed JWT Cookies**: Authentication tokens are signed with `jose` using HS256, set with `httpOnly`, `sameSite: 'lax'`, and `secure` in production.
* **Input Sanitization**: Rich-text HTML is sanitized with `sanitize-html` before saving to Postgres and before rendering.
* **File Upload Defense**: Media uploads are restricted by whitelist (`pdf, docx, xlsx, pptx, txt, png, jpg, webp`) and capped at 10 MB.
* **Brute-Force Rate Limiting**: In-memory rate limiting guards authentication routes and voice/AI endpoints.

---

## 🌐 Deploying to Vercel

1. Import your repository in the [Vercel Dashboard](https://vercel.com/new).
2. Set the framework preset to **Next.js**.
3. Under **Environment Variables**, configure:
   * `NEXT_PUBLIC_SUPABASE_URL`
   * `SUPABASE_SERVICE_ROLE_KEY`
   * `SESSION_SECRET`
   * `GEMINI_API_KEY`
   * `GEMINI_MODEL` (e.g. `gemini-2.5-flash`)
4. In your Supabase SQL Editor, run `supabase/migrations/002_changes.sql`.
5. Click **Deploy**. Vercel will automatically build and publish your application.

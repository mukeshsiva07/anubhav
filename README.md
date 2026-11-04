# Anubhav

> **"Every expert's experience, saved forever."**

An institutional memory and smart knowledge retrieval web application engineered for modern manufacturing plants. Anubhav captures shop-floor tricks, unusual machine behavior, and edge-case fixes from experienced senior operators. The plant organization administrator reviews, audits, and approves these submissions. Approved knowledge becomes instantly searchable by freshers and technicians through a zero-hallucination AI assistant powered by Google Gemini and Supabase.

---

## 🏭 Core Premise & Architecture

* **Role-Based Workspaces**:
  * **Employee Role** (White + Green / Emerald Theme): Focuses on shop-floor productivity. Operators can query the Ask AI assistant, draft procedures using a TipTap rich-text editor with voice dictation, view plant equipment profiles, and track their recent entries and approval statuses.
  * **Industry Admin Role** (White + Red / Ruby Theme): Provides governance over the plant's institutional memory. Administrators can review and approve pending submissions, provide mandatory rejection feedback, manage the personnel directory, issue one-time temporary passwords, and update the master equipment register.
* **Grounded AI Assistant**:
  * Powered by Google's official `@google/genai` SDK and Supabase full-text search.
  * The assistant adheres to a strict prompt instruction: answers **ONLY** using verified plant records and cites the exact record IDs and authors.
  * Unmatched questions trigger an explicit `"No record found"` notification and are automatically logged into an `unanswered_questions` table for administrative review.
  * Critical safety notices and machine PPE notes are highlighted in prominent red-bordered warning boxes.

---

## 🛠️ Tech Stack

* **Frontend & Framework**: Next.js 15 (App Router), TypeScript, Tailwind CSS
* **Design & Typography**: Dynamic CSS variable themes (Green for Employees, Red for Admins), Next/Font (`Outfit` + `Inter`), `lucide-react` icons
* **Rich Text Processing**: TipTap Editor (H1-H3, lists, blockquotes, code blocks, alignment, highlights, links, images, voice dictation, and draft auto-saving)
* **HTML Sanitization**: `sanitize-html`
* **Database & Storage**: Supabase (PostgreSQL with Row Level Security + Storage Bucket `anubhav-media`)
* **Security & Auth**: `bcryptjs` for password hashing, `jose` for signed `httpOnly` JWT session cookies, server-side role validation, and in-memory rate limiting
* **AI Engine**: Google Gemini via official `@google/genai` SDK (Model configurable via `GEMINI_MODEL`)

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
3. Open `supabase/schema.sql` from this repository, copy its entire contents, and paste it into the Supabase SQL editor.
4. Click **Run**.
5. This script creates:
   * Tables: `organizations`, `employees`, `machines`, `entries`, and `unanswered_questions`.
   * GIN Full-Text Index on `entries.content_text` and `title`.
   * Row Level Security (RLS) enabled on all tables with **no public policies** (ensures client-side anon keys cannot read or tamper with data).
   * Storage bucket `anubhav-media` configured with public read access.

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
   * `Rajesh Sharma` (Master Machinist, 24 yrs exp)
   * `Anand Kulkarni` (Boiler Specialist, 21 yrs exp)
   * `Sunita Mehra` (Automation Engineer, 15 yrs exp)
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
* Quick-fill demo buttons are provided on the login card for convenience.

---

## 🔒 Security Best Practices Implemented

* **Service-Role Isolation**: Supabase database and storage are accessed strictly server-side through route handlers and `lib/db.ts`. The service role key is never bundled in client code.
* **RLS Protection**: All tables have Row Level Security enabled with no public access policies.
* **Signed JWT Cookies**: Authentication tokens are signed with `jose` using HS256, set with `httpOnly`, `sameSite: 'lax'`, and `secure` in production.
* **Input Sanitization**: Rich-text HTML is sanitized with `sanitize-html` before saving to Postgres and before rendering.
* **File Upload Defense**: Media uploads are restricted by MIME type (images only) and capped at 5 MB.
* **Brute-Force Rate Limiting**: In-memory rate limiting guards authentication routes (5 failed attempts per 10 minutes) and queries to the AI endpoint.
* **Anti-Enumeration Responses**: Password reset endpoints return generic status messages regardless of whether an account exists.

---

## 🌐 Deploying to Vercel & GitHub

### Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit: Anubhav full-stack web application"
git branch -M main
git remote add origin https://github.com/your-username/anubhav.git
git push -u origin main
```

### Deploy to Vercel
1. Import your repository in the [Vercel Dashboard](https://vercel.com/new).
2. Set the framework preset to **Next.js**.
3. Under **Environment Variables**, add:
   * `NEXT_PUBLIC_SUPABASE_URL`
   * `SUPABASE_SERVICE_ROLE_KEY`
   * `SESSION_SECRET`
   * `GEMINI_API_KEY`
   * `GEMINI_MODEL` (e.g. `gemini-2.5-flash`)
4. Click **Deploy**. Vercel will automatically build and publish your application.


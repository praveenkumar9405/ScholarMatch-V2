# 🚀 ScholarMatch — Complete SaaS Build Prompt (MVP → Scalable)

You are a **Senior Creative Technologist, Full Stack Engineer, and Product Designer (Apple-level)**.

Your task is to **design and build a complete SaaS web application** called:

# 🎯 ScholarMatch

A platform that helps students **instantly find scholarships that match their profile**.

---

# 🧠 CORE PRODUCT PRINCIPLE

* “Don’t make users search — match for them”
* Output results in **< 3 seconds**
* Follow **Apple-level simplicity + polish**

---

# ⚙️ TECH STACK (STRICT)

## Frontend

* React (Vite)
* Tailwind CSS
* Framer Motion

## Backend

* Supabase

  * Authentication
  * PostgreSQL Database
  * Storage (future)

## Architecture

* Component-based frontend
* API-driven data fetching
* Clean modular structure

---

# 📦 FOLDER STRUCTURE

/src
/components
/pages
/hooks
/utils
/services
/animations
/styles

---

# 📄 CORE PAGES

## 1. Landing Page

### Features:

* Hero section:

  * Headline: “Find Scholarships That Actually Match You”
  * Subtext
  * CTA: Get Started
* Feature highlights
* Smooth scroll animations

### UI:

* Apple-style minimal
* Large typography
* Clean spacing

---

## 2. Onboarding (CRITICAL PAGE)

### Fields:

* Name
* Caste
* Income
* State
* Course
* Gender (optional)

### Features:

* Multi-step form
* Progress indicator
* Validation
* Save to Supabase

### UX:

* “Never ask twice”
* Fast (<30 seconds)

---

## 3. Dashboard (CORE EXPERIENCE)

### Features:

* Fetch user profile
* Fetch scholarships
* Show matched results

### UI:

* Card layout
* Each card:

  * Name
  * Amount
  * Deadline
  * Match Score
  * Apply button

---

## 4. Scholarship Detail Page

### Features:

* Full details:

  * Eligibility
  * Documents
  * Deadline
  * Benefits
* Apply button (external link)

---

## 5. Profile Page

### Features:

* View user profile
* Edit/update
* Sync with backend

---

# 🧠 MATCHING ENGINE (CORE LOGIC)

Create:

function matchScholarships(user, scholarships)

### Input:

* caste
* income
* state
* course
* gender

### Logic:

1. Filter:

   * caste match (or “all”)
   * income <= limit
   * state match
   * course match

2. Score:

   * eligibility match
   * deadline proximity
   * scholarship amount

3. Rank:

   * highest score first

### Output:

* Top 5 scholarships

---

# 🗂 DATABASE DESIGN (SUPABASE)

## USERS TABLE

* id (uuid)
* name
* caste
* income
* state
* course
* gender
* created_at

---

## SCHOLARSHIPS TABLE

* id
* name
* caste_required
* income_limit
* state
* course
* amount
* deadline
* eligibility_text
* apply_link

---

## MATCHES TABLE (optional MVP+)

* user_id
* scholarship_id
* score

---

# 🔌 BACKEND LOGIC

* Use Supabase client
* Fetch user data
* Fetch scholarships
* Apply matching logic on frontend (MVP)
* Later move to edge functions

---

# 🎨 UI DESIGN SYSTEM (APPLE LEVEL)

## Colors

* Primary: #0071E3
* Background: #F5F5F7
* Text: #1D1D1F
* Success: #34C759

## Typography

* Font: Inter / SF Pro
* Large headings
* Clean readable body

## Design Rules

* Minimal UI
* High spacing
* Soft shadows
* Rounded corners (lg)

---

# 🎞 ANIMATION SYSTEM

## Library:

* Framer Motion

## Animations:

### Page Transitions

* Fade + slide up

### Cards

* Hover → lift + shadow

### Buttons

* Hover → scale (1.05)

### Onboarding

* Step transitions (slide)

### Scroll

* Fade-in sections

---

# 🧩 COMPONENT STRUCTURE

## Core Components

* Navbar
* Button
* InputField
* Card
* ScholarshipCard
* Loader

## Layout Components

* PageWrapper
* SectionContainer

---

# 🔐 AUTHENTICATION

Use Supabase Auth:

* Email login/signup
* Store user profile after signup

---

# 🚀 API / DATA FLOW

1. User signs up
2. Onboarding saves profile
3. Dashboard fetches:

   * user data
   * scholarships
4. Run match function
5. Display results

---

# 📱 RESPONSIVENESS

* Mobile-first design
* Tablet support
* Desktop optimized

---

# ⚡ PERFORMANCE RULES

* Lazy load pages
* Optimize images
* Use skeleton loaders

---

# 🚫 NOT INCLUDED (MVP)

* OCR document parsing
* Advanced AI chatbot (Sakhi v2)
* B2B dashboards
* Multi-language
* Heavy 3D animations

---

# 🔮 FUTURE READY (DO NOT BUILD NOW)

* AI assistant “Sakhi”
* Auto form filling
* Scholarship tracking system
* WhatsApp notifications

---

# 🧠 DEVELOPMENT STRATEGY

Build in order:

1. Setup project (Vite + Tailwind + Supabase)
2. Landing Page
3. Onboarding (store data)
4. Dashboard UI
5. Matching Logic
6. Profile Page
7. Polish animations

---

# 🔥 FINAL INSTRUCTION

* Write clean, modular code
* Keep UI minimal and premium
* Focus on usability over complexity
* Make it feel like a **real SaaS product**

---

# 🎯 SUCCESS METRIC

* User completes onboarding in <30s
* Gets 5 matched scholarships instantly
* Clicks “Apply”

---

# 🚀 BUILD NOW

Start with:
👉 Landing Page
Then:
👉 Onboarding with Supabase

Do NOT skip order.

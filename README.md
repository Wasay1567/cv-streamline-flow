# 🎓 DIL Digital CV Repository Portal

> *"Collaborate, Innovate, Transform: Academia - Industry Partnerships!"*

The **Digital CV Repository Portal** is a centralized, API-driven platform engineered for the **Directorate of Industrial Liaison (DIL)** at NED University of Engineering & Technology. 

This system digitizes and automates the legacy CV collection process. It facilitates the creation of comprehensive graduate directories, ensures data accuracy through an advisor-approval pipeline, and enables seamless sharing with industry partners for job placement opportunities.

---

## ✨ System Architecture & Workflow

The platform operates on a strict three-tier digital pipeline with Role-Based Access Control (RBAC):

1. **🧑‍🎓 Students:** Build and submit their digital CVs via a dynamic, multi-step form. The system utilizes a "single-submission override" model to maintain a clean database containing only the most up-to-date profile for each student. Includes personal details, academic history, FYP details, and a built-in Personality Competency Assessment.
2. **👨‍🏫 Class Advisors:** Act as the verification layer. Advisors have dedicated dashboards to review submitted CVs, request corrections, or approve them for the final placement pool.
3. **⚙️ DIL Admins:** Manage system-wide configurations (e.g., submission deadlines, active batches, global maintenance toggles), monitor analytics, and export finalized CVs to share with prospective employers.

---

## 🚀 Key Features

* **Advanced Multi-Step CV Builder:** A highly responsive React form with Zod validation, draft saving, auto-fill capabilities for development, and real-time missing-field tracking.
* **Competency Assessment Engine:** Built-in evaluation capturing both *Big Five Personality Dimensions* and *Industry-Oriented Professional Dimensions*.
* **Secure Cloud Storage:** Direct binary image uploads (`multipart/form-data`) to **AWS S3**, utilizing secure delivery pipelines to protect Personally Identifiable Information (PII).
* **Dynamic System Configurations:** Database-driven settings allowing Admins to control the platform without touching the codebase or triggering redeployments.
* **Smart API Wrapper:** Custom fetching logic that intelligently detects and handles both standard JSON payloads and multipart form data without manual header configuration.

---

## 🛠️ Tech Stack

**Frontend**
* React 18 (Vite)
* TypeScript
* Tailwind CSS & [shadcn/ui](https://ui.shadcn.com/)
* React Router v6
* Lucide React (Iconography)

**Backend & Infrastructure**
* Python / FastAPI
* PostgreSQL (with SQLAlchemy & Alembic)
* AWS EC2 (Hosting)
* AWS S3 (Binary Storage)
* Clerk (Authentication & Session Management)

---

## 💻 Getting Started (Local Development)

### Prerequisites
* Node.js (v18 or higher)
* npm or yarn

### 1. Clone the repository
```bash
git clone [https://github.com/your-username/dil-cv-portal.git](https://github.com/your-username/dil-cv-portal.git)
cd dil-cv-portal
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env.local` file in the root directory and add the following keys. *(Reach out to the backend team for the active dev server URL).*

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:8000/api

# Clerk Authentication Keys
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_key_here
```

### 4. Run the development server
```bash
npm run dev
```
The application will be available at `http://localhost:5173`.

---

## 📂 Project Structure

```text
src/
├── components/     # Reusable UI components (buttons, dialogs, form inputs)
├── contexts/       # React Contexts (AuthContext for Clerk integration)
├── hooks/          # Custom React hooks (useToast, etc.)
├── integrations/   # API wrappers and external service configurations
├── pages/          # Main route components (Home, StudentDashboard, CVForm)
├── types/          # TypeScript interfaces and Zod schemas
└── assets/         # Static assets and university branding
```

---

## 🤝 Contributors

Engineered for NED University of Engineering & Technology. 
* **Frontend Lead:** Saad Sohail 
* **Backend Lead:** Abdul Wasay and Asher Sajid
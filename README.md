# 🤖 AIGravity Hire — AI Hiring Automation Portal

AIGravity Hire is a premium, modern recruitment web application designed to streamline the hiring pipeline. It automates manual recruiter overhead by generating optimized job listings, parsing and assessing candidate resumes with AI, and coordinating candidate evaluations and interview schedules.

---

## 🔗 Key Links & Resources

*   🚀 **Live Website:** [Open AIGravity Hire](https://bhaveshupadhyay.github.io/ai_hiring_ui/frontend/index.html)
*   🎥 **Product Demo Video:** [Watch on Google Drive](https://drive.google.com/file/d/1nQfF-mZFVk-Qx85kKSLNr9w5GN-9jQTw/view?usp=sharing)
*   📄 **Product Requirements Document (PRD):** [View PRD on Google Drive](https://drive.google.com/file/d/1FtH7wIB-6zx4M54DEzIIufllh4kz-JWy/view?usp=sharing)

---

## 🌟 Key Features

### 1. 📊 Hiring Manager Dashboard
*   **Metrics Overview:** Instantly track active roles and total applicants at a glance.
*   **Job Postings Table:** Manage all published openings, monitoring real-time applicant counts and status indicators.
*   **Dynamic Empty States:** Intuitive guides that lead new users through the setup process.

### 2. 🪄 AI Job Description Generator
*   **Powered by Gemini:** Generate tailored job descriptions (summary, responsibilities, requirements, and nice-to-haves) by simply inputting a job title and brief optional context.
*   **Interactive Editing:** Preview and refine generated copy before publishing.
*   **Seamless Application Link Generation:** Copies a public URL link automatically to request resumes from candidates.

### 3. 📂 Candidate Upload Portal
*   **Drag & Drop Experience:** A public page where candidates can drag and drop or browse to submit their resume PDF.
*   **Automatic Validation:** Limits uploads strictly to PDF formats (<10MB) for robust parsing.

### 4. 🧠 AI Resume Matching & Reports
*   **AI Match Score:** Candidates are analyzed and assigned a compatibility percentage based on the job requirements.
*   **Structured Reports:** Access deep analyses showcasing candidate strengths, weaknesses/missing qualifications, and parsed details (education, experience, and skills).

### 5. 🗓️ Interview Scheduler
*   **Easy Scheduling:** Click to coordinate panel discussions, enter meeting links (e.g., Google Meet, Zoom), set target dates/times, and attach prep instructions.
*   **Pipeline Management:** Seamlessly move candidates from "Shortlisted" to "Interviewing" or "Rejected" states.

---

## 🛠️ Architecture & Tech Stack

AIGravity Hire is architected to be lightweight, performant, and schema-verified:

*   **Frontend UI:** Vanilla HTML5 & CSS3 with a clean, custom design system utilizing dark modes, cards, interactive transitions, and responsive grids.
*   **Logic Layer:** ES6 Javascript modules (`async/await` and fetch calls).
*   **API Schema Verification:** Communicates directly with a FastAPI Render backend (`https://ai-hiring-95i2.onrender.com`) verified by [openapi.json](file:///Users/bhaveshupadhyay/IdeaProjects/ai_hiring_ui/openapi.json).
*   **Bundler/Build Tools:** Webpack 5. Includes hot-reloading development server configurations and production-minified outputs.

---

## 📂 Project Structure

Here is the directory structure for AIGravity Hire:

*   [frontend/](file:///Users/bhaveshupadhyay/IdeaProjects/ai_hiring_ui/frontend/) — Holds all user-facing pages, stylesheets, assets, and JavaScript modules.
    *   [index.html](file:///Users/bhaveshupadhyay/IdeaProjects/ai_hiring_ui/frontend/index.html) — Hiring Manager Dashboard.
    *   [create-job.html](file:///Users/bhaveshupadhyay/IdeaProjects/ai_hiring_ui/frontend/create-job.html) — AI-driven job description creation interface.
    *   [applications.html](file:///Users/bhaveshupadhyay/IdeaProjects/ai_hiring_ui/frontend/applications.html) — Candidate matching pipeline review page.
    *   [candidate-upload.html](file:///Users/bhaveshupadhyay/IdeaProjects/ai_hiring_ui/frontend/candidate-upload.html) — Public portal where candidates apply.
    *   [edit-job.html](file:///Users/bhaveshupadhyay/IdeaProjects/ai_hiring_ui/frontend/edit-job.html) — Interface to edit active job postings.
    *   [js/](file:///Users/bhaveshupadhyay/IdeaProjects/ai_hiring_ui/frontend/js/) — JavaScript logic layer containing schema requests (`api.js`), core pages, and utility modules.
    *   [css/](file:///Users/bhaveshupadhyay/IdeaProjects/ai_hiring_ui/frontend/css/) — Styling modules for layouts, forms, and elements.
*   [webpack.config.dev.js](file:///Users/bhaveshupadhyay/IdeaProjects/ai_hiring_ui/webpack.config.dev.js) — Webpack development configuration.
*   [webpack.config.prod.js](file:///Users/bhaveshupadhyay/IdeaProjects/ai_hiring_ui/webpack.config.prod.js) — Production bundle configuration.
*   [package.json](file:///Users/bhaveshupadhyay/IdeaProjects/ai_hiring_ui/package.json) — Node project configurations and scripts.
*   [openapi.json](file:///Users/bhaveshupadhyay/IdeaProjects/ai_hiring_ui/openapi.json) — The schema definition file for all API integrations.

---

## 🚀 Local Development Setup

To run AIGravity Hire locally:

### 📋 Prerequisites
Ensure you have **Node.js** (v16+) and **npm** installed on your system.

### ⚙️ Step-by-Step Instructions

1.  **Clone/Open project folder**
    Navigate to the project root in your terminal.

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Start development server**
    Runs the dev environment with hot-reloading.
    ```bash
    npm run start
    ```
    This will open the application in your browser automatically (typically at `http://localhost:8080`).

4.  **Production build**
    Compresses assets, HTML, and JavaScript code into the `/dist` folder.
    ```bash
    npm run build
    ```

---

> [!NOTE]
> The backend server hosted on Render may spin down due to inactivity. When you launch the web application, a background ping wakes the server automatically. Initial responses might experience a brief delay (up to 50 seconds) while the instance fires up.

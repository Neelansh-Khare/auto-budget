# Deployment and Local Setup Guide

This guide provides instructions for setting up and running the AutoBudgeter application in a local development environment and for deploying it to production.

## 1. Local Development Setup

Follow these steps to run the application on your local machine for development and testing. This setup uses Docker to run a PostgreSQL database.

### Prerequisites
- Node.js (v18.19.0 or higher)
- npm (v10.2.3 or higher)
- Docker and Docker Compose
- Git

### Quick Start Steps

1.  **Install Dependencies:**
    Open your terminal, navigate to the project's root directory, and run:
    ```bash
    npm install
    ```

2.  **Start the Database:**
    Use Docker Compose to start the PostgreSQL database container in the background:
    ```bash
    docker-compose up -d db
    ```

3.  **Configure Environment Variables:**
    Copy the example environment file to a new `.env.local` file. This file will store your local configuration and secrets.
    ```bash
    cp .env.example .env.local
    ```
    Now, open `.env.local` in a text editor and fill in the required variables (like `ENCRYPTION_KEY`, `APP_PASSWORD`, and any API keys). You can find detailed instructions in the main `README.md`.

4.  **Initialize the Database:**
    Generate the Prisma client and push the database schema to create the necessary tables.
    ```bash
    npm run db:generate
    npm run db:push
    ```

5.  **Run the Development Server:**
    Start the Next.js development server:
    ```bash
    npm run dev
    ```

The application will be running at `http://localhost:3000`. You can log in using the `APP_PASSWORD` you set in your `.env.local` file.

## 2. Production Deployment

For production, it is recommended to deploy the application on a platform that supports Node.js hosting.

### Recommended Platform: Vercel

Vercel is the recommended platform for deploying Next.js applications, as it is built by the creators of Next.js and offers seamless integration and a great developer experience.

**Deployment Steps:**

1.  **Build the Application:**
    Ensure your application builds successfully without errors.
    ```bash
    npm run build
    ```

2.  **Connect to Vercel:**
    If you haven't already, install the Vercel CLI and link your project.
    ```bash
    npm i -g vercel
    vercel
    ```
    Follow the command-line prompts to connect your repository.

3.  **Set Environment Variables:**
    In your Vercel project dashboard, navigate to **Settings > Environment Variables**. Add all the variables required for production, as listed in your `.env.example` file.
    - Set `NODE_ENV` to `production`.
    - Use your production credentials for Plaid and Google.
    - Update `GOOGLE_REDIRECT_URI` to your Vercel deployment's domain.

4.  **Configure the Database:**
    Use a managed PostgreSQL provider like Vercel Postgres, Supabase, Neon, or Railway. Set the `DATABASE_URL` environment variable in Vercel to point to your production database.

5.  **Deploy to Production:**
    Run the following command to deploy your application to production:
    ```bash
    vercel --prod
    ```

6.  **Run Database Migrations:**
    After a successful deployment, run the database schema push against your production database.
    ```bash
    vercel env pull && npm run db:push
    ```

### Alternative Deployment Platforms

While Vercel is recommended, you can also deploy this application on other platforms:
- **Railway**
- **Render**
- **Self-Hosted** (using a VPS with Docker and PM2)

Detailed instructions for these platforms can be found in the `docs/FEATURES.md` document.

### Required Production Environment Variables

Ensure the following environment variables are set in your production environment:

- `DATABASE_URL`: The connection string for your production PostgreSQL database.
- `ENCRYPTION_KEY`: A secure, randomly generated 32-byte key.
- `APP_PASSWORD`: A strong password for application login.
- `NODE_ENV`: Must be set to `production`.
- `PLAID_CLIENT_ID` & `PLAID_SECRET`: Your production Plaid API keys.
- `PLAID_ENV`: Set to `production`.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`: Your Google OAuth credentials for the production domain.
- API keys for your chosen LLM provider (`OPENROUTER_API_KEY` or `GEMINI_API_KEY`) if LLM categorization is used.

Refer to the "Environment Variables Checklist" in `docs/FEATURES.md` for a complete list.

# Vercel Deployment Guide

This project is a standard Next.js application designed to be deployed on Vercel. It uses `localStorage` for data persistence and static JSON files for initial data, making it easy to host without external database configurations.

## Steps to Deploy

### 1. Connect to Vercel
- Go to [Vercel](https://vercel.com/) and sign in.
- Click **"Add New..."** -> **"Project"**.
- Import your repository from GitHub, GitLab, or Bitbucket.

### 2. Configure Project Settings
Vercel should automatically detect the Next.js framework. Ensure the following settings are applied:
- **Framework Preset**: Next.js
- **Root Directory**: `./`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### 3. Environment Variables
No environment variables are required for the basic version of this application. If you add any in the future, you can configure them in the Vercel Dashboard under **Project Settings > Environment Variables**.

### 4. Deploy
Click **"Deploy"**. Vercel will build and host your application.

## Local Development
To run the project locally before deploying:
```bash
npm install
npm run dev
```

## Note on Data Persistence
The current version of the app uses `localStorage` to save RA Bills and COP data. This means data is saved **locally in your browser** and will not be shared across different devices or users. For a production-ready shared system, consider integrating a backend database (like Supabase, Firebase, or a custom API).

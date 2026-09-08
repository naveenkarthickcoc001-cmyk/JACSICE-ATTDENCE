# Smart Attendance System - Guide & Documentation

Welcome to the Smart Attendance System! This system is designed to provide seamless attendance tracking and management for colleges and institutions.

## How It Works

The system is a frontend-heavy web application utilizing HTML, CSS, and vanilla JavaScript. It uses a mock data structure (`demo-data.js`) for demonstration purposes, but it also contains configurations for connecting to a real backend like **Supabase** (`supabase-config.js`) or **Firebase** (`firebase-config.js`).

### Roles and Permissions

The system supports three primary roles:
1. **Student**: Can view their own attendance, check their marks, and update their profile.
2. **Teacher**: Can take attendance for their assigned classes, view reports, manage marks, and approve student requests.
3. **Admin**: Has full access to the system. Can manage departments, approve teacher/admin registrations, view institution-wide reports, and configure settings.

### Key Features
- **Dashboard**: A unified view for all users, tailored to their role.
- **Attendance**: Teachers can take attendance (manual or via QR Code). Students can view their attendance records.
- **Marks**: A comprehensive marks management module allowing teachers to input marks by department, year, and section.
- **Approvals**: Admins can approve pending teacher and student registrations.
- **QR Code Scanning**: Built-in QR scanner for quick attendance taking.

## Deployment Guide

Because this application consists primarily of static files (HTML, CSS, JS), it is incredibly easy to deploy. You can host it on any static web hosting provider.

### Option 1: Vercel (Recommended)
1. Push this entire folder to a GitHub repository.
2. Log in to [Vercel](https://vercel.com/) and click **Add New Project**.
3. Import your GitHub repository.
4. Leave the Framework Preset as `Other` and the Build Command empty.
5. Click **Deploy**. Your site will be live in seconds.

### Option 2: Netlify
1. Log in to [Netlify](https://netlify.com/) and go to your dashboard.
2. Drag and drop the `smart attendance system` folder directly into the Netlify deployment area, OR connect your GitHub repository.
3. Netlify will automatically detect the `index.html` file and serve the application.

### Option 3: GitHub Pages
1. Push this folder to a GitHub repository.
2. Go to the repository **Settings** > **Pages**.
3. Under **Build and deployment**, select `Deploy from a branch`.
4. Choose the `main` branch and `/root` folder, then click **Save**.
5. Your site will be available at `https://<your-username>.github.io/<repo-name>`.

## Connecting to a Backend

To make the application fully dynamic:
1. Open `supabase-config.js` or `firebase-config.js`.
2. Add your project credentials (API Key, URL, etc.).
3. The system is designed to seamlessly switch between the local demo data and a real database once the credentials are provided. Ensure you have run the provided SQL schema (`supabase_full_database_schema.sql`) if you are using Supabase.

# commTechManager - Developer Guide

This guide provides instructions for effectively working with the commTechManager codebase after cloning the repo.

## Project Overview

CommTechManager is a full-stack web application with:
- Frontend: React with TypeScript
- Backend: Express.js with TypeScript
- Database: SQL with Prisma ORM
- Authentication: Google OAuth

## Getting Started

1. Clone the repository
2. Set up your environment

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env  # Create and configure your .env file
npx prisma migrate dev  # Set up your database
npm run dev  # Start development server
```

### Frontend Setup

```bash
cd frontend
npm install
npm start  # Start React development server
```

## Environment Configuration

Create a `.env` file in the backend directory with:

```dotenv
# Server settings
PORT=8080
NODE_ENV=development
SESSION_SECRET=your_session_secret

# Frontend URL
CLIENT_URL=http://localhost:3000

# Database connection
DATABASE_URL="your_database_connection_string"

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:8080/auth/google/callback

# Email (SMTP) settings
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_email_password
SMTP_FROM=your_email@example.com
SMTP_SECURE=false
```

## Project Structure

- `/backend` - Express server, API endpoints, authentication
- `/frontend` - React UI components and pages
- `/backend/prisma` - Database schema and migrations

## Development Workflow

1. Make backend changes in `/backend/src`
2. Edit frontend components in `/frontend/src/components`
3. Update database schema in `/backend/prisma/schema.prisma`

## Key Features

- User authentication with Google OAuth
- Item borrowing system
- Administrator dashboard
- Email notifications (due dates, etc.)

## Production Deployment

For production deployment on GCP e2 micro VM:
- Update environment variables for production
- Build the frontend: `cd frontend && npm run build`
- Use PM2 to manage the Node.js process
- Consider using Nginx as a reverse proxy

## Common Tasks

- Adding new API endpoints: Create routes in backend
- Adding new UI components: Create component files in frontend
- Database schema changes: Update Prisma schema and run migrations
 

import express from 'express';
import session from 'express-session';
import passport from 'passport';
import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { scheduleJobs } from './services/scheduler';

import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import borrowRoutes from './routes/borrow';

// Load environment variables
dotenv.config();

// Initialize Prisma
const prisma = new PrismaClient();

// Create Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session config
app.use(
    session({
        secret: process.env.SESSION_SECRET!,
        resave: false,
        saveUninitialized: false,
    })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());
// Passport config in auth/google.ts
import './auth/google';

// Route mounting
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/borrow', borrowRoutes);

// Start scheduled jobs (reminders)
scheduleJobs(prisma);

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../../frontend/build')));
    app.get('*', (_req, res) => {
        res.sendFile(path.join(__dirname, '../../frontend/build', 'index.html'));
    });
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

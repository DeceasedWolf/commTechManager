import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';

const router = Router();
const FRONTEND_URL = process.env.CLIENT_URL!;

// Initiate Google OAuth flow
router.get(
    '/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/me', (req, res) => {
    if (req.isAuthenticated()) {
        res.json(req.user);
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
});

// OAuth callback endpoint
router.get(
    '/google/callback',
    passport.authenticate('google', { failureRedirect: '/auth/failure' }),
    (req, res) => {
        const user: any = req.user;
        // redirect to frontend, not backend
        if (user?.isAdmin) {
            return res.redirect(`${FRONTEND_URL}/admin`);
        }
        return res.redirect(`${FRONTEND_URL}/borrow`);
    }
);

// Authentication failure
router.get('/failure', (_req: Request, res: Response) => {
    res.status(401).send('Authentication Failed');
});

// Logout route
router.get(
    '/logout',
    (req: Request, res: Response, next: NextFunction) => {
        req.logout(err => {
            if (err) {
                return next(err);
            }
            res.redirect('/');
        });
    }
);

export default router;
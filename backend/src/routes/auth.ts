import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';

const router = Router();

// Initiate Google OAuth flow
router.get(
    '/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

// OAuth callback endpoint
router.get(
    '/google/callback',
    passport.authenticate('google', { failureRedirect: '/auth/failure' }),
    (req: Request, res: Response) => {
        // Redirect based on admin flag
        const user: any = req.user;
        if (user?.isAdmin) {
            return res.redirect('/admin');
        }
        return res.redirect('/borrow');
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
import { RequestHandler } from 'express';

/** ensure user is authenticated */
export const ensureAuth: RequestHandler = (req, res, next) => {
    if (req.isAuthenticated?.()) {
        return next();
    }
    res.status(401).json({ error: 'User not authenticated' });
};

/** ensure user has admin rights */
export const ensureAdmin: RequestHandler = (req, res, next) => {
    const user = req.user as any;
    if (user?.isAdmin) {
        return next();
    }
    res.status(403).json({ error: 'User not authorized' });
};

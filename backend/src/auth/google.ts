import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { PrismaClient, User } from '@prisma/client';
import { getAdminList } from '../utils/adminList';

const prisma = new PrismaClient();

// Serialize user ID into the session
passport.serializeUser((user: any, done) => {
    done(null, user.id);
});

// Deserialize user by ID from the session
passport.deserializeUser(async (id: number, done) => {
    try {
        const user = await prisma.user.findUnique({ where: { id } });
        done(null, user);
    } catch (err) {
        done(err as Error, null);
    }
});

// Google OAuth strategy
passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            callbackURL: '/auth/google/callback',
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const email = profile.emails?.[0].value;
                if (!email || !email.endsWith('@crescentschool.org')) {
                    return done(null, false, { message: 'Invalid email domain' });
                }

                // Upsert the user in the database
                const user: User = await prisma.user.upsert({
                    where: { email },
                    update: { googleId: profile.id, name: profile.displayName },
                    create: { email, googleId: profile.id, name: profile.displayName },
                });

                // Dynamically load admin emails each login
                const adminEmails = getAdminList();
                const isAdmin = adminEmails.includes(email);

                // Attach isAdmin flag to user object
                const userWithFlag = { ...user, isAdmin };
                return done(null, userWithFlag);
            } catch (err) {
                return done(err as Error);
            }
        }
    )
);

export default passport;

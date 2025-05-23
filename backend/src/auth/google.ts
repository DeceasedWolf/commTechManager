import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { PrismaClient, User } from '@prisma/client';
import { getAdminList } from '../utils/adminList';

type UserWithAdmin = User & { isAdmin: boolean };

const prisma = new PrismaClient();

// Serialize user ID into the session
passport.serializeUser((user: any, done) => {
    done(null, user.id);
});

// Deserialize user by ID from the session and restore isAdmin flag
passport.deserializeUser(async (id: number, done) => {
    try {
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) {
            return done(new Error('User not found'), null);
        }
        const adminEmails = getAdminList();
        const isAdmin = adminEmails.includes(user.email);
        const userWithFlag: UserWithAdmin = { ...user, isAdmin };
        done(null, userWithFlag);
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
            callbackURL: process.env.GOOGLE_CALLBACK_URL!,
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

                // Load admin list dynamically
                const adminEmails = getAdminList();
                const isAdmin = adminEmails.includes(email);
                const userWithFlag: UserWithAdmin = { ...user, isAdmin };

                return done(null, userWithFlag);
            } catch (err) {
                return done(err as Error);
            }
        }
    )
);

export default passport;

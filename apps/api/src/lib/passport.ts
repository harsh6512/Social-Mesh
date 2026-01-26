import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { prisma } from '../db/index.js'
import { ENV } from '../constants/env.js';
import { sanitizeUser } from '../utils/sanitizeUser.js';

function generateUniqueUsername(email: string): string {
    const emailPrefix = email.split('@')[0]; 

    if (!emailPrefix) {
        throw new Error("Invalid email format");
    }

    const base = emailPrefix
        .replace(/[^a-zA-Z0-9]/g, '')
        .toLowerCase()
        .slice(0, 12);

    const timestamp = Date.now().toString().slice(-4);
    const random = Math.floor(10 + Math.random() * 90);

    return `${base}_${timestamp}${random}`;
}

passport.use(new GoogleStrategy({
    clientID: ENV.GOOGLE_CLIENT_ID,
    clientSecret: ENV.GOOGLE_CLIENT_SECRET,
    callbackURL: ENV.GOOGLE_CALLBACK_URL,
    passReqToCallback: true,
}, async (_req, _accessToken, _refreshToken, profile, done) => {
    try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
            return done(new Error("Google account email not found"), undefined);
        }

        let user = await prisma.user.findUnique({
            where: { email: email },
            select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                profile: {
                    select: {
                        id: true
                    }
                }
            }
        });

        if (!user) {
            const username = generateUniqueUsername(email);

            user = await prisma.user.create({
                data: {
                    fullName: profile.displayName,
                    email: email,
                    username: username,
                    google_id: profile.id,
                    provider: "Google",
                    password: null,
                },
                select: {
                    id: true,
                    username: true,
                    email: true,
                    fullName: true,
                    profile: true
                }
            });
        }

        const safeUser = sanitizeUser(user);
        return done(null, safeUser);

    } catch (err) {
        console.error('OAuth error:', err);
        return done(err as Error, undefined);
    }
}));
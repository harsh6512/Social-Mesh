import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { prisma } from '../db/index.js'
import { ENV } from '../constants/env.js';
import { sanitizeUser } from '../utils/sanitizeUser.js';
import { ApiError } from '../utils/ApiError.js';

passport.use(new GoogleStrategy({
    clientID: ENV.GOOGLE_CLIENT_ID,
    clientSecret: ENV.GOOGLE_CLIENT_SECRET,
    callbackURL: ENV.GOOGLE_CALLBACK_URL,
    passReqToCallback: true,
}, async (req, _accessToken, _refreshToken, profile, done) => {
    const context = req.query.state as 'signin' | 'signup';
    try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
            return done(new ApiError(400, "Google account email not found"), undefined);
        }

        let user = await prisma.user.findUnique({
            where: { email: email }
        });

        if (context === 'signup') {
            if (user) {
                return done(new ApiError(409, "User already exists"), undefined);
            }

            user = await prisma.user.create({
                data: {
                    fullName: profile.displayName,
                    email: email,
                    username: profile.id,
                    provider: "Google",
                },
            });
        }

        if (context === 'signin') {
            if (!user) {
                return done(new ApiError(404, "User doesn't exist. Please signup"), undefined);
            }
        }

        const safeUser = sanitizeUser(user);
        return done(null, safeUser);

    } catch (err) {
        return done(err as Error, undefined); 
    }
}));

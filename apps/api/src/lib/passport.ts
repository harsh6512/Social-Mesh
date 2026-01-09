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
}, async (_req, _accessToken, _refreshToken, profile, done) => {
   try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
            return done(new ApiError(400, "Google account email not found"), undefined);
        }

        let user = await prisma.user.findUnique({
            where: { email: email }
        });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    fullName: profile.displayName,
                    email: email,
                    username: profile.id,
                    provider: "Google",
                },
            });
        }

        const safeUser = sanitizeUser(user);
        return done(null, safeUser);

    } catch (err) {
        return done(err as Error, undefined); 
    }
}));

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { env } from './env.js';
import User from '../models/User.js';
import ClientProfile from '../models/ClientProfile.js';

export const isGoogleOAuthConfigured = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

if (isGoogleOAuthConfigured) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          let user = await User.findOne({ googleId: profile.id });

          if (!user) {
            const email = profile.emails?.[0]?.value;
            user = email ? await User.findOne({ email }) : null;

            if (user) {
              user.googleId = profile.id;
              await user.save();
            } else {
              // Google sign-in always creates a client account by default —
              // there's no UI moment during OAuth to pick a role. Freelancers
              // signing in with Google can switch role from account settings
              // (not yet built — noted in IMPLEMENTATION_REPORT.md).
              user = await User.create({
                name: profile.displayName || 'New user',
                email,
                googleId: profile.id,
                role: 'client',
                isEmailVerified: true,
                avatarUrl: profile.photos?.[0]?.value || '',
              });
              await ClientProfile.create({ user: user._id });
            }
          }

          done(null, user);
        } catch (err) {
          done(err);
        }
      }
    )
  );
} else {
  console.warn('[auth] GOOGLE_CLIENT_ID/SECRET not set — /api/auth/google will return 501 until configured.');
}

export default passport;

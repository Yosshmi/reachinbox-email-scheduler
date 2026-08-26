import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

import { prisma } from "../db/prisma.js";
import { env } from "./env.js";

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, avatar: true },
    });
    done(null, user ?? false);
  } catch (error) {
    done(error);
  }
});

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error("Google profile did not provide an email address"));

          const user = await prisma.user.upsert({
            where: { googleId: profile.id },
            update: {
              name: profile.displayName,
              email,
              avatar: profile.photos?.[0]?.value ?? null,
            },
            create: {
              googleId: profile.id,
              name: profile.displayName,
              email,
              avatar: profile.photos?.[0]?.value ?? null,
            },
            select: { id: true, email: true, name: true, avatar: true },
          });
          done(null, user);
        } catch (error) {
          done(error);
        }
      },
    ),
  );
}

export { passport };

import { SessionOptions, getIronSession } from "iron-session";
import { cookies } from "next/headers";

export type SessionData = {
  authenticated?: boolean;
  userId?: string;
  userEmail?: string;
};

const password = process.env.ENCRYPTION_KEY;

if (!password || password.length < 32) {
  throw new Error("ENCRYPTION_KEY environment variable is not set or is too short. It must be at least 32 characters long for iron-session.");
}

export const sessionOptions: SessionOptions = {
  password,
  cookieName: "autobudgeter_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}


import { SessionOptions, getIronSession } from "iron-session";
import { cookies } from "next/headers";

export type SessionData = {
  authenticated?: boolean;
};

const password = process.env.ENCRYPTION_KEY || "dev-secret-please-change";

export const sessionOptions: SessionOptions = {
  password,
  cookieName: "autobudgeter_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
  },
};

export async function getSession() {
  const cookieStore = cookies();
  // @ts-expect-error iron-session supports next cookies adapter via getIronSession overload
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}


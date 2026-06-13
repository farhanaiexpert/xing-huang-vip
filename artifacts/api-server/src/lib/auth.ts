import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = "15m";
const REFRESH_EXPIRES_IN = "7d";
const REFRESH_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000;

export interface TokenPayload {
  userId: number;
  role: string;
}

export interface TotpChallengePayload {
  userId: number;
  role: string;
  purpose: "totp_challenge";
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

export function refreshTokenExpiresAt(): Date {
  return new Date(Date.now() + REFRESH_EXPIRES_MS);
}

export function signTotpChallengeToken(payload: Omit<TotpChallengePayload, "purpose">): string {
  return jwt.sign({ ...payload, purpose: "totp_challenge" }, JWT_SECRET, { expiresIn: "2m" });
}

export function verifyTotpChallengeToken(token: string): TotpChallengePayload {
  const decoded = jwt.verify(token, JWT_SECRET) as TotpChallengePayload;
  if (decoded.purpose !== "totp_challenge") throw new Error("Invalid token purpose");
  return decoded;
}

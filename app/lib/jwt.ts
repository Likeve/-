import { SignJWT, jwtVerify } from "jose";

const secretKey = process.env.JWT_SECRET || "default_super_secret_key_for_dev_only";
const key = new TextEncoder().encode(secretKey);

export async function signToken(payload: any, durationDays: number) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    // Convert durationDays to expiration string
    .setExpirationTime(`${durationDays}d`)
    .sign(key);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, key);
    return payload;
  } catch (error) {
    // Return null if token is invalid or expired
    return null;
  }
}

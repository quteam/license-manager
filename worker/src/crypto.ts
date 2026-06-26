const encoder = new TextEncoder();
const hmacKeyCache = new Map<string, CryptoKey>();
const PASSWORD_PBKDF2_ITERATIONS = 100000;

function bytesToBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of data) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function generateRandomToken(byteLength = 24): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

export function generateActivationCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]);
  return `LM-${chars.slice(0, 5).join("")}-${chars.slice(5, 10).join("")}-${chars.slice(10, 15).join("")}-${chars.slice(15, 20).join("")}`;
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function codeSuffix(code: string): string {
  return normalizeCode(code).replaceAll("-", "").slice(-6);
}

export async function hmacSha256(secret: string, value: string): Promise<string> {
  const key = await getHmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return bytesToBase64Url(signature);
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  const cached = hmacKeyCache.get(secret);
  if (cached) {
    return cached;
  }
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  hmacKeyCache.set(secret, key);
  return key;
}

export async function hashPassword(password: string, salt = generateRandomToken(16)): Promise<{ hash: string; salt: string }> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations: PASSWORD_PBKDF2_ITERATIONS,
      hash: "SHA-256"
    },
    key,
    256
  );
  return {
    hash: bytesToBase64Url(bits),
    salt
  };
}

export async function verifyPassword(password: string, salt: string, expectedHash: string): Promise<boolean> {
  const { hash } = await hashPassword(password, salt);
  return timingSafeEqual(hash, expectedHash);
}

export function timingSafeEqual(left: string, right: string): boolean {
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let diff = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < length; index += 1) {
    diff |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return diff === 0;
}

type JwtPayload = {
  sub: string;
  username: string;
  exp: number;
  iat: number;
};

export async function signJwt(secret: string, payload: Omit<JwtPayload, "iat" | "exp">, ttlSeconds: number): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + ttlSeconds
  };
  const header = bytesToBase64Url(encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = bytesToBase64Url(encoder.encode(JSON.stringify(fullPayload)));
  const signature = await hmacSha256(secret, `${header}.${body}`);
  return `${header}.${body}.${signature}`;
}

export async function verifyJwt(secret: string, token: string): Promise<JwtPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }
  const [header, body, signature] = parts;
  const expected = await hmacSha256(secret, `${header}.${body}`);
  if (!timingSafeEqual(signature, expected)) {
    return null;
  }
  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(body))) as JwtPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

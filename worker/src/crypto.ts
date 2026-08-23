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

const GCM_IV_LENGTH = 12;
const activationCodeKeyCache = new Map<string, CryptoKey>();

/**
 * 使用 AES-256-GCM 加密激活码明文。
 * secret 为 base64url 编码的 32 字节密钥（对应 env CODE_PLAINTEXT_ENCRYPTION_KEY）。
 * 返回格式：base64url(iv + ciphertext + tag)。
 */
export async function encryptPlaintext(plaintext: string, secret: string): Promise<string> {
  const key = await getActivationCodeKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(GCM_IV_LENGTH));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(plaintext));
  const combined = new Uint8Array(GCM_IV_LENGTH + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), GCM_IV_LENGTH);
  return bytesToBase64Url(combined);
}

export async function decryptPlaintext(payload: string, secret: string): Promise<string> {
  const key = await getActivationCodeKey(secret);
  const combined = base64UrlToBytes(payload);
  if (combined.length <= GCM_IV_LENGTH) {
    throw new Error("Invalid encrypted payload");
  }
  const iv = new Uint8Array(combined.slice(0, GCM_IV_LENGTH));
  const ciphertext = new Uint8Array(combined.slice(GCM_IV_LENGTH));
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(plaintext);
}

async function getActivationCodeKey(secret: string): Promise<CryptoKey> {
  const cached = activationCodeKeyCache.get(secret);
  if (cached) {
    return cached;
  }
  const raw = new Uint8Array(base64UrlToBytes(secret));
  if (raw.length !== 32) {
    throw new Error("CODE_PLAINTEXT_ENCRYPTION_KEY must be a base64url-encoded 32-byte key");
  }
  const key = await crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
  activationCodeKeyCache.set(secret, key);
  return key;
}

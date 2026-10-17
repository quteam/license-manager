var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/.pnpm/@edgeone+pages-blob@0.0.14/node_modules/@edgeone/pages-blob/dist/index.js
var require_dist = __commonJS({
  "node_modules/.pnpm/@edgeone+pages-blob@0.0.14/node_modules/@edgeone/pages-blob/dist/index.js"(exports, module) {
    "use strict";
    var N = Object.defineProperty;
    var le = Object.getOwnPropertyDescriptor;
    var ue = Object.getOwnPropertyNames;
    var ge = Object.prototype.hasOwnProperty;
    var fe = (t, e) => {
      for (var r in e) N(t, r, { get: e[r], enumerable: true });
    };
    var he = (t, e, r, n) => {
      if (e && typeof e == "object" || typeof e == "function") for (let s of ue(e)) !ge.call(t, s) && s !== r && N(t, s, { get: () => e[s], enumerable: !(n = le(e, s)) || n.enumerable });
      return t;
    };
    var me = (t) => he(N({}, "__esModule", { value: true }), t);
    var De = {};
    fe(De, { InvalidKeyError: () => w, InvalidStoreNameError: () => y, MissingProjectIdError: () => T, PagesBlobError: () => h, PreconditionFailedError: () => x, QuotaExceededError: () => M, RateLimitedError: () => D, Store: () => E, getStore: () => ve, listStores: () => Me });
    module.exports = me(De);
    var h = class extends Error {
      code;
      constructor(e, r) {
        super(`PagesBlob: ${r}`), this.name = "PagesBlobError", this.code = e;
      }
    };
    var w = class extends h {
      constructor(e) {
        super("INVALID_KEY", e);
      }
    };
    var y = class extends h {
      constructor(e) {
        super("INVALID_STORE_NAME", e);
      }
    };
    var b = class extends h {
      constructor(e) {
        super("MISSING_ENVIRONMENT", `Environment not configured for Pages Blob. Missing: ${e.join(", ")}. Supply these properties when creating a store, or ensure the function is running in a Pages environment.`);
      }
    };
    var M = class extends h {
      constructor() {
        super("QUOTA_EXCEEDED", "storage quota exceeded");
      }
    };
    var D = class extends h {
      constructor() {
        super("RATE_LIMITED", "request rate limited, please retry later");
      }
    };
    var T = class extends h {
      constructor() {
        super("MISSING_PROJECT_ID", "projectId is required when using API token mode. Please supply { name, projectId, token } to getStore() / listStores().");
      }
    };
    var m = class extends h {
      constructor(e) {
        super("CREDENTIAL_ERROR", e);
      }
    };
    var f = class extends h {
      constructor(e, r) {
        super("COS_ERROR", `COS returned ${e}: ${r}`);
      }
    };
    var x = class extends h {
      constructor() {
        super("PRECONDITION_FAILED", "conditional write failed (key already exists)");
      }
    };
    function C(t) {
      if (t === "") throw new w("Blob key must not be empty.");
      if (t.startsWith("/") || t.startsWith("%2F")) throw new w("Blob key must not start with forward slash (/).");
      if (new TextEncoder().encode(t).length > 600) throw new w("Blob key must be a sequence of Unicode characters whose UTF-8 encoding is at most 600 bytes long.");
    }
    function q(t) {
      if (t === "") throw new y("Store name must not be empty.");
      if (t.includes("/") || t.includes(":")) throw new y("Store name must not contain forward slashes (/) or colons (:).");
      if (!/^[a-zA-Z0-9_-]+$/.test(t)) throw new y("Store name must only contain letters, digits, underscores, and hyphens.");
      if (new TextEncoder().encode(t).length > 64) throw new y("Store name must be a sequence of Unicode characters whose UTF-8 encoding is at most 64 bytes long.");
    }
    var E = class {
      cosClient;
      storeName;
      defaultConsistency;
      constructor(e, r, n = "eventual") {
        this.cosClient = e, this.storeName = r, this.defaultConsistency = n;
      }
      resolveConsistency(e) {
        return e ?? this.defaultConsistency;
      }
      async set(e, r, n) {
        C(e);
        let s = await this.cosClient.putObject(this.storeName, e, r, { onlyIfNew: n?.onlyIfNew, cacheControl: n?.cacheControl });
        if (n?.onlyIfNew && s.statusCode === 412) throw new x();
      }
      async setJSON(e, r, n) {
        C(e);
        let s = JSON.stringify(r), i = await this.cosClient.putObject(this.storeName, e, s, { onlyIfNew: n?.onlyIfNew, contentType: "application/json", cacheControl: n?.cacheControl });
        if (n?.onlyIfNew && i.statusCode === 412) throw new x();
      }
      async createUploadUrl(e, r) {
        C(e);
        let { url: n, expiresAt: s } = await this.cosClient.createPresignedPutUrl(this.storeName, e, { expireSeconds: r?.expireSeconds, contentType: r?.contentType });
        return { url: n, key: e, expiresAt: s };
      }
      async get(e, r) {
        C(e);
        let n = this.resolveConsistency(r?.consistency), s = await this.cosClient.getObject(this.storeName, e, n);
        if (s === null) return null;
        let { body: i } = s, a = r?.type ?? "text", o = new TextDecoder("utf-8");
        switch (a) {
          case "text":
            return o.decode(i);
          case "json":
            return JSON.parse(o.decode(i));
          case "arrayBuffer":
            return i.buffer.slice(i.byteOffset, i.byteOffset + i.byteLength);
          case "blob":
            return new Blob([i]);
          case "stream":
            return new ReadableStream({ start(c) {
              c.enqueue(i), c.close();
            } });
          default:
            return o.decode(i);
        }
      }
      async getMetadata(e, r) {
        C(e);
        let n = this.resolveConsistency(r?.consistency);
        return this.cosClient.headObject(this.storeName, e, n);
      }
      async getWithHeaders(e, r) {
        C(e);
        let n = this.resolveConsistency(r?.consistency), s = await this.cosClient.getObject(this.storeName, e, n);
        return s ? { body: new TextDecoder("utf-8").decode(s.body), headers: s.headers || {} } : null;
      }
      async delete(e) {
        C(e), await this.cosClient.deleteObject(this.storeName, e);
      }
      async list(e) {
        let r = e?.paginate !== false, n = e?.limit, s = [], i = [], a = this.resolveConsistency(e?.consistency), o = e?.cursor || "", c = true, d;
        for (; c; ) {
          let u = n !== void 0 ? n - s.length : 1e3, l = Math.min(u, 1e3);
          if (l <= 0) break;
          let g = await this.cosClient.listObjects(this.storeName, { prefix: e?.prefix, delimiter: e?.directories ? "/" : void 0, marker: o || void 0, maxKeys: l, consistency: a });
          for (let p of g.contents) s.push({ key: p.key, etag: p.etag });
          i.push(...g.commonPrefixes), n !== void 0 && s.length >= n ? (s.length = n, (g.isTruncated || g.contents.length === l) && (d = g.nextMarker), c = false) : g.isTruncated ? !r && n === void 0 ? (d = g.nextMarker, c = false) : o = g.nextMarker : c = false;
        }
        return { blobs: s, directories: i, ...d ? { cursor: d } : {} };
      }
    };
    var ye = new TextEncoder();
    function U(t) {
      let e = ye.encode(t), r = new ArrayBuffer(e.byteLength), n = new Uint8Array(r);
      return n.set(e), n;
    }
    function F(t) {
      let e = t instanceof Uint8Array ? t : new Uint8Array(t), r = "";
      for (let n = 0; n < e.length; n++) r += e[n].toString(16).padStart(2, "0");
      return r;
    }
    async function z(t, e) {
      let r = await crypto.subtle.importKey("raw", U(t), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]), n = await crypto.subtle.sign("HMAC", r, U(e));
      return F(n);
    }
    async function pe(t) {
      let e = await crypto.subtle.digest("SHA-1", U(t));
      return F(e);
    }
    function O(t) {
      return encodeURIComponent(t).replace(/[!'()*]/g, (e) => "%" + e.charCodeAt(0).toString(16).toUpperCase());
    }
    function j(t) {
      try {
        return decodeURIComponent(t);
      } catch {
        return t;
      }
    }
    function G(t) {
      return t.split("/").map((e) => j(e)).join("/");
    }
    function W(t) {
      return t.split("/").map((e) => O(j(e))).join("/");
    }
    var we = /* @__PURE__ */ new Set(["cache-control", "content-disposition", "content-encoding", "content-length", "content-md5", "content-type", "expect", "expires", "if-match", "if-modified-since", "if-none-match", "if-unmodified-since", "origin", "range", "transfer-encoding"]);
    function Ce(t) {
      return t === "host" || t === "x-cos-security-token" ? false : !!(we.has(t) || t.startsWith("x-cos-"));
    }
    function H(t) {
      if (!t) return [];
      let e = [];
      for (let [r, n] of Object.entries(t)) n != null && e.push([r.toLowerCase(), String(n)]);
      return e.sort(([r], [n]) => r < n ? -1 : r > n ? 1 : 0), e;
    }
    function X(t) {
      return t.map(([e, r]) => `${O(e)}=${O(r)}`).join("&");
    }
    function Y(t) {
      return t.map(([e]) => O(e)).join(";");
    }
    async function V(t) {
      let e = t.method.toLowerCase(), r = t.pathname.startsWith("/") ? t.pathname : `/${t.pathname}`, n = Math.floor(Date.now() / 1e3), s = n + (t.expireSeconds ?? 3600), i = `${n};${s}`, o = H(t.headers).filter(([B]) => Ce(B)), c = Y(o), d = X(o), u = H(t.query), l = Y(u), g = X(u), p = `${e}
${r}
${g}
${d}
`, oe = `sha1
${i}
${await pe(p)}
`, ie = await z(t.secretKey, i), ae = await z(ie, oe), ce = ["q-sign-algorithm=sha1", `q-ak=${t.secretId}`, `q-sign-time=${i}`, `q-key-time=${i}`, `q-header-list=${c}`, `q-url-param-list=${l}`, `q-signature=${ae}`].join("&"), K = {};
      for (let [B, de] of o) K[B] = de;
      return { authorization: ce, signedHeaders: K };
    }
    async function J(t) {
      let e = new URL(t.domain), r = j(t.key), n = `/${G(r)}`, s = `/${W(r)}`;
      e.pathname = s;
      let { authorization: i } = await V({ method: t.method, pathname: n, query: t.query, headers: t.headers, secretId: t.credential.secretId, secretKey: t.credential.secretKey, expireSeconds: t.expireSeconds });
      if (t.query) for (let [a, o] of Object.entries(t.query)) o != null && e.searchParams.set(a, String(o));
      for (let a of i.split("&")) {
        let o = a.indexOf("=");
        if (o === -1) continue;
        let c = a.slice(0, o), d = a.slice(o + 1);
        e.searchParams.set(c, d);
      }
      return t.credential.sessionToken && e.searchParams.set("x-cos-security-token", t.credential.sessionToken), e.toString();
    }
    async function S(t) {
      let e = new URL(t.domain), r = t.key ? j(t.key) : "", n = r ? `/${G(r)}` : "/", s = r ? `/${W(r)}` : "/";
      if (e.pathname = s, t.query) for (let [l, g] of Object.entries(t.query)) g != null && e.searchParams.set(l, String(g));
      let { authorization: i } = await V({ method: t.method, pathname: n, query: t.query, headers: t.headers, secretId: t.credential.secretId, secretKey: t.credential.secretKey }), a = new Headers();
      if (t.headers) for (let [l, g] of Object.entries(t.headers)) g != null && a.set(l, String(g));
      a.set("Authorization", i), t.credential.sessionToken && a.set("x-cos-security-token", t.credential.sessionToken);
      let o = e.toString(), c = { method: t.method, headers: a, body: t.body ?? void 0, signal: t.signal }, d = 2, u;
      for (let l = 0; l <= d; l++) try {
        return await fetch(o, c);
      } catch (g) {
        if (u = g, g instanceof DOMException && g.name === "AbortError") throw g;
        l < d && await new Promise((p) => setTimeout(p, 1e3 * (l + 1)));
      }
      throw u;
    }
    var xe = "blob.edgeone.site";
    var be = "blob-nocache.edgeone.site";
    var A = class t {
      credentialManager;
      bucket = "";
      region = "";
      keyPrefix = "";
      cachedDomain = "";
      uncachedDomain = "";
      initialized = false;
      static buildErrorDetail(e, r, n, s, i) {
        let a = n ? `${r}/${n}` : r, o = i ? ` [request-id: ${i}]` : "";
        return `${e} ${a} - ${Te(s)}${o}`;
      }
      constructor(e) {
        this.credentialManager = e;
      }
      computeSubdomain(e) {
        let r = [];
        if (e.appId && r.push(e.appId), e.zoneId && r.push(e.zoneId), e.projectId && r.push(e.projectId), r.length >= 2) return r.join("-");
        if (e.resourcePrefix) {
          let s = e.resourcePrefix.replace(/\/?\*$/, "").split("/").filter(Boolean);
          if (s.length >= 2) return s.slice(0, Math.min(s.length, 3)).join("-");
        }
        return "";
      }
      async ensureInitialized() {
        if (this.initialized) return;
        let e = await this.credentialManager.getCredential();
        !this.keyPrefix && e.resourcePrefix && (this.keyPrefix = e.resourcePrefix.replace(/\/?\*$/, ""));
        let r = e.edgeRegion === "CN", n = e.cosMainland, s = e.cosOverseas, i = r ? n || s : s || n;
        !this.bucket && i && (this.bucket = i.bucket, this.region = i.region);
        let a = this.computeSubdomain(e);
        if (!a) throw new f(0, "unable to derive tenant subdomain from credential; missing appId/zoneId/projectId or resourcePrefix");
        this.cachedDomain = `https://${a}.${xe}`, this.uncachedDomain = `https://${a}.${be}`, this.initialized = true;
      }
      async resolveDomain(e) {
        return await this.ensureInitialized(), e === "strong" ? this.uncachedDomain : this.cachedDomain;
      }
      async resolveCredential() {
        let e = await this.credentialManager.getCredential();
        return { secretId: e.tmpSecretId, secretKey: e.tmpSecretKey, sessionToken: e.sessionToken };
      }
      buildCosKey(e, r) {
        return `${this.keyPrefix}/${e}/${r}`;
      }
      async getDomains() {
        return await this.ensureInitialized(), { cached: this.cachedDomain, uncached: this.uncachedDomain };
      }
      async putObject(e, r, n, s) {
        let i = await this.resolveDomain("strong"), a = await this.resolveCredential(), o = this.buildCosKey(e, r), d = s?.cacheControl === null ? void 0 : s?.cacheControl ?? "max-age=0, stale-while-revalidate=60", u = {};
        s?.onlyIfNew && (u["If-None-Match"] = "*"), d && (u["Cache-Control"] = d), s?.contentType && (u["Content-Type"] = s.contentType);
        try {
          let l = await S({ domain: i, method: "PUT", key: o, headers: u, body: n, credential: a });
          if (l.status === 412) return await l.arrayBuffer().catch(() => {
          }), { etag: "", statusCode: 412 };
          if (!l.ok) {
            let p = await P(l);
            throw new f(l.status, t.buildErrorDetail("PUT", i, o, p || `status ${l.status}`, I(l)));
          }
          let g = l.headers.get("etag") || "";
          return await l.arrayBuffer().catch(() => {
          }), { etag: g, statusCode: l.status };
        } catch (l) {
          throw l instanceof f ? l : new f(0, t.buildErrorDetail("PUT", i, o, k(l)));
        }
      }
      async createPresignedPutUrl(e, r, n) {
        let s = await this.resolveDomain("strong"), i = await this.resolveCredential(), a = this.buildCosKey(e, r), o = {};
        n?.contentType && (o["Content-Type"] = n.contentType);
        let c = n?.expireSeconds ?? 3600, d = await J({ domain: s, method: "PUT", key: a, headers: o, credential: i, expireSeconds: c }), u = Math.floor(Date.now() / 1e3) + c;
        return { url: d, expiresAt: u };
      }
      async getObject(e, r, n) {
        let s = await this.resolveDomain(n), i = await this.resolveCredential(), a = this.buildCosKey(e, r);
        try {
          let o = await S({ domain: s, method: "GET", key: a, credential: i });
          if (o.status === 404) return await o.arrayBuffer().catch(() => {
          }), null;
          if (!o.ok) {
            let u = await P(o);
            throw new f(o.status, t.buildErrorDetail("GET", s, a, u || `status ${o.status}`, I(o)));
          }
          let c = new Uint8Array(await o.arrayBuffer()), d = Z(o.headers);
          return { body: c, contentType: d["content-type"], headers: d };
        } catch (o) {
          throw o instanceof f ? o : new f(0, t.buildErrorDetail("GET", s, a, k(o)));
        }
      }
      async headObject(e, r, n) {
        let s = await this.resolveDomain(n), i = await this.resolveCredential(), a = this.buildCosKey(e, r);
        try {
          let o = await S({ domain: s, method: "HEAD", key: a, credential: i });
          if (o.status === 404) return null;
          if (!o.ok) {
            let d = await P(o);
            throw new f(o.status, t.buildErrorDetail("HEAD", s, a, d || `status ${o.status}`, I(o)));
          }
          let c = Z(o.headers);
          return { cacheControl: c["cache-control"], contentType: c["content-type"], etag: c.etag, headers: c };
        } catch (o) {
          throw o instanceof f ? o : new f(0, t.buildErrorDetail("HEAD", s, a, k(o)));
        }
      }
      async deleteObject(e, r) {
        let n = await this.resolveDomain("strong"), s = await this.resolveCredential(), i = this.buildCosKey(e, r);
        try {
          let a = await S({ domain: n, method: "DELETE", key: i, credential: s });
          if (a.status === 204 || a.status === 404 || a.ok) {
            await a.arrayBuffer().catch(() => {
            });
            return;
          }
          let o = await P(a);
          throw new f(a.status, t.buildErrorDetail("DELETE", n, i, o || `status ${a.status}`, I(a)));
        } catch (a) {
          throw a instanceof f ? a : new f(0, t.buildErrorDetail("DELETE", n, i, k(a)));
        }
      }
      async listObjects(e, r) {
        await this.ensureInitialized();
        let n = `${this.keyPrefix}/${e}/`, s = r?.prefix ? n + r.prefix : n, i = await this.getBucketRaw({ prefix: s, delimiter: r?.delimiter, marker: r?.marker, maxKeys: r?.maxKeys, consistency: r?.consistency }), a = i.contents.map((c) => {
          let d = c.key, u = d.startsWith(n) ? d.slice(n.length) : d;
          return u ? { key: u, etag: c.etag } : null;
        }).filter((c) => c !== null), o = i.commonPrefixes.map((c) => c.startsWith(n) ? c.slice(n.length) : c).filter((c) => !!c);
        return { contents: a, commonPrefixes: o, isTruncated: i.isTruncated, nextMarker: i.nextMarker };
      }
      async listStores(e) {
        let r = [], n = "", s = true;
        for (; s; ) {
          await this.ensureInitialized();
          let i = `${this.keyPrefix}/`, a = await this.getBucketRaw({ prefix: i, delimiter: "/", maxKeys: 1e3, marker: n || void 0, consistency: e });
          for (let o of a.commonPrefixes) {
            let c = o.startsWith(i) ? o.slice(i.length, -1) : o.slice(0, -1);
            c && r.push(c);
          }
          if (s = a.isTruncated, n = a.nextMarker, !s || !n) break;
        }
        return r;
      }
      async getBucketRaw(e) {
        let r = await this.resolveDomain(e.consistency), n = await this.resolveCredential(), s = { prefix: e.prefix };
        e.delimiter && (s.delimiter = e.delimiter), e.marker && (s.marker = e.marker), e.maxKeys && (s["max-keys"] = e.maxKeys);
        try {
          let i = await S({ domain: r, method: "GET", query: s, credential: n });
          if (!i.ok) {
            let o = await P(i);
            throw new f(i.status, t.buildErrorDetail("LIST", r, e.prefix, o || `status ${i.status}`, I(i)));
          }
          let a = await i.text();
          return Ee(a);
        } catch (i) {
          throw i instanceof f ? i : new f(0, t.buildErrorDetail("LIST", r, e.prefix, k(i)));
        }
      }
    };
    function Te(t) {
      return t.replace(/[a-zA-Z0-9\-]+\.cos\.[a-zA-Z0-9\-.]+\.myqcloud\.com/gi, "[cos-origin]").replace(/[a-zA-Z0-9\-]+\.cos\.[a-zA-Z0-9\-.]+\.tencentcos\.cn/gi, "[cos-origin]");
    }
    async function P(t) {
      try {
        return await t.text();
      } catch {
        return "";
      }
    }
    function I(t) {
      return t.headers.get("x-cos-request-id") || t.headers.get("x-eo-log-id") || void 0;
    }
    function k(t) {
      let e = t, r = e.message || String(t), n = e.cause;
      if (n) {
        let s = n.message || n.code || "";
        return s ? `${r} (${s})` : r;
      }
      return r;
    }
    function Z(t) {
      let e = {};
      return t.forEach((r, n) => {
        e[n.toLowerCase()] = r;
      }), e;
    }
    function Ee(t) {
      let e = [], r = /<Contents>([\s\S]*?)<\/Contents>/g, n;
      for (; (n = r.exec(t)) !== null; ) {
        let d = n[1], u = R(d, "Key"), l = R(d, "ETag");
        u !== null && e.push({ key: _(u), etag: l || "" });
      }
      let s = [], i = /<CommonPrefixes>([\s\S]*?)<\/CommonPrefixes>/g;
      for (; (n = i.exec(t)) !== null; ) {
        let d = n[1], u = R(d, "Prefix");
        u !== null && s.push(_(u));
      }
      let o = R(t, "IsTruncated") === "true", c = R(t, "NextMarker") || "";
      return { contents: e, commonPrefixes: s, isTruncated: o, nextMarker: _(c) };
    }
    function R(t, e) {
      let n = new RegExp(`<${e}>([\\s\\S]*?)<\\/${e}>`).exec(t);
      return n ? n[1] : null;
    }
    function _(t) {
      return t.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
    }
    var Se = "X-RateLimit-Reset";
    async function $(t, e, r = 2) {
      e.signal?.throwIfAborted?.();
      try {
        let n = await fetch(t, e);
        if (r > 0 && (n.status === 429 || n.status >= 500)) {
          let s = Q(n.headers.get(Se));
          return await ee(s, e.signal), $(t, e, r - 1);
        }
        return n;
      } catch (n) {
        if (r === 0 || n instanceof DOMException && n.name === "AbortError") throw n;
        let s = Q();
        return await ee(s, e.signal), $(t, e, r - 1);
      }
    }
    function Q(t) {
      return t ? Math.max(Number(t) * 1e3 - Date.now(), 500) : 1500;
    }
    function ee(t, e) {
      return new Promise((r, n) => {
        if (e?.aborted) return n(e.reason);
        let s = setTimeout(() => {
          e?.removeEventListener("abort", i), r();
        }, t), i = () => {
          clearTimeout(s), n(e.reason);
        };
        e?.addEventListener("abort", i, { once: true });
      });
    }
    var Pe = "prod";
    function te() {
      let t = typeof process < "u" ? process.env.PAGES_BLOB_STS_ENV : void 0;
      return t === "test" || t === "prod" ? t : Pe;
    }
    var Ie = 300;
    var ke = "https://blob-sts.edgeone.site/";
    var v = class {
      authToken;
      projectId;
      cached = null;
      constructor(e, r) {
        this.authToken = e, this.projectId = r;
      }
      async getCredential() {
        if (this.cached && !this.isExpired(this.cached)) return this.cached;
        let e = await this.fetchCredential();
        return this.cached = e, e;
      }
      clearCache() {
        this.cached = null;
      }
      isExpired(e) {
        let r = Math.floor(Date.now() / 1e3);
        return e.expiredTime - r < Ie;
      }
      async fetchCredential() {
        for (let n = 1; n <= 3; n++) {
          let s = new AbortController(), i = setTimeout(() => s.abort(), 1e4), a;
          try {
            a = await $(ke, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.authToken}`, "X-Env": te() }, body: JSON.stringify(this.projectId ? { ProjectId: this.projectId } : {}), signal: s.signal });
          } catch (d) {
            if (n < 3) {
              await L(500 * n);
              continue;
            }
            throw new m(`failed to obtain STS credential: ${d.message || "timeout"}`);
          } finally {
            clearTimeout(i);
          }
          if (a.status === 413) throw new m("storage quota exceeded");
          if (a.status === 429) throw new m("rate limited, please retry later");
          if (!a.ok) {
            if (a.status >= 500 && n < 3) {
              await L(500 * n);
              continue;
            }
            let d = await a.text().catch(() => "unknown error");
            throw new m(`failed to obtain STS credential: ${a.status} ${d}`);
          }
          let o = await a.json(), c = o.data && typeof o.data == "object" ? o.data : o;
          if (c.tmpSecretId && c.tmpSecretKey && c.sessionToken && c.expiredTime) {
            let d = c.cosMainland, u = c.cosOverseas, l = a.headers.get("X-Edge-Region") || void 0;
            return { tmpSecretId: c.tmpSecretId, tmpSecretKey: c.tmpSecretKey, sessionToken: c.sessionToken, expiredTime: c.expiredTime, appId: c.appId || void 0, zoneId: c.zoneId || void 0, projectId: c.projectId || void 0, resourcePrefix: c.resourcePrefix || void 0, cosMainland: d || void 0, cosOverseas: u || void 0, edgeRegion: l };
          }
          if (c.code !== void 0 && c.code !== 0) {
            let d = c.msg || c.message || "unknown error";
            throw new m(`credential exchange failed (code=${c.code}): ${d}`);
          }
          if (o.code !== void 0 && o.code !== 0) {
            let d = o.msg || o.message || "unknown error";
            throw new m(`credential exchange failed (code=${o.code}): ${d}`);
          }
          if (n < 3) {
            await L(500 * n);
            continue;
          }
          throw new m("invalid STS credential response");
        }
        throw new m("invalid STS credential response");
      }
    };
    function L(t) {
      return new Promise((e) => setTimeout(e, t));
    }
    var Re = "{{PAGES_BLOB_DEPLOY_CREDENTIAL}}";
    function re() {
      let t = {}, e = Ae();
      if (e) t.deployCredential = e;
      else {
        let n = ne("PAGES_BLOB_DEPLOY_CREDENTIAL");
        n && (t.deployCredential = n);
      }
      let r = ne("PAGES_PROJECT_ID");
      return r && (t.projectId = r), t;
    }
    function Ae() {
      let t = Re;
      if (!(t.startsWith("{{") && t.endsWith("}}"))) return t || void 0;
    }
    function ne(t) {
      if (typeof process < "u" && process.env) return process.env[t];
    }
    function ve(t) {
      let e = typeof t == "string" ? t : t.name;
      q(e);
      let r = se(typeof t == "string" ? void 0 : t), n = new v(r.authToken, r.projectId), s = new A(n);
      return new E(s, e, r.consistency ?? "eventual");
    }
    async function Me(t) {
      let e = se(t ? { name: "__list__", projectId: t.projectId, token: t.token, consistency: t.consistency } : void 0), r = new v(e.authToken, e.projectId);
      return { stores: (await new A(r).listStores(e.consistency)).map((i) => ({ name: i })) };
    }
    function se(t) {
      let e = re(), r = t?.token || e.deployCredential, n = t?.projectId || e.projectId;
      if (t?.token || e.projectId) {
        if (!n) throw new T();
        if (!r) throw new b(["token"]);
        return { authToken: r, projectId: n, consistency: t?.consistency };
      }
      if (t?.projectId && !r) throw new b(["token"]);
      if (!e.deployCredential) throw new b(["deployCredential"]);
      return { authToken: e.deployCredential, consistency: t?.consistency };
    }
  }
});

// node_modules/.pnpm/hono@4.12.25/node_modules/hono/dist/compose.js
var compose = (middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
  };
};

// node_modules/.pnpm/hono@4.12.25/node_modules/hono/dist/http-exception.js
var HTTPException = class extends Error {
  res;
  status;
  /**
   * Creates an instance of `HTTPException`.
   * @param status - HTTP status code for the exception. Defaults to 500.
   * @param options - Additional options for the exception.
   */
  constructor(status = 500, options) {
    super(options?.message, { cause: options?.cause });
    this.res = options?.res;
    this.status = status;
  }
  /**
   * Returns the response object associated with the exception.
   * If a response object is not provided, a new response is created with the error message and status code.
   * @returns The response object.
   */
  getResponse() {
    if (this.res) {
      const newResponse = new Response(this.res.body, {
        status: this.status,
        headers: this.res.headers
      });
      return newResponse;
    }
    return new Response(this.message, {
      status: this.status
    });
  }
};

// node_modules/.pnpm/hono@4.12.25/node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// node_modules/.pnpm/hono@4.12.25/node_modules/hono/dist/utils/body.js
var parseBody = async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = request instanceof HonoRequest ? request.raw.headers : request.headers;
  const contentType = headers.get("Content-Type");
  if (contentType?.startsWith("multipart/form-data") || contentType?.startsWith("application/x-www-form-urlencoded")) {
    return parseFormData(request, { all, dot });
  }
  return {};
};
async function parseFormData(request, options) {
  const formData = await request.formData();
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
var handleParsingAllValues = (form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
};
var handleParsingNestedValues = (form, key, value) => {
  if (/(?:^|\.)__proto__\./.test(key)) {
    return;
  }
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
};

// node_modules/.pnpm/hono@4.12.25/node_modules/hono/dist/utils/url.js
var splitPath = (path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
};
var splitRoutingPath = (routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
};
var extractGroupsFromPath = (path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return { groups, path };
};
var replaceGroupMarks = (paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
};
var patternCache = {};
var getPattern = (label, next) => {
  if (label === "*") {
    return "*";
  }
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match2[1], new RegExp(`^${match2[2]}(?=/${next})`)] : [label, match2[1], new RegExp(`^${match2[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match2[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
};
var tryDecode = (str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
};
var tryDecodeURI = (str) => tryDecode(str, decodeURI);
var getPath = (request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const hashIndex = url.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path = url.slice(start, end);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63 || charCode === 35) {
      break;
    }
  }
  return url.slice(start, i);
};
var getPathNoStrict = (request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
};
var mergePath = (base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
};
var checkOptionalParameter = (path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace("?", "");
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
};
var _decodeURI = (value) => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return value.indexOf("%") !== -1 ? tryDecode(value, decodeURIComponent_) : value;
};
var _getQueryParam = (url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) {
      return void 0;
    }
    if (!url.startsWith(key, keyIndex2 + 1)) {
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
};
var getQueryParam = _getQueryParam;
var getQueryParams = (url, key) => {
  return _getQueryParam(url, key, true);
};
var decodeURIComponent_ = decodeURIComponent;

// node_modules/.pnpm/hono@4.12.25/node_modules/hono/dist/request.js
var tryDecodeURIComponent = (str) => tryDecode(str, decodeURIComponent_);
var HonoRequest = class {
  /**
   * `.raw` can get the raw Request object.
   *
   * @see {@link https://hono.dev/docs/api/request#raw}
   *
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   */
  raw;
  #validatedData;
  // Short name of validatedData
  #matchResult;
  routeIndex = 0;
  /**
   * `.path` can get the pathname of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#path}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
    this.#validatedData = {};
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param && /\%/.test(param) ? tryDecodeURIComponent(param) : param;
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) {
        decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return parseBody(this, options);
  }
  #cachedBody = (key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    const anyCachedKey = Object.keys(bodyCache)[0];
    if (anyCachedKey) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  };
  /**
   * `.json()` can parse Request body of type `application/json`
   *
   * @see {@link https://hono.dev/docs/api/request#json}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
   * `.text()` can parse Request body of type `text/plain`
   *
   * @see {@link https://hono.dev/docs/api/request#text}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   */
  text() {
    return this.#cachedBody("text");
  }
  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   *
   * @see {@link https://hono.dev/docs/api/request#arraybuffer}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
   * `.bytes()` parses the request body as a `Uint8Array`.
   *
   * @see {@link https://hono.dev/docs/api/request#bytes}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.bytes()
   * })
   * ```
   */
  bytes() {
    return this.#cachedBody("arrayBuffer").then((buffer) => new Uint8Array(buffer));
  }
  /**
   * Parses the request body as a `Blob`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.blob();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#blob
   */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
   * Parses the request body as `FormData`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.formData();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#formdata
   */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
   * Adds validated data to the request.
   *
   * @param target - The target of the validation.
   * @param data - The validated data to add.
   */
  addValidatedData(target, data) {
    this.#validatedData[target] = data;
  }
  valid(target) {
    return this.#validatedData[target];
  }
  /**
   * `.url()` can get the request url strings.
   *
   * @see {@link https://hono.dev/docs/api/request#url}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   */
  get url() {
    return this.raw.url;
  }
  /**
   * `.method()` can get the method name of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#method}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
   * `.matchedRoutes()` can return a matched route in the handler
   *
   * @deprecated
   *
   * Use matchedRoutes helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#matchedroutes}
   *
   * @example
   * ```ts
   * app.use('*', async function logger(c, next) {
   *   await next()
   *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
   *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
   *     console.log(
   *       method,
   *       ' ',
   *       path,
   *       ' '.repeat(Math.max(10 - path.length, 0)),
   *       name,
   *       i === c.req.routeIndex ? '<- respond from here' : ''
   *     )
   *   })
   * })
   * ```
   */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
   * `routePath()` can retrieve the path registered within the handler
   *
   * @deprecated
   *
   * Use routePath helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#routepath}
   *
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/.pnpm/hono@4.12.25/node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = (value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
};
var resolveCallback = async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
};

// node_modules/.pnpm/hono@4.12.25/node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = (contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
};
var createResponseInstance = (body, init) => new Response(body, init);
var Context = class {
  #rawRequest;
  #req;
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @see {@link https://hono.dev/docs/api/context#env}
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   */
  env = {};
  #var;
  finalized = false;
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   *
   * @see {@link https://hono.dev/docs/api/context#error}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
   * Creates an instance of the Context class.
   *
   * @param req - The Request object.
   * @param options - Optional configuration options for the context.
   */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
   * `.req` is the instance of {@link HonoRequest}.
   */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#event}
   * The FetchEvent associated with the current request.
   *
   * @throws Will throw an error if the context does not have a FetchEvent.
   */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#executionctx}
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   */
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#res}
   * The Response object for the current request.
   */
  get res() {
    return this.#res ||= createResponseInstance(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  /**
   * Sets the Response object for the current request.
   *
   * @param _res - The Response object to set.
   */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
   * `.render()` can create a response within a layout.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   */
  render = (...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  };
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = (layout) => this.#layout = layout;
  /**
   * Gets the current layout for the response.
   *
   * @returns The current layout function.
   */
  getLayout = () => this.#layout;
  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   */
  setRenderer = (renderer) => {
    this.#renderer = renderer;
  };
  /**
   * `.header()` can set headers.
   *
   * @see {@link https://hono.dev/docs/api/context#header}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  header = (name, value, options) => {
    if (this.finalized) {
      this.#res = createResponseInstance(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  };
  status = (status) => {
    this.#status = status;
  };
  /**
   * `.set()` can set the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is hot!!')
   *   await next()
   * })
   * ```
   */
  set = (key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  };
  /**
   * `.get()` can use the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   */
  get = (key) => {
    return this.#var ? this.#var.get(key) : void 0;
  };
  /**
   * `.var` can access the value of a variable.
   *
   * @see {@link https://hono.dev/docs/api/context#var}
   *
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   */
  // c.var.propName is a read-only
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    const responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders ?? new Headers();
    if (typeof arg === "object" && "headers" in arg) {
      const argHeaders = arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers);
      for (const [key, value] of argHeaders) {
        if (key.toLowerCase() === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        if (typeof v === "string") {
          responseHeaders.set(k, v);
        } else {
          responseHeaders.delete(k);
          for (const v2 of v) {
            responseHeaders.append(k, v2);
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, { status, headers: responseHeaders });
  }
  newResponse = (...args) => this.#newResponse(...args);
  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   *
   * @see {@link https://hono.dev/docs/api/context#body}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  body = (data, arg, headers) => this.#newResponse(data, arg, headers);
  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   *
   * @see {@link https://hono.dev/docs/api/context#text}
   *
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   */
  text = (text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
      text,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  };
  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   *
   * @see {@link https://hono.dev/docs/api/context#json}
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   */
  json = (object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  };
  html = (html, arg, headers) => {
    const res = (html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers));
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  };
  /**
   * `.redirect()` can Redirect, default status code is 302.
   *
   * @see {@link https://hono.dev/docs/api/context#redirect}
   *
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   */
  redirect = (location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      // Multibyes should be encoded
      // eslint-disable-next-line no-control-regex
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  };
  /**
   * `.notFound()` can return the Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/context#notfound}
   *
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   */
  notFound = () => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  };
};

// node_modules/.pnpm/hono@4.12.25/node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
};

// node_modules/.pnpm/hono@4.12.25/node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/.pnpm/hono@4.12.25/node_modules/hono/dist/hono-base.js
var notFoundHandler = (c) => {
  return c.text("404 Not Found", 404);
};
var errorHandler = (err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
};
var Hono = class _Hono {
  get;
  post;
  put;
  delete;
  options;
  patch;
  all;
  on;
  use;
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router;
  getPath;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new _Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  errorHandler = errorHandler;
  /**
   * `.route()` allows grouping other Hono instance in routes.
   *
   * @see {@link https://hono.dev/docs/api/routing#grouping}
   *
   * @param {string} path - base Path
   * @param {Hono} app - other Hono instance
   * @returns {Hono} routed Hono instance
   *
   * @example
   * ```ts
   * const app = new Hono()
   * const app2 = new Hono()
   *
   * app2.get("/user", (c) => c.text("user"))
   * app.route("/api", app2) // GET /api/user
   * ```
   */
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res;
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler, r.basePath);
    });
    return this;
  }
  /**
   * `.basePath()` allows base paths to be specified.
   *
   * @see {@link https://hono.dev/docs/api/routing#base-path}
   *
   * @param {string} path - base Path
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
   * `.onError()` handles an error and returns a customized Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#error-handling}
   *
   * @param {ErrorHandler} handler - request Handler for error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */
  onError = (handler) => {
    this.errorHandler = handler;
    return this;
  };
  /**
   * `.notFound()` allows you to customize a Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#not-found}
   *
   * @param {NotFoundHandler} handler - request handler for not-found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   */
  notFound = (handler) => {
    this.#notFoundHandler = handler;
    return this;
  };
  /**
   * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
   *
   * @see {@link https://hono.dev/docs/api/hono#mount}
   *
   * @param {string} path - base Path
   * @param {Function} applicationHandler - other Request Handler
   * @param {MountOptions} [options] - options of `.mount()`
   * @returns {Hono} mounted Hono instance
   *
   * @example
   * ```ts
   * import { Router as IttyRouter } from 'itty-router'
   * import { Hono } from 'hono'
   * // Create itty-router application
   * const ittyRouter = IttyRouter()
   * // GET /itty-router/hello
   * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
   *
   * const app = new Hono()
   * app.mount('/itty-router', ittyRouter.handle)
   * ```
   *
   * @example
   * ```ts
   * const app = new Hono()
   * // Send the request to another application without modification.
   * app.mount('/app', anotherApp, {
   *   replaceRequest: (req) => req,
   * })
   * ```
   */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = (request) => request;
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = this.getPath(request).slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    };
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler, baseRoutePath) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = {
      basePath: baseRoutePath !== void 0 ? mergePath(this._basePath, baseRoutePath) : this._basePath,
      path,
      method,
      handler
    };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    }
    const path = this.getPath(request, { env });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
   * `.fetch()` will be entry point of your app.
   *
   * @see {@link https://hono.dev/docs/api/hono#fetch}
   *
   * @param {Request} request - request Object of request
   * @param {Env} Env - env Object
   * @param {ExecutionContext} - context of execution
   * @returns {Response | Promise<Response>} response of request
   *
   */
  fetch = (request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  };
  /**
   * `.request()` is a useful method for testing.
   * You can pass a URL or pathname to send a GET request.
   * app will return a Response object.
   * ```ts
   * test('GET /hello is ok', async () => {
   *   const res = await app.request('/hello')
   *   expect(res.status).toBe(200)
   * })
   * ```
   * @see https://hono.dev/docs/api/hono#request
   */
  request = (input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  };
  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @deprecated
   * Use `fire` from `hono/service-worker` instead.
   * ```ts
   * import { Hono } from 'hono'
   * import { fire } from 'hono/service-worker'
   *
   * const app = new Hono()
   * // ...
   * fire(app)
   * ```
   * @see https://hono.dev/docs/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */
  fire = () => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  };
};

// node_modules/.pnpm/hono@4.12.25/node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = ((method2, path2) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path2];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path2.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  });
  this.match = match2;
  return match2(method, path);
}

// node_modules/.pnpm/hono@4.12.25/node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
var Node = class _Node {
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.#index !== void 0) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.#index = index;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name && pattern[2]) {
        if (regexpStr === ".*") {
          throw PATH_ERROR;
        }
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.#children[regexpStr];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[regexpStr] = new _Node();
        if (name !== "") {
          node.#varIndex = context.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name !== "") {
        paramMap.push([name, node.#varIndex]);
      }
    } else {
      node = this.#children[token];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[token] = new _Node();
      }
    }
    node.insert(restTokens, index, paramMap, context, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      return (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + c.buildRegExpStr();
    });
    if (typeof this.#index === "number") {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/.pnpm/hono@4.12.25/node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  #context = { varIndex: 0 };
  #root = new Node();
  insert(path, index, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i = 0; ; ) {
      let replaced = false;
      path = path.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, index, paramAssoc, this.#context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// node_modules/.pnpm/hono@4.12.25/node_modules/hono/dist/router/reg-exp-router/router.js
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    path === "*" ? "" : `^${path.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie();
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes.map(
    (route) => [!/\*|\/:/.test(route[0]), ...route]
  ).sort(
    ([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
  );
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length; k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
var RegExpRouter = class {
  name = "RegExpRouter";
  #middleware;
  #routes;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      ;
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m) => {
          middleware[m][path] ||= findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        });
      } else {
        middleware[method][path] ||= findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
      }
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            (p) => re.test(p) && routes[m][p].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path2 = paths[i];
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          routes[m][path2] ||= [
            ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
          ];
          routes[m][path2].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = void 0;
    clearWildcardRegExpCache();
    return matchers;
  }
  #buildMatcher(method) {
    const routes = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.#middleware, this.#routes].forEach((r) => {
      const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true;
        routes.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]])
        );
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
};

// node_modules/.pnpm/hono@4.12.25/node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// node_modules/.pnpm/hono@4.12.25/node_modules/hono/dist/router/trie-router/node.js
var emptyParams = /* @__PURE__ */ Object.create(null);
var hasChildren = (children) => {
  for (const _ in children) {
    return true;
  }
  return false;
};
var Node2 = class _Node2 {
  #methods;
  #children;
  #patterns;
  #order = 0;
  #params = emptyParams;
  constructor(method, handler, children) {
    this.#children = children || /* @__PURE__ */ Object.create(null);
    this.#methods = [];
    if (method && handler) {
      const m = /* @__PURE__ */ Object.create(null);
      m[method] = { handler, possibleKeys: [], score: 0 };
      this.#methods = [m];
    }
    this.#patterns = [];
  }
  insert(method, path, handler) {
    this.#order = ++this.#order;
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const p = parts[i];
      const nextP = parts[i + 1];
      const pattern = getPattern(p, nextP);
      const key = Array.isArray(pattern) ? pattern[0] : p;
      if (key in curNode.#children) {
        curNode = curNode.#children[key];
        if (pattern) {
          possibleKeys.push(pattern[1]);
        }
        continue;
      }
      curNode.#children[key] = new _Node2();
      if (pattern) {
        curNode.#patterns.push(pattern);
        possibleKeys.push(pattern[1]);
      }
      curNode = curNode.#children[key];
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
        score: this.#order
      }
    });
    return curNode;
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== void 0) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        if (nodeParams !== emptyParams || params && params !== emptyParams) {
          for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
            const key = handlerSet.possibleKeys[i2];
            const processed = processedSet[handlerSet.score];
            handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
            processedSet[handlerSet.score] = true;
          }
        }
      }
    }
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    const curNodesQueue = [];
    const len = parts.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
            }
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
          const pattern = node.#patterns[k];
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (pattern === "*") {
            const astNode = node.#children["*"];
            if (astNode) {
              this.#pushHandlerSets(handlerSets, astNode, method, node.#params);
              astNode.#params = params;
              tempNodes.push(astNode);
            }
            continue;
          }
          const [key, name, matcher] = pattern;
          if (!part && !(matcher instanceof RegExp)) {
            continue;
          }
          const child = node.#children[key];
          if (matcher instanceof RegExp) {
            if (partOffsets === null) {
              partOffsets = new Array(len);
              let offset = path[0] === "/" ? 1 : 0;
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset;
                offset += parts[p].length + 1;
              }
            }
            const restPathString = path.substring(partOffsets[i]);
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
              if (hasChildren(child.#children)) {
                child.#params = params;
                const componentCount = m[0].match(/\//)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
              if (child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  params,
                  node.#params
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets.length > 1) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/.pnpm/hono@4.12.25/node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  name = "TrieRouter";
  #node;
  constructor() {
    this.#node = new Node2();
  }
  add(method, path, handler) {
    const results = checkOptionalParameter(path);
    if (results) {
      for (let i = 0, len = results.length; i < len; i++) {
        this.#node.insert(method, results[i], handler);
      }
      return;
    }
    this.#node.insert(method, path, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/.pnpm/hono@4.12.25/node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};

// worker/src/types.ts
var ApiError = class extends Error {
  status;
  code;
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
};

// worker/src/config.ts
var CORE_SECRET_KEYS = ["JWT_SECRET", "CODE_HMAC_SECRET", "APP_SECRET_HMAC_SECRET", "DEVICE_HMAC_SECRET"];
var PLACEHOLDER_SECRET = "replace-with-a-long-random-secret";
function requireEnv(env, key) {
  const value = env[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApiError(500, "CONFLICT", `${String(key)} is not configured`);
  }
  return value.trim();
}
function validateEnv(env) {
  if (!env.DB && !isEdgeOneRuntime(env)) {
    throw new ApiError(500, "CONFLICT", "Database binding DB is not configured");
  }
  for (const key of CORE_SECRET_KEYS) {
    const value = requireEnv(env, key);
    if (value === PLACEHOLDER_SECRET) {
      throw new ApiError(500, "CONFLICT", `${key} must not use the example placeholder value`);
    }
  }
  const bootstrapUsername = normalizeOptionalEnv(env.ADMIN_BOOTSTRAP_USERNAME);
  const bootstrapPassword = normalizeOptionalEnv(env.ADMIN_BOOTSTRAP_PASSWORD);
  if (bootstrapUsername && !bootstrapPassword || !bootstrapUsername && bootstrapPassword) {
    throw new ApiError(500, "CONFLICT", "ADMIN_BOOTSTRAP_USERNAME and ADMIN_BOOTSTRAP_PASSWORD must be configured together");
  }
  if (bootstrapPassword === "change-me-before-use") {
    throw new ApiError(500, "CONFLICT", "ADMIN_BOOTSTRAP_PASSWORD must not use the example placeholder value");
  }
}
function isEdgeOneRuntime(env) {
  if (env.EDGEONE_RUNTIME === "1" || env.EDGEONE_RUNTIME === "true") {
    return true;
  }
  const envRecord = env;
  for (const marker of [envRecord.TENCENTCLOUD_SCF_FUNCTIONNAME, envRecord.SCF_FUNCTIONNAME]) {
    if (typeof marker === "string" && marker.length > 0) {
      return true;
    }
  }
  const globalProcess = globalThis.process;
  const processMarker = globalProcess?.env?.TENCENTCLOUD_SCF_FUNCTIONNAME ?? globalProcess?.env?.SCF_FUNCTIONNAME;
  if (typeof processMarker === "string" && processMarker.length > 0) {
    return true;
  }
  return false;
}
function normalizeOptionalEnv(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : void 0;
}

// worker/src/constants.ts
var APP_STATUS = {
  ACTIVE: "active",
  DISABLED: "disabled"
};
var APP_STATUS_VALUES = [APP_STATUS.ACTIVE, APP_STATUS.DISABLED];
var TENANT_STATUS = {
  ACTIVE: "active",
  DISABLED: "disabled"
};
var TENANT_STATUS_VALUES = [TENANT_STATUS.ACTIVE, TENANT_STATUS.DISABLED];
var ADMIN_ROLE = {
  SUPER_ADMIN: "super_admin",
  TENANT_ADMIN: "tenant_admin"
};
var ADMIN_ROLE_VALUES = [ADMIN_ROLE.SUPER_ADMIN, ADMIN_ROLE.TENANT_ADMIN];
var CODE_STATUS = {
  UNUSED: "unused",
  ISSUED: "issued",
  ACTIVE: "active",
  DELETED: "deleted"
};
var CODE_STATUS_VALUES = [CODE_STATUS.UNUSED, CODE_STATUS.ISSUED, CODE_STATUS.ACTIVE, CODE_STATUS.DELETED];
var CODE_DERIVED_STATUS = {
  DISABLED: "disabled",
  EXPIRED: "expired"
};
var CODE_LIST_STATUS_VALUES = [
  CODE_STATUS.UNUSED,
  CODE_STATUS.ISSUED,
  CODE_STATUS.ACTIVE,
  CODE_DERIVED_STATUS.DISABLED,
  CODE_STATUS.DELETED,
  CODE_DERIVED_STATUS.EXPIRED
];
var CODE_TOGGLE_STATUS = {
  ENABLED: "enabled",
  DISABLED: "disabled"
};
var CODE_TOGGLE_STATUS_VALUES = [CODE_TOGGLE_STATUS.ENABLED, CODE_TOGGLE_STATUS.DISABLED];
var CODE_BULK_ACTION = {
  DELETE: "delete",
  ENABLE: "enable",
  DISABLE: "disable",
  FORCE_DELETE: "force_delete"
};
var CODE_BULK_ACTION_VALUES = [
  CODE_BULK_ACTION.DELETE,
  CODE_BULK_ACTION.ENABLE,
  CODE_BULK_ACTION.DISABLE,
  CODE_BULK_ACTION.FORCE_DELETE
];
var LOG_ACTION = {
  BATCH_GENERATE: "batch_generate",
  ACTIVATE: "activate",
  VERIFY: "verify",
  UNBIND_DEVICE: "unbind_device",
  MANUAL_UNBIND_DEVICE: "manual_unbind_device",
  DELETE_CODE: "delete_code",
  DISABLE_CODE: "disable_code",
  ENABLE_CODE: "enable_code",
  FORCE_DELETE_CODE: "force_delete_code",
  DISABLE_APP: "disable_app",
  ENABLE_APP: "enable_app",
  ROTATE_APP_SECRET: "rotate_app_secret",
  CREATE_VERSION: "create_version",
  UPDATE_VERSION: "update_version",
  PUBLISH_VERSION: "publish_version",
  UNPUBLISH_VERSION: "unpublish_version",
  DELETE_VERSION: "delete_version",
  CLAIM_CODE: "claim_code"
};
var LOG_ACTION_VALUES = [
  LOG_ACTION.BATCH_GENERATE,
  LOG_ACTION.ACTIVATE,
  LOG_ACTION.VERIFY,
  LOG_ACTION.UNBIND_DEVICE,
  LOG_ACTION.MANUAL_UNBIND_DEVICE,
  LOG_ACTION.DELETE_CODE,
  LOG_ACTION.DISABLE_CODE,
  LOG_ACTION.ENABLE_CODE,
  LOG_ACTION.FORCE_DELETE_CODE,
  LOG_ACTION.DISABLE_APP,
  LOG_ACTION.ENABLE_APP,
  LOG_ACTION.ROTATE_APP_SECRET,
  LOG_ACTION.CREATE_VERSION,
  LOG_ACTION.UPDATE_VERSION,
  LOG_ACTION.PUBLISH_VERSION,
  LOG_ACTION.UNPUBLISH_VERSION,
  LOG_ACTION.DELETE_VERSION,
  LOG_ACTION.CLAIM_CODE
];
var LOG_RESULT = {
  SUCCESS: "success",
  FAILURE: "failure"
};
var LOG_RESULT_VALUES = [LOG_RESULT.SUCCESS, LOG_RESULT.FAILURE];
var MAX_CODE_BATCH_QUANTITY = 300;
var MAX_CODE_NOTE_LENGTH = 120;
var VERSION_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived"
};
var VERSION_STATUS_VALUES = [VERSION_STATUS.DRAFT, VERSION_STATUS.PUBLISHED, VERSION_STATUS.ARCHIVED];
var ERROR_CODE = {
  BAD_REQUEST: "BAD_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  APP_DISABLED: "APP_DISABLED",
  INVALID_APP_SECRET: "INVALID_APP_SECRET",
  INVALID_CODE: "INVALID_CODE",
  CODE_DISABLED: "CODE_DISABLED",
  CODE_DELETED: "CODE_DELETED",
  CODE_EXPIRED: "CODE_EXPIRED",
  DEVICE_MISMATCH: "DEVICE_MISMATCH",
  REBINDS_EXCEEDED: "REBINDS_EXCEEDED",
  REBINDS_TOO_FREQUENT: "REBINDS_TOO_FREQUENT",
  CONFLICT: "CONFLICT",
  VERSION_NOT_FOUND: "VERSION_NOT_FOUND",
  VERSION_CODE_CONFLICT: "VERSION_CODE_CONFLICT",
  VERSION_NOT_PUBLISHABLE: "VERSION_NOT_PUBLISHABLE",
  NO_CODE_AVAILABLE: "NO_CODE_AVAILABLE",
  ENCRYPTION_KEY_NOT_CONFIGURED: "ENCRYPTION_KEY_NOT_CONFIGURED"
};
var ERROR_CODE_VALUES = [
  ERROR_CODE.BAD_REQUEST,
  ERROR_CODE.UNAUTHORIZED,
  ERROR_CODE.FORBIDDEN,
  ERROR_CODE.NOT_FOUND,
  ERROR_CODE.APP_DISABLED,
  ERROR_CODE.INVALID_APP_SECRET,
  ERROR_CODE.INVALID_CODE,
  ERROR_CODE.CODE_DISABLED,
  ERROR_CODE.CODE_DELETED,
  ERROR_CODE.CODE_EXPIRED,
  ERROR_CODE.DEVICE_MISMATCH,
  ERROR_CODE.REBINDS_EXCEEDED,
  ERROR_CODE.REBINDS_TOO_FREQUENT,
  ERROR_CODE.CONFLICT,
  ERROR_CODE.VERSION_NOT_FOUND,
  ERROR_CODE.VERSION_CODE_CONFLICT,
  ERROR_CODE.VERSION_NOT_PUBLISHABLE,
  ERROR_CODE.NO_CODE_AVAILABLE,
  ERROR_CODE.ENCRYPTION_KEY_NOT_CONFIGURED
];
function isAppStatus(value) {
  return includesValue(APP_STATUS_VALUES, value);
}
function isTenantStatus(value) {
  return includesValue(TENANT_STATUS_VALUES, value);
}
function isCodeListStatus(value) {
  return includesValue(CODE_LIST_STATUS_VALUES, value);
}
function isCodeToggleStatus(value) {
  return includesValue(CODE_TOGGLE_STATUS_VALUES, value);
}
function isCodeBulkAction(value) {
  return includesValue(CODE_BULK_ACTION_VALUES, value);
}
function isVersionStatus(value) {
  return includesValue(VERSION_STATUS_VALUES, value);
}
function includesValue(values, value) {
  return values.includes(value);
}

// worker/src/crypto.ts
var encoder = new TextEncoder();
var hmacKeyCache = /* @__PURE__ */ new Map();
var PASSWORD_PBKDF2_ITERATIONS = 1e5;
function bytesToBase64Url(bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of data) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
function base64UrlToBytes(value) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
function generateRandomToken(byteLength = 24) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}
function generateActivationCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]);
  return `LM-${chars.slice(0, 5).join("")}-${chars.slice(5, 10).join("")}-${chars.slice(10, 15).join("")}-${chars.slice(15, 20).join("")}`;
}
function normalizeCode(code) {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}
function codeSuffix(code) {
  return normalizeCode(code).replaceAll("-", "").slice(-6);
}
async function hmacSha256(secret, value) {
  const key = await getHmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return bytesToBase64Url(signature);
}
async function getHmacKey(secret) {
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
async function hashPassword(password, salt = generateRandomToken(16)) {
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
async function verifyPassword(password, salt, expectedHash) {
  const { hash } = await hashPassword(password, salt);
  return timingSafeEqual(hash, expectedHash);
}
function timingSafeEqual(left, right) {
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let diff = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < length; index += 1) {
    diff |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return diff === 0;
}
async function signJwt(secret, payload, ttlSeconds) {
  const now = Math.floor(Date.now() / 1e3);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + ttlSeconds
  };
  const header = bytesToBase64Url(encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = bytesToBase64Url(encoder.encode(JSON.stringify(fullPayload)));
  const signature = await hmacSha256(secret, `${header}.${body}`);
  return `${header}.${body}.${signature}`;
}
async function verifyJwt(secret, token) {
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
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(body)));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1e3)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
var GCM_IV_LENGTH = 12;
var activationCodeKeyCache = /* @__PURE__ */ new Map();
async function decryptPlaintext(payload, secret) {
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
async function getActivationCodeKey(secret) {
  const cached = activationCodeKeyCache.get(secret);
  if (cached) {
    return cached;
  }
  const raw2 = new Uint8Array(base64UrlToBytes(secret));
  if (raw2.length !== 32) {
    throw new Error("CODE_PLAINTEXT_ENCRYPTION_KEY must be a base64url-encoded 32-byte key");
  }
  const key = await crypto.subtle.importKey("raw", raw2, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
  activationCodeKeyCache.set(secret, key);
  return key;
}

// worker/src/http.ts
function ok(data) {
  return {
    ok: true,
    data
  };
}
function fail(code, message) {
  return {
    ok: false,
    error: {
      code,
      message
    }
  };
}
function requireString(value, name) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApiError(400, "BAD_REQUEST", `${name} is required`);
  }
  return value.trim();
}
function optionalString(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : void 0;
}
function optionalHttpUrl(value, name) {
  const normalized = optionalString(value);
  if (!normalized) {
    return void 0;
  }
  try {
    const url = new URL(normalized);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Unsupported protocol");
    }
    return url.toString();
  } catch {
    throw new ApiError(400, "BAD_REQUEST", `${name} must be a valid http or https URL`);
  }
}
function requireInteger(value, name, options = {}) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(numeric)) {
    throw new ApiError(400, "BAD_REQUEST", `${name} must be an integer`);
  }
  if (options.min !== void 0 && numeric < options.min) {
    throw new ApiError(400, "BAD_REQUEST", `${name} must be at least ${options.min}`);
  }
  if (options.max !== void 0 && numeric > options.max) {
    throw new ApiError(400, "BAD_REQUEST", `${name} must be at most ${options.max}`);
  }
  return numeric;
}
async function readJson(request) {
  try {
    const body = await request.json();
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      throw new ApiError(400, "BAD_REQUEST", "JSON body must be an object");
    }
    return body;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(400, "BAD_REQUEST", "Invalid JSON body");
  }
}

// worker/src/time.ts
function nowIso() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function addDaysIso(baseIso, days) {
  const base = new Date(baseIso);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString();
}
function addMonthsIso(baseIso, months) {
  const base = new Date(baseIso);
  const targetFirstDay = new Date(
    Date.UTC(
      base.getUTCFullYear(),
      base.getUTCMonth() + months,
      1,
      base.getUTCHours(),
      base.getUTCMinutes(),
      base.getUTCSeconds(),
      base.getUTCMilliseconds()
    )
  );
  const targetMonthLastDate = new Date(
    Date.UTC(targetFirstDay.getUTCFullYear(), targetFirstDay.getUTCMonth() + 1, 0)
  ).getUTCDate();
  targetFirstDay.setUTCDate(Math.min(base.getUTCDate(), targetMonthLastDate));
  return targetFirstDay.toISOString();
}
function addYearsIso(baseIso, years) {
  return addMonthsIso(baseIso, years * 12);
}
function isExpired(expiresAt, now = /* @__PURE__ */ new Date()) {
  return expiresAt !== null && new Date(expiresAt).getTime() <= now.getTime();
}
function secondsUntil(expiresAt, now = /* @__PURE__ */ new Date()) {
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - now.getTime()) / 1e3));
}

// worker/src/blobstore/docstore.ts
var PreconditionFailedError2 = class extends Error {
  constructor(reason = "precondition failed") {
    super(reason);
    this.name = "PreconditionFailedError";
  }
};
var CasConflictError = class extends Error {
  constructor(base) {
    super(`concurrent write conflict on ${base}`);
    this.base = base;
    this.name = "CasConflictError";
  }
  base;
};
var UniqueViolationError = class extends Error {
  constructor(base) {
    super(`UNIQUE constraint failed: ${base}`);
    this.base = base;
    this.name = "UniqueViolationError";
  }
  base;
};
var DEFAULT_MAX_ATTEMPTS = 8;
var DocStore = class {
  constructor(kv) {
    this.kv = kv;
  }
  kv;
  async read(base) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const version = await this.latestVersion(base);
      if (version === null) {
        return null;
      }
      const raw2 = await this.kv.get(`${base}/v${version}`);
      if (raw2 === null) {
        continue;
      }
      try {
        return JSON.parse(raw2);
      } catch {
        return null;
      }
    }
    return null;
  }
  async readData(base) {
    return (await this.read(base))?.data ?? null;
  }
  async latestVersion(base) {
    const keys = await this.kv.list(`${base}/v`);
    let latest = null;
    for (const key of keys) {
      const match2 = /\/v(\d+)$/.exec(key);
      if (!match2) {
        continue;
      }
      const version = Number(match2[1]);
      if (latest === null || version > latest) {
        latest = version;
      }
    }
    return latest;
  }
  /** 创建 v1；已存在时抛 UniqueViolationError（等价 UNIQUE 约束） */
  async create(base, data) {
    const created = await this.kv.set(`${base}/v1`, JSON.stringify({ v: 1, data }), { onlyIfNew: true });
    if (!created) {
      throw new UniqueViolationError(base);
    }
    return { v: 1, data };
  }
  /** 创建 v1；已存在时返回 false，不抛错 */
  async createIfAbsent(base, data) {
    return await this.kv.set(`${base}/v1`, JSON.stringify({ v: 1, data }), { onlyIfNew: true });
  }
  /** 以 CAS 写入 v+1；并发冲突抛 CasConflictError，由调用方重读重试 */
  async write(base, data, expectedV) {
    const nextV = expectedV + 1;
    const created = await this.kv.set(`${base}/v${nextV}`, JSON.stringify({ v: nextV, data }), { onlyIfNew: true });
    if (!created) {
      throw new CasConflictError(base);
    }
    const staleVersion = expectedV - 1;
    if (staleVersion >= 1) {
      try {
        await this.kv.delete(`${base}/v${staleVersion}`);
      } catch {
      }
    }
    return { v: nextV, data };
  }
  /**
   * 乐观变更：读最新 → fn 生成新值（业务拒绝抛 PreconditionFailedError）→ CAS 写入；
   * 冲突自动重读重试，重试次数用尽抛 CasConflictError。
   */
  async mutate(base, fn, maxAttempts = DEFAULT_MAX_ATTEMPTS) {
    let lastConflict = null;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const current = await this.read(base);
      const next = await fn(current?.data ?? null);
      try {
        return await this.write(base, next, current?.v ?? 0);
      } catch (error) {
        if (error instanceof CasConflictError) {
          lastConflict = error;
          continue;
        }
        throw error;
      }
    }
    throw lastConflict ?? new CasConflictError(base);
  }
  async deleteAll(base) {
    const keys = await this.kv.list(`${base}/v`);
    await Promise.all(keys.map((key) => this.kv.delete(key)));
  }
  /** 列出某个目录前缀下的所有「基础键」（去掉 /v{n} 后缀） */
  async listBases(prefix) {
    const dir = prefix.endsWith("/") ? prefix : `${prefix}/`;
    const keys = await this.kv.list(dir);
    const bases = /* @__PURE__ */ new Set();
    for (const key of keys) {
      const match2 = /^(.*)\/v\d+$/.exec(key);
      if (match2 && match2[1].startsWith(dir)) {
        bases.add(match2[1]);
      }
    }
    return Array.from(bases).sort();
  }
};
var IdAllocator = class {
  constructor(store, entity, blockSize = 32) {
    this.store = store;
    this.entity = entity;
    this.blockSize = blockSize;
  }
  store;
  entity;
  blockSize;
  buffer = [];
  async allocate(count) {
    const ids = [];
    while (ids.length < count) {
      if (this.buffer.length === 0) {
        await this.refill(Math.max(count, this.blockSize));
      }
      const take = Math.min(this.buffer.length, count - ids.length);
      ids.push(...this.buffer.splice(0, take));
    }
    return ids;
  }
  async allocateOne() {
    return (await this.allocate(1))[0];
  }
  async refill(blockSize) {
    let start = 0;
    await this.store.mutate(
      `seq/${this.entity}`,
      (current) => {
        start = current?.next ?? 1;
        return { next: start + blockSize };
      }
    );
    for (let offset = 0; offset < blockSize; offset += 1) {
      this.buffer.push(start + offset);
    }
  }
};

// worker/src/blobstore/seed.ts
var SEED_PLANS = [
  { id: 5, code: "daily", name: "\u5929\u5361", duration_days: 1, sort_order: 5 },
  { id: 7, code: "two_day", name: "\u4E24\u5929\u5361", duration_days: 2, sort_order: 6 },
  { id: 8, code: "three_day", name: "\u4E09\u5929\u5361", duration_days: 3, sort_order: 7 },
  { id: 1, code: "weekly", name: "\u5468\u5361", duration_days: 7, sort_order: 10 },
  { id: 2, code: "monthly", name: "\u6708\u5361", duration_days: 30, sort_order: 20 },
  { id: 3, code: "quarterly", name: "\u5B63\u5361", duration_days: 90, sort_order: 30 },
  { id: 4, code: "yearly", name: "\u5E74\u5361", duration_days: 365, sort_order: 40 },
  { id: 6, code: "lifetime", name: "\u6C38\u4E45\u5361", duration_days: 26800, sort_order: 50 }
];
var DEFAULT_TENANT_ID = 1;
var SEED_MARKER = "seed/meta";
var SEED_VERSION = 1;
var seedInFlight = /* @__PURE__ */ new WeakMap();
function ensureSeeded(store) {
  const cached = seedInFlight.get(store);
  if (cached) {
    return cached;
  }
  const promise = seedOnce(store).catch((error) => {
    seedInFlight.delete(store);
    throw error;
  });
  seedInFlight.set(store, promise);
  return promise;
}
async function seedOnce(store) {
  const [marker, plansIndex, tenant] = await Promise.all([
    store.readData(SEED_MARKER),
    store.readData("plans"),
    store.readData(`tenant/${DEFAULT_TENANT_ID}`)
  ]);
  if (marker?.version === SEED_VERSION && plansIndex && tenant) {
    return;
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  for (const plan of SEED_PLANS) {
    const planRow = { ...plan, created_at: now };
    await store.createIfAbsent(`plan/${plan.id}`, planRow);
    await store.createIfAbsent(`plancode/${plan.code}`, { id: plan.id });
  }
  await store.createIfAbsent("plans", { ids: SEED_PLANS.map((plan) => plan.id) });
  const defaultTenant = {
    id: DEFAULT_TENANT_ID,
    name: "\u9ED8\u8BA4\u79DF\u6237",
    slug: "default",
    status: TENANT_STATUS.ACTIVE,
    created_at: now,
    updated_at: now
  };
  await store.createIfAbsent(`tenant/${DEFAULT_TENANT_ID}`, defaultTenant);
  await store.createIfAbsent("tenantslug/default", { id: DEFAULT_TENANT_ID });
  await store.createIfAbsent("tenants", { ids: [DEFAULT_TENANT_ID] });
  await store.createIfAbsent("seq/tenants", { next: 2 });
  for (const entity of ["admins", "apps", "batches", "codes", "versions", "logs"]) {
    await store.createIfAbsent(`seq/${entity}`, { next: 1 });
  }
  await store.createIfAbsent(SEED_MARKER, { version: SEED_VERSION });
}

// worker/src/blobstore/blob-repository.ts
var CLIENT_LOG_ACTIONS = /* @__PURE__ */ new Set([LOG_ACTION.ACTIVATE, LOG_ACTION.VERIFY, LOG_ACTION.UNBIND_DEVICE]);
var MAX_LOG_SHARD_SCAN = 250;
var CODE_PAGE_READ_CONCURRENCY = 32;
var BlobRepository = class {
  store;
  ids;
  constructor(kv) {
    this.store = new DocStore(kv);
    this.ids = {
      tenants: new IdAllocator(this.store, "tenants"),
      admins: new IdAllocator(this.store, "admins"),
      apps: new IdAllocator(this.store, "apps"),
      batches: new IdAllocator(this.store, "batches"),
      codes: new IdAllocator(this.store, "codes", 64),
      versions: new IdAllocator(this.store, "versions"),
      logs: new IdAllocator(this.store, "logs", 64)
    };
  }
  /** 首次使用前完成种子数据写入（幂等） */
  async ready() {
    await ensureSeeded(this.store);
    return this;
  }
  // ---------- 套餐 ----------
  async getPlans() {
    const index = await this.store.readData("plans");
    const plans = await Promise.all((index?.ids ?? []).map((id) => this.store.readData(`plan/${id}`)));
    return plans.filter((plan) => plan !== null).sort((a, b) => a.sort_order - b.sort_order);
  }
  async getPlanByCode(code) {
    const pointer = await this.store.readData(`plancode/${code}`);
    if (!pointer) {
      return null;
    }
    return await this.store.readData(`plan/${pointer.id}`);
  }
  // ---------- 租户 ----------
  async listTenants() {
    const index = await this.store.readData("tenants");
    const tenants = await Promise.all((index?.ids ?? []).map((id) => this.store.readData(`tenant/${id}`)));
    const rows = tenants.filter((tenant) => tenant !== null);
    const result = await Promise.all(
      rows.map(async (tenant) => {
        const adminIds = (await this.store.readData(`tenantadmins/${tenant.id}`))?.ids ?? [];
        const admins = await Promise.all(adminIds.map((id) => this.store.readData(`admin/${id}`)));
        const usernames = admins.filter((admin) => admin !== null).map((admin) => admin.username);
        const appIds = (await this.store.readData(`tenantapps/${tenant.id}`))?.ids ?? [];
        return {
          ...tenant,
          admin_count: usernames.length,
          app_count: appIds.length,
          admin_usernames: usernames.length > 0 ? usernames.join(",") : null
        };
      })
    );
    return result.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  async getTenantById(id) {
    return await this.store.readData(`tenant/${id}`);
  }
  async createTenant(input) {
    const now = nowIso();
    const [tenantId] = await this.ids.tenants.allocate(1);
    const [adminId] = await this.ids.admins.allocate(1);
    await this.store.create(`tenantslug/${input.slug}`, { id: tenantId });
    try {
      await this.store.create(`adminname/${input.adminUsername}`, { id: adminId });
    } catch (error) {
      await this.store.deleteAll(`tenantslug/${input.slug}`).catch(() => void 0);
      throw error;
    }
    const tenant = {
      id: tenantId,
      name: input.name,
      slug: input.slug,
      status: input.status,
      created_at: now,
      updated_at: now
    };
    try {
      await this.store.create(`tenant/${tenantId}`, tenant);
      await this.store.create(`admin/${adminId}`, {
        id: adminId,
        tenant_id: tenantId,
        role: ADMIN_ROLE.TENANT_ADMIN,
        username: input.adminUsername,
        password_hash: input.passwordHash,
        password_salt: input.passwordSalt,
        created_at: now,
        updated_at: now
      });
    } catch (error) {
      await this.store.deleteAll(`tenant/${tenantId}`).catch(() => void 0);
      await this.store.deleteAll(`admin/${adminId}`).catch(() => void 0);
      await this.store.deleteAll(`tenantslug/${input.slug}`).catch(() => void 0);
      await this.store.deleteAll(`adminname/${input.adminUsername}`).catch(() => void 0);
      throw error;
    }
    await this.appendToIndex(`tenantadmins/${tenantId}`, adminId);
    await this.appendToIndex("tenants", tenantId);
    return tenant;
  }
  async updateTenant(input) {
    const current = await this.store.read(`tenant/${input.id}`);
    if (!current) {
      return null;
    }
    const updated = { ...current.data, name: input.name, slug: input.slug, updated_at: nowIso() };
    if (input.slug !== current.data.slug) {
      await this.store.create(`tenantslug/${input.slug}`, { id: input.id });
      try {
        await this.store.write(`tenant/${input.id}`, updated, current.v);
      } catch (error) {
        await this.store.deleteAll(`tenantslug/${input.slug}`).catch(() => void 0);
        throw error;
      }
      await this.store.deleteAll(`tenantslug/${current.data.slug}`).catch(() => void 0);
      return updated;
    }
    try {
      await this.store.write(`tenant/${input.id}`, updated, current.v);
    } catch (error) {
      if (error instanceof CasConflictError) {
        return await this.updateTenant(input);
      }
      throw error;
    }
    return updated;
  }
  async updateTenantStatus(id, status) {
    try {
      await this.mutateExisting(`tenant/${id}`, (tenant) => ({ ...tenant, status, updated_at: nowIso() }));
      return true;
    } catch (error) {
      if (error instanceof PreconditionFailedError2) {
        return false;
      }
      throw error;
    }
  }
  async deleteTenantIfEmpty(id) {
    if (id === DEFAULT_TENANT_ID) {
      return false;
    }
    const tenant = await this.store.readData(`tenant/${id}`);
    if (!tenant) {
      return false;
    }
    const appIds = (await this.store.readData(`tenantapps/${id}`))?.ids ?? [];
    if (appIds.length > 0) {
      return false;
    }
    const adminIds = (await this.store.readData(`tenantadmins/${id}`))?.ids ?? [];
    for (const adminId of adminIds) {
      const admin = await this.store.readData(`admin/${adminId}`);
      if (admin) {
        await this.store.deleteAll(`adminname/${admin.username}`).catch(() => void 0);
      }
      await this.store.deleteAll(`admin/${adminId}`).catch(() => void 0);
    }
    await this.store.deleteAll(`tenantadmins/${id}`).catch(() => void 0);
    await this.store.deleteAll(`tenantslug/${tenant.slug}`).catch(() => void 0);
    await this.store.deleteAll(`tenant/${id}`).catch(() => void 0);
    await this.removeFromIndex("tenants", id);
    return true;
  }
  // ---------- 应用 ----------
  async listApps(tenantId) {
    const apps = await this.listTenantApps(tenantId);
    return apps.map(({ app_secret_hash: _hash, ...rest }) => rest).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  async createApp(input) {
    const now = nowIso();
    const [dbId] = await this.ids.apps.allocate(1);
    await this.store.create(`appid/${input.appId}`, { id: dbId });
    const app2 = {
      id: dbId,
      tenant_id: input.tenantId,
      app_id: input.appId,
      name: input.name,
      description: input.description ?? null,
      purchase_url: input.purchaseUrl ?? null,
      platform: input.platform,
      status: input.status,
      app_secret_hash: input.appSecretHash,
      created_at: now,
      updated_at: now
    };
    try {
      await this.store.create(`app/${dbId}`, app2);
    } catch (error) {
      await this.store.deleteAll(`appid/${input.appId}`).catch(() => void 0);
      throw error;
    }
    await this.appendToIndex(`tenantapps/${input.tenantId}`, dbId);
    const tenant = await this.getTenantById(input.tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${input.tenantId} not found after app creation`);
    }
    return { ...app2, tenant_status: tenant.status };
  }
  async updateAppStatus(appId, tenantId, status) {
    const current = await this.readAppByPublicId(appId);
    if (!current || current.data.tenant_id !== tenantId) {
      return false;
    }
    try {
      await this.store.write(`app/${current.data.id}`, { ...current.data, status, updated_at: nowIso() }, current.v);
      return true;
    } catch (error) {
      if (error instanceof CasConflictError) {
        return await this.updateAppStatus(appId, tenantId, status);
      }
      throw error;
    }
  }
  async updateApp(input) {
    const current = await this.readAppByPublicId(input.appId);
    if (!current || current.data.tenant_id !== input.tenantId) {
      return null;
    }
    const updated = {
      ...current.data,
      name: input.name,
      description: input.description ?? null,
      purchase_url: input.purchaseUrl ?? null,
      platform: input.platform,
      updated_at: nowIso()
    };
    try {
      await this.store.write(`app/${current.data.id}`, updated, current.v);
    } catch (error) {
      if (error instanceof CasConflictError) {
        return await this.updateApp(input);
      }
      throw error;
    }
    return await this.getAppByDbId(current.data.id);
  }
  async updateAppSecretHash(appId, tenantId, appSecretHash) {
    const current = await this.readAppByPublicId(appId);
    if (!current || current.data.tenant_id !== tenantId) {
      return null;
    }
    try {
      await this.store.write(`app/${current.data.id}`, { ...current.data, app_secret_hash: appSecretHash, updated_at: nowIso() }, current.v);
    } catch (error) {
      if (error instanceof CasConflictError) {
        return await this.updateAppSecretHash(appId, tenantId, appSecretHash);
      }
      throw error;
    }
    return await this.getAppByDbId(current.data.id);
  }
  async deleteAppWithData(appDbId) {
    const app2 = await this.store.readData(`app/${appDbId}`);
    if (!app2) {
      return false;
    }
    const index = await this.store.readData(`appcodes/${appDbId}`);
    const entries = index?.entries ?? [];
    const pendingEntries = [];
    for (const entry of entries) {
      if (entry.status === CODE_STATUS.DELETED) {
        continue;
      }
      const record = await this.store.readData(`code/${entry.hash}`);
      if (!record) {
        continue;
      }
      if (record.status === CODE_STATUS.DELETED) {
        await this.syncCodeEntry(appDbId, record).catch(() => void 0);
        continue;
      }
      pendingEntries.push(entry);
    }
    if (pendingEntries.length > 0) {
      return false;
    }
    await this.removeAppLogs(appDbId, app2.tenant_id);
    for (const entry of entries) {
      await this.store.deleteAll(`codeid/${entry.id}`).catch(() => void 0);
      await this.store.deleteAll(`code/${entry.hash}`).catch(() => void 0);
    }
    await this.store.deleteAll(`appcodes/${appDbId}`).catch(() => void 0);
    const batchIds = (await this.store.readData(`appbatches/${appDbId}`))?.ids ?? [];
    for (const batchId of batchIds) {
      await this.store.deleteAll(`batch/${batchId}`).catch(() => void 0);
    }
    await this.store.deleteAll(`appbatches/${appDbId}`).catch(() => void 0);
    const versionIds = (await this.store.readData(`appversions/${appDbId}`))?.ids ?? [];
    for (const versionId of versionIds) {
      await this.store.deleteAll(`version/${versionId}`).catch(() => void 0);
    }
    await this.store.deleteAll(`appversions/${appDbId}`).catch(() => void 0);
    await this.store.deleteAll(`appid/${app2.app_id}`).catch(() => void 0);
    await this.store.deleteAll(`app/${appDbId}`).catch(() => void 0);
    await this.removeFromIndex(`tenantapps/${app2.tenant_id}`, appDbId);
    return true;
  }
  async getAppByPublicId(appId, tenantId) {
    const app2 = await this.readAppByPublicId(appId);
    if (!app2) {
      return null;
    }
    if (tenantId !== void 0 && app2.data.tenant_id !== tenantId) {
      return null;
    }
    return await this.joinAppRow(app2.data);
  }
  // ---------- 批次与激活码 ----------
  async createBatch(input) {
    const [batchId] = await this.ids.batches.allocate(1);
    const batch = {
      id: batchId,
      app_id: input.appDbId,
      plan_id: input.planId,
      quantity: input.quantity,
      note: input.note ?? null,
      created_by: input.createdBy,
      created_at: nowIso()
    };
    await this.store.create(`batch/${batchId}`, batch);
    await this.appendToIndex(`appbatches/${input.appDbId}`, batchId);
    return batchId;
  }
  async createActivationCode(input) {
    await this.createActivationCodes([{ ...input, codePlaintext: null }]);
  }
  async createActivationCodes(inputs) {
    if (inputs.length === 0) {
      return;
    }
    const now = nowIso();
    const ids = await this.ids.codes.allocate(inputs.length);
    const records = [];
    for (let index = 0; index < inputs.length; index += 1) {
      const input = inputs[index];
      const record = {
        id: ids[index],
        batch_id: input.batchId,
        app_id: input.appDbId,
        plan_id: input.planId,
        code_hash: input.codeHash,
        code_suffix: input.codeSuffix,
        status: CODE_STATUS.UNUSED,
        disabled_at: null,
        activated_at: null,
        expires_at: null,
        device_hash: null,
        rebind_count: 0,
        last_rebind_at: null,
        created_by: input.createdBy,
        created_at: now,
        updated_at: now,
        issued_at: null,
        issued_to: null,
        code_plaintext_encrypted: null,
        code_plaintext: input.codePlaintext ?? null
      };
      await this.store.create(`code/${input.codeHash}`, record);
      await this.store.create(`codeid/${record.id}`, { hash: input.codeHash });
      records.push(record);
    }
    const byApp = /* @__PURE__ */ new Map();
    for (const record of records) {
      const list = byApp.get(record.app_id) ?? [];
      list.push(record);
      byApp.set(record.app_id, list);
    }
    for (const [appDbId, appRecords] of byApp) {
      await this.store.mutate(
        `appcodes/${appDbId}`,
        (current) => ({
          entries: [...current?.entries ?? [], ...appRecords.map(toCodeIndexEntry)]
        }),
        12
      );
    }
  }
  async findCodeByHash(codeHash) {
    const record = await this.store.readData(`code/${codeHash}`);
    if (!record) {
      return null;
    }
    return await this.joinCodeDetail(record);
  }
  async claimNextCode(input) {
    const app2 = await this.store.readData(`app/${input.appDbId}`);
    if (!app2 || app2.tenant_id !== input.tenantId) {
      return null;
    }
    let planId;
    if (input.planCode) {
      const plan = await this.getPlanByCode(input.planCode);
      if (!plan) {
        return null;
      }
      planId = plan.id;
    }
    const entries = (await this.store.readData(`appcodes/${input.appDbId}`))?.entries ?? [];
    const candidates = entries.filter((entry) => entry.status === CODE_STATUS.UNUSED && entry.has_plaintext && (planId === void 0 || entry.plan_id === planId)).sort((a, b) => a.id - b.id);
    const now = nowIso();
    for (const candidate of candidates) {
      try {
        const { data: record } = await this.store.mutate(
          `code/${candidate.hash}`,
          (current) => {
            if (!current || current.status !== CODE_STATUS.UNUSED || !current.code_plaintext && !current.code_plaintext_encrypted) {
              throw new PreconditionFailedError2("code no longer unused");
            }
            return { ...current, status: CODE_STATUS.ISSUED, issued_at: now, updated_at: now };
          }
        );
        await this.syncCodeEntry(input.appDbId, record).catch(() => void 0);
        const plan = await this.store.readData(`plan/${record.plan_id}`);
        return {
          codeId: record.id,
          codeHash: record.code_hash,
          codeSuffix: record.code_suffix,
          planCode: plan?.code ?? input.planCode ?? "",
          planName: plan?.name ?? "",
          code: record.code_plaintext,
          encrypted: record.code_plaintext_encrypted
        };
      } catch (error) {
        if (error instanceof PreconditionFailedError2) {
          continue;
        }
        if (error instanceof CasConflictError) {
          return null;
        }
        throw error;
      }
    }
    return null;
  }
  async activateCode(input) {
    const hash = await this.codeHashById(input.codeId);
    if (!hash) {
      return false;
    }
    try {
      const { data: record } = await this.mutateExisting(`code/${hash}`, (code) => {
        if (code.status !== CODE_STATUS.UNUSED && code.status !== CODE_STATUS.ISSUED || code.disabled_at !== null || code.activated_at !== null || code.expires_at !== null || code.device_hash !== null) {
          throw new PreconditionFailedError2("code not activatable");
        }
        return {
          ...code,
          status: CODE_STATUS.ACTIVE,
          activated_at: input.activatedAt,
          expires_at: input.expiresAt,
          device_hash: input.deviceHash,
          updated_at: input.activatedAt
        };
      });
      await this.syncCodeEntry(record.app_id, record).catch(() => void 0);
      return true;
    } catch (error) {
      if (error instanceof PreconditionFailedError2) {
        return false;
      }
      throw error;
    }
  }
  async bindUnboundDevice(input) {
    const result = await this.mutateCodeByHash(await this.codeHashById(input.codeId), (code) => {
      if (code.status !== CODE_STATUS.ACTIVE || code.disabled_at !== null || code.device_hash !== null) {
        throw new PreconditionFailedError2("code not bindable");
      }
      return { ...code, device_hash: input.deviceHash, updated_at: input.boundAt };
    });
    if (result) {
      await this.syncCodeEntry(result.data.app_id, result.data).catch(() => void 0);
    }
    return result !== null;
  }
  async unbindDevice(input) {
    const result = await this.mutateCodeByHash(await this.codeHashById(input.codeId), (code) => {
      if (code.status !== CODE_STATUS.ACTIVE || code.disabled_at !== null || code.device_hash !== input.deviceHash || code.rebind_count >= input.maxRebinds) {
        throw new PreconditionFailedError2("code not unbindable");
      }
      return {
        ...code,
        device_hash: null,
        rebind_count: code.rebind_count + 1,
        last_rebind_at: input.unboundAt,
        updated_at: input.unboundAt
      };
    });
    if (result) {
      await this.syncCodeEntry(result.data.app_id, result.data).catch(() => void 0);
    }
    return result !== null;
  }
  async manuallyUnbindDevice(input) {
    const hash = await this.codeHashById(input.codeId);
    if (!hash) {
      return false;
    }
    const record = await this.store.readData(`code/${hash}`);
    if (!record) {
      return false;
    }
    const app2 = await this.store.readData(`app/${record.app_id}`);
    if (!app2 || app2.tenant_id !== input.tenantId) {
      return false;
    }
    const result = await this.mutateCodeByHash(hash, (code) => {
      if (code.status !== CODE_STATUS.ACTIVE || code.disabled_at !== null || code.device_hash === null || code.expires_at !== null && code.expires_at <= input.changedAt) {
        throw new PreconditionFailedError2("code not manually unbindable");
      }
      return { ...code, device_hash: null, updated_at: input.changedAt };
    });
    if (result) {
      await this.syncCodeEntry(result.data.app_id, result.data).catch(() => void 0);
    }
    return result !== null;
  }
  async softDeleteCode(codeId, tenantId) {
    const hash = await this.codeHashById(codeId);
    if (!hash) {
      return false;
    }
    const record = await this.store.readData(`code/${hash}`);
    if (!record) {
      return false;
    }
    const app2 = await this.store.readData(`app/${record.app_id}`);
    if (!app2 || app2.tenant_id !== tenantId) {
      return false;
    }
    const result = await this.mutateCodeByHash(hash, (code) => ({
      ...code,
      status: CODE_STATUS.DELETED,
      updated_at: nowIso()
    }));
    if (result) {
      await this.syncCodeEntry(result.data.app_id, result.data).catch(() => void 0);
    }
    return result !== null;
  }
  async getCodeById(codeId, tenantId) {
    const detail = await this.readCodeDetailById(codeId);
    if (!detail) {
      return null;
    }
    const app2 = await this.store.readData(`app/${detail.app_id}`);
    if (!app2 || app2.tenant_id !== tenantId) {
      return null;
    }
    return detail;
  }
  async hardDeleteCode(codeId, tenantId) {
    const hash = await this.codeHashById(codeId);
    if (!hash) {
      return false;
    }
    const record = await this.store.readData(`code/${hash}`);
    if (!record) {
      return false;
    }
    const app2 = await this.store.readData(`app/${record.app_id}`);
    if (!app2 || app2.tenant_id !== tenantId) {
      return false;
    }
    await this.detachCodeFromLogs(codeId, app2.tenant_id);
    await this.removeFromIndexEntry(record.app_id, codeId);
    await this.store.deleteAll(`codeid/${codeId}`).catch(() => void 0);
    await this.store.deleteAll(`code/${hash}`).catch(() => void 0);
    return true;
  }
  async updateCodeDisabled(input) {
    const hash = await this.codeHashById(input.codeId);
    if (!hash) {
      return false;
    }
    const record = await this.store.readData(`code/${hash}`);
    if (!record) {
      return false;
    }
    const app2 = await this.store.readData(`app/${record.app_id}`);
    if (!app2 || app2.tenant_id !== input.tenantId) {
      return false;
    }
    const result = await this.mutateCodeByHash(hash, (code) => {
      if (code.status === CODE_STATUS.DELETED) {
        throw new PreconditionFailedError2("code deleted");
      }
      return {
        ...code,
        disabled_at: input.disabled ? input.changedAt : null,
        updated_at: input.changedAt
      };
    });
    if (result) {
      await this.syncCodeEntry(result.data.app_id, result.data).catch(() => void 0);
    }
    return result !== null;
  }
  async listCodes(filters) {
    const { appRows, entriesByApp } = await this.loadTenantCodeIndex(filters.tenantId);
    const appsById = new Map(appRows.map((app2) => [app2.id, app2]));
    const plans = await this.getPlans();
    const plansById = new Map(plans.map((plan) => [plan.id, plan]));
    const filterPlanId = filters.planCode ? plans.find((plan) => plan.code === filters.planCode)?.id : void 0;
    const filtered = [];
    for (const [appDbId, entries] of entriesByApp) {
      const app2 = appsById.get(appDbId);
      if (!app2) {
        continue;
      }
      if (filters.appId && app2.app_id !== filters.appId) {
        continue;
      }
      for (const entry of entries) {
        if (filters.planCode && entry.plan_id !== filterPlanId) {
          continue;
        }
        if (!matchesCodeFilters(entry, app2, filters)) {
          continue;
        }
        filtered.push({ entry, app: app2 });
      }
    }
    filtered.sort((a, b) => b.entry.created_at.localeCompare(a.entry.created_at) || b.entry.id - a.entry.id);
    const offset = (filters.page - 1) * filters.pageSize;
    const pageEntries = filtered.slice(offset, offset + filters.pageSize);
    const records = await mapWithConcurrency(
      pageEntries,
      CODE_PAGE_READ_CONCURRENCY,
      async ({ entry }) => await this.store.readData(`code/${entry.hash}`)
    );
    const batchIds = /* @__PURE__ */ new Set();
    for (const record of records) {
      if (record && record.batch_id !== null) {
        batchIds.add(record.batch_id);
      }
    }
    const batches = /* @__PURE__ */ new Map();
    await Promise.all(
      [...batchIds].map(async (batchId) => {
        const batch = await this.store.readData(`batch/${batchId}`);
        if (batch) {
          batches.set(batchId, batch);
        }
      })
    );
    const items = [];
    const heals = [];
    for (let index = 0; index < pageEntries.length; index += 1) {
      const { entry, app: app2 } = pageEntries[index];
      const record = records[index];
      if (!record) {
        continue;
      }
      heals.push(this.healCodeEntry(app2.id, entry, record));
      const batch = record.batch_id === null ? null : batches.get(record.batch_id) ?? null;
      items.push(toCodeListItem(record, app2, plansById.get(record.plan_id) ?? null, batch));
    }
    if (heals.length > 0) {
      await Promise.all(heals);
    }
    return { items, total: filtered.length };
  }
  // ---------- 日志 ----------
  async listLogs(filters) {
    const dailyStats = await this.loadDailyLogStats(filters.tenantId);
    const hourBases = (await this.store.listBases(`logshard/${filters.tenantId}`)).map((base) => base.split("/").pop() ?? "").filter(Boolean).sort((a, b) => b.localeCompare(a));
    const isFiltered = Boolean(filters.query || filters.appId || filters.action);
    const collected = [];
    let scanned = 0;
    for (const hour of hourBases) {
      if (scanned >= MAX_LOG_SHARD_SCAN) {
        break;
      }
      const shard = await this.store.readData(`logshard/${filters.tenantId}/${hour}`);
      scanned += 1;
      if (!shard) {
        continue;
      }
      if (!isFiltered && collected.length >= filters.page * filters.pageSize) {
        break;
      }
      for (const entry of shard.items) {
        if (matchesLogFilters(entry, filters)) {
          collected.push(entry);
        }
      }
    }
    collected.sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);
    const total = isFiltered ? collected.length : dailyStats.total;
    const offset = (filters.page - 1) * filters.pageSize;
    const items = collected.slice(offset, offset + filters.pageSize).map(toLogListItem);
    return { items, total };
  }
  async insertLog(input) {
    let app2 = null;
    if (input.appDbId !== void 0) {
      app2 = await this.store.readData(`app/${input.appDbId}`);
    }
    let codeSuffix2 = null;
    let codePlaintext = null;
    if (!app2 && input.codeId !== void 0) {
      const hash = await this.codeHashById(input.codeId);
      const code = hash ? await this.store.readData(`code/${hash}`) : null;
      if (code) {
        codeSuffix2 = code.code_suffix;
        codePlaintext = code.code_plaintext;
        app2 = await this.store.readData(`app/${code.app_id}`);
      }
    } else if (input.codeId !== void 0) {
      const hash = await this.codeHashById(input.codeId);
      const code = hash ? await this.store.readData(`code/${hash}`) : null;
      codeSuffix2 = code?.code_suffix ?? null;
      codePlaintext = code?.code_plaintext ?? null;
    }
    if (!app2) {
      return;
    }
    const created = nowIso();
    const entry = {
      id: await this.ids.logs.allocateOne(),
      app_db_id: app2.id,
      code_db_id: input.codeId ?? null,
      action: input.action,
      result: input.result,
      device_hash: input.deviceHash ?? null,
      error_code: input.errorCode ?? null,
      message: input.message ?? null,
      created_at: created,
      code_suffix: codeSuffix2,
      code_plaintext: codePlaintext,
      app_id: app2.app_id,
      app_name: app2.name
    };
    const hourKey = toHourKey(created);
    await this.store.mutate(
      `logshard/${app2.tenant_id}/${hourKey}`,
      (current) => ({ items: [...current?.items ?? [], entry] }),
      12
    );
    const dayKey = created.slice(0, 10);
    const clientFailure = input.result === LOG_RESULT.FAILURE && CLIENT_LOG_ACTIONS.has(input.action) ? 1 : 0;
    await this.store.mutate(`logday/${app2.tenant_id}/${dayKey}`, (current) => ({
      total: (current?.total ?? 0) + 1,
      success: (current?.success ?? 0) + (input.result === LOG_RESULT.SUCCESS ? 1 : 0),
      client_failures: (current?.client_failures ?? 0) + clientFailure
    }));
  }
  // ---------- 版本管理 ----------
  async listVersions(filters) {
    const appRows = await this.listTenantApps(filters.tenantId);
    const appsByDbId = new Map(appRows.map((app2) => [app2.id, app2]));
    const targetApps = filters.appId ? appRows.filter((app2) => app2.app_id === filters.appId) : appRows;
    const collected = [];
    for (const app2 of targetApps) {
      const ids = (await this.store.readData(`appversions/${app2.id}`))?.ids ?? [];
      const versions = await Promise.all(ids.map((id) => this.store.readData(`version/${id}`)));
      for (const version of versions) {
        if (version && !version.deleted_at && (!filters.status || version.status === filters.status) && (!filters.version || version.version.includes(filters.version))) {
          collected.push(version);
        }
      }
    }
    collected.sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);
    const offset = (filters.page - 1) * filters.pageSize;
    const items = collected.slice(offset, offset + filters.pageSize).map((version) => {
      const app2 = appsByDbId.get(version.app_id);
      return {
        ...version,
        app_public_id: app2?.app_id ?? "",
        app_name: app2?.name ?? "",
        tenant_id: app2?.tenant_id ?? filters.tenantId
      };
    });
    return { items, total: collected.length };
  }
  async getVersionById(versionId) {
    const version = await this.store.readData(`version/${versionId}`);
    return version && !version.deleted_at ? version : null;
  }
  async getVersionWithTenant(versionId) {
    const version = await this.getVersionById(versionId);
    if (!version) {
      return null;
    }
    const app2 = await this.store.readData(`app/${version.app_id}`);
    if (!app2) {
      return null;
    }
    return { ...version, tenant_id: app2.tenant_id };
  }
  async getVersionByAppAndCode(appDbId, versionCode) {
    const ids = (await this.store.readData(`appversions/${appDbId}`))?.ids ?? [];
    const versions = await Promise.all(ids.map((id) => this.store.readData(`version/${id}`)));
    return versions.find((version) => version && !version.deleted_at && version.version_code === versionCode) ?? null;
  }
  async createVersion(input) {
    const now = nowIso();
    const [versionId] = await this.ids.versions.allocate(1);
    const version = {
      id: versionId,
      app_id: input.appDbId,
      version: input.version,
      version_code: input.versionCode,
      release_notes: input.releaseNotes,
      download_url: input.downloadUrl ?? "",
      is_forced: input.isForced ? 1 : 0,
      status: "draft",
      published_at: null,
      created_by: input.createdBy,
      created_at: now,
      updated_at: now,
      deleted_at: null
    };
    await this.store.create(`version/${versionId}`, version);
    await this.appendToIndex(`appversions/${input.appDbId}`, versionId);
    return version;
  }
  async updateVersion(input) {
    const current = await this.store.read(`version/${input.versionId}`);
    if (!current || current.data.deleted_at) {
      return null;
    }
    const updated = {
      ...current.data,
      version: input.version,
      version_code: input.versionCode,
      release_notes: input.releaseNotes,
      download_url: input.downloadUrl ?? "",
      is_forced: input.isForced ? 1 : 0,
      updated_at: nowIso()
    };
    try {
      await this.store.write(`version/${input.versionId}`, updated, current.v);
    } catch (error) {
      if (error instanceof CasConflictError) {
        return await this.updateVersion(input);
      }
      throw error;
    }
    return updated;
  }
  async publishVersion(versionId, publishedAt) {
    try {
      await this.mutateExisting(`version/${versionId}`, (version) => {
        if (version.deleted_at || version.status !== "draft") {
          throw new PreconditionFailedError2("version not publishable");
        }
        return { ...version, status: "published", published_at: publishedAt, updated_at: nowIso() };
      });
      return true;
    } catch (error) {
      if (error instanceof PreconditionFailedError2) {
        return false;
      }
      throw error;
    }
  }
  async unpublishVersion(versionId) {
    try {
      await this.mutateExisting(`version/${versionId}`, (version) => {
        if (version.deleted_at || version.status !== "published") {
          throw new PreconditionFailedError2("version not unpublishable");
        }
        return { ...version, status: "draft", published_at: null, updated_at: nowIso() };
      });
      return true;
    } catch (error) {
      if (error instanceof PreconditionFailedError2) {
        return false;
      }
      throw error;
    }
  }
  async softDeleteVersion(versionId) {
    try {
      await this.mutateExisting(`version/${versionId}`, (version) => {
        if (version.deleted_at) {
          throw new PreconditionFailedError2("version already deleted");
        }
        return { ...version, deleted_at: nowIso(), updated_at: nowIso() };
      });
      return true;
    } catch (error) {
      if (error instanceof PreconditionFailedError2) {
        return false;
      }
      throw error;
    }
  }
  async getLatestPublishedVersion(appDbId) {
    const ids = (await this.store.readData(`appversions/${appDbId}`))?.ids ?? [];
    const versions = await Promise.all(ids.map((id) => this.store.readData(`version/${id}`)));
    const published = versions.filter(
      (version) => version !== null && !version.deleted_at && version.status === "published"
    );
    if (published.length === 0) {
      return null;
    }
    return published.reduce((latest, version) => version.version_code > latest.version_code ? version : latest);
  }
  // ---------- 仪表盘 ----------
  async getDashboardStats(tenantId) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const trendDates = buildLastSevenDates();
    const { appRows, entriesByApp } = await this.loadTenantCodeIndex(tenantId);
    const overview = {
      apps_total: appRows.length,
      apps_active: appRows.filter((app2) => app2.status === APP_STATUS.ACTIVE).length,
      codes_total: 0,
      codes_unused: 0,
      codes_active: 0,
      codes_disabled: 0,
      codes_expired: 0,
      codes_deleted: 0,
      logs_today: 0,
      client_failures_today: 0
    };
    const ranking = appRows.map((app2) => ({
      app_id: app2.app_id,
      app_name: app2.name,
      platform: app2.platform,
      total: 0,
      active: 0,
      unused: 0,
      disabled: 0,
      expired: 0,
      deleted: 0
    }));
    const rankingByAppId = new Map(ranking.map((row) => [row.app_id, row]));
    const countByPlan = /* @__PURE__ */ new Map();
    const activatedByDate = /* @__PURE__ */ new Map();
    const expiredByDate = /* @__PURE__ */ new Map();
    const activeByDate = new Map(trendDates.map((date) => [date, 0]));
    for (const [appDbId, entries] of entriesByApp) {
      const app2 = appRows.find((row) => row.id === appDbId);
      const rankingRow = app2 ? rankingByAppId.get(app2.app_id) : void 0;
      for (const entry of entries) {
        overview.codes_total += 1;
        countByPlan.set(entry.plan_id, (countByPlan.get(entry.plan_id) ?? 0) + 1);
        if (rankingRow) {
          rankingRow.total += 1;
        }
        if (entry.status === CODE_STATUS.UNUSED && !entry.disabled) {
          overview.codes_unused += 1;
          if (rankingRow) {
            rankingRow.unused += 1;
          }
        } else if (entry.status === CODE_STATUS.ACTIVE && !entry.disabled) {
          const expired = entry.expires_at !== null && entry.expires_at <= now;
          if (expired) {
            overview.codes_expired += 1;
            if (rankingRow) {
              rankingRow.expired += 1;
            }
          } else {
            overview.codes_active += 1;
            if (rankingRow) {
              rankingRow.active += 1;
            }
          }
        } else if (entry.status !== CODE_STATUS.DELETED && entry.disabled) {
          overview.codes_disabled += 1;
          if (rankingRow) {
            rankingRow.disabled += 1;
          }
        }
        if (entry.status === CODE_STATUS.DELETED) {
          overview.codes_deleted += 1;
          if (rankingRow) {
            rankingRow.deleted += 1;
          }
        }
        if (entry.activated_at && entry.status !== CODE_STATUS.DELETED) {
          const date = entry.activated_at.slice(0, 10);
          activatedByDate.set(date, (activatedByDate.get(date) ?? 0) + 1);
        }
        if (entry.status === CODE_STATUS.ACTIVE && !entry.disabled && entry.expires_at) {
          const date = entry.expires_at.slice(0, 10);
          expiredByDate.set(date, (expiredByDate.get(date) ?? 0) + 1);
        }
        for (const date of trendDates) {
          const nextDate = nextUtcDate(date);
          if (entry.status === CODE_STATUS.ACTIVE && !entry.disabled && entry.activated_at !== null && entry.activated_at < nextDate && (entry.expires_at === null || entry.expires_at >= nextDate)) {
            activeByDate.set(date, (activeByDate.get(date) ?? 0) + 1);
          }
        }
      }
    }
    const today = now.slice(0, 10);
    const dailyStats = await this.loadDailyLogStats(tenantId);
    const todayStats = dailyStats.byDate.get(today) ?? { total: 0, success: 0, client_failures: 0 };
    overview.logs_today = todayStats.total;
    overview.client_failures_today = todayStats.client_failures;
    const plans = await this.getPlans();
    const planDistribution = plans.map((plan) => ({
      plan_code: plan.code,
      plan_name: plan.name,
      count: countByPlan.get(plan.id) ?? 0
    })).sort((a, b) => b.count - a.count);
    return {
      overview,
      code_status: [
        { status: CODE_STATUS.UNUSED, count: overview.codes_unused },
        { status: CODE_STATUS.ACTIVE, count: overview.codes_active },
        { status: CODE_DERIVED_STATUS.DISABLED, count: overview.codes_disabled },
        { status: CODE_DERIVED_STATUS.EXPIRED, count: overview.codes_expired },
        { status: CODE_STATUS.DELETED, count: overview.codes_deleted }
      ],
      app_code_ranking: ranking.sort((a, b) => b.total - a.total).slice(0, 8),
      plan_distribution: planDistribution,
      log_trend: trendDates.map((date) => {
        const stats = dailyStats.byDate.get(date);
        return {
          date,
          success: stats?.success ?? 0,
          failure: stats ? stats.total - stats.success : 0
        };
      }),
      code_trend: trendDates.map((date) => ({
        date,
        activated: activatedByDate.get(date) ?? 0,
        expired: expiredByDate.get(date) ?? 0,
        active: activeByDate.get(date) ?? 0
      }))
    };
  }
  // ---------- 管理员 ----------
  async getAdminByUsername(username) {
    const pointer = await this.store.readData(`adminname/${username}`);
    if (!pointer) {
      return null;
    }
    return await this.readJoinedAdmin(pointer.id);
  }
  async getAdminByTenantAndUsername(tenant, username) {
    const pointer = await this.store.readData(`adminname/${username}`);
    if (!pointer) {
      return null;
    }
    const admin = await this.readJoinedAdmin(pointer.id);
    if (!admin || admin.tenant_id === null) {
      return null;
    }
    const tenantRow = await this.getTenantById(admin.tenant_id);
    if (!tenantRow) {
      return null;
    }
    const normalized = tenant.toLowerCase();
    if (tenantRow.name !== tenant && tenantRow.slug !== normalized) {
      return null;
    }
    return admin;
  }
  async getAdminById(id) {
    return await this.readJoinedAdmin(id);
  }
  async getAdminCredentialsById(id) {
    return await this.readJoinedAdmin(id);
  }
  async createAdmin(input) {
    const now = nowIso();
    const [adminId] = await this.ids.admins.allocate(1);
    await this.store.create(`adminname/${input.username}`, { id: adminId });
    const admin = {
      id: adminId,
      tenant_id: input.tenantId ?? null,
      role: input.role,
      username: input.username,
      password_hash: input.passwordHash,
      password_salt: input.passwordSalt,
      created_at: now,
      updated_at: now
    };
    try {
      await this.store.create(`admin/${adminId}`, admin);
    } catch (error) {
      await this.store.deleteAll(`adminname/${input.username}`).catch(() => void 0);
      throw error;
    }
    if (admin.tenant_id !== null && admin.role === ADMIN_ROLE.TENANT_ADMIN) {
      await this.appendToIndex(`tenantadmins/${admin.tenant_id}`, adminId);
    }
  }
  async listTenantAdmins(tenantId) {
    const ids = (await this.store.readData(`tenantadmins/${tenantId}`))?.ids ?? [];
    const admins = await Promise.all(ids.map((id) => this.store.readData(`admin/${id}`)));
    return admins.filter((admin) => admin !== null).map(({ id, username, created_at, updated_at }) => ({ id, username, created_at, updated_at })).sort((a, b) => a.created_at.localeCompare(b.created_at));
  }
  async updateAdminPassword(input) {
    try {
      await this.mutateExisting(`admin/${input.adminId}`, (admin) => ({
        ...admin,
        password_hash: input.passwordHash,
        password_salt: input.passwordSalt,
        updated_at: nowIso()
      }));
      return true;
    } catch (error) {
      if (error instanceof PreconditionFailedError2) {
        return false;
      }
      throw error;
    }
  }
  // ---------- 内部工具 ----------
  async mutateExisting(base, fn) {
    return await this.store.mutate(base, (current) => {
      if (!current) {
        throw new PreconditionFailedError2(`${base} missing`);
      }
      return fn(current);
    });
  }
  async codeHashById(codeId) {
    const pointer = await this.store.readData(`codeid/${codeId}`);
    return pointer?.hash ?? null;
  }
  async mutateCodeByHash(hash, fn) {
    if (!hash) {
      return null;
    }
    try {
      return await this.mutateExisting(`code/${hash}`, fn);
    } catch (error) {
      if (error instanceof PreconditionFailedError2) {
        return null;
      }
      throw error;
    }
  }
  async readAppByPublicId(appId) {
    const pointer = await this.store.readData(`appid/${appId}`);
    if (!pointer) {
      return null;
    }
    return await this.store.read(`app/${pointer.id}`);
  }
  async getAppByDbId(dbId) {
    const app2 = await this.store.readData(`app/${dbId}`);
    if (!app2) {
      return null;
    }
    return await this.joinAppRow(app2);
  }
  async joinAppRow(app2) {
    const tenant = await this.getTenantById(app2.tenant_id);
    if (!tenant) {
      return null;
    }
    return { ...app2, tenant_status: tenant.status };
  }
  async listTenantApps(tenantId) {
    const ids = (await this.store.readData(`tenantapps/${tenantId}`))?.ids ?? [];
    const apps = await Promise.all(ids.map((id) => this.store.readData(`app/${id}`)));
    return apps.filter((app2) => app2 !== null);
  }
  async readJoinedAdmin(id) {
    const admin = await this.store.readData(`admin/${id}`);
    if (!admin) {
      return null;
    }
    const tenant = admin.tenant_id !== null ? await this.getTenantById(admin.tenant_id) : null;
    return {
      ...admin,
      tenant_name: tenant?.name ?? null,
      tenant_status: tenant?.status ?? null
    };
  }
  async joinCodeDetail(record) {
    if (!record) {
      return null;
    }
    const app2 = await this.store.readData(`app/${record.app_id}`);
    const plan = await this.store.readData(`plan/${record.plan_id}`);
    if (!app2 || !plan) {
      return null;
    }
    return {
      ...record,
      app_public_id: app2.app_id,
      app_name: app2.name,
      app_platform: app2.platform,
      app_status: app2.status,
      plan_code: plan.code,
      plan_name: plan.name,
      duration_days: plan.duration_days
    };
  }
  async readCodeDetailById(codeId) {
    const hash = await this.codeHashById(codeId);
    if (!hash) {
      return null;
    }
    return await this.joinCodeDetail(await this.store.readData(`code/${hash}`));
  }
  async appendToIndex(base, id) {
    await this.store.mutate(base, (current) => ({ ids: [...current?.ids ?? [], id] }), 12);
  }
  async removeFromIndex(base, id) {
    await this.store.mutate(base, (current) => ({ ids: (current?.ids ?? []).filter((item) => item !== id) }), 12);
  }
  async removeFromIndexEntry(appDbId, codeId) {
    await this.store.mutate(`appcodes/${appDbId}`, (current) => ({
      entries: (current?.entries ?? []).filter((entry) => entry.id !== codeId)
    }));
  }
  async syncCodeEntry(appDbId, record) {
    const entry = toCodeIndexEntry(record);
    await this.store.mutate(`appcodes/${appDbId}`, (current) => {
      const entries = [...current?.entries ?? []];
      const index = entries.findIndex((item) => item.id === entry.id);
      if (index === -1) {
        entries.push(entry);
      } else {
        entries[index] = entry;
      }
      return { entries };
    }, 3);
  }
  /** 页面渲染时发现索引与记录不一致则顺手修复（读路径自愈） */
  async healCodeEntry(appDbId, entry, record) {
    if (entry.status === record.status && entry.disabled === (record.disabled_at !== null)) {
      return;
    }
    try {
      await this.syncCodeEntry(appDbId, record);
    } catch {
    }
  }
  async loadTenantCodeIndex(tenantId) {
    const appRows = await this.listTenantApps(tenantId);
    const entriesByApp = /* @__PURE__ */ new Map();
    await Promise.all(
      appRows.map(async (app2) => {
        const index = await this.store.readData(`appcodes/${app2.id}`);
        entriesByApp.set(app2.id, index?.entries ?? []);
      })
    );
    return { appRows, entriesByApp };
  }
  async loadDailyLogStats(tenantId) {
    const dayBases = await this.store.listBases(`logday/${tenantId}`);
    const byDate = /* @__PURE__ */ new Map();
    let total = 0;
    const limited = dayBases.slice(-400);
    await Promise.all(
      limited.map(async (base) => {
        const day = base.split("/").pop() ?? "";
        const stats = await this.store.readData(base);
        if (stats) {
          byDate.set(day, stats);
          total += stats.total;
        }
      })
    );
    return { total, byDate };
  }
  async removeAppLogs(appDbId, tenantId) {
    const hourBases = await this.store.listBases(`logshard/${tenantId}`);
    const dailyDelta = /* @__PURE__ */ new Map();
    for (const base of hourBases) {
      const shard = await this.store.read(base);
      if (!shard) {
        continue;
      }
      const removed = shard.data.items.filter((entry) => entry.app_db_id === appDbId);
      if (removed.length === 0) {
        continue;
      }
      const remaining = shard.data.items.filter((entry) => entry.app_db_id !== appDbId);
      await this.store.write(base, { items: remaining }, shard.v).catch(() => void 0);
      for (const entry of removed) {
        const day = entry.created_at.slice(0, 10);
        const delta = dailyDelta.get(day) ?? { total: 0, success: 0, client_failures: 0 };
        delta.total += 1;
        if (entry.result === LOG_RESULT.SUCCESS) {
          delta.success += 1;
        }
        if (entry.result === LOG_RESULT.FAILURE && CLIENT_LOG_ACTIONS.has(entry.action)) {
          delta.client_failures += 1;
        }
        dailyDelta.set(day, delta);
      }
    }
    for (const [day, delta] of dailyDelta) {
      await this.store.mutate(`logday/${tenantId}/${day}`, (current) => ({
        total: Math.max(0, (current?.total ?? 0) - delta.total),
        success: Math.max(0, (current?.success ?? 0) - delta.success),
        client_failures: Math.max(0, (current?.client_failures ?? 0) - delta.client_failures)
      })).catch(() => void 0);
    }
  }
  async detachCodeFromLogs(codeId, tenantId) {
    const hourBases = await this.store.listBases(`logshard/${tenantId}`);
    for (const base of hourBases) {
      const shard = await this.store.read(base);
      if (!shard || !shard.data.items.some((entry) => entry.code_db_id === codeId)) {
        continue;
      }
      const items = shard.data.items.map(
        (entry) => entry.code_db_id === codeId ? { ...entry, code_db_id: null, code_suffix: null, code_plaintext: null } : entry
      );
      await this.store.write(base, { items }, shard.v).catch(() => void 0);
    }
  }
};
async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    for (; ; ) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) {
        return;
      }
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}
function toCodeIndexEntry(record) {
  return {
    id: record.id,
    hash: record.code_hash,
    suffix: record.code_suffix,
    code_plaintext: record.code_plaintext,
    status: record.status,
    disabled: record.disabled_at !== null,
    activated_at: record.activated_at,
    expires_at: record.expires_at,
    plan_id: record.plan_id,
    created_at: record.created_at,
    has_plaintext: record.code_plaintext !== null || record.code_plaintext_encrypted !== null
  };
}
function matchesCodeFilters(entry, app2, filters) {
  if (filters.query) {
    const query = filters.query;
    if (!entry.suffix.includes(query) && !(entry.code_plaintext ?? "").includes(query) && !app2.app_id.includes(query) && !app2.name.includes(query)) {
      return false;
    }
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  switch (filters.status) {
    case void 0:
      return true;
    case CODE_DERIVED_STATUS.DISABLED:
      return entry.disabled && entry.status !== CODE_STATUS.DELETED;
    case CODE_DERIVED_STATUS.EXPIRED:
      return entry.status === CODE_STATUS.ACTIVE && !entry.disabled && entry.expires_at !== null && entry.expires_at <= now;
    case CODE_STATUS.UNUSED:
    case CODE_STATUS.ACTIVE:
      return entry.status === filters.status && !entry.disabled;
    default:
      return entry.status === filters.status;
  }
}
function toCodeListItem(record, app2, plan, batch) {
  return {
    id: record.id,
    code_suffix: record.code_suffix,
    code_plaintext: record.code_plaintext,
    status: record.status,
    disabled_at: record.disabled_at,
    activated_at: record.activated_at,
    expires_at: record.expires_at,
    device_hash: record.device_hash,
    rebind_count: record.rebind_count,
    last_rebind_at: record.last_rebind_at,
    created_at: record.created_at,
    app_id: app2.app_id,
    app_name: app2.name,
    app_platform: app2.platform,
    plan_code: plan?.code ?? "",
    plan_name: plan?.name ?? "",
    duration_days: plan?.duration_days ?? 0,
    batch_id: record.batch_id,
    batch_note: batch?.note ?? null
  };
}
function matchesLogFilters(entry, filters) {
  if (filters.query) {
    const query = filters.query;
    if (!(entry.code_suffix ?? "").includes(query) && !(entry.error_code ?? "").includes(query) && !(entry.message ?? "").includes(query)) {
      return false;
    }
  }
  if (filters.appId && entry.app_id !== filters.appId) {
    return false;
  }
  if (filters.action && entry.action !== filters.action) {
    return false;
  }
  return true;
}
function toLogListItem(entry) {
  return {
    id: entry.id,
    action: entry.action,
    result: entry.result,
    device_hash: entry.device_hash,
    error_code: entry.error_code,
    message: entry.message,
    created_at: entry.created_at,
    code_suffix: entry.code_suffix,
    code_plaintext: entry.code_plaintext,
    app_id: entry.app_id,
    app_name: entry.app_name
  };
}
function toHourKey(iso) {
  return iso.slice(0, 13).replace(/[-T]/g, "");
}
function startOfUtcDayOffset(offsetDays) {
  const date = /* @__PURE__ */ new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString();
}
function buildLastSevenDates() {
  return Array.from({ length: 7 }, (_, index) => startOfUtcDayOffset(index - 6).slice(0, 10));
}
function nextUtcDate(date) {
  const nextDate = /* @__PURE__ */ new Date(`${date}T00:00:00.000Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  return nextDate.toISOString().slice(0, 10);
}

// worker/src/blobstore/sdk-kv.ts
var DEFAULT_BLOB_NAMESPACE = "license-manager";
var kvCache = /* @__PURE__ */ new Map();
async function createSdkBlobKv(namespace) {
  const cached = kvCache.get(namespace);
  if (cached) {
    return cached;
  }
  const kv = await createSdkBlobKvOnce(namespace);
  kvCache.set(namespace, kv);
  return kv;
}
async function createSdkBlobKvOnce(namespace) {
  const mod = await Promise.resolve().then(() => __toESM(require_dist(), 1));
  const store = mod.getStore({ name: namespace, consistency: "strong" });
  return {
    async get(key) {
      const value = await store.get(key, { type: "text" });
      return typeof value === "string" ? value : null;
    },
    async set(key, value, options) {
      try {
        await store.set(key, value, options);
        return true;
      } catch (error) {
        if (error && typeof error === "object" && error.code === "PRECONDITION_FAILED") {
          return false;
        }
        throw error;
      }
    },
    async delete(key) {
      await store.delete(key);
    },
    async list(prefix) {
      const page = await store.list({ prefix });
      const keys = [];
      for (const blob of page.blobs ?? []) {
        if (typeof blob?.key === "string") {
          keys.push(blob.key);
        }
      }
      return keys.sort();
    }
  };
}

// worker/src/repository.ts
var Repository = class {
  constructor(db) {
    this.db = db;
  }
  db;
  async getPlans() {
    const result = await this.db.prepare("SELECT id, code, name, duration_days, sort_order, created_at FROM plans ORDER BY sort_order ASC").all();
    return result.results ?? [];
  }
  async getPlanByCode(code) {
    return await this.db.prepare("SELECT id, code, name, duration_days, sort_order, created_at FROM plans WHERE code = ?").bind(code).first();
  }
  async listTenants() {
    const result = await this.db.prepare(
      `SELECT t.id, t.name, t.slug, t.status, t.created_at, t.updated_at,
                COUNT(DISTINCT u.id) AS admin_count,
                COUNT(DISTINCT a.id) AS app_count,
                GROUP_CONCAT(DISTINCT u.username) AS admin_usernames
         FROM tenants t
         LEFT JOIN admin_users u ON u.tenant_id = t.id AND u.role = 'tenant_admin'
         LEFT JOIN apps a ON a.tenant_id = t.id
         GROUP BY t.id
         ORDER BY t.created_at DESC`
    ).all();
    return result.results ?? [];
  }
  async getTenantById(id) {
    return await this.db.prepare("SELECT id, name, slug, status, created_at, updated_at FROM tenants WHERE id = ?").bind(id).first();
  }
  async createTenant(input) {
    const updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    await this.db.batch([
      this.db.prepare("INSERT INTO tenants (name, slug, status, updated_at) VALUES (?, ?, ?, ?)").bind(input.name, input.slug, input.status, updatedAt),
      this.db.prepare(
        `INSERT INTO admin_users (tenant_id, role, username, password_hash, password_salt, updated_at)
           SELECT id, 'tenant_admin', ?, ?, ?, ? FROM tenants WHERE slug = ?`
      ).bind(input.adminUsername, input.passwordHash, input.passwordSalt, updatedAt, input.slug)
    ]);
    const tenant = await this.db.prepare("SELECT id, name, slug, status, created_at, updated_at FROM tenants WHERE slug = ?").bind(input.slug).first();
    if (!tenant) {
      throw new Error("Failed to create tenant");
    }
    return tenant;
  }
  async updateTenant(input) {
    const result = await this.db.prepare("UPDATE tenants SET name = ?, slug = ?, updated_at = ? WHERE id = ?").bind(input.name, input.slug, (/* @__PURE__ */ new Date()).toISOString(), input.id).run();
    return result.meta.changes === 1 ? await this.getTenantById(input.id) : null;
  }
  async updateTenantStatus(id, status) {
    const result = await this.db.prepare("UPDATE tenants SET status = ?, updated_at = ? WHERE id = ?").bind(status, (/* @__PURE__ */ new Date()).toISOString(), id).run();
    return result.meta.changes === 1;
  }
  async deleteTenantIfEmpty(id) {
    const [, result] = await this.db.batch([
      this.db.prepare(
        `DELETE FROM admin_users
           WHERE tenant_id = ?
             AND role = 'tenant_admin'
             AND EXISTS (SELECT 1 FROM tenants WHERE id = ? AND id != 1)
             AND NOT EXISTS (SELECT 1 FROM apps WHERE tenant_id = ?)`
      ).bind(id, id, id),
      this.db.prepare(
        `DELETE FROM tenants
           WHERE id = ?
             AND id != 1
             AND NOT EXISTS (SELECT 1 FROM apps WHERE tenant_id = ?)
             AND NOT EXISTS (SELECT 1 FROM admin_users WHERE tenant_id = ?)`
      ).bind(id, id, id)
    ]);
    return result.meta.changes === 1;
  }
  async listApps(tenantId) {
    const result = await this.db.prepare(
      "SELECT id, tenant_id, app_id, name, description, purchase_url, platform, status, created_at, updated_at FROM apps WHERE tenant_id = ? ORDER BY created_at DESC"
    ).bind(tenantId).all();
    return result.results ?? [];
  }
  async createApp(input) {
    await this.db.prepare(
      `INSERT INTO apps (tenant_id, app_id, name, description, purchase_url, platform, status, app_secret_hash, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      input.tenantId,
      input.appId,
      input.name,
      input.description ?? null,
      input.purchaseUrl ?? null,
      input.platform,
      input.status,
      input.appSecretHash,
      (/* @__PURE__ */ new Date()).toISOString()
    ).run();
    const app2 = await this.getAppByPublicId(input.appId, input.tenantId);
    if (!app2) {
      throw new Error("Failed to create app");
    }
    return app2;
  }
  async updateAppStatus(appId, tenantId, status) {
    const result = await this.db.prepare("UPDATE apps SET status = ?, updated_at = ? WHERE app_id = ? AND tenant_id = ?").bind(status, (/* @__PURE__ */ new Date()).toISOString(), appId, tenantId).run();
    return result.meta.changes === 1;
  }
  async updateApp(input) {
    const result = await this.db.prepare("UPDATE apps SET name = ?, description = ?, purchase_url = ?, platform = ?, updated_at = ? WHERE app_id = ? AND tenant_id = ?").bind(input.name, input.description ?? null, input.purchaseUrl ?? null, input.platform, (/* @__PURE__ */ new Date()).toISOString(), input.appId, input.tenantId).run();
    if (result.meta.changes !== 1) {
      return null;
    }
    return await this.getAppByPublicId(input.appId, input.tenantId);
  }
  async updateAppSecretHash(appId, tenantId, appSecretHash) {
    const result = await this.db.prepare("UPDATE apps SET app_secret_hash = ?, updated_at = ? WHERE app_id = ? AND tenant_id = ?").bind(appSecretHash, (/* @__PURE__ */ new Date()).toISOString(), appId, tenantId).run();
    if (result.meta.changes !== 1) {
      return null;
    }
    return await this.getAppByPublicId(appId, tenantId);
  }
  async deleteAppWithData(appDbId) {
    const pending = await this.db.prepare("SELECT COUNT(*) AS total FROM activation_codes WHERE app_id = ? AND status != 'deleted'").bind(appDbId).first();
    if ((pending?.total ?? 0) > 0) {
      return false;
    }
    const result = await this.db.batch([
      this.db.prepare(
        "DELETE FROM activation_logs WHERE app_id = ? OR code_id IN (SELECT id FROM activation_codes WHERE app_id = ?)"
      ).bind(appDbId, appDbId),
      this.db.prepare("DELETE FROM activation_codes WHERE app_id = ?").bind(appDbId),
      this.db.prepare("DELETE FROM activation_batches WHERE app_id = ?").bind(appDbId),
      this.db.prepare("DELETE FROM versions WHERE app_id = ?").bind(appDbId),
      this.db.prepare("DELETE FROM apps WHERE id = ?").bind(appDbId)
    ]);
    const last = result[result.length - 1];
    return last?.meta.changes === 1;
  }
  async getAppByPublicId(appId, tenantId) {
    const tenantCondition = tenantId === void 0 ? "" : " AND a.tenant_id = ?";
    return await this.db.prepare(
      `SELECT a.id, a.tenant_id, t.status AS tenant_status, a.app_id, a.name, a.description, a.purchase_url,
                a.platform, a.status, a.app_secret_hash, a.created_at, a.updated_at
         FROM apps a JOIN tenants t ON t.id = a.tenant_id
         WHERE a.app_id = ?${tenantCondition}`
    ).bind(...tenantId === void 0 ? [appId] : [appId, tenantId]).first();
  }
  async createBatch(input) {
    const result = await this.db.prepare(
      `INSERT INTO activation_batches (app_id, plan_id, quantity, note, created_by)
         VALUES (?, ?, ?, ?, ?)`
    ).bind(input.appDbId, input.planId, input.quantity, input.note ?? null, input.createdBy).run();
    return Number(result.meta.last_row_id);
  }
  async createActivationCode(input) {
    await this.db.prepare(
      `INSERT INTO activation_codes
           (batch_id, app_id, plan_id, code_hash, code_suffix, status, activated_at, expires_at, device_hash, created_by, updated_at)
         VALUES (?, ?, ?, ?, ?, 'unused', NULL, NULL, NULL, ?, ?)`
    ).bind(
      input.batchId,
      input.appDbId,
      input.planId,
      input.codeHash,
      input.codeSuffix,
      input.createdBy,
      (/* @__PURE__ */ new Date()).toISOString()
    ).run();
  }
  async createActivationCodes(inputs) {
    if (inputs.length === 0) {
      return;
    }
    const updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    const CHUNK_SIZE = 10;
    for (let i = 0; i < inputs.length; i += CHUNK_SIZE) {
      const chunk = inputs.slice(i, i + CHUNK_SIZE);
      const statement = buildActivationCodeInsertStatement(chunk, updatedAt);
      await this.db.prepare(statement.sql).bind(...statement.bindings).run();
    }
  }
  async findCodeByHash(codeHash) {
    return await this.db.prepare(
      `SELECT
           c.*,
           a.app_id AS app_public_id,
           a.name AS app_name,
           a.platform AS app_platform,
           a.status AS app_status,
           p.code AS plan_code,
           p.name AS plan_name,
           p.duration_days AS duration_days
         FROM activation_codes c
         JOIN apps a ON a.id = c.app_id
         JOIN plans p ON p.id = c.plan_id
         WHERE c.code_hash = ?`
    ).bind(codeHash).first();
  }
  /**
   * 分销商取码：原子取走指定应用（可限定套餐）最早一张「未售出且含明文或存量加密明文」的激活码，置为 issued。
   * 并发安全：UPDATE 时再次校验 status='unused'，被并发抢先则返回 null（调用方可重试）。
   * 明文优先：新激活码明文直接入库；存量加密码返回 encrypted 字段由 service 层解密。
   */
  async claimNextCode(input) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const baseSql = `
        SELECT c.id, c.code_hash, c.code_suffix, p.code AS plan_code, p.name AS plan_name, c.code_plaintext, c.code_plaintext_encrypted AS encrypted
        FROM activation_codes c
        JOIN apps a ON a.id = c.app_id
        JOIN plans p ON p.id = c.plan_id
        WHERE a.tenant_id = ?
          AND c.app_id = ?
          AND c.status = 'unused'
          AND (c.code_plaintext IS NOT NULL OR c.code_plaintext_encrypted IS NOT NULL)`;
    const planClause = input.planCode ? " AND p.code = ?" : "";
    const bindings = input.planCode ? [input.tenantId, input.appDbId, input.planCode] : [input.tenantId, input.appDbId];
    const candidate = await this.db.prepare(`${baseSql}${planClause} ORDER BY c.id ASC LIMIT 1`).bind(...bindings).first();
    if (!candidate || !candidate.code_plaintext && !candidate.encrypted) {
      return null;
    }
    const updated = await this.db.prepare(
      `UPDATE activation_codes
         SET status = 'issued', issued_at = ?, updated_at = ?
         WHERE id = ? AND status = 'unused'`
    ).bind(now, now, candidate.id).run();
    if (updated.meta.changes !== 1) {
      return null;
    }
    return {
      codeId: candidate.id,
      codeHash: candidate.code_hash,
      codeSuffix: candidate.code_suffix,
      planCode: candidate.plan_code,
      planName: candidate.plan_name,
      code: candidate.code_plaintext,
      encrypted: candidate.encrypted
    };
  }
  async activateCode(input) {
    const result = await this.db.prepare(
      `UPDATE activation_codes
         SET status = 'active',
             activated_at = ?,
             expires_at = ?,
             device_hash = ?,
             updated_at = ?
         WHERE id = ?
           AND status IN ('unused', 'issued')
           AND disabled_at IS NULL
           AND activated_at IS NULL
           AND expires_at IS NULL
           AND device_hash IS NULL`
    ).bind(input.activatedAt, input.expiresAt, input.deviceHash, input.activatedAt, input.codeId).run();
    return result.meta.changes === 1;
  }
  async bindUnboundDevice(input) {
    const result = await this.db.prepare(
      `UPDATE activation_codes
         SET device_hash = ?,
             updated_at = ?
         WHERE id = ?
           AND status = 'active'
           AND disabled_at IS NULL
           AND device_hash IS NULL`
    ).bind(input.deviceHash, input.boundAt, input.codeId).run();
    return result.meta.changes === 1;
  }
  async unbindDevice(input) {
    const result = await this.db.prepare(
      `UPDATE activation_codes
         SET device_hash = NULL,
             rebind_count = rebind_count + 1,
             last_rebind_at = ?,
             updated_at = ?
         WHERE id = ?
           AND status = 'active'
           AND disabled_at IS NULL
           AND device_hash = ?
           AND rebind_count < ?`
    ).bind(input.unboundAt, input.unboundAt, input.codeId, input.deviceHash, input.maxRebinds).run();
    return result.meta.changes === 1;
  }
  async manuallyUnbindDevice(input) {
    const result = await this.db.prepare(
      `UPDATE activation_codes
         SET device_hash = NULL,
             updated_at = ?
         WHERE id = ?
           AND app_id IN (SELECT id FROM apps WHERE tenant_id = ?)
           AND status = 'active'
           AND disabled_at IS NULL
           AND device_hash IS NOT NULL
           AND (expires_at IS NULL OR expires_at > ?)`
    ).bind(input.changedAt, input.codeId, input.tenantId, input.changedAt).run();
    return result.meta.changes === 1;
  }
  async softDeleteCode(codeId, tenantId) {
    const result = await this.db.prepare("UPDATE activation_codes SET status = 'deleted', updated_at = ? WHERE id = ? AND app_id IN (SELECT id FROM apps WHERE tenant_id = ?)").bind((/* @__PURE__ */ new Date()).toISOString(), codeId, tenantId).run();
    return result.meta.changes === 1;
  }
  async getCodeById(codeId, tenantId) {
    return await this.db.prepare(
      `SELECT c.*, a.app_id AS app_public_id, a.name AS app_name, a.platform AS app_platform, a.status AS app_status,
                p.code AS plan_code, p.name AS plan_name, p.duration_days
         FROM activation_codes c
         JOIN apps a ON a.id = c.app_id
         JOIN plans p ON p.id = c.plan_id
         WHERE c.id = ? AND a.tenant_id = ?`
    ).bind(codeId, tenantId).first();
  }
  async hardDeleteCode(codeId, tenantId) {
    const result = await this.db.batch([
      this.db.prepare("UPDATE activation_logs SET code_id = NULL WHERE code_id = ?").bind(codeId),
      this.db.prepare(
        "DELETE FROM activation_codes WHERE id = ? AND app_id IN (SELECT id FROM apps WHERE tenant_id = ?)"
      ).bind(codeId, tenantId)
    ]);
    const last = result[result.length - 1];
    return last?.meta.changes === 1;
  }
  async updateCodeDisabled(input) {
    const disabledAt = input.disabled ? input.changedAt : null;
    const result = await this.db.prepare("UPDATE activation_codes SET disabled_at = ?, updated_at = ? WHERE id = ? AND status != 'deleted' AND app_id IN (SELECT id FROM apps WHERE tenant_id = ?)").bind(disabledAt, input.changedAt, input.codeId, input.tenantId).run();
    return result.meta.changes === 1;
  }
  async listCodes(filters) {
    const where = ["a.tenant_id = ?"];
    const bindings = [filters.tenantId];
    if (filters.query) {
      where.push("(c.code_suffix LIKE ? OR c.code_plaintext LIKE ? OR a.app_id LIKE ? OR a.name LIKE ?)");
      const query = `%${filters.query}%`;
      bindings.push(query, query, query, query);
    }
    if (filters.appId) {
      where.push("a.app_id = ?");
      bindings.push(filters.appId);
    }
    if (filters.planCode) {
      where.push("p.code = ?");
      bindings.push(filters.planCode);
    }
    if (filters.status === CODE_DERIVED_STATUS.DISABLED) {
      where.push("c.disabled_at IS NOT NULL AND c.status != 'deleted'");
    } else if (filters.status === CODE_DERIVED_STATUS.EXPIRED) {
      where.push("c.status = 'active' AND c.disabled_at IS NULL AND c.expires_at IS NOT NULL AND c.expires_at <= ?");
      bindings.push((/* @__PURE__ */ new Date()).toISOString());
    } else if (filters.status === CODE_STATUS.UNUSED || filters.status === CODE_STATUS.ACTIVE) {
      where.push("c.status = ? AND c.disabled_at IS NULL");
      bindings.push(filters.status);
    } else if (filters.status) {
      where.push("c.status = ?");
      bindings.push(filters.status);
    }
    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
    const baseFrom = `
      FROM activation_codes c
      JOIN apps a ON a.id = c.app_id
      JOIN plans p ON p.id = c.plan_id
      LEFT JOIN activation_batches b ON b.id = c.batch_id
      ${whereSql}
    `;
    const offset = (filters.page - 1) * filters.pageSize;
    const [count, result] = await Promise.all([
      this.db.prepare(`SELECT COUNT(*) AS total ${baseFrom}`).bind(...bindings).first(),
      this.db.prepare(
        `SELECT
             c.id,
             c.code_suffix,
             c.code_plaintext,
             c.status,
             c.disabled_at,
             c.activated_at,
             c.expires_at,
             c.device_hash,
             c.rebind_count,
             c.last_rebind_at,
             c.created_at,
             a.app_id,
             a.name AS app_name,
             a.platform AS app_platform,
             p.code AS plan_code,
             p.name AS plan_name,
             p.duration_days,
             b.id AS batch_id,
             b.note AS batch_note
           ${baseFrom}
           ORDER BY c.created_at DESC
           LIMIT ? OFFSET ?`
      ).bind(...bindings, filters.pageSize, offset).all()
    ]);
    return {
      items: result.results ?? [],
      total: count?.total ?? 0
    };
  }
  async listLogs(filters) {
    const where = ["a.tenant_id = ?"];
    const bindings = [filters.tenantId];
    if (filters.query) {
      where.push("(c.code_suffix LIKE ? OR c.code_plaintext LIKE ? OR l.error_code LIKE ? OR l.message LIKE ?)");
      const query = `%${filters.query}%`;
      bindings.push(query, query, query, query);
    }
    if (filters.appId) {
      where.push("a.app_id = ?");
      bindings.push(filters.appId);
    }
    if (filters.action) {
      where.push("l.action = ?");
      bindings.push(filters.action);
    }
    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
    const baseFrom = `
      FROM activation_logs l
      LEFT JOIN activation_codes c ON c.id = l.code_id
      LEFT JOIN apps a ON a.id = COALESCE(l.app_id, c.app_id)
      ${whereSql}
    `;
    const offset = (filters.page - 1) * filters.pageSize;
    const [count, result] = await Promise.all([
      this.db.prepare(`SELECT COUNT(*) AS total ${baseFrom}`).bind(...bindings).first(),
      this.db.prepare(
        `SELECT
             l.id,
             l.action,
             l.result,
             l.device_hash,
             l.error_code,
             l.message,
             l.created_at,
             c.code_suffix,
             c.code_plaintext,
             a.app_id,
             a.name AS app_name
           ${baseFrom}
           ORDER BY l.created_at DESC
           LIMIT ? OFFSET ?`
      ).bind(...bindings, filters.pageSize, offset).all()
    ]);
    return {
      items: result.results ?? [],
      total: count?.total ?? 0
    };
  }
  async listVersions(filters) {
    const where = ["a.tenant_id = ?", "v.deleted_at IS NULL"];
    const bindings = [filters.tenantId];
    if (filters.appId) {
      where.push("a.app_id = ?");
      bindings.push(filters.appId);
    }
    if (filters.version) {
      where.push("v.version LIKE ?");
      bindings.push(`%${filters.version}%`);
    }
    if (filters.status) {
      where.push("v.status = ?");
      bindings.push(filters.status);
    }
    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
    const baseFrom = `
      FROM versions v
      JOIN apps a ON a.id = v.app_id
      ${whereSql}
    `;
    const offset = (filters.page - 1) * filters.pageSize;
    const [count, result] = await Promise.all([
      this.db.prepare(`SELECT COUNT(*) AS total ${baseFrom}`).bind(...bindings).first(),
      this.db.prepare(
        `SELECT
             v.id,
             v.app_id,
             v.version,
             v.version_code,
             v.release_notes,
             v.download_url,
             v.is_forced,
             v.status,
             v.published_at,
             v.created_by,
             v.created_at,
             v.updated_at,
             a.app_id AS app_public_id,
             a.name AS app_name,
             a.tenant_id
           ${baseFrom}
           ORDER BY v.created_at DESC
           LIMIT ? OFFSET ?`
      ).bind(...bindings, filters.pageSize, offset).all()
    ]);
    return {
      items: result.results ?? [],
      total: count?.total ?? 0
    };
  }
  async getVersionById(versionId) {
    return await this.db.prepare("SELECT * FROM versions WHERE id = ? AND deleted_at IS NULL").bind(versionId).first();
  }
  async getVersionWithTenant(versionId) {
    return await this.db.prepare(
      `SELECT v.*, a.tenant_id
         FROM versions v
         JOIN apps a ON a.id = v.app_id
         WHERE v.id = ? AND v.deleted_at IS NULL`
    ).bind(versionId).first();
  }
  async getVersionByAppAndCode(appDbId, versionCode) {
    return await this.db.prepare("SELECT * FROM versions WHERE app_id = ? AND version_code = ? AND deleted_at IS NULL").bind(appDbId, versionCode).first();
  }
  async createVersion(input) {
    await this.db.prepare(
      `INSERT INTO versions (app_id, version, version_code, release_notes, download_url, is_forced, status, created_by, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?)`
    ).bind(
      input.appDbId,
      input.version,
      input.versionCode,
      input.releaseNotes,
      input.downloadUrl ?? "",
      input.isForced ? 1 : 0,
      input.createdBy,
      (/* @__PURE__ */ new Date()).toISOString()
    ).run();
    const version = await this.db.prepare("SELECT * FROM versions WHERE app_id = ? AND version_code = ? AND deleted_at IS NULL ORDER BY id DESC LIMIT 1").bind(input.appDbId, input.versionCode).first();
    if (!version) {
      throw new Error("Failed to create version");
    }
    return version;
  }
  async updateVersion(input) {
    const result = await this.db.prepare(
      `UPDATE versions SET version = ?, version_code = ?, release_notes = ?, download_url = ?, is_forced = ?, updated_at = ?
         WHERE id = ? AND deleted_at IS NULL`
    ).bind(
      input.version,
      input.versionCode,
      input.releaseNotes,
      input.downloadUrl ?? "",
      input.isForced ? 1 : 0,
      (/* @__PURE__ */ new Date()).toISOString(),
      input.versionId
    ).run();
    if (result.meta.changes !== 1) {
      return null;
    }
    return await this.getVersionById(input.versionId);
  }
  async publishVersion(versionId, publishedAt) {
    const result = await this.db.prepare(
      `UPDATE versions SET status = 'published', published_at = ?, updated_at = ?
         WHERE id = ? AND status = 'draft' AND deleted_at IS NULL`
    ).bind(publishedAt, (/* @__PURE__ */ new Date()).toISOString(), versionId).run();
    return result.meta.changes === 1;
  }
  async unpublishVersion(versionId) {
    const result = await this.db.prepare(
      `UPDATE versions SET status = 'draft', published_at = NULL, updated_at = ?
         WHERE id = ? AND status = 'published' AND deleted_at IS NULL`
    ).bind((/* @__PURE__ */ new Date()).toISOString(), versionId).run();
    return result.meta.changes === 1;
  }
  async softDeleteVersion(versionId) {
    const result = await this.db.prepare("UPDATE versions SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL").bind((/* @__PURE__ */ new Date()).toISOString(), (/* @__PURE__ */ new Date()).toISOString(), versionId).run();
    return result.meta.changes === 1;
  }
  async getLatestPublishedVersion(appDbId) {
    return await this.db.prepare(
      "SELECT * FROM versions WHERE app_id = ? AND status = 'published' AND deleted_at IS NULL ORDER BY version_code DESC LIMIT 1"
    ).bind(appDbId).first();
  }
  async getDashboardStats(tenantId) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const today = now.slice(0, 10);
    const trendStart = startOfUtcDayOffset2(-6);
    const trendDates = buildLastSevenDates2();
    const activeTrendStatement = buildDashboardActiveTrendStatement(trendDates, tenantId);
    const [
      appOverview,
      codeOverview,
      logOverview,
      appRankingResult,
      planDistributionResult,
      trendResult,
      activatedTrendResult,
      expiredTrendResult,
      activeTrendResult
    ] = await Promise.all([
      this.db.prepare(
        `SELECT
             COUNT(*) AS apps_total,
             SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS apps_active
           FROM apps
           WHERE tenant_id = ?`
      ).bind(tenantId).first(),
      this.db.prepare(
        `SELECT
             COUNT(*) AS codes_total,
             SUM(CASE WHEN c.status = 'unused' AND c.disabled_at IS NULL THEN 1 ELSE 0 END) AS codes_unused,
             SUM(CASE WHEN c.status = 'active' AND c.disabled_at IS NULL AND (c.expires_at IS NULL OR c.expires_at > ?) THEN 1 ELSE 0 END) AS codes_active,
             SUM(CASE WHEN c.status != 'deleted' AND c.disabled_at IS NOT NULL THEN 1 ELSE 0 END) AS codes_disabled,
             SUM(CASE WHEN c.status = 'active' AND c.disabled_at IS NULL AND c.expires_at IS NOT NULL AND c.expires_at <= ? THEN 1 ELSE 0 END) AS codes_expired,
             SUM(CASE WHEN c.status = 'deleted' THEN 1 ELSE 0 END) AS codes_deleted
           FROM activation_codes c
           JOIN apps a ON a.id = c.app_id
           WHERE a.tenant_id = ?`
      ).bind(now, now, tenantId).first(),
      this.db.prepare(
        `SELECT
             COUNT(*) AS logs_today,
             SUM(CASE WHEN result = 'failure' AND action IN ('activate', 'verify', 'unbind_device') THEN 1 ELSE 0 END) AS client_failures_today
           FROM activation_logs l
           LEFT JOIN activation_codes c ON c.id = l.code_id
           JOIN apps a ON a.id = COALESCE(l.app_id, c.app_id)
           WHERE substr(l.created_at, 1, 10) = ? AND a.tenant_id = ?`
      ).bind(today, tenantId).first(),
      this.db.prepare(
        `SELECT
             a.app_id,
             a.name AS app_name,
             a.platform,
             COUNT(c.id) AS total,
             SUM(CASE WHEN c.status = 'active' AND c.disabled_at IS NULL AND (c.expires_at IS NULL OR c.expires_at > ?) THEN 1 ELSE 0 END) AS active,
             SUM(CASE WHEN c.status = 'unused' AND c.disabled_at IS NULL THEN 1 ELSE 0 END) AS unused,
             SUM(CASE WHEN c.status != 'deleted' AND c.disabled_at IS NOT NULL THEN 1 ELSE 0 END) AS disabled,
             SUM(CASE WHEN c.status = 'active' AND c.disabled_at IS NULL AND c.expires_at IS NOT NULL AND c.expires_at <= ? THEN 1 ELSE 0 END) AS expired,
             SUM(CASE WHEN c.status = 'deleted' THEN 1 ELSE 0 END) AS deleted
           FROM apps a
           LEFT JOIN activation_codes c ON c.app_id = a.id
           WHERE a.tenant_id = ?
           GROUP BY a.id
           ORDER BY total DESC, a.created_at DESC
           LIMIT 8`
      ).bind(now, now, tenantId).all(),
      this.db.prepare(
        `SELECT
             p.code AS plan_code,
             p.name AS plan_name,
             COUNT(c.id) AS count
           FROM plans p
           LEFT JOIN activation_codes c ON c.plan_id = p.id
             AND c.app_id IN (SELECT id FROM apps WHERE tenant_id = ?)
           GROUP BY p.id
           ORDER BY count DESC, p.sort_order ASC`
      ).bind(tenantId).all(),
      this.db.prepare(
        `SELECT
             substr(l.created_at, 1, 10) AS date,
             SUM(CASE WHEN result = 'success' THEN 1 ELSE 0 END) AS success,
             SUM(CASE WHEN result = 'failure' THEN 1 ELSE 0 END) AS failure
           FROM activation_logs l
           LEFT JOIN activation_codes c ON c.id = l.code_id
           JOIN apps a ON a.id = COALESCE(l.app_id, c.app_id)
           WHERE l.created_at >= ? AND a.tenant_id = ?
           GROUP BY substr(l.created_at, 1, 10)
           ORDER BY date ASC`
      ).bind(trendStart, tenantId).all(),
      this.db.prepare(
        `SELECT
             substr(activated_at, 1, 10) AS date,
             COUNT(*) AS activated
           FROM activation_codes
           JOIN apps a ON a.id = activation_codes.app_id
           WHERE activation_codes.status != 'deleted'
             AND activation_codes.activated_at IS NOT NULL
             AND activation_codes.activated_at >= ?
             AND a.tenant_id = ?
           GROUP BY substr(activation_codes.activated_at, 1, 10)
           ORDER BY date ASC`
      ).bind(trendStart, tenantId).all(),
      this.db.prepare(
        `SELECT
             substr(expires_at, 1, 10) AS date,
             COUNT(*) AS expired
           FROM activation_codes
           JOIN apps a ON a.id = activation_codes.app_id
           WHERE activation_codes.status = 'active'
             AND activation_codes.disabled_at IS NULL
             AND activation_codes.expires_at IS NOT NULL
             AND activation_codes.expires_at >= ?
             AND activation_codes.expires_at < ?
             AND a.tenant_id = ?
           GROUP BY substr(activation_codes.expires_at, 1, 10)
           ORDER BY date ASC`
      ).bind(trendStart, nextUtcDate2(trendDates[trendDates.length - 1]), tenantId).all(),
      this.db.prepare(activeTrendStatement.sql).bind(...activeTrendStatement.bindings).all()
    ]);
    const overview = {
      apps_total: appOverview?.apps_total ?? 0,
      apps_active: appOverview?.apps_active ?? 0,
      codes_total: codeOverview?.codes_total ?? 0,
      codes_unused: codeOverview?.codes_unused ?? 0,
      codes_active: codeOverview?.codes_active ?? 0,
      codes_disabled: codeOverview?.codes_disabled ?? 0,
      codes_expired: codeOverview?.codes_expired ?? 0,
      codes_deleted: codeOverview?.codes_deleted ?? 0,
      logs_today: logOverview?.logs_today ?? 0,
      client_failures_today: logOverview?.client_failures_today ?? 0
    };
    const trendByDate = new Map((trendResult.results ?? []).map((item) => [item.date, item]));
    const activatedTrendByDate = new Map((activatedTrendResult.results ?? []).map((item) => [item.date, item.activated]));
    const expiredTrendByDate = new Map((expiredTrendResult.results ?? []).map((item) => [item.date, item.expired]));
    const activeTrendByDate = new Map((activeTrendResult.results ?? []).map((item) => [item.date, item.active]));
    return {
      overview,
      code_status: [
        { status: CODE_STATUS.UNUSED, count: overview.codes_unused },
        { status: CODE_STATUS.ACTIVE, count: overview.codes_active },
        { status: CODE_DERIVED_STATUS.DISABLED, count: overview.codes_disabled },
        { status: CODE_DERIVED_STATUS.EXPIRED, count: overview.codes_expired },
        { status: CODE_STATUS.DELETED, count: overview.codes_deleted }
      ],
      app_code_ranking: normalizeNullableNumbers(appRankingResult.results ?? []),
      plan_distribution: normalizeNullableNumbers(planDistributionResult.results ?? []),
      log_trend: trendDates.map((date) => ({
        date,
        success: trendByDate.get(date)?.success ?? 0,
        failure: trendByDate.get(date)?.failure ?? 0
      })),
      code_trend: trendDates.map((date) => ({
        date,
        activated: activatedTrendByDate.get(date) ?? 0,
        expired: expiredTrendByDate.get(date) ?? 0,
        active: activeTrendByDate.get(date) ?? 0
      }))
    };
  }
  async insertLog(input) {
    await this.db.prepare(
      `INSERT INTO activation_logs (code_id, app_id, action, result, device_hash, error_code, message)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      input.codeId ?? null,
      input.appDbId ?? null,
      input.action,
      input.result,
      input.deviceHash ?? null,
      input.errorCode ?? null,
      input.message ?? null
    ).run();
  }
  async getAdminByUsername(username) {
    return await this.db.prepare(
      `SELECT u.id, u.tenant_id, u.role, u.username, u.password_hash, u.password_salt,
                u.created_at, u.updated_at, t.name AS tenant_name, t.status AS tenant_status
         FROM admin_users u LEFT JOIN tenants t ON t.id = u.tenant_id
         WHERE u.username = ?`
    ).bind(username).first();
  }
  async getAdminByTenantAndUsername(tenant, username) {
    return await this.db.prepare(
      `SELECT u.id, u.tenant_id, u.role, u.username, u.password_hash, u.password_salt,
                u.created_at, u.updated_at, t.name AS tenant_name, t.status AS tenant_status
         FROM admin_users u
         JOIN tenants t ON t.id = u.tenant_id
         WHERE u.username = ?
           AND (t.name = ? OR t.slug = LOWER(?))`
    ).bind(username, tenant, tenant).first();
  }
  async getAdminById(id) {
    return await this.db.prepare(
      `SELECT u.id, u.tenant_id, u.role, u.username, u.password_hash, u.password_salt,
                u.created_at, u.updated_at, t.name AS tenant_name, t.status AS tenant_status
         FROM admin_users u LEFT JOIN tenants t ON t.id = u.tenant_id
         WHERE u.id = ?`
    ).bind(id).first();
  }
  async getAdminCredentialsById(id) {
    return await this.db.prepare(
      `SELECT u.id, u.tenant_id, u.role, u.username, u.password_hash, u.password_salt,
                u.created_at, u.updated_at, t.name AS tenant_name, t.status AS tenant_status
         FROM admin_users u LEFT JOIN tenants t ON t.id = u.tenant_id
         WHERE u.id = ?`
    ).bind(id).first();
  }
  async createAdmin(input) {
    await this.db.prepare(
      `INSERT INTO admin_users (tenant_id, role, username, password_hash, password_salt, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(input.tenantId ?? null, input.role, input.username, input.passwordHash, input.passwordSalt, (/* @__PURE__ */ new Date()).toISOString()).run();
  }
  async listTenantAdmins(tenantId) {
    const result = await this.db.prepare(
      "SELECT id, username, created_at, updated_at FROM admin_users WHERE tenant_id = ? AND role = 'tenant_admin' ORDER BY created_at ASC"
    ).bind(tenantId).all();
    return result.results ?? [];
  }
  async updateAdminPassword(input) {
    const result = await this.db.prepare(
      `UPDATE admin_users
         SET password_hash = ?,
             password_salt = ?,
             updated_at = ?
         WHERE id = ?`
    ).bind(input.passwordHash, input.passwordSalt, (/* @__PURE__ */ new Date()).toISOString(), input.adminId).run();
    return result.meta.changes === 1;
  }
};
function startOfUtcDayOffset2(offsetDays) {
  const date = /* @__PURE__ */ new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString();
}
function buildLastSevenDates2() {
  return Array.from({ length: 7 }, (_, index) => startOfUtcDayOffset2(index - 6).slice(0, 10));
}
function nextUtcDate2(date) {
  const nextDate = /* @__PURE__ */ new Date(`${date}T00:00:00.000Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  return nextDate.toISOString().slice(0, 10);
}
function normalizeNullableNumbers(items) {
  return items.map((item) => {
    const normalized = { ...item };
    for (const [key, value] of Object.entries(normalized)) {
      if (value === null) {
        normalized[key] = 0;
      }
    }
    return normalized;
  });
}
function buildDashboardActiveTrendStatement(dates, tenantId) {
  const dateRows = dates.map(() => "(?, ?)").join(", ");
  return {
    sql: `WITH trend_dates(date, next_date) AS (VALUES ${dateRows})
      SELECT
        d.date,
        COUNT(c.id) AS active
      FROM trend_dates d
      LEFT JOIN activation_codes c
        ON c.status = 'active'
       AND c.app_id IN (SELECT id FROM apps WHERE tenant_id = ?)
       AND c.disabled_at IS NULL
       AND c.activated_at IS NOT NULL
       AND c.activated_at < d.next_date
       AND (c.expires_at IS NULL OR c.expires_at >= d.next_date)
      GROUP BY d.date
      ORDER BY d.date ASC`,
    bindings: [...dates.flatMap((date) => [date, nextUtcDate2(date)]), tenantId]
  };
}
function buildActivationCodeInsertStatement(inputs, updatedAt = (/* @__PURE__ */ new Date()).toISOString()) {
  const rows = inputs.map(() => "(?, ?, ?, ?, ?, 'unused', NULL, NULL, NULL, ?, ?, ?)").join(", ");
  return {
    sql: `INSERT INTO activation_codes
       (batch_id, app_id, plan_id, code_hash, code_suffix, status, activated_at, expires_at, device_hash, created_by, updated_at, code_plaintext)
     VALUES ${rows}`,
    bindings: inputs.flatMap((input) => [
      input.batchId,
      input.appDbId,
      input.planId,
      input.codeHash,
      input.codeSuffix,
      input.createdBy,
      updatedAt,
      input.codePlaintext ?? null
    ])
  };
}

// worker/src/storage.ts
async function createRepository(env) {
  if (env.DB) {
    return new Repository(env.DB);
  }
  if (!isEdgeOneRuntime(env)) {
    throw new ApiError(500, "CONFLICT", "Database binding DB is not configured");
  }
  const kv = await createSdkBlobKv(env.BLOB_NAMESPACE || DEFAULT_BLOB_NAMESPACE);
  const repository = await new BlobRepository(kv).ready();
  return repository;
}

// worker/src/middleware.ts
async function requireAdmin(c, next) {
  const header = c.req.header("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  if (!token) {
    return c.json(fail("UNAUTHORIZED", "Missing bearer token"), 401);
  }
  const payload = await verifyJwt(requireEnv(c.env, "JWT_SECRET"), token);
  if (!payload) {
    return c.json(fail("UNAUTHORIZED", "Invalid or expired token"), 401);
  }
  const repo = await createRepository(c.env);
  const admin = await repo.getAdminById(Number(payload.sub));
  if (!admin) {
    return c.json(fail("UNAUTHORIZED", "Admin no longer exists"), 401);
  }
  if (admin.role === ADMIN_ROLE.TENANT_ADMIN && admin.tenant_status !== TENANT_STATUS.ACTIVE) {
    return c.json(fail("FORBIDDEN", "Tenant is disabled"), 403);
  }
  c.set("admin", {
    id: admin.id,
    username: admin.username,
    role: admin.role,
    tenant_id: admin.tenant_id,
    tenant_name: admin.tenant_name
  });
  await next();
}
function requireSuperAdmin(c) {
  if (c.get("admin").role !== ADMIN_ROLE.SUPER_ADMIN) {
    throw new ApiError(403, "FORBIDDEN", "Super administrator access required");
  }
}
async function resolveTenantId(c) {
  const admin = c.get("admin");
  if (admin.role === ADMIN_ROLE.TENANT_ADMIN) {
    if (!admin.tenant_id) {
      throw new ApiError(403, "FORBIDDEN", "Administrator has no tenant");
    }
    return admin.tenant_id;
  }
  const rawTenantId = c.req.header("X-Tenant-Id");
  const tenantId = rawTenantId ? Number(rawTenantId) : NaN;
  if (!Number.isInteger(tenantId) || tenantId < 1) {
    throw new ApiError(400, "BAD_REQUEST", "X-Tenant-Id header is required");
  }
  const tenant = await (await createRepository(c.env)).getTenantById(tenantId);
  if (!tenant) {
    throw new ApiError(404, "NOT_FOUND", "Tenant not found");
  }
  if (tenant.status !== TENANT_STATUS.ACTIVE) {
    throw new ApiError(403, "FORBIDDEN", "Tenant is disabled");
  }
  return tenant.id;
}

// worker/src/service.ts
var MAX_REBINDS = 3;
var REBIND_COOLDOWN_MS = 24 * 60 * 60 * 1e3;
var MAX_CLAIM_ATTEMPTS = 3;
var READ_ONLY_ADMIN_USERNAME = "test";
var LicenseService = class {
  constructor(repo, env) {
    this.repo = repo;
    this.env = env;
  }
  repo;
  env;
  async ensureBootstrapAdmin() {
    const username = this.env.ADMIN_BOOTSTRAP_USERNAME;
    const password = this.env.ADMIN_BOOTSTRAP_PASSWORD;
    if (!username || !password) {
      return;
    }
    const existing = await this.repo.getAdminByUsername(username);
    if (existing) {
      return;
    }
    const passwordRecord = await hashPassword(password);
    await this.repo.createAdmin({
      username,
      passwordHash: passwordRecord.hash,
      passwordSalt: passwordRecord.salt,
      role: ADMIN_ROLE.SUPER_ADMIN,
      tenantId: 1
    });
  }
  async authenticateAdmin(tenant, username, password) {
    await this.ensureBootstrapAdmin();
    const admin = await this.repo.getAdminByTenantAndUsername(tenant, username);
    if (!admin) {
      throw new ApiError(401, "UNAUTHORIZED", "Invalid tenant, username or password");
    }
    const valid = await verifyPassword(password, admin.password_salt, admin.password_hash);
    if (!valid) {
      throw new ApiError(401, "UNAUTHORIZED", "Invalid tenant, username or password");
    }
    if (admin.role === ADMIN_ROLE.TENANT_ADMIN && admin.tenant_status !== TENANT_STATUS.ACTIVE) {
      throw new ApiError(403, "FORBIDDEN", "Tenant is disabled");
    }
    return {
      id: admin.id,
      username: admin.username,
      role: admin.role,
      tenant_id: admin.tenant_id,
      tenant_name: admin.tenant_name
    };
  }
  async createTenant(input) {
    validateTenantSlug(input.slug);
    validateNewPassword(input.adminPassword, "Admin password");
    if (await this.repo.getAdminByUsername(input.adminUsername)) {
      throw new ApiError(409, "CONFLICT", "Admin username already exists");
    }
    let tenant;
    try {
      const passwordRecord = await hashPassword(input.adminPassword);
      tenant = await this.repo.createTenant({
        name: input.name,
        slug: input.slug,
        status: input.status,
        adminUsername: input.adminUsername,
        passwordHash: passwordRecord.hash,
        passwordSalt: passwordRecord.salt
      });
    } catch (error) {
      if (String(error).includes("UNIQUE")) {
        throw new ApiError(409, "CONFLICT", "Tenant slug or admin username already exists");
      }
      throw error;
    }
    return { tenant, admins: await this.repo.listTenantAdmins(tenant.id) };
  }
  async updateTenant(input) {
    validateTenantSlug(input.slug);
    try {
      const tenant = await this.repo.updateTenant({ id: input.tenantId, name: input.name, slug: input.slug });
      if (!tenant) {
        throw new ApiError(404, "NOT_FOUND", "Tenant not found");
      }
      return { tenant };
    } catch (error) {
      if (String(error).includes("UNIQUE")) {
        throw new ApiError(409, "CONFLICT", "Tenant slug already exists");
      }
      throw error;
    }
  }
  async updateTenantStatus(tenantId, status) {
    if (!await this.repo.updateTenantStatus(tenantId, status)) {
      throw new ApiError(404, "NOT_FOUND", "Tenant not found");
    }
    return { updated: true };
  }
  async deleteTenant(tenantId) {
    const tenant = await this.repo.getTenantById(tenantId);
    if (!tenant) {
      throw new ApiError(404, "NOT_FOUND", "Tenant not found");
    }
    if (!await this.repo.deleteTenantIfEmpty(tenantId)) {
      throw new ApiError(409, "CONFLICT", "Tenant has applications or is protected and cannot be deleted");
    }
    return { deleted: true };
  }
  async resetTenantAdminPassword(input) {
    validateNewPassword(input.newPassword, "New password");
    const admin = await this.repo.getAdminByUsername(input.username);
    if (!admin || admin.role !== ADMIN_ROLE.TENANT_ADMIN || admin.tenant_id !== input.tenantId) {
      throw new ApiError(404, "NOT_FOUND", "Tenant administrator not found");
    }
    const passwordRecord = await hashPassword(input.newPassword);
    await this.repo.updateAdminPassword({
      adminId: admin.id,
      passwordHash: passwordRecord.hash,
      passwordSalt: passwordRecord.salt
    });
    return { updated: true };
  }
  async changeAdminPassword(input) {
    if (input.newPassword.length < 8) {
      throw new ApiError(400, "BAD_REQUEST", "New password must be at least 8 characters");
    }
    if (input.currentPassword === input.newPassword) {
      throw new ApiError(400, "BAD_REQUEST", "New password must be different from current password");
    }
    const admin = await this.repo.getAdminCredentialsById(input.adminId);
    if (!admin) {
      throw new ApiError(404, "NOT_FOUND", "Admin not found");
    }
    if (admin.username === READ_ONLY_ADMIN_USERNAME) {
      throw new ApiError(403, "FORBIDDEN", "Password changes are disabled for this account");
    }
    const valid = await verifyPassword(input.currentPassword, admin.password_salt, admin.password_hash);
    if (!valid) {
      throw new ApiError(401, "UNAUTHORIZED", "Current password is incorrect");
    }
    const passwordRecord = await hashPassword(input.newPassword);
    const updated = await this.repo.updateAdminPassword({
      adminId: input.adminId,
      passwordHash: passwordRecord.hash,
      passwordSalt: passwordRecord.salt
    });
    if (!updated) {
      throw new ApiError(404, "NOT_FOUND", "Admin not found");
    }
    return {
      updated: true
    };
  }
  async resetAdminPassword(input) {
    const bootstrapUsername = this.env.ADMIN_BOOTSTRAP_USERNAME;
    const bootstrapPassword = this.env.ADMIN_BOOTSTRAP_PASSWORD;
    if (!bootstrapUsername || !bootstrapPassword) {
      throw new ApiError(403, "FORBIDDEN", "Password reset is not configured");
    }
    if (input.newPassword.length < 8) {
      throw new ApiError(400, "BAD_REQUEST", "New password must be at least 8 characters");
    }
    if (input.newPassword === input.recoveryPassword) {
      throw new ApiError(400, "BAD_REQUEST", "New password must be different from recovery password");
    }
    if (input.username !== bootstrapUsername || !timingSafeEqual(input.recoveryPassword, bootstrapPassword)) {
      throw new ApiError(401, "UNAUTHORIZED", "Invalid username or recovery password");
    }
    await this.ensureBootstrapAdmin();
    const admin = await this.repo.getAdminByUsername(input.username);
    if (!admin) {
      throw new ApiError(404, "NOT_FOUND", "Admin not found");
    }
    const passwordRecord = await hashPassword(input.newPassword);
    const updated = await this.repo.updateAdminPassword({
      adminId: admin.id,
      passwordHash: passwordRecord.hash,
      passwordSalt: passwordRecord.salt
    });
    if (!updated) {
      throw new ApiError(404, "NOT_FOUND", "Admin not found");
    }
    return {
      reset: true
    };
  }
  async createApp(input) {
    const appId = `app_${generateRandomToken(12)}`;
    const appSecret = `sec_${generateRandomToken(32)}`;
    const appSecretHash = await this.hashAppSecret(appSecret);
    const app2 = await this.repo.createApp({
      tenantId: input.tenantId,
      appId,
      name: input.name,
      description: input.description,
      purchaseUrl: input.purchaseUrl,
      platform: input.platform,
      status: input.status ?? APP_STATUS.ACTIVE,
      appSecretHash
    });
    return {
      app: stripAppSecret(app2),
      app_secret: appSecret
    };
  }
  async updateApp(input) {
    const app2 = await this.repo.updateApp(input);
    if (!app2) {
      throw new ApiError(404, "NOT_FOUND", "App not found");
    }
    return {
      app: stripAppSecret(app2)
    };
  }
  async updateAppStatus(input) {
    const app2 = await this.repo.getAppByPublicId(input.appId, input.tenantId);
    if (!app2) {
      throw new ApiError(404, "NOT_FOUND", "App not found");
    }
    const updated = await this.repo.updateAppStatus(input.appId, input.tenantId, input.status);
    if (!updated) {
      throw new ApiError(404, "NOT_FOUND", "App not found");
    }
    await this.repo.insertLog({
      appDbId: app2.id,
      action: input.status === APP_STATUS.DISABLED ? LOG_ACTION.DISABLE_APP : LOG_ACTION.ENABLE_APP,
      result: LOG_RESULT.SUCCESS,
      message: `${input.status === APP_STATUS.DISABLED ? "\u7981\u7528" : "\u542F\u7528"}\u5E94\u7528\uFF0C\u7BA1\u7406\u5458 ID\uFF1A${input.adminId}`
    });
    return {
      updated: true
    };
  }
  async rotateAppSecret(input) {
    const app2 = await this.repo.getAppByPublicId(input.appId, input.tenantId);
    if (!app2) {
      throw new ApiError(404, "NOT_FOUND", "App not found");
    }
    const appSecret = `sec_${generateRandomToken(32)}`;
    const appSecretHash = await this.hashAppSecret(appSecret);
    const updatedApp = await this.repo.updateAppSecretHash(input.appId, input.tenantId, appSecretHash);
    if (!updatedApp) {
      throw new ApiError(404, "NOT_FOUND", "App not found");
    }
    await this.repo.insertLog({
      appDbId: app2.id,
      action: LOG_ACTION.ROTATE_APP_SECRET,
      result: LOG_RESULT.SUCCESS,
      message: `\u66F4\u6362\u5E94\u7528\u5BC6\u94A5\uFF0C\u7BA1\u7406\u5458 ID\uFF1A${input.adminId}`
    });
    return {
      app: stripAppSecret(updatedApp),
      app_secret: appSecret
    };
  }
  async deleteApp(appId, tenantId) {
    const app2 = await this.repo.getAppByPublicId(appId, tenantId);
    if (!app2) {
      throw new ApiError(404, "NOT_FOUND", "App not found");
    }
    const deleted = await this.repo.deleteAppWithData(app2.id);
    if (!deleted) {
      throw new ApiError(409, "CONFLICT", "App still has non-deleted activation codes and cannot be deleted");
    }
    return {
      deleted: true
    };
  }
  async listVersions(input) {
    return await this.repo.listVersions(input);
  }
  async createVersion(input) {
    const app2 = await this.repo.getAppByPublicId(input.appId, input.tenantId);
    if (!app2) {
      throw new ApiError(404, "NOT_FOUND", "App not found");
    }
    const existing = await this.repo.getVersionByAppAndCode(app2.id, input.versionCode);
    if (existing) {
      throw new ApiError(409, "VERSION_CODE_CONFLICT", "Version code already exists for this app");
    }
    const version = await this.repo.createVersion({
      appDbId: app2.id,
      version: input.version,
      versionCode: input.versionCode,
      releaseNotes: input.releaseNotes,
      downloadUrl: input.downloadUrl,
      isForced: input.isForced,
      createdBy: input.adminId
    });
    await this.repo.insertLog({
      appDbId: app2.id,
      action: LOG_ACTION.CREATE_VERSION,
      result: LOG_RESULT.SUCCESS,
      message: `\u521B\u5EFA\u7248\u672C ${version.version} (${version.version_code})\uFF0C\u7BA1\u7406\u5458 ID\uFF1A${input.adminId}`
    });
    return {
      version
    };
  }
  async updateVersion(input) {
    const version = await this.requireTenantVersion(input.versionId, input.tenantId);
    const merged = {
      versionId: version.id,
      version: input.version ?? version.version,
      versionCode: input.versionCode ?? version.version_code,
      releaseNotes: input.releaseNotes ?? version.release_notes,
      downloadUrl: input.downloadUrl ?? version.download_url,
      isForced: input.isForced ?? version.is_forced === 1
    };
    if (merged.versionCode !== version.version_code) {
      const existing = await this.repo.getVersionByAppAndCode(version.app_id, merged.versionCode);
      if (existing) {
        throw new ApiError(409, "VERSION_CODE_CONFLICT", "Version code already exists for this app");
      }
    }
    const updated = await this.repo.updateVersion(merged);
    if (!updated) {
      throw new ApiError(404, "VERSION_NOT_FOUND", "Version not found");
    }
    await this.repo.insertLog({
      appDbId: version.app_id,
      action: LOG_ACTION.UPDATE_VERSION,
      result: LOG_RESULT.SUCCESS,
      message: `\u4FEE\u6539\u7248\u672C ${updated.version} (${updated.version_code})\uFF0C\u7BA1\u7406\u5458 ID\uFF1A${input.adminId}`
    });
    return {
      version: updated
    };
  }
  async publishVersion(input) {
    const version = await this.requireTenantVersion(input.versionId, input.tenantId);
    if (version.status !== VERSION_STATUS.DRAFT) {
      throw new ApiError(400, "VERSION_NOT_PUBLISHABLE", "Only draft versions can be published");
    }
    const published = await this.repo.publishVersion(version.id, (/* @__PURE__ */ new Date()).toISOString());
    if (!published) {
      throw new ApiError(400, "VERSION_NOT_PUBLISHABLE", "Version cannot be published");
    }
    await this.repo.insertLog({
      appDbId: version.app_id,
      action: LOG_ACTION.PUBLISH_VERSION,
      result: LOG_RESULT.SUCCESS,
      message: `\u53D1\u5E03\u7248\u672C ${version.version} (${version.version_code})\uFF0C\u7BA1\u7406\u5458 ID\uFF1A${input.adminId}`
    });
    return {
      updated: true
    };
  }
  async unpublishVersion(input) {
    const version = await this.requireTenantVersion(input.versionId, input.tenantId);
    if (version.status !== VERSION_STATUS.PUBLISHED) {
      throw new ApiError(400, "VERSION_NOT_PUBLISHABLE", "Only published versions can be unpublished");
    }
    const unpublished = await this.repo.unpublishVersion(version.id);
    if (!unpublished) {
      throw new ApiError(400, "VERSION_NOT_PUBLISHABLE", "Version cannot be unpublished");
    }
    await this.repo.insertLog({
      appDbId: version.app_id,
      action: LOG_ACTION.UNPUBLISH_VERSION,
      result: LOG_RESULT.SUCCESS,
      message: `\u4E0B\u67B6\u7248\u672C ${version.version} (${version.version_code})\uFF0C\u7BA1\u7406\u5458 ID\uFF1A${input.adminId}`
    });
    return {
      updated: true
    };
  }
  async deleteVersion(input) {
    const version = await this.requireTenantVersion(input.versionId, input.tenantId);
    const deleted = await this.repo.softDeleteVersion(version.id);
    if (!deleted) {
      throw new ApiError(404, "VERSION_NOT_FOUND", "Version not found");
    }
    await this.repo.insertLog({
      appDbId: version.app_id,
      action: LOG_ACTION.DELETE_VERSION,
      result: LOG_RESULT.SUCCESS,
      message: `\u5220\u9664\u7248\u672C ${version.version} (${version.version_code})\uFF0C\u7BA1\u7406\u5458 ID\uFF1A${input.adminId}`
    });
    return {
      deleted: true
    };
  }
  async getClientLatestVersion(input) {
    const app2 = await this.requireValidClientApp(input.appId, input.appSecret);
    const latest = await this.repo.getLatestPublishedVersion(app2.id);
    if (!latest) {
      return {
        latest: null,
        update_required: false
      };
    }
    const updateRequired = input.currentVersionCode !== void 0 && input.currentVersionCode < latest.version_code;
    return {
      latest: toClientVersion(latest),
      update_required: updateRequired
    };
  }
  async requireTenantVersion(versionId, tenantId) {
    const version = await this.repo.getVersionWithTenant(versionId);
    if (!version) {
      throw new ApiError(404, "VERSION_NOT_FOUND", "Version not found");
    }
    if (version.tenant_id !== tenantId) {
      throw new ApiError(404, "VERSION_NOT_FOUND", "Version not found");
    }
    return version;
  }
  async generateCodes(input) {
    const app2 = await this.repo.getAppByPublicId(input.appId, input.tenantId);
    if (!app2) {
      throw new ApiError(404, "NOT_FOUND", "App not found");
    }
    if (input.note && input.note.length > MAX_CODE_NOTE_LENGTH) {
      throw new ApiError(400, "BAD_REQUEST", `note must be at most ${MAX_CODE_NOTE_LENGTH} characters`);
    }
    const plan = await this.repo.getPlanByCode(input.planCode);
    if (!plan) {
      throw new ApiError(404, "NOT_FOUND", "Plan not found");
    }
    const batchId = await this.repo.createBatch({
      appDbId: app2.id,
      planId: plan.id,
      quantity: input.quantity,
      note: input.note,
      createdBy: input.adminId
    });
    const codes = [];
    const pending = [];
    const generatedHashes = /* @__PURE__ */ new Set();
    let attempts = 0;
    while (codes.length < input.quantity) {
      attempts += 1;
      if (attempts > input.quantity * 4 + 20) {
        throw new ApiError(409, "CONFLICT", "Unable to generate unique activation codes");
      }
      const code = generateActivationCode();
      const normalized = normalizeCode(code);
      const codeHash = await this.hashCode(normalized);
      if (generatedHashes.has(codeHash)) {
        continue;
      }
      generatedHashes.add(codeHash);
      pending.push({
        batchId,
        appDbId: app2.id,
        planId: plan.id,
        codeHash,
        codeSuffix: codeSuffix(normalized),
        createdBy: input.adminId,
        codePlaintext: normalized
      });
      codes.push(code);
    }
    try {
      await this.repo.createActivationCodes(pending);
    } catch (error) {
      if (String(error).includes("UNIQUE")) {
        throw new ApiError(409, "CONFLICT", "Generated activation code collision, please retry");
      }
      throw error;
    }
    await this.repo.insertLog({
      appDbId: app2.id,
      action: LOG_ACTION.BATCH_GENERATE,
      result: LOG_RESULT.SUCCESS,
      message: `\u6279\u91CF\u751F\u6210 ${codes.length} \u4E2A${plan.name}\u6FC0\u6D3B\u7801`
    });
    return {
      batch_id: batchId,
      app_id: app2.app_id,
      plan_code: plan.code,
      quantity: codes.length,
      codes
    };
  }
  async activate(input) {
    const app2 = await this.requireValidClientApp(input.appId, input.appSecret);
    const deviceHash = await this.hashDevice(input.deviceFingerprint);
    const codeHash = await this.hashCode(normalizeCode(input.code));
    const code = await this.requireCode(codeHash, app2);
    try {
      this.assertCodeUsable(code, deviceHash);
      if (code.status === CODE_STATUS.ACTIVE) {
        if (!code.device_hash) {
          if (code.rebind_count > MAX_REBINDS) {
            throw new ApiError(403, "REBINDS_EXCEEDED", "Device unbind limit exceeded");
          }
          const reboundAt = nowIso();
          const rebound = await this.repo.bindUnboundDevice({
            codeId: code.id,
            deviceHash,
            boundAt: reboundAt
          });
          if (!rebound) {
            throw new ApiError(409, "CONFLICT", "Activation code was bound by another request");
          }
          const reboundCode = await this.requireCode(codeHash, app2);
          await this.repo.insertLog({
            codeId: code.id,
            appDbId: app2.id,
            action: LOG_ACTION.ACTIVATE,
            result: LOG_RESULT.SUCCESS,
            deviceHash,
            message: "\u91CD\u65B0\u7ED1\u5B9A\u6210\u529F"
          });
          return this.toClientLicense(reboundCode);
        }
        await this.repo.insertLog({
          codeId: code.id,
          appDbId: app2.id,
          action: LOG_ACTION.ACTIVATE,
          result: LOG_RESULT.SUCCESS,
          deviceHash,
          message: "\u8BE5\u8BBE\u5907\u5DF2\u6FC0\u6D3B"
        });
        return this.toClientLicense(code);
      }
      const activatedAt = nowIso();
      const expiresAt = this.calculateExpiresAt(activatedAt, code);
      const activated = await this.repo.activateCode({
        codeId: code.id,
        deviceHash,
        activatedAt,
        expiresAt
      });
      if (!activated) {
        throw new ApiError(409, "CONFLICT", "Activation code was activated by another request");
      }
      const activatedCode = await this.requireCode(codeHash, app2);
      await this.repo.insertLog({
        codeId: code.id,
        appDbId: app2.id,
        action: LOG_ACTION.ACTIVATE,
        result: LOG_RESULT.SUCCESS,
        deviceHash,
        message: "\u6FC0\u6D3B\u6210\u529F"
      });
      return this.toClientLicense(activatedCode);
    } catch (error) {
      await this.logClientFailure(error, code, app2, LOG_ACTION.ACTIVATE, deviceHash);
      throw error;
    }
  }
  async getClientAppInfo(input) {
    const app2 = await this.requireValidClientApp(input.appId, input.appSecret);
    const latest = await this.repo.getLatestPublishedVersion(app2.id);
    return {
      ...toClientAppInfo(app2),
      latest_version: latest ? toClientVersion(latest) : null
    };
  }
  /**
   * 分销商取码：从指定应用（可限定套餐）原子取走一张未售出激活码，返回明文。
   * 复用 app_secret 鉴权（与客户端一致），取走后状态置为 issued（已售出），用户仍可正常激活。
   * 本分支激活码明文直接入库，直接返回；仅存量加密激活码需要 CODE_PLAINTEXT_ENCRYPTION_KEY 解密。
   */
  async claimNextCode(input) {
    const app2 = await this.requireValidClientApp(input.appId, input.appSecret);
    let claimed = null;
    for (let attempt = 1; attempt <= MAX_CLAIM_ATTEMPTS; attempt += 1) {
      claimed = await this.repo.claimNextCode({
        appDbId: app2.id,
        tenantId: app2.tenant_id,
        planCode: input.planCode
      });
      if (claimed) {
        break;
      }
    }
    if (!claimed) {
      throw new ApiError(404, "NO_CODE_AVAILABLE", "No unused activation code available");
    }
    let code = claimed.code ?? void 0;
    if (!code) {
      const encryptionKey = this.env.CODE_PLAINTEXT_ENCRYPTION_KEY;
      if (!claimed.encrypted || !encryptionKey) {
        throw new ApiError(500, "ENCRYPTION_KEY_NOT_CONFIGURED", "Legacy encrypted activation codes require CODE_PLAINTEXT_ENCRYPTION_KEY");
      }
      code = await decryptPlaintext(claimed.encrypted, encryptionKey);
    }
    await this.repo.insertLog({
      codeId: claimed.codeId,
      appDbId: app2.id,
      action: LOG_ACTION.CLAIM_CODE,
      result: LOG_RESULT.SUCCESS,
      message: `\u5206\u9500\u53D6\u7801\uFF08${claimed.planCode} ${claimed.planName}\uFF09\uFF0C\u5C3E\u53F7 ${claimed.codeSuffix}`
    });
    return {
      code,
      code_suffix: claimed.codeSuffix,
      plan_code: claimed.planCode
    };
  }
  async verify(input) {
    const app2 = await this.requireValidClientApp(input.appId, input.appSecret);
    const deviceHash = await this.hashDevice(input.deviceFingerprint);
    const codeHash = await this.hashCode(normalizeCode(input.code));
    const code = await this.requireCode(codeHash, app2);
    try {
      this.assertCodeUsable(code, deviceHash);
      if (code.status !== CODE_STATUS.ACTIVE) {
        throw new ApiError(400, "INVALID_CODE", "Activation code has not been activated");
      }
      if (!code.device_hash) {
        throw new ApiError(403, "DEVICE_MISMATCH", "Activation code is not bound to a device");
      }
      await this.repo.insertLog({
        codeId: code.id,
        appDbId: app2.id,
        action: LOG_ACTION.VERIFY,
        result: LOG_RESULT.SUCCESS,
        deviceHash,
        message: "\u6821\u9A8C\u6210\u529F"
      });
      return this.toClientLicense(code);
    } catch (error) {
      await this.logClientFailure(error, code, app2, LOG_ACTION.VERIFY, deviceHash);
      throw error;
    }
  }
  async unbindDevice(input) {
    const app2 = await this.requireValidClientApp(input.appId, input.appSecret);
    const deviceHash = await this.hashDevice(input.deviceFingerprint);
    const codeHash = await this.hashCode(normalizeCode(input.code));
    const code = await this.requireCode(codeHash, app2);
    try {
      this.assertActiveForUnbind(code, deviceHash);
      if (code.status !== CODE_STATUS.ACTIVE) {
        throw new ApiError(400, "INVALID_CODE", "Activation code has not been activated");
      }
      if (code.rebind_count >= MAX_REBINDS) {
        throw new ApiError(403, "REBINDS_EXCEEDED", "Device unbind limit exceeded");
      }
      if (code.last_rebind_at && Date.now() - new Date(code.last_rebind_at).getTime() < REBIND_COOLDOWN_MS) {
        throw new ApiError(429, "REBINDS_TOO_FREQUENT", "Device unbind is cooling down");
      }
      const unboundAt = nowIso();
      const unbound = await this.repo.unbindDevice({
        codeId: code.id,
        deviceHash,
        unboundAt,
        maxRebinds: MAX_REBINDS
      });
      if (!unbound) {
        throw new ApiError(409, "CONFLICT", "Device unbind conflict");
      }
      const unboundCode = await this.requireCode(codeHash, app2);
      await this.repo.insertLog({
        codeId: code.id,
        appDbId: app2.id,
        action: LOG_ACTION.UNBIND_DEVICE,
        result: LOG_RESULT.SUCCESS,
        deviceHash,
        message: "\u89E3\u7ED1\u6210\u529F"
      });
      return this.toClientLicense(unboundCode);
    } catch (error) {
      await this.logClientFailure(error, code, app2, LOG_ACTION.UNBIND_DEVICE, deviceHash);
      throw error;
    }
  }
  async deleteCode(codeId, adminId, tenantId) {
    const deleted = await this.repo.softDeleteCode(codeId, tenantId);
    if (!deleted) {
      throw new ApiError(404, "NOT_FOUND", "Activation code not found");
    }
    await this.repo.insertLog({
      codeId,
      action: LOG_ACTION.DELETE_CODE,
      result: LOG_RESULT.SUCCESS,
      message: `\u5220\u9664\u6FC0\u6D3B\u7801\uFF0C\u7BA1\u7406\u5458 ID\uFF1A${adminId}`
    });
  }
  async forceDeleteCode(codeId, adminId, tenantId) {
    const code = await this.repo.getCodeById(codeId, tenantId);
    if (!code) {
      throw new ApiError(404, "NOT_FOUND", "Activation code not found");
    }
    const deleted = await this.repo.hardDeleteCode(codeId, tenantId);
    if (!deleted) {
      throw new ApiError(404, "NOT_FOUND", "Activation code not found");
    }
    await this.repo.insertLog({
      appDbId: code.app_id,
      action: LOG_ACTION.FORCE_DELETE_CODE,
      result: LOG_RESULT.SUCCESS,
      message: `\u5F3A\u5236\u5220\u9664\u6FC0\u6D3B\u7801\uFF0C\u7BA1\u7406\u5458 ID\uFF1A${adminId}`
    });
    return {
      deleted: true
    };
  }
  async updateCodeDisabled(input) {
    const changedAt = nowIso();
    const updated = await this.repo.updateCodeDisabled({
      codeId: input.codeId,
      tenantId: input.tenantId,
      disabled: input.disabled,
      changedAt
    });
    if (!updated) {
      throw new ApiError(404, "NOT_FOUND", "Activation code not found");
    }
    await this.repo.insertLog({
      codeId: input.codeId,
      action: input.disabled ? LOG_ACTION.DISABLE_CODE : LOG_ACTION.ENABLE_CODE,
      result: LOG_RESULT.SUCCESS,
      message: `${input.disabled ? "\u7981\u7528" : "\u542F\u7528"}\u6FC0\u6D3B\u7801\uFF0C\u7BA1\u7406\u5458 ID\uFF1A${input.adminId}`
    });
    return {
      updated: true
    };
  }
  async manuallyUnbindDevice(input) {
    const unbound = await this.repo.manuallyUnbindDevice({
      codeId: input.codeId,
      tenantId: input.tenantId,
      changedAt: nowIso()
    });
    if (!unbound) {
      throw new ApiError(404, "NOT_FOUND", "Bound activation code not found");
    }
    await this.repo.insertLog({
      codeId: input.codeId,
      action: LOG_ACTION.MANUAL_UNBIND_DEVICE,
      result: LOG_RESULT.SUCCESS,
      message: `\u624B\u52A8\u89E3\u7ED1\u8BBE\u5907\uFF0C\u7BA1\u7406\u5458 ID\uFF1A${input.adminId}`
    });
    return {
      unbound: true
    };
  }
  async bulkUpdateCodes(input) {
    let updated = 0;
    for (const codeId of input.codeIds) {
      if (input.action === CODE_BULK_ACTION.FORCE_DELETE) {
        const code = await this.repo.getCodeById(codeId, input.tenantId);
        if (!code) {
          continue;
        }
        const changed2 = await this.repo.hardDeleteCode(codeId, input.tenantId);
        if (!changed2) {
          continue;
        }
        updated += 1;
        await this.repo.insertLog({
          appDbId: code.app_id,
          action: LOG_ACTION.FORCE_DELETE_CODE,
          result: LOG_RESULT.SUCCESS,
          message: `\u5F3A\u5236\u5220\u9664\u6FC0\u6D3B\u7801\uFF0C\u7BA1\u7406\u5458 ID\uFF1A${input.adminId}`
        });
        continue;
      }
      const changed = await this.updateCodeByBulkAction(codeId, input.action, input.tenantId);
      if (!changed) {
        continue;
      }
      updated += 1;
      await this.repo.insertLog({
        codeId,
        action: toCodeLogAction(input.action),
        result: LOG_RESULT.SUCCESS,
        message: `${toCodeLogVerb(input.action)}\u6FC0\u6D3B\u7801\uFF0C\u7BA1\u7406\u5458 ID\uFF1A${input.adminId}`
      });
    }
    if (updated === 0) {
      throw new ApiError(404, "NOT_FOUND", "No activation codes were updated");
    }
    return {
      action: input.action,
      requested: input.codeIds.length,
      updated
    };
  }
  async requireValidClientApp(appId, appSecret) {
    const app2 = await this.repo.getAppByPublicId(appId);
    if (!app2) {
      throw new ApiError(404, "NOT_FOUND", "App not found");
    }
    if (app2.status !== APP_STATUS.ACTIVE) {
      throw new ApiError(403, "APP_DISABLED", "App is disabled");
    }
    if (app2.tenant_status !== TENANT_STATUS.ACTIVE) {
      throw new ApiError(403, "APP_DISABLED", "Tenant is disabled");
    }
    const secretHash = await this.hashAppSecret(appSecret);
    if (!timingSafeEqual(secretHash, app2.app_secret_hash)) {
      throw new ApiError(401, "INVALID_APP_SECRET", "Invalid app secret");
    }
    return app2;
  }
  async updateCodeByBulkAction(codeId, action, tenantId) {
    if (action === CODE_BULK_ACTION.DELETE) {
      return await this.repo.softDeleteCode(codeId, tenantId);
    }
    return await this.repo.updateCodeDisabled({
      codeId,
      tenantId,
      disabled: action === CODE_BULK_ACTION.DISABLE,
      changedAt: nowIso()
    });
  }
  async requireCode(codeHash, app2) {
    const code = await this.repo.findCodeByHash(codeHash);
    if (!code || code.app_id !== app2.id) {
      throw new ApiError(404, "INVALID_CODE", "Activation code not found");
    }
    return code;
  }
  assertCodeUsable(code, deviceHash) {
    if (code.status === CODE_STATUS.DELETED) {
      throw new ApiError(410, "CODE_DELETED", "Activation code was deleted");
    }
    if (code.disabled_at) {
      throw new ApiError(403, "CODE_DISABLED", "Activation code is disabled");
    }
    if (isExpired(code.expires_at)) {
      throw new ApiError(403, "CODE_EXPIRED", "Activation code has expired");
    }
    if (code.status === CODE_STATUS.ACTIVE && code.device_hash && !timingSafeEqual(code.device_hash, deviceHash)) {
      throw new ApiError(403, "DEVICE_MISMATCH", "Activation code is bound to another device");
    }
  }
  assertActiveForUnbind(code, deviceHash) {
    if (code.status === CODE_STATUS.DELETED) {
      throw new ApiError(410, "CODE_DELETED", "Activation code was deleted");
    }
    if (code.disabled_at) {
      throw new ApiError(403, "CODE_DISABLED", "Activation code is disabled");
    }
    if (isExpired(code.expires_at)) {
      throw new ApiError(403, "CODE_EXPIRED", "Activation code has expired");
    }
    if (code.status !== CODE_STATUS.ACTIVE || !code.device_hash) {
      throw new ApiError(400, "INVALID_CODE", "Activation code has not been activated");
    }
    if (!timingSafeEqual(code.device_hash, deviceHash)) {
      throw new ApiError(403, "DEVICE_MISMATCH", "Device fingerprint does not match");
    }
  }
  toClientLicense(code) {
    if (!code.expires_at || !code.activated_at) {
      throw new ApiError(400, "INVALID_CODE", "Activation code has not been activated");
    }
    return {
      valid: true,
      device_bound: Boolean(code.device_hash),
      app_id: code.app_public_id,
      plan: {
        code: code.plan_code,
        name: code.plan_name,
        duration_days: code.duration_days
      },
      activated_at: code.activated_at,
      expires_at: code.expires_at,
      remaining_seconds: secondsUntil(code.expires_at),
      rebind_count: code.rebind_count,
      max_rebinds: MAX_REBINDS
    };
  }
  calculateExpiresAt(activatedAt, code) {
    switch (code.plan_code) {
      case "lifetime":
        return "2099-12-31T23:59:59.000Z";
      case "monthly":
        return addMonthsIso(activatedAt, 1);
      case "quarterly":
        return addMonthsIso(activatedAt, 3);
      case "yearly":
        return addYearsIso(activatedAt, 1);
      default:
        return addDaysIso(activatedAt, code.duration_days);
    }
  }
  async logClientFailure(error, code, app2, action, deviceHash) {
    const apiError = error instanceof ApiError ? error : new ApiError(500, "CONFLICT", "Unexpected failure");
    await this.repo.insertLog({
      codeId: code.id,
      appDbId: app2.id,
      action,
      result: LOG_RESULT.FAILURE,
      deviceHash,
      errorCode: apiError.code,
      message: toLogErrorMessage(apiError)
    });
  }
  async hashCode(code) {
    return await hmacSha256(requireEnv(this.env, "CODE_HMAC_SECRET"), code);
  }
  async hashAppSecret(secret) {
    return await hmacSha256(requireEnv(this.env, "APP_SECRET_HMAC_SECRET"), secret);
  }
  async hashDevice(deviceFingerprint) {
    return await hmacSha256(requireEnv(this.env, "DEVICE_HMAC_SECRET"), deviceFingerprint);
  }
};
function stripAppSecret(app2) {
  const { app_secret_hash: _appSecretHash, tenant_status: _tenantStatus, ...safeApp } = app2;
  return safeApp;
}
function validateTenantSlug(slug) {
  if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(slug)) {
    throw new ApiError(400, "BAD_REQUEST", "Tenant slug must use 2-63 lowercase letters, numbers or hyphens");
  }
}
function validateNewPassword(password, label) {
  if (password.length < 8) {
    throw new ApiError(400, "BAD_REQUEST", `${label} must be at least 8 characters`);
  }
}
function toClientAppInfo(app2) {
  return {
    app_id: app2.app_id,
    name: app2.name,
    description: app2.description,
    purchase_url: app2.purchase_url,
    platform: app2.platform,
    status: app2.status
  };
}
function toClientVersion(version) {
  return {
    version: version.version,
    version_code: version.version_code,
    release_notes: version.release_notes,
    download_url: version.download_url,
    is_forced: version.is_forced === 1,
    published_at: version.published_at
  };
}
function toLogErrorMessage(error) {
  const messages = {
    APP_DISABLED: "\u5E94\u7528\u5DF2\u7981\u7528",
    INVALID_APP_SECRET: "\u5E94\u7528\u5BC6\u94A5\u65E0\u6548",
    INVALID_CODE: "\u6FC0\u6D3B\u7801\u65E0\u6548",
    CODE_DISABLED: "\u6FC0\u6D3B\u7801\u5DF2\u7981\u7528",
    CODE_DELETED: "\u6FC0\u6D3B\u7801\u5DF2\u5220\u9664",
    CODE_EXPIRED: "\u6FC0\u6D3B\u7801\u5DF2\u8FC7\u671F",
    DEVICE_MISMATCH: "\u8BBE\u5907\u4E0D\u5339\u914D",
    REBINDS_EXCEEDED: "\u89E3\u7ED1\u6B21\u6570\u5DF2\u8FBE\u4E0A\u9650",
    REBINDS_TOO_FREQUENT: "\u89E3\u7ED1\u51B7\u5374\u4E2D",
    CONFLICT: "\u64CD\u4F5C\u51B2\u7A81"
  };
  return messages[error.code] ?? "\u64CD\u4F5C\u5931\u8D25";
}
function toCodeLogAction(action) {
  if (action === CODE_BULK_ACTION.DELETE) {
    return LOG_ACTION.DELETE_CODE;
  }
  return action === CODE_BULK_ACTION.DISABLE ? LOG_ACTION.DISABLE_CODE : LOG_ACTION.ENABLE_CODE;
}
function toCodeLogVerb(action) {
  if (action === CODE_BULK_ACTION.DELETE) {
    return "\u5220\u9664";
  }
  return action === CODE_BULK_ACTION.DISABLE ? "\u7981\u7528" : "\u542F\u7528";
}

// worker/src/routes.ts
function createApi() {
  const api = new Hono2();
  api.use("*", async (c, next) => {
    validateEnv(c.env);
    await next();
  });
  api.get("/health", (c) => c.json(ok({ status: "ok" })));
  api.post("/admin/login", async (c) => {
    const body = await readJson(c.req.raw);
    const tenant = requireString(body.tenant, "tenant");
    const username = requireString(body.username, "username");
    const password = requireString(body.password, "password");
    const repo = await createRepository(c.env);
    const service = new LicenseService(repo, c.env);
    const admin = await service.authenticateAdmin(tenant, username, password);
    const token = await signJwt(requireEnv(c.env, "JWT_SECRET"), { sub: String(admin.id), username: admin.username }, 8 * 60 * 60);
    return c.json(ok({ token, admin }));
  });
  api.post("/recovery/admin-password", async (c) => {
    const body = await readJson(c.req.raw);
    const username = requireString(body.username, "username");
    const recoveryPassword = requireString(body.recovery_password, "recovery_password");
    const newPassword = requireString(body.new_password, "new_password");
    const repo = await createRepository(c.env);
    const service = new LicenseService(repo, c.env);
    const result = await service.resetAdminPassword({
      username,
      recoveryPassword,
      newPassword
    });
    return c.json(ok(result));
  });
  api.use("/admin/*", requireAdmin);
  api.get("/admin/me", (c) => c.json(ok({ admin: c.get("admin") })));
  api.get("/admin/tenants", async (c) => {
    requireSuperAdmin(c);
    const repo = await createRepository(c.env);
    return c.json(ok({ items: await repo.listTenants() }));
  });
  api.post("/admin/tenants", async (c) => {
    requireSuperAdmin(c);
    const body = await readJson(c.req.raw);
    const status = optionalString(body.status) ?? TENANT_STATUS.ACTIVE;
    if (!isTenantStatus(status)) {
      throw new ApiError(400, "BAD_REQUEST", "status must be active or disabled");
    }
    const service = new LicenseService(await createRepository(c.env), c.env);
    const result = await service.createTenant({
      name: requireString(body.name, "name"),
      slug: requireString(body.slug, "slug"),
      status,
      adminUsername: requireString(body.admin_username, "admin_username"),
      adminPassword: requireString(body.admin_password, "admin_password")
    });
    return c.json(ok(result), 201);
  });
  api.patch("/admin/tenants/:id", async (c) => {
    requireSuperAdmin(c);
    const body = await readJson(c.req.raw);
    const service = new LicenseService(await createRepository(c.env), c.env);
    return c.json(ok(await service.updateTenant({
      tenantId: requireInteger(c.req.param("id"), "id", { min: 1 }),
      name: requireString(body.name, "name"),
      slug: requireString(body.slug, "slug")
    })));
  });
  api.patch("/admin/tenants/:id/status", async (c) => {
    requireSuperAdmin(c);
    const body = await readJson(c.req.raw);
    const status = requireString(body.status, "status");
    if (!isTenantStatus(status)) {
      throw new ApiError(400, "BAD_REQUEST", "status must be active or disabled");
    }
    const service = new LicenseService(await createRepository(c.env), c.env);
    return c.json(ok(await service.updateTenantStatus(requireInteger(c.req.param("id"), "id", { min: 1 }), status)));
  });
  api.patch("/admin/tenants/:id/admin-password", async (c) => {
    requireSuperAdmin(c);
    const body = await readJson(c.req.raw);
    const service = new LicenseService(await createRepository(c.env), c.env);
    return c.json(ok(await service.resetTenantAdminPassword({
      tenantId: requireInteger(c.req.param("id"), "id", { min: 1 }),
      username: requireString(body.username, "username"),
      newPassword: requireString(body.new_password, "new_password")
    })));
  });
  api.delete("/admin/tenants/:id", async (c) => {
    requireSuperAdmin(c);
    const service = new LicenseService(await createRepository(c.env), c.env);
    return c.json(ok(await service.deleteTenant(requireInteger(c.req.param("id"), "id", { min: 1 }))));
  });
  api.get("/admin/dashboard", async (c) => {
    const repo = await createRepository(c.env);
    return c.json(ok(await repo.getDashboardStats(await resolveTenantId(c))));
  });
  api.patch("/admin/password", async (c) => {
    const body = await readJson(c.req.raw);
    const currentPassword = requireString(body.current_password, "current_password");
    const newPassword = requireString(body.new_password, "new_password");
    const repo = await createRepository(c.env);
    const service = new LicenseService(repo, c.env);
    const result = await service.changeAdminPassword({
      adminId: c.get("admin").id,
      currentPassword,
      newPassword
    });
    return c.json(ok(result));
  });
  api.get("/admin/plans", async (c) => {
    const repo = await createRepository(c.env);
    return c.json(ok({ items: await repo.getPlans() }));
  });
  api.get("/admin/apps", async (c) => {
    const repo = await createRepository(c.env);
    return c.json(ok({ items: await repo.listApps(await resolveTenantId(c)) }));
  });
  api.post("/admin/apps", async (c) => {
    const body = await readJson(c.req.raw);
    const name = requireString(body.name, "name");
    const description = optionalString(body.description);
    const purchaseUrl = optionalHttpUrl(body.purchase_url, "purchase_url");
    const platform = requireString(body.platform, "platform");
    const status = optionalString(body.status) === APP_STATUS.DISABLED ? APP_STATUS.DISABLED : APP_STATUS.ACTIVE;
    const repo = await createRepository(c.env);
    const service = new LicenseService(repo, c.env);
    const app2 = await service.createApp({ tenantId: await resolveTenantId(c), name, description, purchaseUrl, platform, status });
    return c.json(ok(app2), 201);
  });
  api.patch("/admin/apps/:appId", async (c) => {
    const body = await readJson(c.req.raw);
    const name = requireString(body.name, "name");
    const description = optionalString(body.description);
    const purchaseUrl = optionalHttpUrl(body.purchase_url, "purchase_url");
    const platform = requireString(body.platform, "platform");
    const repo = await createRepository(c.env);
    const service = new LicenseService(repo, c.env);
    const app2 = await service.updateApp({ tenantId: await resolveTenantId(c), appId: c.req.param("appId"), name, description, purchaseUrl, platform });
    return c.json(ok(app2));
  });
  api.patch("/admin/apps/:appId/status", async (c) => {
    const body = await readJson(c.req.raw);
    const status = requireString(body.status, "status");
    if (!isAppStatus(status)) {
      throw new ApiError(400, "BAD_REQUEST", "status must be active or disabled");
    }
    const repo = await createRepository(c.env);
    const service = new LicenseService(repo, c.env);
    const result = await service.updateAppStatus({
      appId: c.req.param("appId"),
      tenantId: await resolveTenantId(c),
      status,
      adminId: c.get("admin").id
    });
    return c.json(ok(result));
  });
  api.patch("/admin/apps/:appId/secret", async (c) => {
    const repo = await createRepository(c.env);
    const service = new LicenseService(repo, c.env);
    const result = await service.rotateAppSecret({
      appId: c.req.param("appId"),
      tenantId: await resolveTenantId(c),
      adminId: c.get("admin").id
    });
    return c.json(ok(result));
  });
  api.delete("/admin/apps/:appId", async (c) => {
    const repo = await createRepository(c.env);
    const service = new LicenseService(repo, c.env);
    const result = await service.deleteApp(c.req.param("appId"), await resolveTenantId(c));
    return c.json(ok(result));
  });
  api.get("/admin/versions", async (c) => {
    const repo = await createRepository(c.env);
    const service = new LicenseService(repo, c.env);
    const page = requireInteger(c.req.query("page") ?? 1, "page", { min: 1 });
    const pageSize = requireInteger(c.req.query("page_size") ?? 20, "page_size", { min: 1, max: 100 });
    const status = c.req.query("status");
    const normalizedStatus = status && isVersionStatus(status) ? status : void 0;
    if (status && !normalizedStatus) {
      throw new ApiError(400, "BAD_REQUEST", "Invalid status filter");
    }
    const result = await service.listVersions({
      tenantId: await resolveTenantId(c),
      appId: c.req.query("app_id") || void 0,
      version: c.req.query("version")?.trim() || void 0,
      status: normalizedStatus,
      page,
      pageSize
    });
    return c.json(ok(result));
  });
  api.post("/admin/versions", async (c) => {
    const body = await readJson(c.req.raw);
    const service = new LicenseService(await createRepository(c.env), c.env);
    const result = await service.createVersion({
      tenantId: await resolveTenantId(c),
      appId: requireString(body.app_id, "app_id"),
      version: requireString(body.version, "version"),
      versionCode: requireInteger(body.version_code, "version_code", { min: 1 }),
      releaseNotes: optionalString(body.release_notes) ?? "",
      downloadUrl: optionalHttpUrl(body.download_url, "download_url"),
      isForced: body.is_forced === true,
      adminId: c.get("admin").id
    });
    return c.json(ok(result), 201);
  });
  api.patch("/admin/versions/:id", async (c) => {
    const body = await readJson(c.req.raw);
    const service = new LicenseService(await createRepository(c.env), c.env);
    const versionCode = body.version_code === void 0 || body.version_code === null ? void 0 : requireInteger(body.version_code, "version_code", { min: 1 });
    const downloadUrl = body.download_url === void 0 || body.download_url === null ? void 0 : optionalHttpUrl(body.download_url, "download_url");
    const isForced = body.is_forced === void 0 ? void 0 : body.is_forced === true;
    const result = await service.updateVersion({
      tenantId: await resolveTenantId(c),
      versionId: requireInteger(c.req.param("id"), "id", { min: 1 }),
      version: optionalString(body.version),
      versionCode,
      releaseNotes: optionalString(body.release_notes),
      downloadUrl,
      isForced,
      adminId: c.get("admin").id
    });
    return c.json(ok(result));
  });
  api.post("/admin/versions/:id/publish", async (c) => {
    const service = new LicenseService(await createRepository(c.env), c.env);
    const result = await service.publishVersion({
      tenantId: await resolveTenantId(c),
      versionId: requireInteger(c.req.param("id"), "id", { min: 1 }),
      adminId: c.get("admin").id
    });
    return c.json(ok(result));
  });
  api.post("/admin/versions/:id/unpublish", async (c) => {
    const service = new LicenseService(await createRepository(c.env), c.env);
    const result = await service.unpublishVersion({
      tenantId: await resolveTenantId(c),
      versionId: requireInteger(c.req.param("id"), "id", { min: 1 }),
      adminId: c.get("admin").id
    });
    return c.json(ok(result));
  });
  api.delete("/admin/versions/:id", async (c) => {
    const service = new LicenseService(await createRepository(c.env), c.env);
    const result = await service.deleteVersion({
      tenantId: await resolveTenantId(c),
      versionId: requireInteger(c.req.param("id"), "id", { min: 1 }),
      adminId: c.get("admin").id
    });
    return c.json(ok(result));
  });
  api.post("/admin/codes/batch", async (c) => {
    const body = await readJson(c.req.raw);
    const appId = requireString(body.app_id, "app_id");
    const planCode = requireString(body.plan_code, "plan_code");
    const quantity = requireInteger(body.quantity, "quantity", { min: 1, max: MAX_CODE_BATCH_QUANTITY });
    const note = optionalString(body.note);
    const repo = await createRepository(c.env);
    const service = new LicenseService(repo, c.env);
    const result = await service.generateCodes({
      appId,
      tenantId: await resolveTenantId(c),
      planCode,
      quantity,
      note,
      adminId: c.get("admin").id
    });
    return c.json(ok(result), 201);
  });
  api.get("/admin/codes", async (c) => {
    const repo = await createRepository(c.env);
    const page = requireInteger(c.req.query("page") ?? 1, "page", { min: 1 });
    const pageSize = requireInteger(c.req.query("page_size") ?? 20, "page_size", { min: 1, max: 100 });
    const status = c.req.query("status");
    const normalizedStatus = status && isCodeListStatus(status) ? status : void 0;
    if (status && !normalizedStatus) {
      throw new ApiError(400, "BAD_REQUEST", "Invalid status filter");
    }
    const result = await repo.listCodes({
      tenantId: await resolveTenantId(c),
      query: c.req.query("query") || void 0,
      appId: c.req.query("app_id") || void 0,
      planCode: c.req.query("plan_code") || void 0,
      status: normalizedStatus,
      page,
      pageSize
    });
    return c.json(ok(result));
  });
  api.patch("/admin/codes/:id/status", async (c) => {
    const id = requireInteger(c.req.param("id"), "id", { min: 1 });
    const body = await readJson(c.req.raw);
    const status = requireString(body.status, "status");
    if (!isCodeToggleStatus(status)) {
      throw new ApiError(400, "BAD_REQUEST", "status must be enabled or disabled");
    }
    const repo = await createRepository(c.env);
    const service = new LicenseService(repo, c.env);
    const result = await service.updateCodeDisabled({
      codeId: id,
      tenantId: await resolveTenantId(c),
      disabled: status === CODE_TOGGLE_STATUS.DISABLED,
      adminId: c.get("admin").id
    });
    return c.json(ok(result));
  });
  api.patch("/admin/codes/:id/unbind-device", async (c) => {
    const id = requireInteger(c.req.param("id"), "id", { min: 1 });
    const repo = await createRepository(c.env);
    const service = new LicenseService(repo, c.env);
    const result = await service.manuallyUnbindDevice({
      codeId: id,
      tenantId: await resolveTenantId(c),
      adminId: c.get("admin").id
    });
    return c.json(ok(result));
  });
  api.post("/admin/codes/bulk", async (c) => {
    const body = await readJson(c.req.raw);
    const action = requireString(body.action, "action");
    if (!isCodeBulkAction(action)) {
      throw new ApiError(400, "BAD_REQUEST", "action must be delete, enable, disable or force_delete");
    }
    const ids = requireIntegerArray(body.ids, "ids", { min: 1, max: 100 });
    const repo = await createRepository(c.env);
    const service = new LicenseService(repo, c.env);
    const result = await service.bulkUpdateCodes({
      codeIds: ids,
      tenantId: await resolveTenantId(c),
      action,
      adminId: c.get("admin").id
    });
    return c.json(ok(result));
  });
  api.delete("/admin/codes/:id", async (c) => {
    const id = requireInteger(c.req.param("id"), "id", { min: 1 });
    const repo = await createRepository(c.env);
    const service = new LicenseService(repo, c.env);
    await service.deleteCode(id, c.get("admin").id, await resolveTenantId(c));
    return c.json(ok({ deleted: true }));
  });
  api.delete("/admin/codes/:id/force", async (c) => {
    const id = requireInteger(c.req.param("id"), "id", { min: 1 });
    const repo = await createRepository(c.env);
    const service = new LicenseService(repo, c.env);
    const result = await service.forceDeleteCode(id, c.get("admin").id, await resolveTenantId(c));
    return c.json(ok(result));
  });
  api.get("/admin/logs", async (c) => {
    const repo = await createRepository(c.env);
    const page = requireInteger(c.req.query("page") ?? 1, "page", { min: 1 });
    const pageSize = requireInteger(c.req.query("page_size") ?? 20, "page_size", { min: 1, max: 100 });
    const result = await repo.listLogs({
      tenantId: await resolveTenantId(c),
      query: c.req.query("query") || void 0,
      appId: c.req.query("app_id") || void 0,
      action: c.req.query("action") || void 0,
      page,
      pageSize
    });
    return c.json(ok(result));
  });
  api.post("/client/activate", async (c) => {
    const body = await readJson(c.req.raw);
    const repo = await createRepository(c.env);
    const service = new LicenseService(repo, c.env);
    const result = await service.activate({
      appId: requireString(body.app_id, "app_id"),
      appSecret: requireString(body.app_secret, "app_secret"),
      code: requireString(body.code, "code"),
      deviceFingerprint: requireString(body.device_fingerprint, "device_fingerprint")
    });
    return c.json(ok(result));
  });
  api.post("/client/app-info", async (c) => {
    const body = await readJson(c.req.raw);
    const repo = await createRepository(c.env);
    const service = new LicenseService(repo, c.env);
    const result = await service.getClientAppInfo({
      appId: requireString(body.app_id, "app_id"),
      appSecret: requireString(body.app_secret, "app_secret")
    });
    return c.json(ok(result));
  });
  api.get("/distributor/claim", async (c) => {
    const appId = requireString(c.req.query("app_id"), "app_id");
    const planCode = c.req.query("plan_code")?.trim() || void 0;
    const auth = c.req.header("authorization") ?? "";
    const appSecret = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";
    if (!appSecret) {
      throw new ApiError(401, "UNAUTHORIZED", "Missing bearer token");
    }
    const repo = await createRepository(c.env);
    const service = new LicenseService(repo, c.env);
    const result = await service.claimNextCode({ appId, appSecret, planCode });
    return c.json(ok(result));
  });
  api.post("/client/versions/latest", async (c) => {
    const body = await readJson(c.req.raw);
    const repo = await createRepository(c.env);
    const service = new LicenseService(repo, c.env);
    const currentVersionCode = body.current_version_code === void 0 || body.current_version_code === null ? void 0 : requireInteger(body.current_version_code, "current_version_code", { min: 1 });
    const result = await service.getClientLatestVersion({
      appId: requireString(body.app_id, "app_id"),
      appSecret: requireString(body.app_secret, "app_secret"),
      currentVersionCode
    });
    return c.json(ok(result));
  });
  api.post("/client/verify", async (c) => {
    const body = await readJson(c.req.raw);
    const repo = await createRepository(c.env);
    const service = new LicenseService(repo, c.env);
    const result = await service.verify({
      appId: requireString(body.app_id, "app_id"),
      appSecret: requireString(body.app_secret, "app_secret"),
      code: requireString(body.code, "code"),
      deviceFingerprint: requireString(body.device_fingerprint, "device_fingerprint")
    });
    return c.json(ok(result));
  });
  api.post("/client/unbind-device", async (c) => {
    const body = await readJson(c.req.raw);
    const repo = await createRepository(c.env);
    const service = new LicenseService(repo, c.env);
    const result = await service.unbindDevice({
      appId: requireString(body.app_id, "app_id"),
      appSecret: requireString(body.app_secret, "app_secret"),
      code: requireString(body.code, "code"),
      deviceFingerprint: requireString(body.device_fingerprint, "device_fingerprint")
    });
    return c.json(ok(result));
  });
  return api;
}
function requireIntegerArray(value, name, options = {}) {
  if (!Array.isArray(value)) {
    throw new ApiError(400, "BAD_REQUEST", `${name} must be an array`);
  }
  if (options.min !== void 0 && value.length < options.min) {
    throw new ApiError(400, "BAD_REQUEST", `${name} must contain at least ${options.min} item`);
  }
  if (options.max !== void 0 && value.length > options.max) {
    throw new ApiError(400, "BAD_REQUEST", `${name} must contain at most ${options.max} items`);
  }
  const ids = value.map((item, index) => requireInteger(item, `${name}[${index}]`, { min: 1 }));
  return Array.from(new Set(ids));
}

// worker/src/index.ts
var app = new Hono2();
app.route("/api", createApi());
app.onError((error, c) => {
  if (error instanceof ApiError) {
    return jsonError(error.status, fail(error.code, error.message));
  }
  if (error instanceof HTTPException) {
    return jsonError(error.status, fail("BAD_REQUEST", error.message));
  }
  console.error(error);
  return jsonError(500, fail("CONFLICT", "Unexpected server error"));
});
app.notFound(async (c) => {
  if (c.req.path.startsWith("/api/")) {
    return c.json(fail("NOT_FOUND", "API route not found"), 404);
  }
  if (c.env.ASSETS && typeof c.env.ASSETS.fetch === "function") {
    return c.env.ASSETS.fetch(c.req.raw);
  }
  return c.json(fail("NOT_FOUND", "Resource not found"), 404);
});
var index_default = app;
function jsonError(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8"
    }
  });
}

// worker/src/edgeone-entry.ts
async function onRequest(context) {
  return index_default.fetch(context.request, context.env);
}
var edgeone_entry_default = onRequest;
export {
  edgeone_entry_default as default,
  onRequest
};

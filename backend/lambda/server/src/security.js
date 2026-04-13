"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
exports.createSessionToken = createSessionToken;
exports.verifySessionToken = verifySessionToken;
const node_crypto_1 = require("node:crypto");
const SESSION_SECRET = process.env.LOCAL_AUTH_SESSION_SECRET ?? "ems-local-dev-secret";
function base64Url(input) {
    return Buffer.from(input)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}
function decodeBase64Url(input) {
    const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    return Buffer.from(padded, "base64").toString("utf8");
}
function hashPassword(password) {
    const salt = (0, node_crypto_1.randomBytes)(16).toString("hex");
    const hash = (0, node_crypto_1.scryptSync)(password, salt, 64).toString("hex");
    return `${salt}:${hash}`;
}
function verifyPassword(password, storedHash) {
    const [salt, hash] = storedHash.split(":");
    if (!salt || !hash) {
        return false;
    }
    const derived = (0, node_crypto_1.scryptSync)(password, salt, 64);
    const expected = Buffer.from(hash, "hex");
    if (derived.length !== expected.length) {
        return false;
    }
    return (0, node_crypto_1.timingSafeEqual)(derived, expected);
}
function createSessionToken(payload) {
    const encodedPayload = base64Url(JSON.stringify(payload));
    const signature = (0, node_crypto_1.createHmac)("sha256", SESSION_SECRET).update(encodedPayload).digest("hex");
    return `${encodedPayload}.${signature}`;
}
function verifySessionToken(token) {
    const [encodedPayload, signature] = token.split(".");
    if (!encodedPayload || !signature) {
        return null;
    }
    const expectedSignature = (0, node_crypto_1.createHmac)("sha256", SESSION_SECRET).update(encodedPayload).digest("hex");
    if (signature.length !== expectedSignature.length) {
        return null;
    }
    const isValid = (0, node_crypto_1.timingSafeEqual)(Buffer.from(signature), Buffer.from(expectedSignature));
    if (!isValid) {
        return null;
    }
    try {
        return JSON.parse(decodeBase64Url(encodedPayload));
    }
    catch {
        return null;
    }
}

import fs from "node:fs/promises";
import crypto from "node:crypto";

import * as JSON from "./jsonx.js";

const JwtSecret = await fs.readFile("/run/secrets/jwt_secret", "utf-8");

function b64Encode(input: string | Buffer): string {
	return Buffer.from(input).toString("base64").replace(/=*$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function b64Decode(input: string): Buffer {
	return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export function sign(payload: unknown): string {
	if (typeof payload !== "object" || payload === null) {
		throw new JwtError("Invalid payload");
	}
	Object.assign(payload, { iss: "inn", aud: "charter-authority" });
	const header = { alg: "HS256" };
	const encodedHeader = b64Encode(JSON.stringify(header));
	const encodedPayload = b64Encode(JSON.stringify(payload));
	const signature = b64Encode(crypto.createHmac("SHA256", JwtSecret).update(encodedHeader + "." + encodedPayload).digest());
	return encodedHeader + "." + encodedPayload + "." + signature;
}

export function verify(token: string): unknown {
	const parts = token.split(".");

	if (parts.length !== 3) {
		throw new JwtError("Invalid JWT");
	}

	const [rawHeader, rawPayload, rawSignature] = parts;

	// Check for valid header
	const header = JSON.parse(b64Decode(rawHeader).toString());
	if (typeof header !== "object" || header === null || !("alg" in header) || typeof header.alg !== "string" || header.alg !== "HS256") {
		throw new JwtError("Invalid JWT");
	}

	// Check for valid signature
	const signature = b64Decode(rawSignature);
	const expectedSignature = crypto.createHmac("sha256", JwtSecret).update(`${rawHeader}.${rawPayload}`).digest();
	if (signature.length !== expectedSignature.length || !crypto.timingSafeEqual(signature, expectedSignature)) {
		throw new JwtError("Invalid JWT");
	}

	const payload = JSON.parse(b64Decode(rawPayload).toString());
	if (typeof payload !== "object" || payload === null) {
		throw new JwtError("Invalid JWT");
	}

	if (!("iss" in payload) || payload.iss !== "charter-authority") {
		throw new JwtError("Invalid issuer");
	}

	if (!("aud" in payload) || payload.aud !== "inn") {
		throw new JwtError("Invalid audience");
	}

	return payload;
}

export class JwtError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "JwtError";
	}
}

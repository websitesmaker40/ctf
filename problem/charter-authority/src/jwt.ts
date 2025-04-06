import fs from "node:fs/promises";

import jwt from "jsonwebtoken";
import { ZodSchema } from "zod";
import { SafeError } from "./error.js";

const JwtSecret = await fs.readFile("/run/secrets/jwt_secret", "utf-8");

export function sign<T extends object>(payload: T): string {
	return jwt.sign(payload, JwtSecret, { algorithm: "HS256" });
}

export function verify<T>(token: string, schema: ZodSchema<T>): T {
	try {
		const payload = jwt.verify(token, JwtSecret, { algorithms: ["HS256"] });
		return schema.parse(payload);
	} catch (error) {
		console.error(error);
		throw new SafeError(400, "Invalid JWT");
	}
}

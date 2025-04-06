import fs from "node:fs/promises";
import { dirname } from "node:path";

import fastify from "fastify";
import fastifyView from "@fastify/view";
import fastifyStatic from "@fastify/static";

import ejs from "ejs";
import { z } from "zod";
import { SafeError } from "./error.js";
import { JwtError, sign, verify } from "./jwt.js";

import * as JSON from "./jsonx.js";

const domain = process.env.HOST ?? "localhost";
const config = JSON.parse(await fs.readFile("config.json", "utf-8")) as any;

const app = fastify({
	logger: true
});

app.addContentTypeParser("application/jsonx", { parseAs: "string" }, (req, payload: string, done) => {
	try {
		done(null, JSON.parse(payload));
	} catch (error: unknown) {
		done(error instanceof Error ? error : new Error("Failed to parse JSON"), null);
	}
});

app.register(fastifyView, {
	engine: {
		ejs,
	},
	root: new URL("../views", import.meta.url).pathname,
});

app.register(fastifyStatic, {
	root: new URL("../public", import.meta.url).pathname,
	prefix: "/public/",
});

app.setErrorHandler((error, req, res) => {
	if (error instanceof SafeError) {
		res.status(error.status).send(error.message);
	} else if (error instanceof z.ZodError) {
		req.log.error({ err: error }, "Validation error");
		res.status(400).send(error.errors);
	} else if (error instanceof JwtError) {
		req.log.error({ err: error }, "JWT error");
		res.status(400).send(error.message);
	} else {
		req.log.error({ err: error }, "Internal Server Error");
		res.status(500).send("Internal Server Error");
	}
});

app.get("/jsonx.js", async (req, res) => {
	return res.type("application/javascript").sendFile("jsonx.js", dirname(new URL(import.meta.url).pathname));
});

app.get("/enter", async (req, res) => {
	if (typeof req.query !== "object" || req.query === null || !("jwt" in req.query) || typeof req.query.jwt !== "string") {
		throw new SafeError(400, "Invalid JWT");
	}

	const token = req.query.jwt;
	const payload = verify(req.query.jwt);
	return res.view("form", { config, token, payload });
});

app.post("/submit", async (req, res) => {
	if (typeof req.body !== "object" || req.body === null || !("jwt" in req.body) || typeof req.body.jwt !== "string") {
		throw new SafeError(400, "Invalid JWT");
	}

	const formData = req.body as any;
	const payload = verify(req.body.jwt) as any;
	let newToken: string;

	if (!formData.stay) {
		newToken = sign(payload);
	} else {
		const checkoutDate = formData.checkoutDate;
		if (!(checkoutDate instanceof Date) || isNaN(checkoutDate.getTime())) {
			throw new SafeError(400, "Invalid checkout date");
		}

		if (checkoutDate < config.today || checkoutDate > config.latestCheckout) {
			throw new SafeError(400, "Invalid checkout date");
		}

		const nights = Math.ceil((checkoutDate.getTime() - config.today.getTime()) / (1000 * 60 * 60 * 24));
		if (nights <= 0) {
			throw new SafeError(400, "Invalid checkout date");
		}

		const roomType = formData.roomType;
		const roomInfo = config.roomInfo[roomType];

		if (roomInfo === undefined) {
			throw new SafeError(400, "Invalid room type");
		}

		const total = nights * roomInfo.price;

		if (!(payload.tokens >= total)) {
			throw new SafeError(400, "Insufficient funds");
		}

		const stay: any = { nights, roomType };

		if (formData.specialRequest) {
			stay.specialRequest = formData.specialRequest;
		}

		payload.tokens -= total;
		payload.stay = stay;

		newToken = sign(payload);
	}

	return res.send({ next: `http://charterauthority.${domain}/callback?service=inn&token=${newToken}` });
});

app.listen({ port: 80, host: "0.0.0.0" });

import fastify from "fastify";
import fastifyView from "@fastify/view";
import fastifyStatic from "@fastify/static";

import ejs from "ejs";
import { z } from "zod";

import { SafeError } from "./error.js";
import { BanditNegotiationRequest, banditNegotiationResponseSchema, BankRequest, bankResponseSchema, GeneralStoreRequest, generalStoreResponseSchema, InnRequest, innResponseSchema, LiveryRequest, liveryResponseSchema, Supplies, TokenExchangeRequest, tokenExchangeResponseSchema, TrailheadRequest, trailheadRequestSchema, WagonRepairRequest, wagonRepairResponseSchema } from "./types.js";
import { sign, verify } from "./jwt.js";

const domain = process.env.HOST ?? "localhost";

const app = fastify({
	logger: true
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
	} else {
		req.log.error({ err: error }, "Internal Server Error");
		res.status(500).send("Internal Server Error");
	}
});

app.get("/callback", async (req, res) => {
	const query = z.object({ service: z.string(), token: z.string() }).parse(req.query);

	switch (query.service) {
		case "token-exchange": {
			const token = verify(query.token, tokenExchangeResponseSchema);
			const jwt = sign<LiveryRequest>({
				iss: "charter-authority",
				aud: "livery",
				possessions: token.possessions,
				dysentery: true,
				tokens: token.tokens,
				gold: token.gold,
				wagon: token.wagon,
				animals: token.animals,
			});
			return res.view("progress", { progress: 1, jwt, domain });
		}

		case "livery": {
			const token = verify(query.token, liveryResponseSchema);
			const jwt = sign<WagonRepairRequest>({
				iss: "charter-authority",
				aud: "wagon-repair",
				possessions: token.possessions,
				dysentery: true,
				tokens: token.tokens,
				gold: token.gold,
				wagon: token.wagon,
				animals: token.animals,
			});
			return res.view("progress", { progress: 2, jwt, domain });
		}

		case "wagon-repair": {
			const token = verify(query.token, wagonRepairResponseSchema);
			const jwt = sign<GeneralStoreRequest>({
				iss: "charter-authority",
				aud: "general-store",
				possessions: token.possessions,
				dysentery: true,
				tokens: token.tokens,
				gold: token.gold,
				wagon: token.wagon,
				animals: token.animals,
				wagonParts: {
					wheels: token.wheels,
					axles: token.axles,
					covers: token.covers,
				},
			});
			return res.view("progress", { progress: 3, jwt, domain });
		}

		case "general-store": {
			const token = verify(query.token, generalStoreResponseSchema);

			const supplies: Supplies = {
				food: {
					bacon: token.bacon,
					beans: token.beans,
					candy: token.candy,
					coffee: token.coffee,
					flour: token.flour,
					fruit: token.fruit,
					salt: token.salt,
					sugar: token.sugar,
				},
				equipment: {
					axes: token.axes,
					cookware: token.cookware,
					firearms: token.firearms,
					knives: token.knives,
					rope: token.rope,
					saddles: token.saddles,
				},
				consumables: {
					ammunition: token.ammunition,
					candles: token.candles,
					fabric: token.fabric,
					kerosene: token.kerosene,
					medicine: token.medicine,
					soap: token.soap,
					tobacco: token.tobacco,
				}
			};

			const jwt = sign<BanditNegotiationRequest>({
				iss: "charter-authority",
				// these bandits are idiots and don't know how to write code
				// why are we working with them again???
				// aud: "bandit-negotiation",
				possessions: token.possessions,
				dysentery: true,
				tokens: token.tokens,
				gold: token.gold,
				wagon: token.wagon,
				animals: token.animals,
				wagonParts: token.wagonParts,
				supplies,
			});

			return res.view("progress", { progress: 4, jwt, domain });
		}

		case "bandit-negotiation": {
			const token = verify(query.token, banditNegotiationResponseSchema);

			const jwt = sign<InnRequest>({
				iss: "charter-authority",
				aud: "inn",
				possessions: token.possessions,
				dysentery: true,
				tokens: token.tokens,
				gold: token.gold,
				wagon: token.wagon,
				animals: token.animals,
				wagonParts: token.wagonParts,
				supplies: token.supplies,
				protected: token.protected,
			});

			return res.view("progress", { progress: 5, jwt, domain });
		}

		case "inn": {
			const token = verify(query.token, innResponseSchema);


			const jwt = sign<BankRequest>({
				iss: "charter-authority",
				aud: "bank",
				possessions: token.possessions,
				dysentery: true,
				tokens: token.tokens,
				gold: token.gold,
				wagon: token.wagon,
				animals: token.animals,
				wagonParts: token.wagonParts,
				supplies: token.supplies,
				protected: token.protected,
			});

			return res.view("progress", { progress: 6, jwt, domain });
		}

		case "bank": {
			const token = verify(query.token, bankResponseSchema);

			const jwt = sign<TrailheadRequest>({
				iss: "charter-authority",
				aud: "trailhead",
				dysentery: true,
				possessions: token.possessions,
				gold: token.gold,
				wagon: token.wagon,
				animals: token.animals,
				wagonParts: token.wagonParts,
				supplies: token.supplies,
				protected: token.protected,
			});

			return res.view("progress", { progress: 7, jwt, domain });
		}

		default: {
			throw new SafeError(400, "Invalid token");
		}
	}
});

app.get("/", async (req, res) => {
	return res.view("index");
});

app.get("/start", async (req, res) => {
	const jwt = sign<TokenExchangeRequest>({
		iss: "charter-authority",
		aud: "token-exchange",
		dysentery: true,
		possessions: [
			// Initial possessions
			"gold pocket watch",
			"tintype photographs",
			"diary",
			"jewelry",
		],
		gold: 50,
		wagon: {
			wheels: {
				frontLeft: 0.80,
				backLeft: 0.75,

				// oof, looks like you got into a bit of a scrape
				frontRight: 0.20,
				backRight: 0.15,
			},
			axles: {
				front: 0.60,
				back: 0.35
			},
			cover: 0.55
		},
		animals: [
			{
				name: "Bessie",
				type: "ox",
				conditions: [],
				health: 0.75,
				speed: 5,
				stamina: 8,
			},
			{
				name: "Molly",
				type: "ox",
				conditions: [],
				health: 0.90,
				speed: 4,
				stamina: 9,
			},
			{
				name: "Daisy",
				type: "ox",
				conditions: [],
				health: 0.80,
				speed: 7,
				stamina: 6,
			},
			{
				name: "Jenny",
				type: "ox",
				conditions: [],
				health: 0.70,
				speed: 3,
				stamina: 10,
			},
			{
				// Buck got bit by a rattlesnake :(
				name: "Buck",
				type: "mule",
				conditions: ["snakebite"],
				health: 0.15,
				speed: 6,
				stamina: 7,
			},
			{
				name: "Jack",
				type: "mule",
				conditions: ["dehydration"],
				health: 0.95,
				speed: 5,
				stamina: 8,
			}
		]
	});

	return res.view("progress", { progress: 0, jwt, domain });
});

app.listen({ port: 80, host: "0.0.0.0" });

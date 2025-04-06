import { z } from "zod";

function audClaim(expected: string) {
	return z.union([
		z.literal(expected),
		z.array(z.string()).refine((aud) => aud.includes(expected)).transform(() => expected)
	]);
}

export const wagonSchema = z.object({
	wheels: z.object({
		frontLeft: z.number().min(0).max(1),
		frontRight: z.number().min(0).max(1),
		backLeft: z.number().min(0).max(1),
		backRight: z.number().min(0).max(1),
	}),
	axles: z.object({
		front: z.number().min(0).max(1),
		back: z.number().min(0).max(1),
	}),
	cover: z.number().min(0).max(1),
});

export type Wagon = z.infer<typeof wagonSchema>;

export const animalSchema = z.object({
	name: z.string(),
	type: z.union([z.literal("ox"), z.literal("mule"), z.literal("horse"), z.literal("donkey")]),
	conditions: z.array(z.enum([
		"snakebite",
		"broken leg",
		"dysentery",
		"exhaustion",
		"fever",
		"colic",
		"infected wound",
		"dehydration",
		"malnutrition",
		"frostbite",
		"heatstroke",
		"lameness",
		"parasites"
	])),
	health: z.number().min(0).max(1),
	speed: z.number().min(0).max(10),
	stamina: z.number().min(0).max(10),
});

export type Animal = z.infer<typeof animalSchema>;

export interface TokenExchangeRequest {
	iss: "charter-authority";
	aud: "token-exchange";
	possessions: string[];
	dysentery: true;
	gold: number;
	wagon: Wagon;
	animals: Animal[];
}

export const tokenExchangeResponseSchema = z.object({
	iss: z.literal("token-exchange", { message: "Invalid issuer" }),
	aud: audClaim("charter-authority"),
	dysentery: z.literal(true),
	possessions: z.array(z.string()),
	tokens: z.number(),
	gold: z.number().optional(),
	wagon: wagonSchema.optional(),
	animals: z.array(animalSchema),
});

export type TokenExchangeResponse = z.infer<typeof tokenExchangeResponseSchema>;

export interface LiveryRequest {
	iss: "charter-authority";
	aud: "livery";
	possessions: string[];
	dysentery: true;
	tokens: number;
	gold?: number;
	wagon?: Wagon;
	animals: Animal[];
}

export const liveryResponseSchema = z.object({
	iss: z.literal("livery", { message: "Invalid issuer" }),
	aud: audClaim("charter-authority"),
	dysentery: z.literal(true),
	possessions: z.array(z.string()),
	tokens: z.number(),
	gold: z.number().optional(),
	wagon: wagonSchema.optional(),
	animals: z.array(animalSchema),
});

export type LiveryResponse = z.infer<typeof liveryResponseSchema>;

export interface WagonRepairRequest {
	iss: "charter-authority";
	aud: "wagon-repair";
	possessions: string[];
	dysentery: true;
	tokens: number;
	gold?: number;
	wagon?: Wagon;
	animals: Animal[];
}

export const wagonRepairResponseSchema = z.object({
	iss: z.literal("wagon-repair", { message: "Invalid issuer" }),
	aud: audClaim("charter-authority"),
	dysentery: z.literal(true),
	possessions: z.array(z.string()),
	tokens: z.number(),
	gold: z.number().optional(),
	wagon: wagonSchema.optional(),
	animals: z.array(animalSchema),
	wheels: z.coerce.number(),
	axles: z.coerce.number(),
	covers: z.coerce.number(),
});

export type WagonRepairResponse = z.infer<typeof wagonRepairResponseSchema>;

interface WagonParts {
	wheels: number;
	axles: number;
	covers: number;
}

const wagonPartsSchema = z.object({
	wheels: z.number(),
	axles: z.number(),
	covers: z.number(),
});

export interface GeneralStoreRequest {
	iss: "charter-authority";
	aud: "general-store";
	possessions: string[];
	dysentery: true;
	tokens: number;
	gold?: number;
	wagon?: Wagon;
	animals: Animal[];
	wagonParts: WagonParts;
}

export const generalStoreResponseSchema = z.object({
	iss: z.literal("general-store", { message: "Invalid issuer" }),
	aud: audClaim("charter-authority"),
	dysentery: z.literal(true),
	possessions: z.array(z.string()),
	tokens: z.number(),
	gold: z.number().optional(),
	wagon: wagonSchema.optional(),
	animals: z.array(animalSchema),
	wagonParts: wagonPartsSchema,
	bacon: z.number().optional(),
	beans: z.number().optional(),
	candy: z.number().optional(),
	coffee: z.number().optional(),
	cornmeal: z.number().optional(),
	flour: z.number().optional(),
	fruit: z.number().optional(),
	hardtack: z.number().optional(),
	lard: z.number().optional(),
	molasses: z.number().optional(),
	salt: z.number().optional(),
	sugar: z.number().optional(),
	axes: z.number().optional(),
	cookware: z.number().optional(),
	firearms: z.number().optional(),
	knives: z.number().optional(),
	rope: z.number().optional(),
	saddles: z.number().optional(),
	ammunition: z.number().optional(),
	candles: z.number().optional(),
	fabric: z.number().optional(),
	kerosene: z.number().optional(),
	medicine: z.number().optional(),
	soap: z.number().optional(),
	tobacco: z.number().optional(),
});

export type GeneralStoreResponse = z.infer<typeof generalStoreResponseSchema>;

// We group the list above into categories for easier use later
const foodSchema = z.object({
	bacon: z.number().optional(),
	beans: z.number().optional(),
	candy: z.number().optional(),
	coffee: z.number().optional(),
	cornmeal: z.number().optional(),
	flour: z.number().optional(),
	fruit: z.number().optional(),
	hardtack: z.number().optional(),
	lard: z.number().optional(),
	molasses: z.number().optional(),
	salt: z.number().optional(),
	sugar: z.number().optional(),
});

const equipmentSchema = z.object({
	axes: z.number().optional(),
	cookware: z.number().optional(),
	firearms: z.number().optional(),
	knives: z.number().optional(),
	rope: z.number().optional(),
	saddles: z.number().optional(),
});

const consumablesSchema = z.object({
	ammunition: z.number().optional(),
	candles: z.number().optional(),
	fabric: z.number().optional(),
	kerosene: z.number().optional(),
	medicine: z.number().optional(),
	soap: z.number().optional(),
	tobacco: z.number().optional(),
});

export const suppliesSchema = z.object({
	food: foodSchema,
	equipment: equipmentSchema,
	consumables: consumablesSchema,
});

export type Supplies = z.infer<typeof suppliesSchema>;

export interface BanditNegotiationRequest {
	iss: "charter-authority";
	// these bandits are idiots and don't know how to write code
	// why are we working with them again???
	// aud: "bandit-negotiation";
	possessions: string[];
	dysentery: true;
	tokens: number;
	gold?: number;
	wagon?: Wagon;
	animals: Animal[];
	wagonParts: WagonParts;
	supplies: Supplies;
}

export const banditNegotiationResponseSchema = z.object({
	iss: z.literal("bandit-negotiation", { message: "Invalid issuer" }),
	aud: audClaim("charter-authority"),
	dysentery: z.literal(true),
	possessions: z.array(z.string()),
	tokens: z.number(),
	gold: z.number().optional(),
	wagon: wagonSchema.optional(),
	animals: z.array(animalSchema),
	wagonParts: wagonPartsSchema,
	supplies: suppliesSchema,
	protected: z.boolean(),
});

export type BanditNegotiationResponse = z.infer<typeof banditNegotiationResponseSchema>;

export interface InnRequest {
	iss: "charter-authority";
	aud: "inn";
	possessions: string[];
	dysentery: true;
	tokens: number;
	gold?: number;
	wagon?: Wagon;
	animals: Animal[];
	supplies: Supplies;
	wagonParts: WagonParts;
	protected: boolean;
}

export const innResponseSchema = z.object({
	iss: z.literal("inn", { message: "Invalid issuer" }),
	aud: audClaim("charter-authority"),
	dysentery: z.literal(true),
	possessions: z.array(z.string()),
	tokens: z.number(),
	gold: z.number().optional(),
	wagon: wagonSchema.optional(),
	animals: z.array(animalSchema),
	supplies: suppliesSchema,
	wagonParts: wagonPartsSchema,
	protected: z.boolean(),
	stay: z.object({
		nights: z.number(),
		roomType: z.number(),
		specialRequest: z.string().optional(),
	}).optional()
});

export type InnResponse = z.infer<typeof innResponseSchema>;

export interface BankRequest {
	iss: "charter-authority";
	aud: "bank";
	possessions: string[];
	dysentery: true;
	tokens: number;
	gold?: number;
	wagon?: Wagon;
	animals: Animal[];
	supplies: Supplies;
	wagonParts: WagonParts;
	protected: boolean;
}

export const bankResponseSchema = z.object({
	iss: z.literal("bank", { message: "Invalid issuer" }),
	aud: audClaim("charter-authority"),
	dysentery: z.literal(true),
	possessions: z.array(z.string()),
	gold: z.number(),
	wagon: wagonSchema.optional(),
	animals: z.array(animalSchema),
	supplies: suppliesSchema,
	wagonParts: wagonPartsSchema,
	protected: z.boolean(),
});

export type BankResponse = z.infer<typeof bankResponseSchema>;

export const trailheadRequestSchema = z.object({
	iss: z.literal("charter-authority", { message: "Invalid issuer" }),
	aud: audClaim("trailhead"),
	dysentery: z.literal(true),
	possessions: z.array(z.string()),
	gold: z.number(),
	wagon: wagonSchema.optional(),
	animals: z.array(animalSchema),
	supplies: suppliesSchema,
	wagonParts: wagonPartsSchema,
	protected: z.boolean(),
});

export type TrailheadRequest = z.infer<typeof trailheadRequestSchema>;

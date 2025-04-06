package com.plaidctf.tokenexchange;

import com.fasterxml.jackson.annotation.JsonAnyGetter;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.auth0.jwt.JWTCreator;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

public class TokenExchangeClaims {
	public List<String> possessions;
	public int gold;
	public int tokens;
	public Map<String, JsonNode> rest;

	public TokenExchangeClaims(List<String> possessions, int gold, int tokens, Map<String, JsonNode> rest) {
		this.possessions = possessions;
		this.gold = gold;
		this.tokens = tokens;
		this.rest = rest;
	}

	public static TokenExchangeClaims fromDecodedJwt(DecodedJWT decodedJwt) {
		Map<String, JsonNode> rest = new HashMap<>();

		decodedJwt.getClaims().forEach((key, value) -> {
			if (key.equals("possessions") || key.equals("gold") || key.equals("tokens")) {
				return;
			}
			rest.put(key, value.as(JsonNode.class));
		});

		Integer gold = decodedJwt.getClaim("gold").asInt();

		return new TokenExchangeClaims(
			decodedJwt.getClaim("possessions").asList(String.class),
			gold != null ? gold : 0,
			0,
			rest
		);
	}

	public JWTCreator.Builder addToJwt(JWTCreator.Builder jwt) {
		jwt.withClaim("possessions", possessions);
		jwt.withClaim("gold", gold);
		jwt.withClaim("tokens", tokens);
		Map<String, ?> restMap = new ObjectMapper().convertValue(rest, Map.class);
		jwt.withPayload(restMap);
		return jwt;
	}
}

package com.plaidctf.tokenexchange.controller;

import com.plaidctf.tokenexchange.TokenExchangeClaims;

import java.io.FileReader;
import java.util.Base64;
import java.util.Map;
import java.util.List;
import java.util.ArrayList;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTCreationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.JWTVerifier;
import com.auth0.jwt.JWTCreator;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.JsonNode;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.CookieValue;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;

@Controller
public class TokenExchangeController {
    private static String jwtSecret = null;
    private static final int GOLD_TO_TOKEN_RATE = 10;
    private static final Map<String, Integer> ITEM_PRICES = Map.of(
        "gold pocket watch", 2000,
        "tintype photographs", 400,
        "diary", 200,
        "jewelry", 1500
    );

    private static String getJwtSecret() {
        if (jwtSecret == null) {
            try {
                FileReader reader = new FileReader("/run/secrets/jwt_secret");
                char[] buffer = new char[1024];
                int bytesRead = reader.read(buffer);
                jwtSecret = new String(buffer, 0, bytesRead);
            } catch (Exception e) {
                throw new RuntimeException("Could not read JWT secret");
            }
        }

        return jwtSecret;
    }

    @GetMapping("/")
    public String index(@CookieValue(name = "jwt", required = false) String jwt,
                      Model model,
                      HttpServletResponse response) throws Exception {
        if (jwt == null) {
            response.setStatus(401);
            return "error";
        }

        try {
            Algorithm algorithm = Algorithm.HMAC256(getJwtSecret());
            JWTVerifier verifier = JWT.require(algorithm)
                .withIssuer("charter-authority")
                .withAudience("token-exchange")
                .build();
            DecodedJWT decodedJWT = verifier.verify(jwt);
            TokenExchangeClaims claims = TokenExchangeClaims.fromDecodedJwt(decodedJWT);

            model.addAttribute("claims", claims);
            return "index";
        } catch (JWTVerificationException exception) {
            response.setStatus(400);
            return "error";
        }
    }

    @PostMapping("/submit")
    public void submit(
            @CookieValue(name = "jwt", required = false) String jwt,
            HttpServletRequest request,
            HttpServletResponse response) throws Exception {
        if (jwt == null) {
            response.setStatus(401);
            return;
        }

        try {
            Algorithm algorithm = Algorithm.HMAC256(getJwtSecret());
            JWTVerifier verifier = JWT.require(algorithm)
                .withIssuer("charter-authority")
                .withAudience("token-exchange")
                .build();
            DecodedJWT decodedJWT = verifier.verify(jwt);
            TokenExchangeClaims claims = TokenExchangeClaims.fromDecodedJwt(decodedJWT);

            String goldAmountStr = request.getParameter("gold_amount");
            if (goldAmountStr != null && !goldAmountStr.isEmpty()) {
                int goldAmount = Integer.parseInt(goldAmountStr);
                if (goldAmount < 0 || goldAmount > claims.gold) {
                    response.setStatus(400);
                    return;
                }
                claims.gold -= goldAmount;
                claims.tokens += goldAmount * GOLD_TO_TOKEN_RATE;
            }

            List<String> newPossessions = new ArrayList<>(claims.possessions);
            for (int i = 0; i < claims.possessions.size(); i++) {
                String paramName = "item_" + i;
                if (request.getParameter(paramName) != null) {
                    String item = claims.possessions.get(i);
                    Integer price = ITEM_PRICES.getOrDefault(item, 0);
                    claims.tokens += price;
                    newPossessions.remove(item);
                }
            }
            claims.possessions = newPossessions;

            JWTCreator.Builder builder = JWT.create();
            claims.addToJwt(builder).withIssuer("token-exchange").withAudience("charter-authority");
            String newToken = builder.sign(algorithm);

            String domain = System.getenv("HOST");
            response.sendRedirect(String.format("http://charterauthority.%s/callback?service=token-exchange&token=%s",
                domain, newToken));
        } catch (JWTVerificationException exception) {
            response.setStatus(400);
            return;
        }
    }

    @GetMapping("/enter")
    public String enter(@RequestParam String jwt, HttpServletResponse response) throws Exception {
        try {
            Algorithm algorithm = Algorithm.HMAC256(getJwtSecret());
            JWTVerifier verifier = JWT.require(algorithm).build();
            DecodedJWT decodedJWT = verifier.verify(jwt);
            TokenExchangeClaims claims = TokenExchangeClaims.fromDecodedJwt(decodedJWT);

            JWTCreator.Builder builder = JWT.create();
            claims.addToJwt(builder);
            String newToken = builder.sign(algorithm);

            Cookie cookie = new Cookie("jwt", newToken);
            cookie.setPath("/");
            cookie.setHttpOnly(true);
            response.addCookie(cookie);

            response.sendRedirect("/");
            return null;
        } catch (JWTVerificationException exception) {
            response.setStatus(400);
            System.out.println(exception.getMessage());
            return "error";
        } catch (JWTCreationException exception) {
            response.setStatus(500);
            System.out.println(exception.getMessage());
            return "error";
        }
    }
}

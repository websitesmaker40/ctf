FROM maven:3.9.10-eclipse-temurin-21

WORKDIR /app

COPY pom.xml pom.xml

RUN --mount=type=cache,target=/root/.m2 mvn dependency:go-offline
COPY src src
RUN --mount=type=cache,target=/root/.m2 mvn clean install
ENV SPRING_PROFILES_ACTIVE=production

CMD ["java", "-jar", "target/token-exchange-chal.jar"]
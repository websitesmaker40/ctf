FROM sbtscala/scala-sbt:eclipse-temurin-jammy-17.0.9_9_1.9.8_3.3.1

WORKDIR /app

COPY build.sbt .
COPY project project
COPY src src
RUN sbt compile
CMD ["sbt", "run"]
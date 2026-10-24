FROM maven:3.10.0-eclipse-temurin-21-alpine AS build
WORKDIR /build
COPY pom.xml ./
COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build --chown=10001:10001 /build/target/nexo-backend-0.0.1-SNAPSHOT.jar /app/nexo.jar
USER 10001:10001
ENV SPRING_PROFILES_ACTIVE=production
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=55.0", "-XX:+ExitOnOutOfMemoryError", "-jar", "/app/nexo.jar"]

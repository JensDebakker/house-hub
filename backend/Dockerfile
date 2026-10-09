# --- Build stage ---
FROM eclipse-temurin:25-jdk AS build
WORKDIR /app

COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .
RUN chmod +x mvnw && ./mvnw -q -B dependency:go-offline

COPY src src
RUN ./mvnw -q -B -DskipTests package

# --- Runtime stage ---
FROM eclipse-temurin:25-jre
WORKDIR /app

RUN useradd --system --create-home --shell /usr/sbin/nologin househub \
    && mkdir -p /data/house-files \
    && chown househub:househub /data/house-files
COPY --from=build /app/target/*.jar app.jar
USER househub

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]

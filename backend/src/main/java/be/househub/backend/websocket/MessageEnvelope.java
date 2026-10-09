package be.househub.backend.websocket;

import tools.jackson.databind.JsonNode;

import java.util.UUID;

/**
 * Wire format shared by every message exchanged over the {@code /ws} endpoint, for
 * both server-to-client pushes (e.g. {@code channel = "version"}) and client-to-client
 * relays (e.g. {@code channel = "chat"}):
 *
 * <pre>{"channel": "version" | "chat", "houseId": "&lt;uuid, chat only&gt;", "payload": {...}}</pre>
 *
 * {@code houseId} is only meaningful (and required) for household-scoped channels like
 * "chat" — it is null for broadcast channels like "version".
 */
public record MessageEnvelope(String channel, UUID houseId, JsonNode payload) {

    public static final String CHANNEL_VERSION = "version";
    public static final String CHANNEL_CHAT = "chat";

    public static MessageEnvelope of(String channel, UUID houseId, JsonNode payload) {
        return new MessageEnvelope(channel, houseId, payload);
    }
}

package be.househub.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "households")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Household {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(name = "invite_code", nullable = false, unique = true, length = 8)
    private String inviteCode;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "storage_limit_bytes", nullable = false,
            columnDefinition = "bigint not null default " + DEFAULT_STORAGE_LIMIT_BYTES)
    private long storageLimitBytes = DEFAULT_STORAGE_LIMIT_BYTES;

    public static final long DEFAULT_STORAGE_LIMIT_BYTES = 4L * 1024 * 1024 * 1024;
}

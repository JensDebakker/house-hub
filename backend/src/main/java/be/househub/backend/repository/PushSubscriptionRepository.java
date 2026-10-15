package be.househub.backend.repository;

import be.househub.backend.entity.PushSubscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, UUID> {

    Optional<PushSubscription> findByUserIdAndEndpoint(UUID userId, String endpoint);

    /** Endpoint alone, not scoped to a user - {@code endpoint} is globally unique (one row
     * per browser subscription), so subscribing re-uses/reassigns this row even if it
     * previously belonged to a different account on the same device (e.g. someone logged
     * out and a different user logged in without the service worker unsubscribing first). */
    Optional<PushSubscription> findByEndpoint(String endpoint);

    void deleteByUserIdAndEndpoint(UUID userId, String endpoint);

    List<PushSubscription> findByNotifyOnVersionTrue();

    List<PushSubscription> findByUserIdInAndNotifyOnChatMessageTrue(List<UUID> userIds);
}

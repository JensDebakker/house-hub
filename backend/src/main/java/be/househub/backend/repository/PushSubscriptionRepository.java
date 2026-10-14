package be.househub.backend.repository;

import be.househub.backend.entity.PushSubscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, UUID> {

    Optional<PushSubscription> findByUserIdAndEndpoint(UUID userId, String endpoint);

    void deleteByUserIdAndEndpoint(UUID userId, String endpoint);

    List<PushSubscription> findByNotifyOnVersionTrue();

    List<PushSubscription> findByUserIdInAndNotifyOnChatMessageTrue(List<UUID> userIds);
}

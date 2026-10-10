package be.househub.backend.repository;

import be.househub.backend.entity.HouseFolder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface HouseFolderRepository extends JpaRepository<HouseFolder, UUID> {

    List<HouseFolder> findByHouseholdId(UUID householdId);

    Optional<HouseFolder> findByIdAndHouseholdId(UUID id, UUID householdId);

    @Query("select f from HouseFolder f where f.household.id = :householdId and " +
            "((:parentId is null and f.parentFolder is null) or f.parentFolder.id = :parentId)")
    List<HouseFolder> findChildren(@Param("householdId") UUID householdId, @Param("parentId") UUID parentId);
}

package be.househub.backend.repository;

import be.househub.backend.entity.HouseFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface HouseFileRepository extends JpaRepository<HouseFile, UUID> {

    List<HouseFile> findByHouseholdId(UUID householdId);

    Optional<HouseFile> findByIdAndHouseholdId(UUID id, UUID householdId);

    long countByHouseholdId(UUID householdId);

    @Query("select coalesce(sum(f.sizeBytes), 0) from HouseFile f where f.household.id = :householdId")
    long sumSizeBytesByHouseholdId(@Param("householdId") UUID householdId);

    @Query("select f from HouseFile f where f.household.id = :householdId and " +
            "((:folderId is null and f.folder is null) or f.folder.id = :folderId)")
    List<HouseFile> findChildren(@Param("householdId") UUID householdId, @Param("folderId") UUID folderId);
}

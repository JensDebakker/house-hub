package be.househub.backend.controller;

import be.househub.backend.dto.calendar.CalendarEventRequest;
import be.househub.backend.dto.calendar.CalendarEventResponse;
import be.househub.backend.entity.Household;
import be.househub.backend.security.SecurityUtils;
import be.househub.backend.service.CalendarEventService;
import be.househub.backend.service.HouseholdAccessService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/households/{householdId}/calendar-events")
@RequiredArgsConstructor
public class CalendarEventController {

    private final CalendarEventService calendarEventService;
    private final HouseholdAccessService householdAccessService;

    @GetMapping
    public List<CalendarEventResponse> findAll(@PathVariable UUID householdId) {
        Household household = householdAccessService.requireAccess(SecurityUtils.getCurrentUser(), householdId);
        return calendarEventService.findAll(household);
    }

    @PostMapping
    public ResponseEntity<CalendarEventResponse> create(@PathVariable UUID householdId, @Valid @RequestBody CalendarEventRequest request) {
        Household household = householdAccessService.requireAccess(SecurityUtils.getCurrentUser(), householdId);
        var created = calendarEventService.create(household, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public CalendarEventResponse update(@PathVariable UUID householdId, @PathVariable UUID id, @Valid @RequestBody CalendarEventRequest request) {
        Household household = householdAccessService.requireAccess(SecurityUtils.getCurrentUser(), householdId);
        return calendarEventService.update(household, id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID householdId, @PathVariable UUID id) {
        Household household = householdAccessService.requireAccess(SecurityUtils.getCurrentUser(), householdId);
        calendarEventService.delete(household, id);
        return ResponseEntity.noContent().build();
    }
}

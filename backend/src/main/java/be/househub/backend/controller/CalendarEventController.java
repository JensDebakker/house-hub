package be.househub.backend.controller;

import be.househub.backend.dto.calendar.CalendarEventRequest;
import be.househub.backend.dto.calendar.CalendarEventResponse;
import be.househub.backend.security.SecurityUtils;
import be.househub.backend.service.CalendarEventService;
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
@RequestMapping("/calendar-events")
@RequiredArgsConstructor
public class CalendarEventController {

    private final CalendarEventService calendarEventService;

    @GetMapping
    public List<CalendarEventResponse> findAll() {
        return calendarEventService.findAll(SecurityUtils.getCurrentUser().getHousehold());
    }

    @PostMapping
    public ResponseEntity<CalendarEventResponse> create(@Valid @RequestBody CalendarEventRequest request) {
        var created = calendarEventService.create(SecurityUtils.getCurrentUser().getHousehold(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public CalendarEventResponse update(@PathVariable UUID id, @Valid @RequestBody CalendarEventRequest request) {
        return calendarEventService.update(SecurityUtils.getCurrentUser().getHousehold(), id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        calendarEventService.delete(SecurityUtils.getCurrentUser().getHousehold(), id);
        return ResponseEntity.noContent().build();
    }
}

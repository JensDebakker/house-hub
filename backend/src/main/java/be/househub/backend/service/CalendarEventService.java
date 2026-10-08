package be.househub.backend.service;

import be.househub.backend.dto.calendar.CalendarEventRequest;
import be.househub.backend.dto.calendar.CalendarEventResponse;
import be.househub.backend.entity.CalendarEvent;
import be.househub.backend.entity.Household;
import be.househub.backend.exception.ResourceNotFoundException;
import be.househub.backend.repository.CalendarEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CalendarEventService {

    private final CalendarEventRepository calendarEventRepository;

    public List<CalendarEventResponse> findAll(Household household) {
        return calendarEventRepository.findByHouseholdId(household.getId()).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public CalendarEventResponse create(Household household, CalendarEventRequest request) {
        CalendarEvent event = new CalendarEvent();
        event.setHousehold(household);
        apply(event, request);
        return toResponse(calendarEventRepository.save(event));
    }

    @Transactional
    public CalendarEventResponse update(Household household, UUID eventId, CalendarEventRequest request) {
        CalendarEvent event = findOwned(household, eventId);
        apply(event, request);
        return toResponse(calendarEventRepository.save(event));
    }

    @Transactional
    public void delete(Household household, UUID eventId) {
        calendarEventRepository.delete(findOwned(household, eventId));
    }

    private CalendarEvent findOwned(Household household, UUID eventId) {
        return calendarEventRepository.findByIdAndHouseholdId(eventId, household.getId())
                .orElseThrow(() -> new ResourceNotFoundException("CalendarEvent", eventId));
    }

    private void apply(CalendarEvent event, CalendarEventRequest request) {
        event.setTitle(request.title());
        event.setStart(request.start());
        event.setEnd(request.end());
    }

    private CalendarEventResponse toResponse(CalendarEvent event) {
        return new CalendarEventResponse(event.getId(), event.getTitle(), event.getStart(), event.getEnd());
    }
}

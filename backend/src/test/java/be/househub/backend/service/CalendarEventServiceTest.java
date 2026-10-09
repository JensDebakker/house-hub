package be.househub.backend.service;

import be.househub.backend.dto.calendar.CalendarEventRequest;
import be.househub.backend.dto.calendar.CalendarEventResponse;
import be.househub.backend.entity.CalendarEvent;
import be.househub.backend.entity.Household;
import be.househub.backend.exception.ResourceNotFoundException;
import be.househub.backend.repository.CalendarEventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CalendarEventServiceTest {

    @Mock
    private CalendarEventRepository calendarEventRepository;

    private CalendarEventService calendarEventService;

    @BeforeEach
    void setUp() {
        calendarEventService = new CalendarEventService(calendarEventRepository);
    }

    private Household household() {
        Household household = new Household();
        household.setId(UUID.randomUUID());
        return household;
    }

    private CalendarEvent calendarEvent(Household household) {
        CalendarEvent event = new CalendarEvent();
        event.setId(UUID.randomUUID());
        event.setTitle("Dentist appointment");
        event.setStart(Instant.now());
        event.setHousehold(household);
        return event;
    }

    private CalendarEventRequest request() {
        return new CalendarEventRequest("Family dinner", Instant.now().plusSeconds(3600), Instant.now().plusSeconds(7200));
    }

    @Test
    void findAll_returnsEventsForHousehold() {
        Household household = household();
        CalendarEvent event = calendarEvent(household);
        when(calendarEventRepository.findByHouseholdId(household.getId())).thenReturn(List.of(event));

        List<CalendarEventResponse> result = calendarEventService.findAll(household);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).id()).isEqualTo(event.getId());
        assertThat(result.get(0).title()).isEqualTo(event.getTitle());
    }

    @Test
    void create_savesEventLinkedToHousehold() {
        Household household = household();
        when(calendarEventRepository.save(any(CalendarEvent.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CalendarEventResponse response = calendarEventService.create(household, request());

        ArgumentCaptor<CalendarEvent> captor = ArgumentCaptor.forClass(CalendarEvent.class);
        verify(calendarEventRepository).save(captor.capture());
        assertThat(captor.getValue().getHousehold()).isEqualTo(household);
        assertThat(response.title()).isEqualTo("Family dinner");
    }

    @Test
    void update_existingEvent_appliesRequestFields() {
        Household household = household();
        CalendarEvent existing = calendarEvent(household);
        when(calendarEventRepository.findByIdAndHouseholdId(existing.getId(), household.getId()))
                .thenReturn(Optional.of(existing));
        when(calendarEventRepository.save(any(CalendarEvent.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CalendarEventResponse response = calendarEventService.update(household, existing.getId(), request());

        assertThat(response.title()).isEqualTo("Family dinner");
    }

    @Test
    void update_eventNotInHousehold_throwsNotFound() {
        Household household = household();
        UUID eventId = UUID.randomUUID();
        when(calendarEventRepository.findByIdAndHouseholdId(eventId, household.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> calendarEventService.update(household, eventId, request()))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(calendarEventRepository, never()).save(any());
    }

    @Test
    void delete_existingEvent_removesIt() {
        Household household = household();
        CalendarEvent existing = calendarEvent(household);
        when(calendarEventRepository.findByIdAndHouseholdId(existing.getId(), household.getId()))
                .thenReturn(Optional.of(existing));

        calendarEventService.delete(household, existing.getId());

        verify(calendarEventRepository).delete(existing);
    }

    @Test
    void delete_eventNotInHousehold_throwsNotFound() {
        Household household = household();
        UUID eventId = UUID.randomUUID();
        when(calendarEventRepository.findByIdAndHouseholdId(eventId, household.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> calendarEventService.delete(household, eventId))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(calendarEventRepository, never()).delete(any());
    }
}

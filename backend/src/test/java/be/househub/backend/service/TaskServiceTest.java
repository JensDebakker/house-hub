package be.househub.backend.service;

import be.househub.backend.dto.task.TaskRequest;
import be.househub.backend.dto.task.TaskResponse;
import be.househub.backend.entity.Household;
import be.househub.backend.entity.Task;
import be.househub.backend.entity.User;
import be.househub.backend.exception.ResourceNotFoundException;
import be.househub.backend.repository.TaskRepository;
import be.househub.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
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
class TaskServiceTest {

    @Mock
    private TaskRepository taskRepository;
    @Mock
    private UserRepository userRepository;

    private TaskService taskService;

    @BeforeEach
    void setUp() {
        taskService = new TaskService(taskRepository, userRepository);
    }

    private Household household() {
        Household household = new Household();
        household.setId(UUID.randomUUID());
        return household;
    }

    private User user() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setDisplayName("Alice");
        user.setEmail("alice@example.com");
        return user;
    }

    private Task task(Household household) {
        Task task = new Task();
        task.setId(UUID.randomUUID());
        task.setTitle("Vacuum living room");
        task.setDone(false);
        task.setHousehold(household);
        return task;
    }

    @Test
    void findAll_returnsTasksForHousehold() {
        Household household = household();
        Task task = task(household);
        when(taskRepository.findByHouseholdId(household.getId())).thenReturn(List.of(task));

        List<TaskResponse> result = taskService.findAll(household);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).id()).isEqualTo(task.getId());
        assertThat(result.get(0).title()).isEqualTo(task.getTitle());
    }

    @Test
    void create_withoutAssignee_savesTaskWithNullAssignee() {
        Household household = household();
        TaskRequest request = new TaskRequest("Mop the floor", false, null, null);
        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TaskResponse response = taskService.create(household, request);

        assertThat(response.assignedTo()).isNull();
        verify(userRepository, never()).findById(any());
    }

    @Test
    void create_withAssignee_resolvesUserAndSetsAssignee() {
        Household household = household();
        User assignee = user();
        TaskRequest request = new TaskRequest("Mop the floor", false, assignee.getId(), LocalDate.now().plusDays(1));
        when(userRepository.findById(assignee.getId())).thenReturn(Optional.of(assignee));
        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TaskResponse response = taskService.create(household, request);

        assertThat(response.assignedTo()).isEqualTo(assignee.getId());
    }

    @Test
    void create_withUnknownAssignee_throwsNotFound() {
        Household household = household();
        UUID unknownUserId = UUID.randomUUID();
        TaskRequest request = new TaskRequest("Mop the floor", false, unknownUserId, null);
        when(userRepository.findById(unknownUserId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> taskService.create(household, request))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(taskRepository, never()).save(any());
    }

    @Test
    void update_existingTask_appliesRequestFields() {
        Household household = household();
        Task existing = task(household);
        TaskRequest request = new TaskRequest("Vacuum bedroom", true, null, LocalDate.now());
        when(taskRepository.findByIdAndHouseholdId(existing.getId(), household.getId()))
                .thenReturn(Optional.of(existing));
        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TaskResponse response = taskService.update(household, existing.getId(), request);

        assertThat(response.title()).isEqualTo("Vacuum bedroom");
        assertThat(response.done()).isTrue();
    }

    @Test
    void update_removingAssignee_setsAssignedToNull() {
        Household household = household();
        Task existing = task(household);
        existing.setAssignedTo(user());
        TaskRequest request = new TaskRequest("Vacuum bedroom", false, null, null);
        when(taskRepository.findByIdAndHouseholdId(existing.getId(), household.getId()))
                .thenReturn(Optional.of(existing));
        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TaskResponse response = taskService.update(household, existing.getId(), request);

        assertThat(response.assignedTo()).isNull();
    }

    @Test
    void update_taskNotInHousehold_throwsNotFound() {
        Household household = household();
        UUID taskId = UUID.randomUUID();
        TaskRequest request = new TaskRequest("Vacuum bedroom", false, null, null);
        when(taskRepository.findByIdAndHouseholdId(taskId, household.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> taskService.update(household, taskId, request))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(taskRepository, never()).save(any());
    }

    @Test
    void delete_existingTask_removesIt() {
        Household household = household();
        Task existing = task(household);
        when(taskRepository.findByIdAndHouseholdId(existing.getId(), household.getId()))
                .thenReturn(Optional.of(existing));

        taskService.delete(household, existing.getId());

        verify(taskRepository).delete(existing);
    }

    @Test
    void delete_taskNotInHousehold_throwsNotFound() {
        Household household = household();
        UUID taskId = UUID.randomUUID();
        when(taskRepository.findByIdAndHouseholdId(taskId, household.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> taskService.delete(household, taskId))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(taskRepository, never()).delete(any());
    }
}

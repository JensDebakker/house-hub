package be.househub.backend.service;

import be.househub.backend.dto.task.TaskRequest;
import be.househub.backend.dto.task.TaskResponse;
import be.househub.backend.entity.Household;
import be.househub.backend.entity.Task;
import be.househub.backend.entity.User;
import be.househub.backend.exception.ResourceNotFoundException;
import be.househub.backend.repository.TaskRepository;
import be.househub.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TaskService {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    public List<TaskResponse> findAll(Household household) {
        return taskRepository.findByHouseholdId(household.getId()).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public TaskResponse create(Household household, TaskRequest request) {
        Task task = new Task();
        task.setHousehold(household);
        apply(task, request);
        return toResponse(taskRepository.save(task));
    }

    @Transactional
    public TaskResponse update(Household household, UUID taskId, TaskRequest request) {
        Task task = taskRepository.findByIdAndHouseholdId(taskId, household.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Task", taskId));
        apply(task, request);
        return toResponse(taskRepository.save(task));
    }

    @Transactional
    public void delete(Household household, UUID taskId) {
        Task task = taskRepository.findByIdAndHouseholdId(taskId, household.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Task", taskId));
        taskRepository.delete(task);
    }

    private void apply(Task task, TaskRequest request) {
        task.setTitle(request.title());
        task.setDone(request.done());
        task.setDueDate(request.dueDate());
        if (request.assignedTo() != null) {
            User assignee = userRepository.findById(request.assignedTo())
                    .orElseThrow(() -> new ResourceNotFoundException("User", request.assignedTo()));
            task.setAssignedTo(assignee);
        } else {
            task.setAssignedTo(null);
        }
    }

    private TaskResponse toResponse(Task task) {
        return new TaskResponse(
                task.getId(),
                task.getTitle(),
                task.isDone(),
                task.getAssignedTo() != null ? task.getAssignedTo().getId() : null,
                task.getDueDate()
        );
    }
}

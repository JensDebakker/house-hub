package be.househub.backend.service;

import be.househub.backend.dto.admin.AddMembershipRequest;
import be.househub.backend.dto.admin.AdminCalendarEventResponse;
import be.househub.backend.dto.admin.AdminCalendarEventUpdateRequest;
import be.househub.backend.dto.admin.AdminFeedbackResponse;
import be.househub.backend.dto.admin.AdminFeedbackUpdateRequest;
import be.househub.backend.dto.admin.AdminShoppingListResponse;
import be.househub.backend.dto.admin.AdminShoppingListUpdateRequest;
import be.househub.backend.dto.admin.AdminSupplyResponse;
import be.househub.backend.dto.admin.AdminSupplyUpdateRequest;
import be.househub.backend.dto.admin.AdminTaskResponse;
import be.househub.backend.dto.admin.AdminTaskUpdateRequest;
import be.househub.backend.dto.admin.AdminUpdateUserRequest;
import be.househub.backend.dto.admin.AdminUserResponse;
import be.househub.backend.dto.admin.HouseholdDetailResponse;
import be.househub.backend.dto.admin.HouseholdMemberResponse;
import be.househub.backend.dto.admin.UpdateMembershipRequest;
import be.househub.backend.dto.admin.UserDetailResponse;
import be.househub.backend.dto.feedback.FeedbackAttachmentResponse;
import be.househub.backend.dto.household.HouseholdMembershipResponse;
import be.househub.backend.dto.household.HouseholdResponse;
import be.househub.backend.dto.household.HouseholdUpdateRequest;
import be.househub.backend.dto.shopping.ShoppingListItemResponse;
import be.househub.backend.dto.task.TaskResponse;
import be.househub.backend.entity.CalendarEvent;
import be.househub.backend.entity.FeedbackTicket;
import be.househub.backend.entity.Household;
import be.househub.backend.entity.HouseholdMembership;
import be.househub.backend.entity.ShoppingList;
import be.househub.backend.entity.Supply;
import be.househub.backend.entity.Task;
import be.househub.backend.entity.User;
import be.househub.backend.exception.ResourceNotFoundException;
import be.househub.backend.repository.CalendarEventRepository;
import be.househub.backend.repository.FeedbackAttachmentRepository;
import be.househub.backend.repository.FeedbackTicketRepository;
import be.househub.backend.repository.HouseholdMembershipRepository;
import be.househub.backend.repository.HouseholdRepository;
import be.househub.backend.repository.ShoppingListRepository;
import be.househub.backend.repository.SupplyRepository;
import be.househub.backend.repository.TaskRepository;
import be.househub.backend.repository.UserRepository;
import be.househub.backend.service.storage.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminService {

    private final UserRepository userRepository;
    private final HouseholdRepository householdRepository;
    private final HouseholdMembershipRepository membershipRepository;
    private final TaskRepository taskRepository;
    private final SupplyRepository supplyRepository;
    private final ShoppingListRepository shoppingListRepository;
    private final CalendarEventRepository calendarEventRepository;
    private final HouseholdService householdService;
    private final TaskService taskService;
    private final SupplyService supplyService;
    private final ShoppingListService shoppingListService;
    private final CalendarEventService calendarEventService;
    private final HouseFileService houseFileService;
    private final FeedbackTicketRepository feedbackTicketRepository;
    private final FeedbackAttachmentRepository feedbackAttachmentRepository;
    private final FileStorageService fileStorageService;

    public List<AdminUserResponse> listUsers() {
        return userRepository.findAll().stream()
                .map(this::toAdminUserResponse)
                .toList();
    }

    public UserDetailResponse getUser(UUID userId) {
        User user = findUser(userId);
        return new UserDetailResponse(
                user.getId(),
                user.getEmail(),
                user.getDisplayName(),
                user.getRole(),
                user.isEmailVerified(),
                user.getCreatedAt(),
                householdService.findMemberships(userId),
                taskRepository.findByAssignedToId(userId).stream()
                        .map(t -> new TaskResponse(
                                t.getId(), t.getTitle(), t.isDone(),
                                t.getAssignedTo() != null ? t.getAssignedTo().getId() : null, t.getDueDate()))
                        .toList()
        );
    }

    @Transactional
    public AdminUserResponse updateUser(UUID userId, AdminUpdateUserRequest request) {
        User user = findUser(userId);
        if (request.role() != null) {
            user.setRole(request.role());
        }
        return toAdminUserResponse(userRepository.save(user));
    }

    public List<HouseholdResponse> listHouseholds() {
        return householdRepository.findAll().stream()
                .map(householdService::toResponse)
                .toList();
    }

    public HouseholdDetailResponse getHousehold(UUID householdId) {
        Household household = findHousehold(householdId);
        List<HouseholdMemberResponse> members = membershipRepository.findByHouseholdId(householdId).stream()
                .map(m -> new HouseholdMemberResponse(
                        m.getUser().getId(), m.getUser().getDisplayName(), m.getUser().getEmail(), m.getRole()))
                .toList();

        return new HouseholdDetailResponse(
                householdService.toResponse(household),
                members,
                taskService.findAll(household),
                supplyService.findAll(household),
                shoppingListService.findAll(household),
                calendarEventService.findAll(household),
                houseFileService.findAll(household)
        );
    }

    @Transactional
    public HouseholdResponse updateHousehold(UUID householdId, HouseholdUpdateRequest request) {
        Household household = findHousehold(householdId);
        if (request.name() != null) {
            household.setName(request.name());
        }
        if (request.storageLimitBytes() != null) {
            household.setStorageLimitBytes(request.storageLimitBytes());
        }
        return householdService.toResponse(householdRepository.save(household));
    }

    @Transactional
    public HouseholdMembershipResponse addMembership(UUID householdId, AddMembershipRequest request) {
        Household household = findHousehold(householdId);
        User user = findUser(request.userId());

        if (membershipRepository.existsByUserIdAndHouseholdId(user.getId(), householdId)) {
            throw new IllegalStateException("User is already a member of this household");
        }

        HouseholdMembership membership = new HouseholdMembership();
        membership.setUser(user);
        membership.setHousehold(household);
        membership.setRole(request.role());
        membershipRepository.save(membership);

        return householdService.toMembershipResponse(membership);
    }

    @Transactional
    public HouseholdMembershipResponse updateMembership(UUID householdId, UUID userId, UpdateMembershipRequest request) {
        HouseholdMembership membership = membershipRepository.findByUserIdAndHouseholdId(userId, householdId)
                .orElseThrow(() -> new ResourceNotFoundException("HouseholdMembership", userId));
        membership.setRole(request.role());
        membershipRepository.save(membership);
        return householdService.toMembershipResponse(membership);
    }

    @Transactional
    public void removeMembership(UUID householdId, UUID userId) {
        membershipRepository.deleteByUserIdAndHouseholdId(userId, householdId);
    }

    @Transactional
    public AdminTaskResponse updateTask(UUID taskId, AdminTaskUpdateRequest request) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task", taskId));
        if (request.title() != null) {
            task.setTitle(request.title());
        }
        if (request.done() != null) {
            task.setDone(request.done());
        }
        if (request.dueDate() != null) {
            task.setDueDate(request.dueDate());
        }
        if (request.assignedToId() != null) {
            task.setAssignedTo(findUser(request.assignedToId()));
        }
        return toAdminTaskResponse(taskRepository.save(task));
    }

    @Transactional
    public void deleteTask(UUID taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task", taskId));
        taskRepository.delete(task);
    }

    @Transactional
    public AdminSupplyResponse updateSupply(UUID supplyId, AdminSupplyUpdateRequest request) {
        Supply supply = supplyRepository.findById(supplyId)
                .orElseThrow(() -> new ResourceNotFoundException("Supply", supplyId));
        if (request.name() != null) {
            supply.setName(request.name());
        }
        if (request.quantity() != null) {
            supply.setQuantity(request.quantity());
        }
        if (request.expiryDate() != null) {
            supply.setExpiryDate(request.expiryDate());
        }
        return toAdminSupplyResponse(supplyRepository.save(supply));
    }

    @Transactional
    public void deleteSupply(UUID supplyId) {
        Supply supply = supplyRepository.findById(supplyId)
                .orElseThrow(() -> new ResourceNotFoundException("Supply", supplyId));
        supplyRepository.delete(supply);
    }

    @Transactional
    public AdminShoppingListResponse updateShoppingList(UUID listId, AdminShoppingListUpdateRequest request) {
        ShoppingList list = shoppingListRepository.findById(listId)
                .orElseThrow(() -> new ResourceNotFoundException("ShoppingList", listId));
        if (request.name() != null) {
            list.setName(request.name());
        }
        return toAdminShoppingListResponse(shoppingListRepository.save(list));
    }

    @Transactional
    public void deleteShoppingList(UUID listId) {
        ShoppingList list = shoppingListRepository.findById(listId)
                .orElseThrow(() -> new ResourceNotFoundException("ShoppingList", listId));
        shoppingListRepository.delete(list);
    }

    @Transactional
    public AdminCalendarEventResponse updateCalendarEvent(UUID eventId, AdminCalendarEventUpdateRequest request) {
        CalendarEvent event = calendarEventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("CalendarEvent", eventId));
        if (request.title() != null) {
            event.setTitle(request.title());
        }
        if (request.start() != null) {
            event.setStart(request.start());
        }
        if (request.end() != null) {
            event.setEnd(request.end());
        }
        return toAdminCalendarEventResponse(calendarEventRepository.save(event));
    }

    @Transactional
    public void deleteCalendarEvent(UUID eventId) {
        CalendarEvent event = calendarEventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("CalendarEvent", eventId));
        calendarEventRepository.delete(event);
    }

    public List<AdminFeedbackResponse> listFeedback() {
        return feedbackTicketRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toAdminFeedbackResponse)
                .toList();
    }

    public AdminFeedbackResponse getFeedback(UUID ticketId) {
        return toAdminFeedbackResponse(findFeedbackTicket(ticketId));
    }

    @Transactional
    public AdminFeedbackResponse updateFeedback(UUID ticketId, AdminFeedbackUpdateRequest request) {
        FeedbackTicket ticket = findFeedbackTicket(ticketId);
        if (request.status() != null) {
            ticket.setStatus(request.status());
            ticket.setUpdatedAt(Instant.now());
        }
        return toAdminFeedbackResponse(feedbackTicketRepository.save(ticket));
    }

    public FeedbackAttachmentFile downloadFeedbackAttachment(UUID ticketId, UUID attachmentId) {
        FeedbackTicket ticket = findFeedbackTicket(ticketId);
        var attachment = feedbackAttachmentRepository.findByIdAndTicketId(attachmentId, ticket.getId())
                .orElseThrow(() -> new ResourceNotFoundException("FeedbackAttachment", attachmentId));
        FileStorageService.StoredFile stored = fileStorageService.load(attachment.getStorageKey());
        return new FeedbackAttachmentFile(stored, attachment.getContentType());
    }

    public record FeedbackAttachmentFile(FileStorageService.StoredFile file, String contentType) {
    }

    private FeedbackTicket findFeedbackTicket(UUID ticketId) {
        return feedbackTicketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("FeedbackTicket", ticketId));
    }

    private AdminFeedbackResponse toAdminFeedbackResponse(FeedbackTicket ticket) {
        return new AdminFeedbackResponse(
                ticket.getId(),
                ticket.getType(),
                ticket.getDescription(),
                ticket.getStatus(),
                ticket.getCreatedAt(),
                ticket.getUpdatedAt(),
                ticket.getUser().getId(),
                ticket.getUser().getEmail(),
                ticket.getUser().getDisplayName(),
                ticket.getAttachments().stream()
                        .map(a -> new FeedbackAttachmentResponse(a.getId(), a.getContentType(), a.getOriginalFilename()))
                        .toList()
        );
    }

    private AdminTaskResponse toAdminTaskResponse(Task task) {
        return new AdminTaskResponse(
                task.getId(),
                task.getTitle(),
                task.isDone(),
                task.getDueDate(),
                task.getAssignedTo() != null ? task.getAssignedTo().getId() : null,
                task.getAssignedTo() != null ? task.getAssignedTo().getDisplayName() : null,
                task.getHousehold().getId(),
                task.getHousehold().getName()
        );
    }

    private AdminSupplyResponse toAdminSupplyResponse(Supply supply) {
        return new AdminSupplyResponse(
                supply.getId(),
                supply.getName(),
                supply.getQuantity(),
                supply.getExpiryDate(),
                supply.getHousehold().getId(),
                supply.getHousehold().getName()
        );
    }

    private AdminShoppingListResponse toAdminShoppingListResponse(ShoppingList list) {
        return new AdminShoppingListResponse(
                list.getId(),
                list.getName(),
                list.getHousehold().getId(),
                list.getHousehold().getName(),
                list.getItems().stream()
                        .map(item -> new ShoppingListItemResponse(item.getId(), item.getLabel(), item.isChecked()))
                        .toList()
        );
    }

    private AdminCalendarEventResponse toAdminCalendarEventResponse(CalendarEvent event) {
        return new AdminCalendarEventResponse(
                event.getId(),
                event.getTitle(),
                event.getStart(),
                event.getEnd(),
                event.getHousehold().getId(),
                event.getHousehold().getName()
        );
    }

    private User findUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
    }

    private Household findHousehold(UUID householdId) {
        return householdRepository.findById(householdId)
                .orElseThrow(() -> new ResourceNotFoundException("Household", householdId));
    }

    private AdminUserResponse toAdminUserResponse(User user) {
        return new AdminUserResponse(
                user.getId(),
                user.getEmail(),
                user.getDisplayName(),
                user.getRole(),
                householdService.findMemberships(user.getId()),
                user.isEmailVerified(),
                user.getCreatedAt()
        );
    }
}

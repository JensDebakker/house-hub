package be.househub.backend.service;

import be.househub.backend.dto.feedback.FeedbackAttachmentResponse;
import be.househub.backend.dto.feedback.FeedbackTicketResponse;
import be.househub.backend.dto.feedback.FeedbackUpdateRequest;
import be.househub.backend.entity.FeedbackAttachment;
import be.househub.backend.entity.FeedbackStatus;
import be.househub.backend.entity.FeedbackTicket;
import be.househub.backend.entity.FeedbackType;
import be.househub.backend.entity.User;
import be.househub.backend.exception.ResourceNotFoundException;
import be.househub.backend.repository.FeedbackAttachmentRepository;
import be.househub.backend.repository.FeedbackTicketRepository;
import be.househub.backend.service.storage.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FeedbackService {

    private static final int MAX_ATTACHMENTS = 5;
    private static final int MAX_DESCRIPTION_LENGTH = 2000;

    private final FeedbackTicketRepository feedbackTicketRepository;
    private final FeedbackAttachmentRepository feedbackAttachmentRepository;
    private final FileStorageService fileStorageService;

    public List<FeedbackTicketResponse> findAll(User user) {
        return feedbackTicketRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(this::toResponse)
                .toList();
    }

    public FeedbackTicketResponse findOne(User user, UUID ticketId) {
        return toResponse(findOwned(user, ticketId));
    }

    @Transactional
    public FeedbackTicketResponse create(User user, FeedbackType type, String description, List<MultipartFile> files) {
        if (type == null) {
            throw new IllegalArgumentException("Feedback type is required");
        }
        validateDescription(description);

        List<MultipartFile> attachments = validAttachments(files, 0);

        FeedbackTicket newTicket = new FeedbackTicket();
        newTicket.setUser(user);
        newTicket.setType(type);
        newTicket.setDescription(description);
        newTicket.setStatus(FeedbackStatus.OPEN);
        FeedbackTicket ticket = feedbackTicketRepository.save(newTicket);

        List<FeedbackAttachmentResponse> attachmentResponses = attachments.stream()
                .map(file -> storeAttachment(ticket, file))
                .map(this::toAttachmentResponse)
                .toList();

        return new FeedbackTicketResponse(
                ticket.getId(), ticket.getType(), ticket.getDescription(), ticket.getStatus(),
                ticket.getCreatedAt(), ticket.getUpdatedAt(), attachmentResponses
        );
    }

    @Transactional
    public FeedbackTicketResponse update(User user, UUID ticketId, FeedbackUpdateRequest request) {
        FeedbackTicket ticket = findOwnedEditable(user, ticketId);
        if (request != null && request.description() != null) {
            validateDescription(request.description());
            ticket.setDescription(request.description());
        }
        if (request != null && request.type() != null) {
            ticket.setType(request.type());
        }
        ticket.setUpdatedAt(Instant.now());
        return toResponse(feedbackTicketRepository.save(ticket));
    }

    @Transactional
    public FeedbackTicketResponse addAttachments(User user, UUID ticketId, List<MultipartFile> files) {
        FeedbackTicket ticket = findOwnedEditable(user, ticketId);
        List<MultipartFile> attachments = validAttachments(files, ticket.getAttachments().size());
        if (attachments.isEmpty()) {
            throw new IllegalArgumentException("At least one file is required");
        }
        for (MultipartFile file : attachments) {
            ticket.getAttachments().add(storeAttachment(ticket, file));
        }
        ticket.setUpdatedAt(Instant.now());
        return toResponse(feedbackTicketRepository.save(ticket));
    }

    @Transactional
    public FeedbackTicketResponse deleteAttachment(User user, UUID ticketId, UUID attachmentId) {
        FeedbackTicket ticket = findOwnedEditable(user, ticketId);
        FeedbackAttachment attachment = feedbackAttachmentRepository.findByIdAndTicketId(attachmentId, ticket.getId())
                .orElseThrow(() -> new ResourceNotFoundException("FeedbackAttachment", attachmentId));
        String storageKey = attachment.getStorageKey();
        // orphanRemoval on FeedbackTicket.attachments deletes the row once it leaves the collection.
        ticket.getAttachments().removeIf(a -> a.getId().equals(attachment.getId()));
        ticket.setUpdatedAt(Instant.now());
        FeedbackTicket saved = feedbackTicketRepository.saveAndFlush(ticket);
        // Blob is removed only after the row delete has been flushed successfully.
        fileStorageService.delete(storageKey);
        return toResponse(saved);
    }

    public AttachmentFile downloadAttachment(User user, UUID ticketId, UUID attachmentId) {
        FeedbackTicket ticket = findOwned(user, ticketId);
        FeedbackAttachment attachment = feedbackAttachmentRepository.findByIdAndTicketId(attachmentId, ticket.getId())
                .orElseThrow(() -> new ResourceNotFoundException("FeedbackAttachment", attachmentId));
        FileStorageService.StoredFile stored = fileStorageService.load(attachment.getStorageKey());
        return new AttachmentFile(stored, attachment.getContentType());
    }

    private FeedbackAttachment storeAttachment(FeedbackTicket ticket, MultipartFile file) {
        FeedbackAttachment attachment = new FeedbackAttachment();
        attachment.setTicket(ticket);
        attachment.setContentType(file.getContentType());
        attachment.setOriginalFilename(file.getOriginalFilename());
        // Temporary placeholder so the not-null/unique storage_key column is satisfied until
        // the attachment's generated id is known (the real key embeds that id).
        attachment.setStorageKey("pending/" + UUID.randomUUID());
        attachment = feedbackAttachmentRepository.save(attachment);

        String storageKey = "feedback/" + ticket.getId() + "/" + attachment.getId();
        try {
            fileStorageService.store(storageKey, file.getInputStream(), file.getSize(), file.getContentType());
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
        attachment.setStorageKey(storageKey);
        return feedbackAttachmentRepository.save(attachment);
    }

    private void validateDescription(String description) {
        if (description == null || description.isBlank()) {
            throw new IllegalArgumentException("Description is required");
        }
        if (description.length() > MAX_DESCRIPTION_LENGTH) {
            throw new IllegalArgumentException("Description must be at most " + MAX_DESCRIPTION_LENGTH + " characters");
        }
    }

    /**
     * Filters out empty parts and validates the rest; {@code existingCount} is how many
     * attachments the ticket already has, so the total never exceeds {@link #MAX_ATTACHMENTS}.
     */
    private List<MultipartFile> validAttachments(List<MultipartFile> files, int existingCount) {
        List<MultipartFile> attachments = files == null ? List.of() : files.stream()
                .filter(file -> file != null && !file.isEmpty())
                .toList();
        if (existingCount + attachments.size() > MAX_ATTACHMENTS) {
            throw new IllegalArgumentException("A feedback ticket can have at most " + MAX_ATTACHMENTS + " attachments");
        }
        for (MultipartFile file : attachments) {
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                throw new IllegalArgumentException("Feedback attachments must be image files");
            }
            if (file.getOriginalFilename() == null || file.getOriginalFilename().isBlank()) {
                throw new IllegalArgumentException("Feedback attachments must have a filename");
            }
        }
        return attachments;
    }

    /**
     * Owned ticket that the owner may still change. Non-OPEN tickets throw
     * IllegalStateException, which GlobalExceptionHandler maps to 409 Conflict.
     */
    private FeedbackTicket findOwnedEditable(User user, UUID ticketId) {
        FeedbackTicket ticket = findOwned(user, ticketId);
        if (ticket.getStatus() != FeedbackStatus.OPEN) {
            throw new IllegalStateException("Feedback can only be edited while its status is OPEN");
        }
        return ticket;
    }

    private FeedbackTicket findOwned(User user, UUID ticketId) {
        return feedbackTicketRepository.findByIdAndUserId(ticketId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("FeedbackTicket", ticketId));
    }

    private FeedbackTicketResponse toResponse(FeedbackTicket ticket) {
        return new FeedbackTicketResponse(
                ticket.getId(),
                ticket.getType(),
                ticket.getDescription(),
                ticket.getStatus(),
                ticket.getCreatedAt(),
                ticket.getUpdatedAt(),
                ticket.getAttachments().stream().map(this::toAttachmentResponse).toList()
        );
    }

    private FeedbackAttachmentResponse toAttachmentResponse(FeedbackAttachment attachment) {
        return new FeedbackAttachmentResponse(attachment.getId(), attachment.getContentType(), attachment.getOriginalFilename());
    }

    public record AttachmentFile(FileStorageService.StoredFile file, String contentType) {
    }
}

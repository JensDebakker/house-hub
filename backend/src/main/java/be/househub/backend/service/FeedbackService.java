package be.househub.backend.service;

import be.househub.backend.dto.feedback.FeedbackAttachmentResponse;
import be.househub.backend.dto.feedback.FeedbackTicketResponse;
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
        if (description == null || description.isBlank()) {
            throw new IllegalArgumentException("Description is required");
        }
        if (description.length() > MAX_DESCRIPTION_LENGTH) {
            throw new IllegalArgumentException("Description must be at most " + MAX_DESCRIPTION_LENGTH + " characters");
        }

        List<MultipartFile> attachments = files == null ? List.of() : files.stream()
                .filter(file -> file != null && !file.isEmpty())
                .toList();
        if (attachments.size() > MAX_ATTACHMENTS) {
            throw new IllegalArgumentException("A feedback ticket can have at most " + MAX_ATTACHMENTS + " attachments");
        }
        for (MultipartFile file : attachments) {
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                throw new IllegalArgumentException("Feedback attachments must be image files");
            }
        }

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

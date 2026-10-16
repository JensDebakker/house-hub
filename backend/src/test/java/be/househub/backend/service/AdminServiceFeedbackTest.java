package be.househub.backend.service;

import be.househub.backend.entity.FeedbackAttachment;
import be.househub.backend.entity.FeedbackStatus;
import be.househub.backend.entity.FeedbackTicket;
import be.househub.backend.entity.FeedbackType;
import be.househub.backend.exception.ResourceNotFoundException;
import be.househub.backend.repository.FeedbackAttachmentRepository;
import be.househub.backend.repository.FeedbackTicketRepository;
import be.househub.backend.service.storage.FileStorageService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Feedback-specific AdminService behaviour. The remaining AdminService collaborators are
 * left as Mockito mocks injected through the constructor and are not exercised here.
 */
@ExtendWith(MockitoExtension.class)
class AdminServiceFeedbackTest {

    @Mock
    private FeedbackTicketRepository feedbackTicketRepository;

    @Mock
    private FileStorageService fileStorageService;

    @Mock
    private FeedbackAttachmentRepository feedbackAttachmentRepository;

    @InjectMocks
    private AdminService adminService;

    private FeedbackTicket ticket() {
        FeedbackTicket ticket = new FeedbackTicket();
        ticket.setId(UUID.randomUUID());
        ticket.setType(FeedbackType.BUG);
        ticket.setDescription("Broken");
        ticket.setStatus(FeedbackStatus.CLOSED);
        return ticket;
    }

    private FeedbackAttachment attachment(FeedbackTicket ticket) {
        FeedbackAttachment attachment = new FeedbackAttachment();
        attachment.setId(UUID.randomUUID());
        attachment.setTicket(ticket);
        attachment.setContentType("image/png");
        attachment.setOriginalFilename("a.png");
        attachment.setStorageKey("feedback/" + ticket.getId() + "/" + attachment.getId());
        ticket.getAttachments().add(attachment);
        return attachment;
    }

    @Test
    void deleteFeedback_deletesTicketThenAllBlobs() {
        FeedbackTicket ticket = ticket();
        FeedbackAttachment first = attachment(ticket);
        FeedbackAttachment second = attachment(ticket);
        when(feedbackTicketRepository.findById(ticket.getId())).thenReturn(Optional.of(ticket));

        adminService.deleteFeedback(ticket.getId());

        InOrder order = inOrder(feedbackTicketRepository, fileStorageService);
        order.verify(feedbackTicketRepository).delete(ticket);
        order.verify(feedbackTicketRepository).flush();
        order.verify(fileStorageService).delete(first.getStorageKey());
        order.verify(fileStorageService).delete(second.getStorageKey());
    }

    @Test
    void deleteFeedback_unknownTicket_throwsNotFound() {
        UUID ticketId = UUID.randomUUID();
        when(feedbackTicketRepository.findById(ticketId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adminService.deleteFeedback(ticketId))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(feedbackTicketRepository, never()).delete(any());
        verify(fileStorageService, never()).delete(anyString());
    }
}

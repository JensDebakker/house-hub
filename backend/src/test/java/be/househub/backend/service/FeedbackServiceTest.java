package be.househub.backend.service;

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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FeedbackServiceTest {

    @Mock
    private FeedbackTicketRepository feedbackTicketRepository;

    @Mock
    private FeedbackAttachmentRepository feedbackAttachmentRepository;

    @Mock
    private FileStorageService fileStorageService;

    private FeedbackService feedbackService;

    @BeforeEach
    void setUp() {
        feedbackService = new FeedbackService(feedbackTicketRepository, feedbackAttachmentRepository, fileStorageService);
    }

    private User user() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("user@example.com");
        user.setDisplayName("Some User");
        return user;
    }

    private FeedbackTicket ticket(User user) {
        FeedbackTicket ticket = new FeedbackTicket();
        ticket.setId(UUID.randomUUID());
        ticket.setUser(user);
        ticket.setType(FeedbackType.BUG);
        ticket.setDescription("Something broke");
        ticket.setStatus(FeedbackStatus.OPEN);
        return ticket;
    }

    @Test
    void create_withoutFiles_savesTicketWithNoAttachments() {
        User user = user();
        when(feedbackTicketRepository.save(any(FeedbackTicket.class))).thenAnswer(invocation -> {
            FeedbackTicket saved = invocation.getArgument(0);
            saved.setId(UUID.randomUUID());
            return saved;
        });

        FeedbackTicketResponse response = feedbackService.create(user, FeedbackType.SUGGESTION, "Please add dark mode", null);

        assertThat(response.type()).isEqualTo(FeedbackType.SUGGESTION);
        assertThat(response.description()).isEqualTo("Please add dark mode");
        assertThat(response.status()).isEqualTo(FeedbackStatus.OPEN);
        assertThat(response.attachments()).isEmpty();
        verify(feedbackAttachmentRepository, never()).save(any());
    }

    @Test
    void create_blankDescription_throws() {
        User user = user();

        assertThatThrownBy(() -> feedbackService.create(user, FeedbackType.BUG, "  ", null))
                .isInstanceOf(IllegalArgumentException.class);

        verify(feedbackTicketRepository, never()).save(any());
    }

    @Test
    void create_tooManyAttachments_throws() {
        User user = user();
        List<org.springframework.web.multipart.MultipartFile> files = List.of(
                new MockMultipartFile("files", "a.png", "image/png", new byte[]{1}),
                new MockMultipartFile("files", "b.png", "image/png", new byte[]{1}),
                new MockMultipartFile("files", "c.png", "image/png", new byte[]{1}),
                new MockMultipartFile("files", "d.png", "image/png", new byte[]{1}),
                new MockMultipartFile("files", "e.png", "image/png", new byte[]{1}),
                new MockMultipartFile("files", "f.png", "image/png", new byte[]{1})
        );

        assertThatThrownBy(() -> feedbackService.create(user, FeedbackType.BUG, "Too many images", files))
                .isInstanceOf(IllegalArgumentException.class);

        verify(feedbackTicketRepository, never()).save(any());
    }

    @Test
    void create_nonImageAttachment_throws() {
        User user = user();
        List<org.springframework.web.multipart.MultipartFile> files = List.of(
                new MockMultipartFile("files", "notes.txt", "text/plain", "hello".getBytes())
        );

        assertThatThrownBy(() -> feedbackService.create(user, FeedbackType.BUG, "Broken thing", files))
                .isInstanceOf(IllegalArgumentException.class);

        verify(feedbackTicketRepository, never()).save(any());
    }

    @Test
    void create_withImageAttachment_storesFileAndReturnsAttachment() {
        User user = user();
        when(feedbackTicketRepository.save(any(FeedbackTicket.class))).thenAnswer(invocation -> {
            FeedbackTicket saved = invocation.getArgument(0);
            saved.setId(UUID.randomUUID());
            return saved;
        });
        when(feedbackAttachmentRepository.save(any(FeedbackAttachment.class))).thenAnswer(invocation -> {
            FeedbackAttachment saved = invocation.getArgument(0);
            if (saved.getId() == null) {
                saved.setId(UUID.randomUUID());
            }
            return saved;
        });

        MockMultipartFile file = new MockMultipartFile("files", "screenshot.png", "image/png", new byte[]{1, 2, 3});
        FeedbackTicketResponse response = feedbackService.create(user, FeedbackType.BUG, "Broken screen", List.of(file));

        assertThat(response.attachments()).hasSize(1);
        assertThat(response.attachments().get(0).contentType()).isEqualTo("image/png");
        assertThat(response.attachments().get(0).originalFilename()).isEqualTo("screenshot.png");
        verify(fileStorageService).store(anyString(), any(), anyLong(), eq("image/png"));
        verify(feedbackAttachmentRepository, org.mockito.Mockito.times(2)).save(any(FeedbackAttachment.class));
    }

    @Test
    void findOne_notOwner_throwsNotFound() {
        User user = user();
        UUID ticketId = UUID.randomUUID();
        when(feedbackTicketRepository.findByIdAndUserId(ticketId, user.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> feedbackService.findOne(user, ticketId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void findAll_scopesToUser() {
        User user = user();
        FeedbackTicket ticket = ticket(user);
        when(feedbackTicketRepository.findByUserIdOrderByCreatedAtDesc(user.getId())).thenReturn(List.of(ticket));

        List<FeedbackTicketResponse> result = feedbackService.findAll(user);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).id()).isEqualTo(ticket.getId());
    }

    @Test
    void downloadAttachment_wrongTicketOwner_throwsNotFound() {
        User user = user();
        UUID ticketId = UUID.randomUUID();
        when(feedbackTicketRepository.findByIdAndUserId(ticketId, user.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> feedbackService.downloadAttachment(user, ticketId, UUID.randomUUID()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void downloadAttachment_existingAttachment_loadsFromStorage() {
        User user = user();
        FeedbackTicket ticket = ticket(user);
        FeedbackAttachment attachment = new FeedbackAttachment();
        attachment.setId(UUID.randomUUID());
        attachment.setTicket(ticket);
        attachment.setContentType("image/png");
        attachment.setOriginalFilename("a.png");
        attachment.setStorageKey("feedback/" + ticket.getId() + "/" + attachment.getId());

        when(feedbackTicketRepository.findByIdAndUserId(ticket.getId(), user.getId())).thenReturn(Optional.of(ticket));
        when(feedbackAttachmentRepository.findByIdAndTicketId(attachment.getId(), ticket.getId()))
                .thenReturn(Optional.of(attachment));
        FileStorageService.StoredFile stored = new FileStorageService.StoredFile(new ByteArrayInputStream(new byte[]{1}), 1L);
        when(fileStorageService.load(attachment.getStorageKey())).thenReturn(stored);

        FeedbackService.AttachmentFile result = feedbackService.downloadAttachment(user, ticket.getId(), attachment.getId());

        assertThat(result.contentType()).isEqualTo("image/png");
        assertThat(result.file()).isSameAs(stored);
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
    void update_openTicket_changesOnlyProvidedFieldsAndBumpsUpdatedAt() {
        User user = user();
        FeedbackTicket ticket = ticket(user);
        Instant before = Instant.parse("2020-01-01T00:00:00Z");
        ticket.setUpdatedAt(before);
        when(feedbackTicketRepository.findByIdAndUserId(ticket.getId(), user.getId())).thenReturn(Optional.of(ticket));
        when(feedbackTicketRepository.save(ticket)).thenReturn(ticket);

        FeedbackTicketResponse response = feedbackService.update(user, ticket.getId(),
                new FeedbackUpdateRequest(null, "Actually it is fine now"));

        assertThat(response.type()).isEqualTo(FeedbackType.BUG);
        assertThat(response.description()).isEqualTo("Actually it is fine now");
        assertThat(response.updatedAt()).isAfter(before);
    }

    @Test
    void update_changesType() {
        User user = user();
        FeedbackTicket ticket = ticket(user);
        when(feedbackTicketRepository.findByIdAndUserId(ticket.getId(), user.getId())).thenReturn(Optional.of(ticket));
        when(feedbackTicketRepository.save(ticket)).thenReturn(ticket);

        FeedbackTicketResponse response = feedbackService.update(user, ticket.getId(),
                new FeedbackUpdateRequest(FeedbackType.SUGGESTION, null));

        assertThat(response.type()).isEqualTo(FeedbackType.SUGGESTION);
        assertThat(response.description()).isEqualTo("Something broke");
    }

    @Test
    void update_blankDescription_throwsBadRequest() {
        User user = user();
        FeedbackTicket ticket = ticket(user);
        when(feedbackTicketRepository.findByIdAndUserId(ticket.getId(), user.getId())).thenReturn(Optional.of(ticket));

        assertThatThrownBy(() -> feedbackService.update(user, ticket.getId(), new FeedbackUpdateRequest(null, " ")))
                .isInstanceOf(IllegalArgumentException.class);
        verify(feedbackTicketRepository, never()).save(any());
    }

    @Test
    void update_nonOpenTicket_throwsConflict() {
        User user = user();
        FeedbackTicket ticket = ticket(user);
        ticket.setStatus(FeedbackStatus.IN_PROGRESS);
        when(feedbackTicketRepository.findByIdAndUserId(ticket.getId(), user.getId())).thenReturn(Optional.of(ticket));

        assertThatThrownBy(() -> feedbackService.update(user, ticket.getId(), new FeedbackUpdateRequest(null, "New text")))
                .isInstanceOf(IllegalStateException.class);
        verify(feedbackTicketRepository, never()).save(any());
    }

    @Test
    void update_someoneElsesTicket_throwsNotFound() {
        User user = user();
        UUID ticketId = UUID.randomUUID();
        when(feedbackTicketRepository.findByIdAndUserId(ticketId, user.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> feedbackService.update(user, ticketId, new FeedbackUpdateRequest(null, "New text")))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(feedbackTicketRepository, never()).save(any());
    }

    @Test
    void addAttachments_overTotalLimit_throwsBadRequest() {
        User user = user();
        FeedbackTicket ticket = ticket(user);
        for (int i = 0; i < 4; i++) {
            attachment(ticket);
        }
        when(feedbackTicketRepository.findByIdAndUserId(ticket.getId(), user.getId())).thenReturn(Optional.of(ticket));
        List<MultipartFile> files = List.of(
                new MockMultipartFile("files", "x.png", "image/png", new byte[]{1}),
                new MockMultipartFile("files", "y.png", "image/png", new byte[]{1})
        );

        assertThatThrownBy(() -> feedbackService.addAttachments(user, ticket.getId(), files))
                .isInstanceOf(IllegalArgumentException.class);
        verify(fileStorageService, never()).store(anyString(), any(), anyLong(), anyString());
        verify(feedbackAttachmentRepository, never()).save(any());
    }

    @Test
    void addAttachments_withinLimit_storesAndReturnsAllAttachments() {
        User user = user();
        FeedbackTicket ticket = ticket(user);
        attachment(ticket);
        when(feedbackTicketRepository.findByIdAndUserId(ticket.getId(), user.getId())).thenReturn(Optional.of(ticket));
        when(feedbackTicketRepository.save(ticket)).thenReturn(ticket);
        when(feedbackAttachmentRepository.save(any(FeedbackAttachment.class))).thenAnswer(invocation -> {
            FeedbackAttachment saved = invocation.getArgument(0);
            if (saved.getId() == null) {
                saved.setId(UUID.randomUUID());
            }
            return saved;
        });

        FeedbackTicketResponse response = feedbackService.addAttachments(user, ticket.getId(),
                List.of(new MockMultipartFile("files", "new.png", "image/png", new byte[]{1, 2})));

        assertThat(response.attachments()).hasSize(2);
        assertThat(response.attachments().get(1).originalFilename()).isEqualTo("new.png");
        verify(fileStorageService).store(anyString(), any(), anyLong(), eq("image/png"));
    }

    @Test
    void addAttachments_nonOpenTicket_throwsConflict() {
        User user = user();
        FeedbackTicket ticket = ticket(user);
        ticket.setStatus(FeedbackStatus.RESOLVED);
        when(feedbackTicketRepository.findByIdAndUserId(ticket.getId(), user.getId())).thenReturn(Optional.of(ticket));

        assertThatThrownBy(() -> feedbackService.addAttachments(user, ticket.getId(),
                List.of(new MockMultipartFile("files", "new.png", "image/png", new byte[]{1}))))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void deleteAttachment_removesRowAndBlob() {
        User user = user();
        FeedbackTicket ticket = ticket(user);
        FeedbackAttachment keep = attachment(ticket);
        FeedbackAttachment remove = attachment(ticket);
        when(feedbackTicketRepository.findByIdAndUserId(ticket.getId(), user.getId())).thenReturn(Optional.of(ticket));
        when(feedbackAttachmentRepository.findByIdAndTicketId(remove.getId(), ticket.getId())).thenReturn(Optional.of(remove));
        when(feedbackTicketRepository.saveAndFlush(ticket)).thenReturn(ticket);

        FeedbackTicketResponse response = feedbackService.deleteAttachment(user, ticket.getId(), remove.getId());

        assertThat(response.attachments()).extracting(a -> a.id()).containsExactly(keep.getId());
        assertThat(ticket.getAttachments()).doesNotContain(remove);
        verify(fileStorageService).delete(remove.getStorageKey());
    }

    @Test
    void deleteAttachment_unknownAttachment_throwsNotFound() {
        User user = user();
        FeedbackTicket ticket = ticket(user);
        UUID attachmentId = UUID.randomUUID();
        when(feedbackTicketRepository.findByIdAndUserId(ticket.getId(), user.getId())).thenReturn(Optional.of(ticket));
        when(feedbackAttachmentRepository.findByIdAndTicketId(attachmentId, ticket.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> feedbackService.deleteAttachment(user, ticket.getId(), attachmentId))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(fileStorageService, never()).delete(anyString());
    }
}

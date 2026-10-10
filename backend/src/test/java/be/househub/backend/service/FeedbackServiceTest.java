package be.househub.backend.service;

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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayInputStream;
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
}

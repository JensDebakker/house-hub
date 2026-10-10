package be.househub.backend.controller;

import be.househub.backend.dto.feedback.FeedbackTicketResponse;
import be.househub.backend.entity.FeedbackType;
import be.househub.backend.security.SecurityUtils;
import be.househub.backend.service.FeedbackService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/feedback")
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackService feedbackService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<FeedbackTicketResponse> create(@RequestParam("type") FeedbackType type,
                                                            @RequestParam("description") String description,
                                                            @RequestParam(value = "files", required = false) List<MultipartFile> files) {
        var created = feedbackService.create(SecurityUtils.getCurrentUser(), type, description, files);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping
    public List<FeedbackTicketResponse> findAll() {
        return feedbackService.findAll(SecurityUtils.getCurrentUser());
    }

    @GetMapping("/{id}")
    public FeedbackTicketResponse findOne(@PathVariable UUID id) {
        return feedbackService.findOne(SecurityUtils.getCurrentUser(), id);
    }

    @GetMapping("/{id}/attachments/{attachmentId}")
    public ResponseEntity<InputStreamResource> downloadAttachment(@PathVariable UUID id, @PathVariable UUID attachmentId) {
        FeedbackService.AttachmentFile file = feedbackService.downloadAttachment(SecurityUtils.getCurrentUser(), id, attachmentId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.contentType()))
                .contentLength(file.file().size())
                .body(new InputStreamResource(file.file().data()));
    }
}

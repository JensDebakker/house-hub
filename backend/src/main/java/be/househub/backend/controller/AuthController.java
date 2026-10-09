package be.househub.backend.controller;

import be.househub.backend.dto.MessageResponse;
import be.househub.backend.dto.auth.AuthResponse;
import be.househub.backend.dto.auth.ChangePasswordRequest;
import be.househub.backend.dto.auth.ForgotPasswordRequest;
import be.househub.backend.dto.auth.LoginRequest;
import be.househub.backend.dto.auth.RefreshRequest;
import be.househub.backend.dto.auth.RegisterRequest;
import be.househub.backend.dto.auth.RegisterResponse;
import be.househub.backend.dto.auth.ResetPasswordRequest;
import be.househub.backend.dto.auth.TokenResponse;
import be.househub.backend.dto.auth.UserResponse;
import be.househub.backend.dto.auth.VerifyEmailRequest;
import be.househub.backend.entity.User;
import be.househub.backend.security.SecurityUtils;
import be.househub.backend.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<RegisterResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<TokenResponse> refresh(@Valid @RequestBody RefreshRequest request) {
        return ResponseEntity.ok(authService.refresh(request.refreshToken()));
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> me() {
        User currentUser = SecurityUtils.getCurrentUser();
        return ResponseEntity.ok(authService.currentUser(currentUser));
    }

    @PostMapping("/verify-email")
    public ResponseEntity<AuthResponse> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        return ResponseEntity.ok(authService.verifyEmail(request.token()));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<MessageResponse> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        return ResponseEntity.ok(authService.forgotPassword(request));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<MessageResponse> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        return ResponseEntity.ok(authService.resetPassword(request));
    }

    @PostMapping("/change-password")
    public ResponseEntity<MessageResponse> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        return ResponseEntity.ok(authService.changePassword(SecurityUtils.getCurrentUser(), request));
    }

    @PostMapping("/profile-picture")
    public ResponseEntity<UserResponse> uploadProfilePicture(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(authService.uploadProfilePicture(SecurityUtils.getCurrentUser(), file));
    }

    @GetMapping("/profile-picture")
    public ResponseEntity<InputStreamResource> downloadProfilePicture() {
        AuthService.ProfilePicture picture = authService.downloadProfilePicture(SecurityUtils.getCurrentUser());
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(picture.contentType()))
                .contentLength(picture.file().size())
                .body(new InputStreamResource(picture.file().data()));
    }

    @DeleteMapping("/profile-picture")
    public ResponseEntity<UserResponse> removeProfilePicture() {
        return ResponseEntity.ok(authService.removeProfilePicture(SecurityUtils.getCurrentUser()));
    }
}

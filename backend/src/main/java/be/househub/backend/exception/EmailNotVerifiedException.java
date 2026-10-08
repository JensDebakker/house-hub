package be.househub.backend.exception;

public class EmailNotVerifiedException extends RuntimeException {

    public EmailNotVerifiedException() {
        super("Email not verified. Check your inbox for the verification link.");
    }
}

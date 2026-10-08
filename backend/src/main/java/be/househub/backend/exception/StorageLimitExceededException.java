package be.househub.backend.exception;

public class StorageLimitExceededException extends RuntimeException {

    public StorageLimitExceededException(String message) {
        super(message);
    }
}

package be.househub.backend.service.storage;

import java.io.InputStream;

public interface FileStorageService {

    void store(String key, InputStream data, long size, String contentType);

    StoredFile load(String key);

    void delete(String key);

    record StoredFile(InputStream data, long size) {
    }
}

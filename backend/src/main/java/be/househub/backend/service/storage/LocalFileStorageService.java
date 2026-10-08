package be.househub.backend.service.storage;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

@Service
@RequiredArgsConstructor
public class LocalFileStorageService implements FileStorageService {

    @Value("${app.files.storage-dir}")
    private String storageDir;

    @Override
    public void store(String key, InputStream data, long size, String contentType) {
        try {
            Path path = resolve(key);
            Files.createDirectories(path.getParent());
            Files.copy(data, path, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException ex) {
            throw new StorageException("Failed to store file '" + key + "'", ex);
        }
    }

    @Override
    public StoredFile load(String key) {
        try {
            Path path = resolve(key);
            return new StoredFile(Files.newInputStream(path), Files.size(path));
        } catch (IOException ex) {
            throw new StorageException("Failed to load file '" + key + "'", ex);
        }
    }

    @Override
    public void delete(String key) {
        try {
            Files.deleteIfExists(resolve(key));
        } catch (IOException ex) {
            throw new StorageException("Failed to delete file '" + key + "'", ex);
        }
    }

    private Path resolve(String key) {
        Path root = Path.of(storageDir).toAbsolutePath().normalize();
        Path resolved = root.resolve(key).normalize();
        if (!resolved.startsWith(root)) {
            throw new StorageException("Invalid storage key '" + key + "'", null);
        }
        return resolved;
    }
}

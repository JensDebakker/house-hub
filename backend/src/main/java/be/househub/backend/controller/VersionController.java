package be.househub.backend.controller;

import be.househub.backend.dto.VersionResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class VersionController {

    @Value("${app.version}")
    private String version;

    @GetMapping("/version")
    public VersionResponse version() {
        return new VersionResponse("v" + version);
    }
}

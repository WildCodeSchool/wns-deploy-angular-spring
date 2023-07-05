package fr.wcs.deployback.controllers;

import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.context.annotation.RequestScope;

@Controller
@CrossOrigin(origins = "*")
public class MainController {

    @GetMapping(path = "/ping", produces = "text/plain")
    @ResponseBody
    public ResponseEntity<String> ping() {
        var response = ResponseEntity.ok("pong");
        return response;
    }
}
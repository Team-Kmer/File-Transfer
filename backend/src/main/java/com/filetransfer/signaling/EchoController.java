package com.filetransfer.signaling;

import org.springframework.context.annotation.Profile;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
@Profile("dev")
public class EchoController {

    @MessageMapping("/echo")
    @SendTo("/topic/echo")
    public String echo(String message) {
        return message;
    }
}
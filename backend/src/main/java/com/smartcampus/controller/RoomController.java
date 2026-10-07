package com.smartcampus.controller;

import com.smartcampus.dto.RoomResponse;
import com.smartcampus.service.RoomService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/rooms")
public class RoomController {

    private final RoomService roomService;

    public RoomController(RoomService roomService) {
        this.roomService = roomService;
    }

    @GetMapping
    public List<RoomResponse> getRooms() {
        return roomService.getRooms();
    }

    @GetMapping("/{id}")
    public RoomResponse getRoomById(@PathVariable String id) {
        return roomService.getRoomById(id);
    }
}
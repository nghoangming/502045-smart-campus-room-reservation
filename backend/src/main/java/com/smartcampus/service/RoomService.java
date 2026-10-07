package com.smartcampus.service;

import com.smartcampus.dto.RoomResponse;
import com.smartcampus.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RoomService {

    public List<RoomResponse> getRooms() {
        return List.of(
                new RoomResponse("B104", "B-104", "THEORY"),
                new RoomResponse("SR101", "Study Room 101", "STUDY")
        );
    }

    public RoomResponse getRoomById(String id) {
        return getRooms().stream()
                .filter(room -> room.id().equals(id))
                .findFirst()
                .orElseThrow(() ->
                        new ResourceNotFoundException("Room not found: " + id)
                );
    }
}
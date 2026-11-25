# Week 4 backend integration

> Tài liệu lịch sử của tuần 4, không còn là hướng dẫn triển khai hiện tại. Xem `../database/README.md` cho migration 001–024 và `../docs/architecture/openapi-spec.yaml` cho API hiện có. Xác thực JWT và các API dựa trên người dùng đăng nhập đã được triển khai; ghi chú placeholder user_id phía dưới chỉ phản ánh trạng thái của tuần 4.

The implementation lives in `src/main/java/com/smartcampus/`; no files from the
separate `week4` staging folder need to be copied over. Apply database migrations
005 and 006 before starting the backend (`ddl-auto=validate` does not run them).

## API sequence

1. Create a classroom reservation: `POST /api/v1/classroom-reservations` with
   `roomId`, `startTime`, and `endTime`. Study rooms use
   `POST /api/v1/study-room-reservations`.
2. Create its session: `POST /api/v1/class-sessions` with `bookingId`,
   `courseCode`, and `title`. The room and time come from the booking.
3. List seats: `GET /api/v1/class-sessions/{id}/seats`.
4. Reserve: `POST /api/v1/seat-reservations` with `classSessionId` and `seatId`.
   Details and cancellation use `GET /api/v1/seat-reservations/{id}` and
   `PATCH /api/v1/seat-reservations/{id}/cancel`.

The service locks the room before checking booking overlap, and locks the booking
and seat before checking seat availability. PostgreSQL exclusion/unique constraints
remain the final arbiter of simultaneous writes. A known room exclusion violation
or either active seat unique violation returns HTTP 409. Cancelling a booking also
cancels active seat selections for its class session in the same transaction.

Current implementation uses JWT authentication and the authenticated user ID for
room and seat operations. The original week-4 placeholder flow has been replaced.
For current database rules and deployment steps, use `../database/README.md`.

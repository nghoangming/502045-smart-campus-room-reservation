/** Dữ liệu dự phòng từng dùng với RoomService stub; API tests lấy phòng thật qua GET /rooms. */
export const stubRooms = [
  { id: 'B104', name: 'B-104', type: 'THEORY' },
  { id: 'SR101', name: 'Study Room 101', type: 'STUDY' },
];

// RoomController parses this as Long; use a numeric absent ID to exercise 404, not 400 parsing errors.
export const NOT_FOUND_ROOM_ID = '999999999';

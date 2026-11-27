/** Dữ liệu phòng mẫu hiện có trong RoomService (stub) của backend. */
export const stubRooms = [
  { id: 'B104', name: 'B-104', type: 'THEORY' },
  { id: 'SR101', name: 'Study Room 101', type: 'STUDY' },
];

// Room ids are Long path variables; a non-numeric sentinel returns 400, not 404.
export const NOT_FOUND_ROOM_ID = '999999999';

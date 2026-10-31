import { isoDate } from '../helpers/api';

/** Shared slot used by reservation tests. Override fields per test when needed. */
export function bookingSlot(offsetDays = 3) {
  const date = isoDate(offsetDays);
  return {
    startTime: `${date}T09:00:00+07:00`,
    endTime: `${date}T10:00:00+07:00`,
  };
}

export const bookingPaths = {
  classroomReservations: '/classroom-reservations',
  studyRoomReservations: '/study-room-reservations',
  classSessions: '/class-sessions',
  seatReservations: '/seat-reservations',
};

export type Reservation = {
  id?: string | number;
  reservationId?: string | number;
  roomId?: string | number;
  seatId?: string | number;
  startTime?: string;
  endTime?: string;
  status?: string;
};

export function reservationId(body: Reservation): string {
  const id = body.id ?? body.reservationId;
  if (id === undefined || id === null) {
    throw new Error('Create reservation response must include id or reservationId');
  }
  return String(id);
}

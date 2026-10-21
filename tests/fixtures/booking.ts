import { isoDate } from '../helpers/api';

/** Shared slot used by reservation tests. Override fields per test when needed. */
export function bookingSlot(offsetDays = 3) {
  return {
    date: isoDate(offsetDays),
    startTime: '09:00',
    endTime: '10:00',
  };
}

export const bookingPaths = {
  reservations: '/reservations',
  seats: '/seats',
};

export type Reservation = {
  id?: string | number;
  reservationId?: string | number;
  roomId?: string | number;
  seatId?: string | number;
  date?: string;
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

import { test, expect } from '@playwright/test';
import { bookingSlot, bookingPaths, Reservation, reservationId } from '../../fixtures/booking';
import { firstRoomId, postJson, getJson, patchJson } from '../../helpers/api';
import { pending } from '../../helpers/pending';

async function cancelReservation(request: Parameters<typeof patchJson>[0], id: string) {
  await patchJson(request, `${bookingPaths.studyRoomReservations}/${id}/cancel`);
}

pending('Reservation API – tuần 3 (chờ chạy cùng backend đã cập nhật)', () => {
  test('đặt phòng tự học thành công trả 201 và lưu đúng khung giờ', async ({ request }) => {
    const roomId = await firstRoomId(request);
    const slot = bookingSlot(30);
    const { res, body } = await postJson<Reservation>(
      request,
      bookingPaths.studyRoomReservations,
      { roomId: Number(roomId), ...slot },
    );
    expect(res.status()).toBe(201);
    expect(String(body.roomId)).toBe(roomId);
    expect(new Date(body.startTime!).toISOString()).toBe(new Date(slot.startTime).toISOString());
    expect(new Date(body.endTime!).toISOString()).toBe(new Date(slot.endTime).toISOString());
    await cancelReservation(request, reservationId(body));
  });

  test('từ chối booking overlap cùng phòng với 409', async ({ request }) => {
    const roomId = await firstRoomId(request);
    const slot = bookingSlot(31);
    const first = await postJson<Reservation>(request, bookingPaths.studyRoomReservations, {
      roomId: Number(roomId), ...slot,
    });
    expect(first.res.status()).toBe(201);
    try {
      const overlap = await postJson(request, bookingPaths.studyRoomReservations, {
        roomId: Number(roomId),
        startTime: `${slot.startTime.slice(0, 11)}09:30:00+07:00`,
        endTime: `${slot.startTime.slice(0, 11)}10:30:00+07:00`,
      });
      expect(overlap.res.status()).toBe(409);
    } finally {
      await cancelReservation(request, reservationId(first.body));
    }
  });

  test('cho phép hai booking liền kề, không chồng lấn', async ({ request }) => {
    const roomId = await firstRoomId(request);
    const slot = bookingSlot(32);
    const first = await postJson<Reservation>(request, bookingPaths.studyRoomReservations, {
      roomId: Number(roomId), ...slot,
    });
    expect(first.res.status()).toBe(201);
    let secondId: string | undefined;
    try {
      const day = slot.startTime.slice(0, 11);
      const adjacent = await postJson<Reservation>(request, bookingPaths.studyRoomReservations, {
        roomId: Number(roomId),
        startTime: slot.endTime,
        endTime: `${day}11:00:00+07:00`,
      });
      expect(adjacent.res.status()).toBe(201);
      secondId = reservationId(adjacent.body);
    } finally {
      await cancelReservation(request, reservationId(first.body));
      if (secondId) await cancelReservation(request, secondId);
    }
  });

  test('từ chối endTime bằng hoặc trước startTime với 400', async ({ request }) => {
    const roomId = await firstRoomId(request);
    const slot = bookingSlot(33);
    const day = slot.startTime.slice(0, 11);
    for (const [startTime, endTime] of [
      [`${day}10:00:00+07:00`, `${day}10:00:00+07:00`],
      [`${day}11:00:00+07:00`, `${day}10:00:00+07:00`],
    ]) {
      const { res } = await postJson(request, bookingPaths.studyRoomReservations, {
        roomId: Number(roomId), startTime, endTime,
      });
      expect(res.status()).toBe(400);
    }
  });

  test('hủy booking qua PATCH và xác nhận trạng thái CANCELLED', async ({ request }) => {
    const roomId = await firstRoomId(request);
    const created = await postJson<Reservation>(request, bookingPaths.studyRoomReservations, {
      roomId: Number(roomId), ...bookingSlot(34),
    });
    expect(created.res.status()).toBe(201);
    const id = reservationId(created.body);
    const canceled = await patchJson<Reservation>(request, `${bookingPaths.studyRoomReservations}/${id}/cancel`);
    expect(canceled.res.status()).toBe(200);
    expect(canceled.body.status).toBe('CANCELLED');
    const fetched = await getJson<Reservation>(request, `${bookingPaths.studyRoomReservations}/${id}`);
    expect(fetched.res.status()).toBe(200);
    expect(fetched.body.status).toBe('CANCELLED');
  });
});

pending('Reservation API – request validation', () => {
  test('từ chối timestamp sai định dạng hoặc thiếu trường bắt buộc với 400', async ({ request }) => {
    const roomId = await firstRoomId(request);
    const slot = bookingSlot(35);
    for (const payload of [
      { roomId: Number(roomId), ...slot, startTime: 'not-a-timestamp' },
      { roomId: Number(roomId), startTime: slot.startTime },
      { endTime: slot.endTime },
    ]) {
      const { res } = await postJson(request, bookingPaths.studyRoomReservations, payload);
      expect(res.status()).toBe(400);
    }
  });

  test('hủy reservation không tồn tại trả 404', async ({ request }) => {
    const { res } = await patchJson(
      request,
      `${bookingPaths.studyRoomReservations}/999999999/cancel`,
    );
    expect(res.status()).toBe(404);
  });
});

import { test, expect } from '@playwright/test';
import { bookingSlot, bookingPaths, Reservation, reservationId } from '../../fixtures/booking';
import { firstRoomId, postJson, getJson, deleteJson, putJson } from '../../helpers/api';
import { pending } from '../../helpers/pending';

pending('Reservation API – tuần 3 (chờ API M2)', () => {
  test('đặt phòng thành công trả 201 và lưu đúng khung giờ', async ({ request }) => {
    const roomId = await firstRoomId(request);
    const slot = bookingSlot();
    const { res, body } = await postJson<Reservation>(request, bookingPaths.reservations, {
      roomId, ...slot, reservationType: 'STUDY_ROOM',
    });
    expect(res.status()).toBe(201);
    expect(String(body.roomId)).toBe(roomId);
    expect(body.date).toBe(slot.date);
    expect(body.startTime).toContain(slot.startTime);
    expect(body.endTime).toContain(slot.endTime);
  });

  test('từ chối đặt chồng lấn cùng phòng với 409', async ({ request }) => {
    const roomId = await firstRoomId(request);
    const slot = bookingSlot(4);
    const first = await postJson<Reservation>(request, bookingPaths.reservations, { roomId, ...slot });
    expect(first.res.status()).toBe(201);
    const overlap = await postJson(request, bookingPaths.reservations, {
      roomId, ...slot, startTime: '09:30', endTime: '10:30',
    });
    expect(overlap.res.status()).toBe(409);
  });

  test('cho phép các đặt phòng liền kề nhau không chồng lấn', async ({ request }) => {
    const roomId = await firstRoomId(request);
    const slot = bookingSlot(5);
    const first = await postJson(request, bookingPaths.reservations, { roomId, ...slot });
    expect(first.res.status()).toBe(201);
    const adjacent = await postJson(request, bookingPaths.reservations, {
      roomId, ...slot, startTime: slot.endTime, endTime: '11:00',
    });
    expect(adjacent.res.status()).toBe(201);
  });

  test('từ chối giờ kết thúc bằng hoặc trước giờ bắt đầu', async ({ request }) => {
    const roomId = await firstRoomId(request);
    const slot = bookingSlot(6);
    for (const [startTime, endTime] of [['10:00', '10:00'], ['11:00', '10:00']]) {
      const { res } = await postJson(request, bookingPaths.reservations, { roomId, ...slot, startTime, endTime });
      expect(res.status()).toBe(400);
    }
  });

  test('hủy reservation đã tạo thành công', async ({ request }) => {
    const roomId = await firstRoomId(request);
    const slot = bookingSlot(7);
    const created = await postJson<Reservation>(request, bookingPaths.reservations, { roomId, ...slot });
    expect(created.res.status()).toBe(201);
    const id = reservationId(created.body);
    const canceled = await deleteJson<Reservation>(request, `${bookingPaths.reservations}/${id}`);
    expect([200, 204]).toContain(canceled.res.status());
    const fetched = await getJson<Reservation>(request, `${bookingPaths.reservations}/${id}`);
    expect(fetched.res.status()).toBe(200);
    expect(fetched.body.status?.toUpperCase()).toMatch(/CANCEL/);
  });
});

pending('Reservation API – malformed requests', () => {
  test('từ chối ngày/giờ sai định dạng và thiếu trường bắt buộc', async ({ request }) => {
    const roomId = await firstRoomId(request);
    const slot = bookingSlot(8);
    for (const payload of [
      { roomId, ...slot, date: 'not-a-date' },
      { roomId, ...slot, startTime: '25:99' },
      { roomId, ...slot, endTime: undefined },
      { ...slot },
    ]) {
      const { res } = await postJson(request, bookingPaths.reservations, payload);
      expect(res.status()).toBe(400);
    }
  });

  test('hủy reservation không tồn tại trả 404', async ({ request }) => {
    const { res } = await deleteJson(request, `${bookingPaths.reservations}/999999999`);
    expect(res.status()).toBe(404);
  });
});

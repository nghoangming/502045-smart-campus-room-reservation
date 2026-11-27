import { expect, Page } from '@playwright/test';

type Role = 'ADMIN' | 'TEACHER' | 'STUDENT';
type Options = { seatReserved?: boolean; initialIncident?: boolean; initialNotification?: boolean; initialPendingBooking?: boolean; expiredPendingBooking?: boolean };

const start = new Date(Date.now() + 24 * 60 * 60_000).toISOString();
const end = new Date(new Date(start).getTime() + 60 * 60_000).toISOString();
const roomRows = [
  { id: 1, code: 'A101', name: 'Phòng thực hành', location: 'Tòa A', status: 'ACTIVE', type: 'LAB', capacity: 30 },
  { id: 2, code: 'B201', name: 'Phòng lý thuyết', location: 'Tòa B', status: 'ACTIVE', type: 'THEORY', capacity: 30 },
  { id: 3, code: 'C301', name: 'Phòng tự học', location: 'Tòa C', status: 'ACTIVE', type: 'SELF_STUDY', capacity: 6 },
];

export async function mockWorkspace(page: Page, role: Role, options: Options = {}) {
  const accountId = role === 'ADMIN' ? 1 : role === 'TEACHER' ? 2 : 3;
  const accountEmail = role === 'ADMIN' ? 'admin@smartcampus.test' : role === 'TEACHER' ? 'teacher@smartcampus.test' : 'student@smartcampus.test';
  const sessions = [{ id: 501, bookingId: 77, courseCode: 'IT004', title: 'Lập trình ứng dụng Web', roomId: 1, startTime: new Date(Date.now() - 8 * 60_000).toISOString(), endTime: new Date(Date.now() + 52 * 60_000).toISOString(), calendarStatus: 'SCHEDULED', teacherId: 2 }];
  let reservations: any[] = [{ id: 77, userId: 2, roomId: 1, roomCode: 'A101', startTime: sessions[0].startTime, endTime: sessions[0].endTime, status: 'CONFIRMED', createdAt: new Date().toISOString() }];
  if (options.initialPendingBooking) reservations.push({ id: 78, userId: 2, roomId: 1, roomCode: 'A101', startTime: options.expiredPendingBooking ? new Date(Date.now() - 10 * 60_000).toISOString() : start, endTime: options.expiredPendingBooking ? new Date(Date.now() + 50 * 60_000).toISOString() : end, status: 'PENDING', createdAt: new Date().toISOString() });
  let seats = [
    { id: 901, roomId: 1, seatNumber: 1, status: options.seatReserved ? 'RESERVED' : 'AVAILABLE' },
    { id: 902, roomId: 1, seatNumber: 2, status: 'AVAILABLE' },
  ];
  let seatChoices: any[] = options.seatReserved ? [{ id: 601, classSessionId: 501, sessionId: 501, seatId: 901, userId: accountId, roomId: 1, status: 'CONFIRMED' }] : [];
  let seatHolds: any[] = [];
  let resources: any[] = [{ id: 31, roomId: 2, name: 'Máy chiếu QA', type: 'EQUIPMENT', quantity: 1, status: 'AVAILABLE' }];
  let incidents: any[] = options.initialIncident ? [{ id: 41, roomId: 1, roomCode: 'A101', facultyCode: 'A', resourceId: null, reportedBy: 2, reporterName: 'Demo Teacher', category: 'PROJECTOR', description: 'Máy chiếu không lên hình khi bắt đầu buổi học.', status: 'OPEN', assignedTo: null, assignedTeam: null, createdAt: new Date().toISOString(), resolvedAt: null }] : [];
  let notifications: any[] = options.initialNotification ? [{ id: 11, title: 'Cập nhật lịch học', message: 'Lịch học mới đã được duyệt.', type: 'BOOKING', bookingId: 77, read: false, createdAt: new Date().toISOString(), targetTab: null }] : [];
  let nextReservationId = 100;
  let nextResourceId = 32;
  let nextIncidentId = 42;

  await page.route('**/api/v1/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api\/v1/, '');
    const method = request.method();
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (path.endsWith('/auth/login') && method === 'POST') {
      return json({ accessToken: 'e2e.header.signature', expiresAt: new Date(Date.now() + 3_600_000).toISOString(), id: accountId, name: `Demo ${role}`, email: accountEmail, roles: [role] });
    }
    if (path === '/rooms' && method === 'GET') return json(roomRows);
    if (path === '/classroom-reservations' && method === 'GET') return json(reservations.filter(item => item.roomId !== 3));
    if (path === '/study-room-reservations' && method === 'GET') return json(reservations.filter(item => item.roomId === 3));
    if (path === '/class-sessions' && method === 'GET') return json(sessions);
    if (path === '/incidents' && method === 'GET') return json(incidents);
    if (path === '/users' && method === 'GET') return json([
      { id: 1, code: 'admin', name: 'Campus Administrator', email: 'admin@smartcampus.test', faculty: 'IT', role: 'ADMIN', verified: true },
      { id: 2, code: 'teacher', name: 'Demo Teacher', email: 'teacher@smartcampus.test', faculty: 'IT', role: 'TEACHER', verified: true },
      { id: 3, code: 'student', name: 'Demo Student', email: 'student@smartcampus.test', faculty: 'IT', role: 'STUDENT', verified: true },
    ]);
    if (path === '/resources' && method === 'GET') return json(resources);
    if (path === '/notifications' && method === 'GET') return json(notifications);
    if (path === '/seat-reservations/mine' && method === 'GET') return json(seatChoices);
    if (path === '/seat-reservations/mine/holds' && method === 'GET') return json(seatHolds);
    if (path === '/attendance/mine' && method === 'GET') return json([]);
    if (path === '/attendance/mine/details' && method === 'GET') return json([]);
    if (path === '/absence-requests' && method === 'GET') return json([]);
    if (path === '/class-sessions/501/seats' && method === 'GET') return json(seats);
    if (path === '/users/2/public' && method === 'GET') return json({ id: 2, code: 'teacher', name: 'Demo Teacher', email: 'teacher@smartcampus.test', faculty: 'IT' });
    if (/^\/resources\/\d+$/.test(path) && method === 'GET') return json(resources.find(item => item.id === Number(path.split('/').at(-1))) ?? null, resources.some(item => item.id === Number(path.split('/').at(-1))) ? 200 : 404);
    if (/^\/class-sessions\/\d+$/.test(path) && method === 'GET') return json(sessions.find(item => item.id === Number(path.split('/').at(-1))) ?? null);
    if (/^\/class-sessions\/\d+\/seats$/.test(path) && method === 'GET') return json(seats);

    if (path === '/study-room-reservations' && method === 'POST') {
      const body = request.postDataJSON();
      const item = { id: nextReservationId++, userId: accountId, roomId: 3, roomCode: 'C301', startTime: body.startTime, endTime: body.endTime, status: 'CONFIRMED', createdAt: new Date().toISOString() };
      reservations.unshift(item);
      return json(item, 201);
    }
    const studyCancel = path.match(/^\/study-room-reservations\/(\d+)\/cancel$/);
    if (studyCancel && method === 'PATCH') {
      reservations = reservations.map(item => item.id === Number(studyCancel[1]) ? { ...item, status: 'CANCELLED' } : item);
      return json(reservations.find(item => item.id === Number(studyCancel[1])));
    }
    if (path === '/seat-reservations/hold' && method === 'POST') {
      const body = request.postDataJSON();
      const seat = seats.find(item => item.id === body.seatId);
      if (!seat || seat.status !== 'AVAILABLE') return json({ message: 'Seat is unavailable' }, 409);
      seat.status = 'PENDING';
      const hold = { id: nextReservationId++, classSessionId: body.classSessionId, seatId: seat.id, expiresAt: new Date(Date.now() + 120_000).toISOString() };
      seatHolds.push(hold);
      return json(hold, 201);
    }
    const seatConfirm = path.match(/^\/seat-reservations\/(\d+)\/confirm$/);
    if (seatConfirm && method === 'PATCH') {
      const hold = seatHolds.find(item => item.id === Number(seatConfirm[1]));
      if (!hold) return json({ message: 'Seat hold not found' }, 404);
      seatHolds = seatHolds.filter(item => item.id !== hold.id);
      seats = seats.map(item => item.id === hold.seatId ? { ...item, status: 'RESERVED' } : item);
      const choice = { ...hold, sessionId: hold.classSessionId, userId: accountId, roomId: 1, status: 'CONFIRMED' };
      seatChoices.push(choice);
      return json(choice);
    }
    if (path === '/seat-reservations' && method === 'POST') {
      const body = request.postDataJSON();
      const seat = seats.find(item => item.id === body.seatId);
      if (!seat || seat.status !== 'AVAILABLE') return json({ message: 'Seat is unavailable' }, 409);
      seat.status = 'RESERVED';
      const item = { id: nextReservationId++, classSessionId: body.classSessionId, sessionId: body.classSessionId, seatId: seat.id, userId: accountId, roomId: 1, status: 'CONFIRMED' };
      seatChoices.push(item);
      return json(item, 201);
    }
    const seatCancel = path.match(/^\/seat-reservations\/(\d+)\/cancel$/);
    if (seatCancel && method === 'PATCH') {
      const id = Number(seatCancel[1]);
      const reservation = [...seatChoices, ...seatHolds].find(item => item.id === id);
      if (!reservation) return json({ message: 'Seat reservation not found' }, 404);
      seatChoices = seatChoices.filter(item => item.id !== id);
      seatHolds = seatHolds.filter(item => item.id !== id);
      seats = seats.map(item => item.id === reservation.seatId ? { ...item, status: 'AVAILABLE' } : item);
      return json({ id: Number(seatCancel[1]), status: 'CANCELLED' });
    }
    if (path === '/attendance/check-in' && method === 'POST') {
      return json({ id: 701, classSessionId: Number(request.postDataJSON().classSessionId), userId: accountId, seatId: seatChoices[0]?.seatId ?? 901, seatNumber: 1, status: 'PRESENT', checkedInAt: new Date().toISOString(), studentName: 'Demo Student' }, 201);
    }
    if (path === '/class-sessions/501/qr' && method === 'POST') return json({ classSessionId: 501, token: 'E2E-QR-TOKEN', expiresAt: new Date(Date.now() + 120_000).toISOString() });
    if (path === '/classroom-reservations/with-session' && method === 'POST') {
      const body = request.postDataJSON();
      const id = nextReservationId++;
      const reservation = { id, userId: accountId, roomId: body.roomId, roomCode: body.roomId === 1 ? 'A101' : 'B201', startTime: body.startTime, endTime: body.endTime, status: 'PENDING', createdAt: new Date().toISOString() };
      const session = { id: id + 1000, bookingId: id, courseCode: body.courseCode, title: body.title, roomId: body.roomId, startTime: body.startTime, endTime: body.endTime, calendarStatus: body.makeup ? 'MAKEUP' : 'SCHEDULED', teacherId: accountId };
      reservations.unshift(reservation);
      sessions.push(session);
      return json({ reservation, session }, 201);
    }
    const bookingReview = path.match(/^\/(classroom|study-room)-reservations\/(\d+)\/(approve|reject)$/);
    if (bookingReview && method === 'PATCH') {
      const item = reservations.find(current => current.id === Number(bookingReview[2]));
      if (!item) return json({ message: 'Not found' }, 404);
      item.status = bookingReview[3] === 'approve' ? 'CONFIRMED' : 'REJECTED';
      return json(item);
    }
    if (path === '/incidents' && method === 'POST') {
      const body = request.postDataJSON();
      const item = { id: nextIncidentId++, roomId: body.roomId, roomCode: body.roomId === 1 ? 'A101' : 'B201', facultyCode: 'A', resourceId: body.resourceId, reportedBy: accountId, reporterName: 'Demo Teacher', category: body.category, description: body.description, status: 'OPEN', assignedTo: null, assignedTeam: null, createdAt: new Date().toISOString(), resolvedAt: null };
      incidents.unshift(item);
      return json(item, 201);
    }
    const incidentUpdate = path.match(/^\/incidents\/(\d+)$/);
    if (incidentUpdate && method === 'PATCH') {
      const item = incidents.find(current => current.id === Number(incidentUpdate[1]));
      if (!item) return json({ message: 'Not found' }, 404);
      Object.assign(item, request.postDataJSON());
      return json(item);
    }
    if (path === '/notifications/read-all' && method === 'PATCH') {
      const updatedCount = notifications.filter(item => !item.read).length;
      notifications = notifications.map(item => ({ ...item, read: true }));
      return json({ updatedCount });
    }
    const notificationRead = path.match(/^\/notifications\/(\d+)\/read$/);
    if (notificationRead && method === 'PATCH') {
      notifications = notifications.map(item => item.id === Number(notificationRead[1]) ? { ...item, read: true } : item);
      return json(notifications.find(item => item.id === Number(notificationRead[1])));
    }
    if (/^\/resources\/rooms\/\d+$/.test(path) && method === 'POST') {
      const item = { id: nextResourceId++, roomId: Number(path.split('/').at(-1)), ...request.postDataJSON() };
      resources.push(item);
      return json(item, 201);
    }
    const resourceUpdate = path.match(/^\/resources\/(\d+)$/);
    if (resourceUpdate && method === 'PATCH') {
      const item = resources.find(current => current.id === Number(resourceUpdate[1]));
      if (!item) return json({ message: 'Not found' }, 404);
      Object.assign(item, request.postDataJSON());
      return json(item);
    }
    if (resourceUpdate && method === 'DELETE') {
      resources = resources.filter(item => item.id !== Number(resourceUpdate[1]));
      return route.fulfill({ status: 204, body: '' });
    }
    return json([], 200);
  });
}

export async function loginWorkspace(page: Page, role: Role, options: Options = {}) {
  await mockWorkspace(page, role, options);
  await page.goto(role === 'ADMIN' ? '/admin/login' : '/login');
  if (role === 'TEACHER') await page.getByRole('group', { name: 'Chọn vai trò' }).getByRole('button', { name: 'Giảng viên' }).click();
  await page.getByLabel('Email').fill(role === 'ADMIN' ? 'admin@smartcampus.test' : role === 'TEACHER' ? 'teacher@smartcampus.test' : 'student@smartcampus.test');
  await page.getByPlaceholder('Nhập mật khẩu').fill('test-password');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL(new RegExp(`/${role.toLowerCase()}$`));
  await expect(page.getByRole('navigation', { name: 'Điều hướng theo vai trò' })).toBeVisible();
}

"""Isolated database only. Uses PGHOST/PGPORT/PGUSER/PGDATABASE and PSQL.
Creates committed fixtures with unique names; discard the test database afterwards.
"""
import json
import os
import subprocess
import uuid
from concurrent.futures import ThreadPoolExecutor

PSQL = os.environ.get('PSQL', 'psql')


def run(sql):
    return subprocess.run(
        [PSQL, '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose', '-c', sql],
        capture_output=True, text=True, encoding='utf-8', timeout=20,
    )


def checked(sql):
    result = run(sql)
    assert result.returncode == 0, result.stderr
    return result.stdout.strip()


def race(first, second):
    # The winning transaction remains open briefly so constraints see uncommitted rows.
    with ThreadPoolExecutor(max_workers=2) as pool:
        jobs = [pool.submit(run, f'BEGIN; {sql}; SELECT pg_sleep(0.5); COMMIT;')
                for sql in (first, second)]
        results = [job.result() for job in jobs]
    assert sum(r.returncode == 0 for r in results) == 1, [(r.stdout, r.stderr) for r in results]
    loser = next(r for r in results if r.returncode != 0)
    assert '23P01' in loser.stderr, loser.stderr


tag = 'race-' + uuid.uuid4().hex[:10]
data = json.loads(checked(f"""
WITH u AS (
 INSERT INTO users(user_code,full_name,email,password_hash,faculty_code)
 SELECT '{tag}-'||n,'Race', '{tag}-'||n||'@test.invalid','test','A'
 FROM generate_series(1,4) n RETURNING user_id,user_code
), ur AS (
 INSERT INTO user_roles SELECT user_id,role_id FROM u CROSS JOIN roles
 WHERE role_name=CASE WHEN user_code='{tag}-4' THEN 'STUDENT' ELSE 'TEACHER' END
), r AS (
 INSERT INTO rooms(room_code,name,status)
 SELECT 'A-{tag}-'||n,'Race room','ACTIVE' FROM generate_series(1,4) n
 RETURNING room_id,room_code
), s AS (
 INSERT INTO seats(room_id,seat_number,status) SELECT room_id,1,'AVAILABLE' FROM r
 RETURNING seat_id,room_id
)
SELECT json_build_object('users',(SELECT json_agg(user_id ORDER BY user_code) FROM u),
 'rooms',(SELECT json_agg(room_id ORDER BY room_code) FROM r),
 'seats',(SELECT json_agg(seat_id ORDER BY room_id) FROM s));
"""))
t, t2, t3, student = data['users']
r1, r2, r3, r4 = data['rooms']
seat1, seat2, _, _ = data['seats']
# Fixed future intervals make separate client transactions use identical boundaries.
interval = "'2090-01-01 08:00+07','2090-01-01 10:00+07'"
race(
    f"INSERT INTO bookings(user_id,room_id,start_time,end_time) VALUES({t},{r3},{interval})",
    f"INSERT INTO bookings(user_id,room_id,start_time,end_time) VALUES({t},{r4},{interval})",
)
sessions = []
for teacher, room in ((t2, r1), (t3, r2)):
    sessions.append(int(checked(f"""
    WITH b AS (INSERT INTO bookings(user_id,room_id,start_time,end_time,status)
    VALUES({teacher},{room},{interval},'CONFIRMED') RETURNING *)
    INSERT INTO class_sessions(booking_id,course_code,title,room_id,start_time,end_time)
    SELECT booking_id,'RACE','Race',room_id,start_time,end_time FROM b RETURNING class_session_id;
    """)))
c1, c2 = sessions
race(f'SELECT hold_class_seat({c1},{seat1},{student})',
     f'SELECT hold_class_seat({c2},{seat2},{student})')
count = checked(f"SELECT count(*) FROM seat_reservations WHERE user_id={student} AND status='PENDING'")
assert count == '1', count
# Race a cancellation against confirmation of the winning hold.
reservation, session = json.loads(checked(f"""SELECT json_build_array(seat_reservation_id,class_session_id)
 FROM seat_reservations WHERE user_id={student} AND status='PENDING'"""))
owner = t2 if session == c1 else t3
booking = checked(f'SELECT booking_id FROM class_sessions WHERE class_session_id={session}')
with ThreadPoolExecutor(max_workers=2) as pool:
    cancel = pool.submit(run, f'SELECT cancel_booking({booking},{owner})')
    confirm = pool.submit(run, f'SELECT confirm_class_seat({reservation},{student})')
    cancelled, confirmed = cancel.result(), confirm.result()
assert cancelled.returncode == 0, cancelled.stderr
if confirmed.returncode != 0:
    assert '23514' in confirmed.stderr, confirmed.stderr
assert checked(f"SELECT status FROM seat_reservations WHERE seat_reservation_id={reservation}") == 'CANCELLED'
print('PASS: concurrent teacher booking, cross-session student holds, cancellation versus confirmation')

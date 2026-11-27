#!/usr/bin/env bash
set -euo pipefail

: "${DB_URL:?DB_URL is required}"
: "${DB_USER:?DB_USER is required}"
: "${DB_PASSWORD:?DB_PASSWORD is required}"
: "${TEST_ADMIN_EMAIL:?TEST_ADMIN_EMAIL is required}"
: "${TEST_TEACHER_EMAIL:?TEST_TEACHER_EMAIL is required}"
: "${TEST_STUDENT_EMAIL:?TEST_STUDENT_EMAIL is required}"
: "${TEST_STUDENT2_EMAIL:?TEST_STUDENT2_EMAIL is required}"

connection=${DB_URL#jdbc:postgresql://}
authority=${connection%%/*}
database=${connection#*/}
database=${database%%\?*}
PGHOST=${authority%%:*}
PGPORT=${authority#*:}
if [[ "$PGPORT" == "$authority" ]]; then PGPORT=5432; fi
export PGHOST PGPORT PGDATABASE="$database" PGUSER="$DB_USER" PGPASSWORD="$DB_PASSWORD" PGCONNECT_TIMEOUT=10

tests_dir=$(cd "$(dirname "$0")/.." && pwd)
fixture_line=$(psql -X -w -q -A -t -F '|' -v ON_ERROR_STOP=1 \
  -v "teacher_email=$TEST_TEACHER_EMAIL" \
  -v "admin_email=$TEST_ADMIN_EMAIL" \
  -v "student_email=$TEST_STUDENT_EMAIL" \
  -v "student2_email=$TEST_STUDENT2_EMAIL" \
  -f "$tests_dir/fixtures/attendance-fixtures.sql")

IFS='|' read -r qr_session valid_code expired_code wrong_session workflow_session finalize_session ended_session ended_seat ended_reservation <<< "$fixture_line"
for value in "$qr_session" "$valid_code" "$expired_code" "$wrong_session" "$workflow_session" "$finalize_session" "$ended_session" "$ended_seat" "$ended_reservation"; do
  [[ -n "$value" ]] || { echo 'Fixture script returned incomplete values.' >&2; exit 1; }
done

if [[ -n "${GITHUB_ENV:-}" ]]; then
  {
    echo "TEST_QR_CLASS_SESSION_ID=$qr_session"
    echo "TEST_QR_VALID_CODE=$valid_code"
    echo "TEST_QR_EXPIRED_CODE=$expired_code"
    echo "TEST_QR_WRONG_CLASS_SESSION_ID=$wrong_session"
    echo "TEST_QR_WORKFLOW_SESSION_ID=$workflow_session"
    echo "TEST_FINALIZE_CLASS_SESSION_ID=$finalize_session"
    echo "TEST_ENDED_CLASS_SESSION_ID=$ended_session"
    echo "TEST_ENDED_SEAT_ID=$ended_seat"
    echo "TEST_ENDED_SEAT_RESERVATION_ID=$ended_reservation"
  } >> "$GITHUB_ENV"
fi

echo 'Provisioned current-window QR and ended-session data fixtures.'

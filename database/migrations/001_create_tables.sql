CREATE TABLE roles (
    role_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_name VARCHAR(30) NOT NULL UNIQUE
);

CREATE TABLE permissions (
    permission_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    permission_name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLEIF user_roles (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,

    PRIMARY KEY (user_id, role_id),

    CONSTRAINT fk_user_roles_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id),

    CONSTRAINT fk_user_roles_role
        FOREIGN KEY (role_id)
        REFERENCES roles(role_id)
);

CREATE TABLE role_permissions (
    role_id BIGINT NOT NULL,
    permission_id BIGINT NOT NULL,

    PRIMARY KEY (role_id, permission_id),

    CONSTRAINT fk_role_permissions_role
        FOREIGN KEY (role_id)
        REFERENCES roles(role_id),

    CONSTRAINT fk_role_permissions_permission
        FOREIGN KEY (permission_id)
        REFERENCES permissions(permission_id)
);
Insert Into roles (role_name) VALUES
('Admin'),
('Teacher'),
('Student');
Insert Into permissions (permission_name) VALUES
('VIEW_ROOMS'),
('MANAGE_ROOMS'),
('MANAGE_RESOURCES'),
('APPROVE_BOOKING'),
('VIEW_ISSUES'),
('MANAGE_USERS'),
('VIEW_OWN_SCHEDULE'),
('CREATE_BOOKING'),
('VIEW_ATTENDANCE'),
('SELECT_SEAT'),
('CHECK_IN_QR'),
('REPORT_ISSUE');
/*
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'roles';

SELECT
    tc.table_name AS table_from, 
    kcu.column_name AS column_from, 
    ccu.table_name AS table_to,
    ccu.column_name AS column_to
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema='public';
*/


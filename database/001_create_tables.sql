CREATE TABLE IF NOT EXISTS
CREATE TABLE roles (
    role_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_name VARCHAR(30) NOT NULL UNIQUE
);

CREATE TABLE permissions (
    permission_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    permission_name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE user_roles (
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


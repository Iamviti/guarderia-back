-- Creación de la base de datos
CREATE DATABASE IF NOT EXISTS guarderia;
USE guarderia;

-- Tabla para los roles de usuario
-- Los roles son datos estáticos, por lo que no requieren campos de auditoría de usuario.
CREATE TABLE IF NOT EXISTS Rol (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre ENUM('PARENTS', 'TEACHER', 'SUPERTEACHER', 'ADMIN') NOT NULL UNIQUE
);

-- Tabla para la información de la guardería (School)
-- Solo se mantiene el campo 'active' para borrado lógico.
CREATE TABLE IF NOT EXISTS School (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255) UNIQUE,
    cif VARCHAR(20) UNIQUE,
    register_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT TRUE -- Solo se mantiene este campo para borrado lógico
);

-- Tabla de Usuarios (User)
-- Implementación completa del borrado lógico y campos de auditoría.
CREATE TABLE IF NOT EXISTS User (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    rol_id INT NOT NULL,
    school_id INT NOT NULL,

    -- Campos de auditoría y borrado lógico
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT NULL, -- Quién creó este usuario (e.g., otro admin)
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT NULL, -- Quién fue el último en actualizar este usuario
    deleted_at TIMESTAMP NULL,   -- Fecha y hora del borrado lógico
    deleted_by INT NULL, -- Quién marcó este usuario como borrado lógico

    FOREIGN KEY (rol_id) REFERENCES Rol(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (school_id) REFERENCES School(id) ON DELETE RESTRICT ON UPDATE CASCADE
    -- Las FK a User para created_by/updated_by/deleted_by se añadirán al final para evitar recursividad
);

-- Tabla de Niños (Children)
-- Implementación completa del borrado lógico y campos de auditoría.
CREATE TABLE IF NOT EXISTS Children (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    birthDate DATE NOT NULL,
    school_id INT NOT NULL,

    -- Campos de auditoría y borrado lógico
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT NULL, -- Quién creó este registro de niño (e.g., padre, teacher, admin)
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT NULL, -- Quién fue el último en actualizar este niño
    deleted_at TIMESTAMP NULL,
    deleted_by INT NULL, -- Quién marcó este niño como borrado lógico

    FOREIGN KEY (school_id) REFERENCES School(id) ON DELETE RESTRICT ON UPDATE CASCADE
    -- Las FK a User se añadirán al final
);

-- Tabla intermedia para la relación N:M entre Padres y Niños (ParentsChildren)
-- Esta tabla no requiere campos de auditoría de usuario ni borrado lógico en sí,
-- ya que su existencia depende de la relación entre Parent (User) y Children.
-- Si un Parent o Child es borrado lógicamente, esta relación se consideraría inactiva.
CREATE TABLE IF NOT EXISTS ParentsChildren (
    parent_id INT NOT NULL,
    child_id INT NOT NULL,
    PRIMARY KEY (parent_id, child_id),

    FOREIGN KEY (parent_id) REFERENCES User(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (child_id) REFERENCES Children(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Tabla de Registros Diarios (Records)
-- Implementación completa del borrado lógico y campos de auditoría.
CREATE TABLE IF NOT EXISTS Records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    food INT,
    sleep INT,
    sleepFrom TIME,
    sleepTo TIME,
    mood INT,
    diaper INT,
    notes TEXT,
    child_id INT NOT NULL,

    -- Campos de auditoría y borrado lógico
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT NULL, -- Quién creó/registró este dato (Teacher o Admin)
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT NULL, -- Quién fue el último en actualizar este registro
    deleted_at TIMESTAMP NULL,
    deleted_by INT NULL, -- Quién marcó este registro como borrado lógico

    FOREIGN KEY (child_id) REFERENCES Children(id) ON DELETE CASCADE ON UPDATE CASCADE
    -- Las FK a User se añadirán al final
);

-- Inserción de datos iniciales para los roles
INSERT INTO Rol (nombre) VALUES ('PARENTS'), ('TEACHER'), ('SUPERTEACHER'), ('ADMIN');

-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
-- Añadir las claves foráneas de usuario después de crear la tabla User
-- Esto es necesario para evitar problemas de referencia circular
-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --

ALTER TABLE User
ADD CONSTRAINT fk_user_created FOREIGN KEY (created_by) REFERENCES User(id) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT fk_user_updated FOREIGN KEY (updated_by) REFERENCES User(id) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT fk_user_deleted FOREIGN KEY (deleted_by) REFERENCES User(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE Children
ADD CONSTRAINT fk_children_created FOREIGN KEY (created_by) REFERENCES User(id) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT fk_children_updated FOREIGN KEY (updated_by) REFERENCES User(id) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT fk_children_deleted FOREIGN KEY (deleted_by) REFERENCES User(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE Records
ADD CONSTRAINT fk_records_created FOREIGN KEY (created_by) REFERENCES User(id) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT fk_records_updated FOREIGN KEY (updated_by) REFERENCES User(id) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT fk_records_deleted FOREIGN KEY (deleted_by) REFERENCES User(id) ON DELETE SET NULL ON UPDATE CASCADE;
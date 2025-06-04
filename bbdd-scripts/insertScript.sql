-- Insertamos una guardería
INSERT INTO School (name, address, phone, email, cif)
VALUES ('Guardería Estrellitas', 'Calle Luna, 123', '666777888', 'info@estrellitas.com', 'B12345678');

-- Supongamos que la guardería tiene ID = 1

-- Insertamos usuarios: ADMIN, SUPERTEACHER, TEACHERS
INSERT INTO User (name, email, password, rol_id, school_id)
VALUES 
('Admin One', 'admin@guarderia.com', '1111', 4, 1),
('SuperTeacher', 'superteacher@guarderia.com', '1111', 3, 1),
('Teacher One', 'teacher1@guarderia.com', '1111', 2, 1),
('Teacher Two', 'teacher2@guarderia.com', '1111', 2, 1),
('Teacher Three', 'teacher3@guarderia.com', '1111', 2, 1);

-- Insertamos padres
INSERT INTO User (name, email, password, rol_id, school_id)
VALUES 
('Parent One', 'parent1@correo.com', '1111', 1, 1),
('Parent Two', 'parent2@correo.com', '1111', 1, 1),
('Parent Three', 'parent3@correo.com', '1111', 1, 1),
('Parent Four', 'parent4@correo.com', '1111', 1, 1);

-- Supongamos IDs para padres son del 6 al 9

-- Insertamos niños
INSERT INTO Children (name, birthDate, school_id)
VALUES 
('Niño Uno', '2021-05-15', 1),
('Niño Dos', '2020-09-03', 1),
('Niña Tres', '2022-01-10', 1),
('Niño Cuatro', '2021-07-21', 1),
('Niña Cinco', '2019-11-30', 1);

-- Supongamos que los IDs de los niños son del 1 al 5

-- Asignamos padres a niños
INSERT INTO ParentsChildren (parent_id, child_id)
VALUES 
(1, 1),
(1, 2),
(2, 3),
(3, 4),
(3, 5);

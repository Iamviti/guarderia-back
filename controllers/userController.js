// controllers/userController.js
const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// @desc    Crear un nuevo usuario
// @route   POST /api/users
// @access  Private (ADMIN, SUPERTEACHER)
exports.createUser = async (req, res) => {
    const { name, email, password, rol_id, school_id } = req.body;
    const created_by = req.user.id; // ID del usuario autenticado que realiza la creación

    try {
        // Verificar que el rol_id existe
        const [rolRows] = await pool.execute('SELECT id, nombre FROM Rol WHERE id = ?', [rol_id]);
        if (rolRows.length === 0) {
            return res.status(400).json({ message: 'ID de rol inválido.' });
        }
        const role_name = rolRows[0].nombre;

        // Si es SUPERTEACHER o ADMIN, pueden crear cualquier rol
        // Si es TEACHER, no debería crear SUPERTEACHER o ADMIN
        if (req.user.role_name === 'TEACHER' && (role_name === 'ADMIN' || role_name === 'SUPERTEACHER')) {
            return res.status(403).json({ message: 'Un TEACHER no puede crear usuarios de rol ADMIN o SUPERTEACHER.' });
        }

        // Si el usuario autenticado tiene school_id, solo puede crear usuarios para su misma escuela
        if (req.user.school_id && req.user.school_id !== school_id) {
            return res.status(403).json({ message: 'No puedes crear usuarios para otra escuela.' });
        }

        // Hashear contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const [result] = await pool.execute(
            `INSERT INTO User (name, email, password, rol_id, school_id, created_by) VALUES (?, ?, ?, ?, ?, ?)`,
            [name, email, hashedPassword, rol_id, school_id, created_by]
        );
        res.status(201).json({ message: 'Usuario creado exitosamente.', userId: result.insertId });
    } catch (error) {
        console.error('Error al crear usuario:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'El email ya está registrado.' });
        }
        res.status(500).json({ message: 'Error del servidor.' });
    }
};

// @desc    Obtener todos los usuarios activos
// @route   GET /api/users
// @access  Private (ADMIN, SUPERTEACHER)
exports.getAllUsers = async (req, res) => {
    try {
        let query = `SELECT u.id, u.name, u.email, r.nombre AS rol_name, s.name AS school_name, u.created_at, uc.name AS created_by_name, u.updated_at, uu.name AS updated_by_name
                     FROM User u
                     JOIN Rol r ON u.rol_id = r.id
                     JOIN School s ON u.school_id = s.id
                     LEFT JOIN User uc ON u.created_by = uc.id
                     LEFT JOIN User uu ON u.updated_by = uu.id
                     WHERE u.active = TRUE`;

        const queryParams = [];

        // Filtra por escuela si el usuario no es ADMIN
        if (req.user.role_name !== 'ADMIN' && req.user.school_id) {
            query += ` AND u.school_id = ?`;
            queryParams.push(req.user.school_id);
        }

        const [rows] = await pool.execute(query, queryParams);
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ message: 'Error del servidor.' });
    }
};

// @desc    Obtener un usuario por ID (Incluye auditoría)
// @route   GET /api/users/:id
// @access  Private (User puede obtener su propio perfil; ADMIN/SUPERTEACHER cualquier perfil)
exports.getUserById = async (req, res) => {
    const { id } = req.params;
    const requestingUser = req.user;

    // Un usuario solo puede ver su propio perfil a menos que sea ADMIN o SUPERTEACHER
    if (requestingUser.id !== parseInt(id) && requestingUser.role_name !== 'ADMIN' && requestingUser.role_name !== 'SUPERTEACHER') {
        return res.status(403).json({ message: 'No tienes permiso para ver este perfil.' });
    }

    try {
        let query = `SELECT u.id, u.name, u.email, r.nombre AS rol_name, s.name AS school_name, u.created_at, uc.name AS created_by_name, u.updated_at, uu.name AS updated_by_name, u.deleted_at, ud.name AS deleted_by_name
                     FROM User u
                     JOIN Rol r ON u.rol_id = r.id
                     JOIN School s ON u.school_id = s.id
                     LEFT JOIN User uc ON u.created_by = uc.id
                     LEFT JOIN User uu ON u.updated_by = uu.id
                     LEFT JOIN User ud ON u.deleted_by = ud.id
                     WHERE u.id = ? AND u.active = TRUE`;

        const [rows] = await pool.execute(query, [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado o inactivo.' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Error al obtener usuario por ID:', error);
        res.status(500).json({ message: 'Error del servidor.' });
    }
};

// @desc    Obtener perfil del usuario autenticado
// @route   GET /api/users/me
// @access  Private (Any authenticated user)
exports.getMe = async (req, res) => {
    const userId = req.user.id;
    try {
        const [rows] = await pool.execute(
            `SELECT u.id, u.name, u.email, r.nombre AS rol_name, s.name AS school_name
             FROM User u
             JOIN Rol r ON u.rol_id = r.id
             JOIN School s ON u.school_id = s.id
             WHERE u.id = ? AND u.active = TRUE`,
            [userId]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Perfil de usuario no encontrado o inactivo.' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Error al obtener mi perfil:', error);
        res.status(500).json({ message: 'Error del servidor.' });
    }
};


// @desc    Actualizar detalles de un usuario
// @route   PUT /api/users/:id
// @access  Private (ADMIN/SUPERTEACHER pueden actualizar cualquiera; los demás solo el suyo)
exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const { name, email, password, rol_id, school_id } = req.body;
    const updated_by = req.user.id; // ID del usuario que realiza la actualización
    const requestingUserRole = req.user.role_name;

    // Regla de autorización:
    // ADMIN/SUPERTEACHER puede actualizar cualquier perfil.
    // Otros roles (TEACHER, PARENTS) solo pueden actualizar su propio perfil.
    if (requestingUserRole !== 'ADMIN' && requestingUserRole !== 'SUPERTEACHER' && req.user.id !== parseInt(id)) {
        return res.status(403).json({ message: 'No tienes permiso para actualizar este usuario.' });
    }

    try {
        let updateFields = [];
        let queryParams = [];

        if (name) {
            updateFields.push('name = ?');
            queryParams.push(name);
        }
        if (email) {
            updateFields.push('email = ?');
            queryParams.push(email);
        }
        if (password) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            updateFields.push('password = ?');
            queryParams.push(hashedPassword);
        }

        // Solo ADMIN y SUPERTEACHER pueden cambiar rol_id o school_id
        if (requestingUserRole === 'ADMIN' || requestingUserRole === 'SUPERTEACHER') {
            if (rol_id) {
                 const [rolRows] = await pool.execute('SELECT id FROM Rol WHERE id = ?', [rol_id]);
                if (rolRows.length === 0) {
                    return res.status(400).json({ message: 'ID de rol inválido.' });
                }
                updateFields.push('rol_id = ?');
                queryParams.push(rol_id);
            }
            if (school_id) {
                // Verificar que la escuela existe
                const [schoolRows] = await pool.execute('SELECT id FROM School WHERE id = ? AND active = TRUE', [school_id]);
                if (schoolRows.length === 0) {
                    return res.status(400).json({ message: 'ID de escuela inválido o inactivo.' });
                }
                updateFields.push('school_id = ?');
                queryParams.push(school_id);
            }
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ message: 'No hay campos para actualizar.' });
        }

        updateFields.push('updated_by = ?');
        queryParams.push(updated_by);
        queryParams.push(id);

        const query = `UPDATE User SET ${updateFields.join(', ')} WHERE id = ? AND active = TRUE`;
        const [result] = await pool.execute(query, queryParams);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado o inactivo.' });
        }
        res.json({ message: 'Usuario actualizado exitosamente.' });
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'El email ya está registrado.' });
        }
        res.status(500).json({ message: 'Error del servidor.' });
    }
};


// @desc    Borrado lógico de un usuario
// @route   DELETE /api/users/:id
// @access  Private (ADMIN, SUPERTEACHER)
exports.softDeleteUser = async (req, res) => {
    const { id } = req.params;
    const deleted_by = req.user.id; // ID del usuario que realiza el borrado

    // Un usuario no puede borrarse a sí mismo (para evitar problemas de sesión si es el único ADMIN/SUPERTEACHER)
    if (req.user.id === parseInt(id)) {
        return res.status(400).json({ message: 'No puedes borrar tu propio perfil.' });
    }

    try {
        const [result] = await pool.execute(
            `UPDATE User SET active = FALSE, deleted_at = CURRENT_TIMESTAMP, deleted_by = ? WHERE id = ? AND active = TRUE`,
            [deleted_by, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado o ya inactivo.' });
        }
        res.json({ message: 'Usuario borrado lógicamente exitosamente.' });
    } catch (error) {
        console.error('Error al borrar lógicamente usuario:', error);
        res.status(500).json({ message: 'Error del servidor.' });
    }
};
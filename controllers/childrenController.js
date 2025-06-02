// controllers/childrenController.js
const pool = require('../config/db');

// @desc    Crear un nuevo niño
// @route   POST /api/children
// @access  Private (SUPERTEACHER, TEACHER)
exports.createChild = async (req, res) => {
    const { name, birthDate, school_id } = req.body;
    const created_by = req.user.id; // Usuario que crea el registro

    // Asegurarse de que el usuario autenticado tiene permiso para crear en esta escuela
    if (req.user.role_name !== 'ADMIN' && req.user.school_id !== school_id) {
        return res.status(403).json({ message: 'No tienes permiso para crear niños en esta escuela.' });
    }

    try {
        const [result] = await pool.execute(
            `INSERT INTO Children (name, birthDate, school_id, created_by) VALUES (?, ?, ?, ?)`,
            [name, birthDate, school_id, created_by]
        );
        res.status(201).json({ message: 'Niño creado exitosamente.', childId: result.insertId });
    } catch (error) {
        console.error('Error al crear niño:', error);
        res.status(500).json({ message: 'Error del servidor.' });
    }
};

// @desc    Obtener todos los niños activos
// @route   GET /api/children
// @access  Private (SUPERTEACHER, TEACHER, PARENTS - filtrado)
exports.getAllChildren = async (req, res) => {
    const requestingUser = req.user;
    let query = `SELECT c.id, c.name, c.birthDate, s.name AS school_name, c.created_at, uc.name AS created_by_name, c.updated_at, uu.name AS updated_by_name
                 FROM Children c
                 JOIN School s ON c.school_id = s.id
                 LEFT JOIN User uc ON c.created_by = uc.id
                 LEFT JOIN User uu ON c.updated_by = uu.id
                 WHERE c.active = TRUE`;
    const queryParams = [];

    // Lógica de filtrado por rol
    if (requestingUser.role_name === 'PARENTS') {
        // Padres solo ven a sus propios hijos
        query += ` AND c.id IN (SELECT child_id FROM ParentsChildren WHERE parent_id = ?)`;
        queryParams.push(requestingUser.id);
    } else if (requestingUser.role_name === 'TEACHER' || requestingUser.role_name === 'SUPERTEACHER') {
        // Teachers y SuperTeachers solo ven niños de su propia escuela (si aplica)
        if (requestingUser.school_id) {
            query += ` AND c.school_id = ?`;
            queryParams.push(requestingUser.school_id);
        }
    }
    // ADMIN ve todos los niños

    try {
        const [rows] = await pool.execute(query, queryParams);
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener niños:', error);
        res.status(500).json({ message: 'Error del servidor.' });
    }
};

// @desc    Obtener un niño por ID (Incluye auditoría)
// @route   GET /api/children/:id
// @access  Private (SUPERTEACHER, TEACHER, PARENTS - si es su hijo)
exports.getChildById = async (req, res) => {
    const { id } = req.params;
    const requestingUser = req.user;

    try {
        let query = `SELECT c.id, c.name, c.birthDate, s.name AS school_name, c.created_at, uc.name AS created_by_name, c.updated_at, uu.name AS updated_by_name, c.deleted_at, ud.name AS deleted_by_name
                     FROM Children c
                     JOIN School s ON c.school_id = s.id
                     LEFT JOIN User uc ON c.created_by = uc.id
                     LEFT JOIN User uu ON c.updated_by = uu.id
                     LEFT JOIN User ud ON c.deleted_by = ud.id
                     WHERE c.id = ? AND c.active = TRUE`;
        const queryParams = [id];

        const [rows] = await pool.execute(query, queryParams);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Niño no encontrado o inactivo.' });
        }

        const child = rows[0];

        // Reglas de acceso
        if (requestingUser.role_name === 'PARENTS') {
            const [parentChildRows] = await pool.execute(
                `SELECT * FROM ParentsChildren WHERE parent_id = ? AND child_id = ?`,
                [requestingUser.id, child.id]
            );
            if (parentChildRows.length === 0) {
                return res.status(403).json({ message: 'No tienes permiso para ver este niño.' });
            }
        } else if ((requestingUser.role_name === 'TEACHER' || requestingUser.role_name === 'SUPERTEACHER') && requestingUser.school_id !== child.school_id) {
            return res.status(403).json({ message: 'No tienes permiso para ver niños de otra escuela.' });
        }
        // ADMIN tiene acceso total

        res.json(child);
    } catch (error) {
        console.error('Error al obtener niño por ID:', error);
        res.status(500).json({ message: 'Error del servidor.' });
    }
};

// @desc    Actualizar detalles de un niño
// @route   PUT /api/children/:id
// @access  Private (SUPERTEACHER, TEACHER)
exports.updateChild = async (req, res) => {
    const { id } = req.params;
    const { name, birthDate } = req.body; // school_id no debería ser actualizable aquí
    const updated_by = req.user.id;

    try {
        // Verificar si el usuario tiene permiso para actualizar este niño
        const [childRows] = await pool.execute(`SELECT school_id FROM Children WHERE id = ? AND active = TRUE`, [id]);
        if (childRows.length === 0) {
            return res.status(404).json({ message: 'Niño no encontrado o inactivo.' });
        }
        const childSchoolId = childRows[0].school_id;

        if (req.user.role_name === 'TEACHER' && req.user.school_id !== childSchoolId) {
            return res.status(403).json({ message: 'No tienes permiso para actualizar niños de otra escuela.' });
        }
        // ADMIN y SUPERTEACHER tienen acceso total

        const [result] = await pool.execute(
            `UPDATE Children SET name = ?, birthDate = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ? AND active = TRUE`,
            [name, birthDate, updated_by, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Niño no encontrado o inactivo.' });
        }
        res.json({ message: 'Niño actualizado exitosamente.' });
    } catch (error) {
        console.error('Error al actualizar niño:', error);
        res.status(500).json({ message: 'Error del servidor.' });
    }
};

// @desc    Borrado lógico de un niño
// @route   DELETE /api/children/:id
// @access  Private (SUPERTEACHER, TEACHER)
exports.softDeleteChild = async (req, res) => {
    const { id } = req.params;
    const deleted_by = req.user.id;

    try {
        // Verificar si el usuario tiene permiso para borrar este niño
        const [childRows] = await pool.execute(`SELECT school_id FROM Children WHERE id = ? AND active = TRUE`, [id]);
        if (childRows.length === 0) {
            return res.status(404).json({ message: 'Niño no encontrado o ya inactivo.' });
        }
        const childSchoolId = childRows[0].school_id;

        if (req.user.role_name === 'TEACHER' && req.user.school_id !== childSchoolId) {
            return res.status(403).json({ message: 'No tienes permiso para borrar niños de otra escuela.' });
        }
        // ADMIN y SUPERTEACHER tienen acceso total

        const [result] = await pool.execute(
            `UPDATE Children SET active = FALSE, deleted_at = CURRENT_TIMESTAMP, deleted_by = ? WHERE id = ? AND active = TRUE`,
            [deleted_by, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Niño no encontrado o ya inactivo.' });
        }
        res.json({ message: 'Niño borrado lógicamente exitosamente.' });
    } catch (error) {
        console.error('Error al borrar lógicamente niño:', error);
        res.status(500).json({ message: 'Error del servidor.' });
    }
};

// @desc    Asociar un padre a un niño
// @route   POST /api/children/:childId/parents/:parentId
// @access  Private (SUPERTEACHER, TEACHER)
exports.assignParentToChild = async (req, res) => {
    const { childId, parentId } = req.params;
    const requestingUser = req.user;

    try {
        // Verificar que el niño existe y está activo
        const [childRows] = await pool.execute(`SELECT id, school_id FROM Children WHERE id = ? AND active = TRUE`, [childId]);
        if (childRows.length === 0) {
            return res.status(404).json({ message: 'Niño no encontrado o inactivo.' });
        }
        const childSchoolId = childRows[0].school_id;

        // Verificar que el padre existe, está activo y tiene rol 'PARENTS'
        const [parentRows] = await pool.execute(
            `SELECT u.id, u.school_id, r.nombre AS role_name FROM User u JOIN Rol r ON u.rol_id = r.id WHERE u.id = ? AND u.active = TRUE AND r.nombre = 'PARENTS'`,
            [parentId]
        );
        if (parentRows.length === 0) {
            return res.status(404).json({ message: 'Padre no encontrado, inactivo o no es un rol de PARENTS.' });
        }
        const parentSchoolId = parentRows[0].school_id;

        // Reglas de autorización:
        // SUPERTEACHER puede asignar en su escuela. ADMIN en cualquier escuela.
        // TEACHER solo puede asignar si ambos, el niño y el padre, pertenecen a su misma escuela.
        if (requestingUser.role_name === 'TEACHER' && (requestingUser.school_id !== childSchoolId || requestingUser.school_id !== parentSchoolId)) {
            return res.status(403).json({ message: 'Un TEACHER solo puede asignar padres y niños de su misma escuela.' });
        }
        if (requestingUser.role_name === 'SUPERTEACHER' && requestingUser.school_id !== childSchoolId) {
             return res.status(403).json({ message: 'Un SUPERTEACHER solo puede asignar padres y niños de su misma escuela.' });
        }
         if (childSchoolId !== parentSchoolId) {
            return res.status(400).json({ message: 'El niño y el padre deben pertenecer a la misma escuela para ser asociados.' });
        }


        // Insertar en ParentsChildren
        const [result] = await pool.execute(
            `INSERT INTO ParentsChildren (parent_id, child_id) VALUES (?, ?)`,
            [parentId, childId]
        );
        res.status(201).json({ message: 'Padre asociado al niño exitosamente.' });
    } catch (error) {
        console.error('Error al asignar padre a niño:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Esta asociación ya existe.' });
        }
        res.status(500).json({ message: 'Error del servidor.' });
    }
};

// @desc    Desasociar un padre de un niño
// @route   DELETE /api/children/:childId/parents/:parentId
// @access  Private (SUPERTEACHER, TEACHER)
exports.unassignParentFromChild = async (req, res) => {
    const { childId, parentId } = req.params;
    const requestingUser = req.user;

    try {
         // Verificar que el niño existe y está activo
        const [childRows] = await pool.execute(`SELECT id, school_id FROM Children WHERE id = ? AND active = TRUE`, [childId]);
        if (childRows.length === 0) {
            return res.status(404).json({ message: 'Niño no encontrado o inactivo.' });
        }
        const childSchoolId = childRows[0].school_id;

        // Reglas de autorización similares a assignParentToChild
        if (requestingUser.role_name === 'TEACHER' && requestingUser.school_id !== childSchoolId) {
            return res.status(403).json({ message: 'No tienes permiso para desasociar padres de niños en esta escuela.' });
        }
         if (requestingUser.role_name === 'SUPERTEACHER' && requestingUser.school_id !== childSchoolId) {
             return res.status(403).json({ message: 'Un SUPERTEACHER solo puede desasociar padres y niños de su misma escuela.' });
        }


        const [result] = await pool.execute(
            `DELETE FROM ParentsChildren WHERE parent_id = ? AND child_id = ?`,
            [parentId, childId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Asociación no encontrada.' });
        }
        res.json({ message: 'Padre desasociado del niño exitosamente.' });
    } catch (error) {
        console.error('Error al desasociar padre de niño:', error);
        res.status(500).json({ message: 'Error del servidor.' });
    }
};
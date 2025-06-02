// controllers/recordsController.js
const pool = require('../config/db');

// @desc    Crear un nuevo registro diario para un niño
// @route   POST /api/records
// @access  Private (SUPERTEACHER, TEACHER)
exports.createRecord = async (req, res) => {
    const { date, food, sleep, sleepFrom, sleepTo, mood, diaper, notes, child_id } = req.body;
    const created_by = req.user.id;

    try {
        // Verificar que el niño existe y está activo
        const [childRows] = await pool.execute(`SELECT id, school_id FROM Children WHERE id = ? AND active = TRUE`, [child_id]);
        if (childRows.length === 0) {
            return res.status(404).json({ message: 'Niño no encontrado o inactivo.' });
        }
        const childSchoolId = childRows[0].school_id;

        // Verificar que el usuario tiene permiso para crear un registro para este niño en esta escuela
        if (req.user.role_name === 'TEACHER' && req.user.school_id !== childSchoolId) {
            return res.status(403).json({ message: 'No tienes permiso para crear registros para niños de otra escuela.' });
        }

        const [result] = await pool.execute(
            `INSERT INTO Records (date, food, sleep, sleepFrom, sleepTo, mood, diaper, notes, child_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [date, food, sleep, sleepFrom, sleepTo, mood, diaper, notes, child_id, created_by]
        );
        res.status(201).json({ message: 'Registro creado exitosamente.', recordId: result.insertId });
    } catch (error) {
        console.error('Error al crear registro:', error);
        res.status(500).json({ message: 'Error del servidor.' });
    }
};

// @desc    Obtener todos los registros activos para un niño
// @route   GET /api/records/child/:childId
// @access  Private (SUPERTEACHER, TEACHER, PARENTS)
exports.getRecordsByChild = async (req, res) => {
    const { childId } = req.params;
    const requestingUser = req.user;

    try {
        // Verificar si el usuario tiene permiso para ver los registros de este niño
        const [childRows] = await pool.execute(`SELECT id, school_id FROM Children WHERE id = ? AND active = TRUE`, [childId]);
        if (childRows.length === 0) {
            return res.status(404).json({ message: 'Niño no encontrado o inactivo.' });
        }
        const childSchoolId = childRows[0].school_id;

        if (requestingUser.role_name === 'PARENTS') {
            const [parentChildRows] = await pool.execute(
                `SELECT * FROM ParentsChildren WHERE parent_id = ? AND child_id = ?`,
                [requestingUser.id, childId]
            );
            if (parentChildRows.length === 0) {
                return res.status(403).json({ message: 'No tienes permiso para ver los registros de este niño.' });
            }
        } else if ((requestingUser.role_name === 'TEACHER' || requestingUser.role_name === 'SUPERTEACHER') && requestingUser.school_id !== childSchoolId) {
            return res.status(403).json({ message: 'No tienes permiso para ver registros de niños de otra escuela.' });
        }

        const [rows] = await pool.execute(
            `SELECT r.id, r.date, r.food, r.sleep, r.sleepFrom, r.sleepTo, r.mood, r.diaper, r.notes, r.created_at, uc.name AS created_by_name, r.updated_at, uu.name AS updated_by_name
             FROM Records r
             LEFT JOIN User uc ON r.created_by = uc.id
             LEFT JOIN User uu ON r.updated_by = uu.id
             WHERE r.child_id = ? AND r.active = TRUE ORDER BY r.date DESC, r.created_at DESC`,
            [childId]
        );
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener registros por niño:', error);
        res.status(500).json({ message: 'Error del servidor.' });
    }
};

// @desc    Obtener un registro específico por ID
// @route   GET /api/records/:id
// @access  Private (SUPERTEACHER, TEACHER, PARENTS - si es su hijo)
exports.getRecordById = async (req, res) => {
    const { id } = req.params;
    const requestingUser = req.user;

    try {
        let query = `SELECT r.id, r.date, r.food, r.sleep, r.sleepFrom, r.sleepTo, r.mood, r.diaper, r.notes, r.child_id,
                            c.name AS child_name, s.name AS school_name,
                            r.created_at, uc.name AS created_by_name, r.updated_at, uu.name AS updated_by_name, r.deleted_at, ud.name AS deleted_by_name
                     FROM Records r
                     JOIN Children c ON r.child_id = c.id
                     JOIN School s ON c.school_id = s.id
                     LEFT JOIN User uc ON r.created_by = uc.id
                     LEFT JOIN User uu ON r.updated_by = uu.id
                     LEFT JOIN User ud ON r.deleted_by = ud.id
                     WHERE r.id = ? AND r.active = TRUE`;

        const [rows] = await pool.execute(query, [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Registro no encontrado o inactivo.' });
        }

        const record = rows[0];

        // Reglas de acceso
        if (requestingUser.role_name === 'PARENTS') {
            const [parentChildRows] = await pool.execute(
                `SELECT * FROM ParentsChildren WHERE parent_id = ? AND child_id = ?`,
                [requestingUser.id, record.child_id]
            );
            if (parentChildRows.length === 0) {
                return res.status(403).json({ message: 'No tienes permiso para ver este registro.' });
            }
        } else if ((requestingUser.role_name === 'TEACHER' || requestingUser.role_name === 'SUPERTEACHER') && requestingUser.school_id !== record.school_id) {
            return res.status(403).json({ message: 'No tienes permiso para ver registros de niños de otra escuela.' });
        }

        res.json(record);
    } catch (error) {
        console.error('Error al obtener registro por ID:', error);
        res.status(500).json({ message: 'Error del servidor.' });
    }
};


// @desc    Actualizar un registro diario
// @route   PUT /api/records/:id
// @access  Private (SUPERTEACHER, TEACHER)
exports.updateRecord = async (req, res) => {
    const { id } = req.params;
    const { date, food, sleep, sleepFrom, sleepTo, mood, diaper, notes } = req.body;
    const updated_by = req.user.id;

    try {
        // Obtener el registro y verificar permisos
        const [recordRows] = await pool.execute(
            `SELECT r.child_id, c.school_id FROM Records r JOIN Children c ON r.child_id = c.id WHERE r.id = ? AND r.active = TRUE`,
            [id]
        );
        if (recordRows.length === 0) {
            return res.status(404).json({ message: 'Registro no encontrado o inactivo.' });
        }
        const recordSchoolId = recordRows[0].school_id;

        if (req.user.role_name === 'TEACHER' && req.user.school_id !== recordSchoolId) {
            return res.status(403).json({ message: 'No tienes permiso para actualizar registros de niños de otra escuela.' });
        }

        const [result] = await pool.execute(
            `UPDATE Records SET date = ?, food = ?, sleep = ?, sleepFrom = ?, sleepTo = ?, mood = ?, diaper = ?, notes = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ? AND active = TRUE`,
            [date, food, sleep, sleepFrom, sleepTo, mood, diaper, notes, updated_by, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Registro no encontrado o inactivo.' });
        }
        res.json({ message: 'Registro actualizado exitosamente.' });
    } catch (error) {
        console.error('Error al actualizar registro:', error);
        res.status(500).json({ message: 'Error del servidor.' });
    }
};

// @desc    Borrado lógico de un registro diario
// @route   DELETE /api/records/:id
// @access  Private (SUPERTEACHER, TEACHER)
exports.softDeleteRecord = async (req, res) => {
    const { id } = req.params;
    const deleted_by = req.user.id;

    try {
        // Obtener el registro y verificar permisos
        const [recordRows] = await pool.execute(
            `SELECT r.child_id, c.school_id FROM Records r JOIN Children c ON r.child_id = c.id WHERE r.id = ? AND r.active = TRUE`,
            [id]
        );
        if (recordRows.length === 0) {
            return res.status(404).json({ message: 'Registro no encontrado o ya inactivo.' });
        }
        const recordSchoolId = recordRows[0].school_id;

        if (req.user.role_name === 'TEACHER' && req.user.school_id !== recordSchoolId) {
            return res.status(403).json({ message: 'No tienes permiso para borrar registros de niños de otra escuela.' });
        }

        const [result] = await pool.execute(
            `UPDATE Records SET active = FALSE, deleted_at = CURRENT_TIMESTAMP, deleted_by = ? WHERE id = ? AND active = TRUE`,
            [deleted_by, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Registro no encontrado o ya inactivo.' });
        }
        res.json({ message: 'Registro borrado lógicamente exitosamente.' });
    } catch (error) {
        console.error('Error al borrar lógicamente registro:', error);
        res.status(500).json({ message: 'Error del servidor.' });
    }
};
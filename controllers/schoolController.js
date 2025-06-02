// controllers/schoolController.js
const pool = require('../config/db');

// @desc    Crear una nueva escuela
// @route   POST /api/schools
// @access  Private (ADMIN, SUPERTEACHER)
exports.createSchool = async (req, res) => {
    const { name, address, phone, email, cif } = req.body;
    try {
        const [result] = await pool.execute(
            `INSERT INTO School (name, address, phone, email, cif) VALUES (?, ?, ?, ?, ?)`,
            [name, address, phone, email, cif]
        );
        res.status(201).json({ message: 'Escuela creada exitosamente.', schoolId: result.insertId });
    } catch (error) {
        console.error('Error al crear escuela:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'El email o CIF ya existen.' });
        }
        res.status(500).json({ message: 'Error del servidor.' });
    }
};

// @desc    Obtener todas las escuelas activas
// @route   GET /api/schools
// @access  Private (ADMIN, SUPERTEACHER)
exports.getAllSchools = async (req, res) => {
    try {
        const [rows] = await pool.execute(`SELECT * FROM School WHERE active = TRUE`);
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener escuelas:', error);
        res.status(500).json({ message: 'Error del servidor.' });
    }
};

// @desc    Obtener una escuela por ID
// @route   GET /api/schools/:id
// @access  Private (ADMIN, SUPERTEACHER)
exports.getSchoolById = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.execute(`SELECT * FROM School WHERE id = ? AND active = TRUE`, [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Escuela no encontrada.' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Error al obtener escuela por ID:', error);
        res.status(500).json({ message: 'Error del servidor.' });
    }
};

// @desc    Actualizar detalles de una escuela
// @route   PUT /api/schools/:id
// @access  Private (ADMIN, SUPERTEACHER)
exports.updateSchool = async (req, res) => {
    const { id } = req.params;
    const { name, address, phone, email, cif } = req.body;
    try {
        const [result] = await pool.execute(
            `UPDATE School SET name = ?, address = ?, phone = ?, email = ?, cif = ? WHERE id = ? AND active = TRUE`,
            [name, address, phone, email, cif, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Escuela no encontrada o inactiva.' });
        }
        res.json({ message: 'Escuela actualizada exitosamente.' });
    } catch (error) {
        console.error('Error al actualizar escuela:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'El email o CIF ya existen.' });
        }
        res.status(500).json({ message: 'Error del servidor.' });
    }
};

// @desc    Borrado lógico de una escuela
// @route   DELETE /api/schools/:id
// @access  Private (ADMIN, SUPERTEACHER)
exports.softDeleteSchool = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.execute(
            `UPDATE School SET active = FALSE WHERE id = ? AND active = TRUE`,
            [id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Escuela no encontrada o ya inactiva.' });
        }
        res.json({ message: 'Escuela borrada lógicamente exitosamente.' });
    } catch (error) {
        console.error('Error al borrar lógicamente escuela:', error);
        res.status(500).json({ message: 'Error del servidor.' });
    }
};
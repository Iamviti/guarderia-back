const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const generateToken = (user) => {
    return jwt.sign(
        { user: { id: user.id, email: user.email, role_name: user.role_name, school_id: user.school_id } },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN,
        }
    );
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await pool.execute(
            `SELECT u.*, r.nombre AS role_name FROM User u JOIN Rol r ON u.rol_id = r.id WHERE u.email = ? AND u.active = TRUE`,
            [email]
        );
        const user = rows[0];

        if (user && (await bcrypt.compare(password, user.password))) {
            res.json({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role_name,
                token: generateToken(user),
            });
        } else {
            res.status(401).json({ message: 'Credenciales inválidas o usuario inactivo.' });
        }
    } catch (error) {
        console.error('Error en el login:', error);
        res.status(500).json({ message: 'Error del servidor.' });
    }
};
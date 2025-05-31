// guarderia-back/server.js (o app.js)

// 1. Cargar las variables de entorno desde .env
require('dotenv').config();

const express = require('express');
const app = express();
const cors = require('cors');

// 2. Ahora, process.env ya tendrá tus variables del .env cargadas
const { pool, testConnection } = require('./config/db'); // Importa el pool de conexiones

// Middleware
app.use(cors());
app.use(express.json()); // Para parsear JSON en las peticiones

// Realiza una prueba de conexión al iniciar la aplicación
testConnection();

// Tus rutas existentes...
// app.get('/api/ninos', async (req, res) => {
//     try {
//         const [rows] = await pool.query('SELECT * FROM ninos');
//         res.json(rows);
//     } catch (error) {
//         console.error('Error al obtener los niños:', error);
//         res.status(500).json({ message: 'Error interno del servidor' });
//     }
// });

// Define tus otras rutas...

// Asegúrate de que PORT también se lee de process.env
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor backend corriendo en el puerto ${PORT}`);
});
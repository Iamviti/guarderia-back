// guarderia-back/config/db.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    // Accede a las variables de entorno a través de process.env
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('Conexión a la base de datos MySQL exitosa!');
        connection.release(); // Libera la conexión
    } catch (error) {
        console.error('Error al conectar a la base de datos MySQL:', error.message);
        // Es buena práctica lanzar el error o manejarlo de forma más robusta en producción.
        // process.exit(1); // Descomenta si quieres que la app se detenga si no puede conectar
    }
}

module.exports = {
    pool,
    testConnection
};
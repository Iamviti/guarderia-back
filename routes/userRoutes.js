// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Crear usuario (Solo ADMIN/SUPERTEACHER)
router.post('/', protect, authorize('ADMIN', 'SUPERTEACHER'), userController.createUser);

// Obtener todos los usuarios (Solo ADMIN/SUPERTEACHER, filtrado por escuela para SUPERTEACHER)
router.get('/', protect, authorize('ADMIN', 'SUPERTEACHER'), userController.getAllUsers);

// Obtener perfil del usuario autenticado
router.get('/me', protect, userController.getMe);

// Obtener un usuario por ID (ADMIN/SUPERTEACHER cualquier ID; otros solo su propio ID)
router.get('/:id', protect, userController.getUserById);

// Actualizar usuario (ADMIN/SUPERTEACHER cualquier ID; otros solo su propio ID)
router.put('/:id', protect, userController.updateUser);

// Borrar lógico de usuario (Solo ADMIN/SUPERTEACHER)
router.delete('/:id', protect, authorize('ADMIN', 'SUPERTEACHER'), userController.softDeleteUser);

module.exports = router;
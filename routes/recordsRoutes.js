// routes/recordsRoutes.js
const express = require('express');
const router = express.Router();
const recordsController = require('../controllers/recordsController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Crear registro (Solo SUPERTEACHER, TEACHER)
router.post('/', protect, authorize('SUPERTEACHER', 'TEACHER'), recordsController.createRecord);

// Obtener todos los registros de un niño (Filtrado por rol)
router.get('/child/:childId', protect, recordsController.getRecordsByChild);

// Obtener un registro por ID (Filtrado por rol)
router.get('/:id', protect, recordsController.getRecordById);

// Actualizar un registro (Solo SUPERTEACHER, TEACHER)
router.put('/:id', protect, authorize('SUPERTEACHER', 'TEACHER'), recordsController.updateRecord);

// Borrado lógico de un registro (Solo SUPERTEACHER, TEACHER)
router.delete('/:id', protect, authorize('SUPERTEACHER', 'TEACHER'), recordsController.softDeleteRecord);

module.exports = router;
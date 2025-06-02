// routes/childrenRoutes.js
const express = require('express');
const router = express.Router();
const childrenController = require('../controllers/childrenController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Crear niño (Solo SUPERTEACHER, TEACHER)
router.post('/', protect, authorize('SUPERTEACHER', 'TEACHER'), childrenController.createChild);

// Obtener todos los niños (Filtrado por rol)
router.get('/', protect, childrenController.getAllChildren);

// Obtener un niño por ID (Filtrado por rol)
router.get('/:id', protect, childrenController.getChildById);

// Actualizar niño (Solo SUPERTEACHER, TEACHER)
router.put('/:id', protect, authorize('SUPERTEACHER', 'TEACHER'), childrenController.updateChild);

// Borrado lógico de niño (Solo SUPERTEACHER, TEACHER)
router.delete('/:id', protect, authorize('SUPERTEACHER', 'TEACHER'), childrenController.softDeleteChild);

// Asociar padre a niño (Solo SUPERTEACHER, TEACHER)
router.post('/:childId/parents/:parentId', protect, authorize('SUPERTEACHER', 'TEACHER'), childrenController.assignParentToChild);

// Desasociar padre de niño (Solo SUPERTEACHER, TEACHER)
router.delete('/:childId/parents/:parentId', protect, authorize('SUPERTEACHER', 'TEACHER'), childrenController.unassignParentFromChild);

module.exports = router;
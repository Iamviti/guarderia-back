// routes/schoolRoutes.js
const express = require('express');
const router = express.Router();
const schoolController = require('../controllers/schoolController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.post('/', protect, authorize('ADMIN', 'SUPERTEACHER'), schoolController.createSchool);
router.get('/', protect, authorize('ADMIN', 'SUPERTEACHER'), schoolController.getAllSchools);
router.get('/:id', protect, authorize('ADMIN', 'SUPERTEACHER'), schoolController.getSchoolById);
router.put('/:id', protect, authorize('ADMIN', 'SUPERTEACHER'), schoolController.updateSchool);
router.delete('/:id', protect, authorize('ADMIN', 'SUPERTEACHER'), schoolController.softDeleteSchool);

module.exports = router;
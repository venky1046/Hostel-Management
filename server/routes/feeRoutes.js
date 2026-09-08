const express = require('express');
const router = express.Router();
const feeController = require('../controllers/feeController');

router.get('/payments/all', feeController.getAllPayments); // must come before /:studentId
router.get('/', feeController.getAllFees);
router.get('/:studentId', feeController.getFeeByStudentId);
router.post('/payment', feeController.addPayment);

module.exports = router;

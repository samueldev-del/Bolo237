// backend/routes/reports.js
const express = require('express');
const router = express.Router();
const { prisma } = require('../lib/db');
// import de tes envois d'email si le signalement déclenche un mail admin
// const { sendEmail } = require('../lib/transactionalEmail'); 

// 🛑 /api/reports devient /
router.post('/', async (req, res) => {
  // ✂️ Colle ici la logique de signalement
});

module.exports = router;
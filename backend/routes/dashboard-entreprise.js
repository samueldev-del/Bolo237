const express = require('express');

function normalizeRole(role) {
  return String(role || '').trim().toUpperCase();
}

module.exports = function createDashboardEntrepriseRouter({ prisma, requireUserSession }) {
  const router = express.Router();

  router.get('/overview', requireUserSession, async (req, res) => {
    try {
      const sessionUser = req.sessionUser;
      const role = normalizeRole(sessionUser?.role);

      if (role !== 'ENTREPRISE') {
        return res.status(403).json({ error: 'Acces entreprise requis.' });
      }

      const jobs = await prisma.job.findMany({
        where: { authorId: sessionUser.id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          company: true,
          location: true,
          description: true,
          salary: true,
          status: true,
          authorId: true,
          createdAt: true,
        },
      });

      return res.json({ jobs });
    } catch (error) {
      console.error('GET /api/dashboard-entreprise/overview error:', error);
      return res.status(500).json({ error: 'Erreur lors du chargement du dashboard entreprise.' });
    }
  });

  return router;
};

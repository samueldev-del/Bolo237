const express = require('express');

function normalizeRole(role) {
  return String(role || '').trim().toUpperCase();
}

module.exports = function createDashboardArtisanRouter({ prisma, requireUserSession }) {
  const router = express.Router();

  router.get('/overview', requireUserSession, async (req, res) => {
    try {
      const sessionUser = req.sessionUser;
      const role = normalizeRole(sessionUser?.role);

      if (role !== 'ARTISAN') {
        return res.status(403).json({ error: 'Acces artisan requis.' });
      }

      const [artisan, jobs] = await Promise.all([
        prisma.user.findUnique({
          where: { id: sessionUser.id },
          select: { contactClicks: true },
        }),
        prisma.job.findMany({
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
        }),
      ]);

      return res.json({
        jobs,
        profileViews: artisan?.contactClicks || 0,
      });
    } catch (error) {
      console.error('GET /api/dashboard-artisan/overview error:', error);
      return res.status(500).json({ error: 'Erreur lors du chargement du dashboard artisan.' });
    }
  });

  return router;
};

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

      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      startDate.setDate(startDate.getDate() - 6);

      const [artisan, jobs, contactEvents] = await Promise.all([
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
        prisma.contactClickEvent.findMany({
          where: {
            artisanId: sessionUser.id,
            createdAt: {
              gte: startDate,
            },
          },
          orderBy: { createdAt: 'asc' },
          select: { createdAt: true },
        }),
      ]);

      const contactHistoryMap = new Map();
      for (const event of contactEvents) {
        const dayKey = new Date(event.createdAt).toISOString().slice(0, 10);
        contactHistoryMap.set(dayKey, (contactHistoryMap.get(dayKey) || 0) + 1);
      }

      const clickHistory = Array.from({ length: 7 }, (_, index) => {
        const current = new Date(startDate);
        current.setDate(startDate.getDate() + index);
        const dayKey = current.toISOString().slice(0, 10);
        return {
          dayKey,
          count: contactHistoryMap.get(dayKey) || 0,
        };
      });

      return res.json({
        jobs,
        profileViews: artisan?.contactClicks || 0,
        clickHistory,
      });
    } catch (error) {
      console.error('GET /api/dashboard-artisan/overview error:', error);
      return res.status(500).json({ error: 'Erreur lors du chargement du dashboard artisan.' });
    }
  });

  return router;
};

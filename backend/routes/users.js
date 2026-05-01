const express = require('express');

const router = express.Router();
const { prisma } = require('../lib/db');

// GET /api/users/artisans (annuaire public)
router.get('/artisans', async (req, res) => {
	try {
		const categorie = String(req.query?.categorie || '').trim();
		const location = String(req.query?.location || '').trim();
		const service = String(req.query?.service || '').trim();
		const sortBy = String(req.query?.sortBy || 'recent').trim().toLowerCase();
		const page = Math.max(1, Number.parseInt(String(req.query?.page || '1'), 10) || 1);
		const limitRaw = Number.parseInt(String(req.query?.limit || '12'), 10) || 12;
		const limit = Math.min(50, Math.max(1, limitRaw));
		const skip = (page - 1) * limit;

		const orderBy = sortBy === 'services'
			? [{ services: { _count: 'desc' } }, { createdAt: 'desc' }]
			: sortBy === 'portfolio'
				? [{ portfolio: { _count: 'desc' } }, { createdAt: 'desc' }]
				: [{ createdAt: 'desc' }];

		const whereClause = {
			role: 'ARTISAN',
			isVerified: true,
		};

		if (categorie) {
			whereClause.userProfile = {
				is: { title: { contains: categorie, mode: 'insensitive' } },
			};
		}

		if (location) {
			whereClause.userProfile = {
				is: {
					...(whereClause.userProfile?.is || {}),
					location: { contains: location, mode: 'insensitive' },
				},
			};
		}

		if (service) {
			whereClause.services = {
				some: {
					name: {
						contains: service,
						mode: 'insensitive',
					},
				},
			};
		}

		const [total, artisanRows] = await prisma.$transaction([
			prisma.user.count({ where: whereClause }),
			prisma.user.findMany({
				where: whereClause,
				select: {
					id: true,
					name: true,
					photoUrl: true,
					phone: true,
					userProfile: {
						select: {
							fullName: true,
							title: true,
							location: true,
							profile: true,
						},
					},
					// Cap related rows fetched for the directory listing to avoid over-fetch.
					services: {
						select: {
							name: true,
							price: true,
						},
						orderBy: { createdAt: 'desc' },
						take: 3,
					},
					portfolio: {
						select: {
							imageUrl: true,
						},
						orderBy: { createdAt: 'desc' },
						take: 3,
					},
					_count: {
						select: { services: true, portfolio: true },
					},
				},
				orderBy,
				skip,
				take: limit,
			}),
		]);

		// Flatten userProfile fields onto each artisan to preserve the legacy API shape.
		const artisans = artisanRows.map((a) => ({
			id: a.id,
			name: a.name,
			photoUrl: a.photoUrl,
			phone: a.phone,
			fullName: a.userProfile?.fullName || '',
			title: a.userProfile?.title || '',
			location: a.userProfile?.location || '',
			profile: a.userProfile?.profile || '',
			services: a.services,
			portfolio: a.portfolio,
			_count: a._count,
		}));

		const totalPages = Math.max(1, Math.ceil(total / limit));

		return res.json({
			success: true,
			artisans,
			pagination: {
				page,
				limit,
				total,
				totalPages,
			},
		});
	} catch (error) {
		console.error('Erreur recuperation annuaire artisans:', error);
		return res.status(500).json({ success: false, message: 'Erreur serveur' });
	}
});

// GET /api/users/artisans/:id (profil public artisan)
router.get('/artisans/:id', async (req, res) => {
	try {
		const artisanId = Number.parseInt(String(req.params.id || ''), 10);
		if (!Number.isFinite(artisanId) || artisanId <= 0) {
			return res.status(400).json({ success: false, message: 'Identifiant artisan invalide' });
		}

		const row = await prisma.user.findFirst({
			where: {
				id: artisanId,
				role: 'ARTISAN',
				isVerified: true,
			},
			select: {
				id: true,
				name: true,
				photoUrl: true,
				phone: true,
				userProfile: {
					select: {
						fullName: true,
						title: true,
						location: true,
						profile: true,
					},
				},
				services: {
					select: {
						id: true,
						name: true,
						description: true,
						price: true,
						createdAt: true,
					},
					orderBy: { createdAt: 'desc' },
				},
				portfolio: {
					select: {
						id: true,
						imageUrl: true,
						title: true,
						createdAt: true,
					},
					orderBy: { createdAt: 'desc' },
				},
			},
		});

		if (!row) {
			return res.status(404).json({ success: false, message: 'Artisan introuvable' });
		}

		const artisan = {
			id: row.id,
			name: row.name,
			photoUrl: row.photoUrl,
			phone: row.phone,
			fullName: row.userProfile?.fullName || '',
			title: row.userProfile?.title || '',
			location: row.userProfile?.location || '',
			profile: row.userProfile?.profile || '',
			services: row.services,
			portfolio: row.portfolio,
		};

		return res.json({ success: true, artisan });
	} catch (error) {
		console.error('Erreur recuperation profil artisan:', error);
		return res.status(500).json({ success: false, message: 'Erreur serveur' });
	}
});

module.exports = router;
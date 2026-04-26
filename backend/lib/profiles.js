function profileFromBody(userId, body) {
  return {
    userId,
    fullName: String(body.fullName || ''),
    title: String(body.title || ''),
    location: String(body.location || ''),
    phone: String(body.phone || ''),
    email: String(body.email || ''),
    profile: String(body.profile || ''),
    experience: String(body.experience || ''),
    education: String(body.education || ''),
    skillsText: String(body.skillsText || ''),
    languagesText: String(body.languagesText || ''),
    updatedAt: new Date().toISOString(),
  };
}

function calcCvMajJours(createdAtIso) {
  const diff = Date.now() - new Date(createdAtIso).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

module.exports = { profileFromBody, calcCvMajJours };

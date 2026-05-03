const MAX = {
  fullName: 120,
  title: 120,
  location: 120,
  phone: 32,
  email: 254,
  profile: 5000,
  experience: 10000,
  education: 5000,
  skillsText: 2000,
  languagesText: 500,
};

function clip(value, max) {
  return String(value || '').slice(0, max);
}

function profileFromBody(userId, body) {
  return {
    userId,
    fullName: clip(body.fullName, MAX.fullName),
    title: clip(body.title, MAX.title),
    location: clip(body.location, MAX.location),
    phone: clip(body.phone, MAX.phone),
    email: clip(body.email, MAX.email),
    profile: clip(body.profile, MAX.profile),
    experience: clip(body.experience, MAX.experience),
    education: clip(body.education, MAX.education),
    skillsText: clip(body.skillsText, MAX.skillsText),
    languagesText: clip(body.languagesText, MAX.languagesText),
    updatedAt: new Date().toISOString(),
  };
}

function calcCvMajJours(createdAtIso) {
  const diff = Date.now() - new Date(createdAtIso).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

module.exports = { profileFromBody, calcCvMajJours };

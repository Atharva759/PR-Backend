const { admin } = require("../config/firebase");

async function verifyToken(req, res, next) {
  try {
    const token = req.headers.authorization?.split("Bearer ")[1];
    if (!token) return res.status(401).json({ error: "No token provided" });

    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;

    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

module.exports = verifyToken;
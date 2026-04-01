import { admin,db } from "../config/firebase.js";

export async function verifyToken(req, res, next) {
  try {
    const token = req.headers.authorization?.split("Bearer ")[1];
    if (!token) return res.status(401).json({ error: "No token provided" });

    const decoded = await admin.auth().verifyIdToken(token);
    const userSnap = await db.ref(`users/${decoded.uid}`).once("value");
    const user = userSnap.val();
    if(!user) return res.status(404).json({message:"User not found"});
    req.user = {
      uid:decoded.uid,
      ...user
    };

    next();
  } catch (err) {
    console.log(err);
    return res.status(401).json({ error: "Unauthorized" });
  }
}




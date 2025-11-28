import { verifyJWTToken } from "../utils/auth.js";
export async function validateRequest(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ message: "Invalid token" });
        return;
    }
    const token = authHeader.slice(7);
    if (!token) {
        res.status(401).json({ message: "Invalid token" });
        return;
    }
    const user = await verifyJWTToken(token);
    if (!user) {
        res.status(403).json({ message: "Unauthorized" });
        return;
    }
    req.user = user;
    req.companyId = user.company_id;
    next();
}
//# sourceMappingURL=auth.middleware.js.map
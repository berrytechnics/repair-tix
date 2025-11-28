import jwt from "jsonwebtoken";
import logger from "../config/logger.js";
import userService from "../services/user.service.js";
export function generateNewJWTToken(user) {
    const token = jwt.sign({ userId: user.id, companyId: user.company_id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
    });
    return token;
}
export async function verifyJWTToken(token) {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userService.findById(decoded.userId);
        if (!user || user.company_id !== decoded.companyId) {
            logger.error("User company mismatch in token");
            return null;
        }
        return user;
    }
    catch (error) {
        logger.error("Invalid JWT token:", error);
        return null;
    }
}
//# sourceMappingURL=auth.js.map
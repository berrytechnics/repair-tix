import { validationResult } from "express-validator";
import { ValidationError } from "../config/errors.js";
export const handleValidationErrors = (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorMap = {};
            errors.array().forEach((error) => {
                if (error.type === "field") {
                    const path = error.path && error.path.trim() !== "" ? error.path : "_error";
                    errorMap[path] = error.msg;
                }
                else {
                    errorMap["_error"] = error.msg;
                }
            });
            return next(new ValidationError("Validation failed", errorMap));
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
export const validate = (validations) => {
    return async (req, res, next) => {
        try {
            await Promise.all(validations.map((validation) => validation.run(req)));
            handleValidationErrors(req, res, next);
        }
        catch (error) {
            next(error);
        }
    };
};
//# sourceMappingURL=validation.middleware.js.map
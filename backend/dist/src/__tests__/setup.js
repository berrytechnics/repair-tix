process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_for_testing_only';
if (!process.env.DB_HOST) {
    process.env.DB_HOST = process.env.DB_HOST || 'localhost';
}
if (!process.env.DB_PORT) {
    process.env.DB_PORT = process.env.DB_PORT || '5432';
}
if (!process.env.DB_USER) {
    process.env.DB_USER = process.env.DB_USER || 'repair_admin';
}
if (!process.env.DB_PASSWORD) {
    process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'repair_password';
}
if (!process.env.DB_NAME) {
    process.env.DB_NAME = process.env.DB_NAME || 'repair_business';
}
export {};
//# sourceMappingURL=setup.js.map
import dotenv from "dotenv";
dotenv.config();
import { db } from "../src/config/connection.js";
import userService from "../src/services/user.service.js";
import permissionService from "../src/services/permission.service.js";
async function main() {
    const email = process.argv[2];
    const targetRole = (process.argv[3] || "admin");
    if (!email) {
        console.error("Usage: npx ts-node scripts/check-and-update-user-role.ts <email> [role]");
        console.error("Example: npx ts-node scripts/check-and-update-user-role.ts kyle@berrytechnics.com admin");
        process.exit(1);
    }
    try {
        const user = await userService.findByEmail(email);
        if (!user) {
            console.error(`User with email ${email} not found`);
            process.exit(1);
        }
        console.log(`\nCurrent user info:`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Name: ${user.first_name} ${user.last_name}`);
        console.log(`  Current Role: ${user.role}`);
        const companyId = user.company_id;
        console.log(`  Company ID: ${companyId}`);
        const currentPermissions = await permissionService.getPermissionsForRole(user.role, companyId);
        console.log(`  Current Permissions (${currentPermissions.length}):`, currentPermissions);
        if (user.role !== targetRole) {
            console.log(`\nUpdating role from ${user.role} to ${targetRole}...`);
            const updated = await userService.update(user.id, { role: targetRole });
            if (updated) {
                console.log(`✓ Successfully updated role to ${targetRole}`);
                const newPermissions = await permissionService.getPermissionsForRole(targetRole, companyId);
                console.log(`  New Permissions (${newPermissions.length}):`, newPermissions);
                if (newPermissions.includes("permissions.view")) {
                    console.log(`\n✓ User now has 'permissions.view' permission`);
                    console.log(`  They should be able to see the permissions screen in Settings`);
                }
                else {
                    console.log(`\n⚠ Warning: User does not have 'permissions.view' permission`);
                    console.log(`  This might mean permissions haven't been initialized for their company.`);
                    console.log(`  Attempting to initialize permissions...`);
                    try {
                        await permissionService.initializeCompanyPermissions(companyId);
                        console.log(`✓ Permissions initialized for company`);
                        const updatedPermissions = await permissionService.getPermissionsForRole(targetRole, companyId);
                        if (updatedPermissions.includes("permissions.view")) {
                            console.log(`✓ User now has 'permissions.view' permission`);
                        }
                    }
                    catch (err) {
                        console.error(`✗ Failed to initialize permissions:`, err);
                    }
                }
            }
            else {
                console.error(`✗ Failed to update user role`);
                process.exit(1);
            }
        }
        else {
            console.log(`\nUser already has role: ${targetRole}`);
            if (currentPermissions.includes("permissions.view")) {
                console.log(`✓ User has 'permissions.view' permission`);
                console.log(`  They should be able to see the permissions screen in Settings`);
            }
            else {
                console.log(`\n⚠ Warning: User does not have 'permissions.view' permission`);
                console.log(`  This might mean permissions haven't been initialized for their company.`);
                console.log(`  Attempting to initialize permissions...`);
                try {
                    await permissionService.initializeCompanyPermissions(companyId);
                    console.log(`✓ Permissions initialized for company`);
                    const updatedPermissions = await permissionService.getPermissionsForRole(user.role, companyId);
                    if (updatedPermissions.includes("permissions.view")) {
                        console.log(`✓ User now has 'permissions.view' permission`);
                    }
                    else {
                        console.log(`⚠ Still missing 'permissions.view'. This role (${user.role}) may not have this permission by default.`);
                    }
                }
                catch (err) {
                    console.error(`✗ Failed to initialize permissions:`, err);
                }
            }
        }
        console.log(`\nDone!`);
    }
    catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
    finally {
        await db.destroy();
    }
}
main();
//# sourceMappingURL=check-and-update-user-role.js.map
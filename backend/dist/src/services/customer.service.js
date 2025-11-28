import { sql } from "kysely";
import { v4 as uuidv4 } from "uuid";
import { db } from "../config/connection.js";
function toCustomer(customer) {
    return {
        id: customer.id,
        firstName: customer.first_name,
        lastName: customer.last_name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        city: customer.city,
        state: customer.state,
        zipCode: customer.zip_code,
        notes: customer.notes,
        createdAt: customer.created_at,
        updatedAt: customer.updated_at,
    };
}
export class CustomerService {
    async findAll(companyId, searchQuery) {
        let query = db
            .selectFrom("customers")
            .selectAll()
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null);
        if (searchQuery) {
            const search = `%${searchQuery.toLowerCase()}%`;
            query = query.where((eb) => eb.or([
                eb("first_name", "ilike", search),
                eb("last_name", "ilike", search),
                eb("email", "ilike", search),
                eb("phone", "ilike", search),
            ]));
        }
        const customers = await query.execute();
        return customers.map(toCustomer);
    }
    async findById(id, companyId) {
        const customer = await db
            .selectFrom("customers")
            .selectAll()
            .where("id", "=", id)
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null)
            .executeTakeFirst();
        return customer ? toCustomer(customer) : null;
    }
    async create(data, companyId) {
        const customer = await db
            .insertInto("customers")
            .values({
            id: uuidv4(),
            company_id: companyId,
            first_name: data.firstName,
            last_name: data.lastName,
            email: data.email,
            phone: data.phone || null,
            address: data.address || null,
            city: data.city || null,
            state: data.state || null,
            zip_code: data.zipCode || null,
            notes: data.notes || null,
            created_at: sql `now()`,
            updated_at: sql `now()`,
            deleted_at: null,
        })
            .returningAll()
            .executeTakeFirstOrThrow();
        return toCustomer(customer);
    }
    async update(id, data, companyId) {
        let updateQuery = db
            .updateTable("customers")
            .set({
            updated_at: sql `now()`,
        })
            .where("id", "=", id)
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null);
        if (data.firstName !== undefined) {
            updateQuery = updateQuery.set({ first_name: data.firstName });
        }
        if (data.lastName !== undefined) {
            updateQuery = updateQuery.set({ last_name: data.lastName });
        }
        if (data.email !== undefined) {
            updateQuery = updateQuery.set({ email: data.email });
        }
        if (data.phone !== undefined) {
            updateQuery = updateQuery.set({ phone: data.phone || null });
        }
        if (data.address !== undefined) {
            updateQuery = updateQuery.set({ address: data.address || null });
        }
        if (data.city !== undefined) {
            updateQuery = updateQuery.set({ city: data.city || null });
        }
        if (data.state !== undefined) {
            updateQuery = updateQuery.set({ state: data.state || null });
        }
        if (data.zipCode !== undefined) {
            updateQuery = updateQuery.set({ zip_code: data.zipCode || null });
        }
        if (data.notes !== undefined) {
            updateQuery = updateQuery.set({ notes: data.notes || null });
        }
        const updated = await updateQuery
            .returningAll()
            .executeTakeFirst();
        return updated ? toCustomer(updated) : null;
    }
    async delete(id, companyId) {
        const result = await db
            .updateTable("customers")
            .set({
            deleted_at: sql `now()`,
            updated_at: sql `now()`,
        })
            .where("id", "=", id)
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null)
            .returningAll()
            .executeTakeFirst();
        return !!result;
    }
}
export default new CustomerService();
//# sourceMappingURL=customer.service.js.map
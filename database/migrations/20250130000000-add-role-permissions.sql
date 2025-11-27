-- Migration: Add Role Permissions Management
-- Description: Creates role_permissions table to store role-permission mappings in database
-- Date: 2025-01-30

-- Step 1: Create role_permissions table (company-specific)
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  permission VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT role_permissions_company_role_permission_unique UNIQUE(company_id, role, permission)
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_role_permissions_company_id ON role_permissions(company_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission);

-- Step 3: Insert default permissions for each company based on current config
-- This will be done per-company when needed, or can be seeded for existing companies
-- For now, we'll create a function to initialize default permissions for a company

-- Function to initialize default permissions for a company
CREATE OR REPLACE FUNCTION initialize_company_permissions(p_company_id UUID)
RETURNS void AS $$
BEGIN
  -- Admin permissions
  INSERT INTO role_permissions (company_id, role, permission) VALUES
  (p_company_id, 'admin', 'customers.read'),
  (p_company_id, 'admin', 'customers.create'),
  (p_company_id, 'admin', 'customers.update'),
  (p_company_id, 'admin', 'customers.delete'),
  (p_company_id, 'admin', 'tickets.read'),
  (p_company_id, 'admin', 'tickets.create'),
  (p_company_id, 'admin', 'tickets.update'),
  (p_company_id, 'admin', 'tickets.assign'),
  (p_company_id, 'admin', 'tickets.updateStatus'),
  (p_company_id, 'admin', 'tickets.addNotes'),
  (p_company_id, 'admin', 'tickets.delete'),
  (p_company_id, 'admin', 'invoices.read'),
  (p_company_id, 'admin', 'invoices.create'),
  (p_company_id, 'admin', 'invoices.update'),
  (p_company_id, 'admin', 'invoices.delete'),
  (p_company_id, 'admin', 'invoices.manageItems'),
  (p_company_id, 'admin', 'invoices.markPaid'),
  (p_company_id, 'admin', 'inventory.read'),
  (p_company_id, 'admin', 'inventory.create'),
  (p_company_id, 'admin', 'inventory.update'),
  (p_company_id, 'admin', 'inventory.delete'),
  (p_company_id, 'admin', 'purchaseOrders.read'),
  (p_company_id, 'admin', 'purchaseOrders.create'),
  (p_company_id, 'admin', 'purchaseOrders.update'),
  (p_company_id, 'admin', 'purchaseOrders.receive'),
  (p_company_id, 'admin', 'purchaseOrders.cancel'),
  (p_company_id, 'admin', 'purchaseOrders.delete'),
  (p_company_id, 'admin', 'invitations.read'),
  (p_company_id, 'admin', 'invitations.create'),
  (p_company_id, 'admin', 'invitations.delete'),
  (p_company_id, 'admin', 'settings.access'),
  (p_company_id, 'admin', 'permissions.view'),
  (p_company_id, 'admin', 'permissions.manage')
ON CONFLICT (company_id, role, permission) DO NOTHING;

  -- Manager permissions
  INSERT INTO role_permissions (company_id, role, permission) VALUES
  (p_company_id, 'manager', 'customers.read'),
  (p_company_id, 'manager', 'customers.create'),
  (p_company_id, 'manager', 'customers.update'),
  (p_company_id, 'manager', 'tickets.read'),
  (p_company_id, 'manager', 'tickets.assign'),
  (p_company_id, 'manager', 'tickets.updateStatus'),
  (p_company_id, 'manager', 'invoices.read'),
  (p_company_id, 'manager', 'invoices.create'),
  (p_company_id, 'manager', 'invoices.update'),
  (p_company_id, 'manager', 'invoices.manageItems'),
  (p_company_id, 'manager', 'invoices.markPaid'),
  (p_company_id, 'manager', 'inventory.read'),
  (p_company_id, 'manager', 'inventory.create'),
  (p_company_id, 'manager', 'inventory.update'),
  (p_company_id, 'manager', 'inventory.delete'),
  (p_company_id, 'manager', 'purchaseOrders.read'),
  (p_company_id, 'manager', 'purchaseOrders.create'),
  (p_company_id, 'manager', 'purchaseOrders.update'),
  (p_company_id, 'manager', 'purchaseOrders.receive'),
  (p_company_id, 'manager', 'purchaseOrders.cancel'),
  (p_company_id, 'manager', 'settings.access')
ON CONFLICT (company_id, role, permission) DO NOTHING;

  -- Technician permissions
  INSERT INTO role_permissions (company_id, role, permission) VALUES
  (p_company_id, 'technician', 'customers.read'),
  (p_company_id, 'technician', 'tickets.read'),
  (p_company_id, 'technician', 'tickets.create'),
  (p_company_id, 'technician', 'tickets.update'),
  (p_company_id, 'technician', 'tickets.updateStatus'),
  (p_company_id, 'technician', 'tickets.addNotes'),
  (p_company_id, 'technician', 'invoices.read'),
  (p_company_id, 'technician', 'inventory.read'),
  (p_company_id, 'technician', 'purchaseOrders.read'),
  (p_company_id, 'technician', 'settings.access')
ON CONFLICT (company_id, role, permission) DO NOTHING;

  -- Frontdesk permissions
  INSERT INTO role_permissions (company_id, role, permission) VALUES
  (p_company_id, 'frontdesk', 'customers.read'),
  (p_company_id, 'frontdesk', 'customers.create'),
  (p_company_id, 'frontdesk', 'customers.update'),
  (p_company_id, 'frontdesk', 'tickets.read'),
  (p_company_id, 'frontdesk', 'tickets.create'),
  (p_company_id, 'frontdesk', 'inventory.read'),
  (p_company_id, 'frontdesk', 'purchaseOrders.read'),
  (p_company_id, 'frontdesk', 'settings.access')
ON CONFLICT (company_id, role, permission) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Initialize permissions for all existing companies
DO $$
DECLARE
  company_record RECORD;
BEGIN
  FOR company_record IN SELECT id FROM companies LOOP
    PERFORM initialize_company_permissions(company_record.id);
  END LOOP;
END $$;


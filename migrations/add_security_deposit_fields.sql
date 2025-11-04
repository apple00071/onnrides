-- Add security deposit management fields to vehicle_returns table
ALTER TABLE vehicle_returns 
ADD COLUMN IF NOT EXISTS security_deposit_deductions DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS security_deposit_refund_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS security_deposit_refund_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS deduction_reasons TEXT;

-- Add comments for documentation
COMMENT ON COLUMN vehicle_returns.security_deposit_deductions IS 'Amount deducted from security deposit for damages, cleaning, etc.';
COMMENT ON COLUMN vehicle_returns.security_deposit_refund_amount IS 'Amount refunded to customer from security deposit';
COMMENT ON COLUMN vehicle_returns.security_deposit_refund_method IS 'Method used to refund security deposit (cash, bank_transfer, upi, etc.)';
COMMENT ON COLUMN vehicle_returns.deduction_reasons IS 'Explanation for any deductions from security deposit';

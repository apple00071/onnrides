-- Migration: Security Hardening
-- Description: Enables RLS on all public tables and fixes SECURITY DEFINER views.

-- 1. Fix bookings_view security context
-- Recreating the view with explicit security_invoker = true
DROP VIEW IF EXISTS public.bookings_view;
CREATE VIEW public.bookings_view 
WITH (security_invoker = true)
AS
SELECT 
  b.*,
  u.name as user_name,
  u.email as user_email,
  u.phone as user_phone,
  v.name as vehicle_name,
  v.type as vehicle_type
FROM public.bookings b
LEFT JOIN public.users u ON b.user_id::text = u.id::text
LEFT JOIN public.vehicles v ON b.vehicle_id::text = v.id::text;

-- 2. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_initiations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- 3. Define Policies

-- Admin Full Access Policy (Generic helper)
-- Note: authenticated users with role 'admin' get full access.
-- We use a function or direct check on users table if needed, but here we'll assume 
-- jwt claims if using Supabase, or direct role check.

-- Admin policies for all tables
DO $$ 
DECLARE 
  t text;
  tables text[] := ARRAY[
    'expenses', 'daily_reconciliations', 'migrations', 'payments', 'users', 
    'documents', 'whatsapp_logs', 'vehicles', 'trip_initiations', 'vehicle_returns', 
    'email_logs', 'settings', 'coupons', 'activity_logs', 'bookings'
  ];
BEGIN 
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Admin full access" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Admin full access" ON public.%I FOR ALL TO authenticated USING (auth.jwt() ->> ''role'' = ''admin'') WITH CHECK (auth.jwt() ->> ''role'' = ''admin'')', t);
  END LOOP;
END $$;

-- User Policies (Owner access)
-- bookings: user can see/update their own bookings
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
CREATE POLICY "Users can view own bookings" ON public.bookings 
FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

-- users: user can see/update their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users 
FOR SELECT TO authenticated 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users 
FOR UPDATE TO authenticated 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

-- documents: user can see their own documents
DROP POLICY IF EXISTS "Users can view own documents" ON public.documents;
CREATE POLICY "Users can view own documents" ON public.documents 
FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can upload own documents" ON public.documents;
CREATE POLICY "Users can upload own documents" ON public.documents 
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Public Read access (anon and authenticated)
-- vehicles: everyone can see available vehicles
DROP POLICY IF EXISTS "Public can view active vehicles" ON public.vehicles;
CREATE POLICY "Public can view active vehicles" ON public.vehicles 
FOR SELECT TO anon, authenticated 
USING (status = 'active' AND is_available = true);

-- settings: public can read certain settings (like maintenance mode)
DROP POLICY IF EXISTS "Public can view settings" ON public.settings;
CREATE POLICY "Public can view settings" ON public.settings 
FOR SELECT TO anon, authenticated 
USING (true);

-- coupons: public can see coupons
DROP POLICY IF EXISTS "Public can view coupons" ON public.coupons;
CREATE POLICY "Public can view coupons" ON public.coupons 
FOR SELECT TO anon, authenticated 
USING (true);

-- migrations: secure it
DROP POLICY IF EXISTS "No public access to migrations" ON public.migrations;
CREATE POLICY "No public access to migrations" ON public.migrations 
FOR ALL TO authenticated 
USING (auth.jwt() ->> 'role' = 'admin');

-- whatsapp_logs, email_logs, activity_logs, trip_initiations, vehicle_returns, expenses, daily_reconciliations
-- All these are covered by the generic Admin policy above, and have no public access by default when RLS is enabled.

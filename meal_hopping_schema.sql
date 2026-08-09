-- ====================================================================
-- CREATE MEAL HISTORY TABLE & SEED INITIAL LOGS (SUPABASE)
-- Copy and run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/gsxjmptksflmyefzmuvg/sql
-- ====================================================================

-- 1. CREATE MEAL HISTORY TABLE IF NOT EXISTS
CREATE TABLE IF NOT EXISTS public.meal_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    mess_id UUID REFERENCES public.messes(id) ON DELETE SET NULL,
    mess_name VARCHAR(255) NOT NULL,
    meal_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    tokens_used INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. ENABLE RLS POLICIES FOR PUBLIC READ / INSERT / UPDATE
ALTER TABLE public.meal_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read meal_history" ON public.meal_history;
DROP POLICY IF EXISTS "Allow public insert meal_history" ON public.meal_history;
DROP POLICY IF EXISTS "Allow public update meal_history" ON public.meal_history;

CREATE POLICY "Allow public read meal_history" ON public.meal_history FOR SELECT USING (true);
CREATE POLICY "Allow public insert meal_history" ON public.meal_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update meal_history" ON public.meal_history FOR UPDATE USING (true);

-- 3. POPULATE INITIAL REAL MEAL HISTORY LOGS
INSERT INTO public.meal_history (user_id, mess_id, mess_name, meal_type, status, tokens_used)
VALUES 
('customer_token_user', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Annapurna Campus Mess', 'Lunch', 'completed', 1),
('customer_token_user', 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'Royal Spice Dining Hall', 'Dinner', 'completed', 1),
('customer_token_user', 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'Green Leaf Premium Mess', 'Lunch', 'skipped', 0),
('customer_token_user', 'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', 'Campus Cloud Kitchen', 'Dinner', 'no-show', 1);

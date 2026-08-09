-- ====================================================================
-- HOTEL BET - COMPLETE SUPABASE DATABASE SCHEMA MIGRATION SCRIPT
-- Copy and run this script inside your Supabase SQL Editor
-- ====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. BRANCHES TABLE
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    rating NUMERIC(3, 2) DEFAULT 4.8,
    delivery_time VARCHAR(50) DEFAULT '20-30 min',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. PROFILES TABLE (Customers, Owners, Riders)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255),
    phone_number VARCHAR(50),
    role VARCHAR(50) DEFAULT 'customer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. MENU ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    category VARCHAR(100) NOT NULL,
    image_url TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id VARCHAR(255) NOT NULL,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'pending',
    total_amount NUMERIC(10, 2) NOT NULL,
    delivery_address TEXT NOT NULL,
    delivery_latitude DOUBLE PRECISION,
    delivery_longitude DOUBLE PRECISION,
    delivery_phone VARCHAR(50),
    delivery_otp VARCHAR(10),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price_at_order NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. DELIVERIES TABLE (Rider Assignments)
CREATE TABLE IF NOT EXISTS public.deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    rider_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'assigned',
    pickup_time TIMESTAMP WITH TIME ZONE,
    delivered_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. USER PUSH TOKENS TABLE
CREATE TABLE IF NOT EXISTS public.user_push_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    expo_push_token TEXT NOT NULL,
    device_os VARCHAR(50),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_role UNIQUE (user_id, role)
);

-- 8. REVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    customer_name VARCHAR(255),
    order_rating INTEGER CHECK (order_rating >= 1 AND order_rating <= 5),
    order_text TEXT,
    delivery_rating INTEGER CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
    delivery_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. RIDER PAYOUTS TABLE
CREATE TABLE IF NOT EXISTS public.rider_payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rider_id VARCHAR(255) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ====================================================================
-- INITIAL SEED DATA
-- ====================================================================

-- Insert Default Branches
INSERT INTO public.branches (id, name, address, latitude, longitude, rating, delivery_time, is_active)
VALUES 
('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Hotel Bet - Main Kitchen', 'City Center Hub, Sector 4', 18.5204, 73.8567, 4.9, '20-30 min', TRUE),
('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'Hotel Bet - Express Hub', 'West End Galleria, Park Road', 18.5314, 73.8447, 4.8, '15-25 min', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Insert Default Menu Items
INSERT INTO public.menu_items (branch_id, name, description, price, category, is_available)
VALUES
('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Royal Butter Chicken', 'Tender chicken simmered in rich creamy tomato butter gravy', 340.00, 'Starters', TRUE),
('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Dal Makhani Gold', 'Black lentils slow cooked overnight with butter and fresh cream', 240.00, 'Starters', TRUE),
('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Paneer Tikka Masala', 'Charcoal grilled cottage cheese in spiced gravy', 290.00, 'Starters', TRUE),
('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Hyderabadi Dum Biryani', 'Fragrant basmati rice layered with marinated chicken & spices', 320.00, 'Main Course', TRUE),
('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Garlic Naan Basket', 'Butter glazed tandoori naan infused with roasted garlic', 80.00, 'Main Course', TRUE),
('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Gulab Jamun Saffron', 'Soft cottage cheese dumplings soaked in cardamom saffron syrup', 140.00, 'Desserts', TRUE),
('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Mango Lassi Delight', 'Thick creamy yoghurt blend with fresh Alphonso mango pulp', 120.00, 'Beverages', TRUE)
ON CONFLICT DO NOTHING;

-- Row Level Security (RLS) Policies - Grant Anon Read Access
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read branches" ON public.branches FOR SELECT USING (true);
CREATE POLICY "Allow public read menu_items" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Allow public insert orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Allow public insert order_items" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read order_items" ON public.order_items FOR SELECT USING (true);
CREATE POLICY "Allow public insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read profiles" ON public.profiles FOR SELECT USING (true);

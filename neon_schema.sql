-- ====================================================================
-- FLEXI MEAL - COMPLETE NEON POSTGRES DATABASE SCHEMA & SEED SCRIPT
-- Copy and paste this script inside your Neon SQL Editor (console.neon.tech)
-- ====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. MESSES TABLE (Campus Partner Messes & Restaurants)
CREATE TABLE IF NOT EXISTS public.messes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION DEFAULT 18.5204,
    longitude DOUBLE PRECISION DEFAULT 73.8567,
    rating NUMERIC(3, 2) DEFAULT 4.8,
    distance VARCHAR(100) DEFAULT '250m (3 min walk)',
    star_dish TEXT DEFAULT 'Special Shahi Paneer & Butter Naan',
    image_url TEXT,
    highlights TEXT[] DEFAULT ARRAY['Shahi Paneer', 'Dal Makhani', 'Garlic Naan', 'Jeera Rice', 'Gulab Jamun'],
    cutoff_time VARCHAR(50) DEFAULT '2:15 PM',
    type VARCHAR(100) DEFAULT 'Pure Veg',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. PROFILES TABLE (Customers, Mess Owners, Riders)
CREATE TABLE IF NOT EXISTS public.profiles (
    id VARCHAR(255) PRIMARY KEY,
    full_name VARCHAR(255),
    phone_number VARCHAR(50),
    role VARCHAR(50) DEFAULT 'customer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. MEAL PASSES TABLE (Customer Active Pass & Token Balances)
CREATE TABLE IF NOT EXISTS public.meal_passes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL UNIQUE,
    plan_name VARCHAR(255) DEFAULT 'No Active Subscription',
    total_tokens INTEGER DEFAULT 0,
    remaining_tokens INTEGER DEFAULT 0,
    total_skips INTEGER DEFAULT 0,
    remaining_skips INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. MEAL BOOKINGS TABLE (Live Pre-Booked OTP Meals)
CREATE TABLE IF NOT EXISTS public.meal_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    mess_id UUID REFERENCES public.messes(id) ON DELETE CASCADE,
    meal_type VARCHAR(50) NOT NULL DEFAULT 'Lunch',
    otp VARCHAR(20) NOT NULL,
    otp_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    cutoff_time VARCHAR(50) DEFAULT '2:15 PM',
    status VARCHAR(50) DEFAULT 'booked',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. MEAL HISTORY TABLE (Ledger History of Debits, Credits & Skips)
CREATE TABLE IF NOT EXISTS public.meal_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    mess_name VARCHAR(255) NOT NULL,
    meal_type VARCHAR(50) NOT NULL DEFAULT 'Lunch',
    status VARCHAR(50) NOT NULL DEFAULT 'completed',
    tokens_used INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. REVIEWS TABLE (Mess Food & Hygiene Ratings)
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mess_id UUID REFERENCES public.messes(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) DEFAULT 'Verified Student',
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ====================================================================
-- INITIAL SEED DATA
-- ====================================================================

-- Insert Default Campus Messes
INSERT INTO public.messes (id, name, address, latitude, longitude, rating, distance, star_dish, image_url, highlights, cutoff_time, type, is_active)
VALUES 
(
  'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  'Annapurna Campus Mess',
  'Gate 2, North Campus',
  18.5204,
  73.8567,
  4.9,
  '250m (3 min walk)',
  'Special Shahi Paneer & Butter Naan',
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
  ARRAY['Shahi Paneer', 'Dal Makhani', 'Garlic Naan', 'Jeera Rice', 'Gulab Jamun'],
  '2:15 PM',
  'Pure Veg',
  TRUE
),
(
  'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
  'Royal Spice Dining Hall',
  'Hostel Block B Road',
  18.5314,
  73.8447,
  4.8,
  '450m (5 min walk)',
  'Hyderabadi Chicken Biryani',
  'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80',
  ARRAY['Chicken Dum Biryani', 'Mirchi Ka Salan', 'Raita', 'Double Ka Meetha'],
  '2:30 PM',
  'Non-Veg & Veg',
  TRUE
),
(
  'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f',
  'Green Leaf Premium Mess',
  'University Circle, West Campus',
  18.5114,
  73.8347,
  4.7,
  '600m (7 min walk)',
  'Kathiyawadi Thali Special',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
  ARRAY['Sev Tamatar', 'Baingan Bharta', 'Phulka Roti', 'Chaas', 'Jalebi'],
  '2:00 PM',
  'Kathiyawadi Veg',
  TRUE
),
(
  'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a',
  'Campus Cloud Kitchen',
  'East Tech Hub, Block D',
  18.5414,
  73.8247,
  4.8,
  '350m (4 min walk)',
  'Paneer Butter Masala Box',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
  ARRAY['Paneer Butter Masala', 'Jeera Rice', 'Butter Roti', 'Sweet Kheer'],
  '2:45 PM',
  'Express Veg',
  TRUE
),
(
  'e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b',
  'Spice Route Punjabi Mess',
  'South Gate Hostel Square',
  18.5014,
  73.8647,
  4.9,
  '500m (6 min walk)',
  'Amritsari Kulcha & Chole',
  'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80',
  ARRAY['Amritsari Stuffed Kulcha', 'Pindi Chole', 'Lassi', 'Sweet Boondi'],
  '2:20 PM',
  'Punjabi Special',
  TRUE
)
ON CONFLICT (id) DO NOTHING;

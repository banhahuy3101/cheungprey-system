-- Migration: membership_enhancements
-- Created: 2026-08-10 19:10:00 UTC
--
-- Adds extended membership tables: demographics, dues, status history,
-- activity tracking, position history, and membership cards.

-- 0. Extend members table with lifecycle / type fields
ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS membership_type VARCHAR(30) DEFAULT 'Full' CHECK (membership_type IN ('Full', 'Associate', 'Youth', 'Honorary', 'Probationary')),
ADD COLUMN IF NOT EXISTS membership_tier VARCHAR(20) DEFAULT 'Basic' CHECK (membership_tier IN ('Basic', 'Silver', 'Gold', 'Platinum')),
ADD COLUMN IF NOT EXISTS resignation_date DATE,
ADD COLUMN IF NOT EXISTS expulsion_reason TEXT,
ADD COLUMN IF NOT EXISTS exempt_from_dues BOOLEAN DEFAULT false;

-- Drop old status constraint, add Pending + Resigned
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS members_status_check;
ALTER TABLE public.members ADD CONSTRAINT members_status_check
    CHECK (status IN ('Pending', 'Active', 'Suspended', 'Resigned', 'Expelled', 'Deceased'));

-- 1. Member Demographics (extended profile fields)
CREATE TABLE IF NOT EXISTS public.member_demographics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL UNIQUE REFERENCES public.members(id) ON DELETE CASCADE,
    photo_url TEXT,
    marital_status VARCHAR(20) CHECK (marital_status IN ('Single', 'Married', 'Divorced', 'Widowed')),
    occupation VARCHAR(100),
    education_level VARCHAR(30) CHECK (education_level IN ('None', 'Primary', 'Secondary', 'HighSchool', 'Bachelor', 'Master', 'PhD')),
    ethnicity VARCHAR(50),
    religion VARCHAR(30) CHECK (religion IN ('Buddhist', 'Muslim', 'Christian', 'Other')),
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(15),
    blood_type VARCHAR(3) CHECK (blood_type IN ('A', 'B', 'AB', 'O')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Member Dues / Payments
CREATE TABLE IF NOT EXISTS public.member_dues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('Cash', 'Bakong/KHQR', 'BankTransfer', 'Other')),
    payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    payment_status VARCHAR(20) DEFAULT 'Paid' CHECK (payment_status IN ('Paid', 'Partial', 'Overdue')),
    reference_number VARCHAR(100),
    notes TEXT,
    recorded_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Member Status History (audit log)
CREATE TABLE IF NOT EXISTS public.member_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    old_status VARCHAR(20) NOT NULL,
    new_status VARCHAR(20) NOT NULL,
    reason TEXT,
    changed_by UUID REFERENCES public.profiles(id),
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Member Activity Tracking
CREATE TABLE IF NOT EXISTS public.member_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    activity_type VARCHAR(30) NOT NULL CHECK (activity_type IN ('Meeting', 'Event', 'Training', 'Volunteer', 'Donation', 'Recruitment', 'CheckIn', 'Other')),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    activity_date DATE NOT NULL,
    hours NUMERIC(5, 1) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Member Position/Role History
CREATE TABLE IF NOT EXISTS public.member_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    party_role VARCHAR(100) NOT NULL,
    position_title VARCHAR(150),
    committee VARCHAR(100),
    rank INTEGER,
    structure_id UUID REFERENCES public.party_structures(id),
    start_date DATE NOT NULL,
    end_date DATE,
    is_current BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Membership Cards
CREATE TABLE IF NOT EXISTS public.member_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    card_no VARCHAR(30) UNIQUE NOT NULL,
    card_status VARCHAR(20) DEFAULT 'Issued' CHECK (card_status IN ('Pending', 'Issued', 'Delivered', 'Expired', 'Replaced')),
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    expired_at TIMESTAMPTZ,
    replaced_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_demographics_member ON public.member_demographics(member_id);
CREATE INDEX IF NOT EXISTS idx_dues_member ON public.member_dues(member_id);
CREATE INDEX IF NOT EXISTS idx_dues_date ON public.member_dues(payment_date);
CREATE INDEX IF NOT EXISTS idx_dues_status ON public.member_dues(payment_status);
CREATE INDEX IF NOT EXISTS idx_status_history_member ON public.member_status_history(member_id);
CREATE INDEX IF NOT EXISTS idx_status_history_date ON public.member_status_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_activity_member ON public.member_activity(member_id);
CREATE INDEX IF NOT EXISTS idx_activity_date ON public.member_activity(activity_date);
CREATE INDEX IF NOT EXISTS idx_activity_type ON public.member_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_positions_member ON public.member_positions(member_id);
CREATE INDEX IF NOT EXISTS idx_positions_current ON public.member_positions(is_current);
CREATE INDEX IF NOT EXISTS idx_cards_member ON public.member_cards(member_id);
CREATE INDEX IF NOT EXISTS idx_cards_status ON public.member_cards(card_status);

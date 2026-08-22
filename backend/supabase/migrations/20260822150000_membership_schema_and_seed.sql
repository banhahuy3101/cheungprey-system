-- Migration: Complete Idempotent Schema and Seed for Membership Module
-- Timestamp: 20260822150000

BEGIN;

-- =============================================================================
-- 1. CORE MEMBERS MASTER TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_card_no VARCHAR(30) UNIQUE NOT NULL,
    national_id VARCHAR(30) UNIQUE,
    last_name_kh VARCHAR(50) NOT NULL,
    first_name_kh VARCHAR(50) NOT NULL,
    last_name_en VARCHAR(50) NOT NULL,
    first_name_en VARCHAR(50) NOT NULL,
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
    date_of_birth DATE NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    telegram_username VARCHAR(50),
    registered_village_code VARCHAR(8) REFERENCES public.geographic_zones(zone_code),
    current_address_details TEXT,
    structure_id UUID REFERENCES public.party_structures(id),
    party_role VARCHAR(100) DEFAULT 'Member',
    join_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Active'
        CHECK (status IN ('Pending', 'Active', 'Suspended', 'Resigned', 'Expelled', 'Deceased')),
    membership_type VARCHAR(30) DEFAULT 'Full' 
        CHECK (membership_type IN ('Full', 'Associate', 'Youth', 'Honorary', 'Probationary')),
    membership_tier VARCHAR(20) DEFAULT 'Basic' 
        CHECK (membership_tier IN ('Basic', 'Silver', 'Gold', 'Platinum')),
    resignation_date DATE,
    expulsion_reason TEXT,
    exempt_from_dues BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_members_status ON public.members(status);
CREATE INDEX IF NOT EXISTS idx_members_village ON public.members(registered_village_code);
CREATE INDEX IF NOT EXISTS idx_members_national_id ON public.members(national_id) WHERE national_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_members_card_no ON public.members(membership_card_no);

-- =============================================================================
-- 2. MEMBER DEMOGRAPHICS (EXTENDED PROFILE)
-- =============================================================================
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_demographics_member ON public.member_demographics(member_id);

-- =============================================================================
-- 3. MEMBER DUES & PAYMENTS
-- =============================================================================
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dues_member ON public.member_dues(member_id);
CREATE INDEX IF NOT EXISTS idx_dues_date ON public.member_dues(payment_date);
CREATE INDEX IF NOT EXISTS idx_dues_status ON public.member_dues(payment_status);

-- =============================================================================
-- 4. MEMBER STATUS HISTORY (AUDIT LOG)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.member_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    old_status VARCHAR(20) NOT NULL,
    new_status VARCHAR(20) NOT NULL,
    reason TEXT,
    changed_by UUID REFERENCES public.profiles(id),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_status_history_member ON public.member_status_history(member_id);
CREATE INDEX IF NOT EXISTS idx_status_history_date ON public.member_status_history(changed_at);

-- =============================================================================
-- 5. MEMBER ACTIVITY TRACKING
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.member_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    activity_type VARCHAR(30) NOT NULL CHECK (activity_type IN ('Meeting', 'Event', 'Training', 'Volunteer', 'Donation', 'Recruitment', 'CheckIn', 'Other')),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    activity_date DATE NOT NULL,
    hours NUMERIC(5, 1) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_member ON public.member_activity(member_id);
CREATE INDEX IF NOT EXISTS idx_activity_date ON public.member_activity(activity_date);
CREATE INDEX IF NOT EXISTS idx_activity_type ON public.member_activity(activity_type);

-- =============================================================================
-- 6. MEMBER POSITIONS & ROLES
-- =============================================================================
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_positions_member ON public.member_positions(member_id);
CREATE INDEX IF NOT EXISTS idx_positions_current ON public.member_positions(is_current);

-- =============================================================================
-- 7. MEMBERSHIP CARDS LIFECYCLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.member_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    card_no VARCHAR(30) UNIQUE NOT NULL,
    card_status VARCHAR(20) DEFAULT 'Issued' CHECK (card_status IN ('Pending', 'Issued', 'Delivered', 'Expired', 'Replaced')),
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    expired_at TIMESTAMPTZ,
    replaced_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cards_member ON public.member_cards(member_id);

-- =============================================================================
-- 8. MEMBER REGISTRATION QUEUE (VERIFICATION FLOW)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.member_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_no VARCHAR(40) NOT NULL UNIQUE,
    member_id UUID UNIQUE REFERENCES public.members(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'PENDING_VERIFICATION', 'VERIFIED', 'APPROVED', 'REJECTED')),
    registration_pathway VARCHAR(20) NOT NULL DEFAULT 'Geographical'
        CHECK (registration_pathway IN ('Geographical', 'Institutional')),
    institutional_unit TEXT,
    national_id VARCHAR(30),
    last_name_kh VARCHAR(50),
    first_name_kh VARCHAR(50),
    last_name_en VARCHAR(50),
    first_name_en VARCHAR(50),
    gender VARCHAR(10) CHECK (gender IN ('Male', 'Female', 'Other')),
    date_of_birth DATE,
    phone_number VARCHAR(20),
    email VARCHAR(100),
    current_address_details TEXT,
    registered_village_code VARCHAR(8) REFERENCES public.geographic_zones(zone_code),
    party_role VARCHAR(100) DEFAULT 'Member',
    join_date DATE,
    membership_type VARCHAR(30) DEFAULT 'Full',
    membership_tier VARCHAR(20) DEFAULT 'Basic',
    exempt_from_dues BOOLEAN NOT NULL DEFAULT false,
    marital_status VARCHAR(30),
    occupation TEXT,
    education_level VARCHAR(50),
    ethnicity VARCHAR(100),
    religion VARCHAR(50),
    blood_type VARCHAR(10),
    emergency_contact_name VARCHAR(150),
    emergency_contact_phone VARCHAR(20),
    created_by UUID REFERENCES auth.users(id),
    submitted_by UUID REFERENCES auth.users(id),
    submitted_at TIMESTAMPTZ,
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_member_registrations_status ON public.member_registrations(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_member_registrations_national_id ON public.member_registrations(national_id) WHERE national_id IS NOT NULL;

-- =============================================================================
-- 9. REGISTRATION ATTACHMENTS & DOCUMENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.member_registration_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL REFERENCES public.member_registrations(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES public.party_files(id) ON DELETE CASCADE,
    document_type VARCHAR(30) NOT NULL
        CHECK (document_type IN ('portrait', 'national_id_front', 'national_id_back', 'application_form')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (registration_id, document_type)
);

CREATE INDEX IF NOT EXISTS idx_member_registration_documents_registration ON public.member_registration_documents(registration_id);

-- =============================================================================
-- 10. REGISTRATION EVENTS & AUDIT LOG
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.member_registration_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL REFERENCES public.member_registrations(id) ON DELETE CASCADE,
    action VARCHAR(40) NOT NULL,
    from_status VARCHAR(30),
    to_status VARCHAR(30),
    notes TEXT,
    performed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_member_registration_events_registration ON public.member_registration_events(registration_id, created_at);

-- =============================================================================
-- IDEMPOTENT SEED DATA (SAFE CONDITIONAL INSERTS WITH DYNAMIC VILLAGE CODE)
-- =============================================================================
INSERT INTO public.members (
    membership_card_no, national_id, last_name_kh, first_name_kh, 
    last_name_en, first_name_en, gender, date_of_birth, phone_number, 
    email, telegram_username, registered_village_code, current_address_details, 
    structure_id, party_role, join_date, status, membership_type, membership_tier, 
    resignation_date, expulsion_reason, exempt_from_dues, created_at, updated_at
)
SELECT 'MEM-001', '010203040501', 'សុខ', 'សុភាព', 'Sok', 'Sopheap', 'Male', '1985-03-12'::date, '0123456789', 'sopheap.sok@email.com', '@sopheap_sok', (SELECT zone_code FROM public.geographic_zones LIMIT 1), '#12, St 310, Toul Svay Prey', NULL, 'Member', '2010-05-20'::date, 'Active', 'Full', 'Gold', NULL, NULL, false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.members WHERE membership_card_no = 'MEM-001' OR national_id = '010203040501');

INSERT INTO public.members (
    membership_card_no, national_id, last_name_kh, first_name_kh, 
    last_name_en, first_name_en, gender, date_of_birth, phone_number, 
    email, telegram_username, registered_village_code, current_address_details, 
    structure_id, party_role, join_date, status, membership_type, membership_tier, 
    resignation_date, expulsion_reason, exempt_from_dues, created_at, updated_at
)
SELECT 'MEM-002', '010203040502', 'ចាន់', 'សុភ័ក្រ', 'Chan', 'Sophak', 'Female', '1990-07-25'::date, '0987654321', 'sophak.chan@email.com', '@sophak_chan', (SELECT zone_code FROM public.geographic_zones LIMIT 1), '#45, St 154, Wat Phnom', NULL, 'Vice-Chair', '2015-11-10'::date, 'Active', 'Full', 'Silver', NULL, NULL, false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.members WHERE membership_card_no = 'MEM-002' OR national_id = '010203040502');

INSERT INTO public.members (
    membership_card_no, national_id, last_name_kh, first_name_kh, 
    last_name_en, first_name_en, gender, date_of_birth, phone_number, 
    email, telegram_username, registered_village_code, current_address_details, 
    structure_id, party_role, join_date, status, membership_type, membership_tier, 
    resignation_date, expulsion_reason, exempt_from_dues, created_at, updated_at
)
SELECT 'MEM-003', '010203040503', 'អ៊ឹង', 'សុផាន', 'Ueng', 'Sophan', 'Male', '1978-12-01'::date, '0112233445', 'sophan.ueng@email.com', '@sophan_ueng', (SELECT zone_code FROM public.geographic_zones LIMIT 1), '#78, St 200, Boeung Keng Kang', NULL, 'Secretary', '2008-08-15'::date, 'Active', 'Honorary', 'Platinum', NULL, NULL, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.members WHERE membership_card_no = 'MEM-003' OR national_id = '010203040503');

INSERT INTO public.members (
    membership_card_no, national_id, last_name_kh, first_name_kh, 
    last_name_en, first_name_en, gender, date_of_birth, phone_number, 
    email, telegram_username, registered_village_code, current_address_details, 
    structure_id, party_role, join_date, status, membership_type, membership_tier, 
    resignation_date, expulsion_reason, exempt_from_dues, created_at, updated_at
)
SELECT 'MEM-004', '010203040504', 'ម៉ៅ', 'សុវណ្ណ', 'Mao', 'Sovanna', 'Male', '1995-09-30'::date, '0155667788', 'sovanna.mao@email.com', '@sovanna_mao', (SELECT zone_code FROM public.geographic_zones LIMIT 1), '#23, St 271, Toul Tom Poung', NULL, 'Member', '2018-02-14'::date, 'Active', 'Full', 'Basic', NULL, NULL, false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.members WHERE membership_card_no = 'MEM-004' OR national_id = '010203040504');

INSERT INTO public.members (
    membership_card_no, national_id, last_name_kh, first_name_kh, 
    last_name_en, first_name_en, gender, date_of_birth, phone_number, 
    email, telegram_username, registered_village_code, current_address_details, 
    structure_id, party_role, join_date, status, membership_type, membership_tier, 
    resignation_date, expulsion_reason, exempt_from_dues, created_at, updated_at
)
SELECT 'MEM-005', '010203040505', 'ផល', 'សុភាព', 'Phal', 'Sopheap', 'Female', '2000-01-20'::date, '0177889900', 'sopheap.phal@email.com', '@sopheap_phal', (SELECT zone_code FROM public.geographic_zones LIMIT 1), '#56, St 115, Boeung Trabek', NULL, 'Youth Lead', '2020-06-01'::date, 'Active', 'Youth', 'Gold', NULL, NULL, false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.members WHERE membership_card_no = 'MEM-005' OR national_id = '010203040505');

COMMIT;

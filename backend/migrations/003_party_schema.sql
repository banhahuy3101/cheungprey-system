-- Geographic Zones (unified NEC-aligned boundaries)
CREATE TABLE public.geographic_zones (
    zone_code VARCHAR(8) PRIMARY KEY,
    name_kh VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    zone_type VARCHAR(20) NOT NULL CHECK (zone_type IN ('Province', 'District', 'Commune', 'Village')),
    parent_code VARCHAR(8) REFERENCES public.geographic_zones(zone_code),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Party Structures / Internal Hierarchy
CREATE TABLE public.party_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    structure_name_kh VARCHAR(150) NOT NULL,
    structure_name_en VARCHAR(150) NOT NULL,
    zone_code VARCHAR(8) NOT NULL REFERENCES public.geographic_zones(zone_code),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Members
CREATE TABLE public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_card_no VARCHAR(30) UNIQUE NOT NULL,
    national_id VARCHAR(30) UNIQUE,

    last_name_kh VARCHAR(50) NOT NULL,
    first_name_kh VARCHAR(50) NOT NULL,
    last_name_en VARCHAR(50) NOT NULL,
    first_name_en VARCHAR(50) NOT NULL,

    gender VARCHAR(10) NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
    date_of_birth DATE NOT NULL,

    phone_number VARCHAR(15) NOT NULL,
    email VARCHAR(100) UNIQUE,
    telegram_username VARCHAR(50),

    registered_village_code VARCHAR(8) NOT NULL REFERENCES public.geographic_zones(zone_code),
    current_address_details TEXT,

    structure_id UUID REFERENCES public.party_structures(id),
    party_role VARCHAR(100) DEFAULT 'Member',
    join_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended', 'Expelled', 'Deceased')),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Voter Insights (campaign tracking)
CREATE TABLE public.voter_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    last_name_kh VARCHAR(50) NOT NULL,
    first_name_kh VARCHAR(50) NOT NULL,
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('Male', 'Female')),
    commune_code VARCHAR(8) NOT NULL REFERENCES public.geographic_zones(zone_code),
    polling_station_code VARCHAR(10),
    voter_sentiment VARCHAR(30) DEFAULT 'Undecided' CHECK (voter_sentiment IN ('Strong Support', 'Leaning Support', 'Undecided', 'Opposed')),
    last_contacted_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Party Finances
CREATE TABLE public.party_finances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES public.members(id),
    contributor_name_kh VARCHAR(150),
    contributor_name_en VARCHAR(150),
    transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN ('Membership Fee', 'Donation', 'Event Fundraising', 'Expense')),
    amount_usd DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    amount_khr DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('Bakong/KHQR', 'Cash', 'Bank Transfer', 'Other')),
    reference_number VARCHAR(100),
    transaction_date TIMESTAMPTZ NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_member_location ON public.members(registered_village_code);
CREATE INDEX idx_member_names ON public.members(last_name_kh, first_name_kh);
CREATE INDEX idx_voter_sentiment ON public.voter_insights(commune_code, voter_sentiment);
CREATE INDEX idx_member_structure ON public.members(structure_id);
CREATE INDEX idx_finance_member ON public.party_finances(member_id);
CREATE INDEX idx_finance_date ON public.party_finances(transaction_date);
CREATE INDEX idx_zone_parent ON public.geographic_zones(parent_code);

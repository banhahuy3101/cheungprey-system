-- Dedicated draft, verification, approval, and document workflow for new members.
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

CREATE INDEX IF NOT EXISTS idx_member_registrations_status
    ON public.member_registrations(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_member_registrations_national_id
    ON public.member_registrations(national_id)
    WHERE national_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.member_registration_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL REFERENCES public.member_registrations(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES public.party_files(id) ON DELETE CASCADE,
    document_type VARCHAR(30) NOT NULL
        CHECK (document_type IN ('portrait', 'national_id_front', 'national_id_back', 'application_form')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (registration_id, document_type)
);

CREATE INDEX IF NOT EXISTS idx_member_registration_documents_registration
    ON public.member_registration_documents(registration_id);

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

CREATE INDEX IF NOT EXISTS idx_member_registration_events_registration
    ON public.member_registration_events(registration_id, created_at);

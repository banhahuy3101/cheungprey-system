-- Create user_role enum
CREATE TYPE user_role AS ENUM (
    'super_admin',
    'admin',
    'district_chief',
    'commune_chief',
    'commune_clerk',
    'village_chief',
    'recorder',
    'regular_user'
);

-- Administrative hierarchy
CREATE TABLE public.provinces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_kh TEXT NOT NULL,
    name_en TEXT NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.districts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    province_id UUID REFERENCES public.provinces(id) ON DELETE CASCADE,
    name_kh TEXT NOT NULL,
    name_en TEXT NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.communes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    district_id UUID REFERENCES public.districts(id) ON DELETE CASCADE,
    name_kh TEXT NOT NULL,
    name_en TEXT NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.villages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commune_id UUID REFERENCES public.communes(id) ON DELETE CASCADE,
    name_kh TEXT NOT NULL,
    name_en TEXT NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone_number TEXT UNIQUE,
    commune_id UUID REFERENCES public.communes(id),
    village_id UUID REFERENCES public.villages(id),
    role user_role NOT NULL DEFAULT 'recorder',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Records table
CREATE TABLE public.records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    data JSONB,
    commune_id UUID REFERENCES public.communes(id),
    village_id UUID REFERENCES public.villages(id),
    created_by UUID REFERENCES auth.users(id),
    status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_commune ON public.profiles(commune_id);
CREATE INDEX idx_records_commune ON public.records(commune_id);
CREATE INDEX idx_records_village ON public.records(village_id);
CREATE INDEX idx_records_created_by ON public.records(created_by);
CREATE INDEX idx_districts_province ON public.districts(province_id);
CREATE INDEX idx_communes_district ON public.communes(district_id);
CREATE INDEX idx_villages_commune ON public.villages(commune_id);

CREATE TABLE public.party_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    base64_content TEXT NOT NULL,
    file_size INT NOT NULL,
    member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
    uploaded_by UUID REFERENCES auth.users(id),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_party_files_member ON public.party_files(member_id);
CREATE INDEX idx_party_files_uploader ON public.party_files(uploaded_by);

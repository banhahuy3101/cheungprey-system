package models

import (
	"time"

	"github.com/google/uuid"
)

const (
	RegistrationDraft       = "DRAFT"
	RegistrationPending     = "PENDING_VERIFICATION"
	RegistrationVerified    = "VERIFIED"
	RegistrationApproved    = "APPROVED"
	RegistrationRejected    = "REJECTED"
	PathwayGeographical     = "Geographical"
	PathwayInstitutional    = "Institutional"
	DocumentPortrait        = "portrait"
	DocumentNationalIDFront = "national_id_front"
	DocumentNationalIDBack  = "national_id_back"
	DocumentApplicationForm = "application_form"
)

type MemberRegistration struct {
	ID                    uuid.UUID  `json:"id"`
	RegistrationNo        string     `json:"registration_no"`
	MemberID              *uuid.UUID `json:"member_id,omitempty"`
	Status                string     `json:"status"`
	RegistrationPathway   string     `json:"registration_pathway"`
	InstitutionalUnit     string     `json:"institutional_unit,omitempty"`
	NationalID            string     `json:"national_id,omitempty"`
	LastNameKh            string     `json:"last_name_kh,omitempty"`
	FirstNameKh           string     `json:"first_name_kh,omitempty"`
	LastNameEn            string     `json:"last_name_en,omitempty"`
	FirstNameEn           string     `json:"first_name_en,omitempty"`
	Gender                string     `json:"gender,omitempty"`
	DateOfBirth           string     `json:"date_of_birth,omitempty"`
	PhoneNumber           string     `json:"phone_number,omitempty"`
	Email                 string     `json:"email,omitempty"`
	CurrentAddressDetails string     `json:"current_address_details,omitempty"`
	RegisteredVillageCode string     `json:"registered_village_code,omitempty"`
	PartyRole             string     `json:"party_role,omitempty"`
	JoinDate              string     `json:"join_date,omitempty"`
	MembershipType        string     `json:"membership_type,omitempty"`
	MembershipTier        string     `json:"membership_tier,omitempty"`
	ExemptFromDues        bool       `json:"exempt_from_dues"`
	MaritalStatus         string     `json:"marital_status,omitempty"`
	Occupation            string     `json:"occupation,omitempty"`
	EducationLevel        string     `json:"education_level,omitempty"`
	Ethnicity             string     `json:"ethnicity,omitempty"`
	Religion              string     `json:"religion,omitempty"`
	BloodType             string     `json:"blood_type,omitempty"`
	EmergencyContactName  string     `json:"emergency_contact_name,omitempty"`
	EmergencyContactPhone string     `json:"emergency_contact_phone,omitempty"`
	CreatedBy             *uuid.UUID `json:"created_by,omitempty"`
	SubmittedBy           *uuid.UUID `json:"submitted_by,omitempty"`
	SubmittedAt           *time.Time `json:"submitted_at,omitempty"`
	VerifiedBy            *uuid.UUID `json:"verified_by,omitempty"`
	VerifiedAt            *time.Time `json:"verified_at,omitempty"`
	ApprovedBy            *uuid.UUID `json:"approved_by,omitempty"`
	ApprovedAt            *time.Time `json:"approved_at,omitempty"`
	RejectionReason       string     `json:"rejection_reason,omitempty"`
	CreatedAt             time.Time  `json:"created_at"`
	UpdatedAt             time.Time  `json:"updated_at"`
}

type SaveMemberRegistrationRequest struct {
	RegistrationPathway   string `json:"registration_pathway,omitempty"`
	InstitutionalUnit     string `json:"institutional_unit,omitempty"`
	NationalID            string `json:"national_id,omitempty"`
	LastNameKh            string `json:"last_name_kh,omitempty"`
	FirstNameKh           string `json:"first_name_kh,omitempty"`
	LastNameEn            string `json:"last_name_en,omitempty"`
	FirstNameEn           string `json:"first_name_en,omitempty"`
	Gender                string `json:"gender,omitempty"`
	DateOfBirth           string `json:"date_of_birth,omitempty"`
	PhoneNumber           string `json:"phone_number,omitempty"`
	Email                 string `json:"email,omitempty"`
	CurrentAddressDetails string `json:"current_address_details,omitempty"`
	RegisteredVillageCode string `json:"registered_village_code,omitempty"`
	PartyRole             string `json:"party_role,omitempty"`
	JoinDate              string `json:"join_date,omitempty"`
	MembershipType        string `json:"membership_type,omitempty"`
	MembershipTier        string `json:"membership_tier,omitempty"`
	ExemptFromDues        bool   `json:"exempt_from_dues"`
	MaritalStatus         string `json:"marital_status,omitempty"`
	Occupation            string `json:"occupation,omitempty"`
	EducationLevel        string `json:"education_level,omitempty"`
	Ethnicity             string `json:"ethnicity,omitempty"`
	Religion              string `json:"religion,omitempty"`
	BloodType             string `json:"blood_type,omitempty"`
	EmergencyContactName  string `json:"emergency_contact_name,omitempty"`
	EmergencyContactPhone string `json:"emergency_contact_phone,omitempty"`
}

type UploadRegistrationDocumentRequest struct {
	DocumentType string `json:"document_type" binding:"required"`
	FileName     string `json:"file_name" binding:"required"`
	MimeType     string `json:"mime_type" binding:"required"`
	Base64Data   string `json:"base64_data" binding:"required"`
}

type MemberRegistrationDocument struct {
	ID             uuid.UUID `json:"id"`
	RegistrationID uuid.UUID `json:"registration_id"`
	FileID         uuid.UUID `json:"file_id"`
	DocumentType   string    `json:"document_type"`
	FileName       string    `json:"file_name,omitempty"`
	MimeType       string    `json:"mime_type,omitempty"`
	FileSize       int       `json:"file_size,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
}

type MemberRegistrationEvent struct {
	ID             uuid.UUID  `json:"id"`
	RegistrationID uuid.UUID  `json:"registration_id"`
	Action         string     `json:"action"`
	FromStatus     string     `json:"from_status,omitempty"`
	ToStatus       string     `json:"to_status,omitempty"`
	Notes          string     `json:"notes,omitempty"`
	PerformedBy    *uuid.UUID `json:"performed_by,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
}

type RegistrationDecisionRequest struct {
	Notes  string `json:"notes,omitempty"`
	Reason string `json:"reason,omitempty"`
}

type MemberRegistrationDetail struct {
	Registration *MemberRegistration          `json:"registration"`
	Documents    []MemberRegistrationDocument `json:"documents"`
	Events       []MemberRegistrationEvent    `json:"events"`
}

package models

import (
	"time"

	"github.com/google/uuid"
)

type MemberDemographics struct {
	ID                    uuid.UUID  `json:"id"`
	MemberID              uuid.UUID  `json:"member_id"`
	PhotoURL              *string    `json:"photo_url,omitempty"`
	MaritalStatus         *string    `json:"marital_status,omitempty"`
	Occupation            *string    `json:"occupation,omitempty"`
	EducationLevel        *string    `json:"education_level,omitempty"`
	Ethnicity             *string    `json:"ethnicity,omitempty"`
	Religion              *string    `json:"religion,omitempty"`
	EmergencyContactName  *string    `json:"emergency_contact_name,omitempty"`
	EmergencyContactPhone *string    `json:"emergency_contact_phone,omitempty"`
	BloodType             *string    `json:"blood_type,omitempty"`
	CreatedAt             time.Time  `json:"created_at"`
	UpdatedAt             time.Time  `json:"updated_at"`
}

type UpdateDemographicsRequest struct {
	MaritalStatus         string `json:"marital_status,omitempty"`
	Occupation            string `json:"occupation,omitempty"`
	EducationLevel        string `json:"education_level,omitempty"`
	Ethnicity             string `json:"ethnicity,omitempty"`
	Religion              string `json:"religion,omitempty"`
	EmergencyContactName  string `json:"emergency_contact_name,omitempty"`
	EmergencyContactPhone string `json:"emergency_contact_phone,omitempty"`
	BloodType             string `json:"blood_type,omitempty"`
}

type MemberDue struct {
	ID              uuid.UUID  `json:"id"`
	MemberID        uuid.UUID  `json:"member_id"`
	Amount          float64    `json:"amount"`
	PaymentMethod   string     `json:"payment_method"`
	PaymentDate     time.Time  `json:"payment_date"`
	PaymentStatus   string     `json:"payment_status"`
	ReferenceNumber *string    `json:"reference_number,omitempty"`
	Notes           *string    `json:"notes,omitempty"`
	RecordedBy      *uuid.UUID `json:"recorded_by,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
}

type RecordDueRequest struct {
	Amount          float64 `json:"amount" binding:"required,gt=0"`
	PaymentMethod   string  `json:"payment_method" binding:"required,oneof=Cash Bakong/KHQR BankTransfer Other"`
	PaymentDate     string  `json:"payment_date" binding:"required"`
	PaymentStatus   string  `json:"payment_status,omitempty"`
	ReferenceNumber string  `json:"reference_number,omitempty"`
	Notes           string  `json:"notes,omitempty"`
}

type MemberStatusHistory struct {
	ID        uuid.UUID  `json:"id"`
	MemberID  uuid.UUID  `json:"member_id"`
	OldStatus string     `json:"old_status"`
	NewStatus string     `json:"new_status"`
	Reason    *string    `json:"reason,omitempty"`
	ChangedBy *uuid.UUID `json:"changed_by,omitempty"`
	ChangedAt time.Time  `json:"changed_at"`
}

type ChangeStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=Pending Active Suspended Resigned Expelled Deceased"`
	Reason string `json:"reason,omitempty"`
}

type MemberActivity struct {
	ID           uuid.UUID  `json:"id"`
	MemberID     uuid.UUID  `json:"member_id"`
	ActivityType string     `json:"activity_type"`
	Title        string     `json:"title"`
	Description  *string    `json:"description,omitempty"`
	ActivityDate string     `json:"activity_date"`
	Hours        float64    `json:"hours"`
	CreatedAt    time.Time  `json:"created_at"`
}

type RecordActivityRequest struct {
	ActivityType string  `json:"activity_type" binding:"required,oneof=Meeting Event Training Volunteer Donation Recruitment CheckIn Other"`
	Title        string  `json:"title" binding:"required"`
	Description  string  `json:"description,omitempty"`
	ActivityDate string  `json:"activity_date" binding:"required"`
	Hours        float64 `json:"hours,omitempty"`
}

type MemberPosition struct {
	ID            uuid.UUID  `json:"id"`
	MemberID      uuid.UUID  `json:"member_id"`
	PartyRole     string     `json:"party_role"`
	PositionTitle *string    `json:"position_title,omitempty"`
	Committee     *string    `json:"committee,omitempty"`
	Rank          *int       `json:"rank,omitempty"`
	StructureID   *uuid.UUID `json:"structure_id,omitempty"`
	StartDate     string     `json:"start_date"`
	EndDate       *string    `json:"end_date,omitempty"`
	IsCurrent     bool       `json:"is_current"`
	CreatedAt     time.Time  `json:"created_at"`
}

type AssignPositionRequest struct {
	PartyRole     string `json:"party_role" binding:"required"`
	PositionTitle string `json:"position_title,omitempty"`
	Committee     string `json:"committee,omitempty"`
	Rank          int    `json:"rank,omitempty"`
	StructureID   string `json:"structure_id,omitempty"`
	StartDate     string `json:"start_date" binding:"required"`
}

type MemberCard struct {
	ID             uuid.UUID  `json:"id"`
	MemberID       uuid.UUID  `json:"member_id"`
	CardNo         string     `json:"card_no"`
	CardStatus     string     `json:"card_status"`
	IssuedAt       *time.Time `json:"issued_at,omitempty"`
	DeliveredAt    *time.Time `json:"delivered_at,omitempty"`
	ExpiredAt      *time.Time `json:"expired_at,omitempty"`
	ReplacedReason *string    `json:"replaced_reason,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
}

type IssueCardRequest struct {
	CardNo string `json:"card_no" binding:"required"`
}

type UpdateCardRequest struct {
	CardStatus     string `json:"card_status" binding:"required,oneof=Pending Issued Delivered Expired Replaced"`
	ReplacedReason string `json:"replaced_reason,omitempty"`
}

type MembershipProfile struct {
	Member       *Member             `json:"member"`
	Demographics *MemberDemographics `json:"demographics,omitempty"`
	Positions    []MemberPosition    `json:"positions,omitempty"`
	CurrentDues  *DuesSummary        `json:"current_dues,omitempty"`
	Cards        []MemberCard        `json:"cards,omitempty"`
	Activity     []MemberActivity    `json:"activity,omitempty"`
}

type DuesSummary struct {
	TotalPaid        float64 `json:"total_paid"`
	PaymentCount     int     `json:"payment_count"`
	LastPaymentDate  *string `json:"last_payment_date,omitempty"`
	LastPaymentAmount float64 `json:"last_payment_amount,omitempty"`
}

type MembershipStats struct {
	TotalMembers       int            `json:"total_members"`
	ActiveMembers      int            `json:"active_members"`
	NewThisMonth       int            `json:"new_this_month"`
	ByGender           map[string]int `json:"by_gender"`
	ByStatus           map[string]int `json:"by_status"`
	ByZone             map[string]int `json:"by_zone"`
	ByType             map[string]int `json:"by_type"`
	ByTier             map[string]int `json:"by_tier"`
	TotalDuesCollected float64        `json:"total_dues_collected"`
	DuesThisMonth      float64        `json:"dues_this_month"`
}

type MemberFilter struct {
	Status    string `form:"status"`
	ZoneCode  string `form:"zone_code"`
	PartyRole string `form:"party_role"`
	Gender    string `form:"gender"`
	Search    string `form:"search"`
	JoinFrom  string `form:"join_from"`
	JoinTo    string `form:"join_to"`
	AgeFrom   int    `form:"age_from"`
	AgeTo     int    `form:"age_to"`
	Page      int    `form:"page"`
	Limit     int    `form:"limit"`
	SortBy    string `form:"sort_by"`
	SortOrder string `form:"sort_order"`
}

type BulkStatusRequest struct {
	MemberIDs []uuid.UUID `json:"member_ids" binding:"required,min=1"`
	Status    string      `json:"status" binding:"required,oneof=Pending Active Suspended Resigned Expelled Deceased"`
	Reason    string      `json:"reason,omitempty"`
}

type BulkStatusResult struct {
	Total   int                `json:"total"`
	Changed int                `json:"changed"`
	Errors  []BulkStatusError  `json:"errors,omitempty"`
}

type BulkStatusError struct {
	MemberID uuid.UUID `json:"member_id"`
	Error    string    `json:"error"`
}

type ApproveRequest struct {
	Notes string `json:"notes,omitempty"`
}

type RejectRequest struct {
	Reason string `json:"reason" binding:"required"`
}

package models

import (
	"time"

	"github.com/google/uuid"
)

type GeographicZone struct {
	ZoneCode   string           `json:"zone_code"`
	NameKh     string           `json:"name_kh"`
	NameEn     string           `json:"name_en"`
	ZoneType   string           `json:"zone_type"`
	ParentCode *string          `json:"parent_code,omitempty"`
	Children   []GeographicZone `json:"children,omitempty"`
}

type PartyStructure struct {
	ID               uuid.UUID `json:"id"`
	StructureNameKh  string    `json:"structure_name_kh"`
	StructureNameEn  string    `json:"structure_name_en"`
	ZoneCode         string    `json:"zone_code"`
}

type Member struct {
	ID                    uuid.UUID  `json:"id"`
	MembershipCardNo      string     `json:"membership_card_no"`
	NationalID            *string    `json:"national_id,omitempty"`
	LastNameKh            string     `json:"last_name_kh"`
	FirstNameKh           string     `json:"first_name_kh"`
	LastNameEn            string     `json:"last_name_en"`
	FirstNameEn           string     `json:"first_name_en"`
	Gender                string     `json:"gender"`
	DateOfBirth           string     `json:"date_of_birth"`
	PhoneNumber           string     `json:"phone_number"`
	Email                 *string    `json:"email,omitempty"`
	TelegramUsername      *string    `json:"telegram_username,omitempty"`
	RegisteredVillageCode string     `json:"registered_village_code"`
	CurrentAddressDetails *string    `json:"current_address_details,omitempty"`
	StructureID           *uuid.UUID `json:"structure_id,omitempty"`
	PartyRole             string     `json:"party_role"`
	JoinDate              string     `json:"join_date"`
	Status                string     `json:"status"`
}

type CreateMemberRequest struct {
	MembershipCardNo      string `json:"membership_card_no" binding:"required"`
	NationalID            string `json:"national_id,omitempty"`
	LastNameKh            string `json:"last_name_kh" binding:"required"`
	FirstNameKh           string `json:"first_name_kh" binding:"required"`
	LastNameEn            string `json:"last_name_en" binding:"required"`
	FirstNameEn           string `json:"first_name_en" binding:"required"`
	Gender                string `json:"gender" binding:"required,oneof=Male Female Other"`
	DateOfBirth           string `json:"date_of_birth" binding:"required"`
	PhoneNumber           string `json:"phone_number" binding:"required"`
	Email                 string `json:"email,omitempty"`
	TelegramUsername      string `json:"telegram_username,omitempty"`
	RegisteredVillageCode string `json:"registered_village_code" binding:"required"`
	CurrentAddressDetails string `json:"current_address_details,omitempty"`
	StructureID           string `json:"structure_id,omitempty"`
	PartyRole             string `json:"party_role,omitempty"`
	JoinDate              string `json:"join_date" binding:"required"`
}

type UpdateMemberRequest struct {
	MembershipCardNo      string `json:"membership_card_no,omitempty"`
	NationalID            string `json:"national_id,omitempty"`
	LastNameKh            string `json:"last_name_kh,omitempty"`
	FirstNameKh           string `json:"first_name_kh,omitempty"`
	LastNameEn            string `json:"last_name_en,omitempty"`
	FirstNameEn           string `json:"first_name_en,omitempty"`
	Gender                string `json:"gender,omitempty"`
	DateOfBirth           string `json:"date_of_birth,omitempty"`
	PhoneNumber           string `json:"phone_number,omitempty"`
	Email                 string `json:"email,omitempty"`
	TelegramUsername      string `json:"telegram_username,omitempty"`
	RegisteredVillageCode string `json:"registered_village_code,omitempty"`
	CurrentAddressDetails string `json:"current_address_details,omitempty"`
	StructureID           string `json:"structure_id,omitempty"`
	PartyRole             string `json:"party_role,omitempty"`
	Status                string `json:"status,omitempty"`
}

type VoterInsight struct {
	ID                uuid.UUID  `json:"id"`
	LastNameKh        string     `json:"last_name_kh"`
	FirstNameKh       string     `json:"first_name_kh"`
	Gender            string     `json:"gender"`
	CommuneCode       string     `json:"commune_code"`
	PollingStationCode *string   `json:"polling_station_code,omitempty"`
	VoterSentiment    string     `json:"voter_sentiment"`
	LastContactedDate *string    `json:"last_contacted_date,omitempty"`
}

type CreateVoterRequest struct {
	LastNameKh        string `json:"last_name_kh" binding:"required"`
	FirstNameKh       string `json:"first_name_kh" binding:"required"`
	Gender            string `json:"gender" binding:"required,oneof=Male Female"`
	CommuneCode       string `json:"commune_code" binding:"required"`
	PollingStationCode string `json:"polling_station_code,omitempty"`
	VoterSentiment    string `json:"voter_sentiment,omitempty"`
	LastContactedDate string `json:"last_contacted_date,omitempty"`
}

type PartyFinance struct {
	ID                uuid.UUID  `json:"id"`
	MemberID          *uuid.UUID `json:"member_id,omitempty"`
	ContributorNameKh *string    `json:"contributor_name_kh,omitempty"`
	ContributorNameEn *string    `json:"contributor_name_en,omitempty"`
	TransactionType   string     `json:"transaction_type"`
	AmountUSD         float64    `json:"amount_usd"`
	AmountKHR         float64    `json:"amount_khr"`
	PaymentMethod     string     `json:"payment_method"`
	ReferenceNumber   *string    `json:"reference_number,omitempty"`
	TransactionDate   time.Time  `json:"transaction_date"`
	Notes             *string    `json:"notes,omitempty"`
}

type CreateFinanceRequest struct {
	MemberID          string  `json:"member_id,omitempty"`
	ContributorNameKh string  `json:"contributor_name_kh,omitempty"`
	ContributorNameEn string  `json:"contributor_name_en,omitempty"`
	TransactionType   string  `json:"transaction_type" binding:"required"`
	AmountUSD         float64 `json:"amount_usd"`
	AmountKHR         float64 `json:"amount_khr"`
	PaymentMethod     string  `json:"payment_method" binding:"required"`
	ReferenceNumber   string  `json:"reference_number,omitempty"`
	TransactionDate   string  `json:"transaction_date" binding:"required"`
	Notes             string  `json:"notes,omitempty"`
}

type FinanceSummary struct {
	TotalUSD float64            `json:"total_usd"`
	TotalKHR float64            `json:"total_khr"`
	ByType   map[string]float64 `json:"by_type"`
}

type PartyFile struct {
	ID            uuid.UUID  `json:"id"`
	FileName      string     `json:"file_name"`
	MimeType      string     `json:"mime_type"`
	Base64Content string     `json:"base64_content,omitempty"`
	FileSize      int        `json:"file_size"`
	MemberID      *uuid.UUID `json:"member_id,omitempty"`
	UploadedBy    *uuid.UUID `json:"uploaded_by,omitempty"`
	Description   *string    `json:"description,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
}

type UploadFileRequest struct {
	FileName    string `json:"file_name" binding:"required"`
	MimeType    string `json:"mime_type" binding:"required"`
	Base64Data  string `json:"base64_data" binding:"required"`
	MemberID    string `json:"member_id,omitempty"`
	Description string `json:"description,omitempty"`
}

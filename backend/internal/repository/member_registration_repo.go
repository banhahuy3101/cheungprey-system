package repository

import (
	"fmt"

	"github.com/google/uuid"
	"github.com/supabase-community/postgrest-go"

	"github.com/banhahuy/cheungprey-system/backend/internal/models"
)

func (r *Repository) CreateRegistration(registration *models.MemberRegistration) error {
	_, _, err := r.AdminClient.From("member_registrations").
		Insert(registration, false, "", "", "").
		Execute()
	return err
}

func (r *Repository) GetRegistrationByID(id uuid.UUID) (*models.MemberRegistration, error) {
	var registrations []models.MemberRegistration
	_, err := r.AdminClient.From("member_registrations").
		Select("*", "exact", false).
		Eq("id", id.String()).
		ExecuteTo(&registrations)
	if err != nil {
		return nil, fmt.Errorf("get registration: %w", err)
	}
	if len(registrations) == 0 {
		return nil, nil
	}
	return &registrations[0], nil
}

func (r *Repository) ListRegistrations(status string) ([]models.MemberRegistration, error) {
	var registrations []models.MemberRegistration
	q := r.AdminClient.From("member_registrations").Select("*", "exact", false)
	if status != "" {
		q = q.Eq("status", status)
	}
	_, err := q.Order("updated_at", &postgrest.OrderOpts{Ascending: false}).ExecuteTo(&registrations)
	if err != nil {
		return nil, fmt.Errorf("list registrations: %w", err)
	}
	if registrations == nil {
		registrations = []models.MemberRegistration{}
	}
	return registrations, nil
}

func (r *Repository) ListRegistrationsByNationalID(nationalID string) ([]models.MemberRegistration, error) {
	var registrations []models.MemberRegistration
	_, err := r.AdminClient.From("member_registrations").
		Select("*", "exact", false).
		Eq("national_id", nationalID).
		ExecuteTo(&registrations)
	if err != nil {
		return nil, fmt.Errorf("find registrations by national ID: %w", err)
	}
	return registrations, nil
}

func (r *Repository) UpdateRegistration(id uuid.UUID, data map[string]any) error {
	_, _, err := r.AdminClient.From("member_registrations").
		Update(data, "", "").
		Eq("id", id.String()).
		Execute()
	return err
}

func (r *Repository) CreateRegistrationDocument(document *models.MemberRegistrationDocument) error {
	_, _, err := r.AdminClient.From("member_registration_documents").
		Upsert(document, "registration_id,document_type", "", "").
		Execute()
	return err
}

func (r *Repository) UpdateRegistrationDocument(id uuid.UUID, fileID uuid.UUID) error {
	_, _, err := r.AdminClient.From("member_registration_documents").
		Update(map[string]any{"file_id": fileID.String(), "created_at": "now()"}, "", "").
		Eq("id", id.String()).
		Execute()
	return err
}

func (r *Repository) GetRegistrationDocument(registrationID uuid.UUID, documentType string) (*models.MemberRegistrationDocument, error) {
	var documents []models.MemberRegistrationDocument
	_, err := r.AdminClient.From("member_registration_documents").
		Select("*", "exact", false).
		Eq("registration_id", registrationID.String()).
		Eq("document_type", documentType).
		ExecuteTo(&documents)
	if err != nil {
		return nil, fmt.Errorf("get registration document: %w", err)
	}
	if len(documents) == 0 {
		return nil, nil
	}
	return &documents[0], nil
}

func (r *Repository) ListRegistrationDocuments(registrationID uuid.UUID) ([]models.MemberRegistrationDocument, error) {
	var documents []models.MemberRegistrationDocument
	_, err := r.AdminClient.From("member_registration_documents").
		Select("*", "exact", false).
		Eq("registration_id", registrationID.String()).
		Order("created_at", &postgrest.OrderOpts{Ascending: true}).
		ExecuteTo(&documents)
	if err != nil {
		return nil, fmt.Errorf("list registration documents: %w", err)
	}
	for i := range documents {
		file, err := r.GetFileByID(documents[i].FileID)
		if err != nil || file == nil {
			continue
		}
		documents[i].FileName = file.FileName
		documents[i].MimeType = file.MimeType
		documents[i].FileSize = file.FileSize
	}
	if documents == nil {
		documents = []models.MemberRegistrationDocument{}
	}
	return documents, nil
}

func (r *Repository) AttachRegistrationFiles(registrationID, memberID uuid.UUID) error {
	documents, err := r.ListRegistrationDocuments(registrationID)
	if err != nil {
		return err
	}
	for _, document := range documents {
		_, _, err := r.AdminClient.From("party_files").
			Update(map[string]any{"member_id": memberID.String()}, "", "").
			Eq("id", document.FileID.String()).
			Execute()
		if err != nil {
			return fmt.Errorf("attach registration file: %w", err)
		}
	}
	return nil
}

func (r *Repository) CreateRegistrationEvent(event *models.MemberRegistrationEvent) error {
	_, _, err := r.AdminClient.From("member_registration_events").
		Insert(event, false, "", "", "").
		Execute()
	return err
}

func (r *Repository) ListRegistrationEvents(registrationID uuid.UUID) ([]models.MemberRegistrationEvent, error) {
	var events []models.MemberRegistrationEvent
	_, err := r.AdminClient.From("member_registration_events").
		Select("*", "exact", false).
		Eq("registration_id", registrationID.String()).
		Order("created_at", &postgrest.OrderOpts{Ascending: true}).
		ExecuteTo(&events)
	if err != nil {
		return nil, fmt.Errorf("list registration events: %w", err)
	}
	if events == nil {
		events = []models.MemberRegistrationEvent{}
	}
	return events, nil
}

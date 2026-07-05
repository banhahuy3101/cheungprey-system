package repository

import (
	"fmt"

	"github.com/google/uuid"

	"github.com/banhahuy/cheungprey-system/backend/internal/models"
)

func (r *Repository) ListAllZones() ([]models.GeographicZone, error) {
	var zones []models.GeographicZone
	_, err := r.AdminClient.From("geographic_zones").
		Select("*", "exact", false).
		ExecuteTo(&zones)
	if err != nil {
		return nil, fmt.Errorf("list all zones: %w", err)
	}
	return zones, nil
}

func (r *Repository) ListZones(zoneType string) ([]models.GeographicZone, error) {
	var zones []models.GeographicZone
	q := r.AdminClient.From("geographic_zones").Select("*", "exact", false)
	if zoneType != "" {
		q = q.Eq("zone_type", zoneType)
	}
	_, err := q.ExecuteTo(&zones)
	if err != nil {
		return nil, fmt.Errorf("list zones: %w", err)
	}
	return zones, nil
}

func (r *Repository) GetChildren(parentCode string) ([]models.GeographicZone, error) {
	var zones []models.GeographicZone
	_, err := r.AdminClient.From("geographic_zones").
		Select("*", "exact", false).
		Eq("parent_code", parentCode).
		ExecuteTo(&zones)
	if err != nil {
		return nil, fmt.Errorf("get children: %w", err)
	}
	return zones, nil
}

func (r *Repository) ListPartyStructures() ([]models.PartyStructure, error) {
	var structures []models.PartyStructure
	_, err := r.AdminClient.From("party_structures").
		Select("*", "exact", false).
		ExecuteTo(&structures)
	if err != nil {
		return nil, fmt.Errorf("list structures: %w", err)
	}
	return structures, nil
}

func (r *Repository) CreateMember(m *models.Member) error {
	_, _, err := r.AdminClient.From("members").
		Insert(m, false, "", "", "").
		Execute()
	return err
}

func (r *Repository) GetMemberByID(id uuid.UUID) (*models.Member, error) {
	var members []models.Member
	_, err := r.AdminClient.From("members").
		Select("*", "exact", false).
		Eq("id", id.String()).
		ExecuteTo(&members)
	if err != nil {
		return nil, fmt.Errorf("get member: %w", err)
	}
	if len(members) == 0 {
		return nil, nil
	}
	return &members[0], nil
}

func (r *Repository) ListMembers(status string) ([]models.Member, error) {
	var members []models.Member
	q := r.AdminClient.From("members").Select("*", "exact", false)
	if status != "" {
		q = q.Eq("status", status)
	}
	_, err := q.ExecuteTo(&members)
	if err != nil {
		return nil, fmt.Errorf("list members: %w", err)
	}
	return members, nil
}

func (r *Repository) UpdateMember(id uuid.UUID, data any) error {
	_, _, err := r.AdminClient.From("members").
		Update(data, "", "").
		Eq("id", id.String()).
		Execute()
	return err
}

func (r *Repository) DeleteMember(id uuid.UUID) error {
	_, _, err := r.AdminClient.From("members").
		Delete("", "").
		Eq("id", id.String()).
		Execute()
	return err
}

func (r *Repository) CreateVoter(v *models.VoterInsight) error {
	_, _, err := r.AdminClient.From("voter_insights").
		Insert(v, false, "", "", "").
		Execute()
	return err
}

func (r *Repository) ListVoters(communeCode string, sentiment string) ([]models.VoterInsight, error) {
	var voters []models.VoterInsight
	q := r.AdminClient.From("voter_insights").Select("*", "exact", false)
	if communeCode != "" {
		q = q.Eq("commune_code", communeCode)
	}
	if sentiment != "" {
		q = q.Eq("voter_sentiment", sentiment)
	}
	_, err := q.ExecuteTo(&voters)
	if err != nil {
		return nil, fmt.Errorf("list voters: %w", err)
	}
	return voters, nil
}

func (r *Repository) CreateFile(f *models.PartyFile) error {
	_, _, err := r.AdminClient.From("party_files").
		Insert(f, false, "", "", "").
		Execute()
	return err
}

func (r *Repository) ListFiles(memberID string) ([]models.PartyFile, error) {
	var files []models.PartyFile
	q := r.AdminClient.From("party_files").Select("*", "exact", false)
	if memberID != "" {
		q = q.Eq("member_id", memberID)
	}
	_, err := q.ExecuteTo(&files)
	if err != nil {
		return nil, fmt.Errorf("list files: %w", err)
	}
	return files, nil
}

func (r *Repository) GetFileByID(id uuid.UUID) (*models.PartyFile, error) {
	var files []models.PartyFile
	_, err := r.AdminClient.From("party_files").
		Select("*", "exact", false).
		Eq("id", id.String()).
		ExecuteTo(&files)
	if err != nil {
		return nil, fmt.Errorf("get file: %w", err)
	}
	if len(files) == 0 {
		return nil, nil
	}
	return &files[0], nil
}

func (r *Repository) DeleteFile(id uuid.UUID) error {
	_, _, err := r.AdminClient.From("party_files").
		Delete("", "").
		Eq("id", id.String()).
		Execute()
	return err
}



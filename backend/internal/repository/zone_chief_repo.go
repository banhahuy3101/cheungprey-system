package repository

import (
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/banhahuy/cheungprey-system/backend/internal/models"
)

func (r *Repository) ListZoneChiefAssignments() ([]models.ZoneChiefAssignment, error) {
	var rows []struct {
		ID         string    `json:"id"`
		ZoneCode   string    `json:"zone_code"`
		UserID     string    `json:"user_id"`
		AssignedBy *string   `json:"assigned_by"`
		AssignedAt time.Time `json:"assigned_at"`
		UpdatedAt  time.Time `json:"updated_at"`
	}

	_, err := r.AdminClient.From("zone_chief_assignments").
		Select("*", "exact", false).
		Order("zone_code", nil).
		ExecuteTo(&rows)
	if err != nil {
		return nil, fmt.Errorf("list zone chief assignments: %w", err)
	}

	if len(rows) == 0 {
		return []models.ZoneChiefAssignment{}, nil
	}

	userIDs := make([]string, 0, len(rows))
	zoneCodes := make([]string, 0, len(rows))
	for _, row := range rows {
		userIDs = append(userIDs, row.UserID)
		zoneCodes = append(zoneCodes, row.ZoneCode)
	}

	userNameMap := fetchUserNames(r, userIDs)
	zoneInfoMap := fetchZoneInfo(r, zoneCodes)

	assignments := make([]models.ZoneChiefAssignment, 0, len(rows))
	for _, row := range rows {
		uid, _ := uuid.Parse(row.UserID)
		aid, _ := uuid.Parse(row.ID)
		var assignedBy *uuid.UUID
		if row.AssignedBy != nil {
			ab, err := uuid.Parse(*row.AssignedBy)
			if err == nil {
				assignedBy = &ab
			}
		}

		zi := zoneInfoMap[row.ZoneCode]

		assignments = append(assignments, models.ZoneChiefAssignment{
			ID:         aid,
			ZoneCode:   row.ZoneCode,
			ZoneName:   zi.Name,
			ZoneType:   zi.Type,
			UserID:     uid,
			UserName:   userNameMap[row.UserID],
			AssignedBy: assignedBy,
			AssignedAt: row.AssignedAt,
			UpdatedAt:  row.UpdatedAt,
		})
	}

	return assignments, nil
}

func (r *Repository) GetZoneChiefAssignment(zoneCode string) (*models.ZoneChiefAssignment, error) {
	var rows []struct {
		ID         string    `json:"id"`
		ZoneCode   string    `json:"zone_code"`
		UserID     string    `json:"user_id"`
		AssignedBy *string   `json:"assigned_by"`
		AssignedAt time.Time `json:"assigned_at"`
		UpdatedAt  time.Time `json:"updated_at"`
	}

	_, err := r.AdminClient.From("zone_chief_assignments").
		Select("*", "exact", false).
		Eq("zone_code", zoneCode).
		ExecuteTo(&rows)
	if err != nil {
		return nil, fmt.Errorf("get zone chief assignment: %w", err)
	}

	if len(rows) == 0 {
		return nil, nil
	}

	row := rows[0]
	uid, _ := uuid.Parse(row.UserID)
	aid, _ := uuid.Parse(row.ID)
	var assignedBy *uuid.UUID
	if row.AssignedBy != nil {
		ab, err := uuid.Parse(*row.AssignedBy)
		if err == nil {
			assignedBy = &ab
		}
	}

	userNameMap := fetchUserNames(r, []string{row.UserID})
	zoneInfoMap := fetchZoneInfo(r, []string{row.ZoneCode})
	zi := zoneInfoMap[row.ZoneCode]

	return &models.ZoneChiefAssignment{
		ID:         aid,
		ZoneCode:   row.ZoneCode,
		ZoneName:   zi.Name,
		ZoneType:   zi.Type,
		UserID:     uid,
		UserName:   userNameMap[row.UserID],
		AssignedBy: assignedBy,
		AssignedAt: row.AssignedAt,
		UpdatedAt:  row.UpdatedAt,
	}, nil
}

func (r *Repository) AssignZoneChief(zoneCode string, userID uuid.UUID, assignedBy uuid.UUID) error {
	payload := map[string]any{
		"zone_code":   zoneCode,
		"user_id":     userID.String(),
		"assigned_by": assignedBy.String(),
		"updated_at":  "now()",
	}

	_, _, err := r.AdminClient.From("zone_chief_assignments").
		Upsert(payload, "zone_code", "", "").
		Execute()
	if err != nil {
		return fmt.Errorf("assign zone chief: %w", err)
	}
	return nil
}

func (r *Repository) RemoveZoneChief(zoneCode string) error {
	_, _, err := r.AdminClient.From("zone_chief_assignments").
		Delete("", "").
		Eq("zone_code", zoneCode).
		Execute()
	if err != nil {
		return fmt.Errorf("remove zone chief: %w", err)
	}
	return nil
}

type zoneInfo struct {
	Name string
	Type string
}

func fetchZoneInfo(r *Repository, zoneCodes []string) map[string]zoneInfo {
	result := make(map[string]zoneInfo, len(zoneCodes))
	if len(zoneCodes) == 0 {
		return result
	}

	var rows []struct {
		ZoneCode string `json:"zone_code"`
		NameKh   string `json:"name_kh"`
		ZoneType string `json:"zone_type"`
	}

	_, err := r.AdminClient.From("geographic_zones").
		Select("zone_code,name_kh,zone_type", "exact", false).
		In("zone_code", zoneCodes).
		ExecuteTo(&rows)
	if err != nil {
		return result
	}

	for _, row := range rows {
		result[row.ZoneCode] = zoneInfo{Name: row.NameKh, Type: row.ZoneType}
	}
	return result
}

func (r *Repository) GetZoneType(zoneCode string) (string, error) {
	var rows []struct {
		ZoneType string `json:"zone_type"`
	}

	_, err := r.AdminClient.From("geographic_zones").
		Select("zone_type", "exact", false).
		Eq("zone_code", zoneCode).
		ExecuteTo(&rows)
	if err != nil {
		return "", fmt.Errorf("get zone type: %w", err)
	}

	if len(rows) == 0 {
		return "", nil
	}

	return rows[0].ZoneType, nil
}

func fetchUserNames(r *Repository, userIDs []string) map[string]string {
	result := make(map[string]string, len(userIDs))
	if len(userIDs) == 0 {
		return result
	}

	var rows []struct {
		ID       string `json:"id"`
		FullName string `json:"full_name"`
	}

	_, err := r.AdminClient.From("profiles").
		Select("id,full_name", "exact", false).
		In("id", userIDs).
		ExecuteTo(&rows)
	if err != nil {
		return result
	}

	for _, row := range rows {
		result[row.ID] = row.FullName
	}
	return result
}

func (r *Repository) GetZoneChiefName(villageCode string, role string) (string, error) {
	if villageCode == "" {
		return "", nil
	}

	var zoneCode string
	switch role {
	case "commune_chief":
		if len(villageCode) >= 6 {
			zoneCode = villageCode[:6]
		}
	case "district_chief":
		if len(villageCode) >= 4 {
			zoneCode = villageCode[:4]
		}
	case "province_chief":
		if len(villageCode) >= 2 {
			zoneCode = villageCode[:2]
		}
	default:
		return "", nil
	}

	if zoneCode == "" {
		return "", nil
	}

	assignment, err := r.GetZoneChiefAssignment(zoneCode)
	if err != nil || assignment == nil {
		return "", nil
	}

	return assignment.UserName, nil
}

func (r *Repository) GetProfileName(userID uuid.UUID) (string, error) {
	names := fetchUserNames(r, []string{userID.String()})
	if name, ok := names[userID.String()]; ok {
		return name, nil
	}
	return "", nil
}

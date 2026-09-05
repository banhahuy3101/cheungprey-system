package repository

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/supabase-community/postgrest-go"
)

type QRLoginToken struct {
	ID        uuid.UUID  `json:"id"`
	UserID    uuid.UUID  `json:"user_id"`
	Token     string     `json:"token"`
	ExpiresAt time.Time  `json:"expires_at"`
	UsedAt    *time.Time `json:"used_at,omitempty"`
	CreatedBy *uuid.UUID `json:"created_by,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
}

func (r *Repository) CreateQRLoginToken(userID uuid.UUID, token string, expiresAt time.Time, createdBy *uuid.UUID) error {
	payload := map[string]any{
		"user_id":    userID,
		"token":      token,
		"expires_at": expiresAt.UTC().Format(time.RFC3339),
		"created_by": createdBy,
	}
	var inserted []QRLoginToken
	_, err := r.AdminClient.From("qr_login_tokens").
		Insert(payload, false, "representation", "", "").
		ExecuteTo(&inserted)
	if err != nil {
		return fmt.Errorf("create qr login token: %w", err)
	}
	return nil
}

func (r *Repository) GetQRLoginToken(token string) (*QRLoginToken, error) {
	var rows []QRLoginToken
	_, err := r.AdminClient.From("qr_login_tokens").
		Select("*", "exact", false).
		Eq("token", token).
		ExecuteTo(&rows)
	if err != nil {
		return nil, fmt.Errorf("get qr login token: %w", err)
	}
	if len(rows) == 0 {
		return nil, nil
	}
	return &rows[0], nil
}

func (r *Repository) GetActiveQRLoginTokenByUserID(userID uuid.UUID) (*QRLoginToken, error) {
	var rows []QRLoginToken
	_, err := r.AdminClient.From("qr_login_tokens").
		Select("*", "exact", false).
		Eq("user_id", userID.String()).
		Order("created_at", &postgrest.OrderOpts{Ascending: false}).
		Limit(1, "").
		ExecuteTo(&rows)
	if err != nil {
		return nil, fmt.Errorf("get active qr login token: %w", err)
	}
	if len(rows) == 0 {
		return nil, nil
	}
	return &rows[0], nil
}
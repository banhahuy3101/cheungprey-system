package repository

import (
	"github.com/supabase-community/supabase-go"

	"github.com/banhahuy/cheungprey-system/backend/pkg/config"
)

type Repository struct {
	Client      *supabase.Client
	AdminClient *supabase.Client
	cfg         *config.Config
}

func New(cfg *config.Config) (*Repository, error) {
	client, err := supabase.NewClient(cfg.SupabaseURL, cfg.SupabaseKey, nil)
	if err != nil {
		return nil, err
	}

	adminClient, err := supabase.NewClient(cfg.SupabaseURL, cfg.SupabaseServiceKey, nil)
	if err != nil {
		return nil, err
	}

	return &Repository{
		Client:      client,
		AdminClient: adminClient,
		cfg:         cfg,
	}, nil
}

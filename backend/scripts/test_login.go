package main

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"

	"github.com/banhahuy/cheungprey-system/backend/internal/repository"
	"github.com/banhahuy/cheungprey-system/backend/pkg/config"
)

func main() {
	_ = godotenv.Load()
	cfg := config.Load()
	fmt.Printf("url_set=%v pub_key_len=%d svc_key_len=%d\n",
		cfg.SupabaseURL != "",
		len(cfg.SupabaseKey),
		len(cfg.SupabaseServiceKey),
	)

	repo, err := repository.New(cfg)
	if err != nil {
		fmt.Println("repo error:", err)
		os.Exit(1)
	}

	session, err := repo.Client.SignInWithEmailPassword("district.chief@cheungprey.org.kh", "Demo123!")
	if err != nil {
		fmt.Println("signin error:", err)
		os.Exit(1)
	}
	fmt.Println("signin ok, token_len=", len(session.AccessToken))
}

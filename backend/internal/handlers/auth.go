package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	gotrue "github.com/supabase-community/gotrue-go/types"

	"github.com/banhahuy/cheungprey-system/backend/internal/auth"
	"github.com/banhahuy/cheungprey-system/backend/internal/models"
	"github.com/banhahuy/cheungprey-system/backend/internal/repository"
	"github.com/banhahuy/cheungprey-system/backend/internal/service"
	"github.com/banhahuy/cheungprey-system/backend/pkg/config"
	"github.com/banhahuy/cheungprey-system/backend/pkg/utils"
)

type AuthHandler struct {
	repo *repository.Repository
	svc  *service.AuthService
	cfg  *config.Config
}

func NewAuthHandler(repo *repository.Repository, cfg *config.Config) *AuthHandler {
	return &AuthHandler{
		repo: repo,
		svc:  service.NewAuthService(repo),
		cfg:  cfg,
	}
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "Email and password are required")
		return
	}
	if req.Email == "" || req.Password == "" {
		utils.BadRequest(c, "Email and password are required")
		return
	}

	session, err := h.repo.Client.SignInWithEmailPassword(req.Email, req.Password)
	if err != nil {
		utils.Unauthorized(c, "Invalid credentials")
		return
	}

	profile, err := h.svc.GetProfile(session.User.ID)
	if err != nil || profile == nil {
		utils.InternalError(c, "Failed to get profile")
		return
	}

	utils.JSON(c, http.StatusOK, &models.AuthResponse{
		AccessToken:  session.AccessToken,
		RefreshToken: session.RefreshToken,
		User:         profile,
	})
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	resp, err := h.repo.Client.Auth.Signup(gotrue.SignupRequest{
		Email:    req.Email,
		Password: req.Password,
	})
	if err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	userID := resp.User.ID

	profile, err := h.svc.CreateProfile(userID, &req)
	if err != nil {
		utils.InternalError(c, "Failed to create profile")
		return
	}

	utils.JSON(c, http.StatusCreated, gin.H{
		"message": "User registered successfully",
		"user":    profile,
	})
}

func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	session, err := h.repo.Client.RefreshToken(req.RefreshToken)
	if err != nil {
		utils.Unauthorized(c, "Invalid refresh token")
		return
	}

	utils.JSON(c, http.StatusOK, gin.H{
		"access_token":  session.AccessToken,
		"refresh_token": session.RefreshToken,
	})
}

func (h *AuthHandler) GetProfile(c *gin.Context) {
	userID, _ := auth.GetUserID(c)

	profile, err := h.svc.GetProfile(userID)
	if err != nil || profile == nil {
		utils.InternalError(c, "Failed to get profile")
		return
	}

	utils.JSON(c, http.StatusOK, profile)
}

func (h *AuthHandler) UpdateProfile(c *gin.Context) {
	userID, _ := auth.GetUserID(c)

	var req models.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	if err := h.repo.UpdateProfile(userID, &req); err != nil {
		utils.InternalError(c, "Failed to update profile")
		return
	}

	utils.JSON(c, http.StatusOK, gin.H{"message": "Profile updated"})
}

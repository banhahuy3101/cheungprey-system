package handlers

import (
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	gotrue "github.com/supabase-community/gotrue-go/types"

	"github.com/banhahuy/cheungprey-system/backend/internal/auth"
	"github.com/banhahuy/cheungprey-system/backend/internal/models"
	"github.com/banhahuy/cheungprey-system/backend/internal/repository"
	"github.com/banhahuy/cheungprey-system/backend/internal/service"
	"github.com/banhahuy/cheungprey-system/backend/pkg/config"
	"github.com/banhahuy/cheungprey-system/backend/pkg/utils"
)

// qrLoginLocks serializes QR-login redemption per user. GoTrue magiclinks are
// single-use, and generating a new link for the same email invalidates the
// previous one, so concurrent redemptions (e.g. React StrictMode double-firing
// the scan effect) race each other and one request fails with
// "Email link is invalid or has expired".
var qrLoginLocks = struct {
	sync.Mutex
	byUser map[string]*sync.Mutex
}{
	byUser: map[string]*sync.Mutex{},
}

func lockQRLogin(userID string) func() {
	qrLoginLocks.Lock()
	l, ok := qrLoginLocks.byUser[userID]
	if !ok {
		l = &sync.Mutex{}
		qrLoginLocks.byUser[userID] = l
	}
	qrLoginLocks.Unlock()

	l.Lock()
	return l.Unlock
}

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
	utils.Forbidden(c, "Self-registration is disabled. Contact system administrator.")
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

func (h *AuthHandler) QRLogin(c *gin.Context) {
	var req struct {
		QRToken string `json:"qr_token" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "qr_token is required")
		return
	}

	token, err := h.repo.GetQRLoginToken(strings.TrimSpace(req.QRToken))
	if err != nil {
		utils.InternalError(c, "Failed to validate QR code")
		return
	}
	if token == nil {
		utils.Unauthorized(c, "Invalid QR code")
		return
	}
	if !token.ExpiresAt.IsZero() && time.Now().After(token.ExpiresAt) {
		utils.Unauthorized(c, "QR code has expired")
		return
	}

	unlock := lockQRLogin(token.UserID.String())
	defer unlock()

	profile, err := h.repo.GetProfileByID(token.UserID)
	if err != nil || profile == nil {
		utils.Error(c, http.StatusNotFound, "User not found")
		return
	}

	email := profile.Email
	if email == "" {
		if authResp, aerr := h.repo.AdminClient.Auth.WithToken(h.cfg.SupabaseServiceKey).AdminGetUser(gotrue.AdminGetUserRequest{UserID: token.UserID}); aerr == nil && authResp != nil {
			email = authResp.Email
		}
	}
	if email == "" {
		utils.InternalError(c, "User has no email address for QR login")
		return
	}

	adminAuth := h.repo.AdminClient.Auth.WithToken(h.cfg.SupabaseServiceKey)
	linkResp, err := adminAuth.AdminGenerateLink(gotrue.AdminGenerateLinkRequest{
		Type:       gotrue.LinkTypeMagicLink,
		Email:      email,
		RedirectTo: h.cfg.FrontendURL,
	})
	if err != nil {
		utils.InternalError(c, "Failed to create login link")
		return
	}

	verifyToken, err := extractVerifyToken(linkResp.ActionLink)
	if err != nil {
		utils.InternalError(c, "Failed to parse login link")
		return
	}

	verifyResp, err := adminAuth.Verify(gotrue.VerifyRequest{
		Type:       gotrue.VerificationTypeMagiclink,
		Token:      verifyToken,
		RedirectTo: h.cfg.FrontendURL,
	})
	if err != nil {
		utils.Unauthorized(c, "Failed to sign in with QR code")
		return
	}
	if verifyResp.Error != "" {
		utils.Unauthorized(c, verifyResp.ErrorDescription)
		return
	}

	permSvc := service.NewPermissionService(h.repo)
	_ = permSvc.EnrichProfile(profile)

	utils.JSON(c, http.StatusOK, &models.AuthResponse{
		AccessToken:  verifyResp.AccessToken,
		RefreshToken: verifyResp.RefreshToken,
		User:         profile,
	})
}

func extractVerifyToken(actionLink string) (string, error) {
	u, err := url.Parse(actionLink)
	if err != nil {
		return "", err
	}
	q := u.Query()
	if t := q.Get("token"); t != "" {
		return t, nil
	}
	if t := q.Get("token_hash"); t != "" {
		return t, nil
	}
	return "", fmt.Errorf("missing token in link")
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

package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/banhahuy/cheungprey-system/backend/internal/models"
	"github.com/banhahuy/cheungprey-system/backend/internal/repository"
	"github.com/banhahuy/cheungprey-system/backend/pkg/utils"
)

type MenuItemHandler struct {
	repo *repository.Repository
}

func NewMenuItemHandler(repo *repository.Repository) *MenuItemHandler {
	return &MenuItemHandler{repo: repo}
}

func (h *MenuItemHandler) ListTree(c *gin.Context) {
	tree, err := h.repo.ListMenuTree()
	if err != nil {
		utils.InternalError(c, "Failed to fetch menu items tree: "+err.Error())
		return
	}
	utils.JSON(c, http.StatusOK, tree)
}

func (h *MenuItemHandler) ListFlat(c *gin.Context) {
	items, err := h.repo.ListMenuItems()
	if err != nil {
		utils.InternalError(c, "Failed to fetch menu items: "+err.Error())
		return
	}
	utils.JSON(c, http.StatusOK, items)
}

func (h *MenuItemHandler) Create(c *gin.Context) {
	var req models.CreateMenuItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}
	isVisible := true
	if req.IsVisible != nil {
		isVisible = *req.IsVisible
	}

	now := time.Now()
	item := &models.MenuItem{
		ID:         uuid.New(),
		ParentID:   req.ParentID,
		Title:      req.Title,
		TitleEN:    req.TitleEN,
		ModuleKey:  req.ModuleKey,
		SubModule:  req.SubModule,
		FeatureKey: req.FeatureKey,
		Path:       req.Path,
		Icon:       req.Icon,
		SortOrder:  req.SortOrder,
		IsActive:   isActive,
		IsVisible:  isVisible,
		CreatedAt:  now,
		UpdatedAt:  now,
	}

	if err := h.repo.CreateMenuItem(item); err != nil {
		utils.InternalError(c, "Failed to create menu item: "+err.Error())
		return
	}

	utils.JSON(c, http.StatusCreated, item)
}

func (h *MenuItemHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid menu item ID")
		return
	}

	var req models.UpdateMenuItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	data := map[string]any{
		"updated_at": time.Now(),
	}
	if req.ParentID != nil {
		if *req.ParentID == uuid.Nil {
			data["parent_id"] = nil
		} else {
			data["parent_id"] = *req.ParentID
		}
	}
	if req.Title != "" {
		data["title"] = req.Title
	}
	if req.TitleEN != "" {
		data["title_en"] = req.TitleEN
	}
	if req.ModuleKey != "" {
		data["module_key"] = req.ModuleKey
	}
	if req.SubModule != "" {
		data["sub_module"] = req.SubModule
	}
	if req.FeatureKey != "" {
		data["feature_key"] = req.FeatureKey
	}
	if req.Path != "" {
		data["path"] = req.Path
	}
	if req.Icon != "" {
		data["icon"] = req.Icon
	}
	if req.SortOrder != nil {
		data["sort_order"] = *req.SortOrder
	}
	if req.IsActive != nil {
		data["is_active"] = *req.IsActive
	}
	if req.IsVisible != nil {
		data["is_visible"] = *req.IsVisible
	}

	if err := h.repo.UpdateMenuItem(id, data); err != nil {
		utils.InternalError(c, "Failed to update menu item: "+err.Error())
		return
	}

	updated, _ := h.repo.GetMenuItemByID(id)
	utils.JSON(c, http.StatusOK, updated)
}

func (h *MenuItemHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid menu item ID")
		return
	}

	if err := h.repo.DeleteMenuItem(id); err != nil {
		utils.InternalError(c, "Failed to delete menu item: "+err.Error())
		return
	}

	utils.JSON(c, http.StatusOK, gin.H{"message": "Menu item deleted successfully"})
}

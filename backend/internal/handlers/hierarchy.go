package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/banhahuy/cheungprey-system/backend/internal/repository"
	"github.com/banhahuy/cheungprey-system/backend/pkg/utils"
)

type HierarchyHandler struct {
	repo *repository.Repository
}

func NewHierarchyHandler(repo *repository.Repository) *HierarchyHandler {
	return &HierarchyHandler{repo: repo}
}

func (h *HierarchyHandler) GetProvinces(c *gin.Context) {
	provinces, err := h.repo.ListProvinces()
	if err != nil {
		utils.InternalError(c, "Failed to fetch provinces")
		return
	}
	utils.JSON(c, http.StatusOK, provinces)
}

func (h *HierarchyHandler) GetDistricts(c *gin.Context) {
	provinceID, err := uuid.Parse(c.Param("province_id"))
	if err != nil {
		utils.BadRequest(c, "Invalid province ID")
		return
	}

	districts, err := h.repo.GetDistrictsByProvince(provinceID)
	if err != nil {
		utils.InternalError(c, "Failed to fetch districts")
		return
	}
	utils.JSON(c, http.StatusOK, districts)
}

func (h *HierarchyHandler) GetCommunes(c *gin.Context) {
	districtID, err := uuid.Parse(c.Param("district_id"))
	if err != nil {
		utils.BadRequest(c, "Invalid district ID")
		return
	}

	communes, err := h.repo.GetCommunesByDistrict(districtID)
	if err != nil {
		utils.InternalError(c, "Failed to fetch communes")
		return
	}
	utils.JSON(c, http.StatusOK, communes)
}

func (h *HierarchyHandler) GetVillages(c *gin.Context) {
	communeID, err := uuid.Parse(c.Param("commune_id"))
	if err != nil {
		utils.BadRequest(c, "Invalid commune ID")
		return
	}

	villages, err := h.repo.GetVillagesByCommune(communeID)
	if err != nil {
		utils.InternalError(c, "Failed to fetch villages")
		return
	}
	utils.JSON(c, http.StatusOK, villages)
}

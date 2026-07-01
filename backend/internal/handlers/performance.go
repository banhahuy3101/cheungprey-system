package handlers

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/banhahuy/cheungprey-system/backend/internal/auth"
	"github.com/banhahuy/cheungprey-system/backend/internal/models"
	"github.com/banhahuy/cheungprey-system/backend/internal/repository"
	"github.com/banhahuy/cheungprey-system/backend/internal/services"
	"github.com/banhahuy/cheungprey-system/backend/pkg/utils"
)

type PerformanceHandler struct {
	repo    *repository.Repository
	service *services.ReportService
}

func NewPerformanceHandler(repo *repository.Repository, service *services.ReportService) *PerformanceHandler {
	return &PerformanceHandler{repo: repo, service: service}
}

func (h *PerformanceHandler) requireAdmin(c *gin.Context) bool {
	return auth.RequireFeatureHandler(c, models.FeaturePerformanceAdmin)
}



func (h *PerformanceHandler) ListDomains(c *gin.Context) {
	domains, err := h.repo.ListDomains()
	if err != nil {
		utils.InternalError(c, "Failed to fetch domains")
		return
	}
	if domains == nil {
		domains = []models.PerformanceDomain{}
	}
	utils.JSON(c, http.StatusOK, domains)
}

func (h *PerformanceHandler) ListSubDomains(c *gin.Context) {
	domainID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid domain ID")
		return
	}

	subs, err := h.repo.ListSubDomains(domainID)
	if err != nil {
		utils.InternalError(c, "Failed to fetch sub-domains")
		return
	}
	if subs == nil {
		subs = []models.PerformanceSubDomain{}
	}
	utils.JSON(c, http.StatusOK, subs)
}

func (h *PerformanceHandler) ListIndicators(c *gin.Context) {
	subDomainID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid sub-domain ID")
		return
	}

	indicators, err := h.repo.ListIndicators(subDomainID)
	if err != nil {
		utils.InternalError(c, "Failed to fetch indicators")
		return
	}
	if indicators == nil {
		indicators = []models.PerformanceIndicator{}
	}
	utils.JSON(c, http.StatusOK, indicators)
}

func (h *PerformanceHandler) ListAllIndicators(c *gin.Context) {
	indicators, err := h.repo.ListAllIndicators()
	if err != nil {
		utils.InternalError(c, "Failed to fetch indicators")
		return
	}
	if indicators == nil {
		indicators = []models.PerformanceIndicator{}
	}
	utils.JSON(c, http.StatusOK, indicators)
}

func (h *PerformanceHandler) ListDomainsFull(c *gin.Context) {
	domains, err := h.repo.ListDomains()
	if err != nil {
		utils.InternalError(c, "Failed to fetch domains")
		return
	}
	if domains == nil {
		domains = []models.PerformanceDomain{}
	}

	type FullSubDomain struct {
		models.PerformanceSubDomain
		Indicators []models.PerformanceIndicator `json:"indicators"`
	}
	type FullDomain struct {
		models.PerformanceDomain
		SubDomains []FullSubDomain `json:"sub_domains"`
	}

	var result []FullDomain
	for _, d := range domains {
		subs, _ := h.repo.ListSubDomains(d.ID)
		var fullSubs []FullSubDomain
		for _, sd := range subs {
			inds, _ := h.repo.ListIndicators(sd.ID)
			if inds == nil {
				inds = []models.PerformanceIndicator{}
			}
			fullSubs = append(fullSubs, FullSubDomain{
				PerformanceSubDomain: sd,
				Indicators:           inds,
			})
		}
		result = append(result, FullDomain{
			PerformanceDomain: d,
			SubDomains:        fullSubs,
		})
	}

	utils.JSON(c, http.StatusOK, result)
}

func (h *PerformanceHandler) CreateDomain(c *gin.Context) {
	if !h.requireAdmin(c) {
		return
	}
	var req models.CreateDomainRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}
	domain := &models.PerformanceDomain{
		ID:        uuid.New(),
		Code:      req.Code,
		NameKh:    req.NameKh,
		NameEn:    req.NameEn,
		SortOrder: req.SortOrder,
	}
	if err := h.repo.CreateDomain(domain); err != nil {
		utils.InternalError(c, "Failed to create domain")
		return
	}
	utils.JSON(c, http.StatusCreated, domain)
}

func (h *PerformanceHandler) UpdateDomain(c *gin.Context) {
	if !h.requireAdmin(c) {
		return
	}
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid domain ID")
		return
	}
	var req models.UpdateDomainRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}
	data := map[string]any{}
	if req.Code != "" {
		data["code"] = req.Code
	}
	if req.NameKh != "" {
		data["name_kh"] = req.NameKh
	}
	if req.NameEn != "" {
		data["name_en"] = req.NameEn
	}
	if req.SortOrder != nil {
		data["sort_order"] = *req.SortOrder
	}
	if len(data) == 0 {
		utils.BadRequest(c, "No fields to update")
		return
	}
	if err := h.repo.UpdateDomain(id, data); err != nil {
		utils.InternalError(c, "Failed to update domain")
		return
	}
	utils.JSON(c, http.StatusOK, gin.H{"message": "Domain updated successfully"})
}

func (h *PerformanceHandler) DeleteDomain(c *gin.Context) {
	if !h.requireAdmin(c) {
		return
	}
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid domain ID")
		return
	}
	if err := h.repo.DeleteDomain(id); err != nil {
		utils.InternalError(c, "Failed to delete domain")
		return
	}
	utils.JSON(c, http.StatusOK, gin.H{"message": "Domain deleted successfully"})
}

func (h *PerformanceHandler) CreateSubDomain(c *gin.Context) {
	if !h.requireAdmin(c) {
		return
	}
	var req models.CreateSubDomainRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}
	domainID, err := uuid.Parse(req.DomainID)
	if err != nil {
		utils.BadRequest(c, "Invalid domain_id")
		return
	}
	sub := &models.PerformanceSubDomain{
		ID:        uuid.New(),
		DomainID:  domainID,
		Code:      req.Code,
		NameKh:    req.NameKh,
		NameEn:    req.NameEn,
		SortOrder: req.SortOrder,
	}
	if err := h.repo.CreateSubDomain(sub); err != nil {
		utils.InternalError(c, "Failed to create sub-domain")
		return
	}
	utils.JSON(c, http.StatusCreated, sub)
}

func (h *PerformanceHandler) UpdateSubDomain(c *gin.Context) {
	if !h.requireAdmin(c) {
		return
	}
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid sub-domain ID")
		return
	}
	var req models.UpdateSubDomainRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}
	data := map[string]any{}
	if req.DomainID != "" {
		did, err := uuid.Parse(req.DomainID)
		if err != nil {
			utils.BadRequest(c, "Invalid domain_id")
			return
		}
		data["domain_id"] = did.String()
	}
	if req.Code != "" {
		data["code"] = req.Code
	}
	if req.NameKh != "" {
		data["name_kh"] = req.NameKh
	}
	if req.NameEn != "" {
		data["name_en"] = req.NameEn
	}
	if req.SortOrder != nil {
		data["sort_order"] = *req.SortOrder
	}
	if len(data) == 0 {
		utils.BadRequest(c, "No fields to update")
		return
	}
	if err := h.repo.UpdateSubDomain(id, data); err != nil {
		utils.InternalError(c, "Failed to update sub-domain")
		return
	}
	utils.JSON(c, http.StatusOK, gin.H{"message": "Sub-domain updated successfully"})
}

func (h *PerformanceHandler) DeleteSubDomain(c *gin.Context) {
	if !h.requireAdmin(c) {
		return
	}
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid sub-domain ID")
		return
	}
	if err := h.repo.DeleteSubDomain(id); err != nil {
		utils.InternalError(c, "Failed to delete sub-domain")
		return
	}
	utils.JSON(c, http.StatusOK, gin.H{"message": "Sub-domain deleted successfully"})
}

func (h *PerformanceHandler) CreateIndicator(c *gin.Context) {
	if !h.requireAdmin(c) {
		return
	}
	var req models.CreateIndicatorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}
	subDomainID, err := uuid.Parse(req.SubDomainID)
	if err != nil {
		utils.BadRequest(c, "Invalid sub_domain_id")
		return
	}
	var nameEn string
	if req.NameEn != "" {
		nameEn = req.NameEn
	}
	ind := &models.PerformanceIndicator{
		ID:          uuid.New(),
		SubDomainID: subDomainID,
		Code:        req.Code,
		NameKh:      req.NameKh,
		NameEn:      &nameEn,
		DataType:    req.DataType,
		UnitKh:      &req.UnitKh,
		UnitEn:      &req.UnitEn,
		SortOrder:   req.SortOrder,
	}
	if req.UnitKh == "" {
		ind.UnitKh = &req.NameKh
	}
	if req.UnitEn == "" {
		ind.UnitEn = ind.UnitEn
	}
	if err := h.repo.CreateIndicator(ind); err != nil {
		utils.InternalError(c, "Failed to create indicator")
		return
	}
	utils.JSON(c, http.StatusCreated, ind)
}

func (h *PerformanceHandler) UpdateIndicator(c *gin.Context) {
	if !h.requireAdmin(c) {
		return
	}
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid indicator ID")
		return
	}
	var req models.UpdateIndicatorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}
	data := map[string]any{}
	if req.SubDomainID != "" {
		sid, err := uuid.Parse(req.SubDomainID)
		if err != nil {
			utils.BadRequest(c, "Invalid sub_domain_id")
			return
		}
		data["sub_domain_id"] = sid.String()
	}
	if req.Code != "" {
		data["code"] = req.Code
	}
	if req.NameKh != "" {
		data["name_kh"] = req.NameKh
	}
	if req.NameEn != "" {
		data["name_en"] = req.NameEn
	}
	if req.DataType != "" {
		data["data_type"] = req.DataType
	}
	if req.UnitKh != "" {
		data["unit_kh"] = req.UnitKh
	}
	if req.UnitEn != "" {
		data["unit_en"] = req.UnitEn
	}
	if req.SortOrder != nil {
		data["sort_order"] = *req.SortOrder
	}
	if len(data) == 0 {
		utils.BadRequest(c, "No fields to update")
		return
	}
	if err := h.repo.UpdateIndicator(id, data); err != nil {
		utils.InternalError(c, "Failed to update indicator")
		return
	}
	utils.JSON(c, http.StatusOK, gin.H{"message": "Indicator updated successfully"})
}

func (h *PerformanceHandler) DeleteIndicator(c *gin.Context) {
	if !h.requireAdmin(c) {
		return
	}
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "Invalid indicator ID")
		return
	}
	if err := h.repo.DeleteIndicator(id); err != nil {
		utils.InternalError(c, "Failed to delete indicator")
		return
	}
	utils.JSON(c, http.StatusOK, gin.H{"message": "Indicator deleted successfully"})
}

func (h *PerformanceHandler) CreatePeriod(c *gin.Context) {
	if !h.requireAdmin(c) {
		return
	}
	var req models.CreatePerformancePeriodRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	start, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		utils.BadRequest(c, "Invalid start_date format, use YYYY-MM-DD")
		return
	}
	end, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		utils.BadRequest(c, "Invalid end_date format, use YYYY-MM-DD")
		return
	}

	khmerMonths := []string{"", "មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"}
	engMonths := []string{"", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"}

	sm, em := int(start.Month()), int(end.Month())
	year := start.Year()
	khYear := fmt.Sprintf("២០២%c", '០'+year%10)
	if year >= 2026 {
		khYear = "២០" + string(rune('២'+year%100/10)) + string(rune('០'+year%10))
	}

	var labelKh, labelEn string
	if sm == 1 {
		labelKh = fmt.Sprintf("គិតចាប់ពីដើមឆ្នាំ%s ដល់ខែ%s", khYear, khmerMonths[em])
		labelEn = fmt.Sprintf("From early %d to %s", year, engMonths[em])
	} else {
		labelKh = fmt.Sprintf("គិតចាប់ពីខែ%s ដល់ខែ%s ឆ្នាំ%s", khmerMonths[sm], khmerMonths[em], khYear)
		labelEn = fmt.Sprintf("%s to %s %d", engMonths[sm], engMonths[em], year)
	}

	periods, _ := h.repo.ListPeriods()
	sortOrder := len(periods) + 1

	period := &models.PerformancePeriod{
		ID:        uuid.New(),
		LabelKh:   labelKh,
		LabelEn:   labelEn,
		StartDate: req.StartDate,
		EndDate:   req.EndDate,
		SortOrder: sortOrder,
	}

	if err := h.repo.CreatePeriod(period); err != nil {
		log.Printf("ERROR creating period: %v", err)
		utils.InternalError(c, "Failed to create period")
		return
	}

	utils.JSON(c, http.StatusCreated, period)
}

func (h *PerformanceHandler) DeletePeriod(c *gin.Context) {
	if !h.requireAdmin(c) {
		return
	}
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		utils.BadRequest(c, "Invalid period ID")
		return
	}
	if err := h.repo.DeletePeriod(id); err != nil {
		log.Printf("ERROR deleting period: %v", err)
		utils.InternalError(c, "Failed to delete period")
		return
	}
	utils.JSON(c, http.StatusOK, gin.H{"message": "Period deleted successfully"})
}

func (h *PerformanceHandler) ListPeriods(c *gin.Context) {
	periods, err := h.repo.ListPeriods()
	if err != nil {
		utils.InternalError(c, "Failed to fetch periods")
		return
	}
	if periods == nil {
		periods = []models.PerformancePeriod{}
	}
	utils.JSON(c, http.StatusOK, periods)
}

func (h *PerformanceHandler) CreatePerformanceData(c *gin.Context) {
	var req models.CreatePerformanceDataRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	indicatorID, err := uuid.Parse(req.IndicatorID)
	if err != nil {
		utils.BadRequest(c, "Invalid indicator ID")
		return
	}
	periodID, err := uuid.Parse(req.PeriodID)
	if err != nil {
		utils.BadRequest(c, "Invalid period ID")
		return
	}

	userID, _ := auth.GetUserID(c)
	data := &models.PerformanceData{
		ID:              uuid.New(),
		ZoneID:          req.ZoneID,
		IndicatorID:     indicatorID,
		PeriodID:        periodID,
		ValueNumber:     req.ValueNumber,
		ValuePercentage: req.ValuePercentage,
		ValueBinary:     req.ValueBinary,
		CreatedBy:       &userID,
	}

	if err := h.repo.UpsertPerformanceData(data); err != nil {
		log.Printf("ERROR upserting performance data: %v", err)
		utils.InternalError(c, "Failed to save performance data: "+err.Error())
		return
	}

	utils.JSON(c, http.StatusCreated, data)
}

func (h *PerformanceHandler) BulkCreatePerformanceData(c *gin.Context) {
	var req models.BulkCreatePerformanceDataRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	periodID, err := uuid.Parse(req.PeriodID)
	if err != nil {
		utils.BadRequest(c, "Invalid period ID")
		return
	}

	userID, _ := auth.GetUserID(c)
	now := time.Now()

	var rows []map[string]any
	for _, v := range req.Values {
		var indicatorID *uuid.UUID
		if v.IndicatorCode != "" {
			id, err := h.repo.GetIndicatorIDByFullCode(v.IndicatorCode)
			if err != nil {
				utils.BadRequest(c, err.Error())
				return
			}
			indicatorID = id
		} else if v.IndicatorID != "" {
			id, err := uuid.Parse(v.IndicatorID)
			if err != nil {
				utils.BadRequest(c, "Invalid indicator ID: "+v.IndicatorID)
				return
			}
			indicatorID = &id
		} else {
			utils.BadRequest(c, "Either indicator_id or indicator_code is required")
			return
		}
		row := map[string]any{
			"id":               uuid.New().String(),
			"zone_id":          req.ZoneID,
			"indicator_id":     indicatorID.String(),
			"period_id":        periodID.String(),
			"value_number":     nil,
			"value_percentage": nil,
			"value_binary":     nil,
			"created_by":       userID.String(),
			"updated_at":       now.Format(time.RFC3339Nano),
		}
		if v.ValueNumber != nil {
			row["value_number"] = *v.ValueNumber
		}
		if v.ValuePercentage != nil {
			row["value_percentage"] = *v.ValuePercentage
		}
		if v.ValueBinary != nil {
			row["value_binary"] = *v.ValueBinary
		}
		rows = append(rows, row)
	}

	if err := h.repo.BulkUpsertPerformanceData(rows); err != nil {
		log.Printf("ERROR bulk upserting performance data: %v", err)
		utils.InternalError(c, "Failed to save performance data: "+err.Error())
		return
	}

	utils.JSON(c, http.StatusCreated, gin.H{
		"message":  "Performance data saved successfully",
		"inserted": len(rows),
	})
}

func (h *PerformanceHandler) GetPerformanceData(c *gin.Context) {
	zoneID := c.Query("zone_id")
	periodIDStr := c.Query("period_id")

	if zoneID == "" || periodIDStr == "" {
		utils.BadRequest(c, "zone_id and period_id are required")
		return
	}

	periodID, err := uuid.Parse(periodIDStr)
	if err != nil {
		utils.BadRequest(c, "Invalid period ID")
		return
	}

	data, err := h.repo.GetPerformanceDataWithIndicators(zoneID, periodID)
	if err != nil {
		utils.InternalError(c, "Failed to fetch performance data")
		return
	}
	if data == nil {
		data = []models.PerformanceDataWithIndicator{}
	}
	utils.JSON(c, http.StatusOK, data)
}

func (h *PerformanceHandler) ListSubmissions(c *gin.Context) {
	submissions, err := h.repo.ListPerformanceSubmissions()
	if err != nil {
		utils.InternalError(c, "Failed to fetch submissions")
		return
	}
	if submissions == nil {
		submissions = []map[string]any{}
	}
	utils.JSON(c, http.StatusOK, submissions)
}

func (h *PerformanceHandler) DeletePerformanceData(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		utils.BadRequest(c, "Invalid data ID")
		return
	}
	if err := h.repo.DeletePerformanceData(id); err != nil {
		log.Printf("ERROR deleting performance data: %v", err)
		utils.InternalError(c, "Failed to delete performance data")
		return
	}
	utils.JSON(c, http.StatusOK, gin.H{"message": "Deleted successfully"})
}

func (h *PerformanceHandler) DeletePerformanceDataByZoneAndPeriod(c *gin.Context) {
	zoneID := c.Query("zone_id")
	periodIDStr := c.Query("period_id")
	if zoneID == "" || periodIDStr == "" {
		utils.BadRequest(c, "zone_id and period_id are required")
		return
	}
	periodID, err := uuid.Parse(periodIDStr)
	if err != nil {
		utils.BadRequest(c, "Invalid period ID")
		return
	}
	if err := h.repo.DeletePerformanceDataByZoneAndPeriod(zoneID, periodID); err != nil {
		log.Printf("ERROR deleting zone+period data: %v", err)
		utils.InternalError(c, "Failed to delete performance data")
		return
	}
	utils.JSON(c, http.StatusOK, gin.H{"message": "Deleted successfully"})
}

func (h *PerformanceHandler) PerformanceReport(c *gin.Context) {
	zoneID := c.Param("zone_id")
	periodIDStr := c.Param("period_id")

	periodID, err := uuid.Parse(periodIDStr)
	if err != nil {
		utils.BadRequest(c, "Invalid period ID")
		return
	}

	reportData, err := h.repo.GetFullReportData(zoneID, periodID)
	if err != nil {
		log.Printf("ERROR fetching report data: %v", err)
		utils.InternalError(c, "Failed to generate report: "+err.Error())
		return
	}

	pdfBytes, err := h.service.GeneratePerformanceReport(reportData)
	if err != nil {
		log.Printf("ERROR generating performance PDF: %v", err)
		utils.InternalError(c, "Failed to generate PDF report")
		return
	}

	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", "attachment; filename=performance_report_"+zoneID+".pdf")
	c.Data(http.StatusOK, "application/pdf", pdfBytes)
}

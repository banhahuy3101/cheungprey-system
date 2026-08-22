package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/banhahuy/cheungprey-system/backend/internal/cron"
	"github.com/banhahuy/cheungprey-system/backend/pkg/utils"
)

type CronHandler struct {
	scheduler *cron.Scheduler
}

func NewCronHandler(scheduler *cron.Scheduler) *CronHandler {
	return &CronHandler{scheduler: scheduler}
}

func (h *CronHandler) Status(c *gin.Context) {
	utils.JSON(c, http.StatusOK, h.scheduler.Status())
}

func (h *CronHandler) RunNow(c *gin.Context) {
	h.scheduler.RunNow()
	utils.JSON(c, http.StatusOK, gin.H{"message": "cron triggered"})
}

type RetryCronRequest struct {
	Job string `json:"job" binding:"required"`
}

func (h *CronHandler) RetryJob(c *gin.Context) {
	var req RetryCronRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "Job key is required")
		return
	}

	jobStatus, err := h.scheduler.RetryJob(req.Job)
	if err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	utils.JSON(c, http.StatusOK, gin.H{
		"message": "Cron job retried successfully",
		"job":     jobStatus,
	})
}

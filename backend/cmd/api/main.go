package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/joho/godotenv"

	"github.com/banhahuy/cheungprey-system/backend/internal/auth"
	"github.com/banhahuy/cheungprey-system/backend/internal/cron"
	"github.com/banhahuy/cheungprey-system/backend/internal/handlers"
	"github.com/banhahuy/cheungprey-system/backend/internal/models"
	"github.com/banhahuy/cheungprey-system/backend/internal/repository"
	"github.com/banhahuy/cheungprey-system/backend/internal/service"
	"github.com/banhahuy/cheungprey-system/backend/internal/services"
	"github.com/banhahuy/cheungprey-system/backend/pkg/config"
	"github.com/banhahuy/cheungprey-system/backend/pkg/middleware"
)

func membershipApprovalMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		perms, _ := auth.GetPermissions(c)
		isAdmin := perms != nil && (perms[models.FeatureMembershipAdmin] || perms[models.FeatureMembers])
		if isAdmin {
			c.Next()
			return
		}
		c.AbortWithStatusJSON(403, gin.H{"error": "Requires membership permission"})
	}
}

func moduleEnabled(repo *repository.Repository, key string) gin.HandlerFunc {
	return func(c *gin.Context) {
		cfg, err := repo.GetModuleConfig(key)
		if err != nil || cfg == nil || !cfg.Enabled {
			c.AbortWithStatusJSON(503, gin.H{"error": "Module disabled"})
			return
		}
		c.Next()
	}
}

func main() {
	if err := godotenv.Load(); err != nil && !os.IsNotExist(err) {
		log.Printf("warning: could not load .env: %v", err)
	}

	cfg := config.Load()

	repo, err := repository.New(cfg)
	if err != nil {
		log.Fatalf("failed to initialize repository: %v", err)
	}

	// Run startup tasks in background so server starts immediately
	go func() {
		if err := repo.SeedRolePermissionsIfEmpty(); err != nil {
			log.Printf("warning: could not seed role permissions: %v", err)
		}
		if err := repo.EnsureTemplateBucket(); err != nil {
			log.Printf("warning: could not ensure report templates bucket: %v", err)
		}
		if err := repo.EnsureReportBucket(); err != nil {
			log.Printf("warning: could not ensure report documents bucket: %v", err)
		}
	}()

	// Start nightly cron scheduler (runs at 00:00 Cambodia time)
	cronScheduler := cron.New(repo)
	cronScheduler.Start()

	permSvc := service.NewPermissionService(repo)

	authHandler := handlers.NewAuthHandler(repo, cfg)
	recordHandler := handlers.NewRecordHandler(repo)
	adminHandler := handlers.NewAdminHandler(repo, cfg)
	permissionHandler := handlers.NewPermissionHandler(repo)
	hierarchyHandler := handlers.NewHierarchyHandler(repo)
	cronHandler := handlers.NewCronHandler(cronScheduler)
	reportService := services.NewReportService("fonts")
	reportHandler := handlers.NewReportHandler(repo, reportService)
	partyHandler := handlers.NewPartyHandler(repo, reportService)
	reportDocumentHandler := handlers.NewReportDocumentHandler(repo, reportService)
	performanceHandler := handlers.NewPerformanceHandler(repo, reportService)
	fmsHandler := handlers.NewFMSHandler(repo)
	reportTemplateHandler := handlers.NewReportTemplateHandler(repo)
	membershipHandler := handlers.NewMembershipHandler(repo)
	zoneChiefHandler := handlers.NewZoneChiefHandler(repo)
	moduleConfigHandler := handlers.NewModuleConfigHandler(repo)
	menuItemHandler := handlers.NewMenuItemHandler(repo)

	r := gin.Default()
	r.Use(middleware.CORS())
	r.Use(middleware.Telegram(repo))

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "message": "server is running"})
	})

	api := r.Group("/api")
	{
		authRoutes := api.Group("/auth")
		{
			authRoutes.POST("/login", authHandler.Login)
			authRoutes.POST("/register", authHandler.Register)
			authRoutes.POST("/refresh", authHandler.RefreshToken)
			authRoutes.POST("/qr-login", authHandler.QRLogin)
		}

		protected := api.Group("")
		protected.Use(auth.JWTMiddlewareWithAccess(func(userID uuid.UUID) (*models.UserAccess, error) {
			return permSvc.GetUserAccess(userID)
		}))
		{
			protected.GET("/profile", authHandler.GetProfile)
			protected.PUT("/profile", authHandler.UpdateProfile)
			protected.GET("/permissions/features", permissionHandler.ListFeatures)

			menuItems := protected.Group("/menu-items")
			{
				menuItems.GET("", menuItemHandler.ListTree)
				menuItems.GET("/flat", menuItemHandler.ListFlat)
				menuItems.POST("", menuItemHandler.Create)
				menuItems.PUT("/:id", menuItemHandler.Update)
				menuItems.DELETE("/:id", menuItemHandler.Delete)
			}

			protected.GET("/hierarchy/provinces", hierarchyHandler.GetProvinces)
			protected.GET("/hierarchy/provinces/:province_id/districts", hierarchyHandler.GetDistricts)
			protected.GET("/hierarchy/districts/:district_id/communes", hierarchyHandler.GetCommunes)
			protected.GET("/hierarchy/communes/:commune_id/villages", hierarchyHandler.GetVillages)

			// Roles and permissions listing accessible by all authenticated users
			protected.GET("/admin/roles", permissionHandler.ListRoles)
			protected.GET("/admin/role-permissions", permissionHandler.ListRolePermissions)
			protected.GET("/settings/catalog", adminHandler.GetSettingsCatalog)

			admin := protected.Group("/admin")
			admin.Use(auth.RequireFeature(models.FeatureUsers))
			{
				admin.GET("/users", auth.RequireFeatureAction(models.FeatureUsers, "read"), adminHandler.GetUsers)
				admin.GET("/users/:id", auth.RequireFeatureAction(models.FeatureUsers, "read"), adminHandler.GetUserByID)
				admin.GET("/users/:id/qrcode", auth.RequireFeatureAction(models.FeatureUsers, "read"), adminHandler.GetUserQRCode)
				admin.POST("/users", auth.RequireFeatureAction(models.FeatureUsers, "create"), adminHandler.CreateUser)
				admin.PUT("/users/:id", auth.RequireFeatureAction(models.FeatureUsers, "update"), adminHandler.UpdateUser)
				admin.DELETE("/users/:id", auth.RequireFeatureAction(models.FeatureUsers, "delete"), adminHandler.DeleteUser)
				admin.PUT("/users/:id/roles", auth.RequireFeatureAction(models.FeatureUsers, "update"), adminHandler.UpdateUserRoles)
				admin.PUT("/users/:id/role", auth.RequireFeatureAction(models.FeatureUsers, "update"), adminHandler.UpdateUserRole)
				admin.PUT("/users/:id/password", auth.RequireFeatureAction(models.FeatureUsers, "update"), adminHandler.ResetUserPassword)
				admin.GET("/settings", auth.RequireFeatureAction(models.FeatureUsers, "read"), adminHandler.GetSettings)
			admin.GET("/system-settings", adminHandler.ListSystemSettings)
			admin.POST("/system-settings", adminHandler.UpdateSystemSetting)
			admin.GET("/database/tables", adminHandler.ListDatabaseTables)
				admin.GET("/statistics", auth.RequireFeatureAction(models.FeatureUsers, "read"), adminHandler.GetStatistics)
				admin.PUT("/role-permissions/:role", auth.RequireFeatureAction(models.FeatureUsers, "update"), permissionHandler.UpdateRolePermissions)
				admin.POST("/roles", auth.RequireFeatureAction(models.FeatureUsers, "create"), permissionHandler.CreateRole)
				admin.PUT("/roles/:role", auth.RequireFeatureAction(models.FeatureUsers, "update"), permissionHandler.UpdateRole)
				admin.DELETE("/roles/:role", auth.RequireFeatureAction(models.FeatureUsers, "delete"), permissionHandler.DeleteRole)
				admin.GET("/cron/status", cronHandler.Status)
				admin.POST("/cron/run", cronHandler.RunNow)
				admin.POST("/cron/retry", cronHandler.RetryJob)
				admin.GET("/zone-chiefs", auth.RequireFeatureAction(models.FeatureUsers, "read"), zoneChiefHandler.ListAssignments)
				admin.GET("/zone-chiefs/:zoneCode", auth.RequireFeatureAction(models.FeatureUsers, "read"), zoneChiefHandler.GetAssignment)
				admin.POST("/zone-chiefs", auth.RequireFeatureAction(models.FeatureUsers, "update"), zoneChiefHandler.Assign)
				admin.DELETE("/zone-chiefs", auth.RequireFeatureAction(models.FeatureUsers, "delete"), zoneChiefHandler.Remove)
			}

			records := protected.Group("/records")
			records.Use(moduleEnabled(repo, "records"))
			records.Use(auth.RequireFeature(models.FeatureRecords))
			{
				records.POST("", auth.RequireFeatureAction(models.FeatureRecords, "create"), recordHandler.CreateRecord)
				records.GET("", auth.RequireFeatureAction(models.FeatureRecords, "read"), recordHandler.GetRecords)
				records.GET("/:id", auth.RequireFeatureAction(models.FeatureRecords, "read"), recordHandler.GetRecordByID)
				records.PUT("/:id", auth.RequireFeatureAction(models.FeatureRecords, "update"), recordHandler.UpdateRecord)
				records.DELETE("/:id", auth.RequireFeatureAction(models.FeatureRecords, "delete"), recordHandler.DeleteRecord)
			}

			party := protected.Group("/party")
			{
				party.GET("/zones", partyHandler.GetZones)
				party.GET("/zones/tree", partyHandler.GetZoneTree)
				party.GET("/zones/counts", partyHandler.GetZoneCounts)
				party.GET("/structures", partyHandler.GetStructures)

				members := party.Group("")
				members.Use(auth.RequireFeature(models.FeatureMembers))
				{
					members.POST("/members", auth.RequireFeatureAction(models.FeatureMembers, "create"), partyHandler.CreateMember)
					members.GET("/members", auth.RequireFeatureAction(models.FeatureMembers, "read"), partyHandler.GetMembers)
					members.GET("/members/:id", auth.RequireFeatureAction(models.FeatureMembers, "read"), partyHandler.GetMemberByID)
					members.PUT("/members/:id", auth.RequireFeatureAction(models.FeatureMembers, "update"), partyHandler.UpdateMember)
					members.DELETE("/members/:id", auth.RequireFeatureAction(models.FeatureMembers, "delete"), partyHandler.DeleteMember)
				}

				voters := party.Group("")
				voters.Use(auth.RequireFeature(models.FeatureVoters))
				{
					voters.POST("/voters", auth.RequireFeatureAction(models.FeatureVoters, "create"), partyHandler.CreateVoter)
					voters.GET("/voters", auth.RequireFeatureAction(models.FeatureVoters, "read"), partyHandler.GetVoters)
				}

				files := party.Group("")
				files.Use(moduleEnabled(repo, "files"))
				files.Use(auth.RequireFeature(models.FeatureFiles))
				{
					files.POST("/files", auth.RequireFeatureAction(models.FeatureFiles, "create"), partyHandler.UploadFile)
					files.GET("/files", auth.RequireFeatureAction(models.FeatureFiles, "read"), partyHandler.GetFiles)
					files.GET("/files/:id", auth.RequireFeatureAction(models.FeatureFiles, "read"), partyHandler.GetFileByID)
					files.DELETE("/files/:id", auth.RequireFeatureAction(models.FeatureFiles, "delete"), partyHandler.DeleteFile)
				}
			}

			membership := protected.Group("/membership")
			membership.Use(moduleEnabled(repo, "membership"))
			membership.Use(auth.RequireFeature(models.FeatureMembers))
			{
				membership.GET("", auth.RequireFeatureAction(models.FeatureMembers, "read"), membershipHandler.SearchMembers)
				membership.GET("/stats", auth.RequireFeatureAction(models.FeatureMembers, "read"), membershipHandler.GetStats)
				membership.GET("/export", auth.RequireFeatureAction(models.FeatureMembers, "read"), membershipHandler.Export)

				registrations := membership.Group("/registrations")
				{
					registrations.POST("", auth.RequireFeatureAction(models.FeatureMembers, "create"), membershipHandler.CreateRegistration)
					registrations.GET("", auth.RequireFeatureAction(models.FeatureMembers, "read"), membershipHandler.ListRegistrations)
					registrations.GET("/:registrationId", auth.RequireFeatureAction(models.FeatureMembers, "read"), membershipHandler.GetRegistration)
					registrations.GET("/:registrationId/documents/:documentType", auth.RequireFeatureAction(models.FeatureMembers, "read"), membershipHandler.GetRegistrationDocument)
					registrations.PUT("/:registrationId", auth.RequireFeatureAction(models.FeatureMembers, "create"), membershipHandler.UpdateRegistration)
					registrations.POST("/:registrationId/documents", auth.RequireFeatureAction(models.FeatureMembers, "create"), membershipHandler.UploadRegistrationDocument)
					registrations.POST("/:registrationId/submit", auth.RequireFeatureAction(models.FeatureMembers, "create"), membershipHandler.SubmitRegistration)
				}

				registrationReview := membership.Group("/registrations")
				registrationReview.Use(auth.RequireFeature(models.FeatureMembershipAdmin))
				{
					registrationReview.POST("/:registrationId/verify", membershipHandler.VerifyRegistration)
					registrationReview.POST("/:registrationId/approve", membershipHandler.ApproveRegistration)
					registrationReview.POST("/:registrationId/reject", membershipHandler.RejectRegistration)
				}

				membership.GET("/:id/profile", auth.RequireFeatureAction(models.FeatureMembers, "read"), membershipHandler.GetProfile)
				membership.GET("/:id/demographics", auth.RequireFeatureAction(models.FeatureMembers, "read"), membershipHandler.GetDemographics)
				membership.PUT("/:id/demographics", auth.RequireFeatureAction(models.FeatureMembers, "update"), membershipHandler.UpdateDemographics)
				membership.GET("/:id/history", auth.RequireFeatureAction(models.FeatureMembers, "read"), membershipHandler.GetStatusHistory)
				membership.GET("/:id/activity", auth.RequireFeatureAction(models.FeatureMembers, "read"), membershipHandler.ListActivity)
				membership.GET("/:id/dues", auth.RequireFeatureAction(models.FeatureMembers, "read"), membershipHandler.ListDues)
				membership.GET("/:id/positions", auth.RequireFeatureAction(models.FeatureMembers, "read"), membershipHandler.ListPositions)
				membership.GET("/:id/cards", auth.RequireFeatureAction(models.FeatureMembers, "read"), membershipHandler.ListCards)
				membership.POST("/:id/check-in", auth.RequireFeatureAction(models.FeatureMembers, "update"), membershipHandler.CheckIn)

				write := membership.Group("")
				write.Use(auth.RequireFeature(models.FeatureMembershipWrite))
				{
					write.POST("/:id/activity", auth.RequireFeatureAction(models.FeatureMembers, "update"), membershipHandler.RecordActivity)
					write.POST("/:id/positions", auth.RequireFeatureAction(models.FeatureMembers, "update"), membershipHandler.AssignPosition)
					write.POST("/import", auth.RequireFeatureAction(models.FeatureMembers, "create"), membershipHandler.BulkImport)
				}

				dues := membership.Group("")
				dues.Use(auth.RequireFeature(models.FeatureMembershipDues))
				{
					dues.POST("/:id/dues", auth.RequireFeatureAction(models.FeatureMembers, "update"), membershipHandler.RecordDue)
				}

				admin := membership.Group("")
				admin.Use(auth.RequireFeature(models.FeatureMembershipAdmin))
				{
					admin.POST("/:id/status", membershipHandler.ChangeStatus)
					admin.POST("/status/bulk", membershipHandler.BulkStatusChange)
				}

				approval := membership.Group("")
				approval.Use(membershipApprovalMiddleware())
				{
					approval.POST("/:id/approve", membershipHandler.ApproveMember)
					approval.POST("/:id/reject", membershipHandler.RejectMember)
				}

				delete := membership.Group("")
				delete.Use(auth.RequireFeature(models.FeatureMembershipDelete))
				{
					delete.DELETE("/:id", auth.RequireFeatureAction(models.FeatureMembers, "delete"), partyHandler.DeleteMember)
				}

				cards := membership.Group("")
				cards.Use(auth.RequireFeature(models.FeatureMembershipCards))
				{
					cards.POST("/:id/cards", membershipHandler.IssueCard)
					cards.PUT("/cards/:id", membershipHandler.UpdateCard)
				}
			}

			modules := protected.Group("/modules")
			{
				modules.GET("", moduleConfigHandler.ListModules)
				modules.GET("/:key/steps", moduleConfigHandler.ListSteps)

				adminModules := modules.Group("")
				adminModules.Use(auth.RequireAnyFeature(models.FeatureTechnical, models.FeatureUsers))
				{
					adminModules.PUT("/:key", moduleConfigHandler.UpdateModule)
					adminModules.POST("/:key/steps", moduleConfigHandler.CreateStep)
					adminModules.PUT("/:key/steps/:stepId", moduleConfigHandler.UpdateStep)
					adminModules.DELETE("/:key/steps/:stepId", moduleConfigHandler.DeleteStep)
					adminModules.PUT("/:key/steps/reorder", moduleConfigHandler.ReorderSteps)
				}
			}

			approvals := protected.Group("/approvals")
			{
				approvals.GET("/queue", moduleConfigHandler.ApprovalQueue)
				approvals.GET("/:module/:itemId", moduleConfigHandler.ItemApprovalHistory)
				approvals.POST("/:id/approve", moduleConfigHandler.ApproveItem)
				approvals.POST("/:id/reject", moduleConfigHandler.RejectItem)
			}

			reports := protected.Group("/reports")
			reports.Use(moduleEnabled(repo, "reports"))
			reports.Use(auth.RequireFeature(models.FeatureReports))
			{
				reports.GET("/members", auth.RequireFeatureAction(models.FeatureReports, "read"), reportHandler.MemberReport)
				reports.GET("/performance/:zone_id/:period_id", auth.RequireFeatureAction(models.FeatureReports, "read"), performanceHandler.PerformanceReport)
			}

			reportDocs := protected.Group("/report-documents")
			reportDocs.Use(auth.RequireFeature(models.FeatureReports))
			{
				reportDocs.GET("/:id/pdf", auth.RequireFeatureAction(models.FeatureReports, "read"), reportDocumentHandler.DownloadPDF)
				reportDocs.POST("/simple", auth.RequireFeatureAction(models.FeatureReports, "create"), reportDocumentHandler.CreateSimple)
				reportDocs.PUT("/:id/simple", auth.RequireFeatureAction(models.FeatureReports, "update"), reportDocumentHandler.UpdateSimple)
				reportDocs.PUT("/:id/status", auth.RequireFeatureAction(models.FeatureReports, "update"), reportDocumentHandler.UpdateStatus)
				reportDocs.PUT("/:id/restore", auth.RequireFeatureAction(models.FeatureReports, "update"), reportDocumentHandler.Restore)
				reportDocs.PUT("/:id/submit", auth.RequireFeatureAction(models.FeatureReports, "update"), reportDocumentHandler.Submit)
				reportDocs.PUT("/:id/reject", auth.RequireFeatureAction(models.FeatureReports, "update"), reportDocumentHandler.Reject)
				reportDocs.GET("/:id/reviews", auth.RequireFeatureAction(models.FeatureReports, "read"), reportDocumentHandler.ListReviews)
				reportDocs.POST("", auth.RequireFeatureAction(models.FeatureReports, "create"), reportDocumentHandler.Create)
				reportDocs.GET("", auth.RequireFeatureAction(models.FeatureReports, "read"), reportDocumentHandler.List)
				reportDocs.GET("/:id", auth.RequireFeatureAction(models.FeatureReports, "read"), reportDocumentHandler.GetByID)
				reportDocs.PUT("/:id", auth.RequireFeatureAction(models.FeatureReports, "update"), reportDocumentHandler.Update)
				reportDocs.DELETE("/:id", auth.RequireFeatureAction(models.FeatureReports, "delete"), reportDocumentHandler.Delete)
			}

			reportTemplates := protected.Group("/report-templates")
			reportTemplates.Use(auth.RequireFeature(models.FeatureReports))
			{
				reportTemplates.GET("", auth.RequireFeatureAction(models.FeatureReports, "read"), reportTemplateHandler.List)
				reportTemplates.POST("", auth.RequireFeatureAction(models.FeatureReports, "create"), reportTemplateHandler.Upload)
				reportTemplates.POST("/:id/duplicate", auth.RequireFeatureAction(models.FeatureReports, "create"), reportTemplateHandler.Duplicate)
				reportTemplates.GET("/:id", auth.RequireFeatureAction(models.FeatureReports, "read"), reportTemplateHandler.GetByID)
				reportTemplates.PUT("/:id", auth.RequireFeatureAction(models.FeatureReports, "update"), reportTemplateHandler.Update)
				reportTemplates.GET("/:id/download", auth.RequireFeatureAction(models.FeatureReports, "read"), reportTemplateHandler.Download)
				reportTemplates.GET("/filled", auth.RequireFeatureAction(models.FeatureReports, "read"), reportTemplateHandler.DownloadFilled)
				reportTemplates.DELETE("/:id", auth.RequireFeatureAction(models.FeatureReports, "delete"), reportTemplateHandler.Delete)
				reportTemplates.POST("/:id/fill", auth.RequireFeatureAction(models.FeatureReports, "create"), reportTemplateHandler.Fill)
				reportTemplates.POST("/:id/create-report", auth.RequireFeatureAction(models.FeatureReports, "create"), reportTemplateHandler.CreateReportFromTemplate)
				reportTemplates.POST("/:id/keys", auth.RequireFeatureAction(models.FeatureReports, "update"), reportTemplateHandler.AddKey)
			}

			performance := protected.Group("/performance")
			performance.Use(moduleEnabled(repo, "performance"))
			performance.Use(auth.RequireAnyFeature(models.FeaturePerformance, models.FeaturePerformanceAdmin))
			{
				performance.GET("/domains", auth.RequireFeatureAction(models.FeaturePerformance, "read"), performanceHandler.ListDomains)
				performance.GET("/domains/full", auth.RequireFeatureAction(models.FeaturePerformance, "read"), performanceHandler.ListDomainsFull)
				performance.GET("/domains/:id/sub-domains", auth.RequireFeatureAction(models.FeaturePerformance, "read"), performanceHandler.ListSubDomains)
				performance.GET("/sub-domains/:id/indicators", auth.RequireFeatureAction(models.FeaturePerformance, "read"), performanceHandler.ListIndicators)
				performance.GET("/indicators", auth.RequireFeatureAction(models.FeaturePerformance, "read"), performanceHandler.ListAllIndicators)
				performance.POST("/data", auth.RequireFeatureAction(models.FeaturePerformance, "create"), performanceHandler.CreatePerformanceData)
				performance.POST("/data/bulk", auth.RequireFeatureAction(models.FeaturePerformance, "create"), performanceHandler.BulkCreatePerformanceData)
				performance.GET("/data", auth.RequireFeatureAction(models.FeaturePerformance, "read"), performanceHandler.GetPerformanceData)
				performance.GET("/data/submissions", auth.RequireFeatureAction(models.FeaturePerformance, "read"), performanceHandler.ListSubmissions)
				performance.GET("/data/compare", auth.RequireFeatureAction(models.FeaturePerformance, "read"), performanceHandler.ComparePerformance)
				performance.DELETE("/data/:id", auth.RequireFeatureAction(models.FeaturePerformance, "delete"), performanceHandler.DeletePerformanceData)
				performance.DELETE("/data", auth.RequireFeatureAction(models.FeaturePerformance, "delete"), performanceHandler.DeletePerformanceDataByZoneAndPeriod)
				performance.GET("/periods", auth.RequireFeatureAction(models.FeaturePerformance, "read"), performanceHandler.ListPeriods)
				performance.POST("/submissions", auth.RequireFeatureAction(models.FeaturePerformance, "create"), performanceHandler.CreateSubmission)
			}

			performanceAdmin := protected.Group("/performance")
			performanceAdmin.Use(auth.RequireFeature(models.FeaturePerformanceAdmin))
			{
				performanceAdmin.POST("/domains", performanceHandler.CreateDomain)
				performanceAdmin.PUT("/domains/:id", performanceHandler.UpdateDomain)
				performanceAdmin.DELETE("/domains/:id", performanceHandler.DeleteDomain)
				performanceAdmin.POST("/sub-domains", performanceHandler.CreateSubDomain)
				performanceAdmin.PUT("/sub-domains/:id", performanceHandler.UpdateSubDomain)
				performanceAdmin.DELETE("/sub-domains/:id", performanceHandler.DeleteSubDomain)
				performanceAdmin.POST("/indicators", performanceHandler.CreateIndicator)
				performanceAdmin.PUT("/indicators/:id", performanceHandler.UpdateIndicator)
				performanceAdmin.DELETE("/indicators/:id", performanceHandler.DeleteIndicator)
				performanceAdmin.POST("/periods", performanceHandler.CreatePeriod)
				performanceAdmin.PUT("/periods/:id", performanceHandler.UpdatePeriod)
				performanceAdmin.DELETE("/periods/:id", performanceHandler.DeletePeriod)
				performanceAdmin.PUT("/submissions/:id/submit", performanceHandler.SubmitSubmission)
				performanceAdmin.PUT("/submissions/:id/approve", performanceHandler.ApproveSubmission)
				performanceAdmin.PUT("/submissions/:id/reject", performanceHandler.RejectSubmission)
			}

			fms := protected.Group("/fms")
			fms.Use(moduleEnabled(repo, "finances"))
			fms.Use(auth.RequireFeature(models.FeatureFinances))
			{
				// Chart of Accounts
				fms.GET("/coa", auth.RequireFeatureAction(models.FeatureFinances, "read"), fmsHandler.ListCoA)
				fms.GET("/coa/:code", auth.RequireFeatureAction(models.FeatureFinances, "read"), fmsHandler.GetCoA)
				fms.POST("/coa", auth.RequireFeatureAction(models.FeatureFinances, "create"), fmsHandler.CreateCoA)
				fms.PUT("/coa/:code", auth.RequireFeatureAction(models.FeatureFinances, "update"), fmsHandler.UpdateCoA)

				// Budgets
				fms.GET("/budgets", auth.RequireFeatureAction(models.FeatureFinances, "read"), fmsHandler.ListFMSBudgets)
				fms.POST("/budgets", auth.RequireFeatureAction(models.FeatureFinances, "create"), fmsHandler.CreateFMSBudget)
				fms.GET("/budgets/:id", auth.RequireFeatureAction(models.FeatureFinances, "read"), fmsHandler.GetFMSBudget)
				fms.PUT("/budgets/:id", auth.RequireFeatureAction(models.FeatureFinances, "update"), fmsHandler.UpdateFMSBudget)

				// Transactions
				fms.POST("/transactions", auth.RequireFeatureAction(models.FeatureFinances, "create"), fmsHandler.CreateFMSTransaction)
				fms.GET("/transactions", auth.RequireFeatureAction(models.FeatureFinances, "read"), fmsHandler.ListFMSTransactions)
				fms.GET("/transactions/:id", auth.RequireFeatureAction(models.FeatureFinances, "read"), fmsHandler.GetFMSTransaction)
				fms.POST("/transactions/:id/approve", auth.RequireFeatureAction(models.FeatureFinances, "update"), fmsHandler.ApproveFMSTransaction)
				fms.POST("/transactions/:id/reject", auth.RequireFeatureAction(models.FeatureFinances, "update"), fmsHandler.RejectFMSTransaction)
				fms.POST("/transactions/:id/reverse", auth.RequireFeatureAction(models.FeatureFinances, "delete"), fmsHandler.ReverseFMSTransaction)

				// Dashboard
				fms.GET("/dashboard", auth.RequireFeatureAction(models.FeatureFinances, "read"), fmsHandler.GetFMSDashboard)

				// Audit Log
				fms.GET("/audit", auth.RequireFeatureAction(models.FeatureFinances, "read"), fmsHandler.ListFMSAuditLog)
			}
		}
	}

	port := cfg.Port
	if p := os.Getenv("PORT"); p != "" {
		port = p
	}

	log.Printf("Server starting on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}

package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/joho/godotenv"

	"github.com/banhahuy/cheungprey-system/backend/internal/auth"
	"github.com/banhahuy/cheungprey-system/backend/internal/handlers"
	"github.com/banhahuy/cheungprey-system/backend/internal/models"
	"github.com/banhahuy/cheungprey-system/backend/internal/repository"
	"github.com/banhahuy/cheungprey-system/backend/internal/services"
	"github.com/banhahuy/cheungprey-system/backend/internal/service"
	"github.com/banhahuy/cheungprey-system/backend/pkg/config"
	"github.com/banhahuy/cheungprey-system/backend/pkg/middleware"
)

func main() {
	if err := godotenv.Load(); err != nil && !os.IsNotExist(err) {
		log.Printf("warning: could not load .env: %v", err)
	}

	cfg := config.Load()

	repo, err := repository.New(cfg)
	if err != nil {
		log.Fatalf("failed to initialize repository: %v", err)
	}

	if err := repo.SeedRolePermissionsIfEmpty(); err != nil {
		log.Printf("warning: could not seed role permissions: %v", err)
	}

	permSvc := service.NewPermissionService(repo)

	authHandler := handlers.NewAuthHandler(repo, cfg)
	recordHandler := handlers.NewRecordHandler(repo)
	adminHandler := handlers.NewAdminHandler(repo, cfg)
	permissionHandler := handlers.NewPermissionHandler(repo)
	hierarchyHandler := handlers.NewHierarchyHandler(repo)
	reportService := services.NewReportService("fonts")
	reportHandler := handlers.NewReportHandler(repo, reportService)
	partyHandler := handlers.NewPartyHandler(repo, reportService)
	reportDocumentHandler := handlers.NewReportDocumentHandler(repo, reportService)
	performanceHandler := handlers.NewPerformanceHandler(repo, reportService)
	fmsHandler := handlers.NewFMSHandler(repo)

	r := gin.Default()
	r.Use(middleware.CORS())

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
		}

		protected := api.Group("")
		protected.Use(auth.JWTMiddlewareWithAccess(func(userID uuid.UUID) (*models.UserAccess, error) {
			return permSvc.GetUserAccess(userID)
		}))
		{
			protected.GET("/profile", authHandler.GetProfile)
			protected.PUT("/profile", authHandler.UpdateProfile)
			protected.GET("/permissions/features", permissionHandler.ListFeatures)

			protected.GET("/hierarchy/provinces", hierarchyHandler.GetProvinces)
			protected.GET("/hierarchy/provinces/:province_id/districts", hierarchyHandler.GetDistricts)
			protected.GET("/hierarchy/districts/:district_id/communes", hierarchyHandler.GetCommunes)
			protected.GET("/hierarchy/communes/:commune_id/villages", hierarchyHandler.GetVillages)

			admin := protected.Group("/admin")
			admin.Use(auth.RequireFeature(models.FeatureUsers))
			{
				admin.GET("/users", adminHandler.GetUsers)
				admin.GET("/users/:id", adminHandler.GetUserByID)
				admin.POST("/users", adminHandler.CreateUser)
				admin.PUT("/users/:id", adminHandler.UpdateUser)
				admin.DELETE("/users/:id", adminHandler.DeleteUser)
				admin.PUT("/users/:id/roles", adminHandler.UpdateUserRoles)
				admin.PUT("/users/:id/role", adminHandler.UpdateUserRole)
				admin.PUT("/users/:id/password", adminHandler.ResetUserPassword)
				admin.GET("/settings", adminHandler.GetSettings)
				admin.GET("/statistics", adminHandler.GetStatistics)
				admin.GET("/role-permissions", permissionHandler.ListRolePermissions)
				admin.PUT("/role-permissions/:role", permissionHandler.UpdateRolePermissions)
				admin.GET("/roles", permissionHandler.ListRoles)
				admin.POST("/roles", permissionHandler.CreateRole)
				admin.PUT("/roles/:role", permissionHandler.UpdateRole)
				admin.DELETE("/roles/:role", permissionHandler.DeleteRole)
			}

			records := protected.Group("/records")
			records.Use(auth.RequireFeature(models.FeatureRecords))
			{
				records.POST("", recordHandler.CreateRecord)
				records.GET("", recordHandler.GetRecords)
				records.GET("/:id", recordHandler.GetRecordByID)
				records.PUT("/:id", recordHandler.UpdateRecord)
				records.DELETE("/:id", recordHandler.DeleteRecord)
			}

			party := protected.Group("/party")
			{
				party.GET("/zones", partyHandler.GetZones)
				party.GET("/zones/tree", partyHandler.GetZoneTree)
				party.GET("/structures", partyHandler.GetStructures)

				members := party.Group("")
				members.Use(auth.RequireFeature(models.FeatureMembers))
				{
					members.POST("/members", partyHandler.CreateMember)
					members.GET("/members", partyHandler.GetMembers)
					members.GET("/members/:id", partyHandler.GetMemberByID)
					members.PUT("/members/:id", partyHandler.UpdateMember)
					members.DELETE("/members/:id", partyHandler.DeleteMember)
				}

				voters := party.Group("")
				voters.Use(auth.RequireFeature(models.FeatureVoters))
				{
					voters.POST("/voters", partyHandler.CreateVoter)
					voters.GET("/voters", partyHandler.GetVoters)
				}

				files := party.Group("")
				files.Use(auth.RequireFeature(models.FeatureFiles))
				{
					files.POST("/files", partyHandler.UploadFile)
					files.GET("/files", partyHandler.GetFiles)
					files.GET("/files/:id", partyHandler.GetFileByID)
					files.DELETE("/files/:id", partyHandler.DeleteFile)
				}
			}

			reports := protected.Group("/reports")
			reports.Use(auth.RequireFeature(models.FeatureReports))
			{
				reports.GET("/members", reportHandler.MemberReport)
				reports.GET("/performance/:zone_id/:period_id", performanceHandler.PerformanceReport)
			}

			reportDocs := protected.Group("/report-documents")
			reportDocs.Use(auth.RequireFeature(models.FeatureReports))
			{
				reportDocs.GET("/:id/pdf", reportDocumentHandler.DownloadPDF)
				reportDocs.POST("/simple", reportDocumentHandler.CreateSimple)
				reportDocs.PUT("/:id/simple", reportDocumentHandler.UpdateSimple)
				reportDocs.POST("", reportDocumentHandler.Create)
				reportDocs.GET("", reportDocumentHandler.List)
				reportDocs.GET("/:id", reportDocumentHandler.GetByID)
				reportDocs.PUT("/:id", reportDocumentHandler.Update)
				reportDocs.DELETE("/:id", reportDocumentHandler.Delete)
			}

			performance := protected.Group("/performance")
			performance.Use(auth.RequireFeature(models.FeaturePerformance))
			{
				performance.GET("/domains", performanceHandler.ListDomains)
				performance.GET("/domains/full", performanceHandler.ListDomainsFull)
				performance.GET("/domains/:id/sub-domains", performanceHandler.ListSubDomains)
				performance.GET("/sub-domains/:id/indicators", performanceHandler.ListIndicators)
				performance.GET("/indicators", performanceHandler.ListAllIndicators)
				performance.POST("/data", performanceHandler.CreatePerformanceData)
				performance.POST("/data/bulk", performanceHandler.BulkCreatePerformanceData)
				performance.GET("/data", performanceHandler.GetPerformanceData)
				performance.GET("/data/submissions", performanceHandler.ListSubmissions)
				performance.DELETE("/data/:id", performanceHandler.DeletePerformanceData)
				performance.DELETE("/data", performanceHandler.DeletePerformanceDataByZoneAndPeriod)
				performance.GET("/periods", performanceHandler.ListPeriods)
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
				performanceAdmin.DELETE("/periods/:id", performanceHandler.DeletePeriod)
			}

			fms := protected.Group("/fms")
			fms.Use(auth.RequireFeature(models.FeatureFinances))
			{
				// Chart of Accounts
				fms.GET("/coa", fmsHandler.ListCoA)
				fms.GET("/coa/:code", fmsHandler.GetCoA)
				fms.POST("/coa", fmsHandler.CreateCoA)
				fms.PUT("/coa/:code", fmsHandler.UpdateCoA)

				// Budgets
				fms.GET("/budgets", fmsHandler.ListFMSBudgets)
				fms.POST("/budgets", fmsHandler.CreateFMSBudget)
				fms.GET("/budgets/:id", fmsHandler.GetFMSBudget)
				fms.PUT("/budgets/:id", fmsHandler.UpdateFMSBudget)

				// Transactions
				fms.POST("/transactions", fmsHandler.CreateFMSTransaction)
				fms.GET("/transactions", fmsHandler.ListFMSTransactions)
				fms.GET("/transactions/:id", fmsHandler.GetFMSTransaction)
				fms.POST("/transactions/:id/approve", fmsHandler.ApproveFMSTransaction)
				fms.POST("/transactions/:id/reject", fmsHandler.RejectFMSTransaction)
				fms.POST("/transactions/:id/reverse", fmsHandler.ReverseFMSTransaction)

				// Dashboard
				fms.GET("/dashboard", fmsHandler.GetFMSDashboard)

				// Audit Log
				fms.GET("/audit", fmsHandler.ListFMSAuditLog)
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

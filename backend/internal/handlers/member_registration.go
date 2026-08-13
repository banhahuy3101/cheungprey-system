package handlers

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"math"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/banhahuy/cheungprey-system/backend/internal/auth"
	"github.com/banhahuy/cheungprey-system/backend/internal/models"
	"github.com/banhahuy/cheungprey-system/backend/pkg/utils"
)

var (
	nationalIDPattern = regexp.MustCompile(`^[0-9]{9,10}$`)
	phonePattern      = regexp.MustCompile(`^(?:0[0-9]{8,9}|\+855[0-9]{8,9})$`)
)

func (h *MembershipHandler) CreateRegistration(c *gin.Context) {
	var req models.SaveMemberRegistrationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	userID, _ := auth.GetUserID(c)
	registration := registrationFromRequest(req)
	registration.ID = uuid.New()
	registration.RegistrationNo = fmt.Sprintf("REG-%d-%s", time.Now().Year(), strings.ToUpper(registration.ID.String()[:8]))
	registration.Status = models.RegistrationDraft
	if userID != uuid.Nil {
		registration.CreatedBy = &userID
	}

	if err := h.repo.CreateRegistration(registration); err != nil {
		utils.InternalError(c, "Failed to save registration draft")
		return
	}
	h.recordRegistrationEvent(registration.ID, "saved_draft", "", models.RegistrationDraft, "", userID)
	utils.JSON(c, http.StatusCreated, registration)
}

func (h *MembershipHandler) ListRegistrations(c *gin.Context) {
	registrations, err := h.repo.ListRegistrations(c.Query("status"))
	if err != nil {
		utils.InternalError(c, "Failed to fetch registrations")
		return
	}
	utils.JSON(c, http.StatusOK, registrations)
}

func (h *MembershipHandler) GetRegistration(c *gin.Context) {
	registration, ok := h.registrationFromParam(c)
	if !ok {
		return
	}
	utils.JSON(c, http.StatusOK, h.registrationDetail(registration))
}

func (h *MembershipHandler) UpdateRegistration(c *gin.Context) {
	registration, ok := h.registrationFromParam(c)
	if !ok {
		return
	}
	if !isRegistrationEditable(registration.Status) {
		utils.BadRequest(c, "Only draft or rejected registrations can be edited")
		return
	}

	var req models.SaveMemberRegistrationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	if err := h.repo.UpdateRegistration(registration.ID, registrationRequestData(req)); err != nil {
		utils.InternalError(c, "Failed to update registration")
		return
	}
	updated, _ := h.repo.GetRegistrationByID(registration.ID)
	userID, _ := auth.GetUserID(c)
	h.recordRegistrationEvent(registration.ID, "updated_draft", registration.Status, registration.Status, "", userID)
	utils.JSON(c, http.StatusOK, updated)
}

func (h *MembershipHandler) UploadRegistrationDocument(c *gin.Context) {
	registration, ok := h.registrationFromParam(c)
	if !ok {
		return
	}
	if !isRegistrationEditable(registration.Status) {
		utils.BadRequest(c, "Documents can only be changed on a draft or rejected registration")
		return
	}

	var req models.UploadRegistrationDocumentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}
	raw, err := validateRegistrationDocument(req)
	if err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	previous, err := h.repo.GetRegistrationDocument(registration.ID, req.DocumentType)
	if err != nil {
		utils.InternalError(c, "Failed to validate existing document")
		return
	}

	userID, _ := auth.GetUserID(c)
	description := "Membership registration: " + req.DocumentType
	file := &models.PartyFile{
		ID:            uuid.New(),
		FileName:      req.FileName,
		MimeType:      req.MimeType,
		Base64Content: req.Base64Data,
		FileSize:      len(raw),
		Description:   &description,
	}
	if userID != uuid.Nil {
		file.UploadedBy = &userID
	}
	if err := h.repo.CreateFile(file); err != nil {
		utils.InternalError(c, "Failed to upload registration document")
		return
	}

	document := &models.MemberRegistrationDocument{
		ID:             uuid.New(),
		RegistrationID: registration.ID,
		FileID:         file.ID,
		DocumentType:   req.DocumentType,
	}
	if previous != nil {
		document.ID = previous.ID
		err = h.repo.UpdateRegistrationDocument(previous.ID, file.ID)
	} else {
		err = h.repo.CreateRegistrationDocument(document)
	}
	if err != nil {
		_ = h.repo.DeleteFile(file.ID)
		utils.InternalError(c, "Failed to attach registration document")
		return
	}
	if previous != nil {
		_ = h.repo.DeleteFile(previous.FileID)
	}

	document.FileName = file.FileName
	document.MimeType = file.MimeType
	document.FileSize = file.FileSize
	h.recordRegistrationEvent(registration.ID, "uploaded_document", registration.Status, registration.Status, req.DocumentType, userID)
	utils.JSON(c, http.StatusCreated, document)
}

func (h *MembershipHandler) GetRegistrationDocument(c *gin.Context) {
	registration, ok := h.registrationFromParam(c)
	if !ok {
		return
	}
	documentType := c.Param("documentType")
	document, err := h.repo.GetRegistrationDocument(registration.ID, documentType)
	if err != nil {
		utils.InternalError(c, "Failed to fetch registration document")
		return
	}
	if document == nil {
		utils.Error(c, http.StatusNotFound, "Registration document not found")
		return
	}
	file, err := h.repo.GetFileByID(document.FileID)
	if err != nil || file == nil {
		utils.Error(c, http.StatusNotFound, "Registration file not found")
		return
	}
	utils.JSON(c, http.StatusOK, file)
}

func (h *MembershipHandler) SubmitRegistration(c *gin.Context) {
	registration, ok := h.registrationFromParam(c)
	if !ok {
		return
	}
	if !isRegistrationEditable(registration.Status) {
		utils.BadRequest(c, "Only draft or rejected registrations can be submitted")
		return
	}

	documents, err := h.repo.ListRegistrationDocuments(registration.ID)
	if err != nil {
		utils.InternalError(c, "Failed to validate registration documents")
		return
	}
	if message := validateRegistrationForSubmission(registration, documents); message != "" {
		utils.BadRequest(c, message)
		return
	}
	if message := h.validateRegistrationNationalID(registration); message != "" {
		utils.BadRequest(c, message)
		return
	}

	userID, _ := auth.GetUserID(c)
	now := time.Now()
	data := map[string]any{
		"status":           models.RegistrationPending,
		"submitted_at":     now,
		"submitted_by":     nullableUserID(userID),
		"rejection_reason": nil,
		"updated_at":       "now()",
	}
	if err := h.repo.UpdateRegistration(registration.ID, data); err != nil {
		utils.InternalError(c, "Failed to submit registration")
		return
	}
	h.recordRegistrationEvent(registration.ID, "submitted", registration.Status, models.RegistrationPending, "", userID)
	updated, _ := h.repo.GetRegistrationByID(registration.ID)
	utils.JSON(c, http.StatusOK, updated)
}

func (h *MembershipHandler) VerifyRegistration(c *gin.Context) {
	registration, ok := h.registrationFromParam(c)
	if !ok {
		return
	}
	if registration.Status != models.RegistrationPending {
		utils.BadRequest(c, "Only submitted registrations can be verified")
		return
	}

	var req models.RegistrationDecisionRequest
	_ = c.ShouldBindJSON(&req)
	userID, _ := auth.GetUserID(c)
	now := time.Now()
	if err := h.repo.UpdateRegistration(registration.ID, map[string]any{
		"status":      models.RegistrationVerified,
		"verified_at": now,
		"verified_by": nullableUserID(userID),
		"updated_at":  "now()",
	}); err != nil {
		utils.InternalError(c, "Failed to verify registration")
		return
	}
	h.recordRegistrationEvent(registration.ID, "verified", registration.Status, models.RegistrationVerified, req.Notes, userID)
	updated, _ := h.repo.GetRegistrationByID(registration.ID)
	utils.JSON(c, http.StatusOK, updated)
}

func (h *MembershipHandler) ApproveRegistration(c *gin.Context) {
	registration, ok := h.registrationFromParam(c)
	if !ok {
		return
	}
	if registration.Status != models.RegistrationVerified {
		utils.BadRequest(c, "Only verified registrations can be approved")
		return
	}
	if message := h.validateRegistrationNationalID(registration); message != "" {
		utils.BadRequest(c, message)
		return
	}

	memberID := uuid.New()
	member := memberFromRegistration(registration, memberID)
	if err := h.repo.CreateMember(member); err != nil {
		utils.InternalError(c, "Failed to create member from registration")
		return
	}

	userID, _ := auth.GetUserID(c)
	now := time.Now()
	if err := h.repo.AttachRegistrationFiles(registration.ID, memberID); err != nil {
		_ = h.repo.DeleteMember(memberID)
		utils.InternalError(c, "Failed to attach registration documents")
		return
	}
	if err := h.saveRegistrationDemographics(registration, memberID); err != nil {
		_ = h.repo.DeleteMember(memberID)
		utils.InternalError(c, "Failed to create member profile")
		return
	}
	if err := h.repo.IssueCard(&models.MemberCard{
		ID:         uuid.New(),
		MemberID:   memberID,
		CardNo:     member.MembershipCardNo,
		CardStatus: "Issued",
		IssuedAt:   &now,
	}); err != nil {
		_ = h.repo.DeleteMember(memberID)
		utils.InternalError(c, "Failed to issue member card")
		return
	}

	if err := h.repo.UpdateRegistration(registration.ID, map[string]any{
		"status":      models.RegistrationApproved,
		"member_id":   memberID,
		"approved_at": now,
		"approved_by": nullableUserID(userID),
		"updated_at":  "now()",
	}); err != nil {
		_ = h.repo.DeleteMember(memberID)
		utils.InternalError(c, "Failed to complete registration approval")
		return
	}

	_ = h.repo.CreateStatusHistory(&models.MemberStatusHistory{
		ID:        uuid.New(),
		MemberID:  memberID,
		OldStatus: "Pending",
		NewStatus: "Active",
		ChangedBy: nullableUserID(userID),
	})
	h.recordRegistrationEvent(registration.ID, "approved", registration.Status, models.RegistrationApproved, "", userID)
	updated, _ := h.repo.GetRegistrationByID(registration.ID)
	utils.JSON(c, http.StatusOK, gin.H{"registration": updated, "member": member})
}

func (h *MembershipHandler) RejectRegistration(c *gin.Context) {
	registration, ok := h.registrationFromParam(c)
	if !ok {
		return
	}
	if registration.Status != models.RegistrationPending && registration.Status != models.RegistrationVerified {
		utils.BadRequest(c, "Only submitted or verified registrations can be rejected")
		return
	}

	var req models.RegistrationDecisionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}
	if strings.TrimSpace(req.Reason) == "" {
		utils.BadRequest(c, "A rejection reason is required")
		return
	}

	userID, _ := auth.GetUserID(c)
	if err := h.repo.UpdateRegistration(registration.ID, map[string]any{
		"status":           models.RegistrationRejected,
		"rejection_reason": strings.TrimSpace(req.Reason),
		"updated_at":       "now()",
	}); err != nil {
		utils.InternalError(c, "Failed to reject registration")
		return
	}
	h.recordRegistrationEvent(registration.ID, "rejected", registration.Status, models.RegistrationRejected, strings.TrimSpace(req.Reason), userID)
	updated, _ := h.repo.GetRegistrationByID(registration.ID)
	utils.JSON(c, http.StatusOK, updated)
}

func (h *MembershipHandler) registrationFromParam(c *gin.Context) (*models.MemberRegistration, bool) {
	id, err := uuid.Parse(c.Param("registrationId"))
	if err != nil {
		utils.BadRequest(c, "Invalid registration ID")
		return nil, false
	}
	registration, err := h.repo.GetRegistrationByID(id)
	if err != nil {
		utils.InternalError(c, "Failed to fetch registration")
		return nil, false
	}
	if registration == nil {
		utils.Error(c, http.StatusNotFound, "Registration not found")
		return nil, false
	}
	return registration, true
}

func (h *MembershipHandler) registrationDetail(registration *models.MemberRegistration) models.MemberRegistrationDetail {
	documents, _ := h.repo.ListRegistrationDocuments(registration.ID)
	events, _ := h.repo.ListRegistrationEvents(registration.ID)
	return models.MemberRegistrationDetail{
		Registration: registration,
		Documents:    documents,
		Events:       events,
	}
}

func (h *MembershipHandler) validateRegistrationNationalID(registration *models.MemberRegistration) string {
	existingMember, err := h.repo.GetMemberByNationalID(registration.NationalID)
	if err != nil {
		return "Unable to validate National ID"
	}
	if existingMember != nil {
		return "A member profile with this National ID already exists"
	}
	registrations, err := h.repo.ListRegistrationsByNationalID(registration.NationalID)
	if err != nil {
		return "Unable to validate National ID"
	}
	for _, other := range registrations {
		if other.ID != registration.ID && other.Status != models.RegistrationRejected {
			return "An active registration with this National ID already exists"
		}
	}
	return ""
}

func (h *MembershipHandler) recordRegistrationEvent(registrationID uuid.UUID, action, fromStatus, toStatus, notes string, userID uuid.UUID) {
	_ = h.repo.CreateRegistrationEvent(&models.MemberRegistrationEvent{
		ID:             uuid.New(),
		RegistrationID: registrationID,
		Action:         action,
		FromStatus:     fromStatus,
		ToStatus:       toStatus,
		Notes:          notes,
		PerformedBy:    nullableUserID(userID),
	})
}

func registrationFromRequest(req models.SaveMemberRegistrationRequest) *models.MemberRegistration {
	registration := &models.MemberRegistration{}
	applyRegistrationRequest(registration, req)
	return registration
}

func registrationRequestData(req models.SaveMemberRegistrationRequest) map[string]any {
	registration := registrationFromRequest(req)
	return map[string]any{
		"registration_pathway":    registration.RegistrationPathway,
		"institutional_unit":      registration.InstitutionalUnit,
		"national_id":             registration.NationalID,
		"last_name_kh":            registration.LastNameKh,
		"first_name_kh":           registration.FirstNameKh,
		"last_name_en":            registration.LastNameEn,
		"first_name_en":           registration.FirstNameEn,
		"gender":                  registration.Gender,
		"date_of_birth":           nullableString(registration.DateOfBirth),
		"phone_number":            registration.PhoneNumber,
		"email":                   registration.Email,
		"current_address_details": registration.CurrentAddressDetails,
		"registered_village_code": nullableString(registration.RegisteredVillageCode),
		"party_role":              registration.PartyRole,
		"join_date":               nullableString(registration.JoinDate),
		"membership_type":         registration.MembershipType,
		"membership_tier":         registration.MembershipTier,
		"exempt_from_dues":        registration.ExemptFromDues,
		"marital_status":          registration.MaritalStatus,
		"occupation":              registration.Occupation,
		"education_level":         registration.EducationLevel,
		"ethnicity":               registration.Ethnicity,
		"religion":                registration.Religion,
		"blood_type":              registration.BloodType,
		"emergency_contact_name":  registration.EmergencyContactName,
		"emergency_contact_phone": registration.EmergencyContactPhone,
		"updated_at":              "now()",
	}
}

func applyRegistrationRequest(registration *models.MemberRegistration, req models.SaveMemberRegistrationRequest) {
	registration.RegistrationPathway = req.RegistrationPathway
	if registration.RegistrationPathway == "" {
		registration.RegistrationPathway = models.PathwayGeographical
	}
	registration.InstitutionalUnit = strings.TrimSpace(req.InstitutionalUnit)
	registration.NationalID = strings.TrimSpace(req.NationalID)
	registration.LastNameKh = strings.TrimSpace(req.LastNameKh)
	registration.FirstNameKh = strings.TrimSpace(req.FirstNameKh)
	registration.LastNameEn = strings.ToUpper(strings.TrimSpace(req.LastNameEn))
	registration.FirstNameEn = strings.ToUpper(strings.TrimSpace(req.FirstNameEn))
	registration.Gender = strings.TrimSpace(req.Gender)
	registration.DateOfBirth = req.DateOfBirth
	registration.PhoneNumber = strings.TrimSpace(req.PhoneNumber)
	registration.Email = strings.TrimSpace(req.Email)
	registration.CurrentAddressDetails = strings.TrimSpace(req.CurrentAddressDetails)
	registration.RegisteredVillageCode = strings.TrimSpace(req.RegisteredVillageCode)
	registration.PartyRole = strings.TrimSpace(req.PartyRole)
	if registration.PartyRole == "" {
		registration.PartyRole = "Member"
	}
	registration.JoinDate = req.JoinDate
	registration.MembershipType = strings.TrimSpace(req.MembershipType)
	if registration.MembershipType == "" {
		registration.MembershipType = "Full"
	}
	registration.MembershipTier = strings.TrimSpace(req.MembershipTier)
	if registration.MembershipTier == "" {
		registration.MembershipTier = "Basic"
	}
	registration.ExemptFromDues = req.ExemptFromDues
	registration.MaritalStatus = strings.TrimSpace(req.MaritalStatus)
	registration.Occupation = strings.TrimSpace(req.Occupation)
	registration.EducationLevel = strings.TrimSpace(req.EducationLevel)
	registration.Ethnicity = strings.TrimSpace(req.Ethnicity)
	registration.Religion = strings.TrimSpace(req.Religion)
	registration.BloodType = strings.TrimSpace(req.BloodType)
	registration.EmergencyContactName = strings.TrimSpace(req.EmergencyContactName)
	registration.EmergencyContactPhone = strings.TrimSpace(req.EmergencyContactPhone)
}

func validateRegistrationForSubmission(registration *models.MemberRegistration, documents []models.MemberRegistrationDocument) string {
	required := map[string]string{
		"national_id":             registration.NationalID,
		"last_name_kh":            registration.LastNameKh,
		"first_name_kh":           registration.FirstNameKh,
		"last_name_en":            registration.LastNameEn,
		"first_name_en":           registration.FirstNameEn,
		"gender":                  registration.Gender,
		"date_of_birth":           registration.DateOfBirth,
		"phone_number":            registration.PhoneNumber,
		"registered_village_code": registration.RegisteredVillageCode,
		"join_date":               registration.JoinDate,
	}
	for field, value := range required {
		if strings.TrimSpace(value) == "" {
			return "Missing required field: " + field
		}
	}
	if registration.RegistrationPathway != models.PathwayGeographical && registration.RegistrationPathway != models.PathwayInstitutional {
		return "Registration pathway must be Geographical or Institutional"
	}
	if registration.RegistrationPathway == models.PathwayInstitutional && registration.InstitutionalUnit == "" {
		return "Institutional unit is required for an institutional registration"
	}
	if !nationalIDPattern.MatchString(registration.NationalID) {
		return "National ID must contain 9 or 10 digits"
	}
	if !phonePattern.MatchString(registration.PhoneNumber) {
		return "Phone number must use a Cambodian 0xx or +855 format"
	}
	birthDate, err := time.Parse("2006-01-02", registration.DateOfBirth)
	if err != nil || time.Now().Before(birthDate.AddDate(18, 0, 0)) {
		return "Applicant must be at least 18 years old"
	}
	if _, err := time.Parse("2006-01-02", registration.JoinDate); err != nil {
		return "Join date is invalid"
	}
	requiredDocuments := map[string]bool{
		models.DocumentPortrait:        false,
		models.DocumentNationalIDFront: false,
		models.DocumentNationalIDBack:  false,
		models.DocumentApplicationForm: false,
	}
	for _, document := range documents {
		if _, required := requiredDocuments[document.DocumentType]; required {
			requiredDocuments[document.DocumentType] = true
		}
	}
	for documentType, present := range requiredDocuments {
		if !present {
			return "Missing required document: " + documentType
		}
	}
	return ""
}

func validateRegistrationDocument(req models.UploadRegistrationDocumentRequest) ([]byte, error) {
	allowedTypes := map[string]bool{
		models.DocumentPortrait:        true,
		models.DocumentNationalIDFront: true,
		models.DocumentNationalIDBack:  true,
		models.DocumentApplicationForm: true,
	}
	if !allowedTypes[req.DocumentType] {
		return nil, fmt.Errorf("unsupported document type")
	}
	raw, err := base64.StdEncoding.DecodeString(req.Base64Data)
	if err != nil {
		return nil, fmt.Errorf("invalid base64 document")
	}
	if len(raw) == 0 || len(raw) > 5*1024*1024 {
		return nil, fmt.Errorf("document must be no larger than 5 MB")
	}
	isImage := req.MimeType == "image/jpeg" || req.MimeType == "image/png"
	if req.DocumentType == models.DocumentPortrait && !isImage {
		return nil, fmt.Errorf("portrait must be a JPEG or PNG image")
	}
	if req.DocumentType != models.DocumentPortrait && !isImage && req.MimeType != "application/pdf" {
		return nil, fmt.Errorf("document must be a JPEG, PNG, or PDF file")
	}
	if req.DocumentType == models.DocumentPortrait {
		config, _, err := image.DecodeConfig(bytes.NewReader(raw))
		if err != nil || config.Width == 0 || config.Height == 0 {
			return nil, fmt.Errorf("portrait image could not be read")
		}
		ratio := float64(config.Width) / float64(config.Height)
		if math.Abs(ratio-(2.0/3.0)) > 0.08 {
			return nil, fmt.Errorf("portrait must use a 4x6 aspect ratio")
		}
	}
	return raw, nil
}

func memberFromRegistration(registration *models.MemberRegistration, memberID uuid.UUID) *models.Member {
	membershipCardNo := fmt.Sprintf("CPP-%d-%s", time.Now().Year(), strings.ToUpper(memberID.String()[:8]))
	return &models.Member{
		ID:                    memberID,
		MembershipCardNo:      membershipCardNo,
		NationalID:            nullableString(registration.NationalID),
		LastNameKh:            registration.LastNameKh,
		FirstNameKh:           registration.FirstNameKh,
		LastNameEn:            registration.LastNameEn,
		FirstNameEn:           registration.FirstNameEn,
		Gender:                registration.Gender,
		DateOfBirth:           registration.DateOfBirth,
		PhoneNumber:           registration.PhoneNumber,
		Email:                 nullableString(registration.Email),
		RegisteredVillageCode: registration.RegisteredVillageCode,
		CurrentAddressDetails: nullableString(registration.CurrentAddressDetails),
		PartyRole:             registration.PartyRole,
		JoinDate:              registration.JoinDate,
		Status:                "Active",
		MembershipType:        nullableString(registration.MembershipType),
		MembershipTier:        nullableString(registration.MembershipTier),
		ExemptFromDues:        registration.ExemptFromDues,
	}
}

func (h *MembershipHandler) saveRegistrationDemographics(registration *models.MemberRegistration, memberID uuid.UUID) error {
	demographics := &models.MemberDemographics{MemberID: memberID}
	if registration.MaritalStatus != "" {
		demographics.MaritalStatus = &registration.MaritalStatus
	}
	if registration.Occupation != "" {
		demographics.Occupation = &registration.Occupation
	}
	if registration.EducationLevel != "" {
		demographics.EducationLevel = &registration.EducationLevel
	}
	if registration.Ethnicity != "" {
		demographics.Ethnicity = &registration.Ethnicity
	}
	if registration.Religion != "" {
		demographics.Religion = &registration.Religion
	}
	if registration.BloodType != "" {
		demographics.BloodType = &registration.BloodType
	}
	if registration.EmergencyContactName != "" {
		demographics.EmergencyContactName = &registration.EmergencyContactName
	}
	if registration.EmergencyContactPhone != "" {
		demographics.EmergencyContactPhone = &registration.EmergencyContactPhone
	}
	return h.repo.UpsertDemographics(demographics)
}

func isRegistrationEditable(status string) bool {
	return status == models.RegistrationDraft || status == models.RegistrationRejected
}

func nullableString(value string) *string {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	return &value
}

func nullableUserID(value uuid.UUID) *uuid.UUID {
	if value == uuid.Nil {
		return nil
	}
	return &value
}

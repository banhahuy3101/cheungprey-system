package repository

import (
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/banhahuy/cheungprey-system/backend/internal/models"
)

// ListSponsorships retrieves sponsorship records with optional filters and associated material items
func (r *Repository) ListSponsorships(params models.SponsorshipFilterParams) ([]models.SponsorshipWithItems, int, error) {
	var records []models.SponsorshipRecord
	q := r.AdminClient.From("sponsorship_records").Select("*", "exact", false)

	if params.SectionGroup != "" {
		q = q.Eq("section_group", params.SectionGroup)
	}
	if params.RecordPeriod != "" {
		q = q.Eq("record_period", params.RecordPeriod)
	}
	if params.TargetLocation != "" {
		q = q.Eq("target_location", params.TargetLocation)
	}
	if params.Status != "" {
		q = q.Eq("status", params.Status)
	}

	_, err := q.ExecuteTo(&records)
	if err != nil {
		return nil, 0, fmt.Errorf("list sponsorship_records: %w", err)
	}

	// Filter by search term if provided
	if params.Search != "" {
		term := strings.ToLower(strings.TrimSpace(params.Search))
		var filtered []models.SponsorshipRecord
		for _, rec := range records {
			if strings.Contains(strings.ToLower(rec.ContributorName), term) ||
				strings.Contains(strings.ToLower(rec.SectionGroup), term) ||
				strings.Contains(strings.ToLower(rec.UsageDescription), term) ||
				strings.Contains(strings.ToLower(rec.TargetLocation), term) {
				filtered = append(filtered, rec)
			}
		}
		records = filtered
	}

	// Sort by SectionGroup asc, then EntryNo asc, then CreatedAt desc
	sort.Slice(records, func(i, j int) bool {
		if records[i].SectionGroup != records[j].SectionGroup {
			return records[i].SectionGroup < records[j].SectionGroup
		}
		if records[i].EntryNo != records[j].EntryNo {
			return records[i].EntryNo < records[j].EntryNo
		}
		return records[i].CreatedAt.After(records[j].CreatedAt)
	})

	total := len(records)
	page := params.Page
	if page < 1 {
		page = 1
	}
	limit := params.Limit
	if limit <= 0 {
		limit = 1000 // Return all by default
	}

	start := (page - 1) * limit
	if start > total {
		start = total
	}
	end := start + limit
	if end > total {
		end = total
	}

	pagedRecords := records[start:end]

	if len(pagedRecords) == 0 {
		return []models.SponsorshipWithItems{}, total, nil
	}

	// Batch load items for all paged records
	recordIDs := make([]string, len(pagedRecords))
	for i, r := range pagedRecords {
		recordIDs[i] = r.ID.String()
	}

	var allItems []models.SponsorshipItem
	_, err = r.AdminClient.From("sponsorship_items").
		Select("*", "exact", false).
		In("record_id", recordIDs).
		ExecuteTo(&allItems)
	if err != nil {
		// Non-fatal if items table is empty
		allItems = []models.SponsorshipItem{}
	}

	itemsByRecordID := make(map[uuid.UUID][]models.SponsorshipItem)
	for _, item := range allItems {
		itemsByRecordID[item.RecordID] = append(itemsByRecordID[item.RecordID], item)
	}

	results := make([]models.SponsorshipWithItems, len(pagedRecords))
	for i, rec := range pagedRecords {
		items := itemsByRecordID[rec.ID]
		if items == nil {
			items = []models.SponsorshipItem{}
		}
		results[i] = models.SponsorshipWithItems{
			SponsorshipRecord: rec,
			Items:             items,
		}
	}

	return results, total, nil
}

// GetSponsorshipByID retrieves a single sponsorship record with its items
func (r *Repository) GetSponsorshipByID(id uuid.UUID) (*models.SponsorshipWithItems, error) {
	var records []models.SponsorshipRecord
	_, err := r.AdminClient.From("sponsorship_records").
		Select("*", "exact", false).
		Eq("id", id.String()).
		ExecuteTo(&records)
	if err != nil {
		return nil, fmt.Errorf("get sponsorship_records: %w", err)
	}
	if len(records) == 0 {
		return nil, nil
	}

	rec := records[0]

	var items []models.SponsorshipItem
	_, err = r.AdminClient.From("sponsorship_items").
		Select("*", "exact", false).
		Eq("record_id", id.String()).
		ExecuteTo(&items)
	if err != nil {
		items = []models.SponsorshipItem{}
	}

	return &models.SponsorshipWithItems{
		SponsorshipRecord: rec,
		Items:             items,
	}, nil
}

// CreateSponsorship creates a new record and nested material items
func (r *Repository) CreateSponsorship(rec *models.SponsorshipRecord, items []models.SponsorshipItemInput) (*models.SponsorshipWithItems, error) {
	if rec.ID == uuid.Nil {
		rec.ID = uuid.New()
	}
	rec.CreatedAt = time.Now()
	rec.UpdatedAt = time.Now()

	// If entry_no is not provided or is 0, compute next sequential number for this section_group and period
	if rec.EntryNo <= 0 {
		var existing []models.SponsorshipRecord
		_, err := r.AdminClient.From("sponsorship_records").
			Select("entry_no", "exact", false).
			Eq("section_group", rec.SectionGroup).
			Eq("record_period", rec.RecordPeriod).
			ExecuteTo(&existing)
		maxNo := 0
		if err == nil {
			for _, e := range existing {
				if e.EntryNo > maxNo {
					maxNo = e.EntryNo
				}
			}
		}
		rec.EntryNo = maxNo + 1
	}

	_, _, err := r.AdminClient.From("sponsorship_records").
		Insert(rec, false, "", "", "").
		Execute()
	if err != nil {
		return nil, fmt.Errorf("insert sponsorship_records: %w", err)
	}

	var createdItems []models.SponsorshipItem
	if len(items) > 0 {
		toInsert := make([]models.SponsorshipItem, len(items))
		for i, item := range items {
			toInsert[i] = models.SponsorshipItem{
				ID:                uuid.New(),
				RecordID:          rec.ID,
				ItemName:          strings.TrimSpace(item.ItemName),
				ItemQty:           item.ItemQty,
				ItemUnit:          strings.TrimSpace(item.ItemUnit),
				CashAllocationUSD: item.CashAllocationUSD,
				CashAllocationKHR: item.CashAllocationKHR,
				ItemNotes:         strings.TrimSpace(item.ItemNotes),
				CreatedAt:         time.Now(),
			}
		}

		_, _, err = r.AdminClient.From("sponsorship_items").
			Insert(toInsert, false, "", "", "").
			Execute()
		if err != nil {
			return nil, fmt.Errorf("insert sponsorship_items: %w", err)
		}
		createdItems = toInsert
	} else {
		createdItems = []models.SponsorshipItem{}
	}

	return &models.SponsorshipWithItems{
		SponsorshipRecord: *rec,
		Items:             createdItems,
	}, nil
}

// UpdateSponsorship updates an existing sponsorship record and its line items
func (r *Repository) UpdateSponsorship(id uuid.UUID, rec *models.SponsorshipRecord, items []models.SponsorshipItemInput) (*models.SponsorshipWithItems, error) {
	updateData := map[string]any{
		"section_group":     rec.SectionGroup,
		"contributor_name":  rec.ContributorName,
		"record_period":     rec.RecordPeriod,
		"target_location":   rec.TargetLocation,
		"amount_usd":        rec.AmountUSD,
		"amount_khr":        rec.AmountKHR,
		"usage_description": rec.UsageDescription,
		"updated_at":        time.Now().Format(time.RFC3339),
	}
	if rec.EntryNo > 0 {
		updateData["entry_no"] = rec.EntryNo
	}

	_, _, err := r.AdminClient.From("sponsorship_records").
		Update(updateData, "", "").
		Eq("id", id.String()).
		Execute()
	if err != nil {
		return nil, fmt.Errorf("update sponsorship_records: %w", err)
	}

	// Replace items: Delete existing items and insert new ones
	_, _, err = r.AdminClient.From("sponsorship_items").
		Delete("", "").
		Eq("record_id", id.String()).
		Execute()
	if err != nil {
		return nil, fmt.Errorf("delete old sponsorship_items: %w", err)
	}

	if len(items) > 0 {
		toInsert := make([]models.SponsorshipItem, len(items))
		for i, item := range items {
			toInsert[i] = models.SponsorshipItem{
				ID:                uuid.New(),
				RecordID:          id,
				ItemName:          strings.TrimSpace(item.ItemName),
				ItemQty:           item.ItemQty,
				ItemUnit:          strings.TrimSpace(item.ItemUnit),
				CashAllocationUSD: item.CashAllocationUSD,
				CashAllocationKHR: item.CashAllocationKHR,
				ItemNotes:         strings.TrimSpace(item.ItemNotes),
				CreatedAt:         time.Now(),
			}
		}

		_, _, err = r.AdminClient.From("sponsorship_items").
			Insert(toInsert, false, "", "", "").
			Execute()
		if err != nil {
			return nil, fmt.Errorf("insert new sponsorship_items: %w", err)
		}
	}

	return r.GetSponsorshipByID(id)
}

// DeleteSponsorship deletes a record and cascades items
func (r *Repository) DeleteSponsorship(id uuid.UUID) error {
	// First delete items
	_, _, _ = r.AdminClient.From("sponsorship_items").
		Delete("", "").
		Eq("record_id", id.String()).
		Execute()

	_, _, err := r.AdminClient.From("sponsorship_records").
		Delete("", "").
		Eq("id", id.String()).
		Execute()
	return err
}

// SubmitSponsorship changes status from draft/returned to submitted
func (r *Repository) SubmitSponsorship(id uuid.UUID) error {
	now := time.Now().Format(time.RFC3339)
	updateData := map[string]any{
		"status":     "submitted",
		"updated_at": now,
	}
	_, _, err := r.AdminClient.From("sponsorship_records").
		Update(updateData, "", "").
		Eq("id", id.String()).
		Execute()
	return err
}

// ReviewSponsorship reviews and approves or returns a record
func (r *Repository) ReviewSponsorship(id uuid.UUID, reviewerID uuid.UUID, status string, notes string) error {
	now := time.Now()
	updateData := map[string]any{
		"status":         status, // reviewed or returned
		"reviewer_id":    reviewerID.String(),
		"reviewed_at":    now.Format(time.RFC3339),
		"reviewer_notes": notes,
		"updated_at":     now.Format(time.RFC3339),
	}
	_, _, err := r.AdminClient.From("sponsorship_records").
		Update(updateData, "", "").
		Eq("id", id.String()).
		Execute()
	return err
}

// ApproveSponsorship performs final chair sign-off and locks the record
func (r *Repository) ApproveSponsorship(id uuid.UUID, approverID uuid.UUID, notes string) error {
	now := time.Now()
	updateData := map[string]any{
		"status":         "approved",
		"approver_id":    approverID.String(),
		"approved_at":    now.Format(time.RFC3339),
		"approver_notes": notes,
		"updated_at":     now.Format(time.RFC3339),
	}
	_, _, err := r.AdminClient.From("sponsorship_records").
		Update(updateData, "", "").
		Eq("id", id.String()).
		Execute()
	return err
}

// GetSponsorshipSummary calculates master totals, group subtotals, and inventory roll-ups
func (r *Repository) GetSponsorshipSummary(period string, section string, location string) (*models.SponsorshipSummary, error) {
	params := models.SponsorshipFilterParams{
		RecordPeriod:   period,
		SectionGroup:   section,
		TargetLocation: location,
		Limit:          5000,
	}

	recordsWithItems, _, err := r.ListSponsorships(params)
	if err != nil {
		return nil, err
	}

	summary := &models.SponsorshipSummary{
		SectionSubtotals: []models.SectionSubtotal{},
		InventoryRollup:  []models.InventoryRollupItem{},
	}

	sectionMap := make(map[string]*models.SectionSubtotal)
	inventoryMap := make(map[string]*models.InventoryRollupItem)

	for _, rec := range recordsWithItems {
		summary.TotalRecords++
		summary.TotalUSD += rec.AmountUSD
		summary.TotalKHR += rec.AmountKHR

		switch rec.Status {
		case "draft":
			summary.DraftRecords++
		case "submitted":
			summary.PendingReview++
		case "approved":
			summary.ApprovedRecords++
		}

		// Group subtotals
		sec, exists := sectionMap[rec.SectionGroup]
		if !exists {
			sec = &models.SectionSubtotal{
				SectionGroup: rec.SectionGroup,
			}
			sectionMap[rec.SectionGroup] = sec
		}
		sec.RecordCount++
		sec.TotalUSD += rec.AmountUSD
		sec.TotalKHR += rec.AmountKHR
		if len(rec.Items) > 0 {
			sec.MaterialEntries += len(rec.Items)
		}

		// Inventory roll-up
		for _, item := range rec.Items {
			key := fmt.Sprintf("%s|%s", strings.TrimSpace(item.ItemName), strings.TrimSpace(item.ItemUnit))
			inv, invExists := inventoryMap[key]
			if !invExists {
				inv = &models.InventoryRollupItem{
					ItemName: strings.TrimSpace(item.ItemName),
					ItemUnit: strings.TrimSpace(item.ItemUnit),
				}
				inventoryMap[key] = inv
			}
			inv.TotalQty += item.ItemQty
		}
	}

	for _, sec := range sectionMap {
		summary.SectionSubtotals = append(summary.SectionSubtotals, *sec)
	}
	sort.Slice(summary.SectionSubtotals, func(i, j int) bool {
		return summary.SectionSubtotals[i].SectionGroup < summary.SectionSubtotals[j].SectionGroup
	})

	for _, inv := range inventoryMap {
		summary.InventoryRollup = append(summary.InventoryRollup, *inv)
	}
	sort.Slice(summary.InventoryRollup, func(i, j int) bool {
		return summary.InventoryRollup[i].ItemName < summary.InventoryRollup[j].ItemName
	})

	return summary, nil
}

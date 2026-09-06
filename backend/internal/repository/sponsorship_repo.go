package repository

import (
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"

	"github.com/banhahuy/cheungprey-system/backend/internal/models"
)

var (
	localSponsorshipLock    sync.RWMutex
	localSponsorshipRecords = make(map[uuid.UUID]models.SponsorshipRecord)
	localSponsorshipItems   = make(map[uuid.UUID][]models.SponsorshipItem)
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
	if params.Status != "" {
		q = q.Eq("status", params.Status)
	}

	_, err := q.ExecuteTo(&records)
	localSponsorshipLock.RLock()
	localMap := make(map[uuid.UUID]models.SponsorshipRecord)
	for id, rec := range localSponsorshipRecords {
		localMap[id] = rec
	}
	localSponsorshipLock.RUnlock()

	if err != nil {
		records = make([]models.SponsorshipRecord, 0, len(localMap))
		for _, rec := range localMap {
			if params.SectionGroup != "" && rec.SectionGroup != params.SectionGroup {
				continue
			}
			if params.RecordPeriod != "" && rec.RecordPeriod != params.RecordPeriod {
				continue
			}
			if params.Status != "" && rec.Status != params.Status {
				continue
			}
			records = append(records, rec)
		}
	} else {
		dbMap := make(map[uuid.UUID]bool)
		for _, r := range records {
			dbMap[r.ID] = true
		}
		for id, rec := range localMap {
			if !dbMap[id] {
				if params.SectionGroup != "" && rec.SectionGroup != params.SectionGroup {
					continue
				}
				if params.RecordPeriod != "" && rec.RecordPeriod != params.RecordPeriod {
					continue
				}
				if params.Status != "" && rec.Status != params.Status {
					continue
				}
				records = append(records, rec)
			}
		}
	}

	// Filter by search term if provided
	if params.Search != "" {
		term := strings.ToLower(strings.TrimSpace(params.Search))
		var filtered []models.SponsorshipRecord
		for _, rec := range records {
			if strings.Contains(strings.ToLower(rec.ContributorName), term) ||
				strings.Contains(strings.ToLower(rec.SectionGroup), term) ||
				strings.Contains(strings.ToLower(rec.UsageDescription), term) {
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
		allItems = []models.SponsorshipItem{}
	}

	itemsByRecordID := make(map[uuid.UUID][]models.SponsorshipItem)
	for _, item := range allItems {
		itemsByRecordID[item.RecordID] = append(itemsByRecordID[item.RecordID], item)
	}

	localSponsorshipLock.RLock()
	for recID, locItems := range localSponsorshipItems {
		if len(itemsByRecordID[recID]) == 0 && len(locItems) > 0 {
			itemsByRecordID[recID] = locItems
		}
	}
	localSponsorshipLock.RUnlock()

	results := make([]models.SponsorshipWithItems, len(pagedRecords))
	for i, rec := range pagedRecords {
		rec.SyncAliases()
		items := itemsByRecordID[rec.ID]
		if items == nil {
			items = []models.SponsorshipItem{}
		}
		for j := range items {
			items[j].SyncAliases()
		}
		results[i] = models.SponsorshipWithItems{
			SponsorshipRecord: rec,
			Items:             items,
			InKindItems:       items,
		}
	}

	return results, total, nil
}

// GetSponsorshipByID retrieves a single sponsorship record with its items
func (r *Repository) GetSponsorshipByID(id uuid.UUID) (*models.SponsorshipWithItems, error) {
	if id == uuid.Nil {
		return nil, fmt.Errorf("invalid record_id: cannot select sponsorship without a valid record_id")
	}

	var records []models.SponsorshipRecord
	_, err := r.AdminClient.From("sponsorship_records").
		Select("*", "exact", false).
		Eq("id", id.String()).
		ExecuteTo(&records)
	if err != nil || len(records) == 0 {
		localSponsorshipLock.RLock()
		rec, exists := localSponsorshipRecords[id]
		items := localSponsorshipItems[id]
		localSponsorshipLock.RUnlock()
		if !exists {
			return nil, nil
		}
		if items == nil {
			items = []models.SponsorshipItem{}
		}
		rec.SyncAliases()
		for i := range items {
			items[i].SyncAliases()
		}
		return &models.SponsorshipWithItems{
			SponsorshipRecord: rec,
			Items:             items,
			InKindItems:       items,
		}, nil
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

	rec.SyncAliases()
	for i := range items {
		items[i].SyncAliases()
	}

	return &models.SponsorshipWithItems{
		SponsorshipRecord: rec,
		Items:             items,
		InKindItems:       items,
	}, nil
}

// CreateSponsorship creates a new record and nested material items
func (r *Repository) CreateSponsorship(rec *models.SponsorshipRecord, items []models.SponsorshipItemInput) (*models.SponsorshipWithItems, error) {
	if rec.ID == uuid.Nil {
		rec.ID = uuid.New()
	}
	rec.CreatedAt = time.Now()
	rec.UpdatedAt = time.Now()

	// If entry_no is not provided or is 0, compute next sequential number
	if rec.EntryNo <= 0 {
		localSponsorshipLock.RLock()
		maxNo := 0
		for _, e := range localSponsorshipRecords {
			if e.SectionGroup == rec.SectionGroup && e.RecordPeriod == rec.RecordPeriod && e.EntryNo > maxNo {
				maxNo = e.EntryNo
			}
		}
		localSponsorshipLock.RUnlock()
		rec.EntryNo = maxNo + 1
	}

	var createdItems []models.SponsorshipItem
	if len(items) > 0 {
		createdItems = make([]models.SponsorshipItem, len(items))
		for i, item := range items {
			usd := item.AmountUSD
			if usd == 0 && item.ExpenseAmountUSD != 0 {
				usd = item.ExpenseAmountUSD
			} else if usd == 0 && item.CashAllocationUSD != 0 {
				usd = item.CashAllocationUSD
			}
			khr := item.AmountKHR
			if khr == 0 && item.ExpenseAmountKHR != 0 {
				khr = item.ExpenseAmountKHR
			} else if khr == 0 && item.CashAllocationKHR != 0 {
				khr = item.CashAllocationKHR
			}
			isExpenseLabel := strings.TrimSpace(item.IsExpenseLabel)

			createdItems[i] = models.SponsorshipItem{
				ID:                uuid.New(),
				RecordID:          rec.ID,
				ItemName:          strings.TrimSpace(item.ItemName),
				ItemQty:           item.ItemQty,
				ItemUnit:          strings.TrimSpace(item.ItemUnit),
				AmountUSD:         usd,
				AmountKHR:         khr,
				ExpenseAmountUSD:  usd,
				ExpenseAmountKHR:  khr,
				CashAllocationUSD: usd,
				CashAllocationKHR: khr,
				IsExpenseLabel:    isExpenseLabel,
				UsageDescription:  strings.TrimSpace(item.UsageDescription),
				Remarks:           strings.TrimSpace(item.Remarks),
				ItemNotes:         strings.TrimSpace(item.ItemNotes),
				CreatedAt:         time.Now(),
			}
		}
	} else {
		createdItems = []models.SponsorshipItem{}
	}

	// Save to in-memory store
	localSponsorshipLock.Lock()
	localSponsorshipRecords[rec.ID] = *rec
	localSponsorshipItems[rec.ID] = createdItems
	localSponsorshipLock.Unlock()

	usd := rec.ExpenseAmountUSD
	if usd == 0 && rec.AmountUSD != 0 {
		usd = rec.AmountUSD
	}
	khr := rec.ExpenseAmountKHR
	if khr == 0 && rec.AmountKHR != 0 {
		khr = rec.AmountKHR
	}
	expenseLabel := rec.ExpenseLabel
	if expenseLabel == "" {
		expenseLabel = rec.IsExpenseLabel
	}

	// Clean payload for Supabase sponsorship_records
	dbPayload := map[string]any{
		"id":                   rec.ID.String(),
		"fiscal_year":          rec.FiscalYear,
		"record_period":        rec.RecordPeriod,
		"contributor_name":     rec.ContributorName,
		"representatives":      rec.Representatives,
		"entry_classification": rec.EntryClassification,
		"category":             rec.Category,
		"section_group":        rec.SectionGroup,
		"is_expense_total":     rec.IsExpenseTotal,
		"is_expense_label":     expenseLabel,
		"expense_label":        expenseLabel,
		"expense_amount_usd":   usd,
		"expense_amount_khr":   khr,
		"amount_usd":           usd,
		"amount_khr":           khr,
		"usage_description":    rec.UsageDescription,
		"remarks":              rec.Remarks,
		"status":               rec.Status,
		"created_at":           rec.CreatedAt.Format(time.RFC3339),
		"updated_at":           rec.UpdatedAt.Format(time.RFC3339),
	}
	if rec.EntryNo > 0 {
		dbPayload["entry_no"] = rec.EntryNo
	}
	if rec.CreatedBy != nil {
		dbPayload["created_by"] = rec.CreatedBy.String()
	}

	_, _, _ = r.AdminClient.From("sponsorship_records").
		Insert(dbPayload, false, "", "", "").
		Execute()

	if len(createdItems) > 0 {
		dbItems := make([]map[string]any, len(createdItems))
		for i, item := range createdItems {
			dbItems[i] = map[string]any{
				"id":                item.ID.String(),
				"record_id":         rec.ID.String(),
				"item_name":         item.ItemName,
				"item_qty":          item.ItemQty,
				"item_unit":         item.ItemUnit,
				"amount_usd":        item.ExpenseAmountUSD,
				"amount_khr":        item.ExpenseAmountKHR,
				"is_expense_label":  item.IsExpenseLabel,
				"usage_description": item.UsageDescription,
				"remarks":           item.Remarks,
				"item_notes":        item.ItemNotes,
				"created_at":        item.CreatedAt.Format(time.RFC3339),
			}
		}
		_, _, _ = r.AdminClient.From("sponsorship_items").
			Insert(dbItems, false, "", "", "").
			Execute()
	}

	rec.SyncAliases()
	for i := range createdItems {
		createdItems[i].SyncAliases()
	}

	return &models.SponsorshipWithItems{
		SponsorshipRecord: *rec,
		Items:             createdItems,
		InKindItems:       createdItems,
	}, nil
}

// UpdateSponsorship updates an existing sponsorship record and its line items
func (r *Repository) UpdateSponsorship(id uuid.UUID, rec *models.SponsorshipRecord, items []models.SponsorshipItemInput) (*models.SponsorshipWithItems, error) {
	if id == uuid.Nil {
		return nil, fmt.Errorf("invalid record_id: cannot update sponsorship without a valid record_id")
	}
	rec.ID = id
	rec.UpdatedAt = time.Now()
	if rec.CreatedAt.IsZero() {
		rec.CreatedAt = time.Now()
	}
	if rec.Status == "" {
		rec.Status = "draft"
	}

	var newItems []models.SponsorshipItem
	if len(items) > 0 {
		newItems = make([]models.SponsorshipItem, len(items))
		for i, item := range items {
			usd := item.AmountUSD
			if usd == 0 && item.ExpenseAmountUSD != 0 {
				usd = item.ExpenseAmountUSD
			} else if usd == 0 && item.CashAllocationUSD != 0 {
				usd = item.CashAllocationUSD
			}
			khr := item.AmountKHR
			if khr == 0 && item.ExpenseAmountKHR != 0 {
				khr = item.ExpenseAmountKHR
			} else if khr == 0 && item.CashAllocationKHR != 0 {
				khr = item.CashAllocationKHR
			}
			isExpenseLabel := strings.TrimSpace(item.IsExpenseLabel)

			newItems[i] = models.SponsorshipItem{
				ID:                uuid.New(),
				RecordID:          id,
				ItemName:          strings.TrimSpace(item.ItemName),
				ItemQty:           item.ItemQty,
				ItemUnit:          strings.TrimSpace(item.ItemUnit),
				AmountUSD:         usd,
				AmountKHR:         khr,
				ExpenseAmountUSD:  usd,
				ExpenseAmountKHR:  khr,
				CashAllocationUSD: usd,
				CashAllocationKHR: khr,
				IsExpenseLabel:    isExpenseLabel,
				UsageDescription:  strings.TrimSpace(item.UsageDescription),
				Remarks:           strings.TrimSpace(item.Remarks),
				ItemNotes:         strings.TrimSpace(item.ItemNotes),
				CreatedAt:         time.Now(),
			}
		}
	} else {
		newItems = []models.SponsorshipItem{}
	}

	localSponsorshipLock.Lock()
	if existing, exists := localSponsorshipRecords[id]; exists {
		rec.CreatedAt = existing.CreatedAt
		rec.CreatedBy = existing.CreatedBy
		rec.Status = existing.Status
		rec.ReviewerID = existing.ReviewerID
		rec.ReviewedAt = existing.ReviewedAt
		rec.ReviewerNotes = existing.ReviewerNotes
		rec.ApproverID = existing.ApproverID
		rec.ApprovedAt = existing.ApprovedAt
		rec.ApproverNotes = existing.ApproverNotes
	}
	localSponsorshipRecords[id] = *rec
	localSponsorshipItems[id] = newItems
	localSponsorshipLock.Unlock()

	usd := rec.ExpenseAmountUSD
	if usd == 0 && rec.AmountUSD != 0 {
		usd = rec.AmountUSD
	}
	khr := rec.ExpenseAmountKHR
	if khr == 0 && rec.AmountKHR != 0 {
		khr = rec.AmountKHR
	}
	expenseLabel := rec.ExpenseLabel
	if expenseLabel == "" {
		expenseLabel = rec.IsExpenseLabel
	}

	updateData := map[string]any{
		"entry_classification": rec.EntryClassification,
		"category":             rec.Category,
		"section_group":        rec.SectionGroup,
		"contributor_name":     rec.ContributorName,
		"representatives":      rec.Representatives,
		"record_period":        rec.RecordPeriod,
		"is_expense_total":     rec.IsExpenseTotal,
		"is_expense_label":     expenseLabel,
		"expense_label":        expenseLabel,
		"expense_amount_usd":   usd,
		"expense_amount_khr":   khr,
		"amount_usd":           usd,
		"amount_khr":           khr,
		"usage_description":    rec.UsageDescription,
		"remarks":              rec.Remarks,
		"status":               rec.Status,
		"updated_at":           time.Now().Format(time.RFC3339),
	}
	if rec.EntryNo > 0 {
		updateData["entry_no"] = rec.EntryNo
	}
	if rec.FiscalYear > 0 {
		updateData["fiscal_year"] = rec.FiscalYear
	}

	// Check if record exists in Supabase, else insert it
	var existingRecs []models.SponsorshipRecord
	_, _ = r.AdminClient.From("sponsorship_records").
		Select("id", "exact", false).
		Eq("id", id.String()).
		ExecuteTo(&existingRecs)

	if len(existingRecs) > 0 {
		_, _, _ = r.AdminClient.From("sponsorship_records").
			Update(updateData, "", "").
			Eq("id", id.String()).
			Execute()
	} else {
		updateData["id"] = id.String()
		updateData["created_at"] = rec.CreatedAt.Format(time.RFC3339)
		_, _, _ = r.AdminClient.From("sponsorship_records").
			Insert(updateData, false, "", "", "").
			Execute()
	}

	// Update items in Supabase
	_, _, _ = r.AdminClient.From("sponsorship_items").
		Delete("", "").
		Eq("record_id", id.String()).
		Execute()

	if len(newItems) > 0 {
		dbItems := make([]map[string]any, len(newItems))
		for i, item := range newItems {
			dbItems[i] = map[string]any{
				"id":                item.ID.String(),
				"record_id":         id.String(),
				"item_name":         item.ItemName,
				"item_qty":          item.ItemQty,
				"item_unit":         item.ItemUnit,
				"amount_usd":        item.ExpenseAmountUSD,
				"amount_khr":        item.ExpenseAmountKHR,
				"is_expense_label":  item.IsExpenseLabel,
				"usage_description": item.UsageDescription,
				"remarks":           item.Remarks,
				"item_notes":        item.ItemNotes,
				"created_at":        item.CreatedAt.Format(time.RFC3339),
			}
		}
		_, _, _ = r.AdminClient.From("sponsorship_items").
			Insert(dbItems, false, "", "", "").
			Execute()
	}

	return r.GetSponsorshipByID(id)
}

// DeleteSponsorship deletes a record and cascades items
func (r *Repository) DeleteSponsorship(id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("invalid record_id: cannot delete sponsorship without a valid record_id")
	}

	localSponsorshipLock.Lock()
	delete(localSponsorshipRecords, id)
	delete(localSponsorshipItems, id)
	localSponsorshipLock.Unlock()

	_, _, _ = r.AdminClient.From("sponsorship_items").
		Delete("", "").
		Eq("record_id", id.String()).
		Execute()

	_, _, _ = r.AdminClient.From("sponsorship_records").
		Delete("", "").
		Eq("id", id.String()).
		Execute()
	return nil
}

// SubmitSponsorship changes status from draft/returned to submitted
func (r *Repository) SubmitSponsorship(id uuid.UUID) error {
	now := time.Now()
	localSponsorshipLock.Lock()
	if rec, exists := localSponsorshipRecords[id]; exists {
		rec.Status = "submitted"
		rec.UpdatedAt = now
		localSponsorshipRecords[id] = rec
	}
	localSponsorshipLock.Unlock()

	updateData := map[string]any{
		"status":     "submitted",
		"updated_at": now.Format(time.RFC3339),
	}
	_, _, _ = r.AdminClient.From("sponsorship_records").
		Update(updateData, "", "").
		Eq("id", id.String()).
		Execute()
	return nil
}

// ReviewSponsorship reviews and approves or returns a record
func (r *Repository) ReviewSponsorship(id uuid.UUID, reviewerID uuid.UUID, status string, notes string) error {
	now := time.Now()
	localSponsorshipLock.Lock()
	if rec, exists := localSponsorshipRecords[id]; exists {
		rec.Status = status
		rec.ReviewerID = &reviewerID
		rec.ReviewedAt = &now
		rec.ReviewerNotes = notes
		rec.UpdatedAt = now
		localSponsorshipRecords[id] = rec
	}
	localSponsorshipLock.Unlock()

	updateData := map[string]any{
		"status":         status,
		"reviewer_id":    reviewerID.String(),
		"reviewed_at":    now.Format(time.RFC3339),
		"reviewer_notes": notes,
		"updated_at":     now.Format(time.RFC3339),
	}
	_, _, _ = r.AdminClient.From("sponsorship_records").
		Update(updateData, "", "").
		Eq("id", id.String()).
		Execute()
	return nil
}

// ApproveSponsorship performs final chair sign-off and locks the record
func (r *Repository) ApproveSponsorship(id uuid.UUID, approverID uuid.UUID, notes string) error {
	now := time.Now()
	localSponsorshipLock.Lock()
	if rec, exists := localSponsorshipRecords[id]; exists {
		rec.Status = "approved"
		rec.ApproverID = &approverID
		rec.ApprovedAt = &now
		rec.ApproverNotes = notes
		rec.UpdatedAt = now
		localSponsorshipRecords[id] = rec
	}
	localSponsorshipLock.Unlock()

	updateData := map[string]any{
		"status":         "approved",
		"approver_id":    approverID.String(),
		"approved_at":    now.Format(time.RFC3339),
		"approver_notes": notes,
		"updated_at":     now.Format(time.RFC3339),
	}
	_, _, _ = r.AdminClient.From("sponsorship_records").
		Update(updateData, "", "").
		Eq("id", id.String()).
		Execute()
	return nil
}

// GetSponsorshipSummary calculates master totals, group subtotals, and inventory roll-ups
func (r *Repository) GetSponsorshipSummary(period string, section string) (*models.SponsorshipSummary, error) {
	params := models.SponsorshipFilterParams{
		RecordPeriod: period,
		SectionGroup: section,
		Limit:        5000,
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

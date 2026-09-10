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
	localSponsorshipPeriods = make(map[uuid.UUID]models.SponsorshipPeriod)
	localSponsorshipRecords = make(map[uuid.UUID]models.SponsorshipRecord)
	localSponsorshipItems   = make(map[uuid.UUID][]models.SponsorshipItem)
)

// -----------------------------------------------------------------------------
// LEVEL 1: SPONSORSHIP PERIODS
// -----------------------------------------------------------------------------

// ListSponsorshipPeriods retrieves all periods with aggregated summary statistics
func (r *Repository) ListSponsorshipPeriods() ([]models.SponsorshipPeriod, error) {
	var periods []models.SponsorshipPeriod
	_, err := r.AdminClient.From("sponsorship_periods").
		Select("*", "exact", false).
		ExecuteTo(&periods)

	localSponsorshipLock.RLock()
	localPMap := make(map[uuid.UUID]models.SponsorshipPeriod)
	for id, p := range localSponsorshipPeriods {
		localPMap[id] = p
	}
	localSponsorshipLock.RUnlock()

	if err != nil {
		periods = make([]models.SponsorshipPeriod, 0, len(localPMap))
		for _, p := range localPMap {
			periods = append(periods, p)
		}
	} else {
		dbPMap := make(map[uuid.UUID]bool)
		for _, p := range periods {
			dbPMap[p.ID] = true
		}
		for id, p := range localPMap {
			if !dbPMap[id] {
				periods = append(periods, p)
			}
		}
	}

	// Fetch records to calculate aggregated stats per period
	allRecords, _, _ := r.ListSponsorships(models.SponsorshipFilterParams{Limit: 10000})

	for i := range periods {
		var totalUSD float64
		var totalKHR int64
		var rCount int
		var iCount int

		for _, rec := range allRecords {
			if (rec.PeriodID != nil && *rec.PeriodID == periods[i].ID) ||
				(rec.PeriodID == nil && rec.RecordPeriod == periods[i].PeriodName) {
				totalUSD += rec.AmountUSD
				totalKHR += rec.AmountKHR
				rCount++
				iCount += len(rec.Items)
			}
		}

		periods[i].TotalUSD = totalUSD
		periods[i].TotalKHR = totalKHR
		periods[i].RecordsCount = rCount
		periods[i].ItemsCount = iCount
	}

	sort.Slice(periods, func(i, j int) bool {
		if periods[i].FiscalYear != periods[j].FiscalYear {
			return periods[i].FiscalYear > periods[j].FiscalYear
		}
		return periods[i].CreatedAt.After(periods[j].CreatedAt)
	})

	return periods, nil
}

// GetSponsorshipPeriodByID gets a single period by UUID
func (r *Repository) GetSponsorshipPeriodByID(id uuid.UUID) (*models.SponsorshipPeriod, error) {
	if id == uuid.Nil {
		return nil, fmt.Errorf("invalid period id")
	}

	var periods []models.SponsorshipPeriod
	_, err := r.AdminClient.From("sponsorship_periods").
		Select("*", "exact", false).
		Eq("id", id.String()).
		ExecuteTo(&periods)

	if err != nil || len(periods) == 0 {
		localSponsorshipLock.RLock()
		p, exists := localSponsorshipPeriods[id]
		localSponsorshipLock.RUnlock()
		if !exists {
			return nil, nil
		}
		return &p, nil
	}

	period := periods[0]

	// Compute aggregated stats
	allRecords, _, _ := r.ListSponsorships(models.SponsorshipFilterParams{PeriodID: id.String(), Limit: 10000})
	for _, rec := range allRecords {
		period.TotalUSD += rec.AmountUSD
		period.TotalKHR += rec.AmountKHR
		period.RecordsCount++
		period.ItemsCount += len(rec.Items)
	}

	return &period, nil
}

// CreateSponsorshipPeriod creates a new sponsorship period
func (r *Repository) CreateSponsorshipPeriod(req models.CreatePeriodRequest, userID *uuid.UUID) (*models.SponsorshipPeriod, error) {
	newPeriod := models.SponsorshipPeriod{
		ID:               uuid.New(),
		PeriodName:       strings.TrimSpace(req.PeriodName),
		FiscalYear:       req.FiscalYear,
		PeriodType:       req.PeriodType,
		StartDate:        req.StartDate,
		EndDate:          req.EndDate,
		Status:           req.Status,
		Remarks:          strings.TrimSpace(req.Remarks),
		MaterialsSummary: strings.TrimSpace(req.MaterialsSummary),
		CreatedBy:        userID,
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
	}
	if newPeriod.FiscalYear == 0 {
		newPeriod.FiscalYear = time.Now().Year()
	}
	if newPeriod.PeriodType == "" {
		newPeriod.PeriodType = "year"
	}
	if newPeriod.Status == "" {
		newPeriod.Status = "draft"
	}

	localSponsorshipLock.Lock()
	localSponsorshipPeriods[newPeriod.ID] = newPeriod
	localSponsorshipLock.Unlock()

	dbPayload := map[string]any{
		"id":          newPeriod.ID.String(),
		"period_name": newPeriod.PeriodName,
		"fiscal_year": newPeriod.FiscalYear,
		"period_type": newPeriod.PeriodType,
		"status":      newPeriod.Status,
		"remarks":     newPeriod.Remarks,
		"created_at":  newPeriod.CreatedAt.Format(time.RFC3339),
		"updated_at":  newPeriod.UpdatedAt.Format(time.RFC3339),
	}
	if newPeriod.MaterialsSummary != "" {
		dbPayload["materials_summary"] = newPeriod.MaterialsSummary
	}
	if newPeriod.StartDate != nil {
		dbPayload["start_date"] = *newPeriod.StartDate
	}
	if newPeriod.EndDate != nil {
		dbPayload["end_date"] = *newPeriod.EndDate
	}
	if userID != nil {
		dbPayload["created_by"] = userID.String()
	}

	_, _, _ = r.AdminClient.From("sponsorship_periods").
		Insert(dbPayload, false, "", "", "").
		Execute()

	// Check if consolidation should run (default true unless explicitly disabled)
	shouldConsolidate := true
	if req.AutoConsolidate != nil {
		shouldConsolidate = *req.AutoConsolidate
	}

	if shouldConsolidate {
		_, _ = r.ConsolidateRecordsForPeriod(newPeriod.ID, userID)
	}

	return r.GetSponsorshipPeriodByID(newPeriod.ID)
}

// ConsolidateRecordsForPeriod merges records and their items from sub-periods (months, semesters, etc.)
// of the same fiscal year into the target period (e.g. Full Year 2026).
func (r *Repository) ConsolidateRecordsForPeriod(targetPeriodID uuid.UUID, userID *uuid.UUID) (int, error) {
	targetPeriod, err := r.GetSponsorshipPeriodByID(targetPeriodID)
	if err != nil || targetPeriod == nil {
		return 0, fmt.Errorf("target period not found")
	}

	// Fetch all periods to map period_id / period_name to fiscal year
	allPeriods, _ := r.ListSponsorshipPeriods()
	periodYearMap := make(map[uuid.UUID]int)
	periodNameMap := make(map[string]int)
	for _, p := range allPeriods {
		periodYearMap[p.ID] = p.FiscalYear
		periodNameMap[strings.ToLower(strings.TrimSpace(p.PeriodName))] = p.FiscalYear
	}

	// Clean out existing auto-generated records in target period before re-consolidating
	existingInTarget, _, _ := r.ListSponsorships(models.SponsorshipFilterParams{
		PeriodID: targetPeriod.ID.String(),
		Limit:    10000,
	})
	for _, oldRec := range existingInTarget {
		_ = r.DeleteSponsorship(oldRec.ID)
	}

	// Fetch all records across the system
	allRecords, _, err := r.ListSponsorships(models.SponsorshipFilterParams{
		Limit: 10000,
	})
	if err != nil {
		return 0, err
	}

	// Filter to records from other periods matching the same fiscal year
	var sourceRecords []models.SponsorshipWithItems
	targetYearStr := fmt.Sprintf("%d", targetPeriod.FiscalYear)
	for _, rec := range allRecords {
		if rec.PeriodID != nil && *rec.PeriodID == targetPeriod.ID {
			continue // skip records already in this target period
		}

		matchedYear := false
		if rec.FiscalYear == targetPeriod.FiscalYear {
			matchedYear = true
		} else if rec.PeriodID != nil && periodYearMap[*rec.PeriodID] == targetPeriod.FiscalYear {
			matchedYear = true
		} else if y, ok := periodNameMap[strings.ToLower(strings.TrimSpace(rec.RecordPeriod))]; ok && y == targetPeriod.FiscalYear {
			matchedYear = true
		} else if strings.Contains(rec.RecordPeriod, targetYearStr) {
			matchedYear = true
		} else if rec.FiscalYear == 0 && (rec.CreatedAt.Year() == targetPeriod.FiscalYear || targetPeriod.FiscalYear == time.Now().Year()) {
			matchedYear = true
		}

		if matchedYear {
			sourceRecords = append(sourceRecords, rec)
		}
	}

	if len(sourceRecords) == 0 {
		return 0, nil
	}

	type ContributorGroup struct {
		PrimaryName         string
		DonorName           string
		Representatives     []string
		SectionGroup        string
		EntryClassification string
		Category            string
		TargetLocation      string
		UsageDescriptions   []string
		Remarks             []string
		TotalUSD            float64
		TotalKHR            int64
		ExpenseUSD          float64
		ExpenseKHR          int64
		IsExpenseTotal      bool
		ExpenseLabel        string
		ItemMap             map[string]*models.SponsorshipItemInput
		OrderedItemKeys     []string
	}

	groups := make(map[string]*ContributorGroup)
	var orderedGroupKeys []string

	for _, rec := range sourceRecords {
		name := strings.TrimSpace(rec.ContributorName)
		if name == "" {
			name = strings.TrimSpace(rec.DonorName)
		}
		if name == "" {
			name = "អនាមិក (Anonymous)"
		}
		normKey := strings.ToLower(name)

		grp, exists := groups[normKey]
		if !exists {
			grp = &ContributorGroup{
				PrimaryName:         name,
				DonorName:           rec.DonorName,
				SectionGroup:        rec.SectionGroup,
				EntryClassification: rec.EntryClassification,
				Category:            rec.Category,
				TargetLocation:      rec.TargetLocation,
				IsExpenseTotal:      rec.IsExpenseTotal,
				ExpenseLabel:        rec.ExpenseLabel,
				ItemMap:             make(map[string]*models.SponsorshipItemInput),
			}
			if grp.EntryClassification == "" {
				grp.EntryClassification = "sponsorship"
			}
			if grp.Category == "" {
				grp.Category = "sponsorship"
			}
			if grp.TargetLocation == "" {
				grp.TargetLocation = "ទូទាំងស្រុក"
			}
			groups[normKey] = grp
			orderedGroupKeys = append(orderedGroupKeys, normKey)
		}

		// Sum amounts (using non-zero fallback for aliases)
		recUSD := rec.ExpenseAmountUSD
		if recUSD == 0 {
			recUSD = rec.AmountUSD
		}
		if recUSD == 0 {
			recUSD = rec.CurrencyUSD
		}
		recKHR := rec.ExpenseAmountKHR
		if recKHR == 0 {
			recKHR = rec.AmountKHR
		}
		if recKHR == 0 {
			recKHR = rec.CurrencyKHR
		}

		grp.TotalUSD += recUSD
		grp.TotalKHR += recKHR
		grp.ExpenseUSD += recUSD
		grp.ExpenseKHR += recKHR

		// Merge representatives
		if strings.TrimSpace(rec.Representatives) != "" {
			for _, rep := range strings.Split(rec.Representatives, ",") {
				repTrim := strings.TrimSpace(rep)
				if repTrim != "" && !sliceContainsCI(grp.Representatives, repTrim) {
					grp.Representatives = append(grp.Representatives, repTrim)
				}
			}
		}

		// Merge descriptions & remarks
		if strings.TrimSpace(rec.UsageDescription) != "" && !sliceContainsCI(grp.UsageDescriptions, strings.TrimSpace(rec.UsageDescription)) {
			grp.UsageDescriptions = append(grp.UsageDescriptions, strings.TrimSpace(rec.UsageDescription))
		}
		if strings.TrimSpace(rec.Remarks) != "" && !sliceContainsCI(grp.Remarks, strings.TrimSpace(rec.Remarks)) {
			grp.Remarks = append(grp.Remarks, strings.TrimSpace(rec.Remarks))
		}

		// Merge line items
		for _, item := range rec.Items {
			itemName := strings.TrimSpace(item.ItemName)
			itemUnit := strings.TrimSpace(item.ItemUnit)
			if itemName == "" {
				continue
			}
			if itemUnit == "" {
				itemUnit = "គ.ក"
			}
			itemKey := strings.ToLower(itemName) + "|||" + strings.ToLower(itemUnit)

			itemUSD := item.ExpenseAmountUSD
			if itemUSD == 0 {
				itemUSD = item.AmountUSD
			}
			if itemUSD == 0 {
				itemUSD = item.CashAllocationUSD
			}
			itemKHR := item.ExpenseAmountKHR
			if itemKHR == 0 {
				itemKHR = item.AmountKHR
			}
			if itemKHR == 0 {
				itemKHR = item.CashAllocationKHR
			}

			existingItem, itemExists := grp.ItemMap[itemKey]
			if !itemExists {
				newItem := models.SponsorshipItemInput{
					ItemName:          itemName,
					ItemQty:           item.ItemQty,
					ItemUnit:          itemUnit,
					AmountUSD:         itemUSD,
					AmountKHR:         itemKHR,
					ExpenseAmountUSD:  itemUSD,
					ExpenseAmountKHR:  itemKHR,
					CashAllocationUSD: itemUSD,
					CashAllocationKHR: itemKHR,
					UsageDescription:  strings.TrimSpace(item.UsageDescription),
					Remarks:           strings.TrimSpace(item.Remarks),
					ItemNotes:         strings.TrimSpace(item.ItemNotes),
				}
				grp.ItemMap[itemKey] = &newItem
				grp.OrderedItemKeys = append(grp.OrderedItemKeys, itemKey)
			} else {
				existingItem.ItemQty += item.ItemQty
				existingItem.AmountUSD += itemUSD
				existingItem.AmountKHR += itemKHR
				existingItem.ExpenseAmountUSD += itemUSD
				existingItem.ExpenseAmountKHR += itemKHR
				existingItem.CashAllocationUSD += itemUSD
				existingItem.CashAllocationKHR += itemKHR

				if strings.TrimSpace(item.UsageDescription) != "" && !strings.Contains(existingItem.UsageDescription, strings.TrimSpace(item.UsageDescription)) {
					if existingItem.UsageDescription != "" {
						existingItem.UsageDescription += "; " + strings.TrimSpace(item.UsageDescription)
					} else {
						existingItem.UsageDescription = strings.TrimSpace(item.UsageDescription)
					}
				}
				if strings.TrimSpace(item.Remarks) != "" && !strings.Contains(existingItem.Remarks, strings.TrimSpace(item.Remarks)) {
					if existingItem.Remarks != "" {
						existingItem.Remarks += "; " + strings.TrimSpace(item.Remarks)
					} else {
						existingItem.Remarks = strings.TrimSpace(item.Remarks)
					}
				}
				if strings.TrimSpace(item.ItemNotes) != "" && !strings.Contains(existingItem.ItemNotes, strings.TrimSpace(item.ItemNotes)) {
					if existingItem.ItemNotes != "" {
						existingItem.ItemNotes += "; " + strings.TrimSpace(item.ItemNotes)
					} else {
						existingItem.ItemNotes = strings.TrimSpace(item.ItemNotes)
					}
				}
			}
		}
	}

	// Create merged SponsorshipRecords and nested SponsorshipItems in TargetPeriod
	mergedCount := 0
	for entryIdx, key := range orderedGroupKeys {
		grp := groups[key]

		var itemsInput []models.SponsorshipItemInput
		for _, ik := range grp.OrderedItemKeys {
			if itm, ok := grp.ItemMap[ik]; ok && itm != nil {
				itemsInput = append(itemsInput, *itm)
			}
		}

		rec := &models.SponsorshipRecord{
			ID:                  uuid.New(),
			PeriodID:            &targetPeriod.ID,
			EntryNo:             entryIdx + 1,
			FiscalYear:          targetPeriod.FiscalYear,
			RecordPeriod:        targetPeriod.PeriodName,
			ContributorName:     grp.PrimaryName,
			DonorName:           grp.PrimaryName,
			Representatives:     strings.Join(grp.Representatives, ", "),
			EntryClassification: grp.EntryClassification,
			Category:            grp.Category,
			SectionGroup:        grp.SectionGroup,
			AmountUSD:           grp.TotalUSD,
			CurrencyUSD:         grp.TotalUSD,
			AmountKHR:           grp.TotalKHR,
			CurrencyKHR:         grp.TotalKHR,
			ExpenseAmountUSD:    grp.ExpenseUSD,
			ExpenseAmountKHR:    grp.ExpenseKHR,
			IsExpenseTotal:      grp.IsExpenseTotal,
			ExpenseLabel:        grp.ExpenseLabel,
			IsExpenseLabel:      grp.ExpenseLabel,
			UsageDescription:    strings.Join(grp.UsageDescriptions, "; "),
			AllocationPurpose:   strings.Join(grp.UsageDescriptions, "; "),
			Remarks:             strings.Join(grp.Remarks, "; "),
			Status:              "draft",
			CreatedBy:           userID,
		}

		_, err := r.CreateSponsorship(rec, itemsInput)
		if err == nil {
			mergedCount++
		}
	}

	return mergedCount, nil
}

func sliceContainsCI(slice []string, val string) bool {
	for _, item := range slice {
		if strings.EqualFold(strings.TrimSpace(item), strings.TrimSpace(val)) {
			return true
		}
	}
	return false
}

// UpdateSponsorshipPeriod updates a sponsorship period
func (r *Repository) UpdateSponsorshipPeriod(id uuid.UUID, req models.UpdatePeriodRequest) (*models.SponsorshipPeriod, error) {
	if id == uuid.Nil {
		return nil, fmt.Errorf("invalid period id")
	}

	now := time.Now()
	updateData := map[string]any{
		"updated_at": now.Format(time.RFC3339),
	}

	localSponsorshipLock.Lock()
	if existing, exists := localSponsorshipPeriods[id]; exists {
		if req.PeriodName != nil {
			existing.PeriodName = strings.TrimSpace(*req.PeriodName)
			updateData["period_name"] = existing.PeriodName
		}
		if req.FiscalYear != nil {
			existing.FiscalYear = *req.FiscalYear
			updateData["fiscal_year"] = existing.FiscalYear
		}
		if req.PeriodType != nil {
			existing.PeriodType = *req.PeriodType
			updateData["period_type"] = existing.PeriodType
		}
		if req.StartDate != nil {
			existing.StartDate = req.StartDate
			updateData["start_date"] = *req.StartDate
		}
		if req.EndDate != nil {
			existing.EndDate = req.EndDate
			updateData["end_date"] = *req.EndDate
		}
		if req.Status != nil {
			existing.Status = *req.Status
			updateData["status"] = existing.Status
		}
		if req.Remarks != nil {
			existing.Remarks = strings.TrimSpace(*req.Remarks)
			updateData["remarks"] = existing.Remarks
		}
		if req.MaterialsSummary != nil {
			existing.MaterialsSummary = strings.TrimSpace(*req.MaterialsSummary)
			updateData["materials_summary"] = existing.MaterialsSummary
		}
		existing.UpdatedAt = now
		localSponsorshipPeriods[id] = existing
	}
	localSponsorshipLock.Unlock()

	_, _, _ = r.AdminClient.From("sponsorship_periods").
		Update(updateData, "", "").
		Eq("id", id.String()).
		Execute()

	return r.GetSponsorshipPeriodByID(id)
}

// DeleteSponsorshipPeriod deletes a period and cascades records/items
func (r *Repository) DeleteSponsorshipPeriod(id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("invalid period id")
	}

	localSponsorshipLock.Lock()
	delete(localSponsorshipPeriods, id)
	for recID, rec := range localSponsorshipRecords {
		if rec.PeriodID != nil && *rec.PeriodID == id {
			delete(localSponsorshipRecords, recID)
			delete(localSponsorshipItems, recID)
		}
	}
	localSponsorshipLock.Unlock()

	_, _, _ = r.AdminClient.From("sponsorship_periods").
		Delete("", "").
		Eq("id", id.String()).
		Execute()

	return nil
}

// -----------------------------------------------------------------------------
// LEVEL 2: SPONSORSHIP RECORDS
// -----------------------------------------------------------------------------

// ListSponsorships retrieves sponsorship records with optional filters and associated material items
func (r *Repository) ListSponsorships(params models.SponsorshipFilterParams) ([]models.SponsorshipWithItems, int, error) {
	var records []models.SponsorshipRecord
	q := r.AdminClient.From("sponsorship_records").Select("*", "exact", false)

	var filterPeriodID *uuid.UUID
	if strings.TrimSpace(params.PeriodID) != "" {
		if pid, err := uuid.Parse(strings.TrimSpace(params.PeriodID)); err == nil && pid != uuid.Nil {
			filterPeriodID = &pid
			q = q.Eq("period_id", pid.String())
		}
	}
	if params.FiscalYear > 0 {
		q = q.Eq("fiscal_year", fmt.Sprintf("%d", params.FiscalYear))
	}
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
			if filterPeriodID != nil && (rec.PeriodID == nil || *rec.PeriodID != *filterPeriodID) {
				continue
			}
			if params.FiscalYear > 0 && rec.FiscalYear != 0 && rec.FiscalYear != params.FiscalYear {
				continue
			}
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
		for _, rec := range records {
			dbMap[rec.ID] = true
		}
		for id, rec := range localMap {
			if !dbMap[id] {
				if filterPeriodID != nil && (rec.PeriodID == nil || *rec.PeriodID != *filterPeriodID) {
					continue
				}
				if params.FiscalYear > 0 && rec.FiscalYear != 0 && rec.FiscalYear != params.FiscalYear {
					continue
				}
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

	// Sort by EntryNo asc (#), then SectionGroup asc, then CreatedAt asc
	sort.Slice(records, func(i, j int) bool {
		if records[i].EntryNo != records[j].EntryNo {
			if records[i].EntryNo == 0 {
				return false
			}
			if records[j].EntryNo == 0 {
				return true
			}
			return records[i].EntryNo < records[j].EntryNo
		}
		if records[i].SectionGroup != records[j].SectionGroup {
			return records[i].SectionGroup < records[j].SectionGroup
		}
		return records[i].CreatedAt.Before(records[j].CreatedAt)
	})

	total := len(records)
	if params.Limit > 0 {
		start := params.Page * params.Limit
		if start < len(records) {
			end := start + params.Limit
			if end > len(records) {
				end = len(records)
			}
			records = records[start:end]
		} else {
			records = []models.SponsorshipRecord{}
		}
	}

	// Batch load items for the selected records
	recordIDs := make([]string, len(records))
	for i, r := range records {
		recordIDs[i] = r.ID.String()
	}

	recordHadAnyItems := make(map[uuid.UUID]bool)
	itemsByRecord := make(map[uuid.UUID][]models.SponsorshipItem)
	if len(recordIDs) > 0 {
		var allItems []models.SponsorshipItem
		_, _ = r.AdminClient.From("sponsorship_items").
			Select("*", "exact", false).
			ExecuteTo(&allItems)

		for _, item := range allItems {
			recordHadAnyItems[item.RecordID] = true
			if params.ZoneCode != "" && !strings.HasPrefix(item.ZoneCode, params.ZoneCode) {
				continue
			}
			itemsByRecord[item.RecordID] = append(itemsByRecord[item.RecordID], item)
		}
	}

	// Merge local in-memory items
	localSponsorshipLock.RLock()
	for id, items := range localSponsorshipItems {
		if len(items) > 0 {
			recordHadAnyItems[id] = true
		}
		if len(itemsByRecord[id]) == 0 && len(items) > 0 {
			var matching []models.SponsorshipItem
			for _, item := range items {
				if params.ZoneCode == "" || strings.HasPrefix(item.ZoneCode, params.ZoneCode) {
					matching = append(matching, item)
				}
			}
			itemsByRecord[id] = matching
		}
	}
	localSponsorshipLock.RUnlock()

	results := make([]models.SponsorshipWithItems, len(records))
	for i, rec := range records {
		rec.SyncAliases()
		items := itemsByRecord[rec.ID]
		if items == nil {
			items = []models.SponsorshipItem{}
		}
		for j := range items {
			items[j].SyncAliases()
		}

		if params.ZoneCode != "" {
			var sumUSD float64
			var sumKHR int64
			for _, it := range items {
				sumUSD += it.ExpenseAmountUSD
				sumKHR += it.ExpenseAmountKHR
			}
			if len(items) > 0 {
				rec.AmountUSD = sumUSD
				rec.ExpenseAmountUSD = sumUSD
				rec.CurrencyUSD = sumUSD
				rec.AmountKHR = sumKHR
				rec.ExpenseAmountKHR = sumKHR
				rec.CurrencyKHR = sumKHR
				rec.SyncAliases()
			} else if recordHadAnyItems[rec.ID] {
				rec.AmountUSD = 0
				rec.ExpenseAmountUSD = 0
				rec.CurrencyUSD = 0
				rec.AmountKHR = 0
				rec.ExpenseAmountKHR = 0
				rec.CurrencyKHR = 0
				rec.SyncAliases()
			}
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
func (r *Repository) GetSponsorshipByID(id uuid.UUID, zoneCode ...string) (*models.SponsorshipWithItems, error) {
	if id == uuid.Nil {
		return nil, fmt.Errorf("invalid record_id: cannot select sponsorship without a valid record_id")
	}

	targetZone := ""
	if len(zoneCode) > 0 {
		targetZone = strings.TrimSpace(zoneCode[0])
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

		if targetZone != "" {
			hadItems := len(items) > 0
			var scoped []models.SponsorshipItem
			var sumUSD float64
			var sumKHR int64
			for _, it := range items {
				if strings.HasPrefix(it.ZoneCode, targetZone) {
					scoped = append(scoped, it)
					sumUSD += it.ExpenseAmountUSD
					sumKHR += it.ExpenseAmountKHR
				}
			}
			items = scoped
			if hadItems {
				rec.AmountUSD = sumUSD
				rec.ExpenseAmountUSD = sumUSD
				rec.CurrencyUSD = sumUSD
				rec.AmountKHR = sumKHR
				rec.ExpenseAmountKHR = sumKHR
				rec.CurrencyKHR = sumKHR
			}
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
	if err != nil || len(items) == 0 {
		localSponsorshipLock.RLock()
		localItems := localSponsorshipItems[id]
		localSponsorshipLock.RUnlock()
		if len(localItems) > 0 {
			items = localItems
		}
	}

	if targetZone != "" {
		hadItems := len(items) > 0
		var scoped []models.SponsorshipItem
		var sumUSD float64
		var sumKHR int64
		for _, it := range items {
			if strings.HasPrefix(it.ZoneCode, targetZone) {
				scoped = append(scoped, it)
				sumUSD += it.ExpenseAmountUSD
				sumKHR += it.ExpenseAmountKHR
			}
		}
		items = scoped
		if hadItems {
			rec.AmountUSD = sumUSD
			rec.ExpenseAmountUSD = sumUSD
			rec.CurrencyUSD = sumUSD
			rec.AmountKHR = sumKHR
			rec.ExpenseAmountKHR = sumKHR
			rec.CurrencyKHR = sumKHR
		}
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

			createdItems[i] = models.SponsorshipItem{
				ID:                uuid.New(),
				RecordID:          rec.ID,
				ZoneCode:          strings.TrimSpace(item.ZoneCode),
				CreatedBy:         item.CreatedBy,
				ItemName:          strings.TrimSpace(item.ItemName),
				ItemQty:           item.ItemQty,
				ItemUnit:          strings.TrimSpace(item.ItemUnit),
				AmountUSD:         usd,
				AmountKHR:         khr,
				ExpenseAmountUSD:  usd,
				ExpenseAmountKHR:  khr,
				CashAllocationUSD: usd,
				CashAllocationKHR: khr,
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
	if rec.PeriodID != nil && *rec.PeriodID != uuid.Nil {
		dbPayload["period_id"] = rec.PeriodID.String()
	}
	if rec.EntryNo > 0 {
		dbPayload["entry_no"] = rec.EntryNo
	}
	if rec.CreatedBy != nil {
		dbPayload["created_by"] = rec.CreatedBy.String()
	}

	if _, _, err := r.AdminClient.From("sponsorship_records").
		Insert(dbPayload, false, "", "", "").
		Execute(); err != nil {
		fmt.Printf("[DB Error inserting sponsorship_records]: %v\n", err)
	}

	if len(createdItems) > 0 {
		dbItems := make([]map[string]any, len(createdItems))
		for i, item := range createdItems {
			dbItem := map[string]any{
				"id":                item.ID.String(),
				"record_id":         rec.ID.String(),
				"item_name":         item.ItemName,
				"item_qty":          item.ItemQty,
				"item_unit":         item.ItemUnit,
				"amount_usd":        item.ExpenseAmountUSD,
				"amount_khr":        item.ExpenseAmountKHR,
				"usage_description": item.UsageDescription,
				"remarks":           item.Remarks,
				"item_notes":        item.ItemNotes,
				"created_at":        item.CreatedAt.Format(time.RFC3339),
			}
			if item.ZoneCode != "" {
				dbItem["zone_code"] = item.ZoneCode
			}
			if item.CreatedBy != nil && *item.CreatedBy != uuid.Nil {
				dbItem["created_by"] = item.CreatedBy.String()
			}
			dbItems[i] = dbItem
		}
		if _, _, err := r.AdminClient.From("sponsorship_items").
			Insert(dbItems, false, "", "", "").
			Execute(); err != nil {
			fmt.Printf("[DB Error inserting sponsorship_items]: %v\n", err)
		}
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
func (r *Repository) UpdateSponsorship(id uuid.UUID, rec *models.SponsorshipRecord, items []models.SponsorshipItemInput, userZone ...string) (*models.SponsorshipWithItems, error) {
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

	targetZone := ""
	if len(userZone) > 0 {
		targetZone = strings.TrimSpace(userZone[0])
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

			itemZone := strings.TrimSpace(item.ZoneCode)
			if itemZone == "" && targetZone != "" {
				itemZone = targetZone
			}

			newItems[i] = models.SponsorshipItem{
				ID:                uuid.New(),
				RecordID:          id,
				ZoneCode:          itemZone,
				CreatedBy:         item.CreatedBy,
				ItemName:          strings.TrimSpace(item.ItemName),
				ItemQty:           item.ItemQty,
				ItemUnit:          strings.TrimSpace(item.ItemUnit),
				AmountUSD:         usd,
				AmountKHR:         khr,
				ExpenseAmountUSD:  usd,
				ExpenseAmountKHR:  khr,
				CashAllocationUSD: usd,
				CashAllocationKHR: khr,
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
		if rec.PeriodID == nil {
			rec.PeriodID = existing.PeriodID
		}
	}
	localSponsorshipRecords[id] = *rec

	if targetZone != "" {
		var preservedItems []models.SponsorshipItem
		for _, existingItem := range localSponsorshipItems[id] {
			if !strings.HasPrefix(existingItem.ZoneCode, targetZone) {
				preservedItems = append(preservedItems, existingItem)
			}
		}
		localSponsorshipItems[id] = append(preservedItems, newItems...)
	} else {
		localSponsorshipItems[id] = newItems
	}
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
	if rec.PeriodID != nil && *rec.PeriodID != uuid.Nil {
		updateData["period_id"] = rec.PeriodID.String()
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
	if targetZone != "" {
		_, _, _ = r.AdminClient.From("sponsorship_items").
			Delete("", "").
			Eq("record_id", id.String()).
			Like("zone_code", targetZone+"%").
			Execute()
	} else {
		_, _, _ = r.AdminClient.From("sponsorship_items").
			Delete("", "").
			Eq("record_id", id.String()).
			Execute()
	}

	if len(newItems) > 0 {
		dbItems := make([]map[string]any, len(newItems))
		for i, item := range newItems {
			dbItem := map[string]any{
				"id":                item.ID.String(),
				"record_id":         id.String(),
				"item_name":         item.ItemName,
				"item_qty":          item.ItemQty,
				"item_unit":         item.ItemUnit,
				"amount_usd":        item.ExpenseAmountUSD,
				"amount_khr":        item.ExpenseAmountKHR,
				"usage_description": item.UsageDescription,
				"remarks":           item.Remarks,
				"item_notes":        item.ItemNotes,
				"created_at":        item.CreatedAt.Format(time.RFC3339),
			}
			if item.ZoneCode != "" {
				dbItem["zone_code"] = item.ZoneCode
			}
			if item.CreatedBy != nil && *item.CreatedBy != uuid.Nil {
				dbItem["created_by"] = item.CreatedBy.String()
			}
			dbItems[i] = dbItem
		}
		_, _, _ = r.AdminClient.From("sponsorship_items").
			Insert(dbItems, false, "", "", "").
			Execute()
	}

	return r.GetSponsorshipByID(id, targetZone)
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
func (r *Repository) GetSponsorshipSummary(period string, section string, zoneCode ...string) (*models.SponsorshipSummary, error) {
	targetZone := ""
	if len(zoneCode) > 0 {
		targetZone = strings.TrimSpace(zoneCode[0])
	}
	params := models.SponsorshipFilterParams{
		RecordPeriod: period,
		SectionGroup: section,
		ZoneCode:     targetZone,
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

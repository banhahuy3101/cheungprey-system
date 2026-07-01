package repository

import (
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/supabase-community/postgrest-go"

	"github.com/banhahuy/cheungprey-system/backend/internal/models"
)

func (r *Repository) ListDomains() ([]models.PerformanceDomain, error) {
	var domains []models.PerformanceDomain
	_, err := r.AdminClient.From("performance_domains").
		Select("*", "exact", false).
		Order("sort_order", &postgrest.OrderOpts{Ascending: true}).
		ExecuteTo(&domains)
	if err != nil {
		return nil, fmt.Errorf("list domains: %w", err)
	}
	return domains, nil
}

func (r *Repository) ListSubDomains(domainID uuid.UUID) ([]models.PerformanceSubDomain, error) {
	var subDomains []models.PerformanceSubDomain
	_, err := r.AdminClient.From("performance_sub_domains").
		Select("*", "exact", false).
		Eq("domain_id", domainID.String()).
		Order("sort_order", &postgrest.OrderOpts{Ascending: true}).
		ExecuteTo(&subDomains)
	if err != nil {
		return nil, fmt.Errorf("list sub-domains: %w", err)
	}
	return subDomains, nil
}

func (r *Repository) ListIndicators(subDomainID uuid.UUID) ([]models.PerformanceIndicator, error) {
	var indicators []models.PerformanceIndicator
	_, err := r.AdminClient.From("performance_indicators").
		Select("*", "exact", false).
		Eq("sub_domain_id", subDomainID.String()).
		Order("sort_order", &postgrest.OrderOpts{Ascending: true}).
		ExecuteTo(&indicators)
	if err != nil {
		return nil, fmt.Errorf("list indicators: %w", err)
	}
	return indicators, nil
}

func (r *Repository) ListAllIndicators() ([]models.PerformanceIndicator, error) {
	var indicators []models.PerformanceIndicator
	_, err := r.AdminClient.From("performance_indicators").
		Select("*", "exact", false).
		Order("sort_order", &postgrest.OrderOpts{Ascending: true}).
		ExecuteTo(&indicators)
	if err != nil {
		return nil, fmt.Errorf("list all indicators: %w", err)
	}
	return indicators, nil
}

func (r *Repository) ListPeriods() ([]models.PerformancePeriod, error) {
	var periods []models.PerformancePeriod
	_, err := r.AdminClient.From("performance_periods").
		Select("*", "exact", false).
		Order("sort_order", &postgrest.OrderOpts{Ascending: true}).
		ExecuteTo(&periods)
	if err != nil {
		return nil, fmt.Errorf("list periods: %w", err)
	}
	return periods, nil
}

func (r *Repository) CreatePerformanceData(d *models.PerformanceData) error {
	if d.ID == uuid.Nil {
		d.ID = uuid.New()
	}
	if d.UpdatedAt.IsZero() {
		d.UpdatedAt = time.Now()
	}
	_, _, err := r.AdminClient.From("performance_data").
		Insert(d, false, "", "", "").
		Execute()
	return err
}

func (r *Repository) UpsertPerformanceData(d *models.PerformanceData) error {
	if d.ID == uuid.Nil {
		d.ID = uuid.New()
	}
	d.UpdatedAt = time.Now()

	_, _, err := r.AdminClient.From("performance_data").
		Upsert(d, "zone_id,indicator_id,period_id", "", "").
		Execute()
	return err
}

func (r *Repository) BulkUpsertPerformanceData(rows []map[string]any) error {
	_, _, err := r.AdminClient.From("performance_data").
		Upsert(rows, "zone_id,indicator_id,period_id", "", "").
		Execute()
	return err
}

func (r *Repository) GetPerformanceData(zoneID string, periodID uuid.UUID) ([]models.PerformanceData, error) {
	var results []models.PerformanceData
	_, err := r.AdminClient.From("performance_data").
		Select("*", "exact", false).
		Eq("zone_id", zoneID).
		Eq("period_id", periodID.String()).
		ExecuteTo(&results)
	if err != nil {
		return nil, fmt.Errorf("get performance data: %w", err)
	}
	return results, nil
}

func (r *Repository) GetPerformanceDataWithIndicators(zoneID string, periodID uuid.UUID) ([]models.PerformanceDataWithIndicator, error) {
	rows, err := r.GetPerformanceData(zoneID, periodID)
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return []models.PerformanceDataWithIndicator{}, nil
	}

	type indicatorMeta struct {
		fullCode      string
		nameKh        string
		subDomainCode string
		domainCode    string
		dataType      string
		unitKh        *string
	}

	cache := make(map[string]indicatorMeta)
	var enriched []models.PerformanceDataWithIndicator

	for _, row := range rows {
		key := row.IndicatorID.String()
		meta, ok := cache[key]
		if !ok {
			ind, err := r.GetIndicatorByID(row.IndicatorID)
			if err != nil {
				return nil, fmt.Errorf("get indicator %s: %w", key, err)
			}
			if ind == nil {
				return nil, fmt.Errorf("indicator not found: %s", key)
			}
			sub, err := r.GetSubDomainByID(ind.SubDomainID)
			if err != nil {
				return nil, fmt.Errorf("get sub-domain for indicator %s: %w", key, err)
			}
			if sub == nil {
				return nil, fmt.Errorf("sub-domain not found for indicator %s", key)
			}
			dom, err := r.GetDomainByID(sub.DomainID)
			if err != nil {
				return nil, fmt.Errorf("get domain for indicator %s: %w", key, err)
			}
			if dom == nil {
				return nil, fmt.Errorf("domain not found for indicator %s", key)
			}
			meta = indicatorMeta{
				fullCode:      fmt.Sprintf("%s.%s.%s", dom.Code, sub.Code, ind.Code),
				nameKh:        ind.NameKh,
				subDomainCode: sub.Code,
				domainCode:    dom.Code,
				dataType:      ind.DataType,
				unitKh:        ind.UnitKh,
			}
			cache[key] = meta
		}

		enriched = append(enriched, models.PerformanceDataWithIndicator{
			ID:              row.ID,
			ZoneID:          row.ZoneID,
			IndicatorID:     row.IndicatorID,
			PeriodID:        row.PeriodID,
			ValueNumber:     row.ValueNumber,
			ValuePercentage: row.ValuePercentage,
			ValueBinary:     row.ValueBinary,
			CreatedBy:       row.CreatedBy,
			UpdatedAt:       row.UpdatedAt,
			IndicatorNameKh: meta.nameKh,
			IndicatorCode:   meta.fullCode,
			SubDomainCode:   meta.subDomainCode,
			DomainCode:      meta.domainCode,
			DataType:        meta.dataType,
			UnitKh:          meta.unitKh,
		})
	}

	return enriched, nil
}

func (r *Repository) GetDomainByID(id uuid.UUID) (*models.PerformanceDomain, error) {
	var domains []models.PerformanceDomain
	_, err := r.AdminClient.From("performance_domains").
		Select("*", "exact", false).
		Eq("id", id.String()).
		ExecuteTo(&domains)
	if err != nil {
		return nil, fmt.Errorf("get domain: %w", err)
	}
	if len(domains) == 0 {
		return nil, nil
	}
	return &domains[0], nil
}

func (r *Repository) GetSubDomainByID(id uuid.UUID) (*models.PerformanceSubDomain, error) {
	var subs []models.PerformanceSubDomain
	_, err := r.AdminClient.From("performance_sub_domains").
		Select("*", "exact", false).
		Eq("id", id.String()).
		ExecuteTo(&subs)
	if err != nil {
		return nil, fmt.Errorf("get sub-domain: %w", err)
	}
	if len(subs) == 0 {
		return nil, nil
	}
	return &subs[0], nil
}

func (r *Repository) GetIndicatorByID(id uuid.UUID) (*models.PerformanceIndicator, error) {
	var indicators []models.PerformanceIndicator
	_, err := r.AdminClient.From("performance_indicators").
		Select("*", "exact", false).
		Eq("id", id.String()).
		ExecuteTo(&indicators)
	if err != nil {
		return nil, fmt.Errorf("get indicator: %w", err)
	}
	if len(indicators) == 0 {
		return nil, nil
	}
	return &indicators[0], nil
}

func parseFullIndicatorCode(fullCode string, domains []models.PerformanceDomain, subs []models.PerformanceSubDomain) (domainCode, subDomainCode, indicatorCode string, err error) {
	fullCode = strings.TrimSpace(fullCode)
	if fullCode == "" {
		return "", "", "", fmt.Errorf("invalid indicator code format: %s", fullCode)
	}

	sortedDomains := append([]models.PerformanceDomain(nil), domains...)
	sort.Slice(sortedDomains, func(i, j int) bool {
		return len(sortedDomains[i].Code) > len(sortedDomains[j].Code)
	})

	var matchedDomain *models.PerformanceDomain
	var rest string
	for i := range sortedDomains {
		d := sortedDomains[i]
		prefix := d.Code + "."
		if strings.HasPrefix(fullCode, prefix) {
			matchedDomain = &d
			rest = strings.TrimPrefix(fullCode, prefix)
			break
		}
	}
	if matchedDomain == nil {
		return "", "", "", fmt.Errorf("domain not found for code: %s", fullCode)
	}

	if len(subs) == 0 {
		return matchedDomain.Code, "", "", nil
	}

	sortedSubs := append([]models.PerformanceSubDomain(nil), subs...)
	sort.Slice(sortedSubs, func(i, j int) bool {
		return len(sortedSubs[i].Code) > len(sortedSubs[j].Code)
	})

	for i := range sortedSubs {
		sd := sortedSubs[i]
		prefix := sd.Code + "."
		if strings.HasPrefix(rest, prefix) {
			indicator := strings.TrimPrefix(rest, prefix)
			if indicator == "" {
				return "", "", "", fmt.Errorf("indicator not found for code: %s", fullCode)
			}
			return matchedDomain.Code, sd.Code, indicator, nil
		}
	}

	return "", "", "", fmt.Errorf("sub-domain not found for code: %s", fullCode)
}

func (r *Repository) GetIndicatorIDByFullCode(fullCode string) (*uuid.UUID, error) {
	domains, err := r.ListDomains()
	if err != nil {
		return nil, fmt.Errorf("list domains: %w", err)
	}

	domainCode, _, _, err := parseFullIndicatorCode(fullCode, domains, nil)
	if err != nil {
		return nil, err
	}

	var matchedDomain *models.PerformanceDomain
	for i := range domains {
		if domains[i].Code == domainCode {
			matchedDomain = &domains[i]
			break
		}
	}
	if matchedDomain == nil {
		return nil, fmt.Errorf("domain not found for code: %s", domainCode)
	}

	subs, err := r.ListSubDomains(matchedDomain.ID)
	if err != nil {
		return nil, fmt.Errorf("list sub-domains: %w", err)
	}

	_, subDomainCode, indicatorCode, err := parseFullIndicatorCode(fullCode, domains, subs)
	if err != nil {
		return nil, err
	}

	var matchedSub *models.PerformanceSubDomain
	for i := range subs {
		if subs[i].Code == subDomainCode {
			matchedSub = &subs[i]
			break
		}
	}
	if matchedSub == nil {
		return nil, fmt.Errorf("sub-domain not found for code: %s", subDomainCode)
	}

	var indicators []models.PerformanceIndicator
	_, err = r.AdminClient.From("performance_indicators").
		Select("id", "exact", false).
		Eq("sub_domain_id", matchedSub.ID.String()).
		Eq("code", indicatorCode).
		ExecuteTo(&indicators)
	if err != nil {
		return nil, fmt.Errorf("get indicator: %w", err)
	}
	if len(indicators) == 0 {
		return nil, fmt.Errorf("indicator not found for code: %s", indicatorCode)
	}
	return &indicators[0].ID, nil
}

func (r *Repository) DeletePeriod(id uuid.UUID) error {
	_, _, err := r.AdminClient.From("performance_periods").
		Delete("", "").
		Eq("id", id.String()).
		Execute()
	return err
}

func (r *Repository) GetPeriodByID(id uuid.UUID) (*models.PerformancePeriod, error) {
	var periods []models.PerformancePeriod
	_, err := r.AdminClient.From("performance_periods").
		Select("*", "exact", false).
		Eq("id", id.String()).
		ExecuteTo(&periods)
	if err != nil {
		return nil, fmt.Errorf("get period: %w", err)
	}
	if len(periods) == 0 {
		return nil, nil
	}
	return &periods[0], nil
}

func (r *Repository) CreateDomain(d *models.PerformanceDomain) error {
	_, _, err := r.AdminClient.From("performance_domains").
		Insert(d, false, "", "", "").
		Execute()
	return err
}

func (r *Repository) UpdateDomain(id uuid.UUID, data map[string]any) error {
	_, _, err := r.AdminClient.From("performance_domains").
		Update(data, "", "").
		Eq("id", id.String()).
		Execute()
	return err
}

func (r *Repository) DeleteDomain(id uuid.UUID) error {
	_, _, err := r.AdminClient.From("performance_domains").
		Delete("", "").
		Eq("id", id.String()).
		Execute()
	return err
}

func (r *Repository) CreateSubDomain(sd *models.PerformanceSubDomain) error {
	_, _, err := r.AdminClient.From("performance_sub_domains").
		Insert(sd, false, "", "", "").
		Execute()
	return err
}

func (r *Repository) UpdateSubDomain(id uuid.UUID, data map[string]any) error {
	_, _, err := r.AdminClient.From("performance_sub_domains").
		Update(data, "", "").
		Eq("id", id.String()).
		Execute()
	return err
}

func (r *Repository) DeleteSubDomain(id uuid.UUID) error {
	_, _, err := r.AdminClient.From("performance_sub_domains").
		Delete("", "").
		Eq("id", id.String()).
		Execute()
	return err
}

func (r *Repository) CreateIndicator(ind *models.PerformanceIndicator) error {
	_, _, err := r.AdminClient.From("performance_indicators").
		Insert(ind, false, "", "", "").
		Execute()
	return err
}

func (r *Repository) CreatePeriod(p *models.PerformancePeriod) error {
	_, _, err := r.AdminClient.From("performance_periods").
		Insert(p, false, "", "", "").
		Execute()
	return err
}

func (r *Repository) UpdateIndicator(id uuid.UUID, data map[string]any) error {
	_, _, err := r.AdminClient.From("performance_indicators").
		Update(data, "", "").
		Eq("id", id.String()).
		Execute()
	return err
}

func (r *Repository) DeleteIndicator(id uuid.UUID) error {
	_, _, err := r.AdminClient.From("performance_indicators").
		Delete("", "").
		Eq("id", id.String()).
		Execute()
	return err
}

func (r *Repository) GetZoneByCode(code string) (*models.GeographicZone, error) {
	var zones []models.GeographicZone
	_, err := r.AdminClient.From("geographic_zones").
		Select("*", "exact", false).
		Eq("zone_code", code).
		ExecuteTo(&zones)
	if err != nil {
		return nil, fmt.Errorf("get zone: %w", err)
	}
	if len(zones) == 0 {
		return nil, nil
	}
	return &zones[0], nil
}

func (r *Repository) ListPerformanceSubmissions() ([]map[string]any, error) {
	summaries, err := r.ListPerformanceSubmissionsEnriched()
	if err != nil {
		return nil, err
	}
	out := make([]map[string]any, 0, len(summaries))
	for _, s := range summaries {
		out = append(out, map[string]any{
			"zone_id":          s.ZoneID,
			"period_id":        s.PeriodID,
			"indicator_count":  s.IndicatorCount,
			"zone_name":        s.ZoneName,
			"period_label":     s.PeriodLabel,
		})
	}
	return out, nil
}

func (r *Repository) ListPerformanceSubmissionsEnriched() ([]models.PerformanceSubmissionSummary, error) {
	var rows []struct {
		ZoneID   string    `json:"zone_id"`
		PeriodID uuid.UUID `json:"period_id"`
	}
	_, err := r.AdminClient.From("performance_data").
		Select("zone_id,period_id", "exact", false).
		ExecuteTo(&rows)
	if err != nil {
		return nil, fmt.Errorf("list submissions: %w", err)
	}

	type key struct {
		zone   string
		period uuid.UUID
	}
	counts := map[key]int{}
	order := make([]key, 0)
	seen := map[key]bool{}
	for _, row := range rows {
		k := key{zone: row.ZoneID, period: row.PeriodID}
		counts[k]++
		if !seen[k] {
			seen[k] = true
			order = append(order, k)
		}
	}

	zoneNames := map[string]string{}
	periodLabels := map[uuid.UUID]string{}

	for _, k := range order {
		if _, ok := zoneNames[k.zone]; !ok {
			zone, err := r.GetZoneByCode(k.zone)
			if err == nil && zone != nil {
				zoneNames[k.zone] = zone.NameKh
			}
		}
		if _, ok := periodLabels[k.period]; !ok {
			var periods []models.PerformancePeriod
			if _, err := r.AdminClient.From("performance_periods").
				Select("*", "exact", false).
				Eq("id", k.period.String()).
				ExecuteTo(&periods); err == nil && len(periods) > 0 {
				periodLabels[k.period] = periods[0].LabelKh
			}
		}
	}

	summaries := make([]models.PerformanceSubmissionSummary, 0, len(order))
	for _, k := range order {
		summaries = append(summaries, models.PerformanceSubmissionSummary{
			ZoneID:         k.zone,
			PeriodID:       k.period,
			IndicatorCount: counts[k],
			ZoneName:       zoneNames[k.zone],
			PeriodLabel:    periodLabels[k.period],
		})
	}
	return summaries, nil
}

func (r *Repository) DeletePerformanceData(id uuid.UUID) error {
	_, _, err := r.AdminClient.From("performance_data").
		Delete("", "").
		Eq("id", id.String()).
		Execute()
	return err
}

func (r *Repository) DeletePerformanceDataByZoneAndPeriod(zoneID string, periodID uuid.UUID) error {
	_, _, err := r.AdminClient.From("performance_data").
		Delete("", "").
		Eq("zone_id", zoneID).
		Eq("period_id", periodID.String()).
		Execute()
	return err
}

func (r *Repository) GetFullReportData(zoneID string, periodID uuid.UUID) (*models.PerformanceReportData, error) {
	zone, err := r.GetZoneByCode(zoneID)
	if err != nil {
		return nil, fmt.Errorf("get zone: %w", err)
	}
	if zone == nil {
		return nil, fmt.Errorf("zone not found: %s", zoneID)
	}

	period, err := r.GetPeriodByID(periodID)
	if err != nil {
		return nil, fmt.Errorf("get period: %w", err)
	}
	if period == nil {
		return nil, fmt.Errorf("period not found")
	}

	domains, err := r.ListDomains()
	if err != nil {
		return nil, err
	}

	dataMap := make(map[string]*models.PerformanceData)
	dataRows, err := r.GetPerformanceData(zoneID, periodID)
	if err != nil {
		return nil, err
	}
	for _, d := range dataRows {
		entry := d
		dataMap[entry.IndicatorID.String()] = &entry
	}

	var reportDomains []models.PerformanceReportDomain
	for _, domain := range domains {
		subDomains, err := r.ListSubDomains(domain.ID)
		if err != nil {
			return nil, err
		}

		var reportSubDomains []models.PerformanceReportSubDomain
		for _, sub := range subDomains {
			indicators, err := r.ListIndicators(sub.ID)
			if err != nil {
				return nil, err
			}

			var reportIndicators []models.PerformanceReportIndicator
			for _, ind := range indicators {
				val := dataMap[ind.ID.String()]
				reportIndicators = append(reportIndicators, models.PerformanceReportIndicator{
					Indicator: ind,
					Value:     val,
				})
			}

			reportSubDomains = append(reportSubDomains, models.PerformanceReportSubDomain{
				SubDomain:  sub,
				Indicators:    reportIndicators,
			})
		}

		reportDomains = append(reportDomains, models.PerformanceReportDomain{
			Domain:     domain,
			SubDomains: reportSubDomains,
		})
	}

	return &models.PerformanceReportData{
		Zone:    *zone,
		Period:  *period,
		Domains: reportDomains,
	}, nil
}

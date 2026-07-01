package main

import (
	"encoding/csv"
	"log"
	"os"
	"path/filepath"

	"github.com/banhahuy/cheungprey-system/backend/pkg/config"
	"github.com/supabase-community/supabase-go"
)

type Zone struct {
	ZoneCode   string  `json:"zone_code"`
	NameKh     string  `json:"name_kh"`
	NameEn     string  `json:"name_en"`
	ZoneType   string  `json:"zone_type"`
	ParentCode *string `json:"parent_code"`
}

func main() {
	assetsDir := "/Users/banhahuy/Documents/cheungprey-system/assets"
	if len(os.Args) > 1 {
		assetsDir = os.Args[1]
	}

	cfg := config.Load()
	client, err := supabase.NewClient(cfg.SupabaseURL, cfg.SupabaseServiceKey, nil)
	if err != nil {
		log.Fatalf("Failed to create client: %v", err)
	}

	upsertBatch := func(batch []Zone) {
		var records []any
		for _, z := range batch {
			records = append(records, z)
		}
		if _, _, err := client.From("geographic_zones").Upsert(records, "zone_code", "", "").Execute(); err != nil {
			log.Printf("ERROR batch (%d records): %v", len(batch), err)
		} else {
			log.Printf("  OK batch of %d", len(batch))
		}
	}

	// Provinces
	log.Print("Seeding provinces...")
	var provs []Zone
	for _, r := range readCSVs(filepath.Join(assetsDir, "Cambodia Province List 2025.csv")) {
		provs = append(provs, Zone{ZoneCode: r[0], NameKh: r[1], NameEn: r[2], ZoneType: "Province"})
	}
	upsertBatch(provs)
	log.Printf("  %d provinces", len(provs))

	// Districts
	log.Print("Seeding districts...")
	var dists []Zone
	for _, r := range readCSVs(filepath.Join(assetsDir, "Cambodia District List 2025.csv")) {
		p := r[0]
		dists = append(dists, Zone{ZoneCode: r[1], NameKh: r[2], NameEn: r[3], ZoneType: "District", ParentCode: &p})
	}
	upsertBatch(dists)
	log.Printf("  %d districts", len(dists))

	// Communes (batch of 200)
	log.Print("Seeding communes...")
	var comms []Zone
	for _, r := range readCSVs(filepath.Join(assetsDir, "Cambodia Commune List 2025.csv")) {
		p := r[1]
		comms = append(comms, Zone{ZoneCode: r[2], NameKh: r[3], NameEn: r[4], ZoneType: "Commune", ParentCode: &p})
	}
	for i := 0; i < len(comms); i += 200 {
		end := i + 200
		if end > len(comms) {
			end = len(comms)
		}
		upsertBatch(comms[i:end])
	}
	log.Printf("  %d communes", len(comms))

	log.Print("Done!")
}

func readCSVs(path string) [][]string {
	f, err := os.Open(path)
	if err != nil {
		log.Fatalf("open %s: %v", path, err)
	}
	defer f.Close()
	r := csv.NewReader(f)
	r.LazyQuotes = true
	rows, err := r.ReadAll()
	if err != nil {
		log.Fatalf("read %s: %v", path, err)
	}
	return rows[1:] // skip header
}

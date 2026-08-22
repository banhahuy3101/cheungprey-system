package repository

import (
	"fmt"
	"sort"

	"github.com/google/uuid"
	"github.com/supabase-community/postgrest-go"

	"github.com/banhahuy/cheungprey-system/backend/internal/models"
)

func (r *Repository) ListMenuItems() ([]models.MenuItem, error) {
	var items []models.MenuItem
	_, err := r.AdminClient.From("menu_items").
		Select("*", "exact", false).
		Order("sort_order", &postgrest.OrderOpts{Ascending: true}).
		Order("created_at", &postgrest.OrderOpts{Ascending: true}).
		ExecuteTo(&items)
	if err != nil {
		return nil, fmt.Errorf("list menu items: %w", err)
	}
	if items == nil {
		items = []models.MenuItem{}
	}
	return items, nil
}

func (r *Repository) ListMenuTree() ([]*models.MenuItem, error) {
	items, err := r.ListMenuItems()
	if err != nil {
		return nil, err
	}

	itemMap := make(map[uuid.UUID]*models.MenuItem)
	var rootItems []*models.MenuItem

	for i := range items {
		itemCopy := items[i]
		itemCopy.Children = []*models.MenuItem{}
		itemMap[itemCopy.ID] = &itemCopy
	}

	// Preserve initial sort order during parent-child grouping
	for i := range items {
		item := itemMap[items[i].ID]
		if item.ParentID != nil && *item.ParentID != uuid.Nil {
			if parent, ok := itemMap[*item.ParentID]; ok {
				parent.Children = append(parent.Children, item)
			} else {
				rootItems = append(rootItems, item)
			}
		} else {
			rootItems = append(rootItems, item)
		}
	}

	// Sort root items by sort_order
	sort.Slice(rootItems, func(i, j int) bool {
		return rootItems[i].SortOrder < rootItems[j].SortOrder
	})

	// Sort children of each parent by sort_order
	for _, item := range itemMap {
		if len(item.Children) > 0 {
			sort.Slice(item.Children, func(i, j int) bool {
				return item.Children[i].SortOrder < item.Children[j].SortOrder
			})
		}
	}

	return rootItems, nil
}

func (r *Repository) GetMenuItemByID(id uuid.UUID) (*models.MenuItem, error) {
	var items []models.MenuItem
	_, err := r.AdminClient.From("menu_items").
		Select("*", "exact", false).
		Eq("id", id.String()).
		ExecuteTo(&items)
	if err != nil {
		return nil, fmt.Errorf("get menu item: %w", err)
	}
	if len(items) == 0 {
		return nil, fmt.Errorf("menu item not found")
	}
	return &items[0], nil
}

func (r *Repository) CreateMenuItem(item *models.MenuItem) error {
	_, _, err := r.AdminClient.From("menu_items").
		Insert(item, false, "", "", "").
		Execute()
	return err
}

func (r *Repository) UpdateMenuItem(id uuid.UUID, data map[string]any) error {
	_, _, err := r.AdminClient.From("menu_items").
		Update(data, "", "").
		Eq("id", id.String()).
		Execute()
	return err
}

func (r *Repository) DeleteMenuItem(id uuid.UUID) error {
	_, _, err := r.AdminClient.From("menu_items").
		Delete("", "").
		Eq("id", id.String()).
		Execute()
	return err
}

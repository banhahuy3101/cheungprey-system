package repository

import (
	"fmt"

	"github.com/google/uuid"
	"github.com/supabase-community/postgrest-go"

	"github.com/banhahuy/cheungprey-system/backend/internal/models"
)

func (r *Repository) ListModuleConfigs() ([]models.ModuleConfig, error) {
	var configs []models.ModuleConfig
	_, err := r.AdminClient.From("module_configs").
		Select("*", "exact", false).
		Order("module_key", &postgrest.OrderOpts{Ascending: true}).
		ExecuteTo(&configs)
	if err != nil {
		return nil, fmt.Errorf("list module configs: %w", err)
	}
	if configs == nil {
		configs = []models.ModuleConfig{}
	}
	return configs, nil
}

func (r *Repository) GetModuleConfig(moduleKey string) (*models.ModuleConfig, error) {
	var configs []models.ModuleConfig
	_, err := r.AdminClient.From("module_configs").
		Select("*", "exact", false).
		Eq("module_key", moduleKey).
		ExecuteTo(&configs)
	if err != nil {
		return nil, fmt.Errorf("get module config: %w", err)
	}
	if len(configs) == 0 {
		return nil, nil
	}
	return &configs[0], nil
}

func (r *Repository) UpsertModuleConfig(cfg *models.ModuleConfig) error {
	_, _, err := r.AdminClient.From("module_configs").
		Upsert(cfg, "module_key", "", "").
		Execute()
	return err
}

func (r *Repository) ListWorkflowSteps(moduleKey string) ([]models.WorkflowStep, error) {
	var steps []models.WorkflowStep
	_, err := r.AdminClient.From("workflow_steps").
		Select("*", "exact", false).
		Eq("module_key", moduleKey).
		Order("step_order", &postgrest.OrderOpts{Ascending: true}).
		ExecuteTo(&steps)
	if err != nil {
		return nil, fmt.Errorf("list workflow steps: %w", err)
	}
	if steps == nil {
		steps = []models.WorkflowStep{}
	}
	return steps, nil
}

func (r *Repository) CreateWorkflowStep(step *models.WorkflowStep) error {
	var steps []models.WorkflowStep
	_, err := r.AdminClient.From("workflow_steps").
		Select("step_order", "exact", false).
		Eq("module_key", step.ModuleKey).
		Order("step_order", &postgrest.OrderOpts{Ascending: false}).
		Limit(1, "").
		ExecuteTo(&steps)
	if err != nil {
		return fmt.Errorf("get max step order: %w", err)
	}
	if len(steps) > 0 {
		step.StepOrder = steps[0].StepOrder + 1
	} else {
		step.StepOrder = 1
	}

	_, _, err = r.AdminClient.From("workflow_steps").
		Insert(step, false, "", "", "").
		Execute()
	return err
}

func (r *Repository) UpdateWorkflowStep(id uuid.UUID, data map[string]any) error {
	_, _, err := r.AdminClient.From("workflow_steps").
		Update(data, "", "").
		Eq("id", id.String()).
		Execute()
	return err
}

func (r *Repository) DeleteWorkflowStep(id uuid.UUID) error {
	_, _, err := r.AdminClient.From("workflow_steps").
		Delete("", "").
		Eq("id", id.String()).
		Execute()
	return err
}

func (r *Repository) ReorderWorkflowSteps(stepIDs []uuid.UUID) error {
	for i, id := range stepIDs {
		_, _, err := r.AdminClient.From("workflow_steps").
			Update(map[string]any{"step_order": i + 1}, "", "").
			Eq("id", id.String()).
			Execute()
		if err != nil {
			return fmt.Errorf("reorder step %s: %w", id, err)
		}
	}
	return nil
}

func (r *Repository) CreateWorkflowApproval(approval *models.WorkflowApproval) error {
	_, _, err := r.AdminClient.From("workflow_approvals").
		Insert(approval, false, "", "", "").
		Execute()
	return err
}

func (r *Repository) UpdateWorkflowApproval(id uuid.UUID, data map[string]any) error {
	_, _, err := r.AdminClient.From("workflow_approvals").
		Update(data, "", "").
		Eq("id", id.String()).
		Execute()
	return err
}

func (r *Repository) GetApprovalByID(id uuid.UUID) (*models.WorkflowApproval, error) {
	var approvals []models.WorkflowApproval
	_, err := r.AdminClient.From("workflow_approvals").
		Select("*", "exact", false).
		Eq("id", id.String()).
		ExecuteTo(&approvals)
	if err != nil {
		return nil, fmt.Errorf("get approval by id: %w", err)
	}
	if len(approvals) == 0 {
		return nil, nil
	}
	return &approvals[0], nil
}

func (r *Repository) GetCurrentApproval(moduleKey string, itemID uuid.UUID) (*models.WorkflowApproval, error) {
	var approvals []models.WorkflowApproval
	_, err := r.AdminClient.From("workflow_approvals").
		Select("*", "exact", false).
		Eq("module_key", moduleKey).
		Eq("item_id", itemID.String()).
		Eq("status", "pending").
		Order("step_order", &postgrest.OrderOpts{Ascending: true}).
		Limit(1, "").
		ExecuteTo(&approvals)
	if err != nil {
		return nil, fmt.Errorf("get current approval: %w", err)
	}
	if len(approvals) == 0 {
		return nil, nil
	}
	return &approvals[0], nil
}

func (r *Repository) ListApprovalHistory(moduleKey string, itemID uuid.UUID) ([]models.WorkflowApproval, error) {
	var approvals []models.WorkflowApproval
	_, err := r.AdminClient.From("workflow_approvals").
		Select("*", "exact", false).
		Eq("module_key", moduleKey).
		Eq("item_id", itemID.String()).
		Order("step_order", &postgrest.OrderOpts{Ascending: true}).
		ExecuteTo(&approvals)
	if err != nil {
		return nil, fmt.Errorf("list approval history: %w", err)
	}
	if approvals == nil {
		approvals = []models.WorkflowApproval{}
	}
	return approvals, nil
}

func (r *Repository) ListPendingApprovalsForApprover(moduleKey string, approverRole string, zonePrefix string) ([]models.WorkflowApproval, error) {
	var approvals []models.WorkflowApproval
	q := r.AdminClient.From("workflow_approvals").
		Select("*", "exact", false).
		Eq("module_key", moduleKey).
		Eq("step_order", "1"). // default, will be filtered
		Eq("status", "pending")

	_, err := q.ExecuteTo(&approvals)
	if err != nil {
		return nil, fmt.Errorf("list pending approvals: %w", err)
	}

	var steps []models.WorkflowStep
	_, err = r.AdminClient.From("workflow_steps").
		Select("*", "exact", false).
		Eq("module_key", moduleKey).
		Eq("approver_role", approverRole).
		Order("step_order", &postgrest.OrderOpts{Ascending: true}).
		ExecuteTo(&steps)
	if err != nil {
		return nil, fmt.Errorf("list steps for approver: %w", err)
	}

	stepOrderMap := make(map[int]bool)
	for _, s := range steps {
		stepOrderMap[s.StepOrder] = true
	}

	var result []models.WorkflowApproval
	for _, a := range approvals {
		if stepOrderMap[a.StepOrder] {
			result = append(result, a)
		}
	}
	if result == nil {
		result = []models.WorkflowApproval{}
	}
	return result, nil
}

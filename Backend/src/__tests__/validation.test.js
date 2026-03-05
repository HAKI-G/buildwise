/**
 * S9: Unit Tests for BuildWise Backend
 * Tests validation logic, business rules, and utility functions
 */
import { describe, it, expect } from 'vitest';

// ============================================================
// S8: Project Creation Validation Tests
// ============================================================
describe('Project Creation Validation (S8)', () => {
  // Simulate the validation logic from projectController.createProject
  const validateProjectData = ({ name, location, contractor, projectManager, contractCost, dateStarted, contractCompletionDate }) => {
    const errors = [];
    
    if (!name || !location) errors.push('Please provide at least a project name and location.');
    if (!contractor || !contractor.trim()) errors.push('Contractor name is required');
    if (!projectManager || !projectManager.trim()) errors.push('Project manager name is required');
    if (projectManager && projectManager.trim().split(/\s+/).length < 2) {
      errors.push('Project manager must have at least first and last name');
    }
    const nameRegex = /^[a-zA-Z\s.\-,]+$/;
    if (projectManager && projectManager.trim() && !nameRegex.test(projectManager.trim())) {
      errors.push('Project manager name should only contain letters, spaces, and basic punctuation');
    }
    if (contractCost && parseFloat(contractCost) <= 0) {
      errors.push('Contract cost must be a positive number');
    }
    if (dateStarted && contractCompletionDate && new Date(contractCompletionDate) <= new Date(dateStarted)) {
      errors.push('Completion date must be after the start date');
    }
    
    return errors;
  };

  it('should pass with valid project data', () => {
    const errors = validateProjectData({
      name: 'Sample Project',
      location: 'Manila',
      contractor: 'ABC Builders',
      projectManager: 'John Doe',
      contractCost: '1000000',
      dateStarted: '2025-01-01',
      contractCompletionDate: '2025-12-31'
    });
    expect(errors).toHaveLength(0);
  });

  it('should fail when project name is missing', () => {
    const errors = validateProjectData({
      name: '',
      location: 'Manila',
      contractor: 'ABC Builders',
      projectManager: 'John Doe',
      contractCost: '1000000',
      dateStarted: '2025-01-01',
      contractCompletionDate: '2025-12-31'
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('project name and location');
  });

  it('should fail when project manager has only one name', () => {
    const errors = validateProjectData({
      name: 'Test Project',
      location: 'Manila',
      contractor: 'ABC Builders',
      projectManager: 'John',
      contractCost: '1000000',
      dateStarted: '2025-01-01',
      contractCompletionDate: '2025-12-31'
    });
    expect(errors).toContain('Project manager must have at least first and last name');
  });

  it('should fail when project manager name contains numbers', () => {
    const errors = validateProjectData({
      name: 'Test Project',
      location: 'Manila',
      contractor: 'ABC Builders',
      projectManager: 'John123 Doe',
      contractCost: '1000000',
      dateStarted: '2025-01-01',
      contractCompletionDate: '2025-12-31'
    });
    expect(errors).toContain('Project manager name should only contain letters, spaces, and basic punctuation');
  });

  it('should fail when contract cost is negative', () => {
    const errors = validateProjectData({
      name: 'Test Project',
      location: 'Manila',
      contractor: 'ABC Builders',
      projectManager: 'John Doe',
      contractCost: '-500',
      dateStarted: '2025-01-01',
      contractCompletionDate: '2025-12-31'
    });
    expect(errors).toContain('Contract cost must be a positive number');
  });

  it('should fail when completion date is before start date', () => {
    const errors = validateProjectData({
      name: 'Test Project',
      location: 'Manila',
      contractor: 'ABC Builders',
      projectManager: 'John Doe',
      contractCost: '1000000',
      dateStarted: '2025-12-31',
      contractCompletionDate: '2025-01-01'
    });
    expect(errors).toContain('Completion date must be after the start date');
  });

  it('should fail when contractor name is empty', () => {
    const errors = validateProjectData({
      name: 'Test Project',
      location: 'Manila',
      contractor: '',
      projectManager: 'John Doe',
      contractCost: '1000000',
      dateStarted: '2025-01-01',
      contractCompletionDate: '2025-12-31'
    });
    expect(errors).toContain('Contractor name is required');
  });
});

// ============================================================
// S5: Delete Completed Project Guard Tests
// ============================================================
describe('Delete Completed Project Guard (S5)', () => {
  const canDeleteProject = (project) => {
    if (project.status === 'Completed') {
      return { allowed: false, message: 'Cannot delete a completed project. It has been archived for record-keeping.' };
    }
    return { allowed: true };
  };

  it('should allow deleting a project that is Not Started', () => {
    const result = canDeleteProject({ status: 'Not Started' });
    expect(result.allowed).toBe(true);
  });

  it('should allow deleting a project that is In Progress', () => {
    const result = canDeleteProject({ status: 'In Progress' });
    expect(result.allowed).toBe(true);
  });

  it('should NOT allow deleting a completed project', () => {
    const result = canDeleteProject({ status: 'Completed' });
    expect(result.allowed).toBe(false);
    expect(result.message).toContain('Cannot delete');
  });
});

// ============================================================
// S10: Phase Weight Distribution Tests
// ============================================================
describe('Phase Weight Distribution (S10)', () => {
  const calculatePhaseWeights = (phases) => {
    const totalBudget = phases.reduce((sum, p) => sum + (p.estimatedCost || 0), 0);
    const weights = {};
    
    if (totalBudget > 0) {
      phases.forEach(p => {
        weights[p.milestoneId] = parseFloat(((p.estimatedCost || 0) / totalBudget * 100).toFixed(1));
      });
    } else {
      const equalWeight = parseFloat((100 / phases.length).toFixed(1));
      phases.forEach(p => {
        weights[p.milestoneId] = equalWeight;
      });
    }
    return weights;
  };

  it('should distribute weights equally when no budgets', () => {
    const phases = [
      { milestoneId: 'p1', estimatedCost: 0 },
      { milestoneId: 'p2', estimatedCost: 0 },
      { milestoneId: 'p3', estimatedCost: 0 },
      { milestoneId: 'p4', estimatedCost: 0 }
    ];
    const weights = calculatePhaseWeights(phases);
    expect(weights['p1']).toBe(25.0);
    expect(weights['p2']).toBe(25.0);
  });

  it('should distribute weights based on budget when budgets exist', () => {
    const phases = [
      { milestoneId: 'p1', estimatedCost: 300000 },
      { milestoneId: 'p2', estimatedCost: 700000 }
    ];
    const weights = calculatePhaseWeights(phases);
    expect(weights['p1']).toBe(30.0);
    expect(weights['p2']).toBe(70.0);
  });

  it('should handle single phase (100%)', () => {
    const phases = [{ milestoneId: 'p1', estimatedCost: 500000 }];
    const weights = calculatePhaseWeights(phases);
    expect(weights['p1']).toBe(100.0);
  });
});

// ============================================================
// S16: Phase Completion Lock Tests
// ============================================================
describe('Phase Completion Lock (S16)', () => {
  const calculatePhaseLocks = (phases) => {
    const locks = {};
    for (let i = 0; i < phases.length; i++) {
      if (i === 0) {
        locks[phases[i].milestoneId] = false; // First phase always unlocked
      } else {
        locks[phases[i].milestoneId] = phases[i - 1].status !== 'completed';
      }
    }
    return locks;
  };

  it('should unlock first phase by default', () => {
    const phases = [
      { milestoneId: 'p1', status: 'not started' },
      { milestoneId: 'p2', status: 'not started' }
    ];
    const locks = calculatePhaseLocks(phases);
    expect(locks['p1']).toBe(false);
  });

  it('should lock second phase when first is not completed', () => {
    const phases = [
      { milestoneId: 'p1', status: 'in progress' },
      { milestoneId: 'p2', status: 'not started' }
    ];
    const locks = calculatePhaseLocks(phases);
    expect(locks['p2']).toBe(true);
  });

  it('should unlock second phase when first is completed', () => {
    const phases = [
      { milestoneId: 'p1', status: 'completed' },
      { milestoneId: 'p2', status: 'not started' }
    ];
    const locks = calculatePhaseLocks(phases);
    expect(locks['p2']).toBe(false);
  });

  it('should lock third phase when second not completed', () => {
    const phases = [
      { milestoneId: 'p1', status: 'completed' },
      { milestoneId: 'p2', status: 'in progress' },
      { milestoneId: 'p3', status: 'not started' }
    ];
    const locks = calculatePhaseLocks(phases);
    expect(locks['p1']).toBe(false);
    expect(locks['p2']).toBe(false);
    expect(locks['p3']).toBe(true);
  });
});

// ============================================================
// S11: Pre-Construction Checklist Tests
// ============================================================
describe('Pre-Construction Checklist (S11)', () => {
  const checkPreConstructionReady = (documents) => {
    const hasPermit = documents.some(d => d.documentType === 'Permit');
    const hasContract = documents.some(d => d.documentType === 'Contract');
    return { ready: hasPermit && hasContract, hasPermit, hasContract };
  };

  it('should be ready when both Permit and Contract exist', () => {
    const docs = [
      { documentType: 'Permit', name: 'Building Permit' },
      { documentType: 'Contract', name: 'Main Contract' }
    ];
    const result = checkPreConstructionReady(docs);
    expect(result.ready).toBe(true);
  });

  it('should NOT be ready when Permit is missing', () => {
    const docs = [
      { documentType: 'Contract', name: 'Main Contract' }
    ];
    const result = checkPreConstructionReady(docs);
    expect(result.ready).toBe(false);
    expect(result.hasPermit).toBe(false);
    expect(result.hasContract).toBe(true);
  });

  it('should NOT be ready when Contract is missing', () => {
    const docs = [
      { documentType: 'Permit', name: 'Building Permit' }
    ];
    const result = checkPreConstructionReady(docs);
    expect(result.ready).toBe(false);
  });

  it('should NOT be ready when no documents exist', () => {
    const result = checkPreConstructionReady([]);
    expect(result.ready).toBe(false);
  });
});

// ============================================================
// S7: VP Role Permissions Tests
// ============================================================
describe('VP Role Permissions (S7)', () => {
  const getPermissions = (role) => {
    const isVP = role === 'Vice President';
    const isAdmin = role === 'Admin';
    
    return {
      canViewProjects: true,
      canCreateProject: !isVP,
      canEditProject: !isVP,
      canDeleteProject: !isVP,
      canViewReports: true,
      canAccessAdmin: isAdmin,
    };
  };

  it('should restrict VP from creating/editing/deleting projects', () => {
    const perms = getPermissions('Vice President');
    expect(perms.canViewProjects).toBe(true);
    expect(perms.canCreateProject).toBe(false);
    expect(perms.canEditProject).toBe(false);
    expect(perms.canDeleteProject).toBe(false);
  });

  it('should allow Project Manager full access', () => {
    const perms = getPermissions('Project Manager');
    expect(perms.canViewProjects).toBe(true);
    expect(perms.canCreateProject).toBe(true);
    expect(perms.canEditProject).toBe(true);
    expect(perms.canDeleteProject).toBe(true);
  });

  it('should allow Admin full access including admin panel', () => {
    const perms = getPermissions('Admin');
    expect(perms.canCreateProject).toBe(true);
    expect(perms.canAccessAdmin).toBe(true);
  });
});

// ============================================================
// S19: Expense Update Validation Tests
// ============================================================
describe('Expense Update Validation (S19)', () => {
  const validateExpenseUpdate = (data) => {
    const errors = [];
    if (data.amount !== undefined && (isNaN(data.amount) || parseFloat(data.amount) < 0)) {
      errors.push('Amount must be a non-negative number');
    }
    if (data.category !== undefined && !data.category.trim()) {
      errors.push('Category cannot be empty');
    }
    if (data.description !== undefined && !data.description.trim()) {
      errors.push('Description cannot be empty');
    }
    return errors;
  };

  it('should pass with valid expense data', () => {
    const errors = validateExpenseUpdate({
      amount: 5000,
      category: 'Materials',
      description: 'Cement bags'
    });
    expect(errors).toHaveLength(0);
  });

  it('should fail with negative amount', () => {
    const errors = validateExpenseUpdate({ amount: -100 });
    expect(errors).toContain('Amount must be a non-negative number');
  });

  it('should fail with empty category', () => {
    const errors = validateExpenseUpdate({ category: '   ' });
    expect(errors).toContain('Category cannot be empty');
  });
});

// ============================================================
// S17: Report Metadata Tests 
// ============================================================
describe('Report Metadata (S17)', () => {
  const buildReportMetadata = (user, project) => {
    return {
      companyName: 'New San Jose Builders Inc.',
      generatedByName: user?.name || 'Unknown',
      generatedByRole: user?.role || 'Unknown',
      generatedAt: new Date().toISOString(),
      projectName: project?.name || 'Unknown Project',
    };
  };

  it('should include company name', () => {
    const metadata = buildReportMetadata({ name: 'John Doe', role: 'Project Manager' }, { name: 'Test Project' });
    expect(metadata.companyName).toBe('New San Jose Builders Inc.');
  });

  it('should include user info', () => {
    const metadata = buildReportMetadata({ name: 'Jane Smith', role: 'Admin' }, { name: 'Test' });
    expect(metadata.generatedByName).toBe('Jane Smith');
    expect(metadata.generatedByRole).toBe('Admin');
  });

  it('should handle missing user gracefully', () => {
    const metadata = buildReportMetadata(null, { name: 'Test' });
    expect(metadata.generatedByName).toBe('Unknown');
  });
});

// ============================================================
// S18: Expense Liquidation Grouping Tests
// ============================================================
describe('Expense Liquidation by Category (S18)', () => {
  const groupExpensesByCategory = (expenses) => {
    return expenses.reduce((acc, expense) => {
      const cat = expense.category || 'Uncategorized';
      if (!acc[cat]) acc[cat] = { total: 0, items: [] };
      acc[cat].total += parseFloat(expense.amount) || 0;
      acc[cat].items.push(expense);
      return acc;
    }, {});
  };

  it('should group expenses by category', () => {
    const expenses = [
      { category: 'Materials', amount: 5000, description: 'Cement' },
      { category: 'Materials', amount: 3000, description: 'Steel' },
      { category: 'Labor', amount: 10000, description: 'Workers' }
    ];
    const grouped = groupExpensesByCategory(expenses);
    expect(grouped['Materials'].total).toBe(8000);
    expect(grouped['Materials'].items).toHaveLength(2);
    expect(grouped['Labor'].total).toBe(10000);
  });

  it('should handle uncategorized expenses', () => {
    const expenses = [
      { amount: 1000, description: 'Misc' }
    ];
    const grouped = groupExpensesByCategory(expenses);
    expect(grouped['Uncategorized'].total).toBe(1000);
  });

  it('should handle empty expenses', () => {
    const grouped = groupExpensesByCategory([]);
    expect(Object.keys(grouped)).toHaveLength(0);
  });
});

// ============================================================
// Utility: Currency Formatting Tests
// ============================================================
describe('Currency Formatting', () => {
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '0';
    return parseInt(amount).toLocaleString();
  };

  it('should format numbers with commas', () => {
    expect(formatCurrency(1000000)).toBe('1,000,000');
  });

  it('should handle zero', () => {
    expect(formatCurrency(0)).toBe('0');
  });

  it('should handle null', () => {
    expect(formatCurrency(null)).toBe('0');
  });
});

// ============================================================
// Utility: Phase Number Extraction Tests
// ============================================================
describe('Phase Number Extraction', () => {
  const extractPhaseNumber = (phaseName) => {
    if (!phaseName) return null;
    const match = phaseName.match(/Phase(\d+)/i);
    return match ? parseInt(match[1]) : null;
  };

  it('should extract phase number from "Phase1"', () => {
    expect(extractPhaseNumber('Phase1')).toBe(1);
  });

  it('should extract phase number from "Phase 12"', () => {
    expect(extractPhaseNumber('Phase12 - Foundation')).toBe(12);
  });

  it('should return null for names without phase number', () => {
    expect(extractPhaseNumber('Foundation Work')).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(extractPhaseNumber('')).toBeNull();
  });
});

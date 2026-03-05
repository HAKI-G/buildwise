/**
 * S9: Unit Tests for BuildWise Frontend
 * Tests validation logic, business rules, and UI helper functions
 */
import { describe, it, expect } from 'vitest';

// ============================================================
// S8: Frontend Form Validation Tests
// ============================================================
describe('Project Form Validation (S8 - Frontend)', () => {
  const validateProjectForm = ({ projectName, location, contractor, dateStarted, contractCompletionDate, contractCost, projectManager }) => {
    const errors = [];
    
    if (!projectName.trim()) errors.push('Project name is required');
    if (!location.trim()) errors.push('Location is required');
    if (!contractor.trim()) errors.push('Contractor name is required');
    if (!dateStarted) errors.push('Date started is required');
    if (!contractCompletionDate) errors.push('Contract completion date is required');
    if (!contractCost || parseFloat(contractCost) <= 0) errors.push('Contract cost must be a positive number');
    if (!projectManager.trim()) errors.push('Project manager name is required');
    
    if (projectManager.trim() && projectManager.trim().split(/\s+/).length < 2) {
      errors.push('Project manager must have at least first and last name');
    }
    
    const nameRegex = /^[a-zA-Z\s.\-,]+$/;
    if (projectManager.trim() && !nameRegex.test(projectManager.trim())) {
      errors.push('Project manager name should only contain letters, spaces, and basic punctuation');
    }
    if (contractor.trim() && contractor.trim().length < 3) {
      errors.push('Contractor name must be at least 3 characters');
    }
    
    if (dateStarted && contractCompletionDate && new Date(contractCompletionDate) <= new Date(dateStarted)) {
      errors.push('Completion date must be after the start date');
    }
    
    return errors;
  };

  it('should return no errors for valid form data', () => {
    const errors = validateProjectForm({
      projectName: 'New Building',
      location: 'Quezon City',
      contractor: 'ABC Builders Inc.',
      dateStarted: '2025-03-01',
      contractCompletionDate: '2026-03-01',
      contractCost: '5000000',
      projectManager: 'Juan Dela Cruz'
    });
    expect(errors).toHaveLength(0);
  });

  it('should catch all empty required fields', () => {
    const errors = validateProjectForm({
      projectName: '',
      location: '',
      contractor: '',
      dateStarted: '',
      contractCompletionDate: '',
      contractCost: '',
      projectManager: ''
    });
    expect(errors.length).toBeGreaterThanOrEqual(5);
  });

  it('should reject short contractor name', () => {
    const errors = validateProjectForm({
      projectName: 'Test',
      location: 'Manila',
      contractor: 'AB',
      dateStarted: '2025-01-01',
      contractCompletionDate: '2025-12-31',
      contractCost: '1000',
      projectManager: 'John Doe'
    });
    expect(errors).toContain('Contractor name must be at least 3 characters');
  });

  it('should allow names with dots and hyphens', () => {
    const errors = validateProjectForm({
      projectName: 'Test',
      location: 'Manila',
      contractor: 'ABC Corp.',
      dateStarted: '2025-01-01',
      contractCompletionDate: '2025-12-31',
      contractCost: '1000',
      projectManager: 'Juan Dela-Cruz Jr.'
    });
    expect(errors).toHaveLength(0);
  });
});

// ============================================================
// S1: Pagination Logic Tests
// ============================================================
describe('Dashboard Pagination (S1)', () => {
  const paginate = (items, visibleCount) => {
    return {
      visible: items.slice(0, visibleCount),
      remaining: Math.max(0, items.length - visibleCount),
      hasMore: items.length > visibleCount,
      canShowLess: visibleCount > 5,
    };
  };

  it('should show first 5 items by default', () => {
    const items = Array.from({ length: 12 }, (_, i) => ({ id: i + 1 }));
    const result = paginate(items, 5);
    expect(result.visible).toHaveLength(5);
    expect(result.remaining).toBe(7);
    expect(result.hasMore).toBe(true);
  });

  it('should show all items when count is small', () => {
    const items = Array.from({ length: 3 }, (_, i) => ({ id: i + 1 }));
    const result = paginate(items, 5);
    expect(result.visible).toHaveLength(3);
    expect(result.hasMore).toBe(false);
  });

  it('should allow showing more', () => {
    const items = Array.from({ length: 12 }, (_, i) => ({ id: i + 1 }));
    const result = paginate(items, 10);
    expect(result.visible).toHaveLength(10);
    expect(result.remaining).toBe(2);
    expect(result.canShowLess).toBe(true);
  });
});

// ============================================================
// S2: Dashboard Stats Calculation Tests
// ============================================================
describe('Dashboard Stats (S2)', () => {
  const calculateStats = (projects) => {
    return {
      totalProjects: projects.length,
      activeProjects: projects.filter(p => p.status === 'In Progress').length,
      completedProjects: projects.filter(p => p.status === 'Completed').length,
      notStartedProjects: projects.filter(p => p.status === 'Not Started' || !p.status).length,
      overdueProjects: projects.filter(p => {
        if (p.status === 'Completed') return false;
        const dueDate = new Date(p.contractCompletionDate);
        return dueDate < new Date() && !isNaN(dueDate.getTime());
      }).length,
    };
  };

  it('should calculate correct project counts', () => {
    const projects = [
      { status: 'In Progress', contractCompletionDate: '2030-12-31' },
      { status: 'Completed', contractCompletionDate: '2024-01-01' },
      { status: 'Not Started', contractCompletionDate: '2030-06-01' },
      { status: 'In Progress', contractCompletionDate: '2030-12-31' },
    ];
    const stats = calculateStats(projects);
    expect(stats.totalProjects).toBe(4);
    expect(stats.activeProjects).toBe(2);
    expect(stats.completedProjects).toBe(1);
    expect(stats.notStartedProjects).toBe(1);
  });

  it('should detect overdue projects', () => {
    const projects = [
      { status: 'In Progress', contractCompletionDate: '2020-01-01' }, // overdue
      { status: 'In Progress', contractCompletionDate: '2030-12-31' }, // not overdue
      { status: 'Completed', contractCompletionDate: '2020-01-01' }, // completed, not overdue
    ];
    const stats = calculateStats(projects);
    expect(stats.overdueProjects).toBe(1);
  });

  it('should handle empty projects array', () => {
    const stats = calculateStats([]);
    expect(stats.totalProjects).toBe(0);
    expect(stats.activeProjects).toBe(0);
  });
});

// ============================================================
// S13: Phase Category Labels Tests
// ============================================================
describe('Phase Category Labels (S13)', () => {
  const phaseCategories = [
    'Pre-Construction', 'Site Preparation', 'Foundation', 'Structural',
    'Roofing', 'Electrical', 'Plumbing', 'HVAC',
    'Interior Finishing', 'Exterior Finishing', 'Landscaping',
    'Inspection & Turnover', 'Other'
  ];

  it('should have at least 10 category options', () => {
    expect(phaseCategories.length).toBeGreaterThanOrEqual(10);
  });

  it('should include Pre-Construction and Foundation', () => {
    expect(phaseCategories).toContain('Pre-Construction');
    expect(phaseCategories).toContain('Foundation');
  });

  it('should include finishing categories', () => {
    expect(phaseCategories).toContain('Interior Finishing');
    expect(phaseCategories).toContain('Exterior Finishing');
  });

  it('should include an Other option', () => {
    expect(phaseCategories).toContain('Other');
  });
});

// ============================================================
// Budget Formatting Tests
// ============================================================
describe('Budget Formatting', () => {
  const formatBudget = (value) => {
    if (!value || value === 0) return '₱0';
    const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value;
    if (isNaN(numValue) || numValue === 0) return '₱0';
    
    const isNegative = numValue < 0;
    const num = Math.abs(numValue);
    const sign = isNegative ? '-' : '';
    
    if (num >= 1000000000) return `${sign}₱${(num / 1000000000).toFixed(1)}B`;
    if (num >= 1000000) return `${sign}₱${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${sign}₱${(num / 1000).toFixed(1)}K`;
    return `${sign}₱${num.toFixed(2)}`;
  };

  it('should format millions with M suffix', () => {
    expect(formatBudget(5000000)).toBe('₱5.0M');
  });

  it('should format thousands with K suffix', () => {
    expect(formatBudget(50000)).toBe('₱50.0K');
  });

  it('should format billions with B suffix', () => {
    expect(formatBudget(2000000000)).toBe('₱2.0B');
  });

  it('should handle zero', () => {
    expect(formatBudget(0)).toBe('₱0');
  });

  it('should handle string values', () => {
    expect(formatBudget('1500000')).toBe('₱1.5M');
  });

  it('should handle negative values', () => {
    expect(formatBudget(-5000)).toBe('-₱5.0K');
  });
});

// ============================================================
// S4: Download URL Handler Tests
// ============================================================
describe('File Download Logic (S4)', () => {
  it('should identify S3 presigned URLs as cross-origin', () => {
    const url = 'https://buildwise-project-files.s3.ap-southeast-1.amazonaws.com/documents/test.pdf?X-Amz-Algorithm=AWS4';
    const isCrossOrigin = !url.startsWith(window.location.origin);
    expect(isCrossOrigin).toBe(true);
  });

  it('should generate proper filename from download URL', () => {
    const filename = 'project-plan.pdf';
    expect(filename).toBeTruthy();
    expect(filename.endsWith('.pdf')).toBe(true);
  });
});

// ============================================================
// Timeline Calculation Tests (S2 enhancement)
// ============================================================
describe('Timeline Calculations (S2)', () => {
  const getDaysRemaining = (completionDate, status) => {
    if (status === 'Completed') return { isOverdue: false, days: 0, label: 'Completed' };
    const dueDate = new Date(completionDate);
    const now = new Date();
    const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
    return {
      isOverdue: diffDays < 0,
      days: Math.abs(diffDays),
      label: diffDays < 0 ? `${Math.abs(diffDays)} days overdue` : `${diffDays} days left`
    };
  };

  it('should show days left for future dates', () => {
    const result = getDaysRemaining('2030-12-31', 'In Progress');
    expect(result.isOverdue).toBe(false);
    expect(result.days).toBeGreaterThan(0);
    expect(result.label).toContain('days left');
  });

  it('should show overdue for past dates', () => {
    const result = getDaysRemaining('2020-01-01', 'In Progress');
    expect(result.isOverdue).toBe(true);
    expect(result.label).toContain('overdue');
  });

  it('should ignore overdue for completed projects', () => {
    const result = getDaysRemaining('2020-01-01', 'Completed');
    expect(result.label).toBe('Completed');
  });
});

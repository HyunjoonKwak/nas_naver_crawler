# Large Page Component Refactoring Plan

> Week 4 Day 16-20: Splitting massive page components into manageable pieces

## Overview

Two massive page components need refactoring:
1. `app/complexes/page.tsx` - **2,325 lines** (단지 목록 페이지)
2. `app/real-price/page.tsx` - **1,878 lines** (실거래가 페이지)

## Problem Analysis

### app/complexes/page.tsx (2,325 lines)

**현재 구조:**
- 40+ useState hooks (state management hell)
- 20+ handler functions mixed in one component
- Multiple concerns: CRUD, crawling, group management, comparison, filtering
- Massive JSX with nested modals and dialogs

**주요 기능 블록:**
1. **Complex List Management** (라인 322-373)
   - fetchComplexes()
   - Filtering, sorting, grouping logic

2. **Add Complex Form** (라인 392-454)
   - handleFetchAndAddComplex()
   - extractComplexNo()
   - Complex info fetching

3. **Favorite Toggle** (라인 455-491)
   - handleToggleFavorite()

4. **Edit Complex** (라인 492-536)
   - handleEditComplex()
   - confirmEditComplex()

5. **Delete Complex** (라인 537-569)
   - handleDeleteComplex()
   - confirmDeleteComplex()

6. **Crawl Operations** (라인 570-753)
   - pollCrawlStatus()
   - handleCrawlComplex()
   - handleCrawlAll()
   - SSE connection for real-time updates

7. **Comparison Mode** (라인 228-321)
   - toggleCompareMode()
   - toggleCompareSelection()
   - startComparison()

8. **View Modes & Filters** (라인 126-220)
   - Card/List view toggle
   - Group filtering
   - Sort/filter logic

**JSX 구조 (라인 854-2325):**
- Header with actions (100+ lines)
- Modals (500+ lines):
  - Add complex form modal
  - Delete confirmation
  - Edit complex modal
  - Crawl all confirmation
  - Compare modal
- Main content:
  - Group sidebar (200+ lines)
  - Complex cards/list (800+ lines)
  - Empty states

## Refactoring Strategy

### Phase 1: Extract Custom Hooks ✅

Extract state and logic into custom hooks:

```typescript
// hooks/useComplexList.ts
export function useComplexList() {
  const [complexes, setComplexes] = useState<ComplexItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComplexes = async () => { ... };
  const refreshComplexes = () => { ... };

  return { complexes, loading, fetchComplexes, refreshComplexes };
}

// hooks/useComplexCrawl.ts
export function useComplexCrawl() {
  const [crawling, setCrawling] = useState<string | null>(null);
  const [crawlProgress, setCrawlProgress] = useState({ ... });

  const handleCrawlComplex = async (complexNo: string) => { ... };
  const pollCrawlStatus = async (crawlId: string) => { ... };

  return { crawling, crawlProgress, handleCrawlComplex };
}

// hooks/useComplexFilters.ts
export function useComplexFilters(complexes: ComplexItem[]) {
  const [filters, setFilters] = useState({ ... });
  const [sortBy, setSortBy] = useState('updatedAt');

  const filteredComplexes = useMemo(() => { ... }, [complexes, filters]);

  return { filteredComplexes, filters, setFilters, sortBy, setSortBy };
}

// hooks/useComplexComparison.ts
export function useComplexComparison() {
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);

  const toggleCompareMode = () => { ... };
  const toggleCompareSelection = (complexNo: string) => { ... };

  return { compareMode, selectedForCompare, toggleCompareMode, toggleCompareSelection };
}
```

### Phase 2: Extract UI Components ✅

Create smaller, focused components:

```typescript
// components/complexes/ComplexAddForm.tsx (150 lines)
interface ComplexAddFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// components/complexes/ComplexCard.tsx (200 lines)
interface ComplexCardProps {
  complex: ComplexItem;
  onCrawl: (complexNo: string) => void;
  onToggleFavorite: (complexNo: string, isFavorite: boolean) => void;
  onDelete: (complexNo: string, complexName: string) => void;
  onEdit: (complexNo: string, complexName: string) => void;
  crawling?: boolean;
  compareMode?: boolean;
  isSelected?: boolean;
  onToggleCompare?: () => void;
}

// components/complexes/ComplexListItem.tsx (150 lines)
// List view version of ComplexCard

// components/complexes/ComplexGroupSidebar.tsx (250 lines)
interface ComplexGroupSidebarProps {
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string | null) => void;
  onRefresh: () => void;
}

// components/complexes/ComplexComparisonModal.tsx (300 lines)
interface ComplexComparisonModalProps {
  isOpen: boolean;
  selectedComplexNos: string[];
  onClose: () => void;
}

// components/complexes/ComplexDeleteDialog.tsx (80 lines)
interface ComplexDeleteDialogProps {
  isOpen: boolean;
  complexName: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

// components/complexes/ComplexEditDialog.tsx (120 lines)
// Similar to delete dialog

// components/complexes/ComplexCrawlAllDialog.tsx (100 lines)
// Confirmation dialog for crawl all

// components/complexes/ComplexPageHeader.tsx (150 lines)
// Top header with search, add button, view toggle, etc.

// components/complexes/ComplexFiltersBar.tsx (100 lines)
// Filter controls (sort, search, etc.)
```

### Phase 3: Final Page Structure ✅

After refactoring, the main page should look like:

```typescript
// app/complexes/page.tsx (400 lines - 83% reduction!)
export default function ComplexesPage() {
  // Custom hooks
  const { complexes, loading, fetchComplexes, refreshComplexes } = useComplexList();
  const { crawling, crawlProgress, handleCrawlComplex, handleCrawlAll } = useComplexCrawl();
  const { filteredComplexes, filters, setFilters, sortBy, setSortBy } = useComplexFilters(complexes);
  const { compareMode, selectedForCompare, toggleCompareMode, toggleCompareSelection } = useComplexComparison();

  // Local state (minimal)
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Dialogs state
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ ... });
  const [editDialog, setEditDialog] = useState({ ... });

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation />
        <MobileNavigation />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ComplexPageHeader
            onAdd={() => setShowAddForm(true)}
            onCrawlAll={handleCrawlAll}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            compareMode={compareMode}
            onToggleCompareMode={toggleCompareMode}
          />

          <div className="flex gap-6">
            <ComplexGroupSidebar
              selectedGroupId={selectedGroupId}
              onSelectGroup={setSelectedGroupId}
              onRefresh={refreshComplexes}
            />

            <div className="flex-1">
              <ComplexFiltersBar
                filters={filters}
                onFiltersChange={setFilters}
                sortBy={sortBy}
                onSortChange={setSortBy}
              />

              {viewMode === 'card' ? (
                <ComplexCardGrid
                  complexes={filteredComplexes}
                  onCrawl={handleCrawlComplex}
                  crawling={crawling}
                  compareMode={compareMode}
                  selectedForCompare={selectedForCompare}
                  onToggleCompare={toggleCompareSelection}
                />
              ) : (
                <ComplexListView
                  complexes={filteredComplexes}
                  onCrawl={handleCrawlComplex}
                  crawling={crawling}
                />
              )}
            </div>
          </div>
        </main>

        {/* Modals */}
        <ComplexAddForm
          isOpen={showAddForm}
          onClose={() => setShowAddForm(false)}
          onSuccess={refreshComplexes}
        />

        <ComplexDeleteDialog
          isOpen={deleteDialog.isOpen}
          complexName={deleteDialog.complexName}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteDialog({ isOpen: false, complexNo: null, complexName: null })}
        />

        <ComplexComparisonModal
          isOpen={showCompareModal}
          selectedComplexNos={selectedForCompare}
          onClose={() => setShowCompareModal(false)}
        />
      </div>
    </AuthGuard>
  );
}
```

## Migration Checklist

### Phase 1: Custom Hooks
- [ ] `hooks/useComplexList.ts` - List management
- [ ] `hooks/useComplexCrawl.ts` - Crawl operations with SSE
- [ ] `hooks/useComplexFilters.ts` - Filtering & sorting
- [ ] `hooks/useComplexComparison.ts` - Comparison mode
- [ ] `hooks/useComplexActions.ts` - CRUD operations (add/edit/delete/favorite)

### Phase 2: UI Components
- [ ] `components/complexes/ComplexPageHeader.tsx`
- [ ] `components/complexes/ComplexFiltersBar.tsx`
- [ ] `components/complexes/ComplexGroupSidebar.tsx`
- [ ] `components/complexes/ComplexCard.tsx`
- [ ] `components/complexes/ComplexListItem.tsx`
- [ ] `components/complexes/ComplexCardGrid.tsx`
- [ ] `components/complexes/ComplexListView.tsx`
- [ ] `components/complexes/ComplexAddForm.tsx`
- [ ] `components/complexes/ComplexEditDialog.tsx`
- [ ] `components/complexes/ComplexDeleteDialog.tsx`
- [ ] `components/complexes/ComplexCrawlAllDialog.tsx`
- [ ] `components/complexes/ComplexComparisonModal.tsx`

### Phase 3: Main Page Refactoring
- [ ] Refactor `app/complexes/page.tsx` to use hooks and components
- [ ] Remove all extracted logic from main page
- [ ] Test all functionality

### Phase 4: Real-Price Page (Similar Approach)
- [ ] Analyze `app/real-price/page.tsx`
- [ ] Extract hooks for real-price logic
- [ ] Extract UI components
- [ ] Refactor main page

## Expected Results

**Before:**
- `app/complexes/page.tsx`: 2,325 lines
- `app/real-price/page.tsx`: 1,878 lines
- **Total**: 4,203 lines in 2 files

**After:**
- `app/complexes/page.tsx`: ~400 lines (83% reduction)
- `app/real-price/page.tsx`: ~350 lines (81% reduction)
- 5 custom hooks: ~800 lines (reusable)
- 12+ UI components: ~2,000 lines (reusable)
- **Total**: ~3,550 lines across 19 files

**Benefits:**
- ✅ Each component has single responsibility
- ✅ Hooks are reusable across pages
- ✅ UI components can be tested in isolation
- ✅ Much easier to maintain and debug
- ✅ Better code organization
- ✅ Improved performance (smaller bundle chunks)

## Notes

- Use fetch-client.ts for all API calls
- Use repository pattern where applicable
- Follow existing component patterns (LoadingSpinner, EmptyState, etc.)
- Maintain all existing functionality
- Ensure type safety throughout

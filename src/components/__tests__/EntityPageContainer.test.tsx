import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/utils', () => ({ cn: (...c: any[]) => c.filter(Boolean).join(' ') }));
vi.mock('framer-motion', () => ({
  motion: { div: ({ children, ...p }: any) => <div {...p}>{children}</div> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/components/PageTitle', () => ({
  PageTitle: ({ title }: any) => <title>{title}</title>,
}));

vi.mock('@/components/layout', () => ({
  PageLayout: ({ children, title }: any) => (
    <div data-testid="page-layout">
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock('@/components/ui/data-table-toolbar', () => ({
  DataTableToolbar: ({ search, onSearchChange, onAdd }: any) => (
    <div data-testid="toolbar">
      <input
        data-testid="search-input"
        value={search}
        onChange={e => onSearchChange(e.target.value)}
      />
      {onAdd && <button onClick={onAdd}>Add</button>}
    </div>
  ),
}));

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: any) => <table>{children}</table>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
  TableHead: ({ children }: any) => <th>{children}</th>,
}));

vi.mock('@/components/ui/empty-state', () => ({
  EmptyList: ({ entityName }: any) => <div data-testid="empty-list">No {entityName}</div>,
  EmptySearch: ({ search }: any) => <div data-testid="empty-search">No results for {search}</div>,
}));

vi.mock('@/components/ui/spinner', () => ({
  Spinner: () => <div data-testid="spinner" />,
}));

vi.mock('@/components/ui/sync-error-state', () => ({
  SyncErrorState: ({ entityName }: any) => (
    <div data-testid="sync-error">Error loading {entityName}</div>
  ),
}));

vi.mock('@/components/ui/module-skeleton', () => ({
  TableSkeleton: () => <div data-testid="table-skeleton" />,
}));

vi.mock('@/components/ui/data-table-pagination', () => ({
  DataTablePagination: ({ currentPage, totalPages }: any) => (
    <div data-testid="pagination">Page {currentPage} of {totalPages}</div>
  ),
}));

vi.mock('lucide-react', () => ({
  FilterX: () => <span />,
  RefreshCw: () => <span />,
}));

import { EntityPageContainer } from '../layout/EntityPageContainer';

const DEFAULT_PROPS = {
  title: 'Test Entity',
  description: 'Test description',
  pageTitle: 'Entities',
  pageDescription: 'Entity page',
  icon: <span />,
  gradient: 'from-blue-500',
  items: [] as { id: string }[],
  total: 0,
  isLoading: false,
  isFetching: false,
  error: null,
  page: 1,
  pageSize: 10,
  search: '',
  onPageChange: vi.fn(),
  onSearchChange: vi.fn(),
  onRefetch: vi.fn(),
  entityName: 'colaborador',
  columns: [{ header: 'Nome' }, { header: 'Status' }],
  renderRow: (item: any) => <tr key={item.id}><td>{item.id}</td></tr>,
};

describe('EntityPageContainer', () => {
  it('renders page title and description', () => {
    render(<EntityPageContainer {...DEFAULT_PROPS} />);
    expect(screen.getByTestId('page-layout')).toBeTruthy();
    expect(screen.getByText('Test Entity')).toBeTruthy();
  });

  it('shows TableSkeleton when isLoading=true', () => {
    render(<EntityPageContainer {...DEFAULT_PROPS} isLoading total={0} />);
    expect(screen.getByTestId('table-skeleton')).toBeTruthy();
  });

  it('shows SyncErrorState when error is present', () => {
    render(<EntityPageContainer {...DEFAULT_PROPS} error={new Error('fail')} />);
    expect(screen.getByTestId('sync-error')).toBeTruthy();
    expect(screen.getByText(/Error loading colaboradors/)).toBeTruthy();
  });

  it('shows EmptyList when total=0 and no search', () => {
    render(<EntityPageContainer {...DEFAULT_PROPS} total={0} search="" />);
    expect(screen.getByTestId('empty-list')).toBeTruthy();
    expect(screen.getByText(/No colaborador/)).toBeTruthy();
  });

  it('shows EmptySearch when total=0 and search is set', () => {
    render(<EntityPageContainer {...DEFAULT_PROPS} total={0} search="alice" />);
    expect(screen.getByTestId('empty-search')).toBeTruthy();
    expect(screen.getByText(/alice/)).toBeTruthy();
  });

  it('renders table with rows when items provided', () => {
    const items = [{ id: 'col-1' }, { id: 'col-2' }];
    render(
      <EntityPageContainer
        {...DEFAULT_PROPS}
        items={items}
        total={2}
        renderRow={item => <tr key={item.id}><td>{item.id}</td></tr>}
      />
    );
    expect(screen.getByText('col-1')).toBeTruthy();
    expect(screen.getByText('col-2')).toBeTruthy();
  });

  it('renders column headers when items provided', () => {
    const items = [{ id: 'x' }];
    render(
      <EntityPageContainer
        {...DEFAULT_PROPS}
        items={items}
        total={1}
        columns={[{ header: 'Nome' }, { header: 'Status' }]}
        renderRow={item => <tr key={item.id}><td>{item.id}</td></tr>}
      />
    );
    expect(screen.getByText('Nome')).toBeTruthy();
    expect(screen.getByText('Status')).toBeTruthy();
  });

  it('renders pagination when items provided', () => {
    const items = [{ id: 'x' }];
    render(
      <EntityPageContainer
        {...DEFAULT_PROPS}
        items={items}
        total={20}
        page={1}
        pageSize={10}
        renderRow={item => <tr key={item.id}><td>{item.id}</td></tr>}
      />
    );
    expect(screen.getByTestId('pagination')).toBeTruthy();
    expect(screen.getByText('Page 1 of 2')).toBeTruthy();
  });

  it('renders DataTableToolbar with search', () => {
    render(<EntityPageContainer {...DEFAULT_PROPS} search="test" />);
    const searchInput = screen.getByTestId('search-input') as HTMLInputElement;
    expect(searchInput.value).toBe('test');
  });

  it('renders custom stats when provided', () => {
    render(
      <EntityPageContainer
        {...DEFAULT_PROPS}
        stats={<div data-testid="stats">Stats Widget</div>}
      />
    );
    expect(screen.getByTestId('stats')).toBeTruthy();
  });

  it('renders custom filters when provided', () => {
    render(
      <EntityPageContainer
        {...DEFAULT_PROPS}
        customFilters={<div data-testid="custom-filters">Custom Filters</div>}
      />
    );
    expect(screen.getByTestId('custom-filters')).toBeTruthy();
  });

  it('shows spinner when isFetching and items present', () => {
    const items = [{ id: 'x' }];
    render(
      <EntityPageContainer
        {...DEFAULT_PROPS}
        items={items}
        total={1}
        isFetching
        isLoading={false}
        renderRow={item => <tr key={item.id}><td>{item.id}</td></tr>}
      />
    );
    expect(screen.getByTestId('spinner')).toBeTruthy();
  });
});

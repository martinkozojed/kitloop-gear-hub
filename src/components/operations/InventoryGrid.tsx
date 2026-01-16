
import React, { useState, useMemo } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    getFacetedUniqueValues,
    getFacetedRowModel,
    ColumnDef,
    flexRender,
    SortingState,
    ColumnFiltersState,
    VisibilityState,
} from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, MoreHorizontal, SlidersHorizontal, ArrowUpDown, Wrench, CircleCheck, CircleAlert, CircleX, Home } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import { DataTableFacetedFilter } from '@/components/ui/data-table-faceted-filter';
import { LogMaintenanceModal } from './LogMaintenanceModal';
import { useTranslation } from 'react-i18next';

// Derived Type for the Join View
export type InventoryAsset = {
    id: string;
    asset_tag: string;
    status: Database['public']['Enums']['asset_status_type'];
    condition_score: number | null;
    location: string | null;
    product: {
        name: string;
        image_url: string | null;
        category: string;
    };
    variant: {
        name: string;
        sku: string | null;
        product_id?: string;
    };
};

interface InventoryGridProps {
    data: InventoryAsset[];
    loading: boolean;
    onRefresh: () => void;
    onEdit: (asset: InventoryAsset) => void;
    onDelete: (ids: string[]) => void;
    onStatusChange: (ids: string[], status: string) => void;
    canDelete?: boolean;
}

export function InventoryGrid({ data, loading, onRefresh, onEdit, onDelete, onStatusChange, canDelete = true }: InventoryGridProps) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = useState({});
    const { t } = useTranslation();

    // Maintenance Modal State
    const [showMaintenance, setShowMaintenance] = useState(false);
    const [maintenanceIds, setMaintenanceIds] = useState<string[]>([]);

    const columns = useMemo<ColumnDef<InventoryAsset>[]>(
        () => [
            {
                id: 'select',
                header: ({ table }) => (
                    <Checkbox
                        checked={table.getIsAllPageRowsSelected()}
                        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                        aria-label="Select all"
                    />
                ),
                cell: ({ row }) => (
                    <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(value) => row.toggleSelected(!!value)}
                        aria-label="Select row"
                    />
                ),
                enableSorting: false,
                enableHiding: false,
            },
            {
                accessorKey: 'asset_tag',
                header: ({ column }) => (
                    <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                        {t('provider.inventory.grid.columns.tag')}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                cell: ({ row }) => <div className="font-mono font-medium">{row.getValue('asset_tag')}</div>,
            },
            {
                id: 'product_name',
                accessorFn: (row) => row.product.name,
                header: t('provider.inventory.grid.columns.product'),
                cell: ({ row }) => (
                    <div className="flex items-center gap-2">
                        {row.original.product.image_url && (
                            <img
                                src={row.original.product.image_url}
                                alt={row.original.product.name}
                                className="w-8 h-8 rounded object-cover border"
                            />
                        )}
                        <div className="flex flex-col">
                            <span className="font-medium">{row.original.product.name}</span>
                            <span className="text-xs text-muted-foreground">{row.original.variant.name}</span>
                        </div>
                    </div>
                ),
            },
            {
                id: 'category',
                accessorFn: (row) => row.product.category,
                header: t('provider.inventory.grid.columns.category'),
                cell: ({ row }) => <Badge variant="secondary" className="capitalize">{row.original.product.category}</Badge>,
                filterFn: (row, id, value) => {
                    return value.includes(row.original.product.category);
                },
            },
            {
                accessorKey: 'status',
                header: t('provider.inventory.grid.columns.status'),
                filterFn: (row, id, value) => {
                    return value.includes(row.getValue(id));
                },
                cell: ({ row }) => {
                    const status = row.getValue('status') as string;
                    const colorStyles = {
                        available: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                        active: 'bg-blue-50 text-blue-700 border-blue-200',
                        maintenance: 'bg-amber-50 text-amber-700 border-amber-200',
                        lost: 'bg-rose-50 text-rose-700 border-rose-200',
                        retired: 'bg-slate-100 text-slate-700 border-slate-200',
                        reserved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                        quarantine: 'bg-orange-50 text-orange-700 border-orange-200',
                    };

                    return (
                        <Badge variant="outline" className={colorStyles[status as keyof typeof colorStyles] || ''}>
                            {t(`provider.inventory.grid.statuses.${status as keyof typeof colorStyles}`, status)}
                        </Badge>
                    );
                },
            },
            {
                accessorKey: 'location',
                header: t('provider.inventory.grid.columns.location'),
            },
            {
                accessorKey: 'condition_score',
                header: t('provider.inventory.grid.columns.health'),
                cell: ({ row }) => {
                    const score = row.getValue('condition_score') as number;
                    if (!score) return <span className="text-muted-foreground text-xs">-</span>;
                    return (
                        <div className={`text-xs font-bold ${score < 70 ? 'text-red-500' : 'text-green-600'}`}>
                            {score}%
                        </div>
                    );
                },
            },
            {
                id: 'actions',
                cell: ({ row }) => {
                    const asset = row.original;
                    return (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">{t('provider.inventory.grid.actions.openMenu')}</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>{t('provider.inventory.grid.actions.label')}</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(asset.asset_tag)}>
                                    {t('provider.inventory.grid.actions.copyTag')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => onEdit(asset)}>{t('provider.inventory.grid.actions.edit')}</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                    setMaintenanceIds([asset.id]);
                                    setShowMaintenance(true);
                                }}>
                                    <Wrench className="w-4 h-4 mr-2" />
                                    {t('provider.inventory.grid.actions.logMaintenance')}
                                </DropdownMenuItem>
                                {canDelete && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => onDelete([asset.id])} className="text-red-600">
                                            {t('provider.inventory.grid.delete')}
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    );
                },
            },
        ],
        [onDelete, onEdit, canDelete, t]
    );

    const table = useReactTable({
        data,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getFacetedRowModel: getFacetedRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
        },
    });

    const selectedIds = Object.keys(rowSelection).map(index => data[parseInt(index)]?.id).filter(Boolean);

    // Extract unique categories for filter
    const categories = Array.from(new Set(data.map(item => item.product.category))).map(cat => ({
        label: cat.charAt(0).toUpperCase() + cat.slice(1),
        value: cat
    }));

    const statuses = [
        { label: t('provider.inventory.grid.statuses.available'), value: 'available', icon: CircleCheck },
        { label: t('provider.inventory.grid.statuses.active'), value: 'active', icon: Home },
        { label: t('provider.inventory.grid.statuses.maintenance'), value: 'maintenance', icon: Wrench },
        { label: t('provider.inventory.grid.statuses.reserved'), value: 'reserved', icon: CircleAlert },
        { label: t('provider.inventory.grid.statuses.retired'), value: 'retired', icon: CircleX },
    ];

    const getColumnLabel = (columnId: string) => {
        const map: Record<string, string> = {
            asset_tag: t('provider.inventory.grid.columns.tag'),
            product_name: t('provider.inventory.grid.columns.product'),
            category: t('provider.inventory.grid.columns.category'),
            status: t('provider.inventory.grid.columns.status'),
            location: t('provider.inventory.grid.columns.location'),
            condition_score: t('provider.inventory.grid.columns.health'),
            actions: t('provider.inventory.grid.actions.label'),
        };
        return map[columnId] || columnId;
    };

    return (
        <div className="w-full space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between py-4">
                {/* Search & Filters */}
                <div className="flex flex-1 items-center gap-2">
                    <Input
                        placeholder={t('provider.inventory.grid.searchPlaceholder')}
                        value={(table.getColumn('product_name')?.getFilterValue() as string) ?? ''}
                        onChange={(event) =>
                            table.getColumn('product_name')?.setFilterValue(event.target.value)
                        }
                        className="max-w-[250px] bg-white h-8"
                    />

                    {table.getColumn('status') && (
                        <DataTableFacetedFilter
                            column={table.getColumn('status')}
                            title={t('provider.inventory.grid.status')}
                            options={statuses}
                        />
                    )}

                    {table.getColumn('category') && categories.length > 0 && (
                        <DataTableFacetedFilter
                            column={table.getColumn('category')}
                            title={t('provider.inventory.grid.category')}
                            options={categories}
                        />
                    )}

                    {/* Clear Filters */}
                    {columnFilters.length > 0 && (
                        <Button
                            variant="ghost"
                            onClick={() => table.resetColumnFilters()}
                            className="h-8 px-2 lg:px-3"
                        >
                            {t('provider.inventory.grid.reset')}
                            <CircleX className="ml-2 h-4 w-4" />
                        </Button>
                    )}
                </div>

                {/* View Options */}
                <div className="flex gap-2">
                    {selectedIds.length > 0 ? (
                        <div className="flex items-center gap-2 mr-4 bg-primary/10 p-1 rounded-md px-3 animate-in fade-in">
                            <span className="text-sm font-medium text-primary">
                                {t('provider.inventory.grid.selected', { count: selectedIds.length })}
                            </span>
                            <div className="h-4 w-px bg-primary/20 mx-2" />

                            <Button
                                size="sm"
                                variant="secondary"
                                className="h-7"
                                onClick={() => {
                                    setMaintenanceIds(selectedIds);
                                    setShowMaintenance(true);
                                }}
                            >
                                <Wrench className="w-3.5 h-3.5 mr-2" />
                                {t('provider.inventory.grid.maintenance')}
                            </Button>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="outline" className="h-7 bg-white">{t('provider.inventory.grid.status')}</Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onClick={() => onStatusChange(selectedIds, 'available')}>
                                        {t('provider.inventory.grid.markAs.available')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onStatusChange(selectedIds, 'maintenance')}>
                                        {t('provider.inventory.grid.markAs.maintenance')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onStatusChange(selectedIds, 'retired')}>
                                        {t('provider.inventory.grid.markAs.retired')}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {canDelete && (
                                <Button size="sm" variant="destructive" className="h-7" onClick={() => onDelete(selectedIds)}>
                                    {t('provider.inventory.grid.delete')}
                                </Button>
                            )}
                        </div>
                    ) : (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="ml-auto h-8 bg-white">
                                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                                    {t('provider.inventory.grid.view')}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {table
                                    .getAllColumns()
                                    .filter((column) => column.getCanHide())
                                    .map((column) => {
                                        return (
                                            <DropdownMenuCheckboxItem
                                                key={column.id}
                                                className="capitalize"
                                                checked={column.getIsVisible()}
                                                onCheckedChange={(value) => column.toggleVisibility(!!value)}
                                            >
                                                {getColumnLabel(column.id)}
                                            </DropdownMenuCheckboxItem>
                                        );
                                    })}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>

            <div className="rounded-md border bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center text-muted-foreground"
                                >
                                    {loading ? t('provider.inventory.grid.loading') : t('provider.inventory.grid.empty')}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-between py-4">
                <div className="text-xs text-muted-foreground">
                    {t('provider.inventory.grid.showing', {
                        visible: table.getFilteredRowModel().rows.length,
                        total: data.length
                    })}
                </div>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        {t('provider.inventory.grid.previous')}
                    </Button>
                    <div className="text-sm font-medium">
                        {t('provider.inventory.grid.page', {
                            page: table.getState().pagination.pageIndex + 1,
                            pages: table.getPageCount()
                        })}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        {t('provider.inventory.grid.next')}
                    </Button>
                </div>
            </div>

            <LogMaintenanceModal
                open={showMaintenance}
                onOpenChange={setShowMaintenance}
                assetIds={maintenanceIds}
                onSuccess={() => {
                    setRowSelection({});
                    onRefresh();
                }}
            />
        </div>
    );
}


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
                        Tag
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                cell: ({ row }) => <div className="font-mono font-medium">{row.getValue('asset_tag')}</div>,
            },
            {
                id: 'product_name',
                accessorFn: (row) => row.product.name,
                header: 'Product',
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
                header: 'Category',
                cell: ({ row }) => <Badge variant="secondary" className="capitalize">{row.original.product.category}</Badge>,
                filterFn: (row, id, value) => {
                    return value.includes(row.original.product.category);
                },
            },
            {
                accessorKey: 'status',
                header: 'Status',
                filterFn: (row, id, value) => {
                    return value.includes(row.getValue(id));
                },
                cell: ({ row }) => {
                    const status = row.getValue('status') as string;
                    const colorStyles = {
                        available: 'bg-green-50 text-green-700 border-green-200',
                        active: 'bg-blue-50 text-blue-700 border-blue-200',
                        maintenance: 'bg-amber-50 text-amber-700 border-amber-200',
                        lost: 'bg-red-50 text-red-700 border-red-200',
                        retired: 'bg-gray-100 text-gray-700 border-gray-200',
                        reserved: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                        quarantine: 'bg-purple-50 text-purple-700 border-purple-200',
                    };

                    return (
                        <Badge variant="outline" className={colorStyles[status as keyof typeof colorStyles] || ''}>
                            {status}
                        </Badge>
                    );
                },
            },
            {
                accessorKey: 'location',
                header: 'Location',
            },
            {
                accessorKey: 'condition_score',
                header: 'Health',
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
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(asset.asset_tag)}>
                                    Copy Asset Tag
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => onEdit(asset)}>Edit Details</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                    setMaintenanceIds([asset.id]);
                                    setShowMaintenance(true);
                                }}>
                                    <Wrench className="w-4 h-4 mr-2" />
                                    Log Maintenance
                                </DropdownMenuItem>
                                {canDelete && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => onDelete([asset.id])} className="text-red-600">
                                            Delete
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    );
                },
            },
        ],
        [onDelete, onEdit]
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
        { label: 'Available', value: 'available', icon: CircleCheck },
        { label: 'Active', value: 'active', icon: Home },
        { label: 'Maintenance', value: 'maintenance', icon: Wrench },
        { label: 'Reserved', value: 'reserved', icon: CircleAlert },
        { label: 'Retired', value: 'retired', icon: CircleX },
    ];

    return (
        <div className="w-full space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between py-4">
                {/* Search & Filters */}
                <div className="flex flex-1 items-center gap-2">
                    <Input
                        placeholder="Search assets..."
                        value={(table.getColumn('product_name')?.getFilterValue() as string) ?? ''}
                        onChange={(event) =>
                            table.getColumn('product_name')?.setFilterValue(event.target.value)
                        }
                        className="max-w-[250px] bg-white h-8"
                    />

                    {table.getColumn('status') && (
                        <DataTableFacetedFilter
                            column={table.getColumn('status')}
                            title="Status"
                            options={statuses}
                        />
                    )}

                    {table.getColumn('category') && categories.length > 0 && (
                        <DataTableFacetedFilter
                            column={table.getColumn('category')}
                            title="Category"
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
                            Reset
                            <CircleX className="ml-2 h-4 w-4" />
                        </Button>
                    )}
                </div>

                {/* View Options */}
                <div className="flex gap-2">
                    {selectedIds.length > 0 ? (
                        <div className="flex items-center gap-2 mr-4 bg-primary/10 p-1 rounded-md px-3 animate-in fade-in">
                            <span className="text-sm font-medium text-primary">{selectedIds.length} selected</span>
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
                                Maintenance
                            </Button>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="outline" className="h-7 bg-white">Status</Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    {['available', 'maintenance', 'retired'].map(s => (
                                        <DropdownMenuItem key={s} onClick={() => onStatusChange(selectedIds, s)}>
                                            Mark as {s}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {canDelete && (
                                <Button size="sm" variant="destructive" className="h-7" onClick={() => onDelete(selectedIds)}>
                                    Delete
                                </Button>
                            )}
                        </div>
                    ) : (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="ml-auto h-8 bg-white">
                                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                                    View
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
                                                {column.id}
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
                                    {loading ? "Loading inventory..." : "No assets found."}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-between py-4">
                <div className="text-xs text-muted-foreground">
                    Showing {table.getFilteredRowModel().rows.length} of {data.length} items
                </div>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        Previous
                    </Button>
                    <div className="text-sm font-medium">
                        Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        Next
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

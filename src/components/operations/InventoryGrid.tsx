
import React, { useState, useMemo } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
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
import { ChevronDown, MoreHorizontal, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

// Derived Type for the Join View
// standard Supabase approach: create a View or just select with join in query
// BUT for Typescript, we define the shape we expect from the joined query
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

export function InventoryGrid({ data, loading, onEdit, onDelete, onStatusChange, canDelete = true }: InventoryGridProps) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = useState({});

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
                accessorKey: 'status',
                header: 'Status',
                cell: ({ row }) => {
                    const status = row.getValue('status') as string;
                    const colorStyles = {
                        available: 'bg-green-100 text-green-700 border-green-200',
                        active: 'bg-blue-100 text-blue-700 border-blue-200',
                        maintenance: 'bg-amber-100 text-amber-700 border-amber-200',
                        lost: 'bg-red-100 text-red-700 border-red-200',
                        retired: 'bg-gray-100 text-gray-700 border-gray-200',
                        reserved: 'bg-indigo-100 text-indigo-700 border-indigo-200',
                        quarantine: 'bg-purple-100 text-purple-700 border-purple-200',
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
                                <DropdownMenuItem onClick={() => onStatusChange([asset.id], 'maintenance')}>
                                    Mark for Maintenance
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
        [onDelete, onEdit, onStatusChange]
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

    return (
        <div className="w-full space-y-4">
            <div className="flex items-center justify-between py-4">
                {/* Search Filter */}
                <Input
                    placeholder="Filter tags or products..."
                    value={(table.getColumn('product_name')?.getFilterValue() as string) ?? ''}
                    onChange={(event) =>
                        table.getColumn('product_name')?.setFilterValue(event.target.value)
                    }
                    className="max-w-sm"
                />

                {/* View Options */}
                <div className="flex gap-2">
                    {selectedIds.length > 0 && (
                        <div className="flex items-center gap-2 mr-4 bg-muted/50 p-1 rounded-md px-3 animate-in fade-in">
                            <span className="text-sm font-medium">{selectedIds.length} selected</span>
                            <div className="h-4 w-px bg-border mx-2" />
                            {canDelete && (
                                <Button size="sm" variant="destructive" onClick={() => onDelete(selectedIds)}>
                                    Delete
                                </Button>
                            )}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="outline">Set Status</Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    {['available', 'maintenance', 'retired'].map(s => (
                                        <DropdownMenuItem key={s} onClick={() => onStatusChange(selectedIds, s)}>
                                            Mark as {s}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="ml-auto">
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
                </div>
            </div>

            <div className="rounded-md border bg-white shadow-sm">
                <Table>
                    <TableHeader>
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

            {/* Pagination Controls could go here */}
            <div className="flex items-center justify-end space-x-2 py-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                >
                    Previous
                </Button>
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
    );
}

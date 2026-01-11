import { Card } from './card';
import { Skeleton } from './skeleton';

/**
 * Loading skeleton for full page layouts
 * Used in dashboard and other main pages
 */
export const PageLoadingSkeleton = () => (
  <div className="space-y-6 animate-fade-in">
    {/* Header */}
    <div className="flex justify-between items-end">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-10 w-40" />
    </div>
    
    {/* KPI Strip */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1,2,3].map(i => (
        <Card key={i} className="p-6">
          <Skeleton className="h-4 w-20 mb-3" />
          <Skeleton className="h-8 w-24 mb-2" />
          <Skeleton className="h-3 w-32" />
        </Card>
      ))}
    </div>
    
    {/* Main Content Area */}
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <Card className="lg:col-span-8 xl:col-span-9 p-6 min-h-[600px]">
        <Skeleton className="h-6 w-32 mb-6" />
        <div className="space-y-4">
          {[1,2,3,4,5].map(i => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </Card>
      
      <div className="lg:col-span-4 xl:col-span-3 space-y-4">
        <Card className="p-4">
          <Skeleton className="h-5 w-24 mb-4" />
          <Skeleton className="h-16 w-full" />
        </Card>
        <Card className="p-4">
          <Skeleton className="h-5 w-24 mb-4" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </Card>
      </div>
    </div>
  </div>
);

/**
 * Loading skeleton for table lists
 * @param rows Number of skeleton rows to show (default: 5)
 */
export const TableLoadingSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-3">
    {Array(rows).fill(0).map((_, i) => (
      <Skeleton key={i} className="h-16 w-full rounded-lg" />
    ))}
  </div>
);

/**
 * Loading skeleton for card content
 */
export const CardLoadingSkeleton = () => (
  <Card className="p-6">
    <Skeleton className="h-6 w-32 mb-4" />
    <Skeleton className="h-4 w-full mb-3" />
    <Skeleton className="h-4 w-3/4 mb-3" />
    <Skeleton className="h-4 w-2/3" />
  </Card>
);

/**
 * Loading skeleton for grid items
 * @param count Number of grid items (default: 6)
 */
export const GridLoadingSkeleton = ({ count = 6 }: { count?: number }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array(count).fill(0).map((_, i) => (
      <Card key={i} className="p-4">
        <Skeleton className="h-48 w-full mb-4 rounded" />
        <Skeleton className="h-5 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2" />
      </Card>
    ))}
  </div>
);

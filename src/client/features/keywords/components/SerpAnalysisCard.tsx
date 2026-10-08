import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { ExportToSheetsButton } from "@/client/components/table/ExportToSheetsButton";
import type { SerpResultItem } from "@/types/keywords";

export function SerpAnalysisCard({
  items,
  keyword,
  loading,
  error,
  onRetry,
  page,
  pageSize,
  onPageChange,
}: {
  items: SerpResultItem[];
  keyword?: string | null;
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
}) {
  const totalPages = Math.ceil(items.length / pageSize);
  const pageItems = items.slice(page * pageSize, (page + 1) * pageSize);
  const topThree = items.slice(0, 3);
  const ratedTopThree = topThree.filter(
    (item): item is SerpResultItem & { ahrefsDr: number } =>
      item.ahrefsDr !== null,
  );
  const averageTopThreeDr =
    ratedTopThree.length > 0
      ? Math.round(
          ratedTopThree.reduce((total, item) => total + item.ahrefsDr, 0) /
            ratedTopThree.length,
        )
      : null;

  if (loading) return <SerpAnalysisLoadingState />;
  if (error) {
    return (
      <div className="rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error space-y-2">
        <p>{error}</p>
        {onRetry ? (
          <button className="btn btn-xs" onClick={onRetry}>
            Retry
          </button>
        ) : null}
      </div>
    );
  }
  if (items.length === 0) return <SerpAnalysisEmptyState keyword={keyword} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-base-content/50">
          <span>{items.length} organic results</span>
          <span title="Ahrefs Domain Rating for the first three organic domains">
            Top 3 Ahrefs DR: {averageTopThreeDr ?? "—"}
          </span>
        </div>
        <ExportToSheetsButton
          headers={["Rank", "Title", "URL", "Domain", "Ahrefs DR"]}
          rows={items.map((item) => [
            item.rank,
            item.title ?? "",
            item.url,
            item.domain,
            item.ahrefsDr ?? "",
          ])}
          feature="serp_analysis"
        />
      </div>
      <SerpAnalysisTable items={pageItems} />
      <SerpAnalysisPagination
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
}

function SerpAnalysisTable({ items }: { items: SerpResultItem[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="table table-xs w-full">
        <thead>
          <tr className="text-xs text-base-content/60">
            <th className="w-8">#</th>
            <th>Page</th>
            <th className="w-16 text-right" title="Ahrefs Domain Rating">
              DR
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={`${item.rank}-${item.url}`}
              className="hover:bg-base-200/50"
            >
              <td className="font-mono text-base-content/50 text-xs">
                {item.rank}
              </td>
              <td className="min-w-0 max-w-0">
                <div className="flex flex-col gap-0.5">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline truncate flex items-center gap-1"
                    title={item.title}
                  >
                    {item.title || item.url}
                    <ExternalLink className="size-3 shrink-0 opacity-40" />
                  </a>
                  <span className="text-xs text-base-content/40 truncate">
                    {item.domain}
                  </span>
                </div>
              </td>
              <td className="text-right font-mono text-xs text-base-content/60">
                {item.ahrefsDr ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SerpAnalysisPagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between mt-3 pt-3 border-t border-base-200">
      <span className="text-xs text-base-content/50">
        Page {page + 1} of {totalPages}
      </span>
      <div className="flex gap-1">
        <button
          className="btn btn-ghost btn-xs"
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-3.5" />
          Prev
        </button>
        <button
          className="btn btn-ghost btn-xs"
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function SerpAnalysisLoadingState() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="h-8 rounded bg-base-200 animate-pulse"
          style={{ animationDelay: `${index * 50}ms` }}
        />
      ))}
    </div>
  );
}

function SerpAnalysisEmptyState({ keyword }: { keyword?: string | null }) {
  return (
    <div className="text-sm text-base-content/50 text-center py-8">
      <p>No SERP details available for this keyword yet.</p>
      {keyword ? (
        <p className="mt-1">Try clicking another keyword to load data.</p>
      ) : null}
    </div>
  );
}

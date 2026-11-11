import { TBudgetSummary } from "@/types/api";

const gbp = (n: number | null | undefined) =>
  `£${Number(n ?? 0).toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

/** Budget used vs remaining, and what the customer will pay. */
const BudgetBar = ({ summary, priceBand }: { summary: TBudgetSummary; priceBand?: number | null }) => {
  if (!summary) return null;
  const budget = Number(summary.budget ?? 0);
  const used = Number(summary.total_in_budget ?? 0);
  const pct = budget > 0 ? Math.min(100, Math.round((used / budget) * 100)) : 0;
  const over = budget > 0 && used > budget;

  return (
    <div className="bg-white rounded-[11px] shadow-sm p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">Budget</p>
          <p className="text-2xl font-bold">{summary.budget === null ? "Not set" : gbp(budget)}</p>
        </div>
        {priceBand !== undefined && (
          <div>
            <p className="text-sm text-gray-500">Price band</p>
            <p className="text-2xl font-bold">{priceBand === null ? "Not set" : `Grade ${priceBand}`}</p>
          </div>
        )}
        <div className="text-right">
          <p className="text-sm text-gray-500">{over ? "Over budget by" : "Remaining"}</p>
          <p className={`text-2xl font-bold ${over ? "text-red-600" : "text-[#027A48]"}`}>
            {gbp(Math.abs(budget - used))}
          </p>
        </div>
      </div>
      <div
        className="mt-3 h-3 rounded-full bg-gray-200 overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Budget used"
      >
        <div className={`h-full ${over ? "bg-red-500" : "bg-[#6D20C7]"}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <span>
          Included in budget: <b>{gbp(used)}</b>
        </span>
        <span>
          Extra cost items: <b>{gbp(summary.total_out_of_budget)}</b>
        </span>
        <span className={Number(summary.customer_to_pay) > 0 ? "text-[#6D20C7]" : ""}>
          You pay: <b>{gbp(summary.customer_to_pay)}</b>
        </span>
      </div>
    </div>
  );
};

export { gbp };
export default BudgetBar;

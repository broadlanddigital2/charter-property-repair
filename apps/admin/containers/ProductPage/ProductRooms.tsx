import clsx from "clsx";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

import { ROOMS } from "@/components/RoomBadges";
import { setProductRooms } from "@/services/requestService";
import { errorLogger } from "@/services/axiosService";
import { Product, TProductRoom } from "@/types/api";

type Props = {
  product: Product;
  onChange: (rooms: TProductRoom[], manual: boolean) => void;
};

/**
 * Rooms a product can be used in. Click a room to toggle it — changes save
 * straight away and pin the product's rooms (rules no longer change them)
 * until "Use automatic rooms" is clicked.
 */
const ProductRooms = ({ product, onChange }: Props) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [manual, setManual] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelected((product.rooms ?? []).map((r) => r.slug));
    setManual(!!product.rooms_manual);
  }, [product.guid, product.rooms, product.rooms_manual]);

  const save = async (rooms: string[] | null) => {
    try {
      setSaving(true);
      const res = await setProductRooms(product.guid, rooms);
      setSelected(res.rooms.map((r) => r.slug));
      setManual(res.rooms_manual);
      onChange(res.rooms, res.rooms_manual);
      toast.success(rooms === null ? "Rooms reset to the automatic rules" : "Rooms updated");
    } catch (error) {
      errorLogger(error, "Failed to update rooms");
    } finally {
      setSaving(false);
    }
  };

  const toggle = (slug: string) => {
    const next = selected.includes(slug) ? selected.filter((s) => s !== slug) : [...selected, slug];
    setSelected(next);
    save(next);
  };

  return (
    <div className="card border-0 shadow-sm mb-4">
      <div className="card-header bg-body d-flex align-items-center gap-2">
        <span className="fw-semibold">Rooms</span>
        <span className={clsx("badge", manual ? "text-bg-warning" : "text-bg-light")}>
          {manual ? "Set manually" : "Automatic"}
        </span>
        {manual && (
          <button
            type="button"
            className="btn btn-sm btn-link ms-auto"
            disabled={saving}
            onClick={() => save(null)}
          >
            Use automatic rooms
          </button>
        )}
      </div>
      <div className="card-body">
        <div className="d-flex flex-wrap gap-2">
          {ROOMS.map((room) => {
            const on = selected.includes(room.slug);
            return (
              <button
                key={room.slug}
                type="button"
                disabled={saving}
                aria-pressed={on}
                className={clsx("btn btn-sm rounded-pill", on ? "btn-info text-white" : "btn-outline-secondary")}
                onClick={() => toggle(room.slug)}
              >
                {room.name}
              </button>
            );
          })}
        </div>
        <p className="small text-body-secondary mb-0 mt-2">
          {manual
            ? "These rooms are pinned to this product."
            : "Assigned from the room rules for this supplier and category. Click a room to override."}
        </p>
      </div>
    </div>
  );
};

export default ProductRooms;

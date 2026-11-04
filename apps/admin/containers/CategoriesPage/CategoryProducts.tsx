import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import Pagination from "@/components/Pagination";
import ProductImage from "@/components/ProductImage";
import RoomBadges from "@/components/RoomBadges";
import useDebounce from "@/hooks/useDebounce";
import { errorLogger } from "@/services/axiosService";
import { getProductsPage } from "@/services/requestService";
import { Product } from "@/types/api";

const PER_PAGE = 10;

/** Paged list of the products in a category (and its sub-categories). */
const CategoryProducts = ({ categoryGUID, categoryName }: { categoryGUID: string; categoryName: string }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const q = useDebounce(search, 350);
  const router = useRouter();
  const openProduct = (guid: string) => router.push(`/products?product=${guid}`);

  useEffect(() => setPage(1), [categoryGUID, q]);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        setLoading(true);
        const res = await getProductsPage({ category: categoryGUID, search: q.trim(), page, perPage: PER_PAGE });
        if (live) {
          setProducts(res.products);
          setTotal(res.total);
        }
      } catch (error) {
        errorLogger(error, "Failed to load products");
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [categoryGUID, q, page]);

  return (
    <div className="card border-0 shadow-sm mt-4">
      <div className="card-header bg-body d-flex flex-wrap align-items-center gap-2">
        <span className="fw-semibold">Products in {categoryName}</span>
        <span className="badge text-bg-light">{total.toLocaleString("en-GB")}</span>
        <input
          className="form-control form-control-sm ms-auto"
          style={{ maxWidth: 260 }}
          placeholder="Filter by name or SKU…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {!loading && products.length === 0 ? (
        <div className="card-body text-body-secondary small">
          {q ? "No products match that filter." : "No products in this category yet."}
        </div>
      ) : (
        <div className="table-responsive" style={{ opacity: loading ? 0.6 : 1 }}>
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: 64 }}></th>
                <th>Product</th>
                <th>Sub-category</th>
                <th>Rooms</th>
                <th className="text-end">Price</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.guid} style={{ cursor: "pointer" }} onClick={() => openProduct(p.guid)}>
                  <td>
                    <div className="border rounded bg-body-tertiary overflow-hidden" style={{ width: 44, height: 44 }}>
                      <ProductImage src={p.image} iconSize="sm" />
                    </div>
                  </td>
                  <td style={{ maxWidth: 380 }}>
                    <Link
                      href={`/products?product=${p.guid}`}
                      className="fw-semibold text-truncate d-block text-body"
                      title={p.name}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {p.name}
                    </Link>
                    <div className="small text-body-secondary text-truncate">
                      {p.sku}
                      {p.supplier?.name ? ` · ${p.supplier.name}` : ""}
                    </div>
                  </td>
                  <td className="small">{p.category?.guid === categoryGUID ? "—" : p.category?.name}</td>
                  <td style={{ maxWidth: 200 }}>
                    <RoomBadges rooms={p.rooms} max={2} />
                  </td>
                  <td className="text-end text-nowrap">
                    {p.price !== null && p.price !== undefined && p.price !== "" ? (
                      `£${Number(p.price).toLocaleString("en-GB")}`
                    ) : (
                      <span className="text-body-tertiary small">—</span>
                    )}
                  </td>
                  <td className="text-end" onClick={(e) => e.stopPropagation()}>
                    <Link href={`/products?product=${p.guid}`} className="btn btn-sm btn-outline-primary">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > PER_PAGE && (
        <div className="card-footer bg-body">
          <Pagination currentPage={page} totalPages={Math.ceil(total / PER_PAGE)} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
};

export default CategoryProducts;

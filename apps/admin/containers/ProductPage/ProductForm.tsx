import { useMemo } from "react";
import {
  UseFormGetValues,
  UseFormHandleSubmit,
  UseFormRegister,
} from "react-hook-form";

import Input from "@/components/Input";
import Button from "@/components/Button";
import { Nullable } from "@/types/utils";
import { Dropdown } from "@/components/Dropdown";
import ProductImage from "@/components/ProductImage";
import {
  Product,
  TCategory,
  TPriceBandsCategory,
  TSupplier,
} from "@/types/api";
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormCheck,
  CFormLabel,
  CFormTextarea,
  CListGroup,
  CListGroupItem,
  CRow,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilExternalLink, cilX } from "@coreui/icons";

const surfaces = ["Wall", "Floor"];

type Props = {
  selectedProduct: Product;
  selectedPriceBand: Nullable<number | string>;
  isSavedSuccessfully: boolean;
  handleSubmit: UseFormHandleSubmit<any, undefined>;
  register?: UseFormRegister<any>;
  getValues: UseFormGetValues<any>;
  priceBands: TPriceBandsCategory[];
  onPriceBandSelect: (val: string) => void;
  selectedSurface: Nullable<string>;
  onSurfaceSelect: (val: string) => void;
  handleSaveProduct: (data: any) => void;
  categories: TCategory[];
  selectedCategory: string;
  onSelectCategory: (categoryGUID: string) => void;
  suppliers: TSupplier[];
  selectedSupplier: string;
  onSelectSupplier: (supplierGUID: string) => void;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  imagePreview: string;
  onCancelAction: () => void;
};

const ProductForm = ({
  selectedProduct,
  register,
  handleSubmit,
  getValues,
  onPriceBandSelect,
  priceBands,
  selectedPriceBand,
  isSavedSuccessfully,
  selectedSurface,
  onSurfaceSelect,
  handleSaveProduct,
  categories,
  selectedCategory,
  onSelectCategory,
  suppliers,
  selectedSupplier,
  onSelectSupplier,
  onImageChange,
  imagePreview,
  onCancelAction,
}: Props) => {
  const submit = (data: any) => {
    const { name, description, ...miscellaneous } = data.productData;

    const newData = {
      name,
      description,
      sku: selectedProduct.sku,
      miscellaneous: JSON.stringify({
        ...miscellaneous,
        wall: selectedSurface === "Wall" ? "✓" : "",
        floor: selectedSurface === "Floor" ? "✓" : "",
      }),
    };

    handleSaveProduct(newData);
  };

  const formValues = getValues()?.productData;

  const formValuesDataArray: any[] = useMemo(
    () =>
      Object.entries(formValues)
        .filter((el) => {
          return (
            el[0] !== "wall" &&
            el[0] !== "floor" &&
            el[0] !== "name" &&
            el[0] !== "description"
          );
        })
        .map((el) => ({ [el[0]]: [el[1]] })),
    [formValues]
  );

  const categoriesDropdownOptions = categories.map((category) => ({
    label: category.name,
    value: category.guid,
  }));

  const manufacturersDropdownOptions = suppliers.map((supplier) => ({
    label: supplier.name,
    value: supplier.guid,
  }));

  // ---- sort the supplier-specific fields into sensible groups -------------
  const fields = formValuesDataArray.map((field: Record<string, unknown[]>) => {
    const key = Object.keys(field)[0];
    const value = field[key]?.[0];
    return { key, value };
  });
  const isUrlish = (key: string, value: unknown) =>
    /url|image|document|link/i.test(key) ||
    (typeof value === "string" && /^https?:\/\//i.test(value.trim()));
  const isText = (v: unknown) => v === null || v === undefined || typeof v === "string" || typeof v === "number";

  const mediaFields = fields.filter((f) => isText(f.value) && isUrlish(f.key, f.value));
  const structuredFields = fields.filter((f) => !isText(f.value));
  const textFields = fields.filter((f) => isText(f.value) && !isUrlish(f.key, f.value));
  const shortFields = textFields.filter((f) => String(f.value ?? "").length <= 90 && !String(f.value ?? "").includes("\n"));
  const longFields = textFields.filter((f) => !shortFields.includes(f));

  const gallery = Array.from(
    new Set(
      mediaFields
        .filter((f) => /image/i.test(f.key))
        .flatMap((f) => String(f.value ?? "").split(/[|,\s]+/))
        .filter((u) => /^https?:\/\/.+\.(jpe?g|png|webp|gif)(\?.*)?$/i.test(u))
    )
  ).slice(0, 8);

  const selectedCategoryName = categories.find((c) => c.guid === selectedCategory)?.name;
  const selectedSupplierName = suppliers.find((s) => s.guid === selectedSupplier)?.name;
  const selectedBand = priceBands.find((b) => b.guid === selectedPriceBand)?.band;

  return (
    <form onSubmit={handleSubmit(submit)} className="mt-4">
      <div className="d-flex align-items-start mb-3">
        <div>
          <h2 className="h5 mb-1">{selectedProduct.name}</h2>
          <div className="text-body-secondary small">
            SKU {selectedProduct.sku}
            {selectedSupplierName ? ` · ${selectedSupplierName}` : ""}
          </div>
        </div>
        <CButton color="secondary" variant="ghost" className="ms-auto" onClick={onCancelAction} aria-label="Close">
          <CIcon icon={cilX} />
        </CButton>
      </div>

      <CRow className="g-4">
        {/* ---- left: image + summary ---- */}
        <CCol lg={4}>
          <CCard className="border-0 shadow-sm">
            <div
              className="d-flex align-items-center justify-content-center bg-body-tertiary rounded-top"
              style={{ height: 260, overflow: "hidden" }}
            >
              <ProductImage src={imagePreview} alt={selectedProduct.name} fit="contain" iconSize="3xl" label="No image available" />
            </div>
            <CCardBody className="border-bottom">
              <CFormLabel htmlFor="image" className="small fw-semibold mb-1">
                Replace image
              </CFormLabel>
              <input type="file" id="image" accept="image/*" onChange={onImageChange} className="form-control form-control-sm" />
            </CCardBody>
            <CListGroup flush>
              <CListGroupItem className="d-flex justify-content-between small">
                <span className="text-body-secondary">SKU</span>
                <span className="fw-semibold">{selectedProduct.sku}</span>
              </CListGroupItem>
              <CListGroupItem className="d-flex justify-content-between small">
                <span className="text-body-secondary">Supplier</span>
                <span>{selectedSupplierName ?? "—"}</span>
              </CListGroupItem>
              <CListGroupItem className="d-flex justify-content-between small">
                <span className="text-body-secondary">Category</span>
                <span className="text-end">{selectedCategoryName ?? "—"}</span>
              </CListGroupItem>
              <CListGroupItem className="d-flex justify-content-between small">
                <span className="text-body-secondary">Grade</span>
                {selectedBand !== undefined ? <CBadge color="primary">Grade {selectedBand}</CBadge> : <span>None</span>}
              </CListGroupItem>
              <CListGroupItem className="d-flex justify-content-between small">
                <span className="text-body-secondary">Price</span>
                <span className="fw-semibold">
                  {selectedProduct.price !== null && selectedProduct.price !== undefined && selectedProduct.price !== ""
                    ? `£${Number(selectedProduct.price).toLocaleString("en-GB")}`
                    : "—"}
                  <span className="text-body-secondary fw-normal ms-1">
                    {Number(selectedProduct.price_has_vat) ? "inc VAT" : "ex VAT"}
                  </span>
                </span>
              </CListGroupItem>
            </CListGroup>
          </CCard>
        </CCol>

        {/* ---- right: editable sections ---- */}
        <CCol lg={8}>
          <Section title="Details">
            <Input id="productData.name" label="Name" register={register} placeholder="Product name" withoutTopMargin />
            <div className="mt-3">
              <CFormLabel htmlFor="productData.description" className="fw-semibold small mb-1">
                Description
              </CFormLabel>
              <CFormTextarea
                id="productData.description"
                rows={4}
                placeholder="Product description"
                {...(register ? register("productData.description") : {})}
              />
            </div>
          </Section>

          <Section title="Classification">
            <CRow className="g-3">
              <CCol md={6}>
                <Dropdown
                  label="Category"
                  options={categoriesDropdownOptions}
                  onSelect={(val) => onSelectCategory(val as string)}
                  placeholder="Select category"
                  selectedOption={selectedCategory}
                  withoutTopMargin
                />
              </CCol>
              <CCol md={6}>
                <Dropdown
                  label="Manufacturer"
                  options={manufacturersDropdownOptions}
                  onSelect={(val) => onSelectSupplier(val as string)}
                  placeholder="Select manufacturer"
                  selectedOption={selectedSupplier}
                  withoutTopMargin
                />
              </CCol>
              <CCol md={6}>
                <div className="fw-semibold small mb-1">Price band</div>
                <div className="d-flex flex-wrap gap-2">
                  {priceBands.map((priceBand) => (
                    <CFormCheck
                      key={priceBand.guid}
                      type="radio"
                      button={{ color: "primary", variant: "outline", size: "sm" }}
                      name="price-band"
                      id={`grade-${priceBand.guid}`}
                      autoComplete="off"
                      label={`Grade ${priceBand.band}`}
                      checked={selectedPriceBand === priceBand.guid}
                      onChange={() => onPriceBandSelect(priceBand.guid)}
                    />
                  ))}
                </div>
              </CCol>
              <CCol md={6}>
                <div className="fw-semibold small mb-1">Surface type</div>
                <div className="d-flex flex-wrap gap-2">
                  {surfaces.map((surface) => (
                    <CFormCheck
                      key={surface}
                      type="radio"
                      button={{ color: "secondary", variant: "outline", size: "sm" }}
                      name="surface"
                      id={`surface-${surface}`}
                      autoComplete="off"
                      label={surface}
                      checked={selectedSurface === surface}
                      onChange={() => onSurfaceSelect(surface)}
                    />
                  ))}
                </div>
              </CCol>
            </CRow>
          </Section>

          {(shortFields.length > 0 || longFields.length > 0 || structuredFields.length > 0) && (
            <Section title="Specifications">
              {shortFields.length > 0 && (
                <CRow className="g-3">
                  {shortFields.map(({ key }) => (
                    <CCol md={6} key={key}>
                      <Input id={`productData.${key}`} label={labelFor(key)} register={register} placeholder={labelFor(key)} withoutTopMargin />
                    </CCol>
                  ))}
                </CRow>
              )}

              {longFields.map(({ key }) => (
                <div className="mt-3" key={key}>
                  <CFormLabel htmlFor={`productData.${key}`} className="fw-semibold small mb-1">
                    {labelFor(key)}
                  </CFormLabel>
                  <CFormTextarea id={`productData.${key}`} rows={3} {...(register ? register(`productData.${key}`) : {})} />
                </div>
              ))}

              {structuredFields.map(({ key, value }) => (
                <div className="mt-3" key={key}>
                  <div className="fw-semibold small mb-1">
                    {labelFor(key)} <span className="text-body-tertiary fw-normal">(from supplier feed, read-only)</span>
                  </div>
                  <StructuredValue value={value} />
                </div>
              ))}
            </Section>
          )}

          {mediaFields.length > 0 && (
            <Section title="Links & media">
              {gallery.length > 0 && (
                <div className="d-flex flex-wrap gap-2 mb-3">
                  {gallery.map((src) => (
                    <a key={src} href={src} target="_blank" rel="noreferrer" className="border rounded overflow-hidden d-block" style={{ width: 84, height: 84 }}>
                      <ProductImage src={src} iconSize="sm" />
                    </a>
                  ))}
                </div>
              )}
              <CRow className="g-3">
                {mediaFields.map(({ key, value }) => {
                  const first = String(value ?? "").split(/[|\s]+/).find((u) => /^https?:\/\//i.test(u));
                  return (
                    <CCol md={12} key={key}>
                      <div className="d-flex align-items-end gap-2">
                        <div className="flex-grow-1">
                          <Input id={`productData.${key}`} label={labelFor(key)} register={register} withoutTopMargin />
                        </div>
                        {first && (
                          <a href={first} target="_blank" rel="noreferrer" className="btn btn-outline-secondary" title="Open">
                            <CIcon icon={cilExternalLink} />
                          </a>
                        )}
                      </div>
                    </CCol>
                  );
                })}
              </CRow>
            </Section>
          )}
        </CCol>
      </CRow>

      <div
        className="d-flex justify-content-end gap-2 position-sticky bottom-0 bg-body border-top py-3 px-3 mt-2 rounded-bottom shadow-sm"
        style={{ zIndex: 5 }}
      >
        <Button type="button" variant="secondary" onClick={onCancelAction}>
          Cancel
        </Button>
        <Button type="submit">{isSavedSuccessfully ? "Saved ✓" : "Save changes"}</Button>
      </div>
    </form>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <CCard className="border-0 shadow-sm mb-4">
    <CCardHeader className="bg-body fw-semibold">{title}</CCardHeader>
    <CCardBody>{children}</CCardBody>
  </CCard>
);

/** "featuresAndBenefits" -> "Features and benefits" */
const labelFor = (key: string) => {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** Read-only rendering of nested supplier data (arrays / objects). */
const StructuredValue = ({ value }: { value: unknown }) => {
  if (Array.isArray(value)) {
    if (value.every((v) => typeof v !== "object" || v === null)) {
      return (
        <ul className="small mb-0 ps-3">
          {value.map((v, i) => (
            <li key={i}>{String(v)}</li>
          ))}
        </ul>
      );
    }
    return (
      <div className="d-flex flex-column gap-2">
        {value.map((v, i) => (
          <div key={i} className="border rounded p-2 bg-body-tertiary">
            <StructuredValue value={v} />
          </div>
        ))}
      </div>
    );
  }
  if (value && typeof value === "object") {
    return (
      <table className="table table-sm small mb-0">
        <tbody>
          {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
            <tr key={k}>
              <th className="text-body-secondary fw-normal" style={{ width: "40%" }}>
                {labelFor(k)}
              </th>
              <td>{typeof v === "object" && v !== null ? <StructuredValue value={v} /> : String(v ?? "")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  return <span className="small">{String(value ?? "")}</span>;
};

export default ProductForm;

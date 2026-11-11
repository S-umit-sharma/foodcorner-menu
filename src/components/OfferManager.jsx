import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

const emptyForm = {
  title_en: "",
  description_en: "",
  discount_type: "percentage",
  discount_value: "",
  product_id: "",
  start_at: "",
  end_at: "",
  is_active: true,
};

const inputClassName =
  "mt-2 block w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10";

function OfferManager() {
  const [offers, setOffers] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingOffer, setEditingOffer] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchOffers();
    fetchProducts();
  }, []);

  const fetchOffers = async () => {
    setLoading(true);
    setError("");

    const { data, error: fetchError } = await supabase
      .from("offers")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) setError(fetchError.message);
    else setOffers(data || []);

    setLoading(false);
  };

  const fetchProducts = async () => {
    const { data, error: fetchError } = await supabase
      .from("products")
      .select("id, name_en, price")
      .eq("is_active", true)
      .order("name_en");

    if (fetchError) {
      setError(fetchError.message);
      return;
    }

    setProducts(data || []);
  };

  const updateForm = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const toLocalDateTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000)
      .toISOString()
      .slice(0, 16);
  };

  const formatPrice = (price) =>
    new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 2,
    }).format(Number(price) || 0);

  const formatDate = (value) => {
    if (!value) return "Not scheduled";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Invalid date";
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getOfferStatus = (offer) => {
    if (!offer.is_active) {
      return {
        label: "Inactive",
        className: "bg-slate-100 text-slate-600 ring-slate-200",
        dotClassName: "bg-slate-400",
      };
    }

    const now = Date.now();
    const start = offer.start_at ? new Date(offer.start_at).getTime() : null;
    const end = offer.end_at ? new Date(offer.end_at).getTime() : null;

    if (start !== null && !Number.isNaN(start) && start > now) {
      return {
        label: "Scheduled",
        className: "bg-amber-50 text-amber-700 ring-amber-200",
        dotClassName: "bg-amber-500",
      };
    }

    if (end !== null && !Number.isNaN(end) && end < now) {
      return {
        label: "Expired",
        className: "bg-rose-50 text-rose-700 ring-rose-200",
        dotClassName: "bg-rose-500",
      };
    }

    return {
      label: "Active",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      dotClassName: "bg-emerald-500",
    };
  };

  const openAddForm = () => {
    setEditingOffer(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const openEditForm = (offer) => {
    setEditingOffer(offer);
    setForm({
      title_en: offer.title_en || "",
      description_en: offer.description_en || "",
      discount_type: offer.discount_type || "percentage",
      discount_value: offer.discount_value ?? "",
      product_id: offer.product_id || "",
      start_at: toLocalDateTime(offer.start_at),
      end_at: toLocalDateTime(offer.end_at),
      is_active: offer.is_active ?? true,
    });
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;
    setShowForm(false);
    setEditingOffer(null);
    setForm(emptyForm);
    setError("");
  };

  const saveOffer = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const value = Number(form.discount_value);

      if (!Number.isFinite(value) || value <= 0) {
        throw new Error("Enter a valid discount value.");
      }

      if (form.discount_type === "percentage" && value > 100) {
        throw new Error("Percentage discount cannot exceed 100.");
      }

      if (
        form.start_at &&
        form.end_at &&
        new Date(form.end_at) <= new Date(form.start_at)
      ) {
        throw new Error("End date must be after start date.");
      }

      const offerData = {
        ...form,
        discount_value: value,
        product_id: form.product_id || null,
        start_at: form.start_at
          ? new Date(form.start_at).toISOString()
          : null,
        end_at: form.end_at
          ? new Date(form.end_at).toISOString()
          : null,
      };

      const wasEditing = Boolean(editingOffer);
      const result = wasEditing
        ? await supabase
            .from("offers")
            .update(offerData)
            .eq("id", editingOffer.id)
        : await supabase.from("offers").insert([offerData]);

      if (result.error) throw result.error;

      setShowForm(false);
      setEditingOffer(null);
      setForm(emptyForm);
      await fetchOffers();
      setSuccess(
        wasEditing
          ? "Offer updated successfully."
          : "Offer created successfully."
      );
    } catch (err) {
      setError(err.message || "Unable to save offer.");
    } finally {
      setSaving(false);
    }
  };

  const deleteOffer = async (offer) => {
    if (!window.confirm(`Delete offer "${offer.title_en}"?`)) return;

    setError("");
    setSuccess("");
    const { error: deleteError } = await supabase
      .from("offers")
      .delete()
      .eq("id", offer.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    await fetchOffers();
    setSuccess("Offer deleted successfully.");
  };

  return (
    <section className="w-full min-w-0 space-y-6">
      {/* Section heading */}
      <div className="flex flex-col gap-4 rounded-2xl border border-orange-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-red-600">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Promotions
          </div>
          <h3 className="mt-2 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
            Manage Offers
          </h3>
          <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
            Create and manage discounts for individual products or your entire menu.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddForm}
          className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-sm shadow-red-200 transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-500/20 sm:w-auto"
        >
          <span className="text-lg leading-none">+</span>
          Add Offer
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <span className="font-bold">!</span>
          <p className="min-w-0 flex-1">{error}</p>
          <button
            type="button"
            onClick={() => setError("")}
            className="font-bold text-red-700 hover:text-red-900"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          <span className="font-bold">✓</span>
          <p className="min-w-0 flex-1">{success}</p>
          <button
            type="button"
            onClick={() => setSuccess("")}
            className="font-bold text-emerald-700 hover:text-emerald-900"
            aria-label="Dismiss success message"
          >
            ×
          </button>
        </div>
      )}

      {/* Offers list */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="animate-pulse rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
            >
              <div className="h-5 w-2/3 rounded bg-slate-100" />
              <div className="mt-4 h-4 w-full rounded bg-slate-100" />
              <div className="mt-2 h-4 w-1/2 rounded bg-slate-100" />
              <div className="mt-6 h-10 rounded-xl bg-slate-100" />
            </div>
          ))}
        </div>
      ) : offers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center shadow-sm sm:px-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl">
            🏷️
          </div>
          <h4 className="mt-4 text-lg font-bold text-slate-900">
            No offers created yet
          </h4>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
            Create your first promotion to display discounts on the customer menu.
          </p>
          <button
            type="button"
            onClick={openAddForm}
            className="mt-5 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"
          >
            Create your first offer
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {offers.map((offer) => {
            const product = products.find(
              (item) => item.id === offer.product_id
            );
            const status = getOfferStatus(offer);

            return (
              <article
                key={offer.id}
                className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="h-1.5 bg-gradient-to-r from-red-600 via-orange-500 to-amber-400" />
                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                        Promotion
                      </p>
                      <h4 className="mt-1 break-words text-lg font-black leading-snug text-slate-900">
                        {offer.title_en}
                      </h4>
                    </div>
                    <span className="shrink-0 rounded-full bg-red-50 px-3 py-1.5 text-xs font-black text-red-700 ring-1 ring-red-100">
                      {offer.discount_type === "percentage"
                        ? `${offer.discount_value}% OFF`
                        : `₹${formatPrice(offer.discount_value)} OFF`}
                    </span>
                  </div>

                  <p className="mt-3 min-h-10 whitespace-pre-line break-words text-sm leading-5 text-slate-500">
                    {offer.description_en || "No description provided."}
                  </p>

                  <div className="mt-5 space-y-3 rounded-xl bg-[#FFF8F0] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2 text-sm">
                      <span className="text-slate-500">Applies to</span>
                      <span className="max-w-[65%] break-words text-right font-semibold text-slate-800">
                        {offer.product_id
                          ? product?.name_en || "Product unavailable"
                          : "All products"}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="text-slate-500">Status</span>
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${status.className}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${status.dotClassName}`} />
                        {status.label}
                      </span>
                    </div>
                    <div className="border-t border-orange-100 pt-3 text-xs text-slate-500">
                      <div className="flex flex-col gap-1.5">
                        <p>
                          <span className="font-semibold text-slate-600">Starts:</span>{" "}
                          {formatDate(offer.start_at)}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-600">Ends:</span>{" "}
                          {formatDate(offer.end_at)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto flex gap-2 pt-5">
                    <button
                      type="button"
                      onClick={() => openEditForm(offer)}
                      className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-4 focus:ring-slate-300"
                    >
                      Edit offer
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteOffer(offer)}
                      className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 transition hover:border-red-200 hover:bg-red-100 focus:outline-none focus:ring-4 focus:ring-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Add/Edit offer dialog */}
      {showForm && (
        <div
          className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center sm:p-5"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeForm();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="offer-form-title"
            className="my-2 w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl sm:my-6 sm:rounded-3xl"
          >
            <div className="flex items-start justify-between gap-4 bg-gradient-to-r from-red-600 to-red-700 px-5 py-5 text-white sm:px-7 sm:py-6">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-100">
                  DSP Fast Food · Promotions
                </p>
                <h3 id="offer-form-title" className="mt-1 text-xl font-black sm:text-2xl">
                  {editingOffer ? "Edit Offer" : "Create New Offer"}
                </h3>
                <p className="mt-1 text-xs text-red-100 sm:text-sm">
                  Set the discount, product and offer schedule.
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-2xl leading-none text-white transition hover:bg-white/25 disabled:opacity-50"
                aria-label="Close offer form"
              >
                ×
              </button>
            </div>

            <form onSubmit={saveOffer} className="space-y-5 p-5 sm:p-7">
              <div>
                <label htmlFor="offer-title" className="block text-sm font-bold text-slate-700">
                  Offer Title <span className="text-red-600">*</span>
                </label>
                <input
                  id="offer-title"
                  name="title_en"
                  value={form.title_en}
                  onChange={updateForm}
                  required
                  maxLength={120}
                  placeholder="Example: Weekend Special"
                  className={inputClassName}
                />
              </div>

              <div>
                <label htmlFor="offer-description" className="block text-sm font-bold text-slate-700">
                  Description
                </label>
                <textarea
                  id="offer-description"
                  name="description_en"
                  value={form.description_en}
                  onChange={updateForm}
                  rows={3}
                  placeholder="Describe what this offer includes..."
                  className={`${inputClassName} resize-y`}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="min-w-0">
                  <label htmlFor="discount-type" className="block text-sm font-bold text-slate-700">
                    Discount Type <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="discount-type"
                    name="discount_type"
                    value={form.discount_type}
                    onChange={updateForm}
                    className={inputClassName}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>

                <div className="min-w-0">
                  <label htmlFor="discount-value" className="block text-sm font-bold text-slate-700">
                    Discount Value <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="discount-value"
                      name="discount_value"
                      type="number"
                      min="0.01"
                      max={form.discount_type === "percentage" ? "100" : undefined}
                      step="0.01"
                      value={form.discount_value}
                      onChange={updateForm}
                      required
                      placeholder={form.discount_type === "percentage" ? "e.g. 10" : "e.g. 20"}
                      className={inputClassName}
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      {form.discount_type === "percentage" ? "%" : "₹"}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="offer-product" className="block text-sm font-bold text-slate-700">
                  Apply to Product
                </label>
                <select
                  id="offer-product"
                  name="product_id"
                  value={form.product_id}
                  onChange={updateForm}
                  className={inputClassName}
                >
                  <option value="">All products</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name_en} — ₹{formatPrice(product.price)}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs text-slate-400">
                  Choose All products to apply this offer across the menu.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="min-w-0">
                  <label htmlFor="offer-start" className="block text-sm font-bold text-slate-700">
                    Start Date
                  </label>
                  <input
                    id="offer-start"
                    type="datetime-local"
                    name="start_at"
                    value={form.start_at}
                    onChange={updateForm}
                    className={inputClassName}
                  />
                </div>
                <div className="min-w-0">
                  <label htmlFor="offer-end" className="block text-sm font-bold text-slate-700">
                    End Date
                  </label>
                  <input
                    id="offer-end"
                    type="datetime-local"
                    name="end_at"
                    value={form.end_at}
                    onChange={updateForm}
                    className={inputClassName}
                  />
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active}
                  onChange={updateForm}
                  className="h-4 w-4 rounded border-slate-300 text-red-600 accent-red-600 focus:ring-red-500"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-slate-800">Offer is active</span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    Turn this off to hide the offer from customers.
                  </span>
                </span>
              </label>

              {error && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="w-full rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white shadow-sm shadow-red-200 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {saving
                    ? "Saving..."
                    : editingOffer
                      ? "Update Offer"
                      : "Save Offer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default OfferManager;

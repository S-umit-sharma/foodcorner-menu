
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

function OfferManager() {
  const [offers, setOffers] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingOffer, setEditingOffer] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchOffers();
    fetchProducts();
  }, []);

  const fetchOffers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("offers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) setError(error.message);
    else setOffers(data || []);

    setLoading(false);
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("id, name_en, price")
      .eq("is_active", true)
      .order("name_en");

    if (error) {
      setError(error.message);
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
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000)
      .toISOString()
      .slice(0, 16);
  };

  const openAddForm = () => {
    setEditingOffer(null);
    setForm(emptyForm);
    setError("");
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
    setShowForm(true);
  };

  const saveOffer = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

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

      const result = editingOffer
        ? await supabase
            .from("offers")
            .update(offerData)
            .eq("id", editingOffer.id)
        : await supabase
            .from("offers")
            .insert([offerData]);

      if (result.error) throw result.error;

      setShowForm(false);
      setEditingOffer(null);
      setForm(emptyForm);
      await fetchOffers();
    } catch (err) {
      setError(err.message || "Unable to save offer.");
    } finally {
      setSaving(false);
    }
  };

  const deleteOffer = async (offer) => {
    if (!window.confirm(`Delete offer "${offer.title_en}"?`)) return;

    const { error } = await supabase
      .from("offers")
      .delete()
      .eq("id", offer.id);

    if (error) {
      setError(error.message);
      return;
    }

    await fetchOffers();
  };

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold">Manage Offers</h3>
          <p className="mt-1 text-sm text-slate-500">
            Create and manage product discounts.
          </p>
        </div>

        <button
          onClick={openAddForm}
          className="rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700"
        >
          + Add Offer
        </button>
      </div>

      {error && (
        <div className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="rounded-xl bg-white p-8 text-slate-500">
          Loading offers...
        </p>
      ) : offers.length === 0 ? (
        <p className="rounded-xl bg-white p-8 text-slate-500">
          No offers found. Create your first offer.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {offers.map((offer) => {
            const product = products.find(
              (item) => item.id === offer.product_id
            );

            return (
              <div
                key={offer.id}
                className="rounded-2xl bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <h4 className="font-bold">{offer.title_en}</h4>
                  <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-bold text-orange-700">
                    {offer.discount_type === "percentage"
                      ? `${offer.discount_value}% OFF`
                      : `₹${offer.discount_value} OFF`}
                  </span>
                </div>

                <p className="mt-3 text-sm text-slate-500">
                  {offer.description_en || "No description"}
                </p>

                <p className="mt-3 text-sm text-slate-600">
                  Product: {product?.name_en || "All products"}
                </p>

                <p className="mt-2 text-sm">
                  Status:{" "}
                  <span className={offer.is_active ? "text-green-600" : "text-slate-500"}>
                    {offer.is_active ? "Active" : "Inactive"}
                  </span>
                </p>

                <div className="mt-5 flex gap-2">
                  <button
                    onClick={() => openEditForm(offer)}
                    className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteOffer(offer)}
                    className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
          <div className="mx-auto my-8 max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold">
                {editingOffer ? "Edit Offer" : "Add Offer"}
              </h3>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-2xl text-slate-400"
              >
                ×
              </button>
            </div>

            <form onSubmit={saveOffer} className="space-y-4">
              <label className="block text-sm font-medium">
                Offer Title *
                <input
                  name="title_en"
                  value={form.title_en}
                  onChange={updateForm}
                  required
                  className="mt-1 w-full rounded-lg border p-3"
                />
              </label>

              <label className="block text-sm font-medium">
                Description
                <textarea
                  name="description_en"
                  value={form.description_en}
                  onChange={updateForm}
                  rows="2"
                  className="mt-1 w-full rounded-lg border p-3"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium">
                  Discount Type *
                  <select
                    name="discount_type"
                    value={form.discount_type}
                    onChange={updateForm}
                    className="mt-1 w-full rounded-lg border p-3"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </label>

                <label className="block text-sm font-medium">
                  Discount Value *
                  <input
                    name="discount_value"
                    type="number"
                    min="0.01"
                    max={form.discount_type === "percentage" ? "100" : undefined}
                    step="0.01"
                    value={form.discount_value}
                    onChange={updateForm}
                    required
                    className="mt-1 w-full rounded-lg border p-3"
                  />
                </label>
              </div>

              <label className="block text-sm font-medium">
                Apply to Product
                <select
                  name="product_id"
                  value={form.product_id}
                  onChange={updateForm}
                  className="mt-1 w-full rounded-lg border p-3"
                >
                  <option value="">All products</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name_en} - ₹{product.price}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium">
                  Start Date
                  <input
                    type="datetime-local"
                    name="start_at"
                    value={form.start_at}
                    onChange={updateForm}
                    className="mt-1 w-full rounded-lg border p-3"
                  />
                </label>

                <label className="block text-sm font-medium">
                  End Date
                  <input
                    type="datetime-local"
                    name="end_at"
                    value={form.end_at}
                    onChange={updateForm}
                    className="mt-1 w-full rounded-lg border p-3"
                  />
                </label>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active}
                  onChange={updateForm}
                />
                Active
              </label>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border px-5 py-3 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Offer"}
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

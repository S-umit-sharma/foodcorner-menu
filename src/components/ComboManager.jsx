import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

function ComboManager() {
  const [products, setProducts] = useState([]);
  const [combos, setCombos] = useState([]);
  const [comboItems, setComboItems] = useState([]);

  const [selectedCombo, setSelectedCombo] = useState(null);
  const [comboName, setComboName] = useState("");
  const [comboPrice, setComboPrice] = useState("");
  const [selectedItems, setSelectedItems] = useState({});

  const [showEditor, setShowEditor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError("");

    try {
      const [productResult, comboResult, itemResult] = await Promise.all([
        supabase
          .from("products")
          .select("id, name_en, price, image_url, is_active")
          .eq("is_active", true)
          .order("name_en"),
        supabase
          .from("combos")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("combo_items").select("*"),
      ]);

      const fetchError =
        productResult.error || comboResult.error || itemResult.error;
      if (fetchError) throw fetchError;

      setProducts(productResult.data || []);
      setCombos(comboResult.data || []);
      setComboItems(itemResult.data || []);
    } catch (err) {
      setError(err.message || "Unable to load combos.");
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) =>
    new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 2,
    }).format(Number(price) || 0);

  const getComboItems = (comboId) =>
    comboItems.filter((item) => item.combo_id === comboId);

  const getOriginalPrice = (comboId) =>
    getComboItems(comboId).reduce((total, item) => {
      const product = products.find((p) => p.id === item.item_product_id);
      return total + (product ? Number(product.price) * Number(item.quantity) : 0);
    }, 0);

  const getSelectedTotal = () =>
    Object.entries(selectedItems).reduce((total, [productId, quantity]) => {
      const product = products.find((p) => p.id === productId);
      return total + (product ? Number(product.price) * Number(quantity) : 0);
    }, 0);

  const resetEditor = () => {
    setSelectedCombo(null);
    setComboName("");
    setComboPrice("");
    setSelectedItems({});
    setShowEditor(false);
    setError("");
  };

  const addNewCombo = () => {
    resetEditor();
    setSuccess("");
    setShowEditor(true);
  };

  const openCombo = (combo) => {
    const existingItems = {};
    getComboItems(combo.id).forEach((item) => {
      existingItems[item.item_product_id] = Number(item.quantity);
    });

    setSelectedCombo(combo.id);
    setComboName(combo.name);
    setComboPrice(String(combo.price));
    setSelectedItems(existingItems);
    setError("");
    setSuccess("");
    setShowEditor(true);
  };

  const updateQuantity = (productId, quantity) => {
    setSelectedItems((prev) => {
      const updated = { ...prev };
      if (quantity <= 0) {
        delete updated[productId];
      } else {
        updated[productId] = Number(quantity);
      }
      return updated;
    });
  };

  const saveCombo = async () => {
    setError("");
    setSuccess("");

    if (!comboName.trim()) {
      setError("Please enter a combo name.");
      return;
    }

    if (
      comboPrice === "" ||
      !Number.isFinite(Number(comboPrice)) ||
      Number(comboPrice) < 0
    ) {
      setError("Please enter a valid combo price.");
      return;
    }

    const items = Object.entries(selectedItems)
      .filter(([, quantity]) => Number(quantity) > 0)
      .map(([productId, quantity]) => ({
        item_product_id: productId,
        quantity: Number(quantity),
      }));

    if (items.length === 0) {
      setError("Please select at least one product.");
      return;
    }

    setSaving(true);

    try {
      let comboId = selectedCombo;

      if (selectedCombo) {
        const { error: updateError } = await supabase
          .from("combos")
          .update({
            name: comboName.trim(),
            price: Number(comboPrice),
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedCombo);
        if (updateError) throw updateError;

        const { error: deleteError } = await supabase
          .from("combo_items")
          .delete()
          .eq("combo_id", selectedCombo);
        if (deleteError) throw deleteError;
      } else {
        const { data, error: insertError } = await supabase
          .from("combos")
          .insert({
            name: comboName.trim(),
            price: Number(comboPrice),
          })
          .select()
          .single();
        if (insertError) throw insertError;
        comboId = data.id;
      }

      const newItems = items.map((item) => ({
        ...item,
        combo_id: comboId,
      }));

      const { error: itemsError } = await supabase
        .from("combo_items")
        .insert(newItems);
      if (itemsError) throw itemsError;

      await fetchData();
      resetEditor();
      setSuccess("Combo saved successfully!");
    } catch (err) {
      setError(err.message || "Unable to save combo.");
    } finally {
      setSaving(false);
    }
  };

  const deleteCombo = async (combo) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${combo.name}"?`
    );
    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      const { error: itemsError } = await supabase
        .from("combo_items")
        .delete()
        .eq("combo_id", combo.id);
      if (itemsError) throw itemsError;

      const { error: comboError } = await supabase
        .from("combos")
        .delete()
        .eq("id", combo.id);
      if (comboError) throw comboError;

      if (selectedCombo === combo.id) resetEditor();
      await fetchData();
      setSuccess("Combo deleted successfully!");
    } catch (err) {
      setError(err.message || "Unable to delete combo.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-52 items-center justify-center rounded-3xl border border-orange-100 bg-white p-8 text-center shadow-sm">
        <div>
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-orange-100 border-t-[#E02B2B]" />
          <p className="mt-4 text-sm font-medium text-slate-500">Loading combos...</p>
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-6 sm:space-y-8">
      {/* Page heading */}
      <div className="flex flex-col gap-4 rounded-3xl border border-orange-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0">
          <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#E02B2B]">
            Menu management
          </span>
          <h3 className="mt-3 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
            Manage Combos
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Build meal bundles by choosing products, setting quantities and defining a combo price.
          </p>
        </div>

        <button
          type="button"
          onClick={addNewCombo}
          className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#E02B2B] px-5 py-3 text-sm font-bold text-white shadow-sm shadow-red-200 transition hover:bg-[#C41E1E] focus:outline-none focus:ring-4 focus:ring-red-100 sm:w-auto"
        >
          <span className="text-lg leading-none">+</span>
          Add New Combo
        </button>
      </div>

      {/* Feedback messages */}
      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span className="mt-0.5 font-bold">!</span>
          <p className="min-w-0 flex-1 break-words">{error}</p>
          <button type="button" onClick={() => setError("")} className="font-bold text-red-700" aria-label="Dismiss error">×</button>
        </div>
      )}

      {success && (
        <div role="status" className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <span className="font-bold">✓</span>
          <p className="min-w-0 flex-1">{success}</p>
          <button type="button" onClick={() => setSuccess("")} className="font-bold text-green-700" aria-label="Dismiss success">×</button>
        </div>
      )}

      {/* Combo editor */}
      {showEditor && (
        <div className="overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-sm">
          <div className="border-b border-orange-100 bg-gradient-to-r from-red-50 via-white to-orange-50 px-5 py-5 sm:px-7">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#E02B2B]">
                  Combo builder
                </p>
                <h4 className="mt-1 text-lg font-black text-slate-900 sm:text-xl">
                  {selectedCombo ? "Edit Combo" : "Create New Combo"}
                </h4>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Add a name and price, then select the products included in this combo.
                </p>
              </div>
              <button
                type="button"
                onClick={resetEditor}
                className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-[#E02B2B]"
              >
                Close
              </button>
            </div>
          </div>

          <div className="space-y-6 p-4 sm:p-6 lg:p-7">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block min-w-0 text-sm font-semibold text-slate-700">
                Combo Name <span className="text-[#E02B2B]">*</span>
                <input
                  type="text"
                  value={comboName}
                  onChange={(e) => setComboName(e.target.value)}
                  placeholder="Example: Burger Special Combo"
                  className="mt-2 h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 text-sm font-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#E02B2B] focus:ring-4 focus:ring-red-100"
                />
              </label>

              <label className="block min-w-0 text-sm font-semibold text-slate-700">
                Combo Selling Price (₹) <span className="text-[#E02B2B]">*</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={comboPrice}
                  onChange={(e) => setComboPrice(e.target.value)}
                  placeholder="Enter combo price"
                  className="mt-2 h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 text-sm font-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#E02B2B] focus:ring-4 focus:ring-red-100"
                />
              </label>
            </div>

            <div>
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h5 className="text-base font-black text-slate-900">Included Products</h5>
                  <p className="mt-1 text-xs text-slate-500">Enter a quantity greater than zero to include a product.</p>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  {Object.values(selectedItems).filter((quantity) => Number(quantity) > 0).length} selected
                </span>
              </div>

              {products.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                  <p className="text-sm font-semibold text-slate-700">No active products available</p>
                  <p className="mt-1 text-xs text-slate-500">Add and activate products before creating a combo.</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {products.map((product) => {
                    const quantity = selectedItems[product.id] || "";
                    const isSelected = Number(quantity) > 0;
                    return (
                      <div
                        key={product.id}
                        className={`flex min-w-0 items-center gap-3 rounded-2xl border p-3 transition sm:p-4 ${
                          isSelected ? "border-red-200 bg-red-50/50" : "border-slate-200 bg-white hover:border-orange-200"
                        }`}
                      >
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name_en}
                            loading="lazy"
                            className="h-12 w-12 shrink-0 rounded-xl object-cover sm:h-14 sm:w-14"
                          />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-2xl sm:h-14 sm:w-14">
                            🍔
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-800">{product.name_en}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">₹{formatPrice(product.price)}</p>
                        </div>

                        <label className="flex shrink-0 flex-col items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          Qty
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={quantity}
                            onChange={(e) => updateQuantity(product.id, Number(e.target.value))}
                            placeholder="0"
                            aria-label={`Quantity of ${product.name_en}`}
                            className="h-10 w-16 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-bold text-slate-900 outline-none focus:border-[#E02B2B] focus:ring-2 focus:ring-red-100"
                          />
                        </label>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-orange-100 bg-gradient-to-r from-orange-50 to-red-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <p className="text-xs font-semibold text-slate-600">Total value of selected products</p>
                <p className="mt-1 text-2xl font-black tracking-tight text-slate-900">₹{formatPrice(getSelectedTotal())}</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs font-semibold text-slate-500">Combo selling price</p>
                <p className="mt-1 text-lg font-black text-[#E02B2B]">
                  {comboPrice === "" ? "Set a price above" : `₹${formatPrice(comboPrice)}`}
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={resetEditor}
                className="w-full rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveCombo}
                disabled={saving || products.length === 0}
                className="w-full rounded-xl bg-[#E02B2B] px-6 py-3 text-sm font-bold text-white shadow-sm shadow-red-200 transition hover:bg-[#C41E1E] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {saving ? "Saving..." : selectedCombo ? "Update Combo" : "Save Combo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved combos */}
      <div className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h4 className="text-lg font-black text-slate-900 sm:text-xl">Configured Combos</h4>
            <p className="mt-1 text-sm text-slate-500">Review, edit or remove your saved meal bundles.</p>
          </div>
          <span className="w-fit rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-[#E02B2B]">
            {combos.length} {combos.length === 1 ? "combo" : "combos"}
          </span>
        </div>

        {combos.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-orange-200 bg-white px-5 py-12 text-center shadow-sm sm:px-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-3xl">🍔</div>
            <p className="mt-4 text-base font-bold text-slate-800">No combos created yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">Create your first combo by selecting products and setting a special selling price.</p>
            <button
              type="button"
              onClick={addNewCombo}
              className="mt-5 rounded-xl bg-[#E02B2B] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#C41E1E]"
            >
              Create First Combo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {combos.map((combo) => {
              const items = getComboItems(combo.id);
              const originalPrice = getOriginalPrice(combo.id);
              const savings = Math.max(0, originalPrice - Number(combo.price));
              const previewProduct = products.find((product) => product.id === items[0]?.item_product_id);

              return (
                <article
                  key={combo.id}
                  className="flex min-w-0 flex-col overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="relative flex h-28 items-center gap-4 overflow-hidden bg-gradient-to-r from-red-50 via-orange-50 to-amber-50 px-5 sm:h-32">
                    {previewProduct?.image_url ? (
                      <img src={previewProduct.image_url} alt="" loading="lazy" className="h-20 w-20 shrink-0 rounded-2xl object-cover shadow-sm sm:h-24 sm:w-24" />
                    ) : (
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-4xl shadow-sm sm:h-24 sm:w-24">🍔</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="inline-flex rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#E02B2B]">Combo</span>
                      <h5 className="mt-2 line-clamp-2 break-words text-base font-black text-slate-900 sm:text-lg">{combo.name}</h5>
                    </div>
                    {savings > 0 && (
                      <span className="absolute right-3 top-3 rounded-full bg-green-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">Save ₹{formatPrice(savings)}</span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-4 sm:p-5">
                    <div className="flex-1 space-y-2">
                      {items.length === 0 ? (
                        <p className="text-sm italic text-slate-400">No products added to this combo.</p>
                      ) : (
                        items.map((item) => {
                          const product = products.find((p) => p.id === item.item_product_id);
                          if (!product) return null;
                          return (
                            <div key={item.id} className="flex min-w-0 items-start justify-between gap-3 text-sm">
                              <span className="min-w-0 break-words text-slate-600">{product.name_en} <span className="font-semibold text-slate-500">× {item.quantity}</span></span>
                              <span className="shrink-0 font-semibold text-slate-700">₹{formatPrice(Number(product.price) * Number(item.quantity))}</span>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Combo selling price</p>
                      <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <span className="text-2xl font-black text-[#E02B2B]">₹{formatPrice(combo.price)}</span>
                        {originalPrice > 0 && originalPrice > Number(combo.price) && (
                          <span className="text-sm text-slate-400 line-through">₹{formatPrice(originalPrice)}</span>
                        )}
                      </div>
                      {savings > 0 && <p className="mt-1 text-xs font-bold text-green-600">Customer saves ₹{formatPrice(savings)}</p>}
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => openCombo(combo)}
                        className="rounded-xl border border-orange-100 bg-orange-50 px-3 py-2.5 text-sm font-bold text-[#E02B2B] transition hover:bg-orange-100"
                      >
                        Edit Combo
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCombo(combo)}
                        className="rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-100"
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
      </div>
    </section>
  );
}

export default ComboManager;

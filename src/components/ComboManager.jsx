
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

    const [productResult, comboResult, itemResult] =
      await Promise.all([
        supabase
          .from("products")
          .select("id, name_en, price, image_url, is_active")
          .eq("is_active", true)
          .order("name_en"),

        supabase
          .from("combos")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("combo_items")
          .select("*"),
      ]);

    const fetchError =
      productResult.error ||
      comboResult.error ||
      itemResult.error;

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setProducts(productResult.data || []);
    setCombos(comboResult.data || []);
    setComboItems(itemResult.data || []);

    setLoading(false);
  };

  const formatPrice = (price) =>
    new Intl.NumberFormat("en-IN").format(
      Number(price) || 0
    );

  const getComboItems = (comboId) =>
    comboItems.filter(
      (item) => item.combo_id === comboId
    );

  const getOriginalPrice = (comboId) => {
    return getComboItems(comboId).reduce(
      (total, item) => {
        const product = products.find(
          (p) => p.id === item.item_product_id
        );

        return (
          total +
          (product
            ? Number(product.price) * Number(item.quantity)
            : 0)
        );
      },
      0
    );
  };

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
      existingItems[item.item_product_id] =
        Number(item.quantity);
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
        combo_id: selectedCombo,
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

      if (selectedCombo === combo.id) {
        resetEditor();
      }

      await fetchData();
      setSuccess("Combo deleted successfully!");
    } catch (err) {
      setError(err.message || "Unable to delete combo.");
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
        Loading combos...
      </div>
    );
  }

  return (
    <section className="space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-900">
            Manage Combos
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Create combos with your own name, price and products.
          </p>
        </div>

        <button
          onClick={addNewCombo}
          className="rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white transition hover:bg-orange-700"
        >
          + Add New Combo
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl bg-green-50 p-4 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Editor */}
      {showEditor && (
        <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm sm:p-6">

          <div className="mb-5 flex items-center justify-between gap-3">
            <h4 className="text-lg font-bold text-slate-900">
              {selectedCombo ? "Edit Combo" : "Create New Combo"}
            </h4>

            <button
              onClick={resetEditor}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>

          {/* Combo Name */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-slate-700">
              Combo Name
            </label>

            <input
              type="text"
              value={comboName}
              onChange={(e) => setComboName(e.target.value)}
              placeholder="Example: Burger Special Combo"
              className="mt-2 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-orange-500"
            />
          </div>

          {/* Combo Price */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700">
              Combo Selling Price (₹)
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              value={comboPrice}
              onChange={(e) => setComboPrice(e.target.value)}
              placeholder="Enter your combo price"
              className="mt-2 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-orange-500"
            />
          </div>

          {/* Included Products */}
          <div>
            <h5 className="mb-3 font-bold text-slate-800">
              Select Included Products
            </h5>

            {products.length === 0 ? (
              <p className="text-sm text-slate-500">
                No active products available. Add products first.
              </p>
            ) : (
              <div className="space-y-3">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 sm:p-4"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">
                        {product.name_en}
                      </p>

                      <p className="text-sm text-slate-500">
                        ₹{formatPrice(product.price)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-sm text-slate-500">
                        Qty
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={selectedItems[product.id] || ""}
                        onChange={(e) =>
                          updateQuantity(
                            product.id,
                            Number(e.target.value)
                          )
                        }
                        placeholder="0"
                        className="w-20 rounded-lg border border-slate-200 p-2 outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Price Summary */}
          <div className="mt-5 rounded-xl bg-orange-50 p-4">
            <p className="text-sm text-slate-600">
              Selected products' total:
            </p>

            <p className="mt-1 text-lg font-bold text-slate-900">
              ₹
              {formatPrice(
                Object.entries(selectedItems).reduce(
                  (total, [productId, quantity]) => {
                    const product = products.find(
                      (p) => p.id === productId
                    );

                    return (
                      total +
                      (product
                        ? Number(product.price) * Number(quantity)
                        : 0)
                    );
                  },
                  0
                )
              )}
            </p>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button
              onClick={resetEditor}
              className="rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-600"
            >
              Cancel
            </button>

            <button
              onClick={saveCombo}
              disabled={saving}
              className="rounded-xl bg-orange-600 px-6 py-3 font-semibold text-white transition hover:bg-orange-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Combo"}
            </button>
          </div>
        </div>
      )}

      {/* Configured Combos */}
      <div>
        <h4 className="mb-4 text-lg font-bold text-slate-900">
          Configured Combos ({combos.length})
        </h4>

        {combos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-lg font-semibold text-slate-700">
              No combos created yet
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Click Add New Combo to create your first combo.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {combos.map((combo) => {
              const items = getComboItems(combo.id);
              const originalPrice = getOriginalPrice(combo.id);

              const savings = Math.max(
                0,
                originalPrice - Number(combo.price)
              );

              return (
                <div
                  key={combo.id}
                  className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm transition hover:shadow-md"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="text-lg font-bold text-slate-900">
                        {combo.name}
                      </h5>

                      <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-600">
                        Combo
                      </span>
                    </div>

                    <div className="mt-4 space-y-2">
                      {items.map((item) => {
                        const product = products.find(
                          (p) => p.id === item.item_product_id
                        );

                        if (!product) return null;

                        return (
                          <div
                            key={item.id}
                            className="flex justify-between gap-2 text-sm"
                          >
                            <span className="text-slate-600">
                              {product.name_en} × {item.quantity}
                            </span>

                            <span className="font-medium text-slate-700">
                              ₹
                              {formatPrice(
                                product.price * item.quantity
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xl font-black text-orange-600">
                          ₹{formatPrice(combo.price)}
                        </span>

                        {originalPrice > 0 && (
                          <span className="text-sm text-slate-400 line-through">
                            ₹{formatPrice(originalPrice)}
                          </span>
                        )}
                      </div>

                      {savings > 0 && (
                        <p className="mt-1 text-sm font-bold text-green-600">
                          Save ₹{formatPrice(savings)}
                        </p>
                      )}
                    </div>

                    <div className="mt-5 flex gap-3">
                      <button
                        onClick={() => openCombo(combo)}
                        className="flex-1 rounded-lg bg-orange-50 px-3 py-2.5 text-sm font-bold text-orange-600 hover:bg-orange-100"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => deleteCombo(combo)}
                        className="flex-1 rounded-lg bg-red-50 px-3 py-2.5 text-sm font-bold text-red-600 hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default ComboManager;

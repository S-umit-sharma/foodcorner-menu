
import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

function ComboManager() {
  const [products, setProducts] = useState([]);
  const [comboItems, setComboItems] = useState([]);
  const [selectedCombo, setSelectedCombo] = useState("");
  const [selectedItems, setSelectedItems] = useState({});
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

    const [productResult, comboResult] = await Promise.all([
      supabase
        .from("products")
        .select("id, name_en, price, is_active")
        .eq("is_active", true)
        .order("name_en"),

      supabase
        .from("combo_items")
        .select("*"),
    ]);

    if (productResult.error || comboResult.error) {
      setError(
        productResult.error?.message || comboResult.error?.message
      );
      setLoading(false);
      return;
    }

    setProducts(productResult.data || []);
    setComboItems(comboResult.data || []);
    setLoading(false);
  };

  const openCombo = (comboId) => {
    setSelectedCombo(comboId);
    setError("");
    setSuccess("");

    const existingItems = {};

    comboItems
      .filter((item) => item.combo_product_id === comboId)
      .forEach((item) => {
        existingItems[item.item_product_id] = item.quantity;
      });

    setSelectedItems(existingItems);
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
    if (!selectedCombo) {
      setError("Please select a combo product.");
      return;
    }

    const items = Object.entries(selectedItems)
      .filter(([, quantity]) => Number(quantity) > 0)
      .map(([productId, quantity]) => ({
        combo_product_id: selectedCombo,
        item_product_id: productId,
        quantity: Number(quantity),
      }));

    if (items.length === 0) {
      setError("Please select at least one product for this combo.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const { error: deleteError } = await supabase
        .from("combo_items")
        .delete()
        .eq("combo_product_id", selectedCombo);

      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase
        .from("combo_items")
        .insert(items);

      if (insertError) throw insertError;

      await fetchData();
      setSuccess("Combo updated successfully!");
    } catch (err) {
      setError(err.message || "Unable to save combo.");
    } finally {
      setSaving(false);
    }
  };

  const deleteCombo = async () => {
    if (!selectedCombo) return;

    const combo = products.find((p) => p.id === selectedCombo);

    if (
      !window.confirm(
        `Remove all items from "${combo?.name_en}"?`
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from("combo_items")
      .delete()
      .eq("combo_product_id", selectedCombo);

    if (error) {
      setError(error.message);
      return;
    }

    setSelectedItems({});
    await fetchData();
    setSuccess("Combo items removed successfully.");
  };

  const availableItems = products.filter(
    (product) => product.id !== selectedCombo
  );

  if (loading) {
    return <p className="rounded-xl bg-white p-8">Loading combos...</p>;
  }

  return (
    <section>
      <div className="mb-6">
        <h3 className="text-xl font-bold">Manage Combos</h3>
        <p className="mt-1 text-sm text-slate-500">
          Select a combo product and add its included items.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-xl bg-green-50 p-4 text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="max-w-2xl rounded-2xl bg-white p-6 shadow-sm">
        <label className="block text-sm font-semibold">
          Select Combo Product
          <select
            value={selectedCombo}
            onChange={(e) => openCombo(e.target.value)}
            className="mt-2 w-full rounded-lg border p-3"
          >
            <option value="">Choose a combo</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name_en} - ₹{product.price}
              </option>
            ))}
          </select>
        </label>

        {selectedCombo && (
          <>
            <div className="mt-6">
              <h4 className="mb-3 font-bold">Included Products</h4>

              {availableItems.map((product) => (
                <div
                  key={product.id}
                  className="mb-3 flex items-center justify-between gap-4 rounded-xl border p-4"
                >
                  <div>
                    <p className="font-semibold">{product.name_en}</p>
                    <p className="text-sm text-slate-500">
                      ₹{product.price}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-500">
                      Qty
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={selectedItems[product.id] || ""}
                      onChange={(e) =>
                        updateQuantity(
                          product.id,
                          Number(e.target.value)
                        )
                      }
                      placeholder="0"
                      className="w-20 rounded-lg border p-2"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                onClick={deleteCombo}
                className="rounded-lg bg-red-50 px-4 py-3 font-semibold text-red-600"
              >
                Remove All Items
              </button>

              <button
                onClick={saveCombo}
                disabled={saving}
                className="rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Combo"}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default ComboManager;


import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import CategoryManager from "../components/CategoryManager";
import OfferManager from "../components/OfferManager";
import ComboManager from "../components/ComboManager";
import NoticeManager from "../components/NoticeManager";  

function Admin() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const emptyForm = {
  name_en: "",
  description_en: "",
  price: "",
  category_id: "",
  image_url: "",
  is_sold_out: false,
  is_available: true,
  is_active: true,
  display_order: 0,
};

  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      setError(error.message);
    } else {
      setProducts(data || []);
    }

    setLoading(false);
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name_en")
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Category fetch error:", error);
      return;
    }

    setCategories(data || []);
  };

  const updateForm = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const openAddForm = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setImageFile(null);
    setShowForm(true);
    setError("");
  };

  const openEditForm = (product) => {
    setEditingProduct(product);
    setForm({
  name_en: product.name_en || "",
  description_en: product.description_en || "",
  price: product.price ?? "",
  category_id: product.category_id || "",
  image_url: product.image_url || "",
  is_sold_out: product.is_sold_out || false,
  is_available: product.is_available ?? true,
  is_active: product.is_active ?? true,
  display_order: product.display_order ?? 0,
});
    setImageFile(null);
    setShowForm(true);
    setError("");
  };

  const uploadImage = async () => {
    if (!imageFile) return form.image_url;

    if (!imageFile.type.startsWith("image/")) {
      throw new Error("Please select a valid image file.");
    }

    if (imageFile.size > 5 * 1024 * 1024) {
      throw new Error("Image size must be less than 5 MB.");
    }

    const extension = imageFile.name.split(".").pop();
    const filePath = `${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(filePath, imageFile, {
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const saveProduct = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const image_url = await uploadImage();

      const productData = {
        ...form,
        price: Number(form.price),
        display_order: Number(form.display_order),
        image_url,
      };

      const result = editingProduct
        ? await supabase
            .from("products")
            .update(productData)
            .eq("id", editingProduct.id)
        : await supabase
            .from("products")
            .insert([productData]);

      if (result.error) throw result.error;

      setShowForm(false);
      setEditingProduct(null);
      setForm(emptyForm);
      setImageFile(null);
      await fetchProducts();
    } catch (err) {
      setError(err.message || "Unable to save product.");
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (product) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${product.name_en}"?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id);

    if (error) {
      setError(error.message);
      return;
    }

    await fetchProducts();
  };

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "products", label: "Products", icon: "🍔" },
    { id: "categories", label: "Categories", icon: "📂" },
    { id: "offers", label: "Offers", icon: "🏷️" },
{ id: "combos", label: "Combos", icon: "🍔" },
    { id: "notices", label: "Notices", icon: "📢" },
  ];

  return (
    <div className="min-h-screen bg-slate-100 md:flex">
      <aside className="bg-slate-950 p-5 text-white md:min-h-screen md:w-64">
        <h1 className="text-2xl font-black">
          Food<span className="text-orange-500">Corner.</span>
        </h1>
        <p className="mt-1 text-xs text-slate-400">OWNER DASHBOARD</p>

        <nav className="mt-8 flex gap-2 overflow-x-auto md:flex-col">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`whitespace-nowrap rounded-xl px-4 py-3 text-left text-sm font-semibold ${
                activeTab === item.id
                  ? "bg-orange-500 text-white"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 p-5 sm:p-8">
        <header className="mb-8">
          <p className="text-sm text-slate-500">FoodCorner Management</p>
          <h2 className="mt-1 text-3xl font-black capitalize text-slate-900">
            {activeTab}
          </h2>
        </header>

        {error && (
          <div className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {activeTab === "dashboard" && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Total Products", products.length, "🍔"],
              ["Categories", categories.length, "📂"],
              [
                "Available Products",
                products.filter(
                  (p) => p.is_active && p.is_available && !p.is_sold_out
                ).length,
                "✅",
              ],
            ].map(([label, value, icon]) => (
              <div key={label} className="rounded-2xl bg-white p-6 shadow-sm">
                <span className="text-3xl">{icon}</span>
                <p className="mt-4 text-sm text-slate-500">{label}</p>
                <h3 className="mt-1 text-3xl font-black">{value}</h3>
              </div>
            ))}
          </div>
        )}

        {activeTab === "products" && (
          <section>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold">Manage Products</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Add, update and manage your menu items.
                </p>
              </div>

              <button
                onClick={openAddForm}
                className="rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700"
              >
                + Add Product
              </button>
            </div>

            {loading ? (
              <p className="rounded-xl bg-white p-8 text-slate-500">
                Loading products...
              </p>
            ) : products.length === 0 ? (
              <p className="rounded-xl bg-white p-8 text-slate-500">
                No products found. Add your first product.
              </p>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="overflow-hidden rounded-2xl bg-white shadow-sm"
                  >
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name_en}
                        className="h-44 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-44 items-center justify-center bg-orange-50 text-5xl">
                        🍔
                      </div>
                    )}

                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="font-bold text-slate-900">
                          {product.name_en}
                        </h4>
                        <span className="font-bold text-orange-600">
                          ₹{product.price}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-slate-500">
                        {product.description_en || "No description"}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                        <span className={`rounded-full px-3 py-1 ${
                          product.is_sold_out
                            ? "bg-red-100 text-red-700"
                            : product.is_available
                              ? "bg-green-100 text-green-700"
                              : "bg-slate-100 text-slate-600"
                        }`}>
                          {product.is_sold_out
                            ? "Sold Out"
                            : product.is_available
                              ? "Available"
                              : "Unavailable"}
                        </span>

                        <span className={`rounded-full px-3 py-1 ${
                          product.is_active
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-600"
                        }`}>
                          {product.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div className="mt-5 flex gap-2">
                        <button
                          onClick={() => openEditForm(product)}
                          className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteProduct(product)}
                          className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showForm && (
              <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
                <div className="mx-auto my-8 max-w-2xl rounded-2xl bg-white p-6 shadow-xl sm:p-8">
                  <div className="mb-6 flex items-center justify-between gap-3">
                    <h3 className="text-xl font-bold">
                      {editingProduct ? "Edit Product" : "Add Product"}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="text-2xl text-slate-400 hover:text-slate-800"
                    >
                      ×
                    </button>
                  </div>

                  <form onSubmit={saveProduct} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="text-sm font-medium">
                        Product Name (English) *
                        <input
                          name="name_en"
                          value={form.name_en}
                          onChange={updateForm}
                          required
                          className="mt-1 w-full rounded-lg border p-3"
                        />
                      </label>

                      

                      <label className="text-sm font-medium">
                        Price (₹) *
                        <input
                          name="price"
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.price}
                          onChange={updateForm}
                          required
                          className="mt-1 w-full rounded-lg border p-3"
                        />
                      </label>

                      <label className="text-sm font-medium">
                        Category *
                        <select
                          name="category_id"
                          value={form.category_id}
                          onChange={updateForm}
                          required
                          className="mt-1 w-full rounded-lg border p-3"
                        >
                          <option value="">Select category</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name_en}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <label className="block text-sm font-medium">
                      Description (English)
                      <textarea
                        name="description_en"
                        value={form.description_en}
                        onChange={updateForm}
                        rows="2"
                        className="mt-1 w-full rounded-lg border p-3"
                      />
                    </label>

                   

                    <label className="block text-sm font-medium">
                      Product Image (maximum 5 MB)
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          setImageFile(e.target.files?.[0] || null)
                        }
                        className="mt-2 block w-full text-sm"
                      />
                    </label>

                    {form.image_url && !imageFile && (
                      <img
                        src={form.image_url}
                        alt="Current product"
                        className="h-24 w-24 rounded-lg object-cover"
                      />
                    )}

                    <label className="block text-sm font-medium">
                      Display Order
                      <input
                        name="display_order"
                        type="number"
                        min="0"
                        value={form.display_order}
                        onChange={updateForm}
                        className="mt-1 w-full rounded-lg border p-3"
                      />
                    </label>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          name="is_available"
                          checked={form.is_available}
                          onChange={updateForm}
                        />
                        Available
                      </label>

                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          name="is_sold_out"
                          checked={form.is_sold_out}
                          onChange={updateForm}
                        />
                        Sold Out
                      </label>

                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          name="is_active"
                          checked={form.is_active}
                          onChange={updateForm}
                        />
                        Active
                      </label>
                    </div>

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
                        {saving
                          ? "Saving..."
                          : editingProduct
                            ? "Update Product"
                            : "Save Product"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </section>
        )}

       {activeTab === "categories" && <CategoryManager />}
{activeTab === "offers" && <OfferManager />}
{activeTab === "combos" && <ComboManager />}

{activeTab === "notices" && <NoticeManager />}
      </main>
    </div>
  );
}

export default Admin;

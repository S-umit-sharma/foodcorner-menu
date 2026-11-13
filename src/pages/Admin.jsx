import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import CategoryManager from "../components/CategoryManager";
import OfferManager from "../components/OfferManager";
import ComboManager from "../components/ComboManager";
import NoticeManager from "../components/NoticeManager";

const EMPTY_FORM = {
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

const MENU_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "products", label: "Products", icon: "🍔" },
  { id: "categories", label: "Categories", icon: "📂" },
  { id: "offers", label: "Offers", icon: "🏷️" },
  { id: "combos", label: "Combos", icon: "🍱" },
  { id: "notices", label: "Notices", icon: "📢" },
];

function Admin() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    setError("");

    try {
      const { data, error: fetchError } = await supabase
        .from("products")
        .select("*")
        .order("display_order", { ascending: true });

      if (fetchError) throw fetchError;
      setProducts(data || []);
    } catch (err) {
      setError(err.message || "Unable to load products.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    const { data, error: fetchError } = await supabase
      .from("categories")
      .select("id, name_en")
      .order("display_order", { ascending: true });

    if (fetchError) {
      console.error("Category fetch error:", fetchError);
      return;
    }

    setCategories(data || []);
  };

  const updateForm = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const openAddForm = () => {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
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

  const closeForm = () => {
    if (saving) return;
    setShowForm(false);
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setImageFile(null);
  };

  const uploadImage = async () => {
    if (!imageFile) return form.image_url;

    if (!imageFile.type.startsWith("image/")) {
      throw new Error("Please select a valid image file.");
    }

    if (imageFile.size > 5 * 1024 * 1024) {
      throw new Error("Image size must be less than 5 MB.");
    }

    const extension = imageFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(filePath, imageFile, { upsert: false });

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
        : await supabase.from("products").insert([productData]);

      if (result.error) throw result.error;

      setShowForm(false);
      setEditingProduct(null);
      setForm(EMPTY_FORM);
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

    const { error: deleteError } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    await fetchProducts();
  };

  const formatPrice = (price) =>
    new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(
      Number(price) || 0
    );

  const availableProducts = products.filter(
    (product) =>
      product.is_active && product.is_available && !product.is_sold_out
  ).length;

  const activeLabel = MENU_ITEMS.find((item) => item.id === activeTab)?.label;

  const renderNavigation = (mobile = false) => (
    <nav
      aria-label="Admin navigation"
      className={
        mobile
          ? "flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          : "flex flex-1 flex-col gap-2"
      }
    >
      {MENU_ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => setActiveTab(item.id)}
          aria-current={activeTab === item.id ? "page" : undefined}
          className={`flex shrink-0 items-center gap-3 rounded-xl text-left text-sm font-semibold transition ${
            mobile ? "px-4 py-2.5" : "w-full px-4 py-3"
          } ${
            activeTab === item.id
              ? "bg-[#E02B2B] text-white shadow-lg shadow-red-950/20"
              : "text-slate-300 hover:bg-slate-800 hover:text-white"
          }`}
        >
          <span className="text-base" aria-hidden="true">
            {item.icon}
          </span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#F5F6FA] text-slate-900 md:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-slate-950 p-5 text-white md:flex lg:w-72">
        <a href="/" className="flex items-center gap-3 rounded-2xl px-2 py-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E02B2B] text-xl shadow-lg shadow-red-950/30">
             <img src="logo.jfif" alt="" />
          </span>
          <span className="min-w-0">
            <span className="block text-lg font-black tracking-tight">
              DSP <span className="text-[#FF625D]">Fast Food</span>
            </span>
            <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Owner dashboard
            </span>
          </span>
        </a>

        <div className="mb-3 mt-9 px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
          Manage store
        </div>
        {renderNavigation()}

        <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-semibold text-white">DSP Fast Food</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            Manage your menu, offers and store updates from one place.
          </p>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex text-xs font-bold text-orange-300 transition hover:text-white"
          >
            View customer menu ↗
          </a>
        </div>
      </aside>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        {/* Mobile brand header */}
        <div className="border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <div className="flex items-center justify-between gap-3">
            <a href="/" className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E02B2B] text-lg text-white">
                🍔
              </span>
              <span className="min-w-0">
                <span className="block truncate text-base font-black">
                  DSP <span className="text-[#E02B2B]">Fast Food</span>
                </span>
                <span className="block text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                  Owner dashboard
                </span>
              </span>
            </a>
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="shrink-0 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
            >
              View menu ↗
            </a>
          </div>
          <div className="-mx-4 mt-3 border-t border-slate-100 pt-3">
            {renderNavigation(true)}
          </div>
        </div>

        <main className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-9">
          <header className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E02B2B]">
                DSP Fast Food management
              </p>
              <h1 className="mt-1 text-2xl font-black capitalize tracking-tight text-slate-950 sm:text-3xl">
                {activeLabel || activeTab}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Manage your cafe menu and store content.
              </p>
            </div>
            {activeTab === "products" && (
              <button
                type="button"
                onClick={openAddForm}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#E02B2B] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-red-200 transition hover:bg-[#C41E1E] sm:w-auto"
              >
                <span className="text-lg leading-none">+</span> Add Product
              </button>
            )}
          </header>

          {error && (
            <div
              role="alert"
              className="mb-6 flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError("")}
                aria-label="Dismiss error"
                className="shrink-0 text-lg leading-none text-red-500"
              >
                ×
              </button>
            </div>
          )}

          {activeTab === "dashboard" && (
            <section>
              <div className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-[#7F1D1D] p-5 text-white shadow-lg sm:p-7">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-300">
                  Store overview
                </p>
                <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black sm:text-2xl">
                      Welcome to your dashboard
                    </h2>
                    <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-300">
                      Keep your food menu, categories and promotions up to date.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("products")}
                    className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-orange-50"
                  >
                    Manage products
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[
                  {
                    label: "Total products",
                    value: products.length,
                    icon: "🍔",
                    note: "All menu items",
                  },
                  {
                    label: "Categories",
                    value: categories.length,
                    icon: "📂",
                    note: "Organized menu groups",
                  },
                  {
                    label: "Available products",
                    value: availableProducts,
                    icon: "✅",
                    note: "Active and in stock",
                  },
                ].map((stat) => (
                  <article
                    key={stat.label}
                    className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-slate-500">
                        {stat.label}
                      </span>
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-xl">
                        {stat.icon}
                      </span>
                    </div>
                    <p className="mt-4 text-3xl font-black tracking-tight text-slate-950">
                      {loading ? "—" : stat.value}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{stat.note}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {activeTab === "products" && (
            <section>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-slate-900 sm:text-xl">
                    Your menu items
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Add products, update prices and control availability.
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
                  {products.length} products
                </span>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {[1, 2, 3, 4].map((item) => (
                    <div
                      key={item}
                      className="animate-pulse overflow-hidden rounded-2xl bg-white p-4 shadow-sm"
                    >
                      <div className="aspect-[16/10] rounded-xl bg-slate-100" />
                      <div className="mt-4 h-4 w-2/3 rounded bg-slate-100" />
                      <div className="mt-3 h-3 w-full rounded bg-slate-100" />
                      <div className="mt-5 h-9 rounded-lg bg-slate-100" />
                    </div>
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
                  <span className="text-4xl">🍔</span>
                  <h3 className="mt-3 font-bold text-slate-900">No products yet</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Add your first product to start building the menu.
                  </p>
                  <button
                    type="button"
                    onClick={openAddForm}
                    className="mt-5 rounded-xl bg-[#E02B2B] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#C41E1E]"
                  >
                    Add your first product
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {products.map((product) => (
                    <article
                      key={product.id}
                      className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                    >
                      <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden bg-[#FFF7F0]">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name_en}
                            loading="lazy"
                            className="h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <span className="text-6xl">🍔</span>
                        )}
                        {!product.is_active && (
                          <span className="absolute left-3 top-3 rounded-full bg-slate-900/80 px-2.5 py-1 text-[10px] font-bold text-white">
                            Inactive
                          </span>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col p-4 sm:p-5">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="min-w-0 break-words font-bold text-slate-900">
                            {product.name_en}
                          </h3>
                          <span className="shrink-0 text-base font-black text-[#E02B2B]">
                            ₹{formatPrice(product.price)}
                          </span>
                        </div>
                        <p className="mt-2 min-h-10 text-sm leading-relaxed text-slate-500">
                          {product.description_en || "No description added."}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold">
                          <span
                            className={`rounded-full px-2.5 py-1 ${
                              product.is_sold_out
                                ? "bg-red-50 text-red-700"
                                : product.is_available
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {product.is_sold_out
                              ? "Sold out"
                              : product.is_available
                                ? "Available"
                                : "Unavailable"}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 ${
                              product.is_active
                                ? "bg-blue-50 text-blue-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {product.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>

                        <div className="mt-auto flex gap-2 pt-5">
                          <button
                            type="button"
                            onClick={() => openEditForm(product)}
                            className="flex-1 rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteProduct(product)}
                            className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
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

      {/* Add / edit product modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-950/60 backdrop-blur-sm sm:items-center"
          style={{ padding: "16px", boxSizing: "border-box" }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeForm();
          }}
        >
          <div
            className="my-auto w-full overflow-y-auto rounded-3xl bg-white shadow-2xl"
            style={{
              width: "100%",
              maxWidth: "720px",
              maxHeight: "calc(100dvh - 32px)",
              padding: "clamp(22px, 4vw, 34px)",
              boxSizing: "border-box",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#E02B2B]">
                  Product management
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">
                  {editingProduct ? "Edit product" : "Add a product"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter the item details shown on your customer menu.
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                aria-label="Close product form"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-500 transition hover:bg-slate-200 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <form onSubmit={saveProduct} className="min-w-0 space-y-5" style={{ width: "100%", boxSizing: "border-box" }}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block min-w-0 text-sm font-semibold text-slate-700">
                  Product name (English) <span className="text-red-500">*</span>
                  <input
                    name="name_en"
                    value={form.name_en}
                    onChange={updateForm}
                    required
                    maxLength={120}
                    className="mt-2 min-h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal outline-none transition placeholder:text-slate-400 focus:border-[#E02B2B] focus:ring-4 focus:ring-red-50"
                    placeholder="e.g. Cheese Burger"
                  />
                </label>

                <label className="block min-w-0 text-sm font-semibold text-slate-700">
                  Price (₹) <span className="text-red-500">*</span>
                  <input
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={updateForm}
                    required
                    className="mt-2 min-h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal outline-none transition focus:border-[#E02B2B] focus:ring-4 focus:ring-red-50"
                    placeholder="0.00"
                  />
                </label>

                <label className="block min-w-0 text-sm font-semibold text-slate-700 sm:col-span-2">
                  Category <span className="text-red-500">*</span>
                  <select
                    name="category_id"
                    value={form.category_id}
                    onChange={updateForm}
                    required
                    className="mt-2 min-h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal outline-none transition focus:border-[#E02B2B] focus:ring-4 focus:ring-red-50"
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

              <label className="block text-sm font-semibold text-slate-700">
                Description (English)
                <textarea
                  name="description_en"
                  value={form.description_en}
                  onChange={updateForm}
                  rows={3}
                  className="mt-2 w-full min-w-0 resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal outline-none transition focus:border-[#E02B2B] focus:ring-4 focus:ring-red-50"
                  placeholder="Add a short description of the product"
                />
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                <label className="block min-w-0 text-sm font-semibold text-slate-700">
                  Product image <span className="font-normal text-slate-400">(maximum 5 MB)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    className="mt-2 block min-h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-normal text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-bold file:text-slate-700"
                  />
                  {imageFile && (
                    <span className="mt-1 block break-all text-xs text-slate-500">
                      Selected: {imageFile.name}
                    </span>
                  )}
                </label>

                {!imageFile && form.image_url && (
                  <img
                    src={form.image_url}
                    alt="Current product"
                    className="h-24 w-24 rounded-xl border border-slate-200 bg-[#FFF7F0] object-contain p-1"
                  />
                )}
              </div>

              <label className="block max-w-xs text-sm font-semibold text-slate-700">
                Display order
                <input
                  name="display_order"
                  type="number"
                  min="0"
                  value={form.display_order}
                  onChange={updateForm}
                  className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal outline-none transition focus:border-[#E02B2B] focus:ring-4 focus:ring-red-50"
                />
              </label>

              <div className="grid grid-cols-1 gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-3">
                {[
                  { name: "is_available", label: "Available" },
                  { name: "is_sold_out", label: "Sold out" },
                  { name: "is_active", label: "Active on menu" },
                ].map((option) => (
                  <label
                    key={option.name}
                    className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-700"
                  >
                    <input
                      type="checkbox"
                      name={option.name}
                      checked={form[option.name]}
                      onChange={updateForm}
                      className="h-4 w-4 rounded border-slate-300 accent-[#E02B2B]"
                    />
                    {option.label}
                  </label>
                ))}
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="min-h-12 rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 sm:min-w-28"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="min-h-12 rounded-xl bg-[#E02B2B] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-red-200 transition hover:bg-[#C41E1E] disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-40"
                >
                  {saving
                    ? "Saving..."
                    : editingProduct
                      ? "Update product"
                      : "Save product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Admin;

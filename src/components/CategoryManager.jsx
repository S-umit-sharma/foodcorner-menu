import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

const emptyForm = {
  name_en: "",
  description: "",
  image_url: "",
  display_order: 0,
  is_active: true,
};

function CategoryManager() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingCategory, setEditingCategory] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    setError("");

    const { data, error: fetchError } = await supabase
      .from("categories")
      .select("*")
      .order("display_order", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setCategories(data || []);
    }

    setLoading(false);
  };

  const updateForm = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const closeForm = () => {
    if (saving) return;
    setShowForm(false);
    setEditingCategory(null);
    setForm(emptyForm);
    setImageFile(null);
  };

  const openAddForm = () => {
    setEditingCategory(null);
    setForm(emptyForm);
    setImageFile(null);
    setError("");
    setShowForm(true);
  };

  const openEditForm = (category) => {
    setEditingCategory(category);
    setForm({
      name_en: category.name_en || "",
      description: category.description || "",
      image_url: category.image_url || "",
      display_order: category.display_order ?? 0,
      is_active: category.is_active ?? true,
    });
    setImageFile(null);
    setError("");
    setShowForm(true);
  };

  const uploadImage = async () => {
    if (!imageFile) return form.image_url;

    if (!imageFile.type.startsWith("image/")) {
      throw new Error("Please select a valid image.");
    }

    if (imageFile.size > 5 * 1024 * 1024) {
      throw new Error("Image must be smaller than 5 MB.");
    }

    const extension = imageFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `categories/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(filePath, imageFile, { upsert: false });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const saveCategory = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const image_url = await uploadImage();
      const categoryData = {
        name_en: form.name_en.trim(),
        description: form.description.trim(),
        image_url,
        display_order: Number(form.display_order),
        is_active: form.is_active,
      };

      const result = editingCategory
        ? await supabase
            .from("categories")
            .update(categoryData)
            .eq("id", editingCategory.id)
        : await supabase.from("categories").insert([categoryData]);

      if (result.error) throw result.error;

      setShowForm(false);
      setEditingCategory(null);
      setForm(emptyForm);
      setImageFile(null);
      await fetchCategories();
    } catch (err) {
      setError(err.message || "Unable to save category.");
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (category) => {
    const confirmed = window.confirm(
      `Delete "${category.name_en}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    setError("");
    const { error: deleteError } = await supabase
      .from("categories")
      .delete()
      .eq("id", category.id);

    if (deleteError) {
      const message = /foreign key|violates.*constraint/i.test(deleteError.message)
        ? "This category contains products. Deactivate it instead of deleting it."
        : deleteError.message;
      setError(message);
      return;
    }

    await fetchCategories();
  };

  const activeCount = categories.filter((category) => category.is_active).length;

  return (
    <section className="min-w-0 space-y-6">
      {/* Section heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-600">
            Menu organization
          </p>
          <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
            Manage Categories
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Organize the categories displayed on your DSP Fast Food customer menu.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddForm}
          className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-sm shadow-red-200 transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:w-auto"
        >
          <span className="text-lg leading-none">+</span>
          Add Category
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Total categories
          </p>
          <p className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">
            {categories.length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Active categories
          </p>
          <p className="mt-2 text-2xl font-black text-emerald-600 sm:text-3xl">
            {activeCount}
          </p>
        </div>
      </div>

      {error && !showForm && (
        <div
          role="alert"
          className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
        >
          {error}
        </div>
      )}

      {/* Category list */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="animate-pulse overflow-hidden rounded-2xl border border-slate-100 bg-white p-3 shadow-sm"
            >
              <div className="h-40 rounded-xl bg-slate-100" />
              <div className="mt-4 h-4 w-2/3 rounded bg-slate-100" />
              <div className="mt-2 h-3 w-full rounded bg-slate-100" />
            </div>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
          <div className="text-4xl" aria-hidden="true">🍽️</div>
          <h4 className="mt-3 text-base font-bold text-slate-900">No categories yet</h4>
          <p className="mt-1 text-sm text-slate-500">
            Add your first category to organize the customer menu.
          </p>
          <button
            type="button"
            onClick={openAddForm}
            className="mt-5 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700"
          >
            Add first category
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {categories.map((category) => (
            <article
              key={category.id}
              className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="relative h-40 overflow-hidden bg-orange-50 sm:h-44">
                {category.image_url ? (
                  <img
                    src={category.image_url}
                    alt={category.name_en}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-5xl" aria-hidden="true">
                    🍽️
                  </div>
                )}
                <span
                  className={`absolute right-3 top-3 rounded-full px-3 py-1 text-[11px] font-bold shadow-sm ${
                    category.is_active
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {category.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="flex flex-1 flex-col p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <h4 className="min-w-0 break-words text-base font-extrabold text-slate-900">
                    {category.name_en}
                  </h4>
                  <span className="shrink-0 rounded-lg bg-orange-50 px-2 py-1 text-[11px] font-bold text-red-600">
                    #{category.display_order ?? 0}
                  </span>
                </div>
                <p className="mt-2 min-h-10 flex-1 text-sm leading-5 text-slate-500">
                  {category.description || "No description added."}
                </p>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => openEditForm(category)}
                    className="min-h-10 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteCategory(category)}
                    className="min-h-10 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Add / edit modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center sm:p-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeForm();
          }}
        >
          <div className="my-auto w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 sm:rounded-3xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-7 sm:py-5">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-red-600">
                  DSP Fast Food · Categories
                </p>
                <h3 className="mt-1 text-lg font-black text-slate-900 sm:text-xl">
                  {editingCategory ? "Edit Category" : "Add Category"}
                </h3>
                <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                  Enter the details shown in your customer menu.
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                aria-label="Close category form"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <form onSubmit={saveCategory} className="max-h-[calc(100dvh-9rem)] space-y-5 overflow-y-auto px-5 py-5 sm:max-h-[calc(100dvh-12rem)] sm:px-7 sm:py-6">
              {error && (
                <div role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">
                  {error}
                </div>
              )}

              <label className="block text-sm font-semibold text-slate-700">
                Category name <span className="text-red-600">*</span>
                <input
                  name="name_en"
                  value={form.name_en}
                  onChange={updateForm}
                  required
                  maxLength={80}
                  placeholder="e.g. Burgers"
                  className="mt-2 block min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                />
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Description
                <textarea
                  name="description"
                  value={form.description}
                  onChange={updateForm}
                  rows={3}
                  placeholder="Write a short category description"
                  className="mt-2 block w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                />
              </label>

              <div>
                <label className="block text-sm font-semibold text-slate-700">
                  Category image <span className="font-normal text-slate-400">(maximum 5 MB)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    className="mt-2 block w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-red-50 file:px-3 file:py-2 file:text-xs file:font-bold file:text-red-700 hover:file:bg-red-100"
                  />
                </label>
                {imageFile && (
                  <p className="mt-2 break-all text-xs text-slate-500">
                    Selected: {imageFile.name}
                  </p>
                )}
                {form.image_url && !imageFile && (
                  <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <img
                      src={form.image_url}
                      alt="Current category"
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-700">Current image</p>
                      <p className="mt-1 text-xs text-slate-500">Choose a new image above to replace it.</p>
                    </div>
                  </div>
                )}
              </div>

              <label className="block text-sm font-semibold text-slate-700">
                Display order
                <input
                  name="display_order"
                  type="number"
                  min="0"
                  value={form.display_order}
                  onChange={updateForm}
                  className="mt-2 block min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                />
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active}
                  onChange={updateForm}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-red-600"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-800">Active category</span>
                  <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                    Active categories can be displayed on the customer menu.
                  </span>
                </span>
              </label>

              <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:flex sm:justify-end">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="min-h-11 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:min-w-28"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="min-h-11 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-36"
                >
                  {saving ? "Saving..." : editingCategory ? "Update Category" : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default CategoryManager;

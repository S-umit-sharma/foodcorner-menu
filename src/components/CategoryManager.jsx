
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

    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      setError(error.message);
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

    const extension = imageFile.name.split(".").pop();
    const filePath = `categories/${crypto.randomUUID()}.${extension}`;

    const { error } = await supabase.storage
      .from("product-images")
      .upload(filePath, imageFile);

    if (error) throw error;

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
        : await supabase
            .from("categories")
            .insert([categoryData]);

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
      `Delete "${category.name_en}"?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", category.id);

    if (error) {
      setError(
        error.message.includes("foreign key")
          ? "This category contains products. Deactivate it instead of deleting it."
          : error.message
      );
      return;
    }

    await fetchCategories();
  };

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold">Manage Categories</h3>
          <p className="mt-1 text-sm text-slate-500">
            Organize the categories displayed on your customer menu.
          </p>
        </div>

        <button
          onClick={openAddForm}
          className="rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700"
        >
          + Add Category
        </button>
      </div>

      {error && (
        <p className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="rounded-xl bg-white p-8 text-slate-500">
          Loading categories...
        </p>
      ) : categories.length === 0 ? (
        <p className="rounded-xl bg-white p-8 text-slate-500">
          No categories found.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <div
              key={category.id}
              className="overflow-hidden rounded-2xl bg-white shadow-sm"
            >
              {category.image_url ? (
                <img
                  src={category.image_url}
                  alt={category.name_en}
                  className="h-40 w-full object-cover"
                />
              ) : (
                <div className="flex h-40 items-center justify-center bg-orange-50 text-5xl">
                  🍽️
                </div>
              )}

              <div className="p-5">
                <h4 className="font-bold text-slate-900">
                  {category.name_en}
                </h4>

                <p className="mt-2 text-sm text-slate-500">
                  {category.description || "No description"}
                </p>

                <div className="mt-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      category.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {category.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="mt-5 flex gap-2">
                  <button
                    onClick={() => openEditForm(category)}
                    className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => deleteCategory(category)}
                    className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-600"
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
          <div className="mx-auto my-8 max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold">
                {editingCategory ? "Edit Category" : "Add Category"}
              </h3>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-2xl text-slate-400"
              >
                ×
              </button>
            </div>

            <form onSubmit={saveCategory} className="space-y-4">
              <label className="block text-sm font-medium">
                Category Name *
                <input
                  name="name_en"
                  value={form.name_en}
                  onChange={updateForm}
                  required
                  className="mt-1 w-full rounded-lg border p-3"
                  placeholder="e.g. Burgers"
                />
              </label>

              <label className="block text-sm font-medium">
                Description
                <textarea
                  name="description"
                  value={form.description}
                  onChange={updateForm}
                  rows="3"
                  className="mt-1 w-full rounded-lg border p-3"
                  placeholder="Category description"
                />
              </label>

              <label className="block text-sm font-medium">
                Category Image (maximum 5 MB)
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
                  alt="Current category"
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

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active}
                  onChange={updateForm}
                />
                Active (visible to customers)
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
                  {saving
                    ? "Saving..."
                    : editingCategory
                      ? "Update Category"
                      : "Save Category"}
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

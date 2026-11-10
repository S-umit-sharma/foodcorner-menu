
import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

const emptyForm = {
  title_en: "",
  content_en: "",
  notice_type: "notice",
  display_type: "banner",
  is_active: true,
  start_at: "",
  end_at: "",
  display_order: 0,
};

function NoticeManager() {
  const [notices, setNotices] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingNotice, setEditingNotice] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("store_notices")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      setError(error.message);
    } else {
      setNotices(data || []);
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

  const toLocalDateTime = (value) => {
    if (!value) return "";

    const date = new Date(value);
    const offset = date.getTimezoneOffset();

    return new Date(date.getTime() - offset * 60000)
      .toISOString()
      .slice(0, 16);
  };

  const openAddForm = () => {
    setEditingNotice(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const openEditForm = (notice) => {
    setEditingNotice(notice);

    setForm({
      title_en: notice.title_en || "",
      content_en: notice.content_en || "",
      notice_type: notice.notice_type || "notice",
      display_type: notice.display_type || "banner",
      is_active: notice.is_active ?? true,
      start_at: toLocalDateTime(notice.start_at),
      end_at: toLocalDateTime(notice.end_at),
      display_order: notice.display_order ?? 0,
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const saveNotice = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (
        form.start_at &&
        form.end_at &&
        new Date(form.end_at) <= new Date(form.start_at)
      ) {
        throw new Error("End date must be after start date.");
      }

      const noticeData = {
        ...form,
        display_order: Number(form.display_order),
        start_at: form.start_at
          ? new Date(form.start_at).toISOString()
          : null,
        end_at: form.end_at
          ? new Date(form.end_at).toISOString()
          : null,
      };

      const result = editingNotice
        ? await supabase
            .from("store_notices")
            .update(noticeData)
            .eq("id", editingNotice.id)
        : await supabase
            .from("store_notices")
            .insert([noticeData]);

      if (result.error) throw result.error;

      setShowForm(false);
      setEditingNotice(null);
      setForm(emptyForm);

      await fetchNotices();
      setSuccess(
        editingNotice
          ? "Notice updated successfully!"
          : "Notice created successfully!"
      );
    } catch (err) {
      setError(err.message || "Unable to save notice.");
    } finally {
      setSaving(false);
    }
  };

  const deleteNotice = async (notice) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${notice.title_en}"?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("store_notices")
      .delete()
      .eq("id", notice.id);

    if (error) {
      setError(error.message);
      return;
    }

    await fetchNotices();
    setSuccess("Notice deleted successfully!");
  };

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold">Manage Notices</h3>
          <p className="mt-1 text-sm text-slate-500">
            Create announcements and manage store information.
          </p>
        </div>

        <button
          onClick={openAddForm}
          className="rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700"
        >
          + Add Notice
        </button>
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

      {loading ? (
        <p className="rounded-xl bg-white p-8 text-slate-500">
          Loading notices...
        </p>
      ) : notices.length === 0 ? (
        <p className="rounded-xl bg-white p-8 text-slate-500">
          No notices found. Create your first notice.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {notices.map((notice) => (
            <div
              key={notice.id}
              className="rounded-2xl bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <h4 className="font-bold">{notice.title_en}</h4>

                <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold capitalize text-orange-700">
                  {notice.display_type}
                </span>
              </div>

              <p className="mt-3 text-sm text-slate-500">
                {notice.content_en}
              </p>

              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p>
                  Type: <span className="capitalize">{notice.notice_type}</span>
                </p>
                <p>
                  Status:{" "}
                  <span
                    className={
                      notice.is_active
                        ? "font-semibold text-green-600"
                        : "font-semibold text-slate-500"
                    }
                  >
                    {notice.is_active ? "Active" : "Inactive"}
                  </span>
                </p>
                <p>Order: {notice.display_order}</p>
              </div>

              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => openEditForm(notice)}
                  className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
                >
                  Edit
                </button>

                <button
                  onClick={() => deleteNotice(notice)}
                  className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
          <div className="mx-auto my-8 max-w-2xl rounded-2xl bg-white p-6 shadow-xl sm:p-8">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold">
                {editingNotice ? "Edit Notice" : "Add Notice"}
              </h3>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-2xl text-slate-400"
              >
                ×
              </button>
            </div>

            <form onSubmit={saveNotice} className="space-y-4">
              <label className="block text-sm font-medium">
                Title *
                <input
                  name="title_en"
                  value={form.title_en}
                  onChange={updateForm}
                  required
                  className="mt-1 w-full rounded-lg border p-3"
                />
              </label>

              <label className="block text-sm font-medium">
                Content *
                <textarea
                  name="content_en"
                  value={form.content_en}
                  onChange={updateForm}
                  rows="4"
                  required
                  className="mt-1 w-full rounded-lg border p-3"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium">
                  Notice Type
                  <select
                    name="notice_type"
                    value={form.notice_type}
                    onChange={updateForm}
                    className="mt-1 w-full rounded-lg border p-3"
                  >
                    <option value="notice">Notice</option>
                    <option value="announcement">Announcement</option>
                    <option value="terms">Terms & Conditions</option>
                    <option value="privacy">Privacy Policy</option>
                  </select>
                </label>

                <label className="block text-sm font-medium">
                  Display Type
                  <select
                    name="display_type"
                    value={form.display_type}
                    onChange={updateForm}
                    className="mt-1 w-full rounded-lg border p-3"
                  >
                    <option value="banner">Banner</option>
                    <option value="popup">Popup</option>
                    <option value="page">Page</option>
                  </select>
                </label>
              </div>

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

              <label className="block text-sm font-medium">
                Display Order
                <input
                  type="number"
                  min="0"
                  name="display_order"
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
                  {saving
                    ? "Saving..."
                    : editingNotice
                      ? "Update Notice"
                      : "Save Notice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default NoticeManager;

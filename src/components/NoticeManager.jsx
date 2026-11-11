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

const inputClassName =
  "mt-2 block w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10";

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

    const { data, error: fetchError } = await supabase
      .from("store_notices")
      .select("*")
      .order("display_order", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
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
    if (Number.isNaN(date.getTime())) return "";
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000)
      .toISOString()
      .slice(0, 16);
  };

  const formatDateTime = (value) => {
    if (!value) return "Not scheduled";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Invalid date";
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
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

  const closeForm = () => {
    if (saving) return;
    setShowForm(false);
    setEditingNotice(null);
    setForm(emptyForm);
    setError("");
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
        title_en: form.title_en.trim(),
        content_en: form.content_en.trim(),
        display_order: Number(form.display_order),
        start_at: form.start_at
          ? new Date(form.start_at).toISOString()
          : null,
        end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
      };

      const result = editingNotice
        ? await supabase
            .from("store_notices")
            .update(noticeData)
            .eq("id", editingNotice.id)
        : await supabase.from("store_notices").insert([noticeData]);

      if (result.error) throw result.error;

      const wasEditing = Boolean(editingNotice);
      setShowForm(false);
      setEditingNotice(null);
      setForm(emptyForm);
      await fetchNotices();
      setSuccess(
        wasEditing
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

    setError("");
    setSuccess("");
    const { error: deleteError } = await supabase
      .from("store_notices")
      .delete()
      .eq("id", notice.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    await fetchNotices();
    setSuccess("Notice deleted successfully!");
  };

  const getScheduleLabel = (notice) => {
    const now = Date.now();
    const startsAt = notice.start_at ? new Date(notice.start_at).getTime() : null;
    const endsAt = notice.end_at ? new Date(notice.end_at).getTime() : null;

    if (!notice.is_active) return "Inactive";
    if (startsAt && startsAt > now) return "Scheduled";
    if (endsAt && endsAt < now) return "Expired";
    return "Active";
  };

  return (
    <section className="w-full min-w-0 space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-orange-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-600">
            Store communication
          </p>
          <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
            Manage Notices
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Create announcements, banners and important store information for your customers.
          </p>
        </div>
        <button
          type="button"
          onClick={openAddForm}
          className="inline-flex w-full shrink-0 items-center justify-center rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-500/20 sm:w-auto"
        >
          <span className="mr-2 text-lg leading-none">+</span> Add Notice
        </button>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          <span className="font-bold">!</span>
          <p className="min-w-0 flex-1 break-words">{error}</p>
          <button type="button" onClick={() => setError("")} aria-label="Dismiss error" className="font-bold text-red-500">×</button>
        </div>
      )}
      {success && (
        <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-green-100 bg-green-50 p-4 text-sm font-medium text-green-700">
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess("")} aria-label="Dismiss success message" className="font-bold">×</button>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="animate-pulse rounded-2xl border border-slate-100 bg-white p-5">
              <div className="h-5 w-2/3 rounded bg-slate-100" />
              <div className="mt-4 h-3 w-full rounded bg-slate-100" />
              <div className="mt-2 h-3 w-4/5 rounded bg-slate-100" />
              <div className="mt-6 h-9 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      ) : notices.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center sm:py-16">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl">📢</div>
          <h4 className="mt-4 text-lg font-bold text-slate-900">No notices yet</h4>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
            Create your first notice to share announcements and store information with customers.
          </p>
          <button type="button" onClick={openAddForm} className="mt-5 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700">
            Create first notice
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {notices.map((notice) => {
            const scheduleLabel = getScheduleLabel(notice);
            const statusClass =
              scheduleLabel === "Active"
                ? "bg-green-50 text-green-700 ring-green-100"
                : scheduleLabel === "Scheduled"
                  ? "bg-blue-50 text-blue-700 ring-blue-100"
                  : scheduleLabel === "Expired"
                    ? "bg-amber-50 text-amber-700 ring-amber-100"
                    : "bg-slate-100 text-slate-600 ring-slate-200";

            return (
              <article key={notice.id} className="flex min-w-0 flex-col rounded-2xl border border-orange-100/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-lg">📢</span>
                    <div className="min-w-0">
                      <h4 className="break-words text-base font-bold leading-6 text-slate-900">{notice.title_en}</h4>
                      <p className="mt-1 text-xs capitalize text-slate-400">{notice.notice_type?.replaceAll("_", " ")}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold capitalize ring-1 ring-inset ${statusClass}`}>
                    {scheduleLabel}
                  </span>
                </div>

                <p className="mt-4 line-clamp-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                  {notice.content_en || "No content provided."}
                </p>

                <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3.5 text-xs sm:p-4">
                  <div className="min-w-0">
                    <p className="text-slate-400">Display type</p>
                    <p className="mt-1 font-semibold capitalize text-slate-700">{notice.display_type}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-slate-400">Display order</p>
                    <p className="mt-1 font-semibold text-slate-700">{notice.display_order}</p>
                  </div>
                  <div className="col-span-2 min-w-0 border-t border-slate-200 pt-3">
                    <p className="text-slate-400">Schedule</p>
                    <p className="mt-1 break-words font-medium leading-5 text-slate-700">
                      {formatDateTime(notice.start_at)}
                      <span className="mx-1 text-slate-400">→</span>
                      {formatDateTime(notice.end_at)}
                    </p>
                  </div>
                </div>

                <div className="mt-auto flex gap-2 pt-5">
                  <button type="button" onClick={() => openEditForm(notice)} className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-4 focus:ring-slate-300">
                    Edit
                  </button>
                  <button type="button" onClick={() => deleteNotice(notice)} className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 focus:outline-none focus:ring-4 focus:ring-red-100">
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center sm:p-6">
          <div role="dialog" aria-modal="true" aria-labelledby="notice-form-title" className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:rounded-3xl">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4 sm:px-7 sm:py-5">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-red-600">Store communication</p>
                <h3 id="notice-form-title" className="mt-1 text-lg font-black text-slate-900 sm:text-xl">
                  {editingNotice ? "Edit Notice" : "Create Notice"}
                </h3>
              </div>
              <button type="button" onClick={closeForm} disabled={saving} aria-label="Close form" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-500 transition hover:bg-slate-200 disabled:opacity-50">×</button>
            </div>

            <form onSubmit={saveNotice} className="space-y-5 px-5 py-5 sm:px-7 sm:py-6">
              <label className="block text-sm font-semibold text-slate-700">
                Notice title <span className="text-red-600">*</span>
                <input name="title_en" value={form.title_en} onChange={updateForm} required maxLength={120} placeholder="Enter a clear notice title" className={inputClassName} />
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Content <span className="text-red-600">*</span>
                <textarea name="content_en" value={form.content_en} onChange={updateForm} rows={4} required placeholder="Write the message customers will see" className={`${inputClassName} resize-y`} />
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Notice type
                  <select name="notice_type" value={form.notice_type} onChange={updateForm} className={inputClassName}>
                    <option value="notice">Notice</option>
                    <option value="announcement">Announcement</option>
                    <option value="terms">Terms &amp; Conditions</option>
                    <option value="privacy">Privacy Policy</option>
                  </select>
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Display type
                  <select name="display_type" value={form.display_type} onChange={updateForm} className={inputClassName}>
                    <option value="banner">Banner</option>
                    <option value="popup">Popup</option>
                    <option value="page">Page</option>
                  </select>
                </label>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:p-5">
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-slate-800">Display schedule</h4>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Leave either date blank when the notice has no start or end limit.</p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Start date
                    <input type="datetime-local" name="start_at" value={form.start_at} onChange={updateForm} className={inputClassName} />
                  </label>
                  <label className="block text-sm font-semibold text-slate-700">
                    End date
                    <input type="datetime-local" name="end_at" value={form.end_at} onChange={updateForm} min={form.start_at || undefined} className={inputClassName} />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Display order
                  <input type="number" min="0" name="display_order" value={form.display_order} onChange={updateForm} className={inputClassName} />
                </label>
                <label className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                  <input type="checkbox" name="is_active" checked={form.is_active} onChange={updateForm} className="h-4 w-4 accent-red-600" />
                  Active (enabled)
                </label>
              </div>

              {error && <div role="alert" className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button type="button" onClick={closeForm} disabled={saving} className="w-full rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 sm:w-auto">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="w-full rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-500/20 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
                  {saving ? "Saving..." : editingNotice ? "Update Notice" : "Save Notice"}
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

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";
import { getProducts } from "../services/productService";

function Menu() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [offers, setOffers] = useState([]);
  const [notices, setNotices] = useState([]);
  const [isPopupOpen, setIsPopupOpen] = useState(true);
  const [comboItems, setComboItems] = useState([]);
  const [combos, setCombos] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    const loadMenu = async () => {
      try {
        setLoading(true);
        setError("");

        const [
          productData,
          categoryResult,
          offerResult,
          noticeResult,
          comboResult,
          comboMasterResult,
        ] = await Promise.all([
          getProducts(),

          supabase
            .from("categories")
            .select("*")
            .eq("is_active", true)
            .order("display_order"),

          supabase
            .from("offers")
            .select("*, products(name_en, price, image_url)")
            .eq("is_active", true),

          supabase
            .from("store_notices")
            .select("*")
            .eq("is_active", true)
            .order("display_order"),
          supabase.from("combo_items").select("*"),

          supabase
            .from("combos")
            .select("*")
            .eq("is_active", true)
            .order("created_at", { ascending: false }),
        ]);

        setProducts(productData || []);

        if (categoryResult.error) throw categoryResult.error;
        if (offerResult.error) throw offerResult.error;
        if (noticeResult.error) throw noticeResult.error;
        if (comboResult.error) throw comboResult.error;
        if (comboMasterResult.error) throw comboMasterResult.error;

        setComboItems(comboResult.data || []);
        setCombos(comboMasterResult.data || []);
        setCategories(categoryResult.data || []);
        setOffers(offerResult.data || []);
        setNotices(noticeResult.data || []);
      } catch (err) {
        console.error("Menu loading error:", err);
        setError(err.message || "Unable to load the menu.");
      } finally {
        setLoading(false);
      }
    };

    loadMenu();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = (product.name_en || "")
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesCategory =
        selectedCategory === "all" || product.category_id === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategory]);

  const formatPrice = (price) =>
    new Intl.NumberFormat("en-IN").format(price ?? 0);
const getComboPricing = (combo) => {
  const items = comboItems.filter(
    (item) =>
      item.combo_id === combo.id &&
      Number(item.quantity) > 0
  );

  const originalPrice = items.reduce((total, item) => {
    const product = products.find(
      (p) => p.id === item.item_product_id
    );

    if (!product) return total;

    return total + Number(product.price) * Number(item.quantity);
  }, 0);

  const comboPrice = Number(combo.price);

  return {
    items,
    originalPrice,
    comboPrice,
    savings: Math.max(0, originalPrice - comboPrice),
  };
};

  const getProductOffer = (product) => {
    const now = new Date();

    const applicableOffers = offers.filter((offer) => {
      const isForProduct = !offer.product_id || offer.product_id === product.id;

      const hasStarted = !offer.start_at || new Date(offer.start_at) <= now;

      const hasNotExpired = !offer.end_at || new Date(offer.end_at) >= now;

      return offer.is_active && isForProduct && hasStarted && hasNotExpired;
    });

    if (applicableOffers.length === 0) return null;

    const bestOffer = applicableOffers
      .map((offer) => {
        const discount =
          offer.discount_type === "percentage"
            ? (product.price * offer.discount_value) / 100
            : offer.discount_value;

        return {
          ...offer,
          discount: Math.min(Math.max(discount, 0), product.price),
        };
      })
      .sort((a, b) => b.discount - a.discount)[0];

    return {
      ...bestOffer,
      offerPrice: product.price - bestOffer.discount,
    };
  };
  const activeNotice = notices.find(
    (notice) =>
      notice.display_type === "banner" &&
      (notice.notice_type === "announcement" ||
        notice.notice_type === "notice"),
  );

  const popupNotice = notices.find((notice) => notice.display_type === "popup");
  const heroImage = products.find(
    (product) => product.image_url && !product.is_sold_out,
  )?.image_url;

  return (
    <div className="min-h-screen bg-[#fffaf4] text-slate-900">
      {/* Notice Popup */}
      {popupNotice && isPopupOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <button
              onClick={() => setIsPopupOpen(false)}
              className="absolute right-4 top-4 text-2xl text-slate-400 hover:text-red-500"
            >
              &times;
            </button>

            <div className="mb-4 text-5xl">📢</div>

            <h2 className="text-2xl font-black text-slate-900">
              {popupNotice.title_en}
            </h2>

            <p className="mt-3 leading-7 text-slate-600">
              {popupNotice.content_en}
            </p>

            <button
              onClick={() => setIsPopupOpen(false)}
              className="mt-6 w-full rounded-full bg-orange-500 px-5 py-3 font-bold text-white hover:bg-orange-600"
            >
              Got it
            </button>
          </div>
        </div>
      )}
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-orange-100 bg-white/95 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <a href="#" className="flex items-center gap-2">
            <span className="text-4xl">🍔</span>
            <div>
              <h1 className="text-2xl font-black tracking-tight">
                Food<span className="text-orange-500">Corner.</span>
              </h1>
              <p className="text-[10px] font-semibold tracking-wider text-slate-500">
                FRESH • TASTY • AFFORDABLE
              </p>
            </div>
          </a>

          <span className="hidden items-center gap-2 rounded-full bg-green-50 px-3 py-2 text-xs font-bold text-green-700 sm:flex">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Open
          </span>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        {/* Hero */}
        <section className="relative isolate mb-7 min-h-[270px] overflow-hidden rounded-3xl bg-gradient-to-r from-orange-100 via-orange-50 to-amber-100">
          {heroImage && (
            <img
              src={heroImage}
              alt="Featured food"
              className="absolute inset-y-0 right-0 -z-10 h-full w-full object-cover opacity-40 sm:w-3/5 sm:opacity-100"
            />
          )}

          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-orange-50 via-orange-50/95 to-transparent" />

          <div className="max-w-xl px-6 py-12 sm:px-10 sm:py-16">
            <p className="mb-3 text-sm font-extrabold uppercase tracking-widest text-orange-600">
              Welcome to FoodCorner
            </p>

            <h2 className="text-4xl font-black leading-tight sm:text-6xl">
              Good Food,
              <span className="block text-orange-500">Great Mood!</span>
            </h2>

            <p className="mt-4 max-w-md text-sm leading-6 text-slate-600 sm:text-base">
              Explore our delicious menu, freshly prepared with love and served
              with happiness.
            </p>

            <a
              href="#menu"
              className="mt-6 inline-flex rounded-full bg-orange-500 px-6 py-3 font-bold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
            >
              Explore Menu →
            </a>
          </div>
        </section>

        {/* Special Offers */}
        {offers.length > 0 && (
          <section className="mb-8">
            <div className="mb-4">
              <h2 className="text-2xl font-extrabold">🔥 Special Offers</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {offers.map((offer) => (
                <article
                  key={offer.id}
                  className="flex items-center gap-4 rounded-2xl border border-orange-100 bg-white p-4 shadow-sm"
                >
                  {offer.products?.image_url ? (
                    <img
                      src={offer.products.image_url}
                      alt={offer.products.name_en || "Offer"}
                      className="h-20 w-20 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-orange-50 text-3xl">
                      🎁
                    </div>
                  )}

                  <div className="min-w-0">
                    <h3 className="font-bold">{offer.title_en}</h3>

                    <p className="mt-1 text-sm text-slate-500">
                      {offer.description_en}
                    </p>

                    <p className="mt-2 text-sm font-extrabold text-orange-600">
                      {offer.discount_type === "percentage"
                        ? `${offer.discount_value}% OFF`
                        : `₹${formatPrice(offer.discount_value)} OFF`}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

{/* Custom Combos */}
{combos.length > 0 && (
  <section className="mb-8">
    <div className="mb-4">
      <h2 className="text-2xl font-extrabold">
        🍔 Special Combo Deals
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Enjoy more food at exciting prices!
      </p>
    </div>

    <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {combos.map((combo) => {
        const pricing = getComboPricing(combo);

        return (
          <article
            key={combo.id}
            className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="flex h-28 items-center justify-center bg-gradient-to-br from-orange-100 to-amber-50 sm:h-36">
              <span className="text-6xl">🍔</span>
            </div>

            <div className="p-3 sm:p-4">
              <span className="rounded-full bg-orange-50 px-2 py-1 text-[10px] font-bold text-orange-600">
                COMBO DEAL
              </span>

              <h3 className="mt-2 text-sm font-extrabold sm:text-base">
                {combo.name}
              </h3>

              <div className="mt-3 space-y-2">
                {pricing.items.map((item) => {
                  const product = products.find(
                    (p) => p.id === item.item_product_id
                  );

                  if (!product) return null;

                  return (
                    <div
                      key={item.id}
                      className="flex justify-between gap-2 text-xs text-slate-600"
                    >
                      <span>
                        {product.name_en} × {item.quantity}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 border-t border-orange-50 pt-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xl font-black text-orange-600">
                    ₹{formatPrice(pricing.comboPrice)}
                  </span>

                  {pricing.originalPrice > 0 && (
                    <span className="text-xs text-slate-400 line-through">
                      ₹{formatPrice(pricing.originalPrice)}
                    </span>
                  )}
                </div>

                {pricing.savings > 0 && (
                  <p className="mt-1 text-xs font-bold text-green-600">
                    Save ₹{formatPrice(pricing.savings)}
                  </p>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  </section>
)}


        {/* Categories */}
        <section id="menu" className="scroll-mt-24">
          <div className="mb-5 flex flex-nowrap gap-3 overflow-x-auto pb-3 whitespace-nowrap">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`rounded-full border px-6 py-3 text-sm font-bold transition ${
                selectedCategory === "all"
                  ? "border-orange-500 bg-orange-500 text-white"
                  : "border-orange-100 bg-white hover:border-orange-400"
              }`}
            >
              All Items
            </button>

           {categories
  .filter(
    (category) =>
      category.name_en.toLowerCase() !== "combo offers"
  )
  .map((category) => (
    <button
      key={category.id}
      onClick={() => setSelectedCategory(category.id)}
      className={`rounded-full border px-6 py-3 text-sm font-bold transition ${
        selectedCategory === category.id
          ? "border-orange-500 bg-orange-500 text-white"
          : "border-orange-100 bg-white hover:border-orange-400"
      }`}
    >
      {category.name_en}
    </button>
  ))}
          </div>

          {/* Heading and Search */}
          <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-3xl font-black">Our Menu</h2>
              <p className="mt-1 text-sm text-slate-500">
                Delicious items to explore
              </p>
            </div>

            <div className="relative w-full sm:max-w-sm">
              <span className="absolute left-4 top-1/2 -translate-y-1/2">
                🔍
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search food..."
                className="w-full rounded-full border border-orange-100 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              />
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="animate-pulse rounded-2xl bg-white p-3 shadow-sm"
                >
                  <div className="h-36 rounded-xl bg-orange-100" />
                  <div className="mt-3 h-4 w-2/3 rounded bg-orange-100" />
                  <div className="mt-2 h-4 w-1/2 rounded bg-orange-50" />
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="rounded-2xl bg-red-50 p-8 text-center text-red-700">
              <h3 className="font-bold">Unable to load menu</h3>
              <p className="mt-2 text-sm">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 rounded-full bg-orange-500 px-5 py-2 font-bold text-white"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Products */}
          {!loading && !error && filteredProducts.length > 0 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {filteredProducts.map((product) => {
                const productOffer = getProductOffer(product);
                const comboPricing = getComboPricing(product);

                return (
                  <article
                    key={product.id}
                    className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="relative h-36 overflow-hidden bg-orange-50 sm:h-48">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name_en}
                          loading="lazy"
                          className={`h-full w-full object-cover ${
                            product.is_sold_out ? "opacity-50" : ""
                          }`}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-6xl">
                          🍔
                        </div>
                      )}

                      <span
                        className={`absolute left-2 top-2 rounded-md px-2 py-1 text-[10px] font-extrabold sm:text-xs ${
                          product.is_sold_out
                            ? "bg-red-600 text-white"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {product.is_sold_out ? "Sold Out" : "Available"}
                      </span>
                      {productOffer && !product.is_sold_out && (
                        <span className="absolute right-2 top-2 rounded-md bg-red-600 px-2 py-1 text-[10px] font-extrabold text-white shadow sm:text-xs">
                          {productOffer.discount_type === "percentage"
                            ? `${formatPrice(productOffer.discount_value)}% OFF`
                            : `₹${formatPrice(productOffer.discount_value)} OFF`}
                        </span>
                      )}
                    </div>

                    <div className="p-3 sm:p-4">
                      <h3 className="line-clamp-1 text-sm font-extrabold sm:text-base">
                        {product.name_en}
                      </h3>

                      <p className="mt-1 line-clamp-2 min-h-9 text-xs text-slate-500 sm:text-sm">
                        {product.description_en}
                      </p>

                      <div className="mt-3 border-t border-orange-50 pt-3">
                        {comboPricing && !product.is_sold_out ? (
                          <>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-xl font-black text-orange-600">
                                ₹{formatPrice(comboPricing.comboPrice)}
                              </p>

                              <p className="text-sm font-semibold text-slate-400 line-through">
                                ₹{formatPrice(comboPricing.originalPrice)}
                              </p>
                            </div>

                            {comboPricing.savings > 0 && (
                              <p className="mt-1 text-xs font-bold text-green-600">
                                Save ₹{formatPrice(comboPricing.savings)} on
                                this combo!
                              </p>
                            )}

                            <p className="mt-2 text-xs font-semibold text-orange-600">
                              🎁 Combo Deal
                            </p>
                          </>
                        ) : (
                          <p className="text-xl font-black text-orange-600">
                            ₹{formatPrice(product.price)}
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filteredProducts.length === 0 && (
            <div className="rounded-2xl bg-white px-5 py-16 text-center shadow-sm">
              <div className="text-5xl">🔍</div>
              <h3 className="mt-4 text-xl font-bold">No food items found</h3>
              <p className="mt-2 text-sm text-slate-500">
                Try another search or category.
              </p>
            </div>
          )}
        </section>

        {/* Store Notice */}
        {activeNotice && (
          <section className="mt-8 rounded-2xl border border-green-200 bg-green-50 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📢</span>
              <div>
                <h3 className="font-extrabold text-green-900">
                  {activeNotice.title_en}
                </h3>
                <p className="mt-1 text-sm leading-6 text-green-800">
                  {activeNotice.content_en}
                </p>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 bg-slate-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:grid-cols-2 lg:grid-cols-3 lg:px-8">
          <div>
            <h2 className="text-2xl font-black">
              Food<span className="text-orange-500">Corner.</span>
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Fresh • Tasty • Affordable
            </p>
          </div>

          <div>
            <h3 className="font-bold">Opening Hours</h3>
            <p className="mt-3 text-sm text-slate-400">
              Please contact the store for timings.
            </p>
          </div>

          <div>
            <h3 className="font-bold">Quick Links</h3>
            <div className="mt-3 flex flex-col gap-2 text-sm text-slate-400">
              <a href="#menu" className="hover:text-orange-400">
                Menu
              </a>
              <a href="#terms" className="hover:text-orange-400">
                Terms & Conditions
              </a>
              <a href="#privacy" className="hover:text-orange-400">
                Privacy Policy
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 px-5 py-4 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} FoodCorner. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

export default Menu;

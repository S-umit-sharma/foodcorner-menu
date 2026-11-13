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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [selection, setSelection] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("dsp-menu-selection") || "[]");
    } catch {
      return [];
    }
  });
  const [isSelectionOpen, setIsSelectionOpen] = useState(false);

 
useEffect(() => {
  const loadMenu = async (initialLoad = false) => {
    try {
      if (initialLoad) {
        setLoading(true);
      }

      setError("");

      const now = new Date().toISOString();

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

        // Only fetch currently valid offers
        supabase
          .from("offers")
          .select("*, products(name_en, price, image_url)")
          .eq("is_active", true)
          .lte("start_at", now)
          .gte("end_at", now),

        supabase
          .from("store_notices")
          .select("*")
          .eq("is_active", true)
          .order("display_order"),

        supabase
          .from("combo_items")
          .select("*"),

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
      if (initialLoad) {
        setLoading(false);
      }
    }
  };

  // Initial menu load
  loadMenu(true);

  // Refresh menu every 30 seconds
  const refreshInterval = setInterval(() => {
    loadMenu(false);
  }, 30000);

  return () => clearInterval(refreshInterval);

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

  // Keep the customer's selection on this device after refresh.
  useEffect(() => {
    localStorage.setItem("dsp-menu-selection", JSON.stringify(selection));
  }, [selection]);

  const addToSelection = (item) => {
    setSelection((current) => {
      const existing = current.find((entry) => entry.key === item.key);
      if (existing) {
        return current.map((entry) =>
          entry.key === item.key
            ? { ...entry, quantity: entry.quantity + 1, price: item.price }
            : entry
        );
      }
      return [...current, { ...item, quantity: 1 }];
    });
  };

  const changeSelectionQuantity = (key, change) => {
    setSelection((current) =>
      current
        .map((entry) =>
          entry.key === key
            ? { ...entry, quantity: entry.quantity + change }
            : entry
        )
        .filter((entry) => entry.quantity > 0)
    );
  };

  const selectedCount = selection.reduce(
    (total, item) => total + item.quantity,
    0
  );
  const selectionTotal = selection.reduce(
    (total, item) => total + Number(item.price) * item.quantity,
    0
  );

  const getComboPricing = (combo) => {
    const items = comboItems.filter(
      (item) => item.combo_id === combo.id && Number(item.quantity) > 0
    );

    const originalPrice = items.reduce((total, item) => {
      const product = products.find((p) => p.id === item.item_product_id);
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
        notice.notice_type === "notice")
  );

  const popupNotice = notices.find((notice) => notice.display_type === "popup");

  const heroImage = products.find(
    (product) => product.image_url && !product.is_sold_out
  )?.image_url;

  const navLinks = [
    { label: "Home", href: "#home" },
    { label: "Menu", href: "#menu" },
    { label: "Combos", href: "#combos" },
    { label: "Contact", href: "#footer" },
  ];

  const closeMobileNav = () => setMobileNavOpen(false);

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#FFF8F0] font-sans text-gray-900 antialiased">
      {/* ---------------- Notice Popup ---------------- */}
      {popupNotice && isPopupOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="relative bg-gradient-to-br from-[#E02B2B] to-[#C41E1E] py-10 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white text-4xl shadow-lg">
                📢
              </div>
              <button
                onClick={() => setIsPopupOpen(false)}
                aria-label="Close notice"
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xl text-white transition hover:bg-white/30"
              >
                &times;
              </button>
            </div>
            <div className="p-6 text-center sm:p-8">
              <h2 className="text-2xl font-black text-gray-900">
                {popupNotice.title_en}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">
                {popupNotice.content_en}
              </p>
              <button
                onClick={() => setIsPopupOpen(false)}
                className="mt-6 w-full rounded-full bg-[#E02B2B] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#C41E1E]"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- Header / Navbar ---------------- */}
      <header
        id="home"
        className="sticky top-0 z-50 border-b border-orange-100/70 bg-[#FFF8F0]/95 backdrop-blur"
      >
        <nav
          className="flex w-full items-center justify-between py-3"
          style={{ width: "100%", maxWidth: "1280px", marginInline: "auto", paddingInline: "clamp(16px, 4vw, 32px)", boxSizing: "border-box" }}
        >
          {/* Logo */}
          <a href="#home" className="flex items-center gap-2.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E02B2B] to-[#C41E1E] text-xl text-white shadow-md shadow-red-200">
               <img src="logo.jfif" alt="" />
            </span>
            <div className="flex flex-col leading-tight">
              <span className="text-lg font-black tracking-tight text-gray-900 sm:text-xl">
                DSP <span className="text-[#E02B2B]">Fast Food</span>
              </span>
              <span className="hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400 sm:block">
                Fresh • Tasty • Affordable
              </span>
            </div>
          </a>

          {/* Desktop Nav */}
          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="rounded-full px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-red-50 hover:text-[#E02B2B]"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* CTA + mobile toggle */}
          <div className="flex items-center gap-2">
            <a
              href="#menu"
              className="hidden rounded-full bg-[#E02B2B] px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#C41E1E] sm:inline-block"
            >
              Explore Menu
            </a>
            <button
              onClick={() => setMobileNavOpen((v) => !v)}
              aria-label="Toggle navigation"
              aria-expanded={mobileNavOpen}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-700 md:hidden"
            >
              {mobileNavOpen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M3 6h18M3 12h18M3 18h18" />
                </svg>
              )}
            </button>
          </div>
        </nav>

        {/* Mobile Nav Dropdown */}
        {mobileNavOpen && (
          <div className="border-t border-orange-100 bg-[#FFF8F0] md:hidden">
            <div className="space-y-1 px-4 py-3">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={closeMobileNav}
                  className="block rounded-xl px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-red-50 hover:text-[#E02B2B]"
                >
                  {link.label}
                </a>
              ))}
              <a
                href="#menu"
                onClick={closeMobileNav}
                className="mt-2 block rounded-xl bg-[#E02B2B] px-4 py-3 text-center text-sm font-bold text-white"
              >
                Explore Menu
              </a>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* ---------------- Hero Section ---------------- */}
        <section className="relative overflow-hidden">
          {/* Soft decorative background */}
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-red-100/60 blur-3xl" />
            <div className="absolute -left-24 top-40 h-72 w-72 rounded-full bg-orange-100/60 blur-3xl" />
          </div>

          <div
            className="grid w-full items-center gap-8 py-12 sm:py-16 lg:grid-cols-2 lg:gap-12 lg:py-20"
            style={{ width: "100%", maxWidth: "1280px", marginInline: "auto", paddingInline: "clamp(16px, 4vw, 32px)", boxSizing: "border-box" }}
          >
            {/* Text column */}
            <div className="text-center lg:text-left">
              <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-1.5 text-xs font-semibold text-[#E02B2B] ring-1 ring-red-100">
                <span className="h-2 w-2 rounded-full bg-[#E02B2B]" />
                Fresh • Tasty • Affordable
              </span>

              <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
                Fresh Food,
                <span className="block text-[#E02B2B]">Great Mood!</span>
              </h1>

              <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-gray-600 sm:text-base lg:mx-0">
                Welcome to DSP Fast Food — your neighbourhood kitchen for
                freshly made, affordably priced meals. Browse our menu, check
                today&apos;s offers and combos, and walk in ready to order.
              </p>

              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
                <a
                  href="#menu"
                  className="inline-flex w-full items-center justify-center rounded-full bg-[#E02B2B] px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-200 transition hover:bg-[#C41E1E] sm:w-auto"
                >
                  Explore Menu
                  <svg className="ml-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </a>
                <a
                  href="#combos"
                  className="inline-flex w-full items-center justify-center rounded-full border border-gray-200 bg-white px-8 py-3.5 text-sm font-bold text-gray-800 transition hover:border-red-200 hover:text-[#E02B2B] sm:w-auto"
                >
                  View Combos
                </a>
              </div>

              {/* Quick stats */}
              <div className="mt-10 grid grid-cols-3 gap-4 border-t border-orange-100 pt-6">
                <div className="text-center lg:text-left">
                  <div className="text-2xl font-black text-[#E02B2B]">
                    {categories.length}
                  </div>
                  <div className="text-[11px] font-medium uppercase tracking-wider text-gray-500">
                    Categories
                  </div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-2xl font-black text-[#E02B2B]">
                    {products.length}
                  </div>
                  <div className="text-[11px] font-medium uppercase tracking-wider text-gray-500">
                    Menu Items
                  </div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-2xl font-black text-[#E02B2B]">
                    {combos.length}
                  </div>
                  <div className="text-[11px] font-medium uppercase tracking-wider text-gray-500">
                    Combos
                  </div>
                </div>
              </div>
            </div>

            {/* Image column */}
            <div className="relative">
             
              <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-orange-100 to-red-100 shadow-xl">
                {heroImage ? (
                  <img
                    src="logo.jfif"
                    alt="Featured DSP Fast Food dish"
                    className="h-full w-full object-contain p-5 sm:p-8"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[120px] opacity-40">
                     <img src="logo.jfif" alt="" />
                  </div>
                )}
              </div>

              {/* Floating badge */}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 rounded-2xl bg-white px-5 py-3 text-center shadow-lg ring-1 ring-orange-100 sm:left-6 sm:translate-x-0">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  
                </div>
                <div className="text-sm font-black text-[#E02B2B]">
                  Freshly Prepared
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- Special Offers ---------------- */}
        {offers.length > 0 && (
          <section
            className="w-full py-12 sm:py-16"
            style={{ width: "100%", maxWidth: "1280px", marginInline: "auto", paddingInline: "clamp(16px, 4vw, 32px)", boxSizing: "border-box" }}
          >
            <div className="mb-8 text-center">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#E02B2B]">
                Limited Time
              </span>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
                Special <span className="text-[#E02B2B]">Offers</span>
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-gray-500">
                Currently active deals you can grab in-store today.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-4">
              {offers.map((offer) => {
                const discountedPrice =
                  offer.products?.price != null
                    ? offer.discount_type === "percentage"
                      ? offer.products.price -
                        (offer.products.price * offer.discount_value) / 100
                      : Math.max(0, offer.products.price - offer.discount_value)
                    : null;

                return (
                  <article
                    key={offer.id}
                    className="group relative flex w-full max-w-[420px] flex-col overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-orange-100/70 transition hover:shadow-md sm:flex-row sm:items-center sm:gap-4"
                    style={{ maxWidth: "420px", boxSizing: "border-box" }}
                  >
                    {/* Offer tag */}
                    <span className="absolute right-4 top-4 rounded-full bg-red-50 px-3 py-1 text-[11px] font-black text-[#E02B2B]">
                      {offer.discount_type === "percentage"
                        ? `${offer.discount_value}% OFF`
                        : `₹${formatPrice(offer.discount_value)} OFF`}
                    </span>

                    {offer.products?.image_url ? (
                      <div className="mb-4 h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-orange-50 sm:mb-0">
                        <img
                          src={offer.products.image_url}
                          alt={offer.products.name_en || "Offer"}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="mb-4 flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-4xl sm:mb-0">
                        🎁
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h3 className="pr-16 text-base font-black text-gray-900 sm:pr-20">
                        {offer.title_en}
                      </h3>
                      {offer.description_en && (
                        <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                          {offer.description_en}
                        </p>
                      )}
                      {discountedPrice != null && (
                        <div className="mt-3 flex items-baseline gap-2">
                          <span className="text-lg font-black text-[#E02B2B]">
                            ₹{formatPrice(discountedPrice)}
                          </span>
                          <span className="text-xs text-gray-400 line-through">
                            ₹{formatPrice(offer.products.price)}
                          </span>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* ---------------- Special Combos ---------------- */}
        {combos.length > 0 && (
          <section
            id="combos"
            className="scroll-mt-24 bg-gradient-to-b from-white to-[#FFF1E0] py-12 sm:py-16"
          >
            <div
              className="w-full"
              style={{ width: "100%", maxWidth: "1280px", marginInline: "auto", paddingInline: "clamp(16px, 4vw, 32px)", boxSizing: "border-box" }}
            >
              <div className="mb-8 text-center">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#E02B2B]">
                  Save More
                </span>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
                  Special <span className="text-[#E02B2B]">Combos</span>
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-sm text-gray-500">
                  Hand-picked bundles at a better price than ordering items
                  separately.
                </p>
              </div>

              <div className="grid w-full grid-cols-1 justify-items-center gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {combos.map((combo) => {
                  const pricing = getComboPricing(combo);
                  return (
                    <article
                      key={combo.id}
                      className="group flex w-full max-w-[360px] flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-orange-100/70 transition hover:shadow-md"
                      style={{ maxWidth: "360px", boxSizing: "border-box" }}
                    >
                      {/* Combo visual */}
                      <div className="relative flex h-[300px] sm:h-[260px] items-center justify-center overflow-hidden bg-gradient-to-br from-orange-100 to-red-100 ">
                        {combo.image_url ? (
                          <img
                            src={combo.image_url}
                            alt={combo.name}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <span className="text-6xl">🍔</span>
                        )}
                        <span className="absolute left-3 top-3 rounded-full bg-[#E02B2B] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-sm">
                          Combo
                        </span>
                        {pricing.savings > 0 && (
                          <span className="absolute right-3 top-3 rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-[#E02B2B] shadow-sm">
                            Save ₹{formatPrice(pricing.savings)}
                          </span>
                        )}
                      </div>

                      {/* Combo body */}
                      <div className="flex flex-1 flex-col p-4">
                        <h3 className="text-base font-black text-gray-900">
                          {combo.name}
                        </h3>

                        {combo.description && (
                          <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                            {combo.description}
                          </p>
                        )}

                        {/* Items */}
                        <div className="mt-3 flex-1 space-y-1.5">
                          {pricing.items.length === 0 && (
                            <p className="text-[11px] italic text-gray-400">
                              Combo contents will be listed here.
                            </p>
                          )}
                          {pricing.items.map((item) => {
                            const product = products.find(
                              (p) => p.id === item.item_product_id
                            );
                            if (!product) return null;
                            return (
                              <div
                                key={item.id}
                                className="flex items-center justify-between text-[12px] text-gray-600"
                              >
                                <span className="flex items-center gap-1.5 truncate">
                                  <span className="h-1 w-1 rounded-full bg-[#E02B2B]" />
                                  <span className="truncate">
                                    {product.name_en}
                                  </span>
                                </span>
                                <span className="font-semibold text-gray-500">
                                  ×{item.quantity}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Pricing */}
                        <div className="mt-4 flex items-end justify-between border-t border-gray-100 pt-3">
                          <div>
                            <div className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                              Combo Price
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-xl font-black text-[#E02B2B]">
                                ₹{formatPrice(pricing.comboPrice)}
                              </span>
                              {pricing.originalPrice > pricing.comboPrice && (
                                <span className="text-xs text-gray-400 line-through">
                                  ₹{formatPrice(pricing.originalPrice)}
                                </span>
                              )}
                            </div>
                          </div>
                          {pricing.savings > 0 && (
                            <span className="rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-bold text-green-600">
                              You save ₹{formatPrice(pricing.savings)}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            addToSelection({
                              key: `combo-${combo.id}`,
                              type: "combo",
                              name: combo.name,
                              price: pricing.comboPrice,
                              image_url: combo.image_url,
                            })
                          }
                          className="mt-4 w-full rounded-full bg-[#E02B2B] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#C41E1E] active:scale-[0.98]"
                        >
                          + Add combo to selection
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ---------------- Popular Food ---------------- */}
        <section id="menu" className="scroll-mt-24">
          <div
            className="w-full py-12 sm:py-16"
            style={{ width: "100%", maxWidth: "1280px", marginInline: "auto", paddingInline: "clamp(16px, 4vw, 32px)", boxSizing: "border-box" }}
          >
            <div className="mb-8 text-center">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#E02B2B]">
                Our Menu
              </span>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
                Our Popular Tasty <span className="text-[#E02B2B]">Foods</span>
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-gray-500">
                Browse our freshly prepared dishes. Prices are in INR and
                updated live.
              </p>
            </div>

            {/* Category filters */}
            {categories.length > 0 && (
              <div className="mb-6 flex flex-nowrap justify-start gap-2 overflow-x-auto pb-2 sm:justify-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`shrink-0 rounded-full px-5 py-2 text-xs font-semibold transition sm:text-sm ${
                    selectedCategory === "all"
                      ? "bg-[#E02B2B] text-white shadow-md shadow-red-200"
                      : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
                  }`}
                >
                  All
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
                      className={`shrink-0 rounded-full px-5 py-2 text-xs font-semibold transition sm:text-sm ${
                        selectedCategory === category.id
                          ? "bg-[#E02B2B] text-white shadow-md shadow-red-200"
                          : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {category.name_en}
                    </button>
                  ))}
              </div>
            )}

            {/* Search */}
            <div className="mx-auto mb-8 max-w-md">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search for food..."
                  className="w-full rounded-full border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#E02B2B] focus:ring-2 focus:ring-red-100"
                />
              </div>
            </div>

            {/* Loading state */}
            {loading && (
              <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
                  <div
                    key={item}
                    className="animate-pulse rounded-2xl bg-white p-3 ring-1 ring-orange-100/70"
                  >
                    <div className="aspect-square rounded-xl bg-gray-100" />
                    <div className="mt-4 h-4 w-2/3 rounded bg-gray-100" />
                    <div className="mt-2 h-3 w-full rounded bg-gray-100" />
                    <div className="mt-4 h-5 w-1/3 rounded bg-gray-100" />
                  </div>
                ))}
              </div>
            )}

            {/* Error state */}
            {!loading && error && (
              <div className="rounded-2xl bg-red-50 p-8 text-center ring-1 ring-red-100">
                <div className="text-4xl">⚠️</div>
                <h3 className="mt-3 text-lg font-black text-gray-900">
                  Unable to load menu
                </h3>
                <p className="mt-2 text-sm text-gray-600">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 rounded-full bg-[#E02B2B] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#C41E1E]"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Products grid */}
            {!loading && !error && filteredProducts.length > 0 && (
              <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                {filteredProducts.map((product) => {
                  const productOffer = getProductOffer(product);
                  return (
                    <article
                      key={product.id}
                      className="group flex flex-col overflow-hidden rounded-2xl bg-white p-3 shadow-sm ring-1 ring-orange-100/70 transition hover:shadow-md sm:p-4"
                    >
                      {/* Image */}
                      <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-xl bg-orange-50 sm:mb-4">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name_en}
                            loading="lazy"
                            className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                              product.is_sold_out ? "opacity-50 grayscale" : ""
                            }`}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-5xl text-gray-300">
                            🍔
                          </div>
                        )}

                        {/* Offer badge */}
                        {productOffer && !product.is_sold_out && (
                          <span className="absolute left-2 top-2 rounded-md bg-[#E02B2B] px-1.5 py-0.5 text-[9px] font-black text-white shadow-sm sm:text-[10px]">
                            {productOffer.discount_type === "percentage"
                              ? `${productOffer.discount_value}% OFF`
                              : `₹${formatPrice(
                                  productOffer.discount_value
                                )} OFF`}
                          </span>
                        )}

                        {/* Sold out overlay */}
                        {product.is_sold_out && (
                          <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[2px]">
                            <span className="rounded-full bg-gray-900 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white sm:text-xs">
                              Sold Out
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Body */}
                      <div className="flex flex-1 flex-col text-center">
                        <h3 className="line-clamp-1 text-sm font-black text-gray-900 sm:text-base">
                          {product.name_en}
                        </h3>

                        {product.description_en && (
                          <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-gray-500 sm:text-xs">
                            {product.description_en}
                          </p>
                        )}

                        {/* Price + availability */}
                        <div className="mt-auto pt-3">
                          {product.is_sold_out ? (
                            <span className="block text-xs font-semibold text-gray-400">
                              Currently Unavailable
                            </span>
                          ) : productOffer ? (
                            <div className="flex items-baseline justify-center gap-1.5">
                              <span className="text-base font-black text-[#E02B2B] sm:text-lg">
                                ₹{formatPrice(productOffer.offerPrice)}
                              </span>
                              <span className="text-[10px] text-gray-400 line-through sm:text-xs">
                                ₹{formatPrice(product.price)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-base font-black text-[#E02B2B] sm:text-lg">
                              ₹{formatPrice(product.price)}
                            </span>
                          )}

                          {/* View-only footer pill */}
                          <div className="mt-3 flex h-8 items-center justify-center rounded-full bg-orange-50 text-[9px] font-bold uppercase tracking-wider text-[#E02B2B] sm:h-9 sm:text-[10px]">
                            {product.is_sold_out ? "Unavailable" : "Available"}
                          </div>
                          {!product.is_sold_out && (
                            <button
                              type="button"
                              onClick={() =>
                                addToSelection({
                                  key: `product-${product.id}`,
                                  type: "product",
                                  name: product.name_en,
                                  price: productOffer
                                    ? productOffer.offerPrice
                                    : Number(product.price),
                                  image_url: product.image_url,
                                })
                              }
                              className="mt-2 w-full rounded-full border border-[#E02B2B] bg-white px-3 py-2 text-[10px] font-bold text-[#E02B2B] transition hover:bg-red-50 sm:text-xs"
                            >
                              + Add to selection
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {/* Empty state */}
            {!loading && !error && filteredProducts.length === 0 && (
              <div className="rounded-2xl bg-white py-16 text-center ring-1 ring-orange-100/70 sm:py-20">
                <div className="text-5xl">🔍</div>
                <h3 className="mt-4 text-lg font-black text-gray-900">
                  No food items found
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Try a different search or category.
                </p>
                {(search || selectedCategory !== "all") && (
                  <button
                    onClick={() => {
                      setSearch("");
                      setSelectedCategory("all");
                    }}
                    className="mt-4 rounded-full bg-[#E02B2B] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#C41E1E]"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ---------------- Store Notice Banner ---------------- */}
        {activeNotice && (
          <section
            className="w-full pb-4"
            style={{ width: "100%", maxWidth: "1280px", marginInline: "auto", paddingInline: "clamp(16px, 4vw, 32px)", boxSizing: "border-box" }}
          >
            <div className="flex flex-col items-center gap-4 rounded-2xl bg-gradient-to-r from-red-50 to-orange-50 p-6 text-center ring-1 ring-red-100 sm:flex-row sm:text-left">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-2xl shadow-sm">
                📢
              </span>
              <div>
                <h3 className="text-base font-black text-gray-900">
                  {activeNotice.title_en}
                </h3>
                {activeNotice.content_en && (
                  <p className="mt-1 text-sm text-gray-600">
                    {activeNotice.content_en}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ---------------- Floating Selection Calculator ---------------- */}
      {selectedCount > 0 && (
        <button
          type="button"
          onClick={() => setIsSelectionOpen(true)}
          className="fixed bottom-4 left-1/2 z-[70] flex w-[calc(100%-24px)] max-w-md -translate-x-1/2 items-center justify-between rounded-2xl bg-gray-950 px-5 py-3.5 text-left text-white shadow-2xl ring-1 ring-white/10 transition hover:bg-gray-900 sm:bottom-6"
          aria-label="Open selected items and total"
        >
          <span>
            <span className="block text-xs font-semibold text-white/70">
              {selectedCount} {selectedCount === 1 ? "item" : "items"} selected
            </span>
            <span className="mt-0.5 block text-lg font-black">
              Total: ₹{formatPrice(selectionTotal)}
            </span>
          </span>
          <span className="rounded-full bg-[#E02B2B] px-4 py-2 text-xs font-bold">
            View selection ↑
          </span>
        </button>
      )}

      {isSelectionOpen && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="selection-title"
            className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
          >
            <div className="flex items-center justify-between border-b border-orange-100 px-5 py-4 sm:px-6">
              <div>
                <h2 id="selection-title" className="text-xl font-black text-gray-900">
                  Your Selection
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  Review items and calculate your estimated bill.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSelectionOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-xl text-gray-600 hover:bg-gray-200"
                aria-label="Close selection"
              >
                ×
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4 sm:px-6">
              {selection.map((item) => (
                <div key={item.key} className="flex items-center gap-3 rounded-2xl border border-orange-100 p-3">
                  {item.image_url ? (
                    <img src={item.image_url} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-2xl">
                      {item.type === "combo" ? "🍱" : "🍔"}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-gray-900">{item.name}</p>
                    <p className="mt-1 text-xs text-gray-500">₹{formatPrice(item.price)} each</p>
                    <p className="mt-1 text-xs font-bold text-[#E02B2B]">₹{formatPrice(Number(item.price) * item.quantity)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => changeSelectionQuantity(item.key, -1)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-50 font-bold text-[#E02B2B] hover:bg-orange-100"
                      aria-label={`Decrease ${item.name}`}
                    >−</button>
                    <span className="w-5 text-center text-sm font-bold">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => changeSelectionQuantity(item.key, 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E02B2B] font-bold text-white hover:bg-[#C41E1E]"
                      aria-label={`Increase ${item.name}`}
                    >+</button>
                  </div>
                </div>
              ))}
              {selection.length === 0 && (
                <p className="py-10 text-center text-sm text-gray-500">Your selection is empty.</p>
              )}
            </div>

            <div className="border-t border-orange-100 bg-[#FFF8F0] px-5 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-600">Estimated total</span>
                <span className="text-2xl font-black text-[#E02B2B]">₹{formatPrice(selectionTotal)}</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
                This is a price estimate only. No order or payment is placed. Please confirm prices at the counter.
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelection([])}
                  disabled={selection.length === 0}
                  className="flex-1 rounded-full border border-gray-200 bg-white px-4 py-3 text-xs font-bold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Clear all
                </button>
                <button
                  type="button"
                  onClick={() => setIsSelectionOpen(false)}
                  className="flex-1 rounded-full bg-[#E02B2B] px-4 py-3 text-xs font-bold text-white transition hover:bg-[#C41E1E]"
                >
                  Continue browsing
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ---------------- Footer ---------------- */}
      <footer
        id="footer"
        className="mt-12 border-t border-orange-100 bg-[#FFF8F0]"
      >
        <div
          className="w-full py-10"
          style={{ width: "100%", maxWidth: "1280px", marginInline: "auto", paddingInline: "clamp(16px, 4vw, 32px)", boxSizing: "border-box" }}
        >
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E02B2B] to-[#C41E1E] text-xl text-white shadow-md shadow-red-200">
                  <img src="logo.jfif" alt="" />
                </span>
                <div className="leading-tight">
                  <div className="text-xl font-black tracking-tight text-gray-900">
                    DSP <span className="text-[#E02B2B]">Fast Food</span>
                  </div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                    Fresh • Tasty • Affordable
                  </div>
                </div>
              </div>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-gray-500">
                Thank you for scanning our menu. Browse, decide, and walk in
                ready to order — our team will take care of the rest.
              </p>
            </div>

            {/* Quick links */}
            <div>
              <h3 className="text-sm font-black text-gray-900">Quick Links</h3>
              <div className="mt-4 flex flex-col gap-2 text-sm text-gray-500">
                {navLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="transition hover:text-[#E02B2B]"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-sm font-black text-gray-900">Visit Us</h3>
              <p className="mt-4 text-sm text-gray-500">
                This is a view-only digital menu. Please place your order
                directly at the counter.
              </p>
              <p className="mt-3 text-xs text-gray-400">
                For opening hours, contact the store directly.
              </p>
            </div>
          </div>

          <div className="mt-10 border-t border-orange-100 pt-6 text-center text-xs text-gray-400">
            © {new Date().getFullYear()} DSP Fast Food. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Menu;

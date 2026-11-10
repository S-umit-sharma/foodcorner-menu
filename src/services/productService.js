
import { supabase } from "./supabase";

export const getProducts = async () => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .eq("is_available", true)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Error fetching products:", error);
    throw error;
  }

  return data;
};

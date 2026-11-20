import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

export const getHomepageHeroData = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "homepage_hero")
      .maybeSingle();
    return (data?.value as {
      headline?: string;
      subheadline?: string;
      cta_text?: string;
      cta_link?: string;
      background_image?: string;
      overlay_opacity?: number;
    }) || null;
  } catch (e) {
    return null;
  }
});

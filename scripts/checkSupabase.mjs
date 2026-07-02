import fs from "fs";
import { createClient } from "@supabase/supabase-js";
const env = Object.fromEntries(
  fs
    .readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [k, ...v] = line.split("=");
      return [k, v.join("=")];
    })
);
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
const res = await supabase.from("residents").select("*").limit(5);
console.log(JSON.stringify(res, null, 2));

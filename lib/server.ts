import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createServerComponentClient() {
    const cookieStore = cookies()
    return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_KEY!, {
        cookies: {
            getAll() {
                return cookieStore.getAll()
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
            }
        }
    })
}
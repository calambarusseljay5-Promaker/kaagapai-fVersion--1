import { supabase } from "../lib/supabaseClient";

export const PROFILE_UPDATED_EVENT = "kaagapai:profile-updated";

export function notifyProfileUpdated(account) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(PROFILE_UPDATED_EVENT, {
      detail: account,
    })
  );
}

function getProfileErrorMessage(error) {
  const message = error?.message || "";

  if (
    error?.code === "PGRST205" ||
    (message.includes("user_profiles") && message.toLowerCase().includes("schema cache"))
  ) {
    return "Database setup is missing public.user_profiles. Run setup-supabase.sql in the Supabase SQL Editor, then try logging in again.";
  }

  if (error?.code === "PGRST116") {
    return "Login succeeded, but this account does not have an admin profile yet. Create the Auth user, rerun setup-supabase.sql, then try again.";
  }

  return message || "Unable to load your user profile.";
}

/**
 * Login admin with email and password
 */
export async function loginUser(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error("Login failed");

    let profile;
    try {
      profile = await getUserProfile(data.user.id);
    } catch (profileError) {
      await supabase.auth.signOut();
      throw profileError;
    }

    return {
      user: data.user,
      profile: profile,
      session: data.session,
    };
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}

/**
 * Get user profile
 */
export async function getUserProfile(userId) {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) throw new Error(getProfileErrorMessage(error));
    return data;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw error;
  }
}

/**
 * Get current authenticated user and profile
 */
export async function getCurrentUserWithProfile() {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) throw sessionError;
    if (!sessionData.session) return null;

    const profile = await getUserProfile(sessionData.session.user.id);
    return {
      user: sessionData.session.user,
      profile: profile,
    };
  } catch (error) {
    console.error("Error getting current user:", error);
    throw error;
  }
}

/**
 * Logout user
 */
export async function clearAuthSession() {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) throw sessionError;

    if (sessionData.session) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }

    return true;
  } catch (error) {
    console.error("Error clearing auth session:", error);
    throw error;
  }
}

/**
 * Logout user
 */
export async function logoutUser() {
  return clearAuthSession();
}

/**
 * Update user profile
 */
export async function updateUserProfile(userId, updates) {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error updating profile:", error);
    throw error;
  }
}

/**
 * Upload current user's profile photo to Supabase Storage
 */
export async function uploadProfilePhoto(userId, file) {
  try {
    if (!userId) throw new Error("Missing user ID for profile photo upload.");
    if (!file) throw new Error("Please choose a profile photo to upload.");

    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const contentTypeByExtension = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
    };
    const safeExtension = ["jpg", "jpeg", "png", "webp", "gif"].includes(extension)
      ? extension
      : "jpg";
    const filePath = `${userId}/profile-${Date.now()}.${safeExtension}`;
    const contentType = file.type || contentTypeByExtension[safeExtension] || "image/jpeg";

    let uploadError;
    try {
      const { error: err } = await supabase.storage
        .from("profile-photos")
        .upload(filePath, file, {
          cacheControl: "3600",
          contentType,
          upsert: true,
        });
      uploadError = err;
    } catch (err) {
      uploadError = err;
    }

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("profile-photos")
      .getPublicUrl(filePath);

    if (!data.publicUrl) {
      throw new Error("Profile photo uploaded, but no public URL was returned.");
    }

    return data.publicUrl;
  } catch (error) {
    console.error("Error uploading profile photo:", error);

    const message = error?.message || "";
    const isNetworkOrCors = error?.name === "TypeError" || message.toLowerCase().includes("failed to fetch");
    if (message.toLowerCase().includes("bucket") || isNetworkOrCors) {
      throw new Error(
        "Profile photo storage is not set up yet or there is a CORS/network connection error. Run the Supabase setup SQL for the profile-photos bucket, check your internet connection, or make sure CORS is configured.",
        { cause: error }
      );
    }

    throw error;
  }
}

/**
 * Update current auth user's account fields
 */
export async function updateCurrentAuthUser(updates) {
  try {
    const { data, error } = await supabase.auth.updateUser(updates);

    if (error) throw error;
    return data.user;
  } catch (error) {
    console.error("Error updating auth user:", error);
    throw error;
  }
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (session) {
      const profile = await getUserProfile(session.user.id);
      callback({
        event,
        user: session.user,
        profile: profile,
      });
    } else {
      callback({
        event,
        user: null,
        profile: null,
      });
    }
  });
}

/**
 * Reset password
 */
export async function resetPassword(email) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Reset password error:", error);
    throw error;
  }
}

/**
 * Update password
 */
export async function updatePassword(newPassword) {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Update password error:", error);
    throw error;
  }
}

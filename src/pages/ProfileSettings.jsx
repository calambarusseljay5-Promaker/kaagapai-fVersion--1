import { useEffect, useRef, useState } from "react";
import { Loader2, Save, Trash2, Upload, UserRound } from "lucide-react";
import PageWrapper from "../components/PageWrapper";
import {
  getCurrentUserWithProfile,
  notifyProfileUpdated,
  updateCurrentAuthUser,
  updateUserProfile,
  uploadProfilePhoto,
} from "../services/authService";

const getDisplayName = (user) =>
  user?.user_metadata?.full_name ||
  user?.user_metadata?.name ||
  user?.email?.split("@")[0] ||
  "Admin User";

const PROFILE_PHOTO_MAX_SIZE = 360;
const PROFILE_PHOTO_QUALITY = 0.82;
const PROFILE_PHOTO_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const PROFILE_PHOTO_ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const PROFILE_PHOTO_ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);

const isSupportedProfilePhoto = (file) => {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  return (
    PROFILE_PHOTO_ALLOWED_TYPES.has(file.type) ||
    (!file.type && PROFILE_PHOTO_ALLOWED_EXTENSIONS.has(extension))
  );
};

const revokePreviewUrl = (value) => {
  if (value?.startsWith("blob:")) {
    URL.revokeObjectURL(value);
  }
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read the selected photo."));
    reader.readAsDataURL(file);
  });

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to prepare the selected photo."));
    image.src = src;
  });

const compressProfilePhoto = async (file) => {
  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);
  const scale = Math.min(
    1,
    PROFILE_PHOTO_MAX_SIZE / Math.max(image.naturalWidth || 1, image.naturalHeight || 1)
  );
  const width = Math.max(1, Math.round((image.naturalWidth || 1) * scale));
  const height = Math.max(1, Math.round((image.naturalHeight || 1) * scale));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Unable to process the selected photo.");
  }

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", PROFILE_PHOTO_QUALITY);
};

const ProfileSettings = () => {
  const photoInputRef = useRef(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    profilePhotoUrl: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
  const [selectedPhotoName, setSelectedPhotoName] = useState("");
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
  const [photoWasRemoved, setPhotoWasRemoved] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        const data = await getCurrentUserWithProfile();

        if (!isMounted) return;

        setCurrentUser(data);
        setForm({
          fullName: getDisplayName(data?.user),
          email: data?.user?.email || "",
          phone: data?.profile?.phone || "",
          profilePhotoUrl: data?.profile?.profile_photo_url || "",
        });
        setPhotoPreviewUrl(data?.profile?.profile_photo_url || "");
      } catch (profileError) {
        if (isMounted) {
          setError(profileError.message || "Unable to load profile settings.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => () => revokePreviewUrl(photoPreviewUrl), [photoPreviewUrl]);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setMessage("");
    setError("");

    if (!isSupportedProfilePhoto(file)) {
      setError("Please choose a JPG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }

    if (file.size > PROFILE_PHOTO_MAX_UPLOAD_BYTES) {
      setError("Profile photo must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    setPhotoPreviewUrl((current) => {
      revokePreviewUrl(current);
      return nextPreviewUrl;
    });
    setSelectedPhotoFile(file);
    setSelectedPhotoName(file.name);
    setPhotoWasRemoved(false);

    if (!currentUser?.user?.id) return;

    setSaving(true);

    try {
      let nextProfilePhotoUrl;

      try {
        nextProfilePhotoUrl = await uploadProfilePhoto(currentUser.user.id, file);
      } catch (photoUploadError) {
        console.warn("Storage upload failed. Saving compressed profile photo in profile row.", photoUploadError);
        nextProfilePhotoUrl = await compressProfilePhoto(file);
      }

      const updatedProfile = await updateUserProfile(currentUser.user.id, {
        profile_photo_url: nextProfilePhotoUrl,
        updated_at: new Date().toISOString(),
      });
      const nextAccount = {
        user: currentUser.user,
        profile: updatedProfile,
      };

      setCurrentUser(nextAccount);
      setForm((current) => ({
        ...current,
        profilePhotoUrl: nextProfilePhotoUrl || "",
      }));
      setPhotoPreviewUrl((current) => {
        revokePreviewUrl(current);
        return nextProfilePhotoUrl || "";
      });
      setSelectedPhotoFile(null);
      setSelectedPhotoName("");
      setPhotoWasRemoved(false);
      notifyProfileUpdated(nextAccount);
      setMessage("Profile photo updated.");
    } catch (photoSaveError) {
      setError(photoSaveError.message || "Unable to save profile photo.");
    } finally {
      setSaving(false);

      if (photoInputRef.current) {
        photoInputRef.current.value = "";
      }
    }
  };

  const clearPhoto = async () => {
    const previousProfilePhotoUrl = form.profilePhotoUrl || "";

    setMessage("");
    setError("");
    updateField("profilePhotoUrl", "");
    setPhotoPreviewUrl((current) => {
      revokePreviewUrl(current);
      return "";
    });
    setSelectedPhotoFile(null);
    setSelectedPhotoName("");
    setPhotoWasRemoved(true);

    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }

    if (!currentUser?.user?.id) return;

    setSaving(true);

    try {
      const updatedProfile = await updateUserProfile(currentUser.user.id, {
        profile_photo_url: null,
        updated_at: new Date().toISOString(),
      });
      const nextAccount = {
        user: currentUser.user,
        profile: updatedProfile,
      };

      setCurrentUser(nextAccount);
      setPhotoWasRemoved(false);
      notifyProfileUpdated(nextAccount);
      setMessage("Profile photo removed.");
    } catch (removeError) {
      setForm((current) => ({
        ...current,
        profilePhotoUrl: previousProfilePhotoUrl,
      }));
      setPhotoPreviewUrl((current) => {
        revokePreviewUrl(current);
        return previousProfilePhotoUrl;
      });
      setPhotoWasRemoved(false);
      setError(removeError.message || "Unable to remove profile photo.");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!currentUser?.user?.id) return;

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const authUpdates = {
        data: {
          ...currentUser.user.user_metadata,
          full_name: form.fullName.trim() || "Admin User",
        },
      };

      if (form.email.trim() && form.email.trim() !== currentUser.user.email) {
        authUpdates.email = form.email.trim().toLowerCase();
      }

      let nextProfilePhotoUrl = form.profilePhotoUrl.trim() || null;

      if (photoWasRemoved) {
        nextProfilePhotoUrl = null;
      }

      if (selectedPhotoFile) {
        try {
          nextProfilePhotoUrl = await uploadProfilePhoto(currentUser.user.id, selectedPhotoFile);
        } catch (photoUploadError) {
          console.warn("Storage upload failed. Saving compressed profile photo in profile row.", photoUploadError);
          nextProfilePhotoUrl = await compressProfilePhoto(selectedPhotoFile);
        }
      }

      const updatedAuthUser = await updateCurrentAuthUser(authUpdates);
      const updatedProfile = await updateUserProfile(currentUser.user.id, {
        phone: form.phone.trim() || null,
        profile_photo_url: nextProfilePhotoUrl,
        updated_at: new Date().toISOString(),
      });
      const nextAccount = {
        user: updatedAuthUser || currentUser.user,
        profile: updatedProfile,
      };

      setCurrentUser(nextAccount);
      setForm((current) => ({
        ...current,
        profilePhotoUrl: nextProfilePhotoUrl || "",
      }));
      setPhotoPreviewUrl((current) => {
        revokePreviewUrl(current);
        return nextProfilePhotoUrl || "";
      });
      setSelectedPhotoFile(null);
      setSelectedPhotoName("");
      setPhotoWasRemoved(false);

      if (photoInputRef.current) {
        photoInputRef.current.value = "";
      }

      notifyProfileUpdated(nextAccount);
      setMessage(
        authUpdates.email
          ? "Profile saved. Check the new email inbox if Supabase requires confirmation."
          : "Profile settings saved."
      );
    } catch (saveError) {
      setError(saveError.message || "Unable to save profile settings.");
    } finally {
      setSaving(false);
    }
  };

  const role = currentUser?.profile?.role || "admin";
  const status = currentUser?.profile?.registration_status || "Active";

  return (
    <PageWrapper title="Profile Settings" description="Manage your admin account details">
      <form onSubmit={handleSave} className="space-y-5 pb-20">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <UserRound size={22} />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-[#17233c]">Admin Profile</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Update your displayed name, email, phone, and profile photo.
                  </p>
                </div>
              </div>

              <span className="rounded-md bg-blue-50 px-3 py-1.5 text-xs font-semibold capitalize text-blue-700">
                {role}
              </span>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 py-8 text-sm text-slate-500">
                <Loader2 size={16} className="animate-spin" />
                Loading profile settings...
              </div>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Display name
                  <input
                    value={form.fullName}
                    onChange={(event) => updateField("fullName", event.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="block text-sm font-semibold text-slate-700">
                  Email address
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="block text-sm font-semibold text-slate-700">
                  Phone number
                  <input
                    value={form.phone}
                    onChange={(event) => updateField("phone", event.target.value)}
                    placeholder="Optional"
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="block text-sm font-semibold text-slate-700">
                  Account status
                  <input
                    value={status}
                    readOnly
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-normal text-slate-600 outline-none"
                  />
                </label>

                <div className="md:col-span-2">
                  <p className="text-sm font-semibold text-slate-700">Profile photo</p>
                  <div className="mt-2 flex flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
                    <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                      {photoPreviewUrl ? (
                        <img
                          src={photoPreviewUrl}
                          alt="Admin profile preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <UserRound size={30} />
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-700">
                        {selectedPhotoName || (photoPreviewUrl ? "Current profile photo" : "No photo selected")}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Upload a JPG, PNG, or WebP image up to 5 MB.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <input
                          ref={photoInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handlePhotoUpload}
                          disabled={saving}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => photoInputRef.current?.click()}
                          disabled={saving}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1f63ca] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1854ad] disabled:cursor-not-allowed disabled:bg-slate-400"
                        >
                          <Upload size={16} />
                          Upload Photo
                        </button>
                        {photoPreviewUrl ? (
                          <button
                            type="button"
                            onClick={clearPhoto}
                            disabled={saving}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Trash2 size={16} />
                            Remove
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {message ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              {message}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || saving}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1f63ca] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1854ad] disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
    </PageWrapper>
  );
};

export default ProfileSettings;

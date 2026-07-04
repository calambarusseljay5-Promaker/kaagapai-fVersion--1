import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { Bell, User, ChevronDown, X, CheckCheck, Loader2, RefreshCw, LogOut } from "lucide-react";
import { useConfirm } from "../context/ConfirmContext";
import {
  getCurrentUserWithProfile,
  logoutUser,
  PROFILE_UPDATED_EVENT,
} from "../services/authService";
import {
  fetchAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  subscribeAdminNotificationChanges,
} from "../services/adminNotificationService";

const getDisplayName = (user) =>
  user?.user_metadata?.full_name ||
  user?.user_metadata?.name ||
  user?.email?.split("@")[0] ||
  "Admin User";

const getRelativeTime = (value) => {
  const time = new Date(value || 0).getTime();
  if (!time || Number.isNaN(time)) return "Just now";

  const diffMs = Date.now() - time;
  if (diffMs < 0) {
    const futureMinutes = Math.ceil(Math.abs(diffMs) / 60000);
    if (futureMinutes < 60) return `in ${futureMinutes} min`;

    const futureHours = Math.ceil(futureMinutes / 60);
    if (futureHours < 24) return `in ${futureHours} hr`;

    const futureDays = Math.ceil(futureHours / 24);
    return `in ${futureDays} day${futureDays === 1 ? "" : "s"}`;
  }

  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;

  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

const getNotificationAccent = (tone) => {
  if (tone === "amber") return "bg-amber-100 text-amber-700";
  if (tone === "emerald") return "bg-emerald-100 text-emerald-700";
  return "bg-blue-100 text-blue-700";
};

const Header = ({ title, subtitle, middleContent = null, actions = null, className = "" }) => {
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [account, setAccount] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationError, setNotificationError] = useState("");

  const unreadCount = notifications.filter((notification) => !notification.is_read).length;
  const displayName = getDisplayName(account?.user);
  const displayEmail = account?.user?.email || "admin@kaagapai.gov";
  const displayRole = account?.profile?.role || "Administrator";
  const profilePhotoUrl = account?.profile?.profile_photo_url;

  const loadNotifications = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setNotificationsLoading(true);
    }

    try {
      const result = await fetchAdminNotifications();
      setNotifications(result.notifications);
      setNotificationError(
        result.errors.length
          ? "Some notification sources could not load. Showing available items."
          : ""
      );
    } catch (error) {
      setNotificationError(error.message || "Unable to load notifications.");
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadAccount = async () => {
      try {
        const currentAccount = await getCurrentUserWithProfile();

        if (isMounted) {
          setAccount(currentAccount);
        }
      } catch (error) {
        console.error("Unable to load header account:", error);
      }
    };

    loadAccount();
    const syncUpdatedProfile = (event) => {
      if (event.detail) {
        setAccount(event.detail);
        return;
      }

      loadAccount();
    };

    window.addEventListener(PROFILE_UPDATED_EVENT, syncUpdatedProfile);

    return () => {
      isMounted = false;
      window.removeEventListener(PROFILE_UPDATED_EVENT, syncUpdatedProfile);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const refresh = async ({ silent = false } = {}) => {
      if (!isMounted) return;
      await loadNotifications({ silent });
    };

    refresh();
    const unsubscribe = subscribeAdminNotificationChanges(() => {
      refresh({ silent: true });
    });
    const refreshOnFocus = () => refresh({ silent: true });

    window.addEventListener("focus", refreshOnFocus);

    return () => {
      isMounted = false;
      unsubscribe();
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [loadNotifications]);

  const toggleNotifications = () => {
    const nextState = !showNotifications;
    setShowNotifications(nextState);
    setShowProfile(false);

    if (nextState) {
      loadNotifications({ silent: true });
    }
  };

  const handleNotificationOpen = (notification) => {
    markAdminNotificationRead(notification.id);
    setNotifications((currentNotifications) =>
      currentNotifications.map((currentNotification) =>
        currentNotification.id === notification.id
          ? { ...currentNotification, is_read: true }
          : currentNotification
      )
    );
    setShowNotifications(false);
    navigate(notification.path);
  };

  const handleMarkAllRead = () => {
    markAllAdminNotificationsRead(notifications.map((notification) => notification.id));
    setNotifications((currentNotifications) =>
      currentNotifications.map((notification) => ({ ...notification, is_read: true }))
    );
  };

  const confirmSignOut = () => {
    setShowSignOutConfirm(false);
    setShowProfile(false);

    // Start sign out without leaving the modal open
    setIsSigningOut(true);

    logoutUser()
      .then(() => {
        navigate("/goodbye", {
          replace: true,
          state: {
            displayName,
            role: displayRole,
          },
        });
      })
      .catch((error) => {
        console.error("Unable to sign out:", error);
        setIsSigningOut(false);
      });
  };

  const handleSignOut = async () => {
    if (isSigningOut) return;
    const ok = await confirm({
      title: "Confirm Admin Logout",
      message: "Are you sure you want to log out of the KaagapAI Administrative Portal?",
      confirmText: "Logout",
      cancelText: "Cancel",
      variant: "danger",
      icon: LogOut,
    });
    if (!ok) return;
    confirmSignOut();
  };

  return (
    <header
      className={`sticky top-0 z-30 border-b border-white/70 bg-white/82 shadow-sm backdrop-blur-xl ${className}`}
    >
      <div className="mx-auto flex min-h-[90px] max-w-[1180px] flex-wrap items-center justify-between gap-4 px-6 py-4 lg:flex-nowrap lg:px-8">
        <div className="min-w-0 flex-1 lg:flex-none">
          <h1 className="truncate text-3xl font-extrabold tracking-tight text-[#111827]">{title}</h1>
          {subtitle && (
            <p className="mt-1 truncate text-lg font-medium text-slate-500">{subtitle}</p>
          )}
        </div>

        {middleContent ? (
          <div className="order-3 w-full lg:order-none lg:min-w-[280px] lg:max-w-md lg:flex-1">
            {middleContent}
          </div>
        ) : null}

        <div className="flex shrink-0 items-center gap-3">
          {actions ? (
            <div className="hidden shrink-0 items-center gap-2 sm:flex">
              {actions}
            </div>
          ) : null}

          <div className="relative">
            {showSignOutConfirm
              ? createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
                  <div className="relative w-full max-w-[420px] rounded-[1.1rem] border border-white/20 bg-white/95 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl">
                    <div className="rounded-[0.85rem] bg-gradient-to-br from-rose-50 to-rose-100 p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/70 ring-1 ring-rose-100">
                          <img src="/logo.png" alt="Barangay logo" className="h-9 w-9 object-contain" />
                        </div>
                        <div>
                          <div className="text-sm font-extrabold text-rose-800">Sign out</div>
                          <div className="mt-1 text-sm font-semibold text-slate-800">Are you sure you want to sign out?</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowSignOutConfirm(false)}
                        className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        disabled={isSigningOut}
                      >
                        No
                      </button>
                      <button
                        type="button"
                        onClick={confirmSignOut}
                        disabled={isSigningOut}
                        className="rounded-md bg-rose-600 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSigningOut ? "Signing out..." : "Yes"}
                      </button>
                    </div>
                  </div>
                </div>,
                document.body
              )
              : null}

            <button
              onClick={toggleNotifications}

              className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700 hover:shadow-md"
              aria-label="Notifications"
            >
              <Bell size={24} />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex min-h-6 min-w-6 items-center justify-center rounded-full bg-[#FFB800] px-1.5 text-xs font-bold text-white shadow-[0_0_0_3px_rgba(255,184,0,0.16)]">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="dashboard-v2-popup hd-surface-strong absolute right-0 top-full z-50 mt-3 w-[340px] overflow-hidden rounded-lg">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {unreadCount} unread
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => loadNotifications({ silent: false })}
                      disabled={notificationsLoading}
                      className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Refresh notifications"
                      title="Refresh"
                    >
                      <RefreshCw size={15} className={notificationsLoading ? "animate-spin" : ""} />
                    </button>
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      disabled={notifications.length === 0 || unreadCount === 0}
                      className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Mark all notifications as read"
                      title="Mark all read"
                    >
                      <CheckCheck size={15} />
                    </button>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                      aria-label="Close notifications"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {notificationError ? (
                  <div className="mx-4 mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                    {notificationError}
                  </div>
                ) : null}

                <div className="max-h-[420px] overflow-y-auto p-3">
                  {notificationsLoading && notifications.length === 0 ? (
                    <div className="flex items-center gap-2 px-2 py-6 text-sm text-slate-500">
                      <Loader2 size={16} className="animate-spin" />
                      Loading notifications...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="px-2 py-6 text-center text-sm text-slate-500">
                      No admin notifications right now.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {notifications.map((notification) => (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() => handleNotificationOpen(notification)}
                          className={`w-full rounded-lg border p-3 text-left transition hover:border-blue-200 hover:bg-blue-50/60 ${notification.is_read
                              ? "border-slate-200/70 bg-white/70"
                              : "border-blue-100 bg-blue-50/40"
                            }`}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${getNotificationAccent(
                                notification.tone
                              )}`}
                            >
                              <Bell size={14} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-start justify-between gap-3">
                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-semibold text-slate-900">
                                    {notification.title}
                                  </span>
                                  <span className="mt-1 block text-sm leading-5 text-slate-600">
                                    {notification.message}
                                  </span>
                                </span>
                                {!notification.is_read ? (
                                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                                ) : null}
                              </span>
                              <span className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-400">
                                <span className="truncate">{notification.source}</span>
                                <span className="shrink-0">{getRelativeTime(notification.created_at)}</span>
                              </span>
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNotifications(false);
                      navigate("/documents");
                    }}
                    className="text-xs font-semibold text-blue-700 transition hover:text-blue-800"
                  >
                    Open document requests
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => {
                setShowProfile(!showProfile);
                setShowNotifications(false);
              }}
              className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
            >
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-700 ring-2 ring-emerald-100">
                {profilePhotoUrl ? (
                  <img src={profilePhotoUrl} alt="" className="h-full w-full rounded-full object-cover" />
                ) : (
                  <User size={24} />
                )}
              </span>
              <div className="hidden text-left sm:block">
                <p className="max-w-[150px] truncate text-base font-bold text-slate-900">{displayName}</p>
                <p className="text-sm capitalize text-slate-500">{displayRole}</p>
              </div>
              <ChevronDown size={20} className="hidden text-slate-400 sm:block ml-2" />
            </button>

            {showProfile && (
              <div className="dashboard-v2-popup hd-surface-strong absolute right-0 top-full z-50 mt-3 w-64 rounded-lg p-4">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                    {profilePhotoUrl ? (
                      <img src={profilePhotoUrl} alt="" className="h-full w-full rounded-full object-cover" />
                    ) : (
                      <User size={20} />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{displayName}</p>
                    <p className="truncate text-sm text-slate-500">{displayEmail}</p>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <Link
                    to="/profile-settings"
                    onClick={() => setShowProfile(false)}
                    className="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    Profile Settings
                  </Link>
                  <Link
                    to="/account-security"
                    onClick={() => setShowProfile(false)}
                    className="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    Account Security
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="w-full rounded-md px-3 py-2 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSigningOut ? "Signing out..." : "Sign Out"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

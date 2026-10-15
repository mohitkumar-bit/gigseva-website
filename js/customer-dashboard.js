document.addEventListener("DOMContentLoaded", () => {

    if (!window.AuthStore?.isLoggedIn()) {
        window.location.replace("login.html");
        return;
    }

    function registeredDateFromId(id) {
        const raw = String(id || "");
        if (!/^[a-fA-F0-9]{24}$/.test(raw)) return null;
        const seconds = parseInt(raw.slice(0, 8), 16);
        if (!seconds) return null;
        return new Date(seconds * 1000);
    }

    function formatMemberSince(user) {
        const dateValue = user?.createdAt || registeredDateFromId(user?.id || user?._id);
        if (!dateValue) return "—";
        const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
        if (Number.isNaN(date.getTime())) return "—";
        return date.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
    }

    function formatPlanDate(dateValue) {
        if (!dateValue) return "—";
        const date = new Date(dateValue);
        if (Number.isNaN(date.getTime())) return "—";
        return date.toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    }

    function planLabel(plan) {
        const key = String(plan || "free").toLowerCase();
        if (key === "pro") return "Pro Plan";
        if (key === "business") return "Business Plan";
        return "Free Plan";
    }

    function fillQuota(quota) {
        if (!quota) return;

        const setText = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        const setProgress = (id, used, limit) => {
            const el = document.getElementById(id);
            if (!el) return;
            const safeLimit = Math.max(limit, 1);
            const pct = Math.min(100, Math.round((used / safeLimit) * 100));
            el.style.width = `${pct}%`;
        };

        const postsUsed = quota.subscriptionPostsUsed ?? quota.postCount ?? 0;
        const postsLimit = quota.postLimit ?? 1;
        const postsPlanLeft = quota.subscriptionPostsRemaining ?? Math.max(0, postsLimit - postsUsed);
        const boostsUsed = quota.subscriptionFeaturesUsed ?? quota.featuredCount ?? 0;
        const boostsLimit = quota.featuredLimit ?? 0;
        const boostsPlanLeft = quota.subscriptionFeaturesRemaining ?? Math.max(0, boostsLimit - boostsUsed);
        const extraPosts = quota.extraPostCredits ?? 0;
        const extraBoosts = quota.extraFeatureCredits ?? 0;
        const videoPosts = quota.videoPostCredits ?? 0;
        const bannerAds = quota.bannerAdCredits ?? 0;
        const postsLeft = postsPlanLeft + extraPosts;
        const boostsLeft = boostsPlanLeft + extraBoosts;

        setText("dashQuotaSubPosts", String(postsLeft));
        let postsUsedLabel = `${postsUsed} of ${postsLimit} plan posts used this month`;
        if (extraPosts > 0) {
            postsUsedLabel += ` · ${extraPosts} rolled over`;
        }
        setText("dashQuotaSubPostsUsed", postsUsedLabel);
        setProgress("dashQuotaPostsProgress", postsUsed, postsLimit);
        setText(
            "dashQuotaSubBoosts",
            boostsLimit === 0 && extraBoosts === 0 ? "0" : String(boostsLeft)
        );
        let boostsUsedLabel =
            boostsLimit === 0
                ? extraBoosts > 0
                    ? `${extraBoosts} rolled over boost${extraBoosts === 1 ? "" : "s"}`
                    : "Not included on Free plan"
                : `${boostsUsed} of ${boostsLimit} plan boosts used this month`;
        if (boostsLimit > 0 && extraBoosts > 0) {
            boostsUsedLabel += ` · ${extraBoosts} rolled over`;
        }
        setText("dashQuotaSubBoostsUsed", boostsUsedLabel);
        setProgress("dashQuotaBoostsProgress", boostsUsed, boostsLimit || 1);
        setText("dashQuotaVideoPosts", String(videoPosts));
        setText("dashQuotaBannerAds", String(bannerAds));

        document.dispatchEvent(new CustomEvent("dashQuotaUpdated", { detail: quota }));
    }

    window.__dashFillQuota = fillQuota;

    function setVerifiedBadges(isVerified) {
        const show = !!isVerified;
        document.querySelectorAll("[data-verified-badge]").forEach((el) => {
            el.hidden = !show;
            el.style.display = show ? "inline-flex" : "none";
        });
    }

    function fillUser(user) {
        if (!user) return;

        const name = user.name || "User";
        const email = user.email || "";
        const phoneDigits = String(user.phone || "").replace(/\D/g, "");
        const phone = phoneDigits
            ? `+91 ${phoneDigits}`
            : "—";
        const location =
            user.location ||
            [user.locationDetails?.city, user.locationDetails?.state]
                .filter(Boolean)
                .join(", ") ||
            "—";
        const avatar = user.profilePicture || "images/logo.jpeg";
        const sub = user.subscription && typeof user.subscription === "object"
            ? user.subscription
            : {};
        const rawPlan = String(sub.plan || "free").toLowerCase();
        const isPaidPlan =
            (rawPlan === "pro" || rawPlan === "business") &&
            String(sub.status || "").toLowerCase() === "active";
        const plan = isPaidPlan ? rawPlan : "free";
        const status = isPaidPlan
            ? String(sub.status).charAt(0).toUpperCase() + String(sub.status).slice(1)
            : "Active";

        const setText = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        setText("dashSidebarName", name);
        setText("dashSidebarEmail", email || "—");
        setText("dashWelcomeTitle", `Welcome Back, ${name}`);
        setText("dashProfileName", name);
        setText("dashProfileEmail", email || "—");
        setText("dashProfilePhone", phone);
        setText("dashProfileLocation", location);
        setText("dashProfileMemberSince", formatMemberSince(user));
        setVerifiedBadges(!!user.isVerified);

        setText("dashOverviewPlan", planLabel(plan));
        setText("dashOverviewStatus", status);
        setText(
            "dashOverviewValidTill",
            isPaidPlan ? formatPlanDate(sub.endDate) : "Forever"
        );

        // Always show current plan (Free if no paid subscription) + shop
        const currentEl = document.getElementById("subscriptionCurrent");
        const shopEl = document.getElementById("subscriptionShop");
        if (currentEl) currentEl.hidden = false;
        if (shopEl) shopEl.hidden = false;

        // Mark active plan / hide Free+Pro when on higher plan
        document.querySelectorAll("[data-plan-card]").forEach((card) => {
            const cardPlan = card.getAttribute("data-plan-card");
            const buyBtn = card.querySelector("[data-buy-plan]");
            const isCurrent = cardPlan === plan;

            if (cardPlan === "free" && isPaidPlan) {
                card.hidden = true;
                return;
            }
            if (cardPlan === "pro" && plan === "business") {
                card.hidden = true;
                return;
            }
            card.hidden = false;

            if (!buyBtn) return;
            if (isCurrent) {
                buyBtn.textContent = "Current Plan";
                buyBtn.disabled = true;
                buyBtn.classList.add("is-current");
                card.classList.add("is-current-plan");
            } else if (cardPlan === "free") {
                buyBtn.textContent = "Included";
                buyBtn.disabled = true;
                buyBtn.classList.remove("is-current");
                card.classList.remove("is-current-plan");
            } else {
                buyBtn.textContent = "Buy Now";
                buyBtn.disabled = false;
                buyBtn.classList.remove("is-current");
                card.classList.remove("is-current-plan");
            }
        });

        document.querySelectorAll("[data-buy-credit]").forEach((btn) => {
            btn.disabled = false;
            btn.title = "";
        });

        if (isPaidPlan) {
            const price = plan === "business" ? "₹999" : "₹199";
            const priceLabel = plan === "business" ? "/ 6 months" : "/ month";
            const validity = plan === "business" ? "6 Months" : "1 Month";
            setText("dashSubBadge", status || "Active");
            setText("dashSubPlanName", planLabel(plan));
            setText("dashSubPrice", price);
            setText("dashSubPriceLabel", priceLabel);
            setText("dashSubStart", formatPlanDate(sub.startDate));
            setText("dashSubValidity", validity);
            setText("dashSubEnd", formatPlanDate(sub.endDate));
            setText("dashSubPayment", "Paid");
            setText(
                "dashSubId",
                sub._id ? `GIG-${String(sub._id).slice(-6).toUpperCase()}` : "—"
            );
        } else {
            setText("dashSubBadge", "Active");
            setText("dashSubPlanName", "Free Plan");
            setText("dashSubPrice", "₹0");
            setText("dashSubPriceLabel", "/ forever");
            setText("dashSubStart", formatMemberSince(user));
            setText("dashSubValidity", "Forever");
            setText("dashSubEnd", "—");
            setText("dashSubPayment", "Free");
            setText("dashSubId", "FREE");
        }

        const img = document.getElementById("dashAvatar");
        if (img) {
            img.src = avatar;
            img.alt = name;
        }

        const removeBtn = document.getElementById("dashRemovePhotoBtn");
        if (removeBtn) {
            removeBtn.hidden = !user.profilePicture;
        }

        const planBtn = document.getElementById("dashPlanVerifyBtn");
        if (planBtn) planBtn.dataset.plan = isPaidPlan ? plan : "free";

        if (plan === "business" && isPaidPlan) {
            loadBusinessVerification(user);
            updatePlanVerifyTrigger(true);
        } else {
            showGetVerifiedHint();
            updatePlanVerifyTrigger(true);
            closeVerifyModal();
        }
    }

    function setPlanVerifyHint(text, variant) {
        const hint = document.getElementById("dashPlanVerifyHint");
        if (!hint) return;
        hint.hidden = false;
        hint.textContent = text;
        hint.style.color = "";
        hint.classList.remove("is-cta", "is-verified", "is-pending", "is-rejected");
        if (variant) hint.classList.add(variant);
    }

    function showGetVerifiedHint() {
        setPlanVerifyHint("Get verified", "is-cta");
    }

    function updatePlanVerifyTrigger(enabled) {
        const planBtn = document.getElementById("dashPlanVerifyBtn");
        if (!planBtn) return;
        planBtn.classList.toggle("is-verify-trigger", enabled);
        planBtn.disabled = false;
    }

    function showUpgradeForVerification() {
        const upgrade = document.getElementById("dashVerifyUpgrade");
        const form = document.getElementById("dashVerifyForm");
        const title = document.getElementById("dashVerifyModalTitle");
        const msgEl = document.getElementById("dashVerifyMessage");
        ["dashVerifyVerified", "dashVerifyPending", "dashVerifyRejected", "dashVerifyBadge"].forEach((id) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.hidden = true;
            el.style.display = "none";
        });
        if (form) {
            form.hidden = true;
            form.style.display = "none";
        }
        if (title) title.textContent = "Get verified";
        if (msgEl) {
            msgEl.textContent = "Verification is available on the Business plan only.";
        }
        if (upgrade) {
            upgrade.hidden = false;
            upgrade.style.display = "";
        }
        setVerifyError("");
        openVerifyModal();
    }

    function openVerifyModal() {
        const modal = document.getElementById("dashVerifyModal");
        if (!modal) return;
        modal.hidden = false;
        document.body.style.overflow = "hidden";
    }

    function closeVerifyModal() {
        const modal = document.getElementById("dashVerifyModal");
        if (!modal) return;
        modal.hidden = true;
        document.body.style.overflow = "";
        setVerifyError("");
    }

    function bindVerifyModal() {
        document.getElementById("dashPlanVerifyBtn")?.addEventListener("click", () => {
            const btn = document.getElementById("dashPlanVerifyBtn");
            if (!btn?.classList.contains("is-verify-trigger")) return;
            if (btn.dataset.plan === "business") {
                const upgrade = document.getElementById("dashVerifyUpgrade");
                if (upgrade) {
                    upgrade.hidden = true;
                    upgrade.style.display = "none";
                }
                openVerifyModal();
                return;
            }
            showUpgradeForVerification();
        });
        document.getElementById("dashVerifyUpgradeBtn")?.addEventListener("click", () => {
            closeVerifyModal();
            document.querySelector('[data-plan-card="business"]')?.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
        });
        document.getElementById("dashVerifyModalClose")?.addEventListener("click", closeVerifyModal);
        document.getElementById("dashVerifyModalBackdrop")?.addEventListener("click", closeVerifyModal);
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") closeVerifyModal();
        });
    }

    function setVerifyError(message) {
        const el = document.getElementById("dashVerifyError");
        if (!el) return;
        if (!message) {
            el.hidden = true;
            el.textContent = "";
            return;
        }
        el.hidden = false;
        el.textContent = message;
    }

    function renderVerificationUI({ verification, message }) {
        const card = document.getElementById("businessVerification");
        const msgEl = document.getElementById("dashVerifyMessage");
        const badge = document.getElementById("dashVerifyBadge");
        const verifiedEl = document.getElementById("dashVerifyVerified");
        const pendingEl = document.getElementById("dashVerifyPending");
        const rejectedEl = document.getElementById("dashVerifyRejected");
        const form = document.getElementById("dashVerifyForm");
        const rejectReason = document.getElementById("dashVerifyRejectReason");

        if (!card) return;

        const status = verification?.status || "none";
        const isVerified = !!verification?.isVerified;
        const isPending = status === "pending";
        const isRejected = status === "rejected";
        const canSubmit = !!verification?.canSubmit && !isVerified && !isPending;

        if (msgEl) {
            if (isPending) {
                msgEl.textContent = "Aadhaar verified successfully.";
            } else if (isVerified) {
                msgEl.textContent = "Your account is verified.";
            } else {
                msgEl.textContent = message || "Verify your Aadhaar with OTP to get a verified badge on your profile.";
            }
        }

        if (verifiedEl) {
            verifiedEl.hidden = !isVerified;
            verifiedEl.style.display = isVerified ? "" : "none";
        }
        if (pendingEl) {
            pendingEl.hidden = !isPending;
            pendingEl.style.display = isPending ? "" : "none";
        }
        if (rejectedEl) {
            rejectedEl.hidden = !isRejected;
            rejectedEl.style.display = isRejected ? "" : "none";
            if (isRejected && rejectReason) {
                rejectReason.textContent =
                    verification?.rejectionReason ||
                    "Verification was rejected. Please submit again.";
            }
        }
        if (badge) {
            badge.hidden = !isVerified;
            badge.style.display = isVerified ? "" : "none";
        }
        if (form) {
            form.hidden = !canSubmit;
            form.style.display = canSubmit ? "" : "none";
        }
        setVerifiedBadges(isVerified);
        setVerifyError("");

        const upgrade = document.getElementById("dashVerifyUpgrade");
        if (upgrade) {
            upgrade.hidden = true;
            upgrade.style.display = "none";
        }

        const hint = document.getElementById("dashPlanVerifyHint");
        if (hint) {
            if (isVerified) {
                setPlanVerifyHint("Verified", "is-verified");
            } else if (isPending) {
                setPlanVerifyHint("Pending", "is-pending");
            } else if (isRejected) {
                setPlanVerifyHint("Retry verification", "is-rejected");
            } else if (canSubmit) {
                setPlanVerifyHint("Get verified", "is-cta");
            } else {
                hint.hidden = true;
            }
        }
    }

    function resetVerificationForm() {
        const form = document.getElementById("dashVerifyForm");
        form?.reset();
        const stepAadhaar = document.getElementById("verifyStepAadhaar");
        const stepOtp = document.getElementById("verifyStepOtp");
        if (stepAadhaar) stepAadhaar.hidden = false;
        if (stepOtp) stepOtp.hidden = true;
        const hint = document.getElementById("verifyOtpHint");
        if (hint) hint.textContent = "OTP sent to your Aadhaar-linked mobile number.";
    }

    function showVerifyOtpStep(maskedAadhaar) {
        const stepAadhaar = document.getElementById("verifyStepAadhaar");
        const stepOtp = document.getElementById("verifyStepOtp");
        const hint = document.getElementById("verifyOtpHint");
        if (stepAadhaar) stepAadhaar.hidden = true;
        if (stepOtp) stepOtp.hidden = false;
        if (hint && maskedAadhaar) {
            hint.textContent = `OTP sent for Aadhaar ${maskedAadhaar}. Enter the code from your mobile.`;
        }
        document.getElementById("verifyOtp")?.focus();
    }

    function bindVerificationForm() {
        const form = document.getElementById("dashVerifyForm");
        if (!form) return;

        const aadhaarInput = document.getElementById("verifyAadhaarNumber");
        const otpInput = document.getElementById("verifyOtp");
        const sendOtpBtn = document.getElementById("verifySendOtpBtn");
        const changeAadhaarBtn = document.getElementById("verifyChangeAadhaar");

        aadhaarInput?.addEventListener("input", () => {
            if (!aadhaarInput) return;
            aadhaarInput.value = aadhaarInput.value.replace(/\D/g, "").slice(0, 12);
        });

        otpInput?.addEventListener("input", () => {
            if (!otpInput) return;
            otpInput.value = otpInput.value.replace(/\D/g, "").slice(0, 6);
        });

        sendOtpBtn?.addEventListener("click", async () => {
            setVerifyError("");
            const aadhaar = aadhaarInput?.value?.trim() || "";
            if (!/^\d{12}$/.test(aadhaar)) {
                setVerifyError("Enter a valid 12-digit Aadhaar number.");
                return;
            }

            const label = sendOtpBtn.querySelector("span");
            const prev = label?.textContent || "Send OTP";
            sendOtpBtn.disabled = true;
            if (label) label.textContent = "Sending...";

            try {
                const result = await AuthApi.sendAadhaarOtp(aadhaar);
                showVerifyOtpStep(result.maskedAadhaar);
            } catch (err) {
                setVerifyError(err.message || "Could not send OTP");
            } finally {
                sendOtpBtn.disabled = false;
                if (label) label.textContent = prev;
            }
        });

        changeAadhaarBtn?.addEventListener("click", () => {
            setVerifyError("");
            const stepAadhaar = document.getElementById("verifyStepAadhaar");
            const stepOtp = document.getElementById("verifyStepOtp");
            if (stepAadhaar) stepAadhaar.hidden = false;
            if (stepOtp) stepOtp.hidden = true;
            if (otpInput) otpInput.value = "";
        });

        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            setVerifyError("");

            const aadhaar = aadhaarInput?.value?.trim() || "";
            const otp = otpInput?.value?.trim() || "";

            if (!/^\d{12}$/.test(aadhaar)) {
                setVerifyError("Enter a valid 12-digit Aadhaar number.");
                return;
            }
            if (!/^\d{6}$/.test(otp)) {
                setVerifyError("Enter the 6-digit OTP.");
                return;
            }

            const submitBtn = document.getElementById("dashVerifySubmit");
            const label = submitBtn?.querySelector("span");
            const prev = label ? label.textContent : "";
            if (submitBtn) submitBtn.disabled = true;
            if (label) label.textContent = "Verifying...";

            try {
                const result = await AuthApi.verifyAadhaarAndSubmit({
                    aadhaar_number: aadhaar,
                    otp,
                });
                resetVerificationForm();
                renderVerificationUI({
                    verification: result.verification || {
                        isVerified: false,
                        status: "pending",
                        canSubmit: false,
                    },
                    message: result.message || "Aadhaar verified. Waiting for admin approval.",
                });
                closeVerifyModal();

                const user = await AuthApi.getProfile();
                fillUser(user);
                if (typeof renderAuthNav === "function") renderAuthNav();
            } catch (err) {
                setVerifyError(err.message || "Could not verify Aadhaar");
            } finally {
                if (submitBtn) submitBtn.disabled = false;
                if (label) label.textContent = prev || "Verify & submit for approval";
            }
        });
    }

    async function loadBusinessVerification(user) {
        try {
            const data = await AuthApi.getVerificationEligibility();
            renderVerificationUI({
                verification: data.verification,
                message: data.message,
            });
        } catch (err) {
            const card = document.getElementById("businessVerification");
            if (!card) return;
            card.hidden = false;
            const msgEl = document.getElementById("dashVerifyMessage");
            if (msgEl) msgEl.textContent = err.message || "Could not load verification status.";

            const isVerified = !!user?.isVerified;
            const status = user?.verificationStatus || "none";
            renderVerificationUI({
                verification: {
                    isVerified,
                    status,
                    canSubmit: user?.canVerify && status !== "pending",
                },
                message: isVerified
                    ? "Your account is already verified."
                    : status === "pending"
                      ? "Aadhaar verified. Waiting for admin approval."
                      : "Verify your Aadhaar with OTP to get a verified badge.",
            });
        }
    }

    function setAvatarStatus(message, type) {
        const el = document.getElementById("dashAvatarStatus");
        if (!el) return;
        if (!message) {
            el.hidden = true;
            el.textContent = "";
            el.classList.remove("is-error", "is-success");
            return;
        }
        el.hidden = false;
        el.textContent = message;
        el.classList.toggle("is-error", type === "error");
        el.classList.toggle("is-success", type === "success");
    }

    function closePhotoMenu() {
        const menu = document.getElementById("dashPhotoMenu");
        const btn = document.getElementById("dashAvatarBtn");
        const wrap = document.querySelector(".profile-image-wrap");
        if (menu) menu.hidden = true;
        if (btn) btn.setAttribute("aria-expanded", "false");
        if (wrap) wrap.classList.remove("is-menu-open");
    }

    function openPhotoMenu() {
        const menu = document.getElementById("dashPhotoMenu");
        const btn = document.getElementById("dashAvatarBtn");
        const wrap = document.querySelector(".profile-image-wrap");
        if (menu) menu.hidden = false;
        if (btn) btn.setAttribute("aria-expanded", "true");
        if (wrap) wrap.classList.add("is-menu-open");
    }

    function getCurrentPhotoUrl() {
        const user = AuthStore.getUser();
        return user?.profilePicture || document.getElementById("dashAvatar")?.src || "";
    }

    function openPhotoViewer() {
        const lightbox = document.getElementById("dashPhotoLightbox");
        const img = document.getElementById("dashPhotoLightboxImg");
        const url = getCurrentPhotoUrl();
        if (!lightbox || !img || !url) return;
        img.src = url;
        lightbox.hidden = false;
        closePhotoMenu();
    }

    function closePhotoViewer() {
        const lightbox = document.getElementById("dashPhotoLightbox");
        if (lightbox) lightbox.hidden = true;
    }

    async function handleAvatarFile(file) {
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setAvatarStatus("Please choose an image file.", "error");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setAvatarStatus("Image must be under 5MB.", "error");
            return;
        }

        const btn = document.getElementById("dashAvatarBtn");
        if (btn) btn.disabled = true;
        setAvatarStatus("Uploading photo...", null);
        closePhotoMenu();

        const previewUrl = URL.createObjectURL(file);
        const sidebar = document.getElementById("dashAvatar");
        if (sidebar) sidebar.src = previewUrl;

        try {
            const user = await AuthApi.uploadProfilePicture(file);
            fillUser(user);
            if (typeof renderAuthNav === "function") renderAuthNav();
            setAvatarStatus("Profile picture updated.", "success");
        } catch (err) {
            fillUser(AuthStore.getUser());
            setAvatarStatus(err.message || "Upload failed.", "error");
        } finally {
            URL.revokeObjectURL(previewUrl);
            if (btn) btn.disabled = false;
            const input = document.getElementById("dashAvatarInput");
            if (input) input.value = "";
        }
    }

    fillUser(AuthStore.getUser());
    bindVerificationForm();
    bindVerifyModal();

    async function refreshDashboard() {
        try {
            const [user, quota] = await Promise.all([
                AuthApi.getProfile(),
                AuthApi.getQuota(),
            ]);
            fillUser(user);
            fillQuota(quota);
            if (typeof renderAuthNav === "function") renderAuthNav();
        } catch {
            AuthStore.clear();
            window.location.replace("login.html");
        }
    }

    refreshDashboard();

    const avatarInput = document.getElementById("dashAvatarInput");
    const avatarBtn = document.getElementById("dashAvatarBtn");
    const photoMenu = document.getElementById("dashPhotoMenu");

    avatarBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        if (photoMenu?.hidden) openPhotoMenu();
        else closePhotoMenu();
    });

    photoMenu?.addEventListener("click", (e) => e.stopPropagation());

    document.getElementById("dashViewPhotoBtn")?.addEventListener("click", openPhotoViewer);
    document.getElementById("dashUpdatePhotoBtn")?.addEventListener("click", () => {
        closePhotoMenu();
        avatarInput?.click();
    });
    avatarInput?.addEventListener("change", () => {
        handleAvatarFile(avatarInput.files?.[0]);
    });

    document.getElementById("dashRemovePhotoBtn")?.addEventListener("click", async () => {
        const removeBtn = document.getElementById("dashRemovePhotoBtn");
        if (removeBtn) removeBtn.disabled = true;
        closePhotoMenu();
        setAvatarStatus("Removing photo...", null);
        try {
            const user = await AuthApi.removeProfilePicture();
            fillUser(user);
            if (typeof renderAuthNav === "function") renderAuthNav();
            setAvatarStatus("Profile picture removed.", "success");
        } catch (err) {
            setAvatarStatus(err.message || "Could not remove photo.", "error");
        } finally {
            if (removeBtn) removeBtn.disabled = false;
        }
    });

    document.getElementById("dashPhotoLightboxClose")?.addEventListener("click", closePhotoViewer);
    document.getElementById("dashPhotoLightbox")?.addEventListener("click", (e) => {
        if (e.target.id === "dashPhotoLightbox") closePhotoViewer();
    });

    document.addEventListener("click", closePhotoMenu);
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closePhotoMenu();
            closePhotoViewer();
        }
    });

    document.querySelectorAll("[data-logout]").forEach((btn) => {
        btn.addEventListener("click", async (event) => {
            event.preventDefault();
            await AuthApi.logout();
            window.location.href = "login.html";
        });
    });

    async function startCheckout(btn, runner) {
        const prev = btn.textContent;
        btn.disabled = true;
        btn.textContent = "Opening...";
        try {
            const order = await runner();
            const result = await AuthApi.openRazorpayCheckout(order);
            if (result?.status === "success") {
                alert("Payment successful!");
                window.location.reload();
                return;
            }
            throw new Error(result?.message || "Payment not completed");
        } catch (err) {
            if (err.message !== "Payment cancelled") {
                alert(err.message || "Could not complete payment");
            }
            btn.disabled = false;
            btn.textContent = prev;
        }
    }

    document.querySelectorAll("[data-buy-plan]").forEach((btn) => {
        btn.addEventListener("click", () => {
            if (btn.disabled || btn.classList.contains("is-current")) return;
            const plan = btn.getAttribute("data-buy-plan");
            if (plan === "free") return;
            startCheckout(btn, () => AuthApi.createPlanOrder(plan));
        });
    });

    document.querySelectorAll("[data-buy-credit]").forEach((btn) => {
        btn.addEventListener("click", () => {
            if (btn.disabled) return;
            const kind = btn.getAttribute("data-buy-credit");
            startCheckout(btn, () => AuthApi.createCreditOrder(kind));
        });
    });

    document.querySelectorAll("[data-buy-soon]").forEach((btn) => {
        btn.addEventListener("click", () => {
            alert("This booster will be available soon.");
        });
    });

    // Legacy attribute (no longer used for Extra Ad / Boost)
    document.querySelectorAll("[data-buy-addon]").forEach((btn) => {
        btn.addEventListener("click", () => {
            alert("Buy Extra Ad or Extra Boost from My Subscription.");
        });
    });

    const menuItems = document.querySelectorAll(".account-menu-item");
    const sections = document.querySelectorAll(".dashboard-section");

    function showSection(sectionId) {
        menuItems.forEach((item) => item.classList.remove("active"));
        sections.forEach((section) => {
            section.style.display = "none";
        });

        const selectedSection = document.getElementById(sectionId);
        if (!selectedSection) return;

        selectedSection.style.display = "block";

        const activeMenu = document.querySelector(
            `.account-menu-item[href="#${sectionId}"]`
        );
        if (activeMenu) activeMenu.classList.add("active");
    }

    menuItems.forEach((item) => {
        item.addEventListener("click", function (event) {
            const href = this.getAttribute("href");
            if (!href || !href.startsWith("#")) return;

            event.preventDefault();
            const sectionId = href.substring(1);
            showSection(sectionId);
            history.pushState(null, "", `#${sectionId}`);
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    });

    window.addEventListener("popstate", () => {
        const hash = window.location.hash.replace("#", "");
        if (hash && document.getElementById(hash)) {
            showSection(hash);
        } else {
            showSection("dashboard");
        }
    });

    const initialHash = window.location.hash.replace("#", "");
    if (initialHash && document.getElementById(initialHash)) {
        showSection(initialHash);
    } else {
        showSection("dashboard");
        history.replaceState(null, "", "#dashboard");
    }
});

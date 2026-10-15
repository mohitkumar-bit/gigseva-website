document.addEventListener("DOMContentLoaded", () => {
    if (!window.AuthStore?.isLoggedIn()) return;

    const MAX_VIDEO_SECONDS = 30;
    const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
    let categories = [];
    let currentUser = null;
    let videoDurationSeconds = null;

    const videoModal = document.getElementById("dashVideoUploadModal");
    const bannerModal = document.getElementById("dashBannerUploadModal");
    const videoBtn = document.getElementById("dashUploadVideoBtn");
    const bannerBtn = document.getElementById("dashUploadBannerBtn");

    function setError(el, message) {
        if (!el) return;
        if (!message) {
            el.hidden = true;
            el.textContent = "";
            return;
        }
        el.hidden = false;
        el.textContent = message;
    }

    function sanitizeNoNumbers(value, max) {
        return String(value || "").replace(/[0-9]/g, "").slice(0, max);
    }

    function validateTitleDescription(title, description) {
        const cleanTitle = sanitizeNoNumbers(title, 20);
        const cleanDescription = sanitizeNoNumbers(description, 29);
        if (!cleanTitle) return { error: "Title is required (max 20 characters, no numbers)." };
        if (!cleanDescription) {
            return { error: "Description is required (max 29 characters, no numbers)." };
        }
        return { title: cleanTitle, description: cleanDescription };
    }

    function buildLocation(cityText) {
        const city = String(cityText || "").trim();
        const profileLoc = currentUser?.location || {};
        return {
            address: city,
            city: city.split(",")[0]?.trim() || city,
            state: profileLoc.state || "",
            coordinates: Array.isArray(profileLoc.coordinates)
                ? profileLoc.coordinates
                : [0, 0],
        };
    }

    function fillCategorySelect(selectEl) {
        if (!selectEl) return;
        selectEl.innerHTML = "";
        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "Select category";
        placeholder.disabled = true;
        placeholder.selected = true;
        selectEl.appendChild(placeholder);
        categories.forEach((cat) => {
            const opt = document.createElement("option");
            opt.value = cat._id;
            opt.textContent = cat.name;
            selectEl.appendChild(opt);
        });
    }

    function prefillLocation(inputEl) {
        if (!inputEl || inputEl.value.trim()) return;
        const loc = currentUser?.location || {};
        const text =
            loc.address ||
            [loc.city, loc.state].filter(Boolean).join(", ") ||
            "";
        if (text) inputEl.value = text;
    }

    function updateUploadButtons(quota) {
        const videoCredits = quota?.videoPostCredits ?? 0;
        const bannerCredits = quota?.bannerAdCredits ?? 0;
        if (videoBtn) {
            videoBtn.disabled = videoCredits <= 0;
            videoBtn.title =
                videoCredits <= 0
                    ? "Buy a Video Promotion credit from My Subscription"
                    : "";
        }
        if (bannerBtn) {
            bannerBtn.disabled = bannerCredits <= 0;
            bannerBtn.title =
                bannerCredits <= 0
                    ? "Buy a Banner Promotion credit from My Subscription"
                    : "";
        }
    }

    function openModal(modal) {
        if (!modal) return;
        modal.hidden = false;
        document.body.style.overflow = "hidden";
    }

    function closeModal(modal) {
        if (!modal) return;
        modal.hidden = true;
        document.body.style.overflow = "";
    }

    function closeAllModals() {
        closeModal(videoModal);
        closeModal(bannerModal);
    }

    function assertVideoFileSize(file) {
        if (!file) return;
        if (file.size > MAX_VIDEO_BYTES) {
            throw new Error("Video must be 25 MB or less");
        }
    }

    function getVideoDuration(file) {
        return new Promise((resolve, reject) => {
            const video = document.createElement("video");
            video.preload = "metadata";
            const url = URL.createObjectURL(file);
            video.onloadedmetadata = () => {
                URL.revokeObjectURL(url);
                resolve(video.duration);
            };
            video.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error("Could not read video file"));
            };
            video.src = url;
        });
    }

    async function loadCategories() {
        try {
            categories = await AuthApi.getCategories();
            fillCategorySelect(document.getElementById("dashVideoCategory"));
            fillCategorySelect(document.getElementById("dashBannerCategory"));
        } catch (err) {
            console.error("Failed to load categories", err);
        }
    }

    async function refreshUser() {
        try {
            currentUser = await AuthApi.getProfile();
        } catch {
            currentUser = AuthStore.getUser();
        }
    }

    document.addEventListener("dashQuotaUpdated", (event) => {
        updateUploadButtons(event.detail);
    });

    document.querySelectorAll("[data-promo-modal-close]").forEach((btn) => {
        btn.addEventListener("click", closeAllModals);
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeAllModals();
    });

    videoBtn?.addEventListener("click", () => {
        if (videoBtn.disabled) {
            window.location.hash = "subscription";
            return;
        }
        setError(document.getElementById("dashVideoUploadError"), "");
        document.getElementById("dashVideoUploadForm")?.reset();
        document.getElementById("dashVideoPreview").hidden = true;
        videoDurationSeconds = null;
        prefillLocation(document.getElementById("dashVideoLocation"));
        openModal(videoModal);
    });

    bannerBtn?.addEventListener("click", () => {
        if (bannerBtn.disabled) {
            window.location.hash = "subscription";
            return;
        }
        setError(document.getElementById("dashBannerUploadError"), "");
        document.getElementById("dashBannerUploadForm")?.reset();
        document.getElementById("dashBannerPreview").hidden = true;
        prefillLocation(document.getElementById("dashBannerLocation"));
        openModal(bannerModal);
    });

    document.getElementById("dashVideoFile")?.addEventListener("change", async (event) => {
        const file = event.target.files?.[0];
        const previewWrap = document.getElementById("dashVideoPreview");
        const previewPlayer = document.getElementById("dashVideoPreviewPlayer");
        const errorEl = document.getElementById("dashVideoUploadError");
        setError(errorEl, "");
        videoDurationSeconds = null;

        if (!file || !previewWrap || !previewPlayer) return;

        try {
            assertVideoFileSize(file);
            const duration = await getVideoDuration(file);
            if (!Number.isFinite(duration) || duration <= 0) {
                throw new Error("Could not verify video length");
            }
            if (duration > MAX_VIDEO_SECONDS) {
                throw new Error(`Video must be ${MAX_VIDEO_SECONDS} seconds or less`);
            }
            videoDurationSeconds = duration;
            previewPlayer.src = URL.createObjectURL(file);
            previewWrap.hidden = false;
        } catch (err) {
            event.target.value = "";
            previewWrap.hidden = true;
            previewPlayer.removeAttribute("src");
            setError(errorEl, err.message || "Invalid video file");
        }
    });

    document.getElementById("dashBannerFile")?.addEventListener("change", (event) => {
        const file = event.target.files?.[0];
        const previewWrap = document.getElementById("dashBannerPreview");
        const previewImg = document.getElementById("dashBannerPreviewImg");
        const errorEl = document.getElementById("dashBannerUploadError");
        setError(errorEl, "");

        if (!file || !previewWrap || !previewImg) return;
        previewImg.src = URL.createObjectURL(file);
        previewWrap.hidden = false;
    });

    ["dashVideoTitle", "dashVideoDescription", "dashBannerTitle", "dashBannerDescription"].forEach((id) => {
        const input = document.getElementById(id);
        if (!input) return;
        input.addEventListener("input", () => {
            const max = id.includes("Title") ? 20 : 29;
            input.value = sanitizeNoNumbers(input.value, max);
        });
    });

    document.getElementById("dashVideoUploadForm")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const submitBtn = document.getElementById("dashVideoUploadSubmit");
        const errorEl = document.getElementById("dashVideoUploadError");
        setError(errorEl, "");

        const file = document.getElementById("dashVideoFile")?.files?.[0];
        const categoryId = document.getElementById("dashVideoCategory")?.value;
        const locationText = document.getElementById("dashVideoLocation")?.value;
        const parsed = validateTitleDescription(
            document.getElementById("dashVideoTitle")?.value,
            document.getElementById("dashVideoDescription")?.value
        );

        if (parsed.error) {
            setError(errorEl, parsed.error);
            return;
        }
        if (!file) {
            setError(errorEl, "Please select a video file.");
            return;
        }
        if (!categoryId) {
            setError(errorEl, "Please select a category.");
            return;
        }
        if (!String(locationText || "").trim()) {
            setError(errorEl, "Please enter a location.");
            return;
        }

        const prevLabel = submitBtn?.textContent;
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Uploading...";
        }

        try {
            assertVideoFileSize(file);
            if (!videoDurationSeconds) {
                videoDurationSeconds = await getVideoDuration(file);
            }
            const videoUrl = await AuthApi.uploadJobVideo(file, videoDurationSeconds);
            await AuthApi.createVideoPost({
                title: parsed.title,
                description: parsed.description,
                categories: [categoryId],
                price: 0,
                location: buildLocation(locationText),
                videoUrl,
            });

            closeModal(videoModal);
            alert("Video ad published successfully!");
            const quota = await AuthApi.getQuota();
            document.dispatchEvent(new CustomEvent("dashQuotaUpdated", { detail: quota }));
            if (typeof window.__dashFillQuota === "function") {
                window.__dashFillQuota(quota);
            }
        } catch (err) {
            setError(errorEl, err.message || "Failed to publish video ad");
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = prevLabel || "Publish video ad";
            }
        }
    });

    document.getElementById("dashBannerUploadForm")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const submitBtn = document.getElementById("dashBannerUploadSubmit");
        const errorEl = document.getElementById("dashBannerUploadError");
        setError(errorEl, "");

        const file = document.getElementById("dashBannerFile")?.files?.[0];
        const categoryId = document.getElementById("dashBannerCategory")?.value;
        const locationText = document.getElementById("dashBannerLocation")?.value;
        const parsed = validateTitleDescription(
            document.getElementById("dashBannerTitle")?.value,
            document.getElementById("dashBannerDescription")?.value
        );

        if (parsed.error) {
            setError(errorEl, parsed.error);
            return;
        }
        if (!file) {
            setError(errorEl, "Please select a banner image.");
            return;
        }
        if (!categoryId) {
            setError(errorEl, "Please select a category.");
            return;
        }
        if (!String(locationText || "").trim()) {
            setError(errorEl, "Please enter a location.");
            return;
        }

        const prevLabel = submitBtn?.textContent;
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Uploading...";
        }

        try {
            const bannerUrl = await AuthApi.uploadJobImage(file);
            await AuthApi.createBannerPost({
                title: parsed.title,
                description: parsed.description,
                categories: [categoryId],
                price: 0,
                location: buildLocation(locationText),
                bannerUrl,
            });

            closeModal(bannerModal);
            alert("Banner ad published successfully!");
            const quota = await AuthApi.getQuota();
            document.dispatchEvent(new CustomEvent("dashQuotaUpdated", { detail: quota }));
            if (typeof window.__dashFillQuota === "function") {
                window.__dashFillQuota(quota);
            }
        } catch (err) {
            setError(errorEl, err.message || "Failed to publish banner ad");
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = prevLabel || "Publish banner ad";
            }
        }
    });

    (async () => {
        await refreshUser();
        await loadCategories();
        try {
            const quota = await AuthApi.getQuota();
            updateUploadButtons(quota);
        } catch {
            /* ignore */
        }
    })();
});

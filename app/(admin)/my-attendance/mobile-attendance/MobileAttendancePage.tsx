"use client";
import { useI18n } from "@/app/i18n";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import dayjs from "dayjs";
import useSWR from "swr";
import { useDispatch } from "react-redux";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { ProgressSpinner } from "primereact/progressspinner";
import { Avatar } from "primereact/avatar";
import { Divider } from "primereact/divider";
import { showToast } from "@/store/ToastSlice";
import { fetcher } from "@/app/utils/fetcher";
import { submitMobileAttendance } from "@/app/services/mobile-attendance-service";
import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { formatDateTimeWithSeconds } from "@/app/utils/date-format";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";

type PermissionStateUi = "idle" | "granted" | "denied" | "loading" | "error";

type GeoState = {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  capturedAt: Date | null;
};

type CurrentEmployeeProfile = {
  employee_id: number | null;
  employee_name: string | null;
  employee_code: string | null;
  position_name: string | null;
  branch_name: string | null;
  agency_name: string | null;
  photo_url: string | null;
};

const LOCATION_CAPTURED_AT_FORMAT = "DD-MM-YYYY HH:mm:ss";

const buildLocalTimestamp = () => dayjs().format("YYYY-MM-DDTHH:mm:ss");

const pickFirstString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }
  return null;
};

const pickFirstNumber = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (
      typeof value === "string" &&
      value.trim() !== "" &&
      !Number.isNaN(Number(value))
    ) {
      return Number(value);
    }
  }
  return null;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};

const buildFullNameFromParts = (obj: Record<string, unknown>) => {
  const name = [
    obj.first_name,
    obj.middle_name,
    obj.last_name,
    obj.firstName,
    obj.middleName,
    obj.lastName,
  ]
    .filter((item) => typeof item === "string" && item.trim() !== "")
    .join(" ")
    .trim();

  return name || null;
};

const getInitials = (name: string | null | undefined) => {
  if (!name) return "EM";

  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "EM";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
};

const getStatusColorClass = (status: PermissionStateUi) => {
  switch (status) {
    case "granted":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "denied":
      return "border-red-200 bg-red-50 text-red-700";
    case "loading":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "error":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
};

const getStatusLabel = (status: PermissionStateUi) => {
  switch (status) {
    case "granted":
      return "Ready";
    case "denied":
      return "Denied";
    case "loading":
      return "Checking";
    case "error":
      return "Error";
    default:
      return "Not Ready";
  }
};

const buildOpenStreetMapEmbedUrl = (latitude: number, longitude: number) => {
  const delta = 0.005;
  const left = longitude - delta;
  const right = longitude + delta;
  const top = latitude + delta;
  const bottom = latitude - delta;

  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${latitude}%2C${longitude}`;
};

const buildGoogleMapsUrl = (latitude: number, longitude: number) => {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
};

const normalizeProfile = (raw: unknown): CurrentEmployeeProfile => {
  const root = asRecord(raw);
  const nestedData = asRecord(root.data);
  const data = Object.keys(nestedData).length > 0 ? nestedData : root;
  const user = asRecord(data.user);
  const employee = asRecord(data.employee);
  const profile = asRecord(data.profile);
  const employment = asRecord(data.employment);

  const rootFullName = buildFullNameFromParts(data);
  const userFullName = buildFullNameFromParts(user);
  const employeeFullName = buildFullNameFromParts(employee);
  const profileFullName = buildFullNameFromParts(profile);

  return {
    employee_id: pickFirstNumber(
      data.employee_id,
      data.id,
      user.employee_id,
      employee.employee_id,
      employee.id,
      profile.employee_id,
    ),
    employee_name: pickFirstString(
      data.employee_name,
      data.full_name,
      data.fullName,
      data.name,
      user.employee_name,
      user.full_name,
      user.fullName,
      user.name,
      employee.employee_name,
      employee.full_name,
      employee.fullName,
      employee.name,
      profile.employee_name,
      profile.full_name,
      profile.fullName,
      profile.name,
      rootFullName,
      userFullName,
      employeeFullName,
      profileFullName,
    ),
    employee_code: pickFirstString(
      data.employee_code,
      data.code,
      user.employee_code,
      employee.employee_code,
      employee.code,
      profile.employee_code,
      profile.code,
    ),
    position_name: pickFirstString(
      data.position_name,
      employment.position_name,
      employee.position_name,
      profile.position_name,
    ),
    branch_name: pickFirstString(
      data.branch_name,
      employment.branch_name,
      employee.branch_name,
      profile.branch_name,
    ),
    agency_name: pickFirstString(
      data.agency_name,
      employment.agency_name,
      employee.agency_name,
      profile.agency_name,
    ),
    photo_url: pickFirstString(
      data.photo_url,
      user.photo_url,
      employee.photo_url,
      profile.photo_url,
    ),
  };
};

const MobileAttendancePage = () => {
  const { t: i18nT, tText } = useI18n();
  const dispatch = useDispatch();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraPermission, setCameraPermission] =
    useState<PermissionStateUi>("idle");
  const [locationPermission, setLocationPermission] =
    useState<PermissionStateUi>("idle");

  const [cameraError, setCameraError] = useState("");
  const [locationError, setLocationError] = useState("");

  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  const [geoData, setGeoData] = useState<GeoState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    capturedAt: null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionIdRef = useRef<string | null>(null);
  const [lastSubmittedAt, setLastSubmittedAt] = useState<Date | null>(null);
  const [now, setNow] = useState(() => new Date());

  // Ganti endpoint ini kalau endpoint current user di project kamu berbeda.
  const {
    data: currentProfileRaw,
    error: currentProfileError,
    isLoading: currentProfileLoading,
  } = useSWR("/api/auth/me", fetcher);

  const currentProfile = useMemo(
    () => normalizeProfile(currentProfileRaw),
    [currentProfileRaw],
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const attachStreamToVideo = useCallback(async (stream: MediaStream) => {
    if (!videoRef.current) return;

    videoRef.current.srcObject = stream;
    await videoRef.current.play();
  }, []);

  const initializeCamera = useCallback(async () => {
    setCameraPermission("loading");
    setCameraError("");

    if (!window.isSecureContext) {
      setCameraPermission("error");
      setCameraError("Camera access requires HTTPS or localhost.");
      return false;
    }

    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices?.getUserMedia) {
      setCameraPermission("error");
      setCameraError(
        "Camera is unavailable. Use a supported browser over HTTPS or localhost.",
      );
      return false;
    }

    try {
      stopCameraStream();

      const stream = await mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      const firstTrack = stream.getVideoTracks()[0];
      const settings = firstTrack?.getSettings?.();
      if (settings?.deviceId) {
        setDeviceId(settings.deviceId);
      }

      await attachStreamToVideo(stream);
      setCameraPermission("granted");
      return true;
    } catch (error: unknown) {
      setCameraPermission("denied");
      setCameraError(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Camera access was denied. Allow camera permission in the browser site settings."
          : "Camera access was denied or unavailable.",
      );
      stopCameraStream();
      return false;
    }
  }, [attachStreamToVideo, stopCameraStream]);

  const initializeLocation = useCallback((): Promise<boolean> => {
    setLocationPermission("loading");
    setLocationError("");

    if (!window.isSecureContext) {
      setLocationPermission("error");
      setLocationError("Location access requires HTTPS or localhost.");
      return Promise.resolve(false);
    }

    if (!navigator.geolocation) {
      setLocationPermission("error");
      setLocationError("Geolocation is not supported in this browser.");
      return Promise.resolve(false);
    }

    return new Promise((resolve) => {
      try {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setGeoData({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy ?? null,
              capturedAt: new Date(),
            });
            setLocationPermission("granted");
            resolve(true);
          },
          (error) => {
            setLocationPermission("denied");

            switch (error.code) {
              case error.PERMISSION_DENIED:
                setLocationError(
                  "Location access was denied. Allow location permission in the browser site settings.",
                );
                break;
              case error.POSITION_UNAVAILABLE:
                setLocationError("Location information is unavailable.");
                break;
              case error.TIMEOUT:
                setLocationError("Location request timed out.");
                break;
              default:
                setLocationError("Failed to get location.");
                break;
            }
            resolve(false);
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0,
          },
        );
      } catch {
        setLocationPermission("error");
        setLocationError("Location access is unavailable in this browser.");
        resolve(false);
      }
    });
  }, []);

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  const requestAllPermissions = async () => {
    await initializeLocation();
    await initializeCamera();
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: i18nT("static.1vks92p"),
          detail: tText("Camera is not ready."),
        }),
      );
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;

    if (!width || !height) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: i18nT("static.1vks92p"),
          detail: tText("Camera preview is not ready yet."),
        }),
      );
      return;
    }

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: i18nT("static.1vks92p"),
          detail: tText("Failed to access image canvas."),
        }),
      );
      return;
    }

    context.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setCapturedPhoto(dataUrl);

    dispatch(
      showToast({
        visible: true,
        severity: "success",
        summary: i18nT("static.udvru8"),
        detail: tText("Photo captured successfully."),
      }),
    );
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
  };

  const refreshLocation = async () => {
    await initializeLocation();
  };

  const canSubmit = useMemo(() => {
    return (
      !!capturedPhoto &&
      geoData.latitude !== null &&
      geoData.longitude !== null &&
      cameraPermission === "granted" &&
      locationPermission === "granted" &&
      !isSubmitting
    );
  }, [
    capturedPhoto,
    geoData.latitude,
    geoData.longitude,
    cameraPermission,
    locationPermission,
    isSubmitting,
  ]);

  const mapEmbedUrl = useMemo(() => {
    if (geoData.latitude === null || geoData.longitude === null) return null;
    return buildOpenStreetMapEmbedUrl(geoData.latitude, geoData.longitude);
  }, [geoData.latitude, geoData.longitude]);

  const googleMapsUrl = useMemo(() => {
    if (geoData.latitude === null || geoData.longitude === null) return null;
    return buildGoogleMapsUrl(geoData.latitude, geoData.longitude);
  }, [geoData.latitude, geoData.longitude]);

  const handleSubmitAttendance = async () => {
    if (!capturedPhoto) {
      dispatch(
        showToast({
          visible: true,
          severity: "warn",
          summary: i18nT("static.fh2d8v"),
          detail: tText("Please capture photo first."),
        }),
      );
      return;
    }

    if (geoData.latitude === null || geoData.longitude === null) {
      dispatch(
        showToast({
          visible: true,
          severity: "warn",
          summary: i18nT("static.fh2d8v"),
          detail: tText("Location is required before submit."),
        }),
      );
      return;
    }

    setIsSubmitting(true);

    try {
      submissionIdRef.current ??= crypto.randomUUID();
      await submitMobileAttendance({
        event_time_source_local: buildLocalTimestamp(),
        source_tz_offset_minutes: dayjs().utcOffset(),
        submission_id: submissionIdRef.current,
        device_id: deviceId,
        photo_data_url: capturedPhoto,
        latitude: geoData.latitude,
        longitude: geoData.longitude,
        gps_accuracy_meters: geoData.accuracy,
        face_id: null,
        extra_data: {
          capture_method: "camera",
          geo_accuracy: geoData.accuracy,
          location_captured_at: geoData.capturedAt
            ? dayjs(geoData.capturedAt).format(LOCATION_CAPTURED_AT_FORMAT)
            : null,
          user_agent:
            typeof navigator !== "undefined" ? navigator.userAgent : null,
        },
      });

      setLastSubmittedAt(new Date());
      setCapturedPhoto(null);
      submissionIdRef.current = null;

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: i18nT("static.udvru8"),
          detail: tText("Attendance submitted successfully."),
        }),
      );

      await refreshLocation();
    } catch (error: unknown) {
      if (isResponseTypeError(error)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: i18nT("static.1vks92p"),
            detail: getErrorMessage(error, "message"),
          }),
        );
      } else if (error instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: i18nT("static.1vks92p"),
            detail: error.message,
          }),
        );
      } else {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: i18nT("static.1vks92p"),
            detail: tText("Failed to submit attendance."),
          }),
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmSubmitAttendance = () => {
    requestActionConfirmation({
      action: i18nT("static.auu974"),
      target: currentProfile.employee_name ?? tText("current employee"),
      description: i18nT("static.ft6z50"),
      severity: "info",
      confirmLabel: i18nT("static.auu974"),
      confirmIcon: "pi pi-send",
      onAccept: handleSubmitAttendance,
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-3 py-4 md:px-4 lg:gap-5">
      <Card className="shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Avatar
              image={currentProfile.photo_url || undefined}
              label={
                currentProfile.photo_url
                  ? undefined
                  : getInitials(currentProfile.employee_name)
              }
              shape="circle"
              size="large"
              className={
                !currentProfile.photo_url ? "bg-blue-100 text-blue-700" : ""
              }
            />

            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold text-slate-900 md:text-xl">
                {currentProfileLoading
                  ? tText("Loading employee...")
                  : currentProfile.employee_name || tText("Employee")}
              </p>

              <p className="truncate text-sm text-slate-500">
                {currentProfileLoading
                  ? tText("Loading code...")
                  : currentProfile.employee_code || tText("No employee code")}
                {currentProfile.position_name
                  ? i18nT("static.8ajqn4", { p0: currentProfile.position_name })
                  : ""}
              </p>

              <p className="truncate text-xs text-slate-500 md:text-sm">
                {[currentProfile.branch_name, currentProfile.agency_name]
                  .filter(Boolean)
                  .join(" · ") || tText("Web Attendance")}
              </p>

              {currentProfileError && (
                <p className="mt-1 text-xs text-red-500">
                  {i18nT("static.12g5aob")}{" "}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:min-w-[320px]">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-xs text-slate-500">
                {i18nT("static.1bvxeo7")}
              </p>
              <p className="text-sm font-medium text-slate-900">
                {formatDateTimeWithSeconds(now)}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-xs text-slate-500">{i18nT("static.4x8584")}</p>
              <p className="text-sm font-medium text-slate-900">
                {formatDateTimeWithSeconds(lastSubmittedAt)}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        <div className="flex flex-col gap-4 lg:col-span-7 xl:col-span-8">
          <Card className="shadow-sm">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 md:text-lg">
                    {i18nT("static.1987d0")}{" "}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {i18nT("static.1tvw0rc")}{" "}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div
                    className={`rounded-xl border px-3 py-2 text-center text-sm font-medium ${getStatusColorClass(
                      cameraPermission,
                    )}`}
                  >
                    {i18nT("static.vgplj0")}{" "}
                    {tText(getStatusLabel(cameraPermission))}
                  </div>

                  <div
                    className={`rounded-xl border px-3 py-2 text-center text-sm font-medium ${getStatusColorClass(
                      locationPermission,
                    )}`}
                  >
                    {i18nT("static.u00eyc")}{" "}
                    {tText(getStatusLabel(locationPermission))}
                  </div>
                </div>
              </div>

              {(cameraError || locationError) && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {cameraError && <p>{tText(cameraError)}</p>}
                  {locationError && <p>{tText(locationError)}</p>}
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  icon="pi pi-shield"
                  label={i18nT("static.15derii")}
                  onClick={requestAllPermissions}
                  className="w-full sm:w-auto"
                  severity="secondary"
                  outlined
                />

                <Button
                  type="button"
                  icon="pi pi-map-marker"
                  label={i18nT("static.1xd1nx7")}
                  onClick={refreshLocation}
                  disabled={locationPermission === "loading"}
                  className="w-full sm:w-auto"
                  severity="secondary"
                  outlined
                />
              </div>
            </div>
          </Card>

          <Card className="shadow-sm">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 md:text-lg">
                    {i18nT("static.1uscvdq")}{" "}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {i18nT("static.1w9kzng")}{" "}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-xs text-slate-500">
                    {i18nT("static.7qt0jf")}
                  </p>
                  <p className="text-sm font-medium text-slate-900">
                    {capturedPhoto ? tText("Captured") : tText("Not Captured")}
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
                {!capturedPhoto ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-[260px] w-full object-cover sm:h-[320px] lg:h-[420px]"
                  />
                ) : (
                  <img
                    src={capturedPhoto}
                    alt={tText("Captured attendance")}
                    className="h-[260px] w-full object-cover sm:h-[320px] lg:h-[420px]"
                  />
                )}
              </div>

              <canvas ref={canvasRef} className="hidden" />

              {!capturedPhoto ? (
                <Button
                  type="button"
                  icon="pi pi-camera"
                  label={i18nT("static.1d7319p")}
                  onClick={capturePhoto}
                  disabled={cameraPermission !== "granted"}
                  className="w-full sm:w-auto"
                />
              ) : (
                <Button
                  type="button"
                  icon="pi pi-refresh"
                  label={i18nT("static.1j9uauv")}
                  onClick={retakePhoto}
                  severity="secondary"
                  outlined
                  className="w-full sm:w-auto"
                />
              )}
            </div>
          </Card>

          <Card className="shadow-sm">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 md:text-lg">
                    {i18nT("static.1vmu75e")}{" "}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {i18nT("static.q1080u")}{" "}
                  </p>
                </div>

                <Button
                  type="button"
                  icon="pi pi-external-link"
                  label={i18nT("static.1obuvcr")}
                  disabled={!googleMapsUrl}
                  onClick={() => {
                    if (googleMapsUrl) {
                      window.open(
                        googleMapsUrl,
                        "_blank",
                        "noopener,noreferrer",
                      );
                    }
                  }}
                  severity="secondary"
                  outlined
                  className="w-full sm:w-auto"
                />
              </div>

              {mapEmbedUrl ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <iframe
                    title={i18nT("static.dj380e")}
                    src={mapEmbedUrl}
                    className="h-[220px] w-full md:h-[280px]"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                  {i18nT("static.p1zoh3")}{" "}
                </div>
              )}

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
                  <div>
                    <p className="text-xs text-slate-500">
                      {i18nT("static.udp36t")}
                    </p>
                    <p className="text-sm font-medium text-slate-900">
                      {geoData.latitude !== null
                        ? geoData.latitude.toFixed(6)
                        : "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      {i18nT("static.sltujy")}
                    </p>
                    <p className="text-sm font-medium text-slate-900">
                      {geoData.longitude !== null
                        ? geoData.longitude.toFixed(6)
                        : "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      {i18nT("static.1doq40")}
                    </p>
                    <p className="text-sm font-medium text-slate-900">
                      {geoData.accuracy !== null
                        ? i18nT("static.1vrsdby", {
                            p0: geoData.accuracy.toFixed(0),
                          })
                        : "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      {i18nT("static.9m2x74")}
                    </p>
                    <p className="text-sm font-medium text-slate-900">
                      {formatDateTimeWithSeconds(geoData.capturedAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-5 xl:col-span-4">
          <Card className="shadow-sm lg:sticky lg:top-4">
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900 md:text-lg">
                  {i18nT("static.1w1ugxu")}{" "}
                </h2>
                <p className="text-sm text-slate-500">
                  {i18nT("static.1nmjki7")}{" "}
                </p>
              </div>

              <Divider className="my-0" />

              <div className="grid grid-cols-1 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-500">
                    {i18nT("static.1fak8xt")}
                  </p>
                  <p className="text-sm font-medium text-slate-900">
                    {currentProfileLoading
                      ? tText("Loading employee...")
                      : currentProfile.employee_name || "-"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-500">
                    {i18nT("static.ncb762")}
                  </p>
                  <p className="text-sm font-medium text-slate-900">
                    {currentProfileLoading
                      ? tText("Loading code...")
                      : currentProfile.employee_code || "-"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-500">
                    {i18nT("static.1bvxeo7")}
                  </p>
                  <p className="text-sm font-medium text-slate-900">
                    {formatDateTimeWithSeconds(now)}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-500">
                    {i18nT("static.n2dhtv")}
                  </p>
                  <p className="text-sm font-medium text-slate-900">
                    {capturedPhoto ? tText("Ready") : tText("Not captured yet")}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-500">
                    {i18nT("static.pghiva")}
                  </p>
                  <p className="text-sm font-medium text-slate-900">
                    {geoData.latitude !== null && geoData.longitude !== null
                      ? tText("Ready")
                      : tText("Not captured yet")}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                {i18nT("static.1lodehx")}{" "}
              </div>

              <Button
                type="button"
                icon={isSubmitting ? undefined : "pi pi-send"}
                label={
                  isSubmitting
                    ? tText("Submitting...")
                    : tText("Submit Attendance")
                }
                onClick={confirmSubmitAttendance}
                disabled={!canSubmit}
                className="w-full"
                size="large"
              />

              {isSubmitting && (
                <div className="flex justify-center pt-1">
                  <ProgressSpinner
                    style={{ width: "36px", height: "36px" }}
                    strokeWidth="4"
                  />
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MobileAttendancePage;

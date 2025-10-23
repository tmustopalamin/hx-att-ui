'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import CardTitle from '@/app/_components/CardTitle';
import Webcam from 'react-webcam';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import dayjs from "dayjs";
import { showToast } from '@/store/ToastSlice';
import { ResponseTypeCreateSuccess, ResponseType } from '@/app/types/response-type';
import { createAttendanceLog } from '@/app/services/attendance-log-service';
import { getErrorMessage, isResponseTypeError } from '@/app/utils/error-messages';
import { AttendanceLog } from '@/app/types/attendance-log';

const GpsPhotoTrackerComponent = () => {
  const webcamRef = useRef<Webcam>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>();
  const [cameraError, setCameraError] = useState(false);

  const dispatch = useDispatch();
  const profileState = useSelector((state: RootState) => state.profile);

  // update jam realtime
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ambil gps
  useEffect(() => {
    ambilGps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ambilGps = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          switch (err.code) {
            case err.PERMISSION_DENIED:
              dispatch(showToast({ visible: true, severity: "error", summary: "warn", detail: "GPS access denied. Please enable location access in your browser settings" }));
              break;
            case err.POSITION_UNAVAILABLE:
              dispatch(showToast({ visible: true, severity: "error", summary: "warn", detail: "Location is unavailable. Please make sure your device supports GPS" }));
              break;
            case err.TIMEOUT:
              dispatch(showToast({ visible: true, severity: "error", summary: "warn", detail: "Location request took too long. Please try again" }));
              break;
            default:
              console.error("GPS error:", err);
              dispatch(showToast({ visible: true, severity: "error", summary: "warn", detail: "An error occurred while trying to retrieve the location" }));
          }
        }
      );
    } else {
      dispatch(showToast({ visible: true, severity: "error", summary: "warn", detail: "Geolocation is not supported by your browser" }));
    }
  };

  const handleCapture = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    setPhoto(imageSrc || null);
  };

  const handleSubmit = async () => {
    const data: AttendanceLog = {
      id: 0,
      employee_id: profileState.employee_id,
      event_time: currentTime ? currentTime : null,
      event_time_local: currentTime ? dayjs(currentTime).format("DD-MM-YYYY HH:mm:ss") : null,
      source_type: "GPS+PHOTO",
      machine_pin: null,
      machine_id: null,
      device_id: null,
      photo_url: photo,
      latitude: coords?.lat ? coords?.lat : null,
      longitude: coords?.lng ? coords?.lng : null,
      face_id: null,
      external_system: null,
      external_ref_id: null,
      extra_data: null,
      employee_name: '',
      machine_name: '',
      processed: false,
    }

    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await createAttendanceLog(data);
      dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
      setPhoto(null);
      setCoords(null)
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
      }
    }
  };

  return (
    <Card title={<CardTitle title="GPS Photo Tracker" url="" />}>
      <div className="flex flex-col gap-6 p-3">

        {/* Employee Info */}
        <div className="flex flex-col gap-2">
          <span className="text-lg font-semibold">Employee: {profileState.name}</span>
          <Tag value={`Current Time: ${dayjs(currentTime).format('DD-MM-YYYY HH:mm:ss')}`} severity="info" />
        </div>

        {/* Camera + Actions */}
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Camera preview */}
          <div className="w-full md:w-1/2 aspect-video bg-black rounded-lg overflow-hidden">
            {!photo ? (
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                className="w-full h-full object-cover"
                onUserMediaError={() => setCameraError(true)} // 🔴 kalau gagal akses kamera
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="Captured" className="w-full h-full object-cover" />
            )}
          </div>

          {/* Action buttons + GPS */}
          <div className="flex flex-col gap-4 md:w-1/2">
            {cameraError ? (
              <span className="text-red-600 font-semibold text-center">Camera not found, please check your camera or allow permission for camera and then refresh the page</span>
            ) : (
              <Button
                label={photo ? "Retake Photo" : "Capture Photo"}
                icon="pi pi-camera"
                className="w-full bg-indigo-600 hover:bg-indigo-700 border-none"
                onClick={() => (photo ? setPhoto(null) : handleCapture())}
              />
            )}

            {/* GPS Section */}
            <div className="p-3 bg-gray-50 border rounded-lg">
              <h3 className="font-medium mb-2">GPS Coordinates</h3>
              {coords ? (
                <div className="flex flex-col gap-1">
                  <Tag value={`Lat: ${coords.lat.toFixed(6)}`} severity="success" />
                  <Tag value={`Lng: ${coords.lng.toFixed(6)}`} severity="success" />
                </div>
              ) : (
                <div className='flex flex-col justify-center gap-3'>
                  <Tag value="Checking GPS, make sure browser location is enabled" />
                  <Button
                    label="Get Location"
                    icon="pi pi-marker"
                    className="bg-green-600 hover:bg-green-700 border-none px-6"
                    onClick={() => {
                      ambilGps();
                    }}
                  />
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="text-center">
              <Button
                label="Submit"
                icon="pi pi-send"
                disabled={!photo || !coords || cameraError}
                className="bg-green-600 hover:bg-green-700 border-none px-6"
                onClick={handleSubmit}
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default GpsPhotoTrackerComponent;

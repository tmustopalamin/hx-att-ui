'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import Webcam from 'react-webcam';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import dayjs from "dayjs";
import { createAttendanceLog } from '@/app/services/attendance-log-service';
import { AttendanceLog } from '@/app/types/attendance-log';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';

const buttonCenterPT = {
  root: {
    className: "w-full py-3 text-lg flex justify-center items-center"
  },
  label: {
    className: "flex-none"
  }
};

const GpsPhotoTrackerComponent = () => {
  const webcamRef = useRef<Webcam>(null);

  const [photo, setPhoto] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>();
  const [submittedTime, setSubmittedTime] = useState<Date | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const profileState = useSelector((state: RootState) => state.profile);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    ambilGps();
  }, []);

  const ambilGps = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
      });
    }
  };

  const handleCapture = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    setPhoto(imageSrc || null);
  };

  const handleResetForm = () => {
    setSubmitSuccess(false);
    setPhoto(null);
    setCoords(null);
    setSubmittedTime(null);
    setCameraError(false);
    ambilGps();
  };

  const handleSubmit = async () => {
    const submitTime = new Date();
    setSubmittedTime(submitTime);

    const data: AttendanceLog = {
      id: 0,
      employee_id: profileState.employee_id,
      event_time: submitTime,
      event_time_local: dayjs(submitTime).format("DD-MM-YYYY HH:mm:ss"),
      source_type: "GPS+PHOTO",
      machine_pin: null,
      machine_id: null,
      device_id: null,
      photo_url: photo,
      latitude: coords?.lat ?? null,
      longitude: coords?.lng ?? null,
      face_id: null,
      external_system: null,
      external_ref_id: null,
      extra_data: null,
      employee_name: '',
      machine_name: '',
      processed: false,
      status: profileState.employee_id ? "MAPPED" : "UNMAPPED",
    };

    confirmDialog({
      message: 'Are you sure?',
      header: 'Confirm Your Attendance',
      icon: 'pi pi-info-circle',
      accept: async () => {
        await createAttendanceLog(data);
        setSubmitSuccess(true);
      }
    });
  };

  return (
    <>
      <ConfirmDialog />

      <Card className="shadow-lg rounded-2xl">
        <div className="p-4 flex flex-col gap-4">

          {/* HEADER */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b pb-3">
            <div>
              <div className="text-2xl font-semibold">Remote Attendance</div>
              <div className="text-sm text-gray-500">
                Record attendance using photo capture and GPS location
              </div>
            </div>
          </div>

          {/* CONTENT */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* SUCCESS SCREEN */}
            {submitSuccess && (
              <div className="lg:col-span-2 flex justify-center items-center py-20">
                <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center flex flex-col items-center gap-4">

                  <i className="pi pi-check-circle text-green-500" style={{ fontSize: '5rem' }}></i>

                  <h2 className="text-xl font-semibold">
                    Attendance Recorded
                  </h2>

                  <div className="text-gray-600">
                    <div>{profileState.name}</div>
                    <div>{dayjs(submittedTime).format('dddd, DD MMMM YYYY')}</div>
                    <div className="text-lg font-semibold">
                      {dayjs(submittedTime).format('HH:mm:ss')}
                    </div>
                  </div>

                  <Button
                    label="OK"
                    type="button"
                    className="w-full bg-green-600 hover:bg-green-700 border-none"
                    onClick={handleResetForm}
                  />
                </div>
              </div>
            )}

            {/* NORMAL FORM */}
            {!submitSuccess && (
              <>
                {/* Employee + Time */}
                <div className="lg:col-span-2 flex flex-col items-center text-center gap-2">
                  <span className="text-xl font-semibold">
                    {profileState.name}
                  </span>
                  <Tag
                    className="text-lg"
                    value={dayjs(currentTime).format('dddd, DD MMMM YYYY HH:mm:ss')}
                    severity="info"
                  />
                </div>

                {/* CAMERA */}
                <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-md">
                  {!photo ? (
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      screenshotFormat="image/jpeg"
                      className="w-full h-full object-cover"
                      onUserMediaError={() => setCameraError(true)}
                    />
                  ) : (
                    <img src={photo} alt="Captured" className="w-full h-full object-cover" />
                  )}
                </div>

                {/* RIGHT PANEL */}
                <div className="flex flex-col gap-4 p-4 border rounded-2xl bg-gray-50 shadow-sm">

                  <Button
                    label={photo ? "Retake Photo" : "Capture Photo"}
                    icon="pi pi-camera"
                    pt={buttonCenterPT}
                    className="bg-indigo-600 hover:bg-indigo-700 border-none"
                    onClick={() => (photo ? setPhoto(null) : handleCapture())}
                  />

                  {/* GPS */}
                  <div className="p-3 bg-white border rounded-xl">
                    <h3 className="font-medium mb-2 text-center">GPS Coordinates</h3>
                    {coords ? (
                      <div className="flex flex-col gap-1 items-center">
                        <Tag className="text-xl" value={`Latitude: ${coords.lat.toFixed(6)}`} severity="success" />
                        <Tag className="text-xl" value={`Longitude: ${coords.lng.toFixed(6)}`} severity="success" />
                      </div>
                    ) : (
                      <Button
                        label="Get Location"
                        icon="pi pi-marker"
                        pt={buttonCenterPT}
                        className="bg-green-600 hover:bg-green-700 border-none"
                        onClick={() => ambilGps()}
                      />
                    )}
                  </div>

                  <Button
                    label="Submit"
                    icon="pi pi-send"
                    pt={buttonCenterPT}
                    className="bg-green-600 hover:bg-green-700 border-none"
                    onClick={handleSubmit}
                  />

                </div>
              </>
            )}

          </div>
        </div>
      </Card>
    </>
  );
};

export default GpsPhotoTrackerComponent;
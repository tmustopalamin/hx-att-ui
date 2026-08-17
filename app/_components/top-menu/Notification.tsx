import { Badge } from "primereact/badge";
import { Button } from "primereact/button";
import React, { useEffect, useRef, useState } from "react";

const Notification = () => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const notifications = [
    { id: 1, text: "User A commented on your post" },
    { id: 2, text: "Your report is ready to download" },
    { id: 3, text: "New employee added" },
  ];

  // close kalau klik di luar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell + Badge */}
      <div className="relative">
        <Button
          icon="pi pi-bell"
          rounded
          text
          aria-label="Notifications"
          tooltip="Notifications"
          onClick={() => setOpen((prev) => !prev)}
          className="hover:bg-gray-100"
        />
        <Badge
          value={notifications.length}
          severity="danger"
          className="absolute -top-1 -right-1"
        />
      </div>

      {/* Dropdown List */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white shadow-lg rounded-lg border border-gray-200 z-50">
          <div className="p-3 font-bold border-b">Notifications</div>
          <ul className="max-h-64 overflow-y-auto divide-y divide-gray-100">
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <li
                  key={n.id}
                  className="px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer flex items-start gap-2"
                >
                  <i className="pi pi-info-circle text-blue-500 mt-0.5"></i>
                  <span>{n.text}</span>
                </li>
              ))
            ) : (
              <li className="px-4 py-3 text-sm text-gray-500 text-center">
                No new notifications
              </li>
            )}
          </ul>
          <div className="p-2 text-sm text-center text-blue-600 hover:bg-gray-50 cursor-pointer rounded-b-lg">
            View all
          </div>
        </div>
      )}
    </div>
  );
};

export default Notification;

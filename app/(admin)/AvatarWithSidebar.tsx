"use client"

import { RootState } from "@/store/store";
import { showToast } from "@/store/ToastSlice";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "primereact/avatar";
import { Sidebar } from "primereact/sidebar";
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";

const AvatarWithSidebar = () => {
    const [isSidebarVisible, setIsSidebarVisible] = useState(false);
    const profileData = useSelector((state: RootState) => state.profile);
    const router = useRouter();
    const dispatch = useDispatch();

    const getBody = () => document.body;

    const onClickLogout = async () => {
        const res = await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "include",
        });
        if (!res.ok) {
            throw new Error("Failed to logout");
        }
        await res.json();

        dispatch(showToast({
            visible: true,
            severity: "success",
            summary: "Logout Success",
            detail: "Redirecting to login page...",
        }));

        setTimeout(() => {
            router.push("/login");
        }, 1000);
    }

    return (
        <>
            {/* <Avatar
                size="large"
                label="R"
                style={{ backgroundColor: "#9c27b0", color: "#ffffff" }}
                shape="circle"
                onClick={() => setIsSidebarVisible(true)}
            /> */}

            <Avatar
                size="large"
                style={{ backgroundColor: "#9c27b0", color: "#ffffff" }}
                label={`${profileData?.name ? profileData.name[0] : 'U'}`}
                image={profileData?.photo_url ? `http://localhost:3050/api/public/images/uploads/${profileData?.photo_url}` : undefined}
                shape="circle"
                onClick={() => setIsSidebarVisible(true)}
            />

            <Sidebar
                appendTo={getBody}
                visible={isSidebarVisible}
                position="right"
                onHide={() => setIsSidebarVisible(false)}
            >
                <div className="flex flex-col gap-5">
                    <div className="flex-column gap-5">
                        <h3 className="font-bold font-sans">Welcome</h3>
                        <h4 className="text-md">{profileData.name}</h4>
                    </div>

                    <ul className="list-none m-0 p-0">
                        <li>
                            <Link className="cursor-pointer flex mb-3 p-3 items-center border border-gray-200 rounded hover:bg-gray-100 transition-colors duration-150" onClick={() => setIsSidebarVisible(false)} href="/account-settings">
                                <span>
                                    <i className="pi pi-user text-xl text-blue-500"></i>
                                </span>
                                <div className="ml-3">
                                    <span className="mb-2 font-semibold">Account Settings</span>
                                    <p className="text-gray-500 m-0">Change Account details</p>
                                </div>
                            </Link>
                        </li>
                        {/* <li>
                    <Link className="cursor-pointer flex mb-3 p-3 items-center border border-gray-200 rounded hover:bg-gray-100 transition-colors duration-150" onClick={() => setIsSidebarVisible(false)} href="/company-settings">
                        <span>
                            <i className="pi pi-user text-xl text-blue-500"></i>
                        </span>
                        <div className="ml-3">
                            <span className="mb-2 font-semibold">Company Settings</span>
                            <p className="text-gray-500 m-0">Change company details</p>
                        </div>
                    </Link>
                </li>              */}
                        <li>
                            <Link className="cursor-pointer flex mb-3 p-3 items-center border border-gray-200 rounded hover:bg-gray-100 transition-colors duration-150" onClick={onClickLogout} href="#">
                                <span>
                                    <i className="pi pi-power-off text-xl text-blue-500"></i>
                                </span>
                                <div className="ml-3">
                                    <span className="mb-2 font-semibold">Sign Out</span>
                                    <p className="text-gray-500 m-0">Stop current session</p>
                                </div>
                            </Link>
                        </li>
                    </ul>
                </div>
            </Sidebar>
        </>
    );
};

export default AvatarWithSidebar;

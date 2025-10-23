"use client";

import { Sidebar } from "primereact/sidebar";
import React, { useState } from "react";

const SidebarProfileMenu = () => {
  const [sidebarVisible, setSidebarVisible] = useState<boolean>(false);

  return (
    <Sidebar
      visible={sidebarVisible}
      position="right"
      onHide={() => setSidebarVisible(false)}
    >
      <h2>Right Sidebar</h2>
      <p>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
        tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
        veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
        commodo consequat.
      </p>
    </Sidebar>
  );
};

export default SidebarProfileMenu;

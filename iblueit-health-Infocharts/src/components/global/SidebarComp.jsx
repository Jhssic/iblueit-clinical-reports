import { useState } from "react";
import { VscLayoutSidebarRight } from "react-icons/vsc";
import { IoSettingsOutline } from "react-icons/io5";
import { FaRegFolder, FaRegMoon } from "react-icons/fa";
import { BiLogOut, BiBell } from "react-icons/bi";
import { Link } from "react-router-dom";
import "../../css/compStyle/compGlobalStyle/SidebarComp.css";
import { useTheme } from "../../assets/JavaScript/ThemeContext.jsx"; 
import { FiSun } from "react-icons/fi";


/**
 * Sidebar component for navigation and settings.
 *
 * @component
 * @example
 * return <Sidebar />;
 */

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(true);
  const { isDarkTheme, toggleTheme } = useTheme();

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className={`sidebar ${isOpen ? "" : "closed"} ${isDarkTheme ? 'dark' : 'light'}`}>
      <button type="button" className="toggle-icon" onClick={toggleSidebar} aria-label="Toggle sidebar">
        <VscLayoutSidebarRight />
      </button>
      <div className="sidebarmain">
        <ul>
          <Link to={"/inbox"} className="Aheaders">
            <div className={`bell ${isDarkTheme ? 'dark' : 'light'}`}>
              <li>Notifications</li>
              <BiBell />
            </div>
          </Link>
          <Link to={"/projects"} className="Aheaders">
            <div className={`folder ${isDarkTheme ? 'dark' : 'light'}`}>
              <li>Projects</li>
              <FaRegFolder />
            </div>
          </Link>
          <Link to={"/config"} className="Aheaders">
            <div className={`config ${isDarkTheme ? 'dark' : 'light'}`}>
              <li>Settings</li> <IoSettingsOutline />
            </div>
          </Link>
        </ul>
      </div>
      <div className="sidebarfooter">
        <hr />
        <ul>
          <Link to={"/"} className="Aheaders">
            <div className={`logout ${isDarkTheme ? 'dark' : 'light'}`}>
              <li>Logout</li>
              <BiLogOut />
            </div>
          </Link>
          <li>
            <button type="button" className="theme" onClick={toggleTheme}>
              Theme
              {isDarkTheme ? <FiSun /> : <FaRegMoon />}
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;

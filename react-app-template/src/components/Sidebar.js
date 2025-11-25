import React, { useState, useEffect } from "react";
import DateNav from "./DateNav";

function Sidebar({
  appointments,
  selectedDate,
  setSelectedDate,
  isSameDay,
  getStatus,
  currentView,
  loggedInUser
}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const typeColors = {
    Meeting: "#1976d2",
    Personal: "#0a560eff",
    Deadline: "#8d2a2aff",
    "Follow-up": "#858e08ff",
  };

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => {
    if (windowWidth <= 784) {
      setIsMobileOpen(!isMobileOpen);
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };

  // Fix: Since backend sends local time, don't apply timezone conversion
  const getStatusForUserTimezone = (startTime) => {
    // Use the original getStatus function since backend already sends local time
    return getStatus(startTime);
  };

  // Filter appointments for the selected date
  const upcomingAppointments = appointments.filter(
    (a) => isSameDay(a.startTime, selectedDate) && getStatusForUserTimezone(a.startTime) === "upcoming"
  );

  return (
    <>
      {windowWidth <= 784 && (
        <button className="hamburger" onClick={toggleSidebar}>
          ☰
        </button>
      )}
      <aside
        className={`sidebar ${
          windowWidth > 784 ? (isCollapsed ? "closed" : "") : isMobileOpen ? "open" : ""
        }`}
      >
        {windowWidth > 784 && (
          <button className="collapse-btn" onClick={toggleSidebar}>
            {isCollapsed ? "»" : "«"}
          </button>
        )}
        {(windowWidth <= 784 ? isMobileOpen : !isCollapsed) && (
          <div className="sidebar-content">
            <div className="sidebar-fixed-section">
              <div className="sidebar-header">
                <h2>📅 Appointments</h2>
                <p>Manage your schedule</p>
                {loggedInUser && (
                  <div className="user-greeting">
                    <p>Welcome, {loggedInUser.firstName}!</p>
                    <p className="timezone-text">{loggedInUser.timeZoneId}</p>
                  </div>
                )}
              </div>

              <div className="sidebar-date">
                <DateNav selectedDate={selectedDate} setSelectedDate={setSelectedDate} currentView={currentView} />
              </div>

              <div className="color-legend">
                <div className="legend-grid" role="list" aria-label="Appointment color codes">
                  {Object.entries(typeColors).map(([type, color]) => (
                    <div key={type} className="legend-item" role="listitem">
                      <span
                        className="legend-dot"
                        style={{ backgroundColor: color }}
                      />
                      <span className="legend-label">{type}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="sidebar-scrollable-section">
              <div className="appointment-list">
                <h3>Recent & Upcoming</h3>
                
                {upcomingAppointments.map((a) => {
                  const typeColor = typeColors[a.type] || "#1976d2";
                  
                  // Fix: Since backend sends local time, just display it directly
                  // Don't apply timezone conversion
                  const startTime = new Date(a.startTime);
                  const displayTime = startTime.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true
                  });
                  
                  // DEBUG: Log each appointment's time conversion
                  console.log(`Appointment "${a.title}":`, {
                    originalStartTime: a.startTime,
                    displayTime: displayTime,
                    rawTime: startTime.toString()
                  });
                  
                  return (
                    <div key={a.id} className="appointment-item upcoming">
                      <div className="appt-time">
                        {displayTime}
                      </div>
                      <div className="appt-title">{a.title}</div>
                      <span
                        className="appt-label"
                        style={{
                          backgroundColor: typeColor,
                          color: "#fff",
                        }}
                      >
                        Upcoming
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </aside>
      {windowWidth <= 784 && (
        <div
          className={`sidebar-overlay ${isMobileOpen ? "active" : ""}`}
          onClick={toggleSidebar}
        />
      )}
    </>
  );
}

export default Sidebar;

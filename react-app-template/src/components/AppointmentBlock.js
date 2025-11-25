import React from "react";

function AppointmentBlock({ appointment, onClick, slotHeight = 80, getStatus, highlight = false, className="" }) {
  const start = new Date(appointment.startTime);
  const end = new Date(appointment.endTime);
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = end.getHours() * 60 + end.getMinutes();
  const top = Math.floor((startMinutes / 30) * slotHeight);
  const height = Math.max(24, Math.floor(((endMinutes - startMinutes) / 30) * slotHeight));

  const localGetStatus = (startTime, endTime) => {
    const now = new Date();
    const s = new Date(startTime);
    const e = new Date(endTime);
    if (now < s) return "upcoming";
    if (now >= s && now <= e) return "ongoing";
    return "completed";
  };

  const status = (getStatus || localGetStatus)(appointment.startTime, appointment.endTime);

  const handleDragStart = (e) => {
    e.dataTransfer.setData("text/plain", appointment.id.toString());
    e.dataTransfer.effectAllowed = "move";
    
    // Add visual feedback
    setTimeout(() => {
      e.target.style.opacity = "0.5";
    }, 0);
  };

  const handleDragEnd = (e) => {
    // Reset visual feedback
    e.target.style.opacity = "1";
  };

  const handleClick = (e) => {
    // Prevent click when dragging
    if (e.defaultPrevented) return;
    if (onClick) onClick();
  };

  return (
    <div
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`appointment-block ${status} ${highlight ? "highlight" : ""} ${className}`}
      data-appointment-id={appointment.id}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        backgroundColor: appointment.ColorCode || appointment.colorCode || "#1976d2",
        cursor: "move", // Show move cursor
        userSelect: "none", // Prevent text selection during drag
      }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onClick(); }}
    >
      <strong>{appointment.title}</strong>
      <br />
      {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })} -{" "}
      {end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}
    </div>
  );
}

export default AppointmentBlock;

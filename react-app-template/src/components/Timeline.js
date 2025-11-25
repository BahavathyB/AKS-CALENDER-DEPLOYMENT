import React, { useEffect, useRef, useMemo, useState } from "react";
import AppointmentBlock from "./AppointmentBlock";

function Timeline({
  appointments,
  selectedDate,
  isSameDay,
  isToday,
  onAppointmentClick,
  onEmptySlotClick,
  slotHeight = 80,
  getStatus,
  nowPx,
  loggedInUser,
  fetchAppointments,
  highlightedAppointments = []
}) {
  const timelineRef = useRef(null);
  const [localAppointments, setLocalAppointments] = useState(appointments);

  useEffect(() => {
    setLocalAppointments(appointments);
  }, [appointments]);

  // Filter today's appointments
  const todayAppointments = useMemo(
    () => localAppointments.filter((a) => isSameDay(a.startTime, selectedDate)),
    [localAppointments, selectedDate, isSameDay]
  );

  // Scroll to first highlighted appointment
  useEffect(() => {
    if (!timelineRef.current || highlightedAppointments.length === 0) return;
    const firstHighlight = localAppointments.find(a =>
      highlightedAppointments.includes(a.id)
    );
    if (!firstHighlight) return;
    const start = new Date(firstHighlight.startTime);
    const top = Math.floor((start.getHours() * 60 + start.getMinutes()) / 30 * slotHeight);
    timelineRef.current.scrollTo({
      top: top - timelineRef.current.clientHeight / 2 + slotHeight / 2,
      behavior: "smooth"
    });
  }, [highlightedAppointments, localAppointments, slotHeight]);

  // Background update function with proper datetime handling
  const updateAppointmentInBackground = async (appointmentId, newStartTime, newEndTime, originalAppt) => {
    const token = localStorage.getItem("jwtToken");
    if (!token) {
      console.error("No auth token found");
      return;
    }

    // Format as local datetime string (without timezone info)
    const formatAsLocalDateTime = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    };

    const startTimeString = formatAsLocalDateTime(newStartTime);
    const endTimeString = formatAsLocalDateTime(newEndTime);

    const payload = {
      Id: originalAppt.id,
      Title: originalAppt.title || originalAppt.Title || "",
      StartTime: startTimeString,
      EndTime: endTimeString,
      Description: originalAppt.description || originalAppt.Description || "",
      Location: originalAppt.location || originalAppt.Location || "",
      Type: originalAppt.type || originalAppt.Type || "",
      ColorCode: originalAppt.colorCode || originalAppt.ColorCode || "#1976d2",
      Recurrence: originalAppt.recurrence || originalAppt.Recurrence || 0,
      RecurrenceInterval: originalAppt.recurrenceInterval || originalAppt.RecurrenceInterval || null,
      RecurrenceEndDate: originalAppt.recurrenceEndDate || originalAppt.RecurrenceEndDate || null,
      UserId: originalAppt.userId || originalAppt.UserId || null
    };

    try {
      const response = await fetch(`/api/appointments/user/${appointmentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log('✅ Appointment updated successfully');
        setTimeout(() => {
          if (fetchAppointments) {
            fetchAppointments();
          }
        }, 1000);
      } else {
        console.error('❌ Failed to update appointment');
        if (fetchAppointments) {
          fetchAppointments();
        }
      }
    } catch (error) {
      console.error("❌ Background update failed:", error);
      if (fetchAppointments) {
        fetchAppointments();
      }
    }
  };

  // Render time slots
  const renderSlots = () =>
    Array.from({ length: 48 }, (_, i) => {
      const hour24 = Math.floor(i / 2);
      const minute = i % 2 === 0 ? 0 : 30;
      const slotTime = new Date(selectedDate);
      slotTime.setHours(hour24, minute, 0, 0);
      const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
      const ampm = hour24 < 12 ? "AM" : "PM";
      const minuteStr = minute === 0 ? "00" : "30";

      return (
        <div
          key={i}
          className="time-slot"
          style={{ height: `${slotHeight}px` }}
          onClick={() => onEmptySlotClick && onEmptySlotClick(slotTime)}
        >
          <div className="time-label">{`${hour12}:${minuteStr} ${ampm}`}</div>
        </div>
      );
    });

  // Render appointment blocks
  const renderAppointments = () =>
    todayAppointments.map((appointment) => {
      const isHighlighted = highlightedAppointments.includes(appointment.id);
      return (
        <AppointmentBlock
          key={appointment.id}
          appointment={appointment}
          slotHeight={slotHeight}
          getStatus={getStatus}
          onClick={() => onAppointmentClick(appointment)}
          className={isHighlighted ? "highlight" : ""}
          highlight={isHighlighted}
        />
      );
    });

  // Enhanced drag handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    
    const apptId = e.dataTransfer.getData("text/plain");
    if (!apptId) return;

    const containerRect = timelineRef.current.getBoundingClientRect();
    const offsetY = e.clientY - containerRect.top + timelineRef.current.scrollTop;
    const totalMinutes = Math.round(((offsetY / slotHeight) * 30) / 30) * 30;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    const appt = todayAppointments.find((a) => a.id.toString() === apptId);
    if (!appt) return;

    const duration = (new Date(appt.endTime) - new Date(appt.startTime)) / (1000 * 60);

    // Create new start time in the selected date
    const newStartTime = new Date(selectedDate);
    newStartTime.setHours(hours, minutes, 0, 0);
    
    // Create new end time by adding duration
    const newEndTime = new Date(newStartTime.getTime() + duration * 60000);

    // UPDATE UI IMMEDIATELY for smooth user experience
    const updatedAppointment = {
      ...appt,
      startTime: newStartTime,
      endTime: newEndTime
    };

    setLocalAppointments((prev) => {
      const updated = prev.map((a) =>
        a.id.toString() === apptId ? updatedAppointment : a
      );
      return updated;
    });

    // BACKGROUND UPDATE - happens asynchronously
    updateAppointmentInBackground(appt.id, newStartTime, newEndTime, appt);
  };

  return (
    <div className="timeline">
      <div
        className="timeline-grid"
        ref={timelineRef}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDrop={handleDrop}
      >
        <div className="slots-container">{renderSlots()}</div>
        <div className="appointments-container">
          {renderAppointments()}
          {isToday() && <div className="now-line" style={{ top: `${nowPx}px` }} />}
        </div>
      </div>
    </div>
  );
}

export default Timeline;

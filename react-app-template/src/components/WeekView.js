import React, { useMemo } from "react";
import AppointmentBlock from "./AppointmentBlock";

function WeekView({ appointments, selectedDate, onAppointmentClick, getStatus }) {
  // Convert selectedDate string to Date
  const currentDate = new Date(selectedDate);

  // Calculate start of week (Sunday)
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

  // Create array of 7 days for the week
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  // Group appointments by day
  const appointmentsByDay = useMemo(() => {
    return days.map((day) =>
      appointments.filter((a) => {
        const apptDate = new Date(a.startTime);
        return (
          apptDate.getDate() === day.getDate() &&
          apptDate.getMonth() === day.getMonth() &&
          apptDate.getFullYear() === day.getFullYear()
        );
      })
    );
  }, [appointments, days]);

  return (
    <div className="week-view">
      <div className="week-grid">
        {days.map((day, idx) => (
          <div key={idx} className="week-day">
            <div className="day-header">
              {day.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </div>
            <div className="day-appointments">
              {appointmentsByDay[idx].length === 0 ? (
                <p className="empty-text">No appointments</p>
              ) : (
                appointmentsByDay[idx].map((appt) => (
                  <AppointmentBlock
                    key={appt.id}
                    appointment={appt}
                    onClick={() => onAppointmentClick(appt)}
                    getStatus={getStatus} // ✅ pass getStatus properly
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default WeekView;

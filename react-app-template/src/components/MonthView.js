import React, { useMemo } from "react";

function MonthView({ appointments, selectedDate, onAppointmentClick, getStatus }) {
const currentDate = new Date(selectedDate);
const year = currentDate.getFullYear();
const month = currentDate.getMonth();

  // First day of the month
  const firstDay = new Date(year, month, 1);
  const startDay = firstDay.getDay(); // 0=Sun

  // Number of days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Build calendar cells
  const daysArray = useMemo(() => {
    const cells = [];
    // Leading blanks
    for (let i = 0; i < startDay; i++) {
      cells.push(null);
    }
    // Actual days
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(year, month, d));
    }
    return cells;
  }, [year, month, startDay, daysInMonth]);

  return (
    <div className="month-view">
      <div className="month-grid">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="month-header">
            {d}
          </div>
        ))}

        {daysArray.map((day, idx) => (
          <div key={idx} className="month-cell">
            {day ? (
              <>
                <div className="cell-date">{day.getDate()}</div>
                <div className="cell-appointments">
                  {appointments
                    .filter((a) => {
                      const apptDate = new Date(a.startTime);
                      return (
                        apptDate.getDate() === day.getDate() &&
                        apptDate.getMonth() === day.getMonth() &&
                        apptDate.getFullYear() === day.getFullYear()
                      );
                    })
                    .slice(0, 2) // show max 2 inline
                    .map((appt) => (
                      <div
                        key={appt.id}
                        className={`cell-appt ${getStatus(appt)}`}
                        onClick={() => onAppointmentClick(appt)}
                      >
                        {appt.title}
                      </div>
                    ))}
                </div>
              </>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export default MonthView;

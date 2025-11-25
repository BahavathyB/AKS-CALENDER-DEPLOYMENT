import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

function DateNav({ selectedDate, setSelectedDate, currentView }) {
  const date = new Date(selectedDate);

  const addDays = (d, days) => {
    const nd = new Date(d);
    nd.setDate(nd.getDate() + days);
    return nd;
  };

  const addMonths = (d, months) => {
    const nd = new Date(d);
    nd.setMonth(nd.getMonth() + months);
    return nd;
  };

  // Format week label
  const formatWeek = (d) => {
    const startOfWeek = addDays(d, -d.getDay()); // Sunday
    const endOfWeek = addDays(startOfWeek, 6);   // Saturday
    const options = { month: "short", day: "numeric" };
    return `${startOfWeek.toLocaleDateString("en-US", options)} – ${endOfWeek.toLocaleDateString("en-US", options)}, ${d.getFullYear()}`;
  };

  // Format month label
  const formatMonth = (d) => {
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  const handlePrev = () => {
    if (currentView === "week") {
      setSelectedDate(addDays(date, -7).toISOString().split("T")[0]);
    } else if (currentView === "month") {
      setSelectedDate(addMonths(date, -1).toISOString().split("T")[0]);
    } else {
      setSelectedDate(addDays(date, -1).toISOString().split("T")[0]);
    }
  };

  const handleNext = () => {
    if (currentView === "week") {
      setSelectedDate(addDays(date, 7).toISOString().split("T")[0]);
    } else if (currentView === "month") {
      setSelectedDate(addMonths(date, 1).toISOString().split("T")[0]);
    } else {
      setSelectedDate(addDays(date, 1).toISOString().split("T")[0]);
    }
  };

  return (
    <div className="date-nav">
      <button onClick={handlePrev}>
        <ChevronLeft size={20} />
      </button>
      {currentView === "day" ? (
        // Use a date input for picking exact day
        <input
          type="date"
          className="date-picker"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      ) : (
        <span className="date-label">
          {currentView === "week"
            ? formatWeek(date)
            : currentView === "month"
            ? formatMonth(date)
            : date.toLocaleDateString()}
        </span>
      )}

     <button onClick={handleNext}>
       <ChevronRight size={20} />
    </button>
    </div>
  );
}

export default DateNav;

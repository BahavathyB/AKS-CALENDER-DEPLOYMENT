import React, { useState, useEffect } from "react";

// Helper functions remain the same...
const isoTo12HourTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  let hours = d.getHours();
  const minutes = d.getMinutes();
  hours = hours % 12 || 12;
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  return `${hh}:${mm}`;
};

const derivePeriod = (iso) => {
  if (!iso) return "AM";
  return new Date(iso).getHours() >= 12 ? "PM" : "AM";
};

function Modal({
  showModal,
  setShowModal,
  editingAppointment,
  newSlotTime,
  handleAddOrEdit,
  handleDelete,
}) {
  const isEdit = !!editingAppointment;
  
  // Initialize recurrence type properly
  const [recurrenceType, setRecurrenceType] = useState("None");

  // Reset recurrence type when modal opens/closes or editing changes
  useEffect(() => {
    if (showModal) {
      if (isEdit && editingAppointment?.recurrence !== undefined) {
        // Map numeric recurrence back to string
        const recurrenceMap = { 0: "None", 1: "Daily", 2: "Weekly", 3: "Monthly" };
        setRecurrenceType(recurrenceMap[editingAppointment.recurrence] || "None");
      } else {
        setRecurrenceType("None");
      }
    }
  }, [showModal, isEdit, editingAppointment]);

  if (!showModal) return null;

  const startIso = isEdit
    ? editingAppointment.startTime
    : newSlotTime?.toISOString();
  const endIso = isEdit
    ? editingAppointment.endTime
    : newSlotTime
    ? new Date(newSlotTime.getTime() + 30 * 60000).toISOString()
    : null;

  // Format recurrence end date for input
  const formatRecurrenceEndDate = () => {
    if (!isEdit || !editingAppointment?.recurrenceEndDate) return "";
    const date = new Date(editingAppointment.recurrenceEndDate);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  };

  return (
    <div className="modal">
      <div className="modal-content" role="dialog" aria-modal="true">
        <h3>{isEdit ? "Edit Appointment" : "New Appointment"}</h3>
        <form onSubmit={handleAddOrEdit}>
          {/* Title */}
          <input
            type="text"
            name="title"
            placeholder="Title"
            defaultValue={isEdit ? editingAppointment.title : ""}
            required
          />

          {/* Start and End time */}
          {["start", "end"].map((timeType) => {
            const isoField = timeType === "start" ? startIso : endIso;
            const timeValue = isoTo12HourTime(isoField);
            const periodValue = derivePeriod(isoField);
            return (
              <div className="time-row" key={timeType}>
                <label className="time-label">{timeType === "start" ? "Start Time" : "End Time"}</label>
                <input
                  type="time"
                  name={timeType}
                  step="1800"
                  defaultValue={timeValue}
                  required
                />
                <select name={`${timeType}Period`} defaultValue={periodValue}>
                  <option>AM</option>
                  <option>PM</option>
                </select>
              </div>
            );
          })}

          {/* Description */}
          <input
            name="description"
            placeholder="Description"
            defaultValue={isEdit ? editingAppointment.description || "" : ""}
          />

          {/* Location */}
          <input
            type="text"
            name="location"
            placeholder="Location"
            defaultValue={isEdit ? editingAppointment.location || "" : ""}
          />

          {/* Attendees */}
          <input
            type="text"
            name="attendees"
            placeholder="Attendees (comma-separated)"
            defaultValue={isEdit ? editingAppointment.attendees || "" : ""}
          />

          {/* Type / Category */}
          <select
            name="type"
            defaultValue={isEdit ? editingAppointment.type || "Meeting" : "Meeting"}
          >
            <option value="Meeting">Meeting</option>
            <option value="Personal">Personal</option>
            <option value="Deadline">Deadline</option>
            <option value="Follow-up">Follow-up</option>
          </select>

          {/* Recurrence */}
          <label>Recurrence</label>
          <select
            name="recurrence"
            value={recurrenceType}
            onChange={(e) => setRecurrenceType(e.target.value)}
          >
            <option value="None">None</option>
            <option value="Daily">Daily</option>
            <option value="Weekly">Weekly</option>
            <option value="Monthly">Monthly</option>
          </select>

          {/* Recurrence Options */}
          {recurrenceType !== "None" && (
            <div className="recurrence-options">
              <label>Repeat Every</label>
              <input
                type="number"
                name="recurrenceInterval"
                min={1}
                max={30}
                defaultValue={
                  isEdit ? editingAppointment.recurrenceInterval || 1 : 1
                }
                placeholder="Interval"
              />
              <span>
                {recurrenceType === "Daily" && "day(s)"}
                {recurrenceType === "Weekly" && "week(s)"}
                {recurrenceType === "Monthly" && "month(s)"}
              </span>
              <div>
              <label>End Date</label>
              </div>
              <input
                type="date"
                name="recurrenceEndDate"
                defaultValue={formatRecurrenceEndDate()}
                min={new Date().toISOString().split('T')[0]} // Can't be in the past
              />
            </div>
          )}

          {/* Actions */}
          <div className="modal-actions">
            {isEdit && (
              <button
                type="button"
                className="delete-btn"
                onClick={handleDelete}
              >
                Delete
              </button>
            )}
            <button type="button" onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button type="submit">{isEdit ? "Update" : "Save"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Modal;

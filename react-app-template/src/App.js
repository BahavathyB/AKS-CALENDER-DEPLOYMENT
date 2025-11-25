import React, { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import "./App.scss";
import Sidebar from "./components/Sidebar";
import Timeline from "./components/Timeline";
import WeekView from "./components/WeekView";
import MonthView from "./components/MonthView";
import Modal from "./components/Modal";
import ErrorModal from "./components/ErrorModal";
import Login from "./components/Login";
import SearchBar from "./components/SearchBar";
import WebVitalsDisplay from './components/WebVitalsDisplay';

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [nowPx, setNowPx] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [newSlotTime, setNewSlotTime] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [highlightedAppointments, setHighlightedAppointments] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date()); // Added for digital clock
  const SLOT_HEIGHT = 80;
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
  const [currentView, setCurrentView] = useState("day");

  const typeColors = {
    Meeting: "#1976d2",
    Personal: "#0a560eff",
    Deadline: "#a80e0eff",
    "Follow-up": "#858e08ff",
  };

  // --- DIGITAL CLOCK UPDATE ---
  useEffect(() => {
    const updateClock = () => {
      if (loggedInUser?.timeZoneId) {
        // Get current time in user's timezone
        const now = new Date();
        const userTime = new Date(now.toLocaleString("en-US", { timeZone: loggedInUser.timeZoneId }));
        setCurrentTime(userTime);
      } else {
        setCurrentTime(new Date());
      }
    };

    // Update immediately
    updateClock();
    
    // Update every second
    const clockInterval = setInterval(updateClock, 1000);
    
    return () => clearInterval(clockInterval);
  }, [loggedInUser]);

  // Format time for digital clock display
  const formatDigitalTime = (date) => {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    });
  };

  // Get timezone abbreviation
  const getTimezoneAbbr = () => {
    if (!loggedInUser?.timeZoneId) return '';
    
    try {
      const formatter = new Intl.DateTimeFormat('en', {
        timeZone: loggedInUser.timeZoneId,
        timeZoneName: 'short'
      });
      
      const parts = formatter.formatToParts(new Date());
      const timeZonePart = parts.find(part => part.type === 'timeZoneName');
      return timeZonePart ? timeZonePart.value : '';
    } catch (error) {
      console.error('Error getting timezone abbreviation:', error);
      return '';
    }
  };

  // --- AUTO-LOGIN ON APP START ---
  useEffect(() => {
    const checkExistingAuth = async () => {
      const token = localStorage.getItem("jwtToken");
      const savedUser = localStorage.getItem("userData");
      
      if (!token) {
        setIsLoading(false);
        return;
      }
      
      try {
        if (savedUser) {
          const userData = JSON.parse(savedUser);
          console.log('Using saved user data:', userData);
          setLoggedIn(true);
          setLoggedInUser(userData);
          setIsLoading(false);
          return;
        }
        
        const payload = JSON.parse(atob(token.split('.')[1]));
        
        const currentTime = Date.now() / 1000;
        if (payload.exp < currentTime) {
          console.log('Token expired, removing');
          localStorage.removeItem("jwtToken");
          localStorage.removeItem("userData");
          setIsLoading(false);
          return;
        }
        
        console.log('Valid token found, logging in user');
        const userData = {
          id: payload.sub || payload.userId || payload.id,
          username: payload.username,
          firstName: payload.firstName,
          lastName: payload.lastName,
          timeZoneId: payload.timeZoneId
        };
        
        setLoggedIn(true);
        setLoggedInUser(userData);
        localStorage.setItem("userData", JSON.stringify(userData));
        
      } catch (error) {
        console.error('Error parsing token:', error);
        localStorage.removeItem("jwtToken");
        localStorage.removeItem("userData");
      } finally {
        setIsLoading(false);
      }
    };
    
    checkExistingAuth();
  }, []);

  // --- LOGOUT FUNCTION ---
  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      console.log('User confirmed logout');
      localStorage.removeItem("jwtToken");
      localStorage.removeItem("userData");
      setLoggedIn(false);
      setLoggedInUser(null);
      setAppointments([]);
    }
  };

  // --- SHORTCUTS ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setEditingAppointment(null);
        setNewSlotTime(new Date());
        setShowModal(true);
      }
      if (e.altKey && e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case "d": e.preventDefault(); setCurrentView("day"); break;
          case "w": e.preventDefault(); setCurrentView("week"); break;
          case "m": e.preventDefault(); setCurrentView("month"); break;
          default: break;
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // --- THEME ---
  useEffect(() => {
    document.body.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");

  // --- HELPERS ---
  const to24Hour = (time, period) => {
    let [h, m] = time.split(":").map(Number);
    if (period === "PM" && h < 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const isSameDay = (dateStr, selectedDateStr = selectedDate) => {
  // Handle both ISO strings and Date objects
  const appointmentDate = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const selectedDateObj = new Date(selectedDateStr);
  return appointmentDate.toDateString() === selectedDateObj.toDateString();
};


  const isToday = () => {
    if (!loggedInUser?.timeZoneId) return false;
    const now = new Date();
    const userToday = new Date(now.toLocaleString("en-US", { timeZone: loggedInUser.timeZoneId }));
    const selectedDateObj = new Date(selectedDate);
    return userToday.toDateString() === selectedDateObj.toDateString();
  };

  const getStatus = (start) => {
  if (!loggedInUser?.timeZoneId) {
    const startTime = typeof start === 'string' ? new Date(start) : start;
    return startTime < new Date() ? "completed" : "upcoming";
  }
  
  const now = new Date();
  const userNow = new Date(now.toLocaleString("en-US", { timeZone: loggedInUser.timeZoneId }));
  const appointmentTime = typeof start === 'string' ? new Date(start) : start;
  
  return appointmentTime > userNow ? "upcoming" : "completed";
};


  const formatPrettyDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

 // --- FETCH APPOINTMENTS ---
const fetchAppointments = async () => {
  const token = localStorage.getItem("jwtToken");
  if (!loggedInUser || !token) return;
  
  try {
    const response = await fetch(`/api/appointments/user`, {
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        console.log('401 error in fetchAppointments - token may be expired');
        handleLogout();
        return;
      }
      throw new Error("Failed to fetch appointments");
    }
    
    const data = await response.json();
    
    // DEBUG: Log the raw data from backend
    console.log("Raw appointment data from backend:", data[0]);
    
    const appointments = data.map((appt) => ({
      ...appt,
      startTime: new Date(appt.startTime),
      endTime: new Date(appt.endTime),
    }));
    
    // DEBUG: Log the processed appointment
    console.log("Processed appointment:", appointments[0]);
    console.log("User timezone:", loggedInUser.timeZoneId);
    
    setAppointments(appointments);
  } catch (err) {
    console.error('Error fetching appointments:', err);
    setErrorMessage(err.message);
  }
};


  // --- ADD / EDIT ---
  const handleAddOrEdit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("jwtToken");
    if (!token || !loggedInUser) return;

    const formData = new FormData(e.target);
    const startTime24 = to24Hour(formData.get("start"), formData.get("startPeriod"));
    const endTime24 = to24Hour(formData.get("end"), formData.get("endPeriod"));
    const recurrenceMap = { None: 0, Daily: 1, Weekly: 2, Monthly: 3 };

    const startTimeString = `${selectedDate}T${startTime24}:00`;
    const endTimeString = `${selectedDate}T${endTime24}:00`;
    const recurrenceType = formData.get("recurrence") || "None";
    const recurrenceInterval = formData.get("recurrenceInterval");
    const recurrenceEndDate = formData.get("recurrenceEndDate");

    const payload = {
      Title: formData.get("title"),
      StartTime: startTimeString,
      EndTime: endTimeString,
      Description: formData.get("description") || "",
      Location: formData.get("location") || "",
      Type: formData.get("type") || "",
      ColorCode: formData.get("colorCode") || typeColors[formData.get("type") || "Meeting"],
      Recurrence: recurrenceMap[recurrenceType] || 0,
      RecurrenceInterval: recurrenceInterval ? parseInt(recurrenceInterval) : null,
      RecurrenceEndDate: recurrenceEndDate ? `${recurrenceEndDate}T23:59:59` : null,
    };

    try {
      const url = editingAppointment
        ? `/api/appointments/user/${editingAppointment.id}`
        : `/api/appointments/user`;
      const method = editingAppointment ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleLogout();
          return;
        }
        const data = await response.json();
        throw new Error(data?.message || "Failed to save appointment");
      }

      setShowModal(false);
      setEditingAppointment(null);
      setNewSlotTime(null);
      fetchAppointments();
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  // --- DELETE ---
  const handleDelete = async () => {
    if (!editingAppointment) return;
    const token = localStorage.getItem("jwtToken");
    if (!token) return;

    try {
      const response = await fetch(
        `/api/appointments/user/${editingAppointment.id}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (!response.ok) {
        if (response.status === 401) {
          handleLogout();
          return;
        }
        throw new Error("Failed to delete appointment");
      }
      
      setShowModal(false);
      setEditingAppointment(null);
      fetchAppointments();
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

    // --- FETCH ON LOGIN ---
    useEffect(() => {
      if (!loggedInUser) return;
      let cancelled = false;
      
      const fetchForUser = async () => {
        const token = localStorage.getItem("jwtToken");
        if (!token) return;
        
        try {
          const res = await fetch(`/api/appointments/user`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          if (!res.ok) {
            if (res.status === 401) {
              console.log('401 error in fetchForUser - token may be expired');
              handleLogout();
              return;
            }
            throw new Error("Failed to fetch appointments");
          }
          
          const data = await res.json();
          const appointments = data.map((appt) => ({
            ...appt,
            startTime: new Date(appt.startTime),
            endTime: new Date(appt.endTime),
          }));
          
          if (!cancelled) setAppointments(appointments);
        } catch (err) {
          if (!cancelled) {
            console.error('Error in fetchForUser:', err);
            setErrorMessage(err.message);
          }
        }
      };
      
      fetchForUser();
      return () => { cancelled = true; };
    }, [loggedInUser]);

  // --- NOW LINE ---
  useEffect(() => {
    const updateNowLine = () => {
      if (!loggedInUser?.timeZoneId) return;
      const now = new Date();
      const userTime = new Date(now.toLocaleString("en-US", { timeZone: loggedInUser.timeZoneId }));
      const minutesSinceMidnight = userTime.getHours() * 60 + userTime.getMinutes();
      setNowPx((minutesSinceMidnight / 30) * SLOT_HEIGHT);
    };
    
    updateNowLine();
    const interval = setInterval(updateNowLine, 60000);
    return () => clearInterval(interval);
  }, [loggedInUser]);

  // --- LOADING STATE ---
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  // --- LOGIN ---
  if (!loggedIn) {
    return (
      <Login
        onLogin={(user, token) => {
          if (token) localStorage.setItem("jwtToken", token);
          localStorage.setItem("userData", JSON.stringify(user));
          setLoggedIn(true);
          setLoggedInUser(user);
        }}
      />
    );
  }

  // --- RENDER VIEW ---
  const renderView = () => {
    if (currentView === "day") {
      return (
        <Timeline
          appointments={appointments}
          selectedDate={selectedDate}
          isSameDay={isSameDay}
          isToday={isToday}
          onAppointmentClick={(appointment) => {
            setEditingAppointment(appointment);
            setNewSlotTime(null);
            setShowModal(true);
          }}
          onEmptySlotClick={(time) => {
            setEditingAppointment(null);
            setNewSlotTime(time);
            setShowModal(true);
          }}
          nowPx={nowPx}
          slotHeight={SLOT_HEIGHT}
          loggedInUser={loggedInUser}
          fetchAppointments={fetchAppointments}
          highlightedAppointments={highlightedAppointments}
        />
      );
    } else if (currentView === "week") {
      return (
        <WeekView
          appointments={appointments}
          selectedDate={selectedDate}
          onAppointmentClick={(appointment) => {
            setEditingAppointment(appointment);
            setNewSlotTime(null);
            setShowModal(true);
          }}
        />
      );
    } else if (currentView === "month") {
      return (
        <MonthView
          appointments={appointments}
          selectedDate={selectedDate}
          getStatus={getStatus}
          onAppointmentClick={(appointment) => {
            setEditingAppointment(appointment);
            setNewSlotTime(null);
            setShowModal(true);
          }}
        />
      );
    }
  };

  return (
    
    <div className="app">
      <Sidebar
        appointments={appointments}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        isSameDay={isSameDay}
        getStatus={getStatus}
        currentView={currentView}
        loggedInUser={loggedInUser}
        onLogout={handleLogout}
      />
      <div className="main-content">
        <div className="page-header">
          <div className="header-left">
            <h2>{formatPrettyDate(selectedDate)}</h2>
            <div className="digital-clock">
              <span className="time">{formatDigitalTime(currentTime)}</span>
              <span className="timezone">{getTimezoneAbbr()}</span>
            </div>
          </div>
          <div className="header-right">
            <SearchBar
              onResults={(results, shouldAutoScroll = false) => {
                const ids = results.map((appt) => appt.id);
                setHighlightedAppointments(ids);
                
                // Auto-scroll to first result if requested
                  if (shouldAutoScroll && results.length > 0) {
                    const firstResult = results[0];
                    const firstResultDate = new Date(firstResult.startTime).toISOString().split("T")[0];
  
                  // Switch to the date of the first result if different
                  if (firstResultDate !== selectedDate) {
                    setSelectedDate(firstResultDate);
                  }
                  
                  setTimeout(() => {
                    const firstResultId = firstResult.id;
                    const element = document.querySelector(`[data-appointment-id="${firstResultId}"]`);
                    if (element) {
                      element.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                      });
                    }
                  }, firstResultDate !== selectedDate ? 300 : 100); // Longer delay if date changed
                }
              }}
            />
            <select
              className="view-selector"
              value={currentView}
              onChange={(e) => setCurrentView(e.target.value)}
            >
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
            <div
              className="theme-toggle"
              onClick={toggleTheme}
              title="Toggle theme"
            >
              {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
            </div>
            <button
              className="logout-btn"
              onClick={handleLogout}
              title="Logout"
            >
              Logout
            </button>
          </div>
        </div>
        {renderView()}
        <button
          className="add-btn"
          onClick={() => {
            setEditingAppointment(null);
            const now = new Date();
            const roundedMinutes = now.getMinutes() < 30 ? 0 : 30;
            const slotTime = new Date(now);
            slotTime.setMinutes(roundedMinutes, 0, 0);
            setNewSlotTime(slotTime);
            setShowModal(true);
          }}
        >
          +
        </button>
      </div>
      <Modal
        showModal={showModal}
        setShowModal={setShowModal}
        editingAppointment={editingAppointment}
        newSlotTime={newSlotTime}
        handleAddOrEdit={handleAddOrEdit}
        handleDelete={handleDelete}
      />
      <ErrorModal message={errorMessage} onClose={() => setErrorMessage(null)} />
        <WebVitalsDisplay />
    </div>
  );
}

export default App;

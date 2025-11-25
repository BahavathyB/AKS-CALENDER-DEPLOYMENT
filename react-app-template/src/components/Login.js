import React, { useState } from "react";

function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [timeZoneId, setTimeZoneId] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [error, setError] = useState("");
  const [isRegister, setIsRegister] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = isRegister
        ? "/api/users/register"
        : "/api/users/login";
      const body = isRegister
        ? { username, password, firstName, lastName, timeZoneId }
        : { username, password };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.json();
        setError(err.message || "Something went wrong");
        return;
      }

      const data = await response.json();

      if (isRegister) {
        setError("");
        alert("Registration successful! You can now login.");
        setUsername("");
        setPassword("");
        setFirstName("");
        setLastName("");
        setTimeZoneId(Intl.DateTimeFormat().resolvedOptions().timeZone);
        setIsRegister(false);
        return;
      }

      // Save JWT token for login
      if (!isRegister && data.token) {
        localStorage.setItem("jwtToken", data.token);
      }

      // Pass complete user info including timeZoneId to App
      onLogin({
        id: data.user.id,
        username: data.user.username,
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        timeZoneId: data.user.timeZoneId
      }, data.token);

    } catch (err) {
      console.error(err);
      setError("Something went wrong. Try again.");
    }
  };

  return (
    <div className="login-container">
      <h1 className="login-title">Appointments</h1>
      <form className="login-form" onSubmit={handleSubmit}>
        <div className={`form-row ${isRegister ? "two-cols" : ""}`}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {isRegister && (
          <>
            <div className="form-row two-cols">
              <input
                type="text"
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            <select
              value={timeZoneId}
              onChange={(e) => setTimeZoneId(e.target.value)}
            >
              {Intl.supportedValuesOf("timeZone").map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </>
        )}
        <button type="submit">
          {isRegister ? "Register" : "Login"}
        </button>
        {error && <p className="error-message">{error}</p>}
        <div className="register-link">
          {isRegister ? (
            <>
             <p className="link-text"> Already have an account?</p>{" "}
              <button
                type="button"
                className="link-button"
                onClick={() => {
                  setIsRegister(false);
                  setError("");
                }}
              >
                Login
              </button>
            </>
          ) : (
            <>
              <p className="link-text">Don't have an account?</p>
              <button
                type="button"
                className="link-button"
                onClick={() => {
                  setIsRegister(true);
                  setError("");
                }}
              >
                Register
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}

export default Login;

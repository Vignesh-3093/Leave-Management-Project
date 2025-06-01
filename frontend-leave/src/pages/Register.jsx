//Actually this component is not used in our project.
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/api";

function Register() {
  // State variables to hold form input values
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null); // To display registration errors
  const [success, setSuccess] = useState(false); // To show success message

  // Call the useNavigate hook to get the navigate function
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    // Made function async
    e.preventDefault();

    // Clear previous messages
    setError(null);
    setSuccess(false);

    // Prepare data to send to the backend
    const registrationData = {
      name,
      email,
      password,
      role_id: 2, // TODO: This is hardcoded for 'Employee' role for now.
    };

    try {
      // Use the api helper function to make the registration call.
      // The helper handles the base URL, method, headers, body, and checks response status.
      // It throws an Error object if the backend returns a non-OK status (including 400s, 404s, etc.).
      // If it doesn't throw, it returns the parsed JSON data from a successful response.
      const data = await api("/auth/register", "POST", registrationData, false); // false means requiresAuth is false // If the await api(...) line completes without throwing, the registration was successful.

      console.log("Registration successful:", data);
      setSuccess(true); // Show success message // Optional: Clear form fields on success

      setName("");
      setEmail("");
      setPassword("");

      setTimeout(() => {
        navigate("/login"); // Use the navigate function here
      }, 2000); // Redirect after 2 seconds
    } catch (err) {
      // Catch the error thrown by the api helper on failure
      // The api helper throws an Error object. Check if it has a 'message' property (from backend JSON)
      // or use a generic message.
      console.error(
        "Registration failed:",
        err.message || "An unknown error occurred"
      );

      // Display the error message from the backend response (if available) or a generic one.
      setError(err.message || "Registration failed");
    }
  };

  return (
    <div>
      <h2>Register</h2>
      <form onSubmit={handleSubmit}>
        {/* Display messages */}
        {error && <div style={{ color: "red" }}>{error}</div>}
        {success && (
          <div style={{ color: "green" }}>
            Registration successful! You can now <Link to="/login">Login</Link>.
          </div>
        )}

        <div>
          <label htmlFor="name">Name:</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {/* Role selection - currently hardcoded in backend */}
        <button type="submit">Register</button>
      </form>
      <p>
        Already have an account? <Link to="/login">Login here</Link>
      </p>
    </div>
  );
}

export default Register;

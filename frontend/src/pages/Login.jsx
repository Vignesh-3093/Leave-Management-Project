import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import './LoginPage.css';
import api from "../api/api";
import { toast } from 'react-toastify';

function Login() {
  // State for form inputs (email and password)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); // State for displaying error messages to the user
  const [error, setError] = useState("");
  // State to indicate if login is in progress (for button disabling)
  const [loginLoading, setLoginLoading] = useState(false); // Get the login function from the authentication context

  const { login } = useAuth(); // Get the navigate function from react-router-dom
  const navigate = useNavigate(); // This hook must be used within a Router context // Handler for form submission when the login button is clicked

  const handleSubmit = async (e) => {
    e.preventDefault();

    // console.log("Login handleSubmit entered."); // <-- Log start of handler
    setError(""); // Clear any previous error messages displayed to the user
    setLoginLoading(true); // Set loading state // Basic client-side validation: check if email and password are not empty

    if (!email || !password) {
      toast.warn("Please enter both email and password.");
      // console.warn("Login handleSubmit: Email or password missing."); // Log warning
      setLoginLoading(false);
      return;
    }

    try {
      // console.log("Login handleSubmit: Calling API for login..."); // Log before API call // Call the API helper function to send login credentials to the backend // The api helper should handle constructing the URL and headers // We set requiresAuth to false because the login endpoint itself does not require authentication

      const response = await api(
        "/api/auth/login",
        "POST",
        {
          email,
          password,
        },
        false
      );

      // console.log(
      //   "Login handleSubmit: API call completed. Response received:",
      //   response
      // );

      if (response && response.token && response.user) {
        login(response.token, response.user);
        toast.success("Login successful! Redirecting...");
        navigate("/dashboard");
      } else {
        // Handle cases where the API call succeeded (e.g., status 200) but the response structure was unexpected
        console.error(
          "Login handleSubmit: Login failed - API response structure unexpected.",
          response
        );
        toast.error("Login failed. Please check credentials.");
      }
    } catch (err) {
      // This block catches errors thrown by the api helper (e.g., network errors, non-ok HTTP statuses like 401, 403, 404, 500)
      // If using TS, add type: (err: any)
      console.error("Login handleSubmit: Login API call caught an error:", err); // Log the caught error // Attempt to display the error message from the backend response if available, otherwise use a generic message // The api helper should ideally throw errors that include response data for non-ok statuses

      if (err.response && err.response.data && err.response.data.message) {
        // If the error object contains a backend response with a message property
        console.error(
          "Login handleSubmit: Backend error message:",
          err.response.data.message
        );
        toast.error(err.response.data.message);
      } else if (err.message) {
        // If the error object has a standard message property (e.g., network error)
        console.error("Login handleSubmit: Error message:", err.message);
        toast.error(`Error: ${err.message}`);
      } else {
        // Fallback for unexpected error structures
        console.error("Login handleSubmit: An unknown error occurred.");
        toast.error("An unknown error occurred during login.");
      }
    } finally {
      // This block runs regardless of whether try or catch finished
      setLoginLoading(false);
    }
  };

  return (
    // Main container for the login page
    <div className="login-container">
      <h2>Login</h2>
      <form onSubmit={handleSubmit} className="login-form">
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loginLoading}
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loginLoading}
          />
        </div>
        {error && (
          <p className="error-message" style={{ color: "red" }}>
            {error}
          </p>
        )}
        <button type="submit" disabled={loginLoading} className="login-button">
          {loginLoading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}

export default Login;

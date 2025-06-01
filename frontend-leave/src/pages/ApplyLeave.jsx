import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import api from "../api/api";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import "./ApplyLeave.css";

function ApplyLeave() {
  const [leaveType, setLeaveType] = useState(""); // This will hold the selected type_id (integer)
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [todayString, setTodayString] = useState('');

  // State for handling form submission status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // State for fetching leave types from the backend
  const [leaveTypes, setLeaveTypes] = useState([]); // To store the list of available leave types
  const [loadingTypes, setLoadingTypes] = useState(true); // State for loading leave types
  const [errorTypes, setErrorTypes] = useState(null); // State for errors fetching types

  // Hook for redirection
  const navigate = useNavigate();

  // Get the authenticated user from the context
  const { user, token } = useAuth(); // Also get token to trigger fetch if needed

  useEffect(() => {
        // Calculate today's date in YYYY-MM-DD format
        const today = new Date();
        const year = today.getFullYear();
        // getMonth() is 0-indexed (0 for January), so add 1
        const month = (today.getMonth() + 1).toString().padStart(2, '0'); // Pad with '0' if needed
        const day = today.getDate().toString().padStart(2, '0'); // Pad with '0' if needed

        // Format as "YYYY-MM-DD"
        setTodayString(`${year}-${month}-${day}`);

    }, []);

  // Effect to fetch leave types from the backend when the component mounts
  useEffect(() => {
    const fetchLeaveTypes = async () => {
      setLoadingTypes(true);
      setErrorTypes(null);
      try {
        // Use the api helper to call the backend endpoint for leave types
        // This endpoint is protected, so the api helper will add the JWT
        const typesData = await api("/api/leaves/types", "GET");
        setLeaveTypes(typesData);
        console.log("Fetched leave types:", typesData);
      } catch (err) {
        console.error("Error fetching leave types:", err);
        setErrorTypes(err.message || "Failed to fetch leave types.");
      } finally {
        setLoadingTypes(false);
      }
    };

    // Only fetch types if the user is authenticated (token exists)
    if (token) {
      fetchLeaveTypes();
    } else {
      setLoadingTypes(false); // If not authenticated, stop loading state
      setErrorTypes("Not authenticated to fetch leave types."); // Indicate error
    }
  }, [token]); // Re-run effect if token changes (e.g., after login)

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default form submission

    // Reset status messages
    setLoading(true);
    setError(null);
    setSuccess(false);

    // Basic validation (more robust validation can be added)
    // Now checking if leaveType (which will be type_id) is selected
    if (!leaveType || !startDate || !endDate || !reason) {
      setError("All fields are required.");
      setLoading(false);
      return;
    }

    // Prepare the leave request data
    const leaveData = {
      type_id: parseInt(leaveType, 10), // Send the selected type_id as an integer
      start_date: startDate,
      end_date: endDate,
      reason: reason,
      // The backend will get the user_id from the JWT, no need to send it from frontend
      // status will be defaulted to 'Pending' in the backend/DB
    };

    try {
      const responseData = await api("/api/leaves", "POST", leaveData);

      console.log("Leave request submitted successfully:", responseData);
      setSuccess(true);

      // Optional: Clear the form after successful submission
      setLeaveType("");
      setStartDate("");
      setEndDate("");
      setReason("");

      // Optional: Redirect user after successful submission (e.g., to a 'My Leaves' page)
      setTimeout(() => {
        navigate("/dashboard"); // Redirect to dashboard for now, or '/my-leaves' later
      }, 2000);
    } catch (err) {
      console.error("Error submitting leave request:", err);
      // The api helper handles 401/403 by logging out, so other errors are likely network/backend validation
      setError(err.message || "Failed to submit leave request.");
    } finally {
      setLoading(false); // Always set loading to false
    }
  };

  return (
    <div className="apply-leave-container">
      <h2>Applying Leave</h2>
      {/* Display current user's name, making the 'user' variable used */}
      {user && (
        <p className="applying-as-info">
          Applying as: <strong>{user.name}</strong>
        </p>
      )}

      <div className="leave-info-message">
        {" "}
        <p>
          <strong>Please note:</strong> Leave duration is calculated based on
          Working days. Weekends (Saturdays and Sundays) are automatically
          excluded and are not counted as leave days.
        </p>
      </div>
      <div className="leave-info-approval-rule">
        {" "}
        <p>
          <strong>Important:</strong>Leave requests
          exceeding 5 working days require approval from both your Manager and
          Admin.
        </p>
      </div>

      {/* Display status messages */}
      {error && <div className="error-message">{error}</div>}
      {success && (
        <div className="success-message">
          Leave request submitted successfully! Redirecting...
        </div>
      )}

      <form onSubmit={handleSubmit} className="leave-form">
        <div className="form-group">
          <label htmlFor="leaveType">Leave Type:</label>
          {/* Display loading or error message while fetching types */}
          {loadingTypes && (
            <p className="loading-types-message">Loading leave types...</p>
          )}
          {errorTypes && (
            <p className="error-types-message">
              Error loading leave types: {errorTypes}
            </p>
          )}

          {/* Render the select dropdown only when types are loaded and no error */}
          {!loadingTypes && !errorTypes && (
            <select
              id="leaveType"
              value={leaveType} // Bind value to state (will be type_id)
              onChange={(e) => setLeaveType(e.target.value)} // Update state
              required
              disabled={loading || loadingTypes} // Disable while submitting or loading types
            >
              <option value="">Select Leave Type</option>
              {/* Map over the fetched leave types to create options */}
              {leaveTypes.map((type) => (
                <option key={type.type_id} value={type.type_id}>
                  {type.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="startDate">Start Date:</label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            min={todayString}
            disabled={loading || loadingTypes} // Disable while submitting or loading types
          />
        </div>

        <div className="form-group">
          <label htmlFor="endDate">End Date:</label>
          <input
            type="date"
            id="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
            min={startDate || todayString}
            disabled={loading || loadingTypes} // Disable while submitting or loading types
          />
        </div>

        <div className="form-group">
          <label htmlFor="reason">Reason:</label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            disabled={loading || loadingTypes} // Disable while submitting or loading types
            rows="4" // Give it some height
          ></textarea>
        </div>

        <button
          type="submit"
          disabled={loading || loadingTypes}
          className="submit-button"
        >
          {loading ? "Submitting..." : "Submit Leave Request"}
        </button>
      </form>

      {/* Optional: Link back to Dashboard or other relevant page */}
      <div className="back-link-container">
        <p>
          <Link to="/dashboard">Back to Dashboard</Link>
        </p>
      </div>
    </div>
  );
}

export default ApplyLeave;

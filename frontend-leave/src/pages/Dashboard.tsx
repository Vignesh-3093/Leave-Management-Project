import React, { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import api from "../api/api";
import { Link, useNavigate } from "react-router-dom";
import "./Dashboard.css";


// --- Define Role IDs (These must match your backend/database 'roles' table exact role_id values) ---
// Defined OUTSIDE the component function
const ADMIN_ROLE_ID = 1;
const EMPLOYEE_ROLE_ID = 2;
const MANAGER_ROLE_ID = 3;
const INTERN_ROLE_ID = 4; 

// Expected structure of the user object received from the authentication context (useAuth hook)
interface AuthUser {
  user_id: number;
  name: string;
  email: string;
  role_id: number; // Include role_id for frontend access control and conditional rendering
  manager_id?: number | null; // Optional: if your user object includes manager_id
}

// Expected shape of the value returned by the useAuth hook
interface AuthContextType {
  user: AuthUser | null; // User object or null if not authenticated
  token: string | null; // JWT token string or null if not authenticated
  isAuthenticated: boolean; // Boolean: true if token exists, false otherwise
  loading: boolean; // Boolean: true during initial authentication state check (localStorage)
  login: (newToken: string, newUser: AuthUser) => void; // Function to log in user (updates state/localStorage)
  logout: () => void; // Function to log out user (clears state/localStorage)
}

// Expected structure of a single leave balance item received from the backend
interface LeaveBalance {
    balance_id: number;
    user_id: number; // The user this balance belongs to
    type_id: number; // The type of leave this balance is for
    year: number; // The year of the balance (e.g., 2024)
    total_days: number; // Total days allocated for this leave type in this year
    used_days: number; // Days used for this leave type in this year
    // Assuming leaveType is eager loaded in the backend relationship
    leaveType: {
        type_id: number;
        name: string;
    };
}

// Expected structure of a single leave request item received from the backend
interface LeaveRequest {
    leave_id: number; // Unique ID of the leave request
    user_id: number; // The user who applied for the leave
    type_id: number; // The type of leave applied for
    start_date: string; // Start date of the leave (ISO 8601 string)
    end_date: string; // End date of the leave (ISO 8601 string)
    reason: string; // Reason for the leave
    status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled'; // Current status of the request
    required_approvals: number; // Number of approvals needed (might not be strictly required on Dashboard history)
    applied_at: string; // Timestamp when the leave was applied (ISO 8601 string)
    // Assuming leaveType is eager loaded in the backend relationship
    leaveType: {
        type_id: number;
        name: string; // The name of the leave type
        // Include other LeaveType properties if needed
    };
    applicant?: {
        user_id: number;
        name: string;
        email: string;
    };
}

// Expected structure of a single leave type item received from the backend (for Admin view)
interface LeaveType {
    type_id: number;
    name: string;
    requires_approval: boolean;
    is_balance_based: boolean;
    // Add other properties if your LeaveType entity has them
}


function Dashboard() {
  const { user, token, logout, isAuthenticated, loading: authLoading } = useAuth() as unknown as AuthContextType; // <-- Corrected destructuring

  // Use useNavigate hook for programmatic navigation (e.g., after logout)
  const navigate = useNavigate();


  // --- State for User's Leave Balances ---
  const [userLeaveBalances, setUserLeaveBalances] = useState<LeaveBalance[]>([]);
  const [loadingBalances, setLoadingBalances] = useState(true);
  const [errorBalances, setErrorBalances] = useState<string | null>(null);

  // --- State for User's Leave Request History ---
  const [userLeaveRequests, setUserLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [errorHistory, setErrorHistory] = useState<string | null>(null);

  // --- State for Admin Leave Types (for Admin role) ---
  const [adminLeaveTypes, setAdminLeaveTypes] = useState<LeaveType[]>([]); // Use LeaveType interface
  const [loadingAdminTypes, setLoadingAdminTypes] = useState(true);
  const [errorAdminTypes, setErrorAdminTypes] = useState<string | null>(null);


  // Using optional chaining (?.) for safe access to user and role_id properties
  const isAdmin = user?.role_id === ADMIN_ROLE_ID;
  const isManagerOrAdmin = user && (user.role_id === MANAGER_ROLE_ID || user.role_id === ADMIN_ROLE_ID);
  const isEmployeeOrIntern = user && (user.role_id === EMPLOYEE_ROLE_ID || user.role_id === INTERN_ROLE_ID);


  useEffect(() => {
    // Define the async function to fetch balances
    const fetchLeaveBalances = async () => {
      setLoadingBalances(true); // Start loading
      setErrorBalances(null); // Clear previous errors
      try {
        const balancesData: LeaveBalance[] = await api("/api/leaves/balance", "GET");
        const processedBalances = balancesData.map(balance => ({
          ...balance,
          // Convert string decimals from backend to numbers for frontend calculations/display
          total_days: parseFloat(balance.total_days as any),
          used_days: parseFloat(balance.used_days as any),
        }));


        setUserLeaveBalances(processedBalances); // Set the fetched/processed data
        console.log("Dashboard: Fetched user's leave balances:", processedBalances); // Log processed data

      } catch (err: any) {
        // Catch any errors during the API call (network issues, non-ok status codes)
        console.error("Dashboard: Error fetching leave balances:", err);
        // Set an informative error message
        setErrorBalances(err.message || "Failed to fetch leave balances.");
      } finally {
        setLoadingBalances(false); // End loading regardless of success or failure
      }
    };

    // Fetch balances only if the user is authenticated, auth loading is complete, and the user is NOT an Admin
    // Admins might view leave data differently (e.g., all users' data)
    if (!authLoading && isAuthenticated && !isAdmin) {
      fetchLeaveBalances();
    } else if (!isAuthenticated && !authLoading) {
        // If not authenticated after loading, clear balances state
        setUserLeaveBalances([]);
        setLoadingBalances(false); // Ensure loading is false
        // setErrorBalances("Not authenticated to fetch leave balances."); // Optional - Frontend UI handles unauthenticated state
    }
     else {
        // If admin or still auth loading, set loading to false and clear balances
        setUserLeaveBalances([]);
        setLoadingBalances(false);
    }

  }, [token, user, authLoading, isAuthenticated, isAdmin]);


  // --- Effect to Fetch User's Leave Request History ---
  useEffect(() => {
    // Define the async function to fetch history
    const fetchLeaveHistory = async () => {
      setLoadingHistory(true); // Start loading
      setErrorHistory(null); // Clear previous errors
      try {
        const historyData: LeaveRequest[] = await api("/api/leaves/my", "GET"); // <-- CORRECTED URL

        setUserLeaveRequests(historyData); // Set the fetched data
        console.log("Dashboard: Fetched user's leave history:", historyData);

      } catch (err: any) {
        // Catch any errors during the API call
        console.error("Dashboard: Error fetching leave history:", err);
        setErrorHistory(err.message || "Failed to fetch leave history."); // Set error message
      } finally {
        setLoadingHistory(false); // End loading
      }
    };

    // Fetch history only if the user is authenticated, auth loading is complete, and the user is NOT an Admin
    if (!authLoading && isAuthenticated && !isAdmin) {
      fetchLeaveHistory();
    } else if (!isAuthenticated && !authLoading) {
        // If not authenticated after loading, clear history state
        setUserLeaveRequests([]);
        setLoadingHistory(false); // Ensure loading is false
        // setErrorHistory("Not authenticated to fetch leave history."); // Optional - Frontend UI handles unauthenticated state
    }
    else {
        // If admin or still auth loading, set loading to false and clear history
        setUserLeaveRequests([]);
        setLoadingHistory(false);
    }
  }, [token, user, authLoading, isAuthenticated, isAdmin]); // Dependencies

  useEffect(() => {
    // Define the async function to fetch admin leave types
    const fetchAdminLeaveTypes = async () => {
      setLoadingAdminTypes(true); // Start loading
      setErrorAdminTypes(null); // Clear previous errors
      try {
        // Call the backend endpoint for admin leave types (requires auth by default)
        // This URL seems correct based on your backend adminRoutes.ts
        const typesData: LeaveType[] = await api("/api/admin/leave-types", "GET");

        setAdminLeaveTypes(typesData); // Set the fetched data
        console.log("Dashboard: Fetched Admin leave types:", typesData); // Log the successful response

      } catch (err: any) {
        // Catch any errors during the API call
        console.error("Dashboard: Error fetching Admin leave types:", err); // Log the error
        setErrorAdminTypes(err.message || "Failed to fetch admin leave types."); // Set error message
      } finally {
        setLoadingAdminTypes(false); // End loading
      }
    };

    // Fetch admin leave types ONLY if the user is authenticated, auth loading is complete, AND is an Admin
    // Added check for user existence before accessing user.role_id
    if (!authLoading && isAuthenticated && user?.role_id === ADMIN_ROLE_ID) {
      fetchAdminLeaveTypes();
    } else if (!authLoading) {
        // If not Admin after loading, clear admin types state
        setAdminLeaveTypes([]);
        setLoadingAdminTypes(false); // Ensure loading is false
        // Optionally set an error message if the user is logged in but not an Admin
        if (isAuthenticated && user && user.role_id !== ADMIN_ROLE_ID) {
            setErrorAdminTypes("You do not have permission to view admin data.");
        } else if (!isAuthenticated) { // This case is likely handled by ProtectedRoute
            // setErrorAdminTypes("Not authenticated to view admin data.");
        }
    }
     else {
        // If still auth loading, set loading to false and clear state
        setAdminLeaveTypes([]);
        setLoadingAdminTypes(false);
    }
  }, [token, user, authLoading, isAuthenticated, isAdmin]);


  // --- Function to handle cancelling a leave request ---
  const handleCancelLeave = async (leaveId: number) => {
    // Optional: Add a confirmation prompt before cancelling
    if (!window.confirm("Are you sure you want to cancel this leave request?")) {
      return; // Stop if user cancels the prompt
    }

    try {
      console.log(`Dashboard: Attempting to cancel leave request ID: ${leaveId}`);
      await api(`/api/leaves/my/${leaveId}/cancel`, "PUT");

      console.log(`Dashboard: Leave ID ${leaveId} cancelled successfully.`);

      // --- Update the frontend state to reflect the cancellation ---
      // Find the cancelled leave in the current history state and update its status
      setUserLeaveRequests(prevRequests =>
        prevRequests.map(request =>
          request.leave_id === leaveId ? { ...request, status: "Cancelled" } : request // Update status to 'Cancelled'
        )
      );

      // Optional: Show a success message to the user
      alert(`Leave request ${leaveId} cancelled successfully.`);

    } catch (err: any) {
      // Catch any errors during the API call
      console.error(`Dashboard: Error cancelling leave request ID ${leaveId}:`, err);

      // Show an informative error message to the user
      alert(`Failed to cancel leave request ${leaveId}. Error: ${err.message || "Unknown error"}`);
    }
  };


  // --- Handle Logout Action ---
  const handleLogout = () => {
    console.log('Dashboard: Handling logout...');
    // Call the logout function from the authentication context
    logout(); // This clears state and localStorage via AuthContext.jsx

    // --- Navigate to the login page after logout ---
    // Use the navigate function obtained from useNavigate hook
    navigate('/login');
  };

  if (authLoading) {
    return <div className="dashboard-loading">Loading authentication state...</div>; // Add CSS class
  }

  // If authentication loading is complete but there is no user, redirect to login.
  // This check is somewhat redundant if ProtectedRoute is used correctly, but serves as a fallback.
  if (!user) {
    // Redirecting is handled by ProtectedRoute, so this component shouldn't render in unauthenticated state after loading
    // However, you could show a brief message or spinner here if needed.
    return <div className="dashboard-unauthenticated">Not authenticated. Redirecting...</div>;
  }


  // If authentication is complete and user is available, render the main dashboard content
  return (
    <div className="dashboard-container">
      <h2 className="page-title">Dashboard</h2>
      <p className="welcome-message">Welcome, <strong>{user.name}</strong>!</p>

      <hr /> {/* Separator line */}


      {/* --- Navigation Links Section --- */}
      <h3>Navigation</h3>
      <div className="dashboard-nav">

        {!isAdmin && (
          <p className="nav-link">
            <Link to="/apply-leave">Apply for Leave</Link>
          </p>
        )}

        {/* Link for Managers and Admins to view pending approvals - Conditionally rendered */}
        {isManagerOrAdmin && (
          <p className="nav-link"> {/* Add CSS class */}
            <Link to="/approvals">View Pending Approvals</Link>
          </p>
        )}

        {/* Admin Specific Links - Conditionally rendered ONLY for Admin role */}
        {isAdmin && ( // <-- Check specifically for Admin role using the constant
          <> {/* Use a React Fragment to group multiple links without adding an extra DOM node */}
            <p className="nav-link">
              <Link to="/admin/leave-types">Manage Leave Types</Link> {/* Link to Admin Leave Types page */}
            </p>
             <p className="nav-link">
             <Link to="/admin/users">Manage Users</Link> {/* Link to Admin Users page */}
             </p>
          </>
        )}

        {isAuthenticated && ( // Or just rely on the !user check above the return statement
          <p className="nav-link">
            <Link to="/calendar">View Calendar</Link>
          </p>
        )}

      </div>

      <hr /> {/* Separator line */}


      {/* --- User's Leave Balances Section --- */}
      {/* Visible only to Employee and Intern roles based on typical leave tracking */}
      {/* Use the isEmployeeOrIntern boolean check */}
      {user?.role_id !== ADMIN_ROLE_ID && (
        <div className="role-specific-section leave-balances-section">
          <h3>Your Leave Balances</h3>
          {loadingBalances && <p className="loading-message">Loading leave balances...</p>} {/* Loading indicator */}
          {/* Display error message if loading is done, there's an error, and no balances were loaded */}
          {!loadingBalances && errorBalances && !userLeaveBalances.length && (
            <p className="error-message" style={{ color: 'red' }}>Error: {errorBalances}</p>
          )}
          {/* Display balances table if loading is done, no error, and there are balances */}
          {!loadingBalances && !errorBalances && userLeaveBalances.length > 0 && (
            <table className="leave-table balances-table">
              <thead>
                <tr>
                  <th>Leave Type</th>
                  <th>Year</th>
                  <th>Total Days</th>
                  <th>Used Days</th>
                  <th>Available Days</th>
                </tr>
              </thead>
              <tbody>
                {userLeaveBalances.map(balance => (
                  <tr key={balance.balance_id}> {/* Use balance_id as key */}
                    <td>{balance.leaveType?.name || "Unknown Type"}</td> {/* Display leave type name (handle potential null) */}
                    <td>{balance.year}</td> {/* Display year */}
                    {/* Convert string decimals from backend to numbers for display */}
                    <td>{parseFloat(balance.total_days as any).toFixed(2)}</td> {/* Display total days, formatted */}
                    <td>{parseFloat(balance.used_days as any).toFixed(2)}</td> {/* Display used days, formatted */}
                    <td>
                      {/* Calculate and display available days */}
                      {(parseFloat(balance.total_days as any) - parseFloat(balance.used_days as any)).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {/* Message if loading is done, no error, and no balances found */}
          {!loadingBalances && !errorBalances && userLeaveBalances.length === 0 && (
            <p className="no-data-message">No leave balances found.</p>
          )}
        </div>
      )}


      <hr /> {/* Separator line */}


      {/* --- User's Leave Request History Section --- */}
      {/* Visible only to Employee and Intern roles */}
      {/* Use the isEmployeeOrIntern boolean check */}
         {user?.role_id !== ADMIN_ROLE_ID && (
        <div className="role-specific-section leave-history-section"> {/* Add CSS class */}
        <h3>Your Leave Request History</h3>
          {loadingHistory && <p className="loading-message">Loading leave history...</p>} {/* Loading indicator */}
          {/* Display error message if loading is done, there's an error, and no history was loaded */}
          {!loadingHistory && errorHistory && !userLeaveRequests.length && (
            <p className="error-message" style={{ color: 'red' }}>Error: {errorHistory}</p>
          )}
          {/* Display history table if loading is done, no error, and there is history */}
          {!loadingHistory && !errorHistory && userLeaveRequests.length > 0 && (
            <table className="leave-table history-table">
              <thead>
                <tr>
                  <th>Leave Type</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Applied At</th>
                  <th>Actions</th> {/* Column for action buttons like Cancel */}
                </tr>
              </thead>
              <tbody>
                {userLeaveRequests.map(request => (
                  <tr key={request.leave_id}> {/* Use leave_id as key */}
                    <td>{request.leaveType?.name || "Unknown Type"}</td> {/* Display leave type name */}
                    <td>{new Date(request.start_date).toLocaleDateString()}</td> {/* Format start date */}
                    <td>{new Date(request.end_date).toLocaleDateString()}</td> {/* Format end date */}
                    <td>{request.reason}</td> {/* Display reason */}
                    {/* Apply Conditional Styling to Status TD */}
                    <td
                      className={`status-${request.status.toLowerCase()}`}                                                
                      style={{
                        color:
                          request.status === "Approved" ? "green" :
                          request.status === "Rejected" ? "red" :
                          request.status === "Pending" ? "orange" :
                          request.status === "Cancelled" ? "grey" :
                          request.status === "Awaiting_Admin_Approval" ? "blueviolet" :
                          "black", // Default color
                      }}
                    >
                      {request.status} {/* Display status */}
                    </td>
                    {/* --- End Conditional Styling --- */}
                    <td>{new Date(request.applied_at).toLocaleString()}</td> {/* Format applied date/time */}
                    <td>
                      {/* Render Cancel button only if status is Pending */}
                      {request.status === "Pending" && (
                        <button
                          className="cancel-button"
                          onClick={() => handleCancelLeave(request.leave_id)} // Attach handler with leave ID
                          disabled={loadingHistory} // Optionally disable while history is loading/updating
                        >
                          Cancel
                        </button>
                      )}
                  </td>
                </tr>
                ))}
              </tbody>
            </table>
          )}
          {/* Message if loading is done, no error, and no history found */}
          {!loadingHistory && !errorHistory && userLeaveRequests.length === 0 && (
            <p className="no-data-message">No leave history found.</p>
          )}
        </div>
      )}


      <hr /> {/* Separator line */}


      {/* --- Logout Button --- */}
      <button className="logout-button" onClick={handleLogout}>
        Logout {/* Button text */}
      </button>


    </div>
  );
}

export default Dashboard;
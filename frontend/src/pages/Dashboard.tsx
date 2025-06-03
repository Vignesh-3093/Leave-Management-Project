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
  used_days: number; // Days used for this leave type in this year // Assuming leaveType is eager loaded in the backend relationship
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
  status:
    | "Pending"
    | "Approved"
    | "Rejected"
    | "Cancelled"
    | "Awaiting_Admin_Approval"; // Current status of the request
  required_approvals: number; // Number of approvals needed (might not be strictly required on Dashboard history)
  applied_at: string; // Timestamp when the leave was applied (ISO 8601 string) // Assuming leaveType is eager loaded in the backend relationship
  leaveType: {
    type_id: number;
    name: string; // The name of the leave type // Include other LeaveType properties if needed
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
  is_balance_based: boolean; // Add other properties if your LeaveType entity has them
}

function Dashboard() {
  const {
    user,
    token,
    logout,
    isAuthenticated,
    loading: authLoading,
  } = useAuth() as unknown as AuthContextType;

  const navigate = useNavigate();

  const [userLeaveBalances, setUserLeaveBalances] = useState<LeaveBalance[]>(
    []
  );
  const [loadingBalances, setLoadingBalances] = useState(true);
  const [errorBalances, setErrorBalances] = useState<string | null>(null);

  const [userLeaveRequests, setUserLeaveRequests] = useState<LeaveRequest[]>(
    []
  );
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [errorHistory, setErrorHistory] = useState<string | null>(null);

  const [adminLeaveTypes, setAdminLeaveTypes] = useState<LeaveType[]>([]);
  const [loadingAdminTypes, setLoadingAdminTypes] = useState(true);
  const [errorAdminTypes, setErrorAdminTypes] = useState<string | null>(null);

  const isAdmin = user?.role_id === ADMIN_ROLE_ID;
  const isManagerOrAdmin =
    user &&
    (user.role_id === MANAGER_ROLE_ID || user.role_id === ADMIN_ROLE_ID);
  const isEmployeeOrIntern =
    user &&
    (user.role_id === EMPLOYEE_ROLE_ID || user.role_id === INTERN_ROLE_ID);

  useEffect(() => {
    const fetchLeaveBalances = async () => {
      setLoadingBalances(true);
      setErrorBalances(null);
      try {
        const balancesData: LeaveBalance[] = await api(
          "/api/leaves/balance",
          "GET"
        );
        const processedBalances = balancesData.map((balance) => ({
          ...balance,
          total_days: parseFloat(balance.total_days as any),
          used_days: parseFloat(balance.used_days as any),
        }));
        setUserLeaveBalances(processedBalances);
        console.log(
          "Dashboard: Fetched user's leave balances:",
          processedBalances
        );
      } catch (err: any) {
        console.error("Dashboard: Error fetching leave balances:", err);
        setErrorBalances(err.message || "Failed to fetch leave balances.");
      } finally {
        setLoadingBalances(false);
      }
    };

    if (!authLoading && isAuthenticated && !isAdmin) {
      fetchLeaveBalances();
    } else if (!isAuthenticated && !authLoading) {
      setUserLeaveBalances([]);
      setLoadingBalances(false);
    } else {
      setUserLeaveBalances([]);
      setLoadingBalances(false);
    }
  }, [token, user, authLoading, isAuthenticated, isAdmin]);

  useEffect(() => {
    const fetchLeaveHistory = async () => {
      setLoadingHistory(true);
      setErrorHistory(null);
      try {
        const historyData: LeaveRequest[] = await api("/api/leaves/my", "GET");
        setUserLeaveRequests(historyData);
        console.log("Dashboard: Fetched user's leave history:", historyData);
      } catch (err: any) {
        console.error("Dashboard: Error fetching leave history:", err);
        setErrorHistory(err.message || "Failed to fetch leave history.");
      } finally {
        setLoadingHistory(false);
      }
    };

    if (!authLoading && isAuthenticated && !isAdmin) {
      fetchLeaveHistory();
    } else if (!isAuthenticated && !authLoading) {
      setUserLeaveRequests([]);
      setLoadingHistory(false);
    } else {
      setUserLeaveRequests([]);
      setLoadingHistory(false);
    }
  }, [token, user, authLoading, isAuthenticated, isAdmin]);

  useEffect(() => {
    const fetchAdminLeaveTypes = async () => {
      setLoadingAdminTypes(true);
      setErrorAdminTypes(null);
      try {
        const typesData: LeaveType[] = await api(
          "/api/admin/leave-types",
          "GET"
        );
        setAdminLeaveTypes(typesData);
        console.log("Dashboard: Fetched Admin leave types:", typesData);
      } catch (err: any) {
        console.error("Dashboard: Error fetching Admin leave types:", err);
        setErrorAdminTypes(err.message || "Failed to fetch admin leave types.");
      } finally {
        setLoadingAdminTypes(false);
      }
    };

    if (!authLoading && isAuthenticated && user?.role_id === ADMIN_ROLE_ID) {
      fetchAdminLeaveTypes();
    } else if (!authLoading) {
      setAdminLeaveTypes([]);
      setLoadingAdminTypes(false);
      if (isAuthenticated && user && user.role_id !== ADMIN_ROLE_ID) {
        setErrorAdminTypes("You do not have permission to view admin data.");
      }
    } else {
      setAdminLeaveTypes([]);
      setLoadingAdminTypes(false);
    }
  }, [token, user, authLoading, isAuthenticated, isAdmin]);

  const handleCancelLeave = async (leaveId: number) => {
    if (
      !window.confirm("Are you sure you want to cancel this leave request?")
    ) {
      return;
    }

    try {
      console.log(
        `Dashboard: Attempting to cancel leave request ID: ${leaveId}`
      );
      await api(`/api/leaves/my/${leaveId}/cancel`, "PUT");
      console.log(`Dashboard: Leave ID ${leaveId} cancelled successfully.`);
      setUserLeaveRequests((prevRequests) =>
        prevRequests.map((request) =>
          request.leave_id === leaveId
            ? { ...request, status: "Cancelled" }
            : request
        )
      );
      alert(`Leave request ${leaveId} cancelled successfully.`);
    } catch (err: any) {
      console.error(
        `Dashboard: Error cancelling leave request ID ${leaveId}:`,
        err
      );
      alert(
        `Failed to cancel leave request ${leaveId}. Error: ${
          err.message || "Unknown error"
        }`
      );
    }
  };

  const handleLogout = () => {
    console.log("Dashboard: Handling logout...");
    logout();
    navigate("/login");
  };

  if (authLoading) {
    return (
      <div className="dashboard-loading">Loading authentication state...</div>
    );
  }

  if (!user) {
    return (
      <div className="dashboard-unauthenticated">
        Not authenticated. Redirecting...
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <h2 className="page-title">Dashboard</h2>
      <p className="welcome-message">
        Welcome, <strong>{user.name}</strong>!
      </p>
      <hr />
      <h3>Navigation</h3>
      <div className="dashboard-nav">
        {!isAdmin && (
          <p className="nav-link">
            <Link to="/apply-leave">Apply for Leave</Link>
          </p>
        )}
        {isManagerOrAdmin && (
          <p className="nav-link">
            <Link
              to="/approvals"
              onClick={() => console.log("Pending Approvals link clicked")}
            >
              View Pending Approvals
            </Link>
          </p>
        )}
        {isAdmin && (
          <>
            <p className="nav-link">
              <Link to="/admin/leave-types">Manage Leave Types</Link>
            </p>
            <p className="nav-link">
              <Link to="/admin/users">Manage Users</Link>
            </p>
          </>
        )}
        {isAuthenticated && (
          <p className="nav-link">
            <Link to="/calendar">View Calendar</Link>
          </p>
        )}
      </div>
      <hr />
      {user?.role_id !== ADMIN_ROLE_ID && (
        <div className="role-specific-section leave-balances-section">
          <h3>Your Leave Balances</h3>
          {loadingBalances && (
            <p className="loading-message">Loading leave balances...</p>
          )}
          {!loadingBalances && errorBalances && !userLeaveBalances.length && (
            <p className="error-message" style={{ color: "red" }}>
              Error: {errorBalances}
            </p>
          )}
          {!loadingBalances &&
            !errorBalances &&
            userLeaveBalances.length > 0 && (
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
                  {userLeaveBalances.map((balance) => (
                    <tr key={balance.balance_id}>
                      <td>{balance.leaveType?.name || "Unknown Type"}</td>
                      <td>{balance.year}</td>
                      <td>
                        {parseFloat(balance.total_days as any).toFixed(2)}
                      </td>
                      <td>{parseFloat(balance.used_days as any).toFixed(2)}</td>
                      <td>
                        {(
                          parseFloat(balance.total_days as any) -
                          parseFloat(balance.used_days as any)
                        ).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          {!loadingBalances &&
            !errorBalances &&
            userLeaveBalances.length === 0 && (
              <p className="no-data-message">No leave balances found.</p>
            )}
        </div>
      )}
      <hr />
      {user?.role_id !== ADMIN_ROLE_ID && (
        <div className="role-specific-section leave-history-section">
          <h3>Your Leave Request History</h3>
          {loadingHistory && (
            <p className="loading-message">Loading leave history...</p>
          )}
          {!loadingHistory && errorHistory && !userLeaveRequests.length && (
            <p className="error-message" style={{ color: "red" }}>
              Error: {errorHistory}
            </p>
          )}
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {userLeaveRequests.map((request) => (
                  <tr key={request.leave_id}>
                    <td>{request.leaveType?.name || "Unknown Type"}</td>
                    <td>{new Date(request.start_date).toLocaleDateString()}</td>
                    <td>{new Date(request.end_date).toLocaleDateString()}</td>
                    <td>{request.reason}</td>
                    <td
                      className={`status-${request.status.toLowerCase()}`}
                      style={{
                        color:
                          request.status === "Approved"
                            ? "green"
                            : request.status === "Rejected"
                            ? "red"
                            : request.status === "Pending"
                            ? "orange"
                            : request.status === "Cancelled"
                            ? "grey"
                            : request.status === "Awaiting_Admin_Approval"
                            ? "blueviolet"
                            : "black",
                      }}
                    >
                      {request.status}
                    </td>
                    <td>{new Date(request.applied_at).toLocaleString()}</td>
                    <td>
                      {request.status === "Pending" && (
                        <button
                          className="cancel-button"
                          onClick={() => handleCancelLeave(request.leave_id)}
                          disabled={loadingHistory}
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
          {!loadingHistory &&
            !errorHistory &&
            userLeaveRequests.length === 0 && (
              <p className="no-data-message">No leave history found.</p>
            )}
        </div>
      )}
      <hr />
      <button className="logout-button" onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
}

export default Dashboard;

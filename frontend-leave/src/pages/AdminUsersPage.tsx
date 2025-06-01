import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import api from "../api/api";
import { Link } from "react-router-dom";
import "./AdminUsersPage.css";

// --- Define Role IDs (These must match your backend/database role IDs) ---
// Defined OUTSIDE the component function
const ADMIN_ROLE_ID = 1;
const EMPLOYEE_ROLE_ID = 2;
const MANAGER_ROLE_ID = 3;
const INTERN_ROLE_ID = 4;

// Consider moving these to a shared types file (e.g., src/types.ts) later

// Expected structure of the user object from the authentication context (useAuth hook)
interface AuthUser {
  user_id: number;
  name: string;
  email: string;
  role_id: number; // Include role_id for frontend access control and conditional rendering
  manager_id?: number | null; // Optional: if  user object includes manager_id
}

interface UserResponse {
  user_id: number;
  name: string;
  email: string;
  role_id: number;
  manager_id: number | null; // Include manager_id if applicable
  role: {
    role_id: number;
    name: string;
  };
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

// Interface for the request body when creating a User
interface CreateUserRequestBody {
  name: string;
  email: string;
  password: string;
  role_id: number; // Client must specify the role ID for the new user
  manager_id?: number | null; // Optional: Allow assigning a manager during creation
}

// This interface matches the expected structure from the backend
interface UserWithBalancesResponse {
  user_id: number;
  name: string;
  email: string;
  role_id: number;
  manager_id: number | null; // Include manager_id if applicable
  role: {
    role_id: number;
    name: string; // Assuming Role entity has a 'name' property
  };
  // Add other properties from User entity that you want to display if the backend returns them
  leaveBalances: {
    // Matches the structure from the backend handler
    leaveTypeName: string;
    totalDays: number;
    usedDays: number;
    availableDays: number;
    year: number; // Added year as it's included in the backend response
  }[]; // Array of balance summaries for the current year
}

function AdminUsersPage() {
  // Get user from authentication context
  const {
    user,
    token,
    isAuthenticated,
    loading: authLoading,
  } = useAuth() as AuthContextType; // <-- Add the type assertion

  // Check if the logged-in user is an Admin
  const isAdmin = user?.role_id === ADMIN_ROLE_ID;

  // --- State for Create User Form ---
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  // Store role_id as number now for easier comparison
  const [newUserRole, setNewUserRole] = useState<number | "">("");
  const [newUserManagerId, setNewUserManagerId] = useState<number | "">(""); // State for selected manager
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [createUserError, setCreateUserError] = useState<string | null>(null);
  const [createUserSuccess, setCreateUserSuccess] = useState<string | null>(
    null
  );

  // Use the new interface for list states
  const [managersList, setManagersList] = useState<UserWithBalancesResponse[]>(
    []
  ); // For Manager dropdown (and display)
  const [employeesList, setEmployeesList] = useState<
    UserWithBalancesResponse[]
  >([]); // For Employees display
  const [internsList, setInternsList] = useState<UserWithBalancesResponse[]>(
    []
  ); // For Interns display
  const [allUsersList, setAllUsersList] = useState<UserWithBalancesResponse[]>(
    []
  ); // For All Users display

  const [loadingLists, setLoadingLists] = useState(false);
  const [errorLists, setErrorLists] = useState<string | null>(null);
  // State to track which list is currently being displayed ('All', 'Managers', 'Employees', 'Interns')
  const [currentListView, setCurrentListView] = useState<string>("All");
  // --- End State: Lists ---

  // --- Function to Handle Create User Form Submission ---
  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission
    setCreateUserLoading(true);
    setCreateUserError(null);
    setCreateUserSuccess(null); // Clear previous messages

    // Basic client-side validation
    if (
      !newUserName.trim() ||
      !newUserEmail.trim() ||
      !newUserPassword.trim() ||
      newUserRole === ""
    ) {
      setCreateUserError("All required fields must be filled.");
      setCreateUserLoading(false);
      return;
    }

    // Construct the data payload
    const newUserData: CreateUserRequestBody = {
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      password: newUserPassword,
      role_id: newUserRole as number, // Use the numeric role_id state
      // Include manager_id only if a role other than Manager is selected
      ...(newUserRole !== MANAGER_ROLE_ID && {
        manager_id: newUserManagerId === "" ? null : newUserManagerId, // Send null if no manager selected, otherwise the selected manager ID
      }),
    };

    try {
      // console.log("Attempting to create user with data:", newUserData);
      const createdUser /*: UserResponse*/ = await api(
        // Specify type if needed, but backend likely returns UserResponse shape
        "/api/admin/users",
        "POST",
        newUserData
      );

      console.log("New user created:", createdUser);
      setCreateUserSuccess(
        `User "${createdUser.name}" (ID: ${createdUser.user_id}) created successfully!`
      ); // Clear the form

      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserRole(""); // Reset role selection
      setNewUserManagerId(""); // Reset manager selection

      // After successful creation, refresh the user lists to include the new user
      fetchUsersByRole(MANAGER_ROLE_ID); // Refresh managers list (in case the new user was a manager)
      fetchUsersByRole(); // Refresh the "All Users" list (which is the default view)
    } catch (err: any) {
      console.error("Error creating user:", err); // Check if the error is a Conflict error (409) for duplicate email
      if (err.response && err.response.status === 409) {
        setCreateUserError(
          `Error: User with email "${newUserEmail.trim()}" already exists.`
        );
      } else if (
        err.response &&
        err.response.data &&
        err.response.data.message
      ) {
        // Display backend message if available
        setCreateUserError(`Error: ${err.response.data.message}`);
      } else {
        setCreateUserError(err.message || "Failed to create user.");
      }
    } finally {
      setCreateUserLoading(false);
    }
  };
  // This function fetches users based on the provided roleId (or all if undefined)
  const fetchUsersByRole = async (roleId?: number) => {
    setLoadingLists(true);
    setErrorLists(null);
    let viewName = "All"; // Default view name

    // Ensure authenticated and is Admin *before* attempting to fetch
    if (!isAuthenticated || !isAdmin) {
      setLoadingLists(false);
      // Optionally set an error message for the lists section
      // setErrorLists("Not authorized to fetch user lists.");
      return;
    }

    try {
      let endpoint = "/api/admin/users";
      // Add role_id query parameter if a roleId is provided
      if (roleId !== undefined) {
        endpoint += `?role_id=${roleId}`;
        // Determine the view name based on the roleId
        if (roleId === MANAGER_ROLE_ID) viewName = "Managers";
        else if (roleId === EMPLOYEE_ROLE_ID) viewName = "Employees";
        else if (roleId === INTERN_ROLE_ID) viewName = "Interns";
        // Note: ADMIN_ROLE_ID is typically not fetched here via filter, but if needed, add a case.
      } else {
        viewName = "All"; // No roleId means fetch all
      }
      // console.log(`Attempting to fetch user list from: ${endpoint}`);

      // Fetch users from the backend, expecting UserWithBalancesResponse[]
      const fetchedUsers: UserWithBalancesResponse[] = await api(
        endpoint,
        "GET"
      );
      // console.log(
      //   `Workspaceed ${fetchedUsers.length} users for view: ${viewName}`
      // );

      // Update the correct state based on the fetched list
      if (roleId === MANAGER_ROLE_ID) {
        setManagersList(fetchedUsers);
      } else if (roleId === EMPLOYEE_ROLE_ID) {
        setEmployeesList(fetchedUsers);
      } else if (roleId === INTERN_ROLE_ID) {
        setInternsList(fetchedUsers);
      }

      // Always update the allUsersList if fetching all (used for default view)
      if (roleId === undefined) {
        setAllUsersList(fetchedUsers);
      }

      setCurrentListView(viewName); // Set the currently displayed view state
    } catch (err: any) {
      console.error(`Error fetching ${viewName} list:`, err);
      setErrorLists(err.message || `Failed to fetch ${viewName} list.`);
    } finally {
      setLoadingLists(false);
    }
  };
  // --- End Function ---

  const handleDeleteUser = async (userId: number, userName: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete user "${userName}" (ID: ${userId})? This action cannot be undone.`
      )
    ) {
      return; // User cancelled deletion
    }

    setLoadingLists(true); // Show loading indicator while deleting
    setErrorLists(null); // Clear previous errors

    try {
      console.log(`Attempting to delete user ID: ${userId}`);
      // Call the backend DELETE endpoint
      await api(`/api/admin/users/${userId}`, "DELETE");
      console.log(`User ID ${userId} deleted successfully.`);

      // Remove the deleted user from the lists in state to update UI
      setAllUsersList((prevList) =>
        prevList.filter((user) => user.user_id !== userId)
      );
      setManagersList((prevList) =>
        prevList.filter((user) => user.user_id !== userId)
      );
      setEmployeesList((prevList) =>
        prevList.filter((user) => user.user_id !== userId)
      );
      setInternsList((prevList) =>
        prevList.filter((user) => user.user_id !== userId)
      );

      // Show a success message (optional)
      // setCreateUserSuccess(`User "${userName}" deleted successfully.`); // Reusing create success state temporarily

      // After deletion, re-fetch the lists to ensure consistency (optional but robust)
      // fetchUsersByRole(MANAGER_ROLE_ID); // Refresh managers for dropdown
      // fetchUsersByRole(currentListView === "All" ? undefined : (currentListView === "Managers" ? MANAGER_ROLE_ID : (currentListView === "Employees" ? EMPLOYEE_ROLE_ID : INTERN_ROLE_ID))); // Refresh current view
    } catch (err: any) {
      console.error(`Error deleting user ID ${userId}:`, err);
      // Display error message from backend if available
      if (err.response && err.response.data && err.response.data.message) {
        setErrorLists(`Error deleting user: ${err.response.data.message}`);
      } else {
        setErrorLists(err.message || "Failed to delete user.");
      }
    } finally {
      setLoadingLists(false); // Hide loading indicator
    }
  };

  // This useEffect is now re-enabled and calls fetchUsersByRole
  useEffect(() => {
    // console.log("AdminUsersPage useEffect running...");
    // Only fetch if authLoading is complete AND authenticated AND is Admin
    if (!authLoading) {
      if (isAuthenticated && isAdmin) {
        // console.log(
        //   "Auth loading complete, user is Admin. Fetching initial lists..."
        // );
        // Fetch initial lists when component mounts and auth is confirmed
        fetchUsersByRole(MANAGER_ROLE_ID); // Fetch managers for the dropdown on load
        fetchUsersByRole(); // Fetch all users for the default list display on load
      } else {
        // console.log(
        //   "Auth loading complete, user is not Admin or not authenticated."
        // );
        // If auth loading done but not authorized, stop loading indicator for lists
        setLoadingLists(false);
        // Optionally set an error message to display
        setErrorLists("You do not have permission to view user lists.");
      }
    }
    console.log("AdminUsersPage useEffect finished.");
  }, [token, user, isAdmin, authLoading, isAuthenticated]);

  // Determine which list to display based on currentListView state
  const listToDisplay: UserWithBalancesResponse[] = useMemo(() => {
    // Using useMemo for performance
    if (currentListView === "Managers") return managersList;
    if (currentListView === "Employees") return employeesList;
    if (currentListView === "Interns") return internsList;
    return allUsersList; // Default to allUsersList
  }, [currentListView, managersList, employeesList, internsList, allUsersList]);

  // Render content based on auth loading and admin status
  if (authLoading) {
    // Use the auth loading state from useAuth
    return (
      <div className="admin-page-loading">Loading authentication state...</div>
    );
  }

  // --- Frontend Role Check ---
  // If the user is logged in but not an Admin, show a forbidden message
  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="admin-forbidden-container">
        <h2>Access Denied</h2>
        <p>You do not have permission to view this page.</p>
        <p>
          <Link to="/dashboard">Go to Dashboard</Link>
        </p>
      </div>
    );
  }

  // If we reached here, the user is an Admin and Authenticated
  return (
    <div className="admin-users-container">
      {" "}
      <h2>Admin User Management</h2>
      <div className="create-user-form">
        {" "}
        <h3>Create New User</h3>
        {/* This form now correctly references handleCreateUserSubmit */}
        <form onSubmit={handleCreateUserSubmit}>
          <div>
            <label htmlFor="userName">Name:</label>
            <input
              type="text"
              id="userName"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              required
              disabled={createUserLoading}
            />
          </div>
          <div>
            <label htmlFor="userEmail">Email:</label>
            <input
              type="email" // Use email type for basic browser validation
              id="userEmail"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              required
              disabled={createUserLoading}
            />
          </div>
          <div>
            <label htmlFor="userPassword">Password:</label>
            <input
              type="password" // Use password type
              id="userPassword"
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              required
              disabled={createUserLoading}
            />
          </div>
          <div>
            <label htmlFor="userRole">Role:</label>
            <select
              id="userRole"
              // Convert role ID to string for select value
              value={newUserRole === "" ? "" : String(newUserRole)}
              onChange={(e) => setNewUserRole(parseInt(e.target.value, 10))} // Parse value back to number
              required
              disabled={createUserLoading}
            >
              <option value="">--Select Role--</option>
              {/* Admin role is typically not created via this form */}
              <option value={MANAGER_ROLE_ID}>Manager</option>
              <option value={EMPLOYEE_ROLE_ID}>Employee</option>
              <option value={INTERN_ROLE_ID}>Intern</option> {/* Value is 4 */}
            </select>
          </div>

          {/* --- Conditional Render for Manager Select --- */}
          {/* Only show this field if a role is selected AND it's NOT the Manager role */}
          {newUserRole !== "" && newUserRole !== MANAGER_ROLE_ID && (
            <div>
              <label htmlFor="userManager">Manager:</label>
              {/* The manager dropdown is populated by the managersList state */}
              <select
                id="userManager"
                // Convert manager ID to string for select value
                value={newUserManagerId === "" ? "" : String(newUserManagerId)}
                onChange={(e) =>
                  setNewUserManagerId(
                    e.target.value === "" ? "" : parseInt(e.target.value, 10)
                  )
                } // Parse value back to number or set to ""
                disabled={createUserLoading || loadingLists} // Disable while creating or loading managers
              >
                <option value="">--Select Manager (Optional)--</option>
                {/* Populate with fetched managers (only those fetched on page load) */}
                {/* Ensure managersList state is populated for this dropdown */}
                {managersList.map((manager) => (
                  <option key={manager.user_id} value={manager.user_id}>
                    {manager.name} (ID: {manager.user_id})
                  </option>
                ))}
              </select>
            </div>
          )}
          {/* --- End Conditional Render --- */}

          <button type="submit" disabled={createUserLoading}>
            {createUserLoading ? "Creating..." : "Create User"}
          </button>
        </form>
        {createUserError && (
          <p className="error-message" style={{ color: "red" }}>
            {createUserError}
          </p>
        )}
        {createUserSuccess && (
          <p style={{ color: "green" }}>{createUserSuccess}</p>
        )}
      </div>
      <hr /> {/* Separator */}
      <div className="admin-user-lists">
        {" "}
        <h3>User Lists</h3>
        {/* Buttons to trigger fetching/displaying lists by role */}
        <div className="user-list-buttons">
          {" "}
          {/* Buttons call fetchUsersByRole with appropriate role ID or none for all */}
          <button onClick={() => fetchUsersByRole()} disabled={loadingLists}>
            {loadingLists && currentListView === "All"
              ? "Loading..."
              : "View All Users"}
          </button>
          <button
            onClick={() => fetchUsersByRole(MANAGER_ROLE_ID)}
            disabled={loadingLists}
          >
            {loadingLists && currentListView === "Managers"
              ? "Loading..."
              : "View Managers"}
          </button>
          <button
            onClick={() => fetchUsersByRole(EMPLOYEE_ROLE_ID)}
            disabled={loadingLists}
          >
            {loadingLists && currentListView === "Employees"
              ? "Loading..."
              : "View Employees"}
          </button>
          <button
            onClick={() => fetchUsersByRole(INTERN_ROLE_ID)}
            disabled={loadingLists}
          >
            {loadingLists && currentListView === "Interns"
              ? "Loading..."
              : "View Interns"}
          </button>
        </div>
        {/* Loading and Error Messages for lists */}
        {loadingLists && (
          <p>Loading {currentListView.toLowerCase()} list...</p>
        )}{" "}
        {/* Show loading for the specific list */}
        {errorLists && (
          <p className="error-message" style={{ color: "red" }}>
            {errorLists}
          </p>
        )}
        {/* --- Display Fetched User List --- */}
        {/* Only show the list if not loading, no error, and the list is populated */}
        {!loadingLists && !errorLists && listToDisplay.length > 0 && (
          <div className="user-list-display">
            {" "}
            {/* Display the title for the currently viewed list */}
            <h4>
              {currentListView || "All"} List ({listToDisplay.length} users)
            </h4>
            <ul className="user-list">
              {" "}
              {/* Map through the listToDisplay (which is determined by currentListView) */}
              {listToDisplay.map((user) => (
                <li key={user.user_id} className="user-item">
                  {" "}
                  <div className="user-main-info">
                    {" "}
                    <strong>{user.name}</strong> ({user.role.name}) - ID:{" "}
                    {user.user_id}
                    {/* Display manager if exists */}
                    {user.manager_id && ` | Manager ID: ${user.manager_id}`}
                  </div>
                  {/* Display Leave Balances for the user */}
                  <div className="user-leave-balances">
                    {" "}
                    {/* year is same for all balances for a user, display year from the first balance */}
                    <h5>
                      Leave Balances{" "}
                      {user.leaveBalances.length > 0
                        ? `(${user.leaveBalances[0].year}):`
                        : "(Current Year):"}
                    </h5>
                    {user.leaveBalances.length > 0 ? (
                      <ul className="balance-list">
                        {" "}
                        {/* Map through each leave balance for this user */}
                        {user.leaveBalances.map((balance) => (
                          <li key={`${user.user_id}-${balance.leaveTypeName}`}>
                            {" "}
                            {/* Use a unique key */}
                            {balance.leaveTypeName}:{" "}
                            {balance.usedDays.toFixed(2)} /{" "}
                            {balance.totalDays.toFixed(2)} days (Available:{" "}
                            {balance.availableDays.toFixed(2)})
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>Admin Don't have Leave policy.</p>
                    )}
                  </div>
                  {/* TODO: Add buttons for Edit/Delete user if needed */}
                </li>
              ))}
            </ul>
          </div>
        )}
        {/* Message if list is empty after loading */}
        {!loadingLists &&
          !errorLists &&
          listToDisplay.length === 0 &&
          currentListView !== null && (
            <p>No {currentListView.toLowerCase()} found in the system.</p>
          )}
      </div>
      <hr /> {/* Separator */}
      <p>
        <Link to="/dashboard">Back to Dashboard</Link>
      </p>
    </div>
  );
}

export default AdminUsersPage;

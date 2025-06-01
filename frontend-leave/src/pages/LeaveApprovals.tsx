import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../api/api';
import { Link } from 'react-router-dom';
import './LeaveApprovals.css';

interface Leave {
    leave_id: number;
    user_id: number;
    type_id: number;
    start_date: string;
    end_date: string; 
    reason: string;
    // Include all possible statuses from your backend LeaveStatus enum
    status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | 'Awaiting_Admin_Approval';
    required_approvals: number;
    applied_at: string; // Assuming ISO string format from backend
    processed_by_id?: number | null; // Add if your backend includes this
    processed_at?: string | null; // Add if your backend includes this (assuming ISO string from backend)
    leaveType: {
        type_id: number;
        name: string;
    };
    user: {
        user_id: number;
        name: string;
        email: string;
        role_id: number; // Include role_id if needed for display logic
    };
}

interface ErrorResponse {
    message: string;
}

// This interface should match the successful response from your backend update handlers
interface UpdateLeaveStatusSuccessResponse {
    message: string;
    leaveId: number;
    // This should return the FINAL status set by the backend logic
    newStatus: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | 'Awaiting_Admin_Approval';
}


// Define the expected type for the user object from the auth context
interface AuthUser {
    user_id: number;
    name: string;
    email: string;
    role_id: number;
}

// Define the expected type for the object returned by useAuth
interface AuthContextType {
    user: AuthUser | null;
    token: string | null;
    logout: () => void;
}

const MANAGER_ROLE_ID = 3;
const ADMIN_ROLE_ID = 1;


function LeaveApprovals() {
    // Use the defined AuthContextType for better type safety
    const { user, token } = useAuth() as AuthContextType;

    // State for pending leave requests list
    const [pendingLeaves, setPendingLeaves] = useState<Leave[]>([]);
    // State for overall page loading/error
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // State for handling approval/rejection actions specifically
    const [isSubmitting, setIsSubmitting] = useState(false); // To disable buttons during submission
    const [actionError, setActionError] = useState<string | null>(null); // To display errors for specific actions
    const [actionSuccess, setActionSuccess] = useState<string | null>(null); // To display success messages for actions


    // Check if the logged-in user has the required role to view this page
    const isManagerOrAdmin = user && (user.role_id === MANAGER_ROLE_ID || user.role_id === ADMIN_ROLE_ID);


    // Effect to fetch pending leave requests when the component mounts or user/token changes
    useEffect(() => {
        const fetchPendingLeaves = async () => {
            setLoading(true);
            setError(null);
            try {
                let endpoint = '';
                // Determine which backend endpoint to call based on the user's role
                if (user?.role_id === MANAGER_ROLE_ID) {
                    // Managers fetch pending requests from their direct reports (status: Pending)
                    // Assuming this endpoint handles filtering based on the logged-in manager
                    endpoint = '/api/manager/pending-requests'; // Make sure this endpoint exists and works
                    console.log('Fetching pending requests for Manager from:', endpoint);
                } else if (user?.role_id === ADMIN_ROLE_ID) {
                    // Admins fetch leaves needing Admin attention (status: Pending (Manager self) or Awaiting_Admin_Approval)
                    endpoint = '/api/admin/leave-requests/approvals-needed';
                    console.log('Fetching pending requests for Admin from:', endpoint);
                } else {
                    // If not Manager or Admin, they shouldn't even be on this page due to frontend check,
                    // but handle defensively within the effect.
                    setLoading(false);
                    setError('Invalid role to view pending requests.');
                    return;
                }

                // Check if a valid endpoint was determined before making the API call
                if (endpoint) {
                    // Use the api helper to call the determined backend endpoint
                    const pendingData: Leave[] = await api(endpoint, 'GET'); // Call the selected endpoint
                    setPendingLeaves(pendingData);
                    console.log('Fetched pending leave requests:', pendingData);
                }


            } catch (err: any) {
                console.error('Error fetching pending leave requests:', err);
                // Display a more user-friendly error message from the backend response if available
                const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch pending leave requests.';
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        // Trigger the fetch when token, user, or isManagerOrAdmin status changes
        if (user && token && isManagerOrAdmin) {
            fetchPendingLeaves();
        } else {
             // Handle cases where user is not authenticated or not authorized to view this page
            setLoading(false);
            if (!token) {
                setError('Not authenticated to view this page.');
            } else if (user && !isManagerOrAdmin) { // Check user exists before assuming role
                setError('Forbidden: You do not have permission to view this page.');
            }
        }

        // Include dependencies that should re-run the effect
    }, [token, user, isManagerOrAdmin, MANAGER_ROLE_ID, ADMIN_ROLE_ID]);

    const handleProcessLeave = async (leaveId: number, status: 'Approved' | 'Rejected') => {
        // Ensure user is logged in and has a role before proceeding (should be covered by checks elsewhere, but defensive)
        if (!user || !user.role_id) {
            setActionError("User information missing. Cannot process leave.");
            return;
        }

        setIsSubmitting(true); // Disable buttons during submission
        setActionError(null); // Clear previous errors
        setActionSuccess(null); // Clear previous success messages

        try {
            let endpoint = '';
            // Determine which backend endpoint to call based on the logged-in user's role
            if (user.role_id === MANAGER_ROLE_ID) {
                // Managers use the /api/leaves/status/:id endpoint for their direct reports
                endpoint = `/api/leaves/status/${leaveId}`;
                console.log(`Processing leave ${leaveId} as Manager. Calling endpoint: ${endpoint}`);
            } else if (user.role_id === ADMIN_ROLE_ID) {
                // Admins use the /api/admin/leave-requests/:id/status endpoint for leaves needing Admin attention
                endpoint = `/api/admin/leave-requests/${leaveId}/status`;
                console.log(`Processing leave ${leaveId} as Admin. Calling endpoint: ${endpoint}`);
            } else {
                // Should not happen based on frontend role check, but defensive
                setActionError("Invalid role to process leave requests.");
                setIsSubmitting(false); // Re-enable buttons immediately on known error
                return;
            }

            // Check if a valid endpoint was determined before making the API call
             if (!endpoint) {
                setActionError("Could not determine processing endpoint for your role.");
                setIsSubmitting(false); // Re-enable buttons immediately on known error
                return;
            }


            // Call the determined backend endpoint with the status
            // Note: Ensure backend handlers return UpdateLeaveStatusSuccessResponse or an error structure
            const response: UpdateLeaveStatusSuccessResponse = await api(
                endpoint, // Use the dynamically determined endpoint
                'PUT',
                { status } // Send the new status in the body
            );

            console.log(`Leave request ${leaveId} processed with status ${status}:`, response);
            setActionSuccess(`Leave request ${leaveId} ${status.toLowerCase()} successfully.`);
            setPendingLeaves(prevLeaves => prevLeaves.filter(leave => leave.leave_id !== leaveId));


        } catch (err: any) {
            console.error(`Error processing leave request ${leaveId}:`, err);
            // Display a more user-friendly error message from the backend response if available
            const errorMessage = err.response?.data?.message || err.message || `Failed to process leave request ${leaveId} with status ${status}.`;
            setActionError(errorMessage);
        } finally {
            setIsSubmitting(false); // Re-enable buttons
        }
    };


    // Handler for approving a leave request - calls the combined handler
    const handleApprove = async (leaveId: number) => {
        await handleProcessLeave(leaveId, 'Approved');
    };

    // Handler for rejecting a leave request - calls the combined handler
    const handleReject = async (leaveId: number) => {
        await handleProcessLeave(leaveId, 'Rejected');
    };


    // Render content based on authentication and role
    if (!user) {
         // Consider a proper redirect to login page
         return <div>Redirecting to login...</div>;
    }

    // Frontend role-based access control - check before rendering the main content
    if (!isManagerOrAdmin) {
         return (
             <div className="leave-approvals-container">
                 <h2>Access Denied</h2>
                 <p>You do not have the necessary permissions to view this page.</p>
                 <p><Link to="/dashboard">Back to Dashboard</Link></p>
             </div>
         );
    }


    // Render the main approval content for Managers and Admins
    return (
        <div className="leave-approvals-container">
            {/* Dynamically change heading based on role if needed, e.g., "Manager Approvals" vs "Admin Approvals" */}
            <h2>{user.role_id === ADMIN_ROLE_ID ? 'Admin Leave Approvals' : 'Manager Leave Approvals'}</h2>

            {/* Display loading or error messages */}
            {loading && <p className="loading-message">Loading pending leave requests...</p>}
            {/* Use inline style for error for quick visibility */}
            {error && <p style={{ color: 'red' }}>Error: {error}</p>}

            {/* Display action status messages */}
            {actionError && <p className="action-error">Action Error: {actionError}</p>}
            {actionSuccess && <p className="action-success">Action Success: {actionSuccess}</p>}


            {/* Display the table of pending leaves */}
            {/* Only render the table if not loading, no main error, and there are leaves */}
            {!loading && !error && pendingLeaves.length > 0 && (
                <table className="pending-requests-table">
                    <thead>
                        <tr>
                            {/* Conditionally display columns based on role if needed, e.g., 'Applicant' column only for Managers/Admins */}
                            <th>Applicant</th>
                            <th>Leave Type</th>
                            <th>Start Date</th>
                            <th>End Date</th>
                            <th>Reason</th>
                            {/* Display current status explicitly for better clarity */}
                            <th>Status</th>
                            <th>Applied At</th>
                            <th>Actions</th> {/* Column for Approve/Reject buttons */}
                        </tr>
                    </thead>
                    <tbody>
                        {pendingLeaves.map(leave => (
                            <tr key={leave.leave_id}>
                                {/* Display applicant name and email */}
                                <td>{leave.user?.name || 'N/A'} ({leave.user?.email || 'N/A'})</td>
                                {/* Display leave type name */}
                                <td>{leave.leaveType?.name || 'Unknown Type'}</td>
                                {/* Display dates in a readable format */}
                                <td>{new Date(leave.start_date).toLocaleDateString()}</td>
                                <td>{new Date(leave.end_date).toLocaleDateString()}</td>
                                <td>{leave.reason}</td>
                                {/* Display current status - useful in Admin view for 'Awaiting_Admin_Approval' */}
                                <td>{leave.status.replace(/_/g, ' ')}</td> {/* Make status readable */}
                                <td>{new Date(leave.applied_at).toLocaleString()}</td>

                                {/* Actions Column */}
                                <td>
                                    {/* Buttons are always displayed for items in this list, but backend handles permission */}
                                    {/* You could add frontend logic here to hide/show buttons based on leave.status and user.role_id */}
                                    {/* Example: Don't show buttons if leave.status is already Approved/Rejected/Cancelled */}
                                    {leave.status !== 'Approved' && leave.status !== 'Rejected' && leave.status !== 'Cancelled' && (
                                        <> {/* Use fragment to group buttons */}
                                            <button
                                                onClick={() => handleApprove(leave.leave_id)}
                                                disabled={isSubmitting} // Disable while any action is submitting
                                                className="approve-button"
                                            >
                                                Approve
                                            </button>
                                            {/* Add some spacing between buttons if needed via CSS or inline style */}
                                            <button
                                                onClick={() => handleReject(leave.leave_id)}
                                                disabled={isSubmitting} // Disable while any action is submitting
                                                className="reject-button"
                                            >
                                                Reject
                                            </button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {/* Display message if no pending leaves */}
            {!loading && !error && pendingLeaves.length === 0 && (
                <p className="no-data-message">No pending leave requests found.</p>
            )}

            {/* Link back to dashboard */}
             <p className="back-link-container"><Link to="/dashboard">Back to Dashboard</Link></p>
        </div>
    );
}

export default LeaveApprovals;
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// ProtectedRoute component takes the element (the component to render) as a prop
const ProtectedRoute = ({ element }) => {
  // Use the useAuth hook to get the authentication state
  const { isAuthenticated, loading } = useAuth();

  // If the AuthProvider is still loading initial state from localStorage, show nothing or a loader
  if (loading) {
    // You could return a loading spinner here
    return <div>Loading...</div>; // Or null, or a spinner component
  }

  // Check if the user is authenticated
  if (isAuthenticated) {
    // If authenticated, render the requested element (the page component)
    return element;
  } else {
    // If not authenticated, redirect the user to the login page
    // The 'replace' prop prevents adding the login page to the history stack
    return <Navigate to="/login" replace />;
  }
};

export default ProtectedRoute;

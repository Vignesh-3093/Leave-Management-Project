import { useContext } from "react";
import AuthContext from "../context/Authcontext";

// Define the custom useAuth hook
export const useAuth = () => {
  const context = useContext(AuthContext); // If the context is undefined, it means the useAuth hook was called // outside of an AuthProvider. This is an error in usage.

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  } // Return the context value (user, token, isAuthenticated, loading, login, logout)

  // console.log("useAuth hook called. Context value:", context); // Log the context value
  return context;
};

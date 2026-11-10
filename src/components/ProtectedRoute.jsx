
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../services/supabase";

function ProtectedRoute({ children }) {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const checkAdmin = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          if (active) setAuthorized(false);
          return;
        }

        const { data, error } = await supabase.rpc("is_admin");

        if (error) throw error;

        if (active) setAuthorized(data === true);
      } catch (error) {
        console.error("Admin verification failed:", error);
        if (active) setAuthorized(false);
      } finally {
        if (active) setLoading(false);
      }
    };

    checkAdmin();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Checking authorization...
      </div>
    );
  }

  return authorized ? children : <Navigate to="/admin/login" replace />;
}

export default ProtectedRoute;

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { api } from "../services/api";

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try { return localStorage.getItem("ts_auth") === "true"; } catch { return false; }
  });
  const [accountName, setAccountName] = useState(() => { try { return localStorage.getItem("ts_name") || "User"; } catch { return "User"; } });
  const [accountEmail, setAccountEmail] = useState(() => { try { return localStorage.getItem("ts_email") || ""; } catch { return ""; } });
  const [authMode, setAuthMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [status, setStatus] = useState({ loading: false, type: "", message: "" });
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStatus, setForgotStatus] = useState({ loading: false, type: "", message: "" });

  const handleAuthChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, type: "", message: "" });
    try {
      let data;
      if (authMode === "login") {
        data = await api.login({ email: form.email, password: form.password });
      } else {
        data = await api.signup(form);
      }

      if (data.ok) {
        setIsAuthenticated(true);
        setAccountName(data.user.name);
        setAccountEmail(data.user.email);
        localStorage.setItem("ts_auth", "true");
        localStorage.setItem("ts_name", data.user.name);
        localStorage.setItem("ts_email", data.user.email);
        toast.success(authMode === "login" ? `Welcome back, ${data.user.name}!` : "Account created! Welcome to Threadspace.");
        setStatus({ loading: false, type: "success", message: "Success! Redirecting..." });
      }
    } catch (err) {
      toast.error(err.message);
      setStatus({ loading: false, type: "error", message: err.message });
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotStatus({ loading: true, type: "", message: "" });
    try {
      const data = await api.forgotPassword(forgotEmail);
      if (data.ok) {
        setForgotStatus({ loading: false, type: "success", message: "Reset link sent to your email." });
      }
    } catch (err) {
      setForgotStatus({ loading: false, type: "error", message: err.message });
    }
  };

  const signOut = () => {
    setIsAuthenticated(false);
    setAccountName("");
    setAccountEmail("");
    localStorage.removeItem("ts_auth");
    localStorage.removeItem("ts_name");
    localStorage.removeItem("ts_email");
  };

  return {
    isAuthenticated,
    accountName,
    accountEmail,
    authMode,
    setAuthMode,
    form,
    status,
    handleAuthChange,
    handleAuthSubmit,
    showForgotPassword,
    setShowForgotPassword,
    forgotEmail,
    setForgotEmail,
    handleForgotPassword,
    forgotStatus,
    setForgotStatus,
    signOut,
    setAccountName
  };
}

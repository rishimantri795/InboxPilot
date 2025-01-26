import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { FcGoogle } from "react-icons/fc";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const LoginPage = () => {
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      const response = await axios.get(
        "http://localhost:3011/api/auth/google",
        {
          withCredentials: true,
        }
      );
      if (response.status === 200) {
        navigate("/home");
      }
    } catch (error) {
      console.error("Error logging in with Google:", error);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 to-indigo-600">
      <motion.div
        className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
          Welcome Back
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Log in to your account with Google
        </p>
        <Button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center space-x-2 p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md"
        >
          <FcGoogle size={24} />
          <span>Login with Google</span>
        </Button>
      </motion.div>
    </div>
  );
};

export default LoginPage;

import React from "react";
import axios from "axios";

const login = () => {
  const signInWithGoogle = async () => {
    try {
      let response = await axios.get("http://localhost:3010/api/users/auth");
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <div>
      <button onClick={() => signInWithGoogle()}>sign up with google</button>
    </div>
  );
};

export default login;

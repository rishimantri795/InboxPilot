// app/main/pages.tsx
"use client"; // Mark this file as a Client Component

import React, { useState, useEffect } from 'react';
import './page.css'; // Import a CSS file for styling
import Avatar from './avatar';
import Table from './table';
import AddPopup from './popup';

import axios from "axios"; // Import axios
axios.defaults.withCredentials = true;

const Pages: React.FC = () => {
  const [data, setData] = useState<{ rule: string; grouping: string; description: string }[]>([]);
  const [isPopupOpen, setPopupOpen] = useState(false);
  const [user, setUser] = useState<{ id: string; email: string; rules: Record<string, Record<string, string>>; refreshToken?: string; createdAt?: string } | null>(null);
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        interface User {
          id: string;
          Email: string;
          Rules: Record<string, Record<string, string>>;
          refreshToken: string;
          createdAt: string;
        }
        interface ResponseData {
          user?: User;
        }

        const response: { data: ResponseData } = await axios.get("http://localhost:3010/api/users/current-user");

        if (response.data.user) {
          const mappedUser = {
            id: response.data.user.id,
            email: response.data.user.Email,
            rules: response.data.user.Rules,
            refreshToken: response.data.user.refreshToken,
            createdAt: response.data.user.createdAt,
          };
          setUser(mappedUser || null);
          const formattedData = Object.values(mappedUser.rules).map((rule) => ({
            rule: rule.action,
            grouping: rule.prompt,
            description: rule.type,
          }));
          setData(formattedData);
          console.log("Authenticated user:", mappedUser);
        } else {
          setUser(null);
          console.log("No authenticated user.");
        }
      } catch (error) {
        console.error("Error fetching current user:", error);
        setUser(null);
      }
    };
  
    fetchCurrentUser();
  }, []);

  const handleAddButtonClick = () => {
    if (user) {
      setPopupOpen(true);
    } else {
      alert("Must be signed in");
    }
  };

  const handleClosePopup = () => {
    setPopupOpen(false);
  };

  const handleAddEntry = async (newEntry: { rule: string; grouping: string; description: string }) => {
    if (!newEntry.rule.trim() || !newEntry.grouping.trim() || !newEntry.description.trim() || !user) {
      return;
    }
    console.log(newEntry);
    if (user) {
      setData([...data, newEntry]);
      const entry = {action: newEntry.rule, prompt: newEntry.grouping, type: newEntry.description}
      const response = await axios.post(`http://localhost:3010/api/users/${user.id}`, entry, { withCredentials: true });
      console.log(response);
    }
  };

  return (
    <div>
      <Avatar email={user ? user.email : ""} />
      <button onClick={handleAddButtonClick} className="add-button">Add</button>
      <Table data={data} />
      <AddPopup
        isOpen={isPopupOpen}
        onClose={handleClosePopup}
        onAdd={handleAddEntry}
      />
    </div>
  );
};

export default Pages;

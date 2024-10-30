"use client";

import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import './page.css'; // Import a CSS file for styling
import Avatar from './avatar';
import Table from './table';
import AddPopup from './popup';
import useCurrentUser from '@/hooks/useCurrentUser';

import axios from "axios"; // Import axios
axios.defaults.withCredentials = true;

const Pages: React.FC = () => {
  const router = useRouter();
  const [data, setData] = useState<{ rule: string; grouping: string; description: string }[]>([]);
  const [isPopupOpen, setPopupOpen] = useState(false);
  const { user, loading, error } = useCurrentUser();
  
  useEffect(()  => {
    if (user) {
      const formattedData = Object.values(user.rules).map((rule) => ({
        rule: rule.action,
        grouping: rule.prompt,
        description: rule.type,
      }));
      setData(formattedData);
    }
  }, [user])

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

  if (loading) {
    return <div>Loading...</div>;
  } else if (!user) {
    router.push("/");
  } else if (error) {
    return <div>Error: {error}</div>;
  } else {
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
}
};

export default Pages;

// app/main/pages.tsx
"use client"; // Mark this file as a Client Component

import React, { useState } from 'react';
import './page.css'; // Import a CSS file for styling

const Avatar: React.FC = () => {
  return (
    <div className="avatar-wrapper">
      <div className="avatar-container">
        <h1 className='avatar'>I</h1>
      </div>
      <div className="avatar-info">
        <p id='header'>InboxPilot</p>
        <p>inboxpilots@gmail.com</p>
      </div>
    </div>
  );
};

const Table: React.FC<{ data: Array<{ rule: string, grouping: string, description: string }> }> = ({ data }) => {
  return (
    <div className='table'>
      <table className="data-table">
      <tbody>
        <tr id='table-header'>
          <td>Rule</td> 
          <td>Grouping</td>
          <td>Description</td>
        </tr>
          {data.map((item, index) => (
            <tr key={index}>
              <td>{item.rule}</td>
              <td>{item.grouping}</td>
              <td>{item.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const AddPopup: React.FC<{ isOpen: boolean; onClose: () => void; onAdd: (newEntry: { rule: string; grouping: string; description: string }) => void }> = ({ isOpen, onClose, onAdd }) => {
  const [rule, setRule] = useState('');
  const [grouping, setGrouping] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    onAdd({ rule, grouping, description });
    setRule('');
    setGrouping('');
    setDescription('');
    onClose();
  };

  return (
    <div className="popup">
      <div className="popup-content">
        <h2>Add New Entry</h2>
        <div>
          <label>Rule:</label>
          <input
            type="text"
            value={rule}
            onChange={(e) => setRule(e.target.value)}
          />
        </div>
        <div>
          <label>Grouping:</label>
          <input
            type="text"
            value={grouping}
            onChange={(e) => setGrouping(e.target.value)}
          />
        </div>
        <div>
          <label>Description:</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <button onClick={handleSubmit}>Add</button>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

const Pages: React.FC = () => {
  const [data, setData] = useState<{ rule: string; grouping: string; description: string }[]>([]);
  const [isPopupOpen, setPopupOpen] = useState(false);

  const handleAddButtonClick = () => {
    setPopupOpen(true);
  };

  const handleClosePopup = () => {
    setPopupOpen(false);
  };

  const handleAddEntry = (newEntry: { rule: string; grouping: string; description: string }) => {
    setData([...data, newEntry]);
  };

  return (
    <div>
      <Avatar />
      <button onClick={handleAddButtonClick} className="add-button">Add</button>
      <Table data={data} />
      <AddPopup
        isOpen={isPopupOpen}
        onClose={handleClosePopup}
        onAdd={handleAddEntry}
      />
      {/* <h1>Welcome to My Next.js App</h1> */}
      {/* Other page content */}
    </div>
  );
};

export default Pages;

// app/main/pages.tsx
"use client"; // Mark this file as a Client Component

import React, { useState, useEffect } from 'react';
import './page.css'; // Import a CSS file for styling

import axios from "axios"; // Import axios
axios.defaults.withCredentials = true;

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
          <td>Actions</td>
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

// const AddPopup: React.FC<{ isOpen: boolean; onClose: () => void; onAdd: (newEntry: { rule: string; grouping: string; description: string }) => void }> = ({ isOpen, onClose, onAdd }) => {
//   const [rule, setRule] = useState('');
//   const [grouping, setGrouping] = useState('');
//   const [description, setDescription] = useState('');

//   if (!isOpen) return null;

//   const handleSubmit = () => {
//     onAdd({ rule, grouping, description });
//     setRule('');
//     setGrouping('');
//     setDescription('');
//     onClose();
//   };

//   return (
//     <div className="popup">
//       <div className="popup-content">
//         <h2>Add New Entry</h2>
//         <div>
//           <label>Rule:</label>
//           <input
//             type="text"
//             value={rule}
//             onChange={(e) => setRule(e.target.value)}
//           />
//         </div>
//         <div>
//           <label>Grouping:</label>
//           <input
//             type="text"
//             value={grouping}
//             onChange={(e) => setGrouping(e.target.value)}
//           />
//         </div>
//         <div>
//           <label>Description:</label>
//           <input
//             type="text"
//             value={description}
//             onChange={(e) => setDescription(e.target.value)}
//           />
//         </div>
//         <button onClick={handleSubmit}>Add</button>
//         <button onClick={onClose}>Close</button>
//       </div>
//     </div>
//   );
// };

const AddPopup: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAdd: (newEntry: { rule: string; grouping: string; description: string }) => void;
}> = ({ isOpen, onClose, onAdd }) => {
  const [rule, setRule] = useState('');
  const [grouping, setGrouping] = useState('');
  const [description, setDescription] = useState('');
  const [extraInput, setExtraInput] = useState(''); // State for the label name or forwarding email

  if (!isOpen) return null;

  const handleSubmit = () => {
    // Include the extra input in the description if grouping is "Labeling" or "Forwarding"
    const fullDescription = (grouping === 'Labeling' || grouping === 'Forwarding') 
      ? `${description} - ${extraInput}` 
      : description;

      
    onAdd({ rule, grouping, description: fullDescription });
    setRule('');
    setGrouping('');
    setDescription('');
    setExtraInput(''); // Reset the extra input
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
          {/* <label>Grouping:</label> */}
          <select
            value={grouping}
            onChange={(e) => setGrouping(e.target.value)}
          >
            <option value="">Select Grouping</option>
            <option value="Labeling">Labeling</option>
            <option value="Forwarding">Forwarding</option>
            <option value="Auto Drafting">Auto Drafting</option>
          </select>
        </div>
        {(grouping === 'Labeling' || grouping === 'Forwarding') && (
          <div>
            <label>{grouping === 'Labeling' ? 'Label Name:' : 'Forwarding Email:'}</label>
            <input
              type="text"
              value={extraInput}
              onChange={(e) => setExtraInput(e.target.value)}
            />
          </div>
        )}
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
  const [user, setUser] = useState<{ id: string; email: string; refreshToken?: string; createdAt?: any } | null>(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await axios.get("http://localhost:3010/api/users/current-user");
  
        if (response.data.user) {
          const mappedUser = {
            id: response.data.user.id,
            email: response.data.user.Email, // Map 'Email' to 'email'
            refreshToken: response.data.user.refreshToken,
            createdAt: response.data.user.createdAt,
          };
          setUser(mappedUser || null);
          console.log("Authenticated user:", response.data.user);
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
    setPopupOpen(true);
  };

  const handleClosePopup = () => {
    setPopupOpen(false);
  };

  const handleAddEntry = async (newEntry: { rule: string; grouping: string; description: string }) => {
    setData([...data, newEntry]);
    console.log(user);
    if (user) {
      const entry = {action: newEntry.rule, prompt: newEntry.grouping, type: newEntry.description}
      const response = await axios.post(`http://localhost:3010/api/users/${user.id}`, entry, { withCredentials: true });
      console.log(response);
    }
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

import React, { useState } from 'react';

const AddPopup: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAdd: (newEntry: { rule: string; grouping: string; description: string }) => void;
}> = ({ isOpen, onClose, onAdd }) => {
  const [rule, setRule] = useState('');
  const [grouping, setGrouping] = useState('');
  const [description, setDescription] = useState('');
  const [extraInput, setExtraInput] = useState(''); // State for the label name or forwarding email
  const [error, setError] = useState('');
  
  if (!isOpen) return null;
  
  const handleSubmit = () => {
    if (!rule.trim() || !grouping.trim() || !description.trim() || 
      ((grouping === 'Labeling' || grouping === 'Forwarding') && !extraInput.trim())) {
      setError("All fields must be filled out.");
      return;
    }
    // Include the extra input in the description if grouping is "Labeling" or "Forwarding"
    const fullDescription = (grouping === 'Labeling' || grouping === 'Forwarding') 
      ? `${description} - ${extraInput}` 
      : description;
  
        
    onAdd({ rule, grouping, description: fullDescription });
    setRule('');
    setGrouping('');
    setDescription('');
    setExtraInput(''); // Reset the extra input
    setError('');
    onClose();
  };

  const handleClosePopup = () => {
    setRule('');
    setGrouping('');
    setDescription('');
    setExtraInput('');
    setError(''); // Clear the error
    onClose(); // Call the provided onClose function
  };  

  return (
    <div className="popup">
      <div className="popup-content">
        <h2>Add New Entry</h2>
        {error && <p style={{ color: 'red' }}>{error}</p>}
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
        <button onClick={handleClosePopup}>Close</button>
      </div>
    </div>
  );
};

  export default AddPopup;

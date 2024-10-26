import React from 'react';

interface AvatarProps {
  email: string;
}

const Avatar: React.FC<AvatarProps> = ({ email }) => {
  return (
    <div className="avatar-wrapper">
      <div className="avatar-container">
        <h1 className="avatar">{email ? email.charAt(0).toUpperCase() : "-"}</h1>
      </div>
      <div className="avatar-info">
        <p id="header">InboxPilot PLACEHOLDER</p>
        <p>{email ? email : "-"}</p>
      </div>
    </div>
  );
};

export default Avatar;
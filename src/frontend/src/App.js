import React, { useState } from 'react';
import './App.css';

function App() {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      if (response.ok) {
        setStatus('Message sent successfully!');
        setMessage('');
      } else {
        setStatus('Failed to send message');
      }
    } catch (error) {
      setStatus('Error: ' + error.message);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Message Sender</h1>
        <form onSubmit={handleSubmit} className="message-form">
          <div className="form-group">
            <label htmlFor="message">Message:</label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your message here..."
              required
              rows="4"
              cols="50"
            />
          </div>
          <button type="submit" disabled={!message.trim()}>
            Send Message
          </button>
        </form>
        {status && <p className="status">{status}</p>}
      </header>
    </div>
  );
}

export default App;

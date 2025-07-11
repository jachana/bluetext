import React, { useState } from 'react';
import './App.css';

function App() {
  const [formData, setFormData] = useState({
    name: '',
    age: ''
  });

  const [submittedData, setSubmittedData] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Convert age to number and validate
    const ageNumber = parseInt(formData.age, 10);
    
    if (!formData.name.trim()) {
      alert('Please enter a name');
      return;
    }
    
    if (isNaN(ageNumber) || ageNumber < 0) {
      alert('Please enter a valid age');
      return;
    }

    const dataToSubmit = {
      name: formData.name.trim(),
      age: ageNumber
    };

    try {
      // Post data to the user API - use current hostname and environment variable for port
      const apiPort = process.env.REACT_APP_API_PORT || '5000';
      const apiUrl = `${window.location.protocol}//${window.location.hostname}:${apiPort}/user`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSubmit)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('API Response:', result);
      
      // Update the submitted data with the API response
      setSubmittedData({
        ...dataToSubmit,
        message: result.message,
        created_at: result.user.created_at
      });
      
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Failed to submit form. Please try again.');
    }
  };

  const handleReset = () => {
    setFormData({ name: '', age: '' });
    setSubmittedData(null);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>User Information Form</h1>
        
        <form onSubmit={handleSubmit} className="user-form">
          <div className="form-group">
            <label htmlFor="name">Name:</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter your name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="age">Age:</label>
            <input
              type="number"
              id="age"
              name="age"
              value={formData.age}
              onChange={handleInputChange}
              placeholder="Enter your age"
              min="0"
              required
            />
          </div>

          <div className="form-buttons">
            <button type="submit">Submit</button>
            <button type="button" onClick={handleReset}>Reset</button>
          </div>
        </form>

        {submittedData && (
          <div className="submitted-data">
            <h2>User Created Successfully!</h2>
            {submittedData.message && <p className="success-message">{submittedData.message}</p>}
            <div className="user-details">
              <p><strong>Name:</strong> {submittedData.name}</p>
              <p><strong>Age:</strong> {submittedData.age}</p>
              {submittedData.created_at && (
                <p><strong>Created at:</strong> {new Date(submittedData.created_at).toLocaleString()}</p>
              )}
            </div>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;

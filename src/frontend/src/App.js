import React, { useState, useEffect } from 'react';
import './App.css';

const API_PROTOCOL = process.env.REACT_APP_API_PROTOCOL || 'http';
const API_HOST = process.env.REACT_APP_API_HOST || 'localhost';
const API_PORT = process.env.REACT_APP_API_PORT || '4000';
const API_BASE_URL = `${API_PROTOCOL}://${API_HOST}:${API_PORT}`;

function App() {
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    first_name: '',
    age: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/users`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        console.error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: formData.first_name,
          age: parseInt(formData.age)
        }),
      });

      if (response.ok) {
        const newUser = await response.json();
        setUsers(prev => [...prev, newUser]);
        setFormData({ first_name: '', age: '' });
        setMessage('User created successfully!');
      } else {
        const errorData = await response.json();
        setMessage(`Error: ${errorData.detail || 'Failed to create user'}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setUsers(prev => prev.filter(user => user.id !== userId));
        setMessage('User deleted successfully!');
      } else {
        const errorData = await response.json();
        setMessage(`Error: ${errorData.detail || 'Failed to delete user'}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>User Management System</h1>
        <p>A full-stack application with React, FastAPI, and Couchbase</p>
      </header>

      <main className="App-main">
        <div className="form-section">
          <h2>Add New User</h2>
          <form onSubmit={handleSubmit} className="user-form">
            <div className="form-group">
              <label htmlFor="first_name">First Name:</label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                value={formData.first_name}
                onChange={handleInputChange}
                required
                placeholder="Enter first name"
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
                required
                min="1"
                max="150"
                placeholder="Enter age"
              />
            </div>

            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </form>

          {message && (
            <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
              {message}
            </div>
          )}
        </div>

        <div className="users-section">
          <h2>Users ({users.length})</h2>
          {users.length === 0 ? (
            <p className="no-users">No users found. Create your first user above!</p>
          ) : (
            <div className="users-grid">
              {users.map(user => (
                <div key={user.id} className="user-card">
                  <h3>{user.first_name}</h3>
                  <p>Age: {user.age}</p>
                  <p className="user-id">ID: {user.id}</p>
                  <p className="created-at">
                    Created: {new Date(user.created_at).toLocaleDateString()}
                  </p>
                  <button 
                    onClick={() => handleDelete(user.id)}
                    className="delete-btn"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;

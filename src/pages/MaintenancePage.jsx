import { useEffect, useState } from 'react';
import { maintenanceService } from '../services/maintenanceService';

const MaintenancePage = () => {
  const [form, setForm] = useState({ roomId: '', title: '', description: '', priority: 'Low' });
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const data = await maintenanceService.list();
      setItems(data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await maintenanceService.create(form);
      setMessage('Request submitted successfully');
      setForm({ roomId: '', title: '', description: '', priority: 'Low' });
      await load();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to submit request';
      setMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dashboard-main">
      <h2>Maintenance Requests</h2>
      <p>Submit a new request and track the status of previous requests.</p>

      {message && (
        <div className="requirements-text" style={{ marginBottom: 16 }}>{message}</div>
      )}

      <form onSubmit={submit} className="modal-body" style={{ padding: 0 }}>
        <div className="form-group">
          <label>Room ID</label>
          <input type="number" value={form.roomId} onChange={(e)=>setForm({ ...form, roomId: e.target.value })} required />
        </div>
        <div className="form-group">
          <label>Title</label>
          <input type="text" value={form.title} onChange={(e)=>setForm({ ...form, title: e.target.value })} required />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea rows="3" value={form.description} onChange={(e)=>setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Priority</label>
          <select value={form.priority} onChange={(e)=>setForm({ ...form, priority: e.target.value })}>
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
          </select>
        </div>
        <button className="btn-primary" type="submit" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Request'}</button>
      </form>

      <div className="profile-section" style={{ marginTop: 24 }}>
        <h4>My Requests</h4>
        {loading ? (
          <div className="tenants-loading">Loading...</div>
        ) : items.length === 0 ? (
          <div className="tenants-empty">No requests yet.</div>
        ) : (
          <table className="tenants-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Room</th>
                <th>Title</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {items.map(r => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.roomId}</td>
                  <td>{r.title}</td>
                  <td>{r.priority}</td>
                  <td>{r.status}</td>
                  <td>{new Date(r.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default MaintenancePage;



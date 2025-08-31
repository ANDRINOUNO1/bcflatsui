import { useEffect, useState } from "react";
import { maintenanceService } from "../services/maintenanceService";
import "../components/MaintenancePage.css";

const MaintenancePage = () => {
  const [form, setForm] = useState({
    roomId: "",
    title: "",
    description: "",
    priority: "Low",
  });
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const data = await maintenanceService.list();
      setItems(data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await maintenanceService.create(form);
      setMessage("✅ Request submitted successfully");
      setForm({ roomId: "", title: "", description: "", priority: "Low" });
      await load();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "❌ Failed to submit request";
      setMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dashboard-main">
      <header className="page-header">
        <h2>Maintenance Requests</h2>
        <p className="page-subtitle">
          Submit a new request and track the status of your previous requests.
        </p>
      </header>

      {message && <div className="alert-message">{message}</div>}

      {/* Request Form */}
      <section className="form-section">
        <h3 className="section-title">Submit New Request</h3>
        <form onSubmit={submit} className="form-card">
          <div className="form-group">
            <label htmlFor="roomId">Room ID</label>
            <input
              id="roomId"
              type="number"
              value={form.roomId}
              onChange={(e) => setForm({ ...form, roomId: e.target.value })}
              placeholder="Enter room number"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input
              id="title"
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Short description of the issue"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Detailed Description</label>
            <textarea
              id="description"
              rows="3"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Provide additional details (optional)"
            />
          </div>

          <div className="form-group">
            <label htmlFor="priority">Priority</label>
            <select
              id="priority"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </div>

          <button className="btn-primary" type="submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Request"}
          </button>
        </form>
      </section>

      {/* Requests Table */}
      <section className="table-section">
        <h3 className="section-title">My Requests</h3>
        {loading ? (
          <div className="tenants-loading">Loading...</div>
        ) : items.length === 0 ? (
          <div className="tenants-empty">No requests yet.</div>
        ) : (
          <div className="table-wrapper">
            <table className="tenants-table">
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
                {items.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{r.roomId}</td>
                    <td>{r.title}</td>
                    <td>
                      <span
                        className={`priority-badge priority-${r.priority.toLowerCase()}`}
                      >
                        {r.priority}
                      </span>
                    </td>
                    <td>{r.status}</td>
                    <td>{new Date(r.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default MaintenancePage;
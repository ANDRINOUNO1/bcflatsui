import { useEffect, useState } from "react";
import { maintenanceService } from "../services/maintenanceService";
import { roomService } from "../services/roomService";
import { tenantService } from "../services/tenantService"; 
import { useAuth } from "../context/AuthContext";
import "../components/MaintenancePage.css";

const MaintenancePage = () => {
  const { user } = useAuth();
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
  const [tenantData, setTenantData] = useState(null);
  const [roomData, setRoomData] = useState(null);
  const [roomDisplayText, setRoomDisplayText] = useState("");

  // Helper function to get floor suffix
  const getFloorSuffix = (floor) => {
    if (floor === 1) return "st";
    if (floor === 2) return "nd";
    if (floor === 3) return "rd";
    return "th";
  };

  const load = async () => {
    try {
      setLoading(true);

      // Fetch maintenance requests
      const data = await maintenanceService.list();
      setItems(data || []);

      // Fetch tenant and room data if user is logged in
      if (user?.id) {
        try {
          const tenantResponse = await tenantService.getTenantByAccountId(user.id);
          if (tenantResponse) {
            setTenantData(tenantResponse);

            if (tenantResponse.roomId) {
              try {
                const roomResponse = await roomService.getRoomById(tenantResponse.roomId);
                setRoomData(roomResponse);

                // Set form roomId
                setForm((prev) => ({ ...prev, roomId: tenantResponse.roomId }));

                // Create room display text
                const floorText = roomResponse?.floor
                  ? `${roomResponse.roomNumber} (${roomResponse.floor}${getFloorSuffix(
                      roomResponse.floor
                    )} floor)`
                  : roomResponse?.roomNumber || tenantResponse.roomId;

                setRoomDisplayText(floorText);
              } catch (roomError) {
                console.error("❌ Error fetching room data:", roomError);
                setForm((prev) => ({ ...prev, roomId: tenantResponse.roomId }));
                setRoomDisplayText(`Room ${tenantResponse.roomId}`);
              }
            }
          }
        } catch (tenantError) {
          console.error("❌ Error fetching tenant data:", tenantError);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await maintenanceService.create(form);
      setMessage("✅ Request submitted successfully");

      // Reset form (keep roomId locked if tenant is assigned)
      setForm({
        roomId: form.roomId,
        title: "",
        description: "",
        priority: "Low",
      });

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

      {!tenantData && user?.id && !loading && (
        <div
          className="alert-message"
          style={{
            background: "#fff3cd",
            borderLeftColor: "#ffc107",
            color: "#856404",
          }}
        >
          <strong>Note:</strong> No tenant information found. Please contact the
          property management to complete your tenant registration and room
          assignment.
        </div>
      )}

      {tenantData && roomData && (
        <section className="property-info-section">
          <div className="property-info-card">
            <h3 className="property-info-title">
              <span className="property-icon">🏠</span>
              Property Information
            </h3>
            <div className="info-list">
              <div className="info-item">
                <span className="info-label">BUILDING:</span>
                <span className="info-value">
                  {roomData?.building || "Main Building"}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">ROOM:</span>
                <span className="info-value">{roomData?.roomNumber || "N/A"}</span>
              </div>
              <div className="info-item">
                <span className="info-label">FLOOR:</span>
                <span className="info-value">
                  {roomData?.floor
                    ? `${roomData.floor}${getFloorSuffix(roomData.floor)}`
                    : "N/A"}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">BED NUMBER:</span>
                <span className="info-value">{tenantData?.bedNumber || "N/A"}</span>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="form-section">
        <h3 className="section-title">Submit New Request</h3>
        <form onSubmit={submit} className="form-card">
          <div className="form-group">
            <label htmlFor="roomId">Room</label>
            {tenantData && roomData ? (
              <input
                id="roomId"
                type="text"
                value={roomDisplayText}
                readOnly
                className="readonly-input"
              />
            ) : (
              <input
                id="roomId"
                type="text"
                value={form.roomId}
                onChange={(e) => setForm({ ...form, roomId: e.target.value })}
                placeholder="Enter room number"
                required
              />
            )}
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
              onChange={(e) => setForm({ ...form, description: e.target.value })}
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
                        className={`priority-badge priority-${r.priority?.toLowerCase()}`}
                      >
                        {r.priority}
                      </span>
                    </td>
                    <td>{r.status}</td>
                    <td>
                      {r.createdAt
                        ? new Date(r.createdAt).toLocaleString()
                        : "N/A"}
                    </td>
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

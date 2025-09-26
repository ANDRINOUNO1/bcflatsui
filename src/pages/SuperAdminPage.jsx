import { useEffect, useMemo, useState } from 'react'
import { superAdminService } from '../services/superAdminService'
import '../components/SuperAdmin.css'

const Section = ({ title, icon, children }) => {
  const [open, setOpen] = useState(true)
  return (
    <div className="sa-section">
      <div className="sa-card">
        <div className="sa-card-header">
          <div className="sa-card-title">
            <span className="sa-icon">{icon}</span>
            <strong>{title}</strong>
          </div>
          <button className="sa-btn secondary" onClick={() => setOpen(!open)}>{open ? 'Hide' : 'Show'}</button>
        </div>
        {open && (
          <div className="sa-card-body">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}

const RoleBadge = ({ role }) => (
  <span className={`role-badge ${String(role || '').toLowerCase()}`}>{role}</span>
)

export default function SuperAdminPage() {
  const [loading, setLoading] = useState(false)
  const [accounts, setAccounts] = useState([])
  const [pending, setPending] = useState([])
  const [error, setError] = useState('')

  const statuses = useMemo(() => ['Active', 'Pending', 'Suspended', 'Deleted', 'Rejected'], [])
  const roles = useMemo(() => ['Admin', 'SuperAdmin', 'Accounting', 'Tenant'], [])

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [all, pend] = await Promise.all([
        superAdminService.getAllAccounts(),
        superAdminService.getPendingAccounts()
      ])
      setAccounts(all)
      setPending(pend)
    } catch (e) {
      setError(e?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleApprove = async (id) => {
    await superAdminService.approveAccount(id)
    await load()
  }
  const handleReject = async (id) => {
    const reason = window.prompt('Reason for rejection (optional):')
    await superAdminService.rejectAccount(id, reason || undefined)
    await load()
  }
  const handleRole = async (id, role) => {
    await superAdminService.updateRole(id, role)
    await load()
  }
  const handleStatus = async (id, status) => {
    await superAdminService.updateStatus(id, status)
    await load()
  }

  return (
    <div className="superadmin-container">
      <h2 className="superadmin-title">Super Admin Dashboard</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <div className="loading">Loading...</div>}

      <Section title="Admin Services" icon="🛠️">
        <ul className="sa-list">
          <li>User Management</li>
          <li>Reservations</li>
          <li>Reports</li>
          <li>Settings</li>
        </ul>
      </Section>

      <Section title="Accounting Services" icon="💰">
        <ul className="sa-list">
          <li>Payments</li>
          <li>Billing</li>
          <li>Revenue Reports</li>
          <li>Unpaid Tenants</li>
        </ul>
      </Section>

      <Section title="Pending Accounts" icon="⏳">
        {pending.length === 0 ? (
          <div>No pending accounts</div>
        ) : (
          <div className="sa-table-wrap">
            <table className="sa-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.map(a => (
                  <tr key={a.id}>
                    <td>{a.firstName} {a.lastName}</td>
                    <td>{a.email}</td>
                    <td><RoleBadge role={a.role} /></td>
                    <td>{a.status}</td>
                    <td>
                      <div className="sa-actions">
                        <button className="sa-btn success" onClick={() => handleApprove(a.id)}>Approve</button>
                        <button className="sa-btn danger-outline" onClick={() => handleReject(a.id)}>Reject</button>
                        <select className="sa-select" value={a.role} onChange={(e) => handleRole(a.id, e.target.value)}>
                        {roles.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="All Accounts" icon="👥">
        <div className="sa-table-wrap">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map(a => (
                <tr key={a.id}>
                  <td>{a.firstName} {a.lastName}</td>
                  <td>{a.email}</td>
                  <td>
                    <select className="sa-select" value={a.role} onChange={(e) => handleRole(a.id, e.target.value)}>
                      {roles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td>
                    <select className="sa-select" value={a.status} onChange={(e) => handleStatus(a.id, e.target.value)}>
                      {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>
                    <button className="sa-btn danger-outline" onClick={() => handleStatus(a.id, 'Suspended')}>Suspend</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}



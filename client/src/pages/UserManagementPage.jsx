import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import adminService from '../services/adminService';
import { ROLES, formatDate } from '../utils/constants';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Search, Trash2, Edit2, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

export const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [editingUser, setEditingUser] = useState(null);
  const [deleteModalUser, setDeleteModalUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await adminService.getUsers({ q: search || undefined, role: roleFilter !== 'ALL' ? roleFilter : undefined });
      if (res.success) {
        setUsers(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter]);

  const handleRoleChange = async (userId, newRole) => {
    setUpdating(true);
    try {
      const res = await adminService.updateUserRole(userId, newRole);
      if (res.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
        setEditingUser(null);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update role.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteModalUser) return;
    try {
      const res = await adminService.deleteUser(deleteModalUser.id);
      if (res.success) {
        setUsers((prev) => prev.filter((u) => u.id !== deleteModalUser.id));
        setDeleteModalUser(null);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <PageHeader
        title="User & Access Directory"
        subtitle="Manage user accounts, assign role permissions, and govern platform participants"
        breadcrumbs={['Admin', 'User Management']}
      />

      <div className="flex flex-col sm:flex-row gap-3 p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by full name or email address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-slate-900 focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="w-full sm:w-48">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-700 bg-white focus:outline-none focus:border-brand-500"
          >
            <option value="ALL">All Roles</option>
            <option value="ADMIN">Administrators</option>
            <option value="ORGANIZER">Organizers</option>
            <option value="ATTENDEE">Attendees / Users</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center items-center text-brand-600">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3.5">User</th>
                  <th className="px-4 py-3.5">Role</th>
                  <th className="px-4 py-3.5">Contact Details</th>
                  <th className="px-4 py-3.5">Location</th>
                  <th className="px-4 py-3.5">Joined</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={u.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                          alt={u.fullName}
                          className="w-10 h-10 rounded-full object-cover shrink-0"
                        />
                        <div>
                          <p className="font-bold text-slate-900">{u.fullName}</p>
                          <p className="text-[11px] text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <Badge
                        label={u.role}
                        variant={
                          u.role === 'ADMIN'
                            ? 'danger'
                            : u.role === 'ORGANIZER'
                            ? 'primary'
                            : 'warning'
                        }
                      />
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {u.phone || 'N/A'}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {u.city || 'N/A'}
                    </td>

                    <td className="px-4 py-4 text-slate-500">
                      {formatDate(u.createdAt)}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setEditingUser(u)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition"
                          title="Change Role"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteModalUser(u)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Remove User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Role Change Modal */}
      {editingUser && (
        <Modal
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
          title={`Update Role: ${editingUser.fullName}`}
          subtitle={editingUser.email}
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Select the new authorization role for this user account:
            </p>

            <div className="space-y-2">
              {['ATTENDEE', 'ORGANIZER', 'ADMIN'].map((r) => (
                <button
                  key={r}
                  disabled={updating}
                  onClick={() => handleRoleChange(editingUser.id, r)}
                  className={`w-full p-3 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition ${
                    editingUser.role === r
                      ? 'border-brand-600 bg-brand-50 text-brand-700'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span>{r}</span>
                  {editingUser.role === r && <CheckCircle2 className="w-4 h-4 text-brand-600" />}
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" size="sm" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete User Modal */}
      {deleteModalUser && (
        <Modal
          isOpen={!!deleteModalUser}
          onClose={() => setDeleteModalUser(null)}
          title="Delete User Account?"
          subtitle={deleteModalUser.fullName}
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Are you sure you want to remove this account?</p>
                <p className="mt-0.5">This action will delete user records and revoke login access.</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setDeleteModalUser(null)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleDeleteUser}>
                Confirm Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
